"""R3-only revision freeze/check. Never updates R1/R2 evidence or manifests."""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
MANIFEST = HERE / 'revision.json'


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def collect(paths):
    items = {}
    for path in paths:
        for p in (path.rglob('*') if path.is_dir() else [path]):
            if p.is_file() and p != MANIFEST and '__pycache__' not in p.parts:
                items[str(p.relative_to(ROOT))] = sha(p)
    return dict(sorted(items.items()))


parser = argparse.ArgumentParser()
parser.add_argument('--write', action='store_true', help='Freeze after reviewed changes and fresh validation only')
args = parser.parse_args()
if args.write:
    audit = json.loads((HERE / 'evidence/source-audit.json').read_text())
    build = json.loads((HERE / 'evidence/build-inputs.json').read_text())
    if build['changedDuringBuild'] or build['typecheckExit'] or build['buildExit']:
        raise SystemExit('R3 build failed or input drifted; inspect and validate before freeze')
    product_sources = {name: entry['sha256'] for name, entry in audit['files'].items()}
    for name, digest in {**product_sources, **build['sourceHashes']}.items():
        if not (ROOT / name).is_file() or sha(ROOT / name) != digest:
            raise SystemExit('Source changed since audit/build; review before freeze: ' + name)
    browser = json.loads((HERE / 'evidence/review/results.json').read_text())
    if browser['errors']:
        raise SystemExit('R3 browser errors remain')
    sources = list(HERE.glob('*.md')) + list(HERE.glob('*.py')) + list(HERE.glob('*.cjs'))
    sources += [ROOT / 'packages/ddirori_web' / p for p in ['catalog/product-r3.html', 'catalog/product-r3.tsx', 'catalog/product-r3.css', 'product-r3.config.ts']]
    data = {
        'revision': 'product-design-r3', 'atUtc': datetime.now(timezone.utc).isoformat(),
        'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'status': 'design and review prototype; product implementation and human/device validation pending',
        'designSources': collect(sources), 'buildDependencies': build['sourceHashes'],
        'auditedSources': product_sources, 'artifacts': collect([HERE / 'assets', HERE / 'evidence', HERE / 'preview']),
        'historicalRevisions': {str(p.relative_to(ROOT)): sha(p) for p in [HERE.parent / 'product-design-r1/revision.json', HERE.parent / 'product-design-r2/revision.json']},
        'limitations': ['Manual handoffs only; no direct launch/deep link or common work IDs', 'Memory chooser/save/play/annotation examples', 'No physical device or human validation', 'Concurrent R2 product work preserved'],
    }
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('Wrote R3 revision only')
else:
    data = json.loads(MANIFEST.read_text())
    groups = [data[k] for k in ['designSources', 'buildDependencies', 'auditedSources', 'artifacts', 'historicalRevisions']]
    bad = sorted({name for group in groups for name, digest in group.items() if not (ROOT / name).is_file() or sha(ROOT / name) != digest})
    if bad:
        raise SystemExit('R3 inputs changed. Review causes; do not blindly re-freeze:\n' + '\n'.join(bad))
    print('R3 verified:', len({name for group in groups for name in group}), 'file hashes; recorded HEAD', data['head'])
