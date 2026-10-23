"""Stage an ignored Gradle properties file from the Mac's external secret directory."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

operation, manifest_path, source_root = sys.argv[1:]
manifest = json.loads(Path(manifest_path).read_text())
app = manifest["app"]
if not re.fullmatch(r"[a-z][a-z0-9_-]*", app):
    raise SystemExit("invalid app")
root = Path(source_root).resolve(strict=True)
target = (root / manifest["source_path"] / "android/key.properties").resolve()
if root not in target.parents:
    raise SystemExit("signing path escapes checkout")
if operation == "cleanup":
    target.unlink(missing_ok=True)
elif operation == "stage":
    source = Path.home() / ".config/in-c-release" / app / "key.properties"
    if target.exists():
        raise SystemExit("refusing to overwrite signing configuration")
    subprocess.run(["git", "check-ignore", "-q", str(target)], cwd=root, check=True)
    if not source.is_file():
        raise SystemExit(f"configure external signing file: {source}")
    # storeFile must be absolute in this external properties file.
    text = source.read_text()
    stores = re.findall(r"^storeFile=(.+)$", text, re.MULTILINE)
    if len(stores) != 1 or not Path(stores[0]).is_absolute() or not Path(stores[0]).is_file():
        raise SystemExit("external storeFile must be an existing absolute path")
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        stream.write(text)
else:
    raise SystemExit("operation must be stage or cleanup")
