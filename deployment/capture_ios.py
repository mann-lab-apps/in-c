#!/usr/bin/env python3
"""Capture an already positioned real Simulator scene, with build/scene evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from datetime import datetime, timezone


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--udid", required=True)
    parser.add_argument("--asset", type=int, required=True, help="zero-based asset index in manifest")
    parser.add_argument("--build-result", required=True, help="successful archive/export result for this source/version")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Fa-f0-9-]{36}", args.udid):
        parser.error("invalid simulator UDID")
    path = Path(args.manifest).resolve(strict=True)
    data = json.loads(path.read_text())
    if args.asset < 0 or args.asset >= len(data["assets"]):
        parser.error("asset index is out of range")
    asset = data["assets"][args.asset]
    if asset["kind"] != "screenshot":
        parser.error("this command captures screenshots only; use physical-device recording for hardware evidence")
    evidence = json.loads(Path(args.build_result).read_text())
    if evidence.get("status") != "passed" or evidence.get("source_commit") != data["source_commit"] or not re.fullmatch(re.escape(data["version"]) + r"\+\d+", evidence.get("version", "")):
        parser.error("successful matching build evidence required")
    if evidence.get("action") not in ("archive", "export"):
        parser.error("archive or export evidence required")
    app = subprocess.check_output(["xcrun", "simctl", "get_app_container", args.udid, data["bundle_id"], "app"]).decode().strip()
    info = json.loads(subprocess.check_output(["plutil", "-convert", "json", "-o", "-", str(Path(app) / "Info.plist")]))
    if info.get("CFBundleIdentifier") != data["bundle_id"] or info.get("CFBundleShortVersionString") != data["version"]:
        parser.error("installed app identifier/version differs from manifest")
    expected_build = evidence["version"].split("+")[-1]
    if str(info.get("CFBundleVersion")) != expected_build:
        parser.error("installed app build number differs from build evidence")
    target = (path.parent / asset["path"]).resolve()
    if path.parent not in target.parents:
        parser.error("capture path escapes app directory")
    if target.exists():
        parser.error("capture file already exists; preserve it or choose a new path")
    target.parent.mkdir(parents=True, exist_ok=True)
    image_format = "jpeg" if target.suffix.lower() in (".jpg", ".jpeg") else "png"
    subprocess.run(["xcrun", "simctl", "io", args.udid, "screenshot", f"--type={image_format}", str(target)], check=True)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    record = {"captured_at": datetime.now(timezone.utc).isoformat(), "simulator": args.udid,
              "bundle_id": data["bundle_id"], "version": evidence["version"], "source_commit": data["source_commit"],
              "scene": asset["scene"], "sha256": digest, "authentic_capture": True,
              "visual_review_required": True, "note": "Build identity checked; foreground screen/scene and fixture content still require visual review."}
    target.with_suffix(target.suffix + ".capture.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"file": str(target), "sha256": digest, "visual_review_required": True}))


if __name__ == "__main__":
    main()
