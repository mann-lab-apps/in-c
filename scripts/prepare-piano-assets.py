"""Prepare pinned CC BY 3.0 piano samples; run with the experiment's audio extra.

Only explicit files in assets/piano/salamander-source.json are downloaded.
Raw files stay in ignored external-references; output OGGs are ignored public assets.
"""
import concurrent.futures
import hashlib
import json
import math
import urllib.request
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / "assets/piano/salamander-source.json").read_text())
cache = ROOT / "external-references/piano/salamander"
output = ROOT / "src/renderer/public/piano"
cache.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(entry):
    raw = cache / entry["sourceFile"]
    if not raw.exists():
        request = urllib.request.Request(entry["sourceUrl"], headers={"User-Agent": "ddirori-asset-preparer"})
        with urllib.request.urlopen(request, timeout=60) as response:
            raw.write_bytes(response.read())
    data = raw.read_bytes()
    git_blob = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    if git_blob != entry["gitBlobSha1"]:
        raise ValueError(f"Pinned source hash mismatch: {raw.name}")
    path = output / entry["file"]
    samples, rate = sf.read(raw, dtype="float32", always_2d=True)
    # Retain the recorded attack/dynamics; cap the natural tail at 12s with a fade.
    samples = samples[:rate * 12]
    if rate != 32000:
        factor = math.gcd(rate, 32000)
        samples = resample_poly(samples, 32000 // factor, rate // factor, axis=0)
    fade = min(3200, len(samples))
    samples[-fade:] *= np.linspace(1, 0, fade)[:, None]
    sf.write(path, samples, 32000, format="OGG", subtype="VORBIS", compression_level=0.6)
    return {**entry, "sourceSha256": digest(raw), "sha256": digest(path),
            "bytes": path.stat().st_size, "frames": len(samples), "sampleRate": 32000,
            "channels": samples.shape[1], "durationSeconds": len(samples) / 32000}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    entries = list(pool.map(prepare, spec["samples"]))
manifest = {**{k: v for k, v in spec.items() if k != "samples"}, "samples": entries,
            "changes": "Selected four recorded velocity layers; resampled to 32kHz stereo, "
                       "trimmed to at most 12s, 100ms tail fade, OGG Vorbis compression. "
                       "No separate release/noise/resonance samples included.",
            "compressedBytes": sum(e["bytes"] for e in entries),
            "decodedBytes": sum(e["frames"] * e["channels"] * 4 for e in entries)}
(output / "manifest.json").write_text(json.dumps(manifest, indent=2))
license_path = ROOT / "assets/piano/Salamander-LICENSE.txt"
(output / "LICENSE.txt").write_text(license_path.read_text())
(output / "CREDITS.txt").write_text(spec["attribution"] + "\n" + spec["licenseUrl"]
                                   + "\n" + manifest["changes"] + "\n")
print(json.dumps({k: manifest[k] for k in ("id", "compressedBytes", "decodedBytes")}, indent=2))
