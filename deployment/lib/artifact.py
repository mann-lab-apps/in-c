"""Read-only signed artifact inspection. No store credentials or network calls."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
import zipfile


def run(*args):
    p = subprocess.run(args, capture_output=True)
    if p.returncode:
        # Tool output may include local signing information; never persist it.
        raise ValueError(f"{Path(args[0]).name} failed (exit {p.returncode})")
    return p.stdout


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ios_app(app):
    info = plistlib.loads((app / "Info.plist").read_bytes())
    run("codesign", "--verify", "--deep", "--strict", str(app))
    ent = plistlib.loads(run("codesign", "-d", "--entitlements", ":-", str(app)))
    profile = plistlib.loads(run("security", "cms", "-D", "-i", str(app / "embedded.mobileprovision")))
    if ent.get("get-task-allow") is not False:
        raise ValueError("development/debuggable iOS artifact")
    team = ent.get("com.apple.developer.team-identifier")
    if profile.get("TeamIdentifier") != [team]:
        raise ValueError("profile/team mismatch")
    if ent.get("application-identifier") != f"{team}.{info['CFBundleIdentifier']}":
        raise ValueError("signed application identifier mismatch")
    if "ProvisionedDevices" in profile or profile.get("ProvisionsAllDevices"):
        raise ValueError("not an App Store distribution profile")
    return {
        "platform": "ios", "identifier": info["CFBundleIdentifier"],
        "display_name": info.get("CFBundleDisplayName", info.get("CFBundleName")),
        "version": info["CFBundleShortVersionString"], "build_number": int(info["CFBundleVersion"]),
        "team_id": team, "profile": profile["Name"], "debuggable": False,
        "device_families": info.get("UIDeviceFamily"),
        "minimum_os": info.get("MinimumOSVersion"),
        "entitlements": ent,
    }


def inspect(path, platform):
    path = Path(path).resolve(strict=True)
    if platform == "ios":
        with tempfile.TemporaryDirectory(prefix="inc-ipa-") as temp:
            # Reject path traversal before ditto expands the archive.
            with zipfile.ZipFile(path) as z:
                for name in z.namelist():
                    if name.startswith("/") or ".." in Path(name).parts:
                        raise ValueError("unsafe ZIP path")
            run("ditto", "-x", "-k", str(path), temp)
            apps = list((Path(temp) / "Payload").glob("*.app"))
            if len(apps) != 1:
                raise ValueError("expected one payload app")
            result = ios_app(apps[0])
    elif platform == "android":
        jar = Path(os.environ["BUNDLETOOL_JAR"]).resolve(strict=True)
        run("java", "-jar", str(jar), "validate", f"--bundle={path}")
        manifest = ET.fromstring(run("java", "-jar", str(jar), "dump", "manifest", f"--bundle={path}", "--module=base"))
        android = "{http://schemas.android.com/apk/res/android}"
        app = manifest.find("application")
        if app is None or app.get(android + "debuggable", "false") != "false":
            raise ValueError("debuggable/missing Android application")
        verification = run("jarsigner", "-verify", str(path)).decode()
        if "jar verified." not in verification:
            raise ValueError("unsigned Android bundle")
        cert = run("keytool", "-J-Duser.language=en", "-printcert", "-jarfile", str(path)).decode()
        fingerprints = re.findall(r"SHA1:\s*([0-9A-F:]+)", cert)
        if len(fingerprints) != 1:
            raise ValueError("expected one upload certificate")
        result = {
            "platform": "android", "identifier": manifest.attrib["package"],
            "version": manifest.attrib[android + "versionName"],
            "build_number": int(manifest.attrib[android + "versionCode"]),
            "upload_certificate_sha1": fingerprints[0].replace(":", ""),
            "debuggable": False,
            "permissions": sorted(x.get(android + "name") for x in manifest.findall("uses-permission")),
            "minimum_sdk": manifest.find("uses-sdk").get(android + "minSdkVersion"),
        }
    else:
        raise ValueError("unsupported platform")
    return {**result, "path": str(path), "sha256": sha256(path), "bytes": path.stat().st_size}


def compare(candidate, baseline):
    if candidate["platform"] != baseline["platform"]:
        raise ValueError("platform mismatch")
    keys = ["identifier", "debuggable"]
    keys += (["display_name", "team_id", "profile", "device_families", "minimum_os", "entitlements"]
             if candidate["platform"] == "ios" else ["upload_certificate_sha1", "permissions", "minimum_sdk"])
    differences = [key for key in keys if candidate.get(key) != baseline.get(key)]
    return {"passed": not differences, "compared_fields": keys, "differences": differences,
            "baseline_sha256": baseline["sha256"], "candidate_sha256": candidate["sha256"],
            "baseline_version": f"{baseline['version']}+{baseline['build_number']}",
            "candidate_version": f"{candidate['version']}+{candidate['build_number']}",
            "byte_identical": baseline["sha256"] == candidate["sha256"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("platform", choices=["ios", "android"])
    parser.add_argument("artifact")
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.artifact, args.platform), ensure_ascii=False))
    except (ValueError, OSError, KeyError, zipfile.BadZipFile) as e:
        parser.exit(1, f"artifact inspection failed: {e}\n")
