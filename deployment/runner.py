#!/usr/bin/env python3
"""Install/register a repository runner without exposing the registration token."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import tarfile
import urllib.request

REPOSITORY = "mann-lab-apps/in-c"
DIRECTORY = Path.home() / ".local/share/in-c-release-runner"


def gh(endpoint):
    return json.loads(subprocess.check_output(["gh", "api", endpoint]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["status", "register", "start", "stop"])
    args = parser.parse_args()
    if args.action == "status":
        data = gh(f"repos/{REPOSITORY}/actions/runners")
        print(json.dumps([{"name": x["name"], "status": x["status"], "labels": [y["name"] for y in x["labels"]]} for x in data["runners"]]))
        return
    if args.action == "register":
        if platform.system() != "Darwin" or platform.machine() != "arm64":
            raise SystemExit("This runner setup targets Apple Silicon macOS")
        DIRECTORY.mkdir(parents=True, exist_ok=True)
        if (DIRECTORY / ".runner").exists():
            raise SystemExit("Runner already configured; inspect status")
        release = gh("repos/actions/runner/releases/latest")
        asset = next(x for x in release["assets"] if x["name"].startswith("actions-runner-osx-arm64-") and x["name"].endswith(".tar.gz"))
        digest = asset.get("digest", "")
        if not digest.startswith("sha256:"):
            raise SystemExit("GitHub release asset SHA256 unavailable")
        archive = DIRECTORY / "runner.tar.gz"
        urllib.request.urlretrieve(asset["browser_download_url"], archive)
        hasher = hashlib.sha256()
        with archive.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                hasher.update(chunk)
        if hasher.hexdigest() != digest.removeprefix("sha256:"):
            raise SystemExit("Runner archive checksum mismatch")
        with tarfile.open(archive) as stream:
            # The archive is hash-verified against the official GitHub asset.
            stream.extractall(DIRECTORY)
        token = json.loads(subprocess.check_output(["gh", "api", "--method", "POST", f"repos/{REPOSITORY}/actions/runners/registration-token"]))["token"]
        result = subprocess.run([str(DIRECTORY / "config.sh"), "--unattended", "--url", f"https://github.com/{REPOSITORY}",
                                 "--token", token, "--name", "in-c-local-mac", "--labels", "in-c-release", "--work", "_work"],
                                cwd=DIRECTORY, capture_output=True)
        if result.returncode:
            raise SystemExit("Runner registration failed; credentials were not logged")
        print(f"Registered {REPOSITORY} runner at {DIRECTORY}; label in-c-release")
        return
    # Install/start as a per-user launch agent; never use sudo.
    if args.action == "start":
        service = DIRECTORY / ".service"
        if not service.exists():
            subprocess.run(["./svc.sh", "install"], cwd=DIRECTORY, check=True)
        subprocess.run(["./svc.sh", "start"], cwd=DIRECTORY, check=True)
    else:
        subprocess.run(["./svc.sh", "stop"], cwd=DIRECTORY, check=True)


if __name__ == "__main__":
    main()
