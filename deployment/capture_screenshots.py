#!/usr/bin/env python3
"""Config-driven local iOS captures; no credentials, store writes or product edits."""
import argparse
import base64
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SLUG = r"[a-z][a-z0-9_-]*"
SLOTS = {"APP_IPHONE_67": {(1260, 2736), (1290, 2796), (1320, 2868)},
         "APP_IPHONE_65": {(1242, 2688), (1284, 2778)},
         "APP_IPAD_PRO_3GEN_129": {(2048, 2732), (2064, 2752)}}
STAGED = {"test": "integration_test/_deployment_capture_test.dart",
          "adapter": "integration_test/_deployment_capture_adapter.dart",
          "driver": "test_driver/_deployment_capture_driver.dart"}


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def contained(root, relative):
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute():
        raise ValueError("expected a relative path")
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if path == root or not path.is_relative_to(root):
        raise ValueError("path escapes configured root")
    return path


def fields(value, expected):
    if not isinstance(value, dict) or set(value) != set(expected.split()):
        raise ValueError("invalid configuration fields")


def load(path):
    data = json.loads(Path(path).read_text())
    fields({k: v for k, v in data.items() if k not in ('flavor', 'content_contract_sha256')}, "schema_version app engine source_commit source_path bundle_id version build_number adapter dart_defines devices scenes")
    if 'content_contract_sha256' in data and not re.fullmatch(r'[0-9a-f]{64}', data['content_contract_sha256']):
        raise ValueError('invalid screenshot content contract fingerprint')
    if data.get("flavor") is not None and (not isinstance(data["flavor"], str) or not re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]*", data["flavor"])):
        raise ValueError("invalid Flutter flavor")
    if data["schema_version"] != 1 or data["engine"] != "flutter_integration_ios":
        raise ValueError("unsupported screenshot engine/schema")
    if not re.fullmatch(SLUG, data["app"]) or not re.fullmatch(r"[a-f0-9]{40}", data["source_commit"]):
        raise ValueError("invalid app/source commit")
    if not re.fullmatch(r"[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+", data["bundle_id"]):
        raise ValueError("invalid bundle ID")
    if not re.fullmatch(r"\d+\.\d+\.\d+", data["version"]) or type(data["build_number"]) is not int or data["build_number"] <= 0:
        raise ValueError("invalid source version/build")
    contained(REPO, data["source_path"])
    if not contained(ROOT, data["adapter"]).is_file():
        raise ValueError("capture adapter missing")
    if not isinstance(data["dart_defines"], dict) or not all(re.fullmatch(r"[A-Z][A-Z0-9_]*", k) and isinstance(v, str) and not k.startswith("STORE_CAPTURE_") for k, v in data["dart_defines"].items()):
        raise ValueError("invalid Dart defines")
    if not isinstance(data["devices"], list) or not data["devices"] or not isinstance(data["scenes"], list) or not data["scenes"]:
        raise ValueError("devices/scenes required")
    names = []
    for device in data["devices"]:
        fields(device, "id family type_id runtime display_type width height locale")
        names.append(device["id"])
        if not re.fullmatch(SLUG, device["id"]) or device["family"] not in ("iphone", "ipad"):
            raise ValueError("invalid device")
        if not device["type_id"].startswith("com.apple.CoreSimulator.SimDeviceType.") or not device["runtime"].startswith("com.apple.CoreSimulator.SimRuntime."):
            raise ValueError("invalid simulator type/runtime")
        if not re.fullmatch(r"[a-z]{2}(?:-[A-Za-z0-9]+)*", device["locale"]) or (device["width"], device["height"]) not in SLOTS.get(device["display_type"], set()):
            raise ValueError("invalid locale or screenshot dimensions/slot")
        if (device["family"] == "ipad") != device["display_type"].startswith("APP_IPAD_"):
            raise ValueError("device family differs from screenshot slot")
    if len(names) != len(set(names)):
        raise ValueError("duplicate device IDs")
    names = []
    for scene in data["scenes"]:
        fields(scene, "id purpose steps assertions")
        names.append(scene["id"])
        if not re.fullmatch(SLUG, scene["id"]) or not isinstance(scene["purpose"], str) or not scene["purpose"].strip():
            raise ValueError("invalid scene")
        if not isinstance(scene["steps"], list) or not isinstance(scene["assertions"], list) or not scene["assertions"]:
            raise ValueError("scene needs UI assertions")
        for step in scene["steps"]:
            action = step.get("action")
            if action == "tap":
                fields(step, "action by value")
                selector(step)
                if step["by"] == "widget_type":
                    raise ValueError("tap requires a specific selector")
            elif action == "scroll_to":
                fields(step, "action by value delta")
                selector(step)
                if type(step["delta"]) is not int or not 1 <= abs(step["delta"]) <= 1000:
                    raise ValueError("scroll delta must be 1..1000 pixels")
            elif action == "back":
                fields(step, "action")
            elif action == "wait":
                fields(step, "action milliseconds")
                if type(step["milliseconds"]) is not int or not 1 <= step["milliseconds"] <= 30000:
                    raise ValueError("wait must be between 1 and 30000 ms")
            else:
                raise ValueError("unsupported UI action")
        for check in scene["assertions"]:
            fields(check, "by value present")
            selector(check)
            if type(check["present"]) is not bool:
                raise ValueError("assertion present must be boolean")
        if not any(check["present"] for check in scene["assertions"]):
            raise ValueError("scene needs a positive UI assertion")
    if len(names) != len(set(names)):
        raise ValueError("duplicate scene IDs")
    return data


def selector(step):
    if step["by"] not in ("text", "tooltip", "key", "widget_type") or not isinstance(step["value"], str) or not step["value"].strip():
        raise ValueError("unsupported UI selector")


def drive_command(data, device, udid):
    plan = base64.b64encode(json.dumps({"device": device["id"], "scenes": data["scenes"]}, ensure_ascii=False).encode()).decode()
    return ["flutter", "drive", "--no-pub", "--keep-app-running", "--driver=" + STAGED["driver"], "--target=" + STAGED["test"], "-d", udid,
            "--dart-define=STORE_CAPTURE_PLAN=" + plan] + [f"--dart-define={k}={v}" for k, v in sorted(data["dart_defines"].items())] + (["--flavor=" + data["flavor"]] if data.get("flavor") else [])


def run(argv, cwd=None, log=None, env=None, timeout=180):
    if log:
        with Path(log).open("ab") as stream:
            try:
                subprocess.run(argv, cwd=cwd, stdout=stream, stderr=subprocess.STDOUT, env=env, timeout=timeout, check=True)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
                raise RuntimeError(f"{Path(argv[0]).name} failed ({type(error).__name__}); see {log}") from None
        return ""
    return subprocess.check_output(argv, cwd=cwd, stderr=subprocess.PIPE, timeout=timeout).decode().strip()


def validate_source(data, source):
    app = contained(source, data["source_path"])
    if run(["git", "rev-parse", "HEAD"], cwd=source) != data["source_commit"]:
        raise ValueError("source checkout differs from pinned commit")
    if run(["git", "status", "--porcelain", "--untracked-files=no", "--", data["source_path"]], cwd=source):
        raise ValueError("tracked application source is dirty")
    # Drive uses the committed pubspec version; never rewrite product version files.
    version = re.search(r"^version:\s*([^\s#]+)", (app / "pubspec.yaml").read_text(), re.MULTILINE)
    if not version or version[1] != f"{data['version']}+{data['build_number']}":
        raise ValueError("source pubspec version/build differs from capture contract")
    return app


def verify_app(data, app):
    info = plistlib.loads((Path(app) / "Info.plist").read_bytes())
    if (info.get("CFBundleIdentifier"), info.get("CFBundleShortVersionString"), str(info.get("CFBundleVersion"))) != (data["bundle_id"], data["version"], str(data["build_number"])):
        raise ValueError("installed app identity/version/build differs from capture contract")
    if "iPhoneSimulator" not in info.get("CFBundleSupportedPlatforms", []):
        raise ValueError("capture requires a simulator build")
    return {k: info[k] for k in ("CFBundleIdentifier", "CFBundleShortVersionString", "CFBundleVersion", "CFBundleSupportedPlatforms")}


def inspect_image(path, device):
    path = Path(path)
    if not path.is_file() or path.stat().st_size < 1000 or path.read_bytes()[:2] != b"\xff\xd8":
        raise ValueError("native JPEG capture missing/empty")
    details = run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", str(path)])
    width = int(re.search(r"pixelWidth:\s*(\d+)", details)[1])
    height = int(re.search(r"pixelHeight:\s*(\d+)", details)[1])
    if (width, height) != (device["width"], device["height"]) or re.search(r"hasAlpha:\s*yes", details):
        raise ValueError("screenshot dimensions/alpha differ from device contract")
    return {"width": width, "height": height, "sha256": sha(path), "bytes": path.stat().st_size}


def persist(path, value):
    temp = path.with_suffix(".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def verify_result(manifest, data, result, review=None):
    result = Path(result).resolve(strict=True)
    record = json.loads(result.read_text())
    if record.get("status") != "captured" or record.get("automatic_checks") != "passed" or record.get("manifest_sha256") != sha(manifest) or record.get("source_commit") != data["source_commit"]:
        raise ValueError("capture failed or is stale for this source/configuration")
    if any(record.get(k) is not False for k in ("binary_upload", "review_submission", "release")):
        raise ValueError("capture record contains unexpected store operations")
    original_manifest = Path(record.get('manifest_path', manifest)).resolve(strict=True)
    if sha(original_manifest) != sha(manifest):
        raise ValueError('original capture manifest changed')
    asset_root = original_manifest.parent
    expected = {(d["id"], s["id"]): (d, i) for d in data["devices"] for i, s in enumerate(data["scenes"], 1)}
    if len(record["assets"]) != len(expected):
        raise ValueError("capture scene/device coverage differs from configuration")
    reviews = {}
    if review:
        evidence = json.loads(Path(review).read_text())
        fields(evidence, "schema_version capture_result_sha256 reviewer assets")
        if evidence["schema_version"] != 1 or evidence["capture_result_sha256"] != sha(result) or not isinstance(evidence["reviewer"], str) or not evidence["reviewer"].strip():
            raise ValueError("visual review does not match this capture result")
        for row in evidence["assets"]:
            fields(row, "path sha256 approved notes")
            if row["path"] in reviews or row["approved"] is not True or not isinstance(row["notes"], str) or not row["notes"].strip():
                raise ValueError("visual review is incomplete or rejected")
            reviews[row["path"]] = row
        if len(reviews) != len(expected):
            raise ValueError("visual review must cover every asset")
    assets = []
    seen = set()
    per_device_hashes = set()
    for asset in record["assets"]:
        file = contained(asset_root, asset["path"])
        device_id = next((d["id"] for d in data["devices"] if file.name == f"{d['id']}-{asset['scene']}.jpg"), None)
        key = (device_id, asset["scene"])
        if key not in expected or key in seen:
            raise ValueError("unexpected or duplicate captured scene")
        seen.add(key)
        device, position = expected[key]
        details = inspect_image(file, device)
        digest_key = (device_id, details['sha256'])
        if digest_key in per_device_hashes:
            raise ValueError("different scenes produced identical screenshots")
        per_device_hashes.add(digest_key)
        if details["sha256"] != asset["sha256"] or asset["source_commit"] != data["source_commit"] or asset["position"] != position or asset["display_type"] != device["display_type"] or asset["locale"] != device["locale"] or asset["device"] != device["family"]:
            raise ValueError("captured image or provenance changed")
        if "raw_path" in asset and sha(contained(asset_root, asset["raw_path"])) != asset.get("raw_sha256"):
            raise ValueError("original native snapshot changed")
        if review and reviews.get(asset["path"], {}).get("sha256") != asset["sha256"]:
            raise ValueError("visual review image hash differs from current file")
        fields_to_export = "kind locale device display_type path position scene sha256 authentic source_commit".split()
        assets.append({**{k: asset[k] for k in fields_to_export}, "reviewed": bool(review)})
    return {"schema_version": 1, "action": "verify_screenshots", "app": data["app"], "status": "passed", "capture_result": str(result),
            "capture_result_sha256": sha(result), "source_commit": data["source_commit"], "automatic_checks": "passed", "visual_review_passed": bool(review),
            "ready_for_upload": bool(review), "build_mode": record["build_mode"], "assets": assets,
            "visual_review_file": str(Path(review).resolve()) if review else None, "visual_review_sha256": sha(review) if review else None,
            "binary_upload": False, "review_submission": False, "release": False}


def capture(manifest, data, source_root=None, devices=None):
    name = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
    output = ROOT / "output" / data["app"] / ("screenshots-" + name)
    output.mkdir(parents=True)
    media = Path(manifest).resolve().parent / "media" / ("screenshots-" + name)
    media.mkdir(parents=True)
    record = {"schema_version": 1, "action": "capture_screenshots", "app": data["app"], "status": "running", "source_commit": data["source_commit"], "manifest_path": str(Path(manifest).resolve()),
              "version": f"{data['version']}+{data['build_number']}", "manifest_sha256": sha(manifest), "started_at": datetime.now(timezone.utc).isoformat(),
              "engine": data["engine"], "build_mode": "debug_integration", "binary_upload": False, "review_submission": False, "release": False,
              "visual_review_required": True, "ready_for_upload": False, "assets": [], "devices": [],
              "capture_code_sha256": {str(p.relative_to(ROOT)): sha(p) for p in [Path(__file__), ROOT / "capture/screens_test.dart", ROOT / "capture/driver.dart", contained(ROOT, data["adapter"])]}}
    result = output / "result.json"
    persist(result, record)
    persist(output / "capture-manifest.json", data)
    created = []
    try:
        source = Path(source_root).resolve() if source_root else output / "source"
        if not source_root:
            run(["git", "worktree", "add", "--detach", str(source), data["source_commit"]], cwd=REPO)
        app = validate_source(data, source)
        for key, relative in STAGED.items():
            dest = contained(app, relative)
            tracked = subprocess.run(["git", "ls-files", "--error-unmatch", str(dest.relative_to(source))], cwd=source, capture_output=True).returncode == 0
            if tracked:
                raise ValueError("capture staging would overwrite tracked source")
            origin = contained(ROOT, data["adapter"]) if key == "adapter" else ROOT / "capture" / ("screens_test.dart" if key == "test" else "driver.dart")
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(origin, dest)
        record["source_root"] = str(source)
        record["flutter_version"] = run(["flutter", "--version", "--machine"], cwd=app)
        persist(result, record)
        run(["flutter", "pub", "get"], cwd=app, log=output / "pub.log", timeout=600)
        for device in data["devices"]:
            print(f"Capturing {data['app']}/{device['id']}", flush=True)
            udid = (devices or {}).get(device["id"])
            if not udid:
                udid = run(["xcrun", "simctl", "create", f"Capture {data['app']} {device['id']} {name}", device["type_id"], device["runtime"]])
                created.append(udid)
            state = {"id": device["id"], "udid": udid, "owned_simulator": udid in created, "status": "running"}
            record["devices"].append(state)
            persist(result, record)
            info = json.loads(run(["xcrun", "simctl", "list", "devices", "--json"]))
            row = next((d for group in info["devices"].values() for d in group if d["udid"] == udid), None)
            runtime = next((key for key, group in info["devices"].items() if any(d["udid"] == udid for d in group)), None)
            if not row or row.get("deviceTypeIdentifier") != device["type_id"] or runtime != device["runtime"]:
                raise ValueError("simulator differs from configured device type")
            if row["state"] != "Booted":
                run(["xcrun", "simctl", "boot", udid])
            run(["xcrun", "simctl", "bootstatus", udid, "-b"], log=output / f"{device['id']}-boot.log", timeout=240)
            run(["xcrun", "simctl", "ui", udid, "appearance", "light"])
            run(["xcrun", "simctl", "status_bar", udid, "override", "--time", "9:41", "--batteryState", "charged", "--batteryLevel", "100"])
            env = dict(os.environ, STORE_CAPTURE_OUTPUT=str(media), STORE_CAPTURE_UDID=udid)
            run(drive_command(data, device, udid), cwd=app, env=env, log=output / f"{device['id']}-drive.log", timeout=1800)
            installed = run(["xcrun", "simctl", "get_app_container", udid, data["bundle_id"], "app"])
            state["installed_app"] = verify_app(data, installed)
            state["status"] = "captured"
            hashes = []
            for position, scene in enumerate(data["scenes"], 1):
                file = media / f"{device['id']}-{scene['id']}.jpg"
                details = inspect_image(file, device)
                hashes.append(details["sha256"])
                raw = file.with_suffix('.png')
                asset = {"kind": "screenshot", "locale": device["locale"], "device": device["family"], "display_type": device["display_type"],
                         "path": str(file.relative_to(Path(manifest).resolve().parent)), "position": position, "scene": scene["id"],
                         "capture_method": "integration_test_native_snapshot", "raw_path": str(raw.relative_to(Path(manifest).resolve().parent)), "raw_sha256": sha(raw),
                         "reviewed": False, "authentic": True, "source_commit": data["source_commit"], **details}
                record["assets"].append(asset)
            if len(set(hashes)) != len(hashes):
                raise ValueError("different scenes produced identical screenshots")
            persist(result, record)
        validate_source(data, source)
        record["status"] = "captured"
        record["automatic_checks"] = "passed"
    except Exception as error:
        record["status"] = "failed"
        record["failure"] = {"class": type(error).__name__, "message": str(error)}
        raise
    finally:
        for udid in created:
            subprocess.run(["xcrun", "simctl", "shutdown", udid], capture_output=True)
        record["finished_at"] = datetime.now(timezone.utc).isoformat()
        persist(result, record)
        with (ROOT / "output/ledger.jsonl").open("a") as ledger:
            fcntl.flock(ledger, fcntl.LOCK_EX)
            ledger.write(json.dumps({**record, "result": str(result)}, ensure_ascii=False) + "\n")
            ledger.flush()
            os.fsync(ledger.fileno())
        print(f"Result: {result}", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["plan", "capture", "verify"])
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--source-root", help="existing clean detached checkout; default creates an isolated worktree")
    parser.add_argument("--device", action="append", default=[], help="use a dedicated existing simulator, id=UDID")
    parser.add_argument("--result", help="immutable successful capture result for verify")
    parser.add_argument("--review", help="visual review with per-file SHA256 and approval for verify")
    args = parser.parse_args()
    if Path(args.manifest).suffix.lower() in ('.yaml', '.yml'):
        bundle = json.loads(run(['ruby', str(ROOT / 'metadata.rb'), '--manifest', str(Path(args.manifest).resolve())], cwd=ROOT))
        args.manifest = bundle['screenshots']
    data = load(args.manifest)
    if args.mode == "verify":
        if not args.result:
            parser.error("verify requires --result")
        report = verify_result(args.manifest, data, args.result, args.review)
        output = Path(args.result).resolve().parent / ("visual-verification.json" if args.review else "automatic-verification.json")
        persist(output, report)
        print(json.dumps({"result": str(output), "status": report["status"], "ready_for_upload": report["ready_for_upload"]}))
        return
    if args.mode == "plan":
        print(json.dumps({"app": data["app"], "engine": data["engine"], "source_commit": data["source_commit"], "adapter": data["adapter"],
                          "expected_images": [f"{d['id']}-{s['id']}.jpg" for d in data["devices"] for s in data["scenes"]],
                          "store_writes": False, "visual_review_required": True}, ensure_ascii=False, indent=2))
        return
    devices = {}
    for value in args.device:
        key, udid = value.split("=", 1)
        if key not in [d["id"] for d in data["devices"]] or key in devices or not re.fullmatch(r"[A-Fa-f0-9-]{36}", udid):
            parser.error("invalid/duplicate device override")
        devices[key] = udid
    # Prevent parallel builds/captures from racing on shared Flutter artifacts.
    lock_path = ROOT / "output/screenshots.lock"
    lock_path.parent.mkdir(exist_ok=True)
    with lock_path.open("w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        capture(args.manifest, data, args.source_root, devices)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Capture failed: {error}", file=sys.stderr)
        sys.exit(1)
