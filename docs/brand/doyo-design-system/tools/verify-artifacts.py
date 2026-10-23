"""Check local references, generated-file reproducibility and optional baseline."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
from datetime import datetime, timezone
import argparse
import hashlib
import json
import re
import struct
import subprocess

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--baseline', type=Path)
args = parser.parse_args()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


generated = [*root.joinpath('generated').glob('*'), root/'assets/doyo-loader.svg', root/'assets/doyo-loader-still.svg']
before = {str(p): digest(p) for p in generated}
subprocess.run(['python3', str(root/'tools/build.py')], check=True)
assert all(digest(Path(p)) == value for p, value in before.items()), 'Generated artifacts were stale'


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        self.links.extend(value for key, value in attrs if key in ('src', 'href'))


checked = 0
missing = []
for page in [*root.glob('*.md'), root/'assets/PROVENANCE.md', root/'preview/index.html']:
    text = page.read_text()
    if page.suffix == '.md':
        links = re.findall(r'\]\(([^)]+)\)', text)
    else:
        html = Links()
        html.feed(text)
        links = html.links
    for link in links:
        url = urlparse(link)
        if url.scheme or link.startswith('#'):
            continue
        target = page.parent / unquote(url.path)
        checked += 1
        if not target.exists():
            missing.append({'page': str(page.relative_to(root)), 'target': link})
assert not missing, missing
baseline_mismatches = []
compared = 0
if args.baseline:
    baseline = json.loads(args.baseline.read_text())
    compared = len(baseline)
    baseline_mismatches = [p for p, value in baseline.items() if not Path(p).is_file() or digest(Path(p)) != value]
    assert not baseline_mismatches, baseline_mismatches
manifest = []
for p in sorted((root/'assets').rglob('*')):
    if not p.is_file() or p.name == 'manifest.json':
        continue
    item = {'file': str(p.relative_to(root)), 'sha256': digest(p), 'bytes': p.stat().st_size}
    manifest.append(item)
(root/'assets/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
pngs = []
for p in sorted((root/'evidence').glob('*.png')):
    b = p.read_bytes()
    assert b[:8] == b'\x89PNG\r\n\x1a\n'
    width, height = struct.unpack('>II', b[16:24])
    pngs.append({'file': p.name, 'width': width, 'height': height, 'sha256': digest(p)})
report = {'generatedAt': datetime.now(timezone.utc).isoformat(), 'status': 'passed',
          'localLinksChecked': checked, 'missingLinks': missing,
          'generatedFilesReproducible': len(generated), 'assetHashes': len(manifest),
          'baselineFilesCompared': compared, 'baselineMismatches': baseline_mismatches,
          'screenshots': pngs}
(root/'evidence/artifact-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({key: value for key, value in report.items() if key != 'screenshots'}, ensure_ascii=False))
