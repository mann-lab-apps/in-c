"""Freeze/check R2 evidence independently of the historical R1 manifest."""
from pathlib import Path
import argparse
from datetime import datetime, timezone
import hashlib
import json
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
MANIFEST = HERE / 'revision.json'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def collect(paths):
    result = {}
    for path in paths:
        for p in (path.rglob('*') if path.is_dir() else [path]):
            if p.is_file() and '__pycache__' not in p.parts and p != MANIFEST:
                result[str(p.relative_to(ROOT))] = sha(p)
    return dict(sorted(result.items()))


parser = argparse.ArgumentParser()
parser.add_argument('--write', action='store_true', help='Freeze only after a reviewed change and fresh validation')
args = parser.parse_args()
if args.write:
    sources = [HERE / name for name in ['README.md', 'review.md', 'play.md', 'score.md', 'studio.md', 'shared-and-handoff.md', 'validation.md', 'revision.py', 'capture-current.py', 'verify-review.cjs']]
    sources += [ROOT / 'packages/ddirori_web' / name for name in ['catalog/product-r2.tsx', 'catalog/product-r2.css', 'catalog/product-r2.html', 'product-r2.config.ts', 'tsconfig.json', 'package.json']]
    dependencies = [ROOT / name for name in ['packages/ddirori_web/src', 'packages/ddirori_ui/lib', 'docs/brand/ddirori-design-system/generated', 'docs/brand/ddirori-design-system/tokens.json', 'docs/brand/ddirori-design-system/palette-candidates.json', 'docs/brand/ddirori-brand-system/assets', 'docs/brand/ddirori-brand-system/family.json', 'apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf', 'package-lock.json']]
    captures = {service: json.loads((HERE / 'evidence' / f'{service}-capture-source.json').read_text()) for service in ['play', 'score', 'studio']}
    for service, capture in captures.items():
        if capture['changedDuringRun']:
            raise SystemExit(f'{service}: capture inputs changed during run')
        for name, digest in capture['sourceHashes'].items():
            if sha(ROOT / name) != digest:
                raise SystemExit(f'{service}: input changed since capture: {name}; review before freezing')
    data = {
        'revision': 'product-design-r2', 'createdAtUtc': datetime.now(timezone.utc).isoformat(),
        'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'status': 'design-reviewed; product R2 not implemented; Studio intermittent audit tracked as T04',
        'workingTreeStatus': subprocess.check_output(['git', 'status', '--short'], cwd=ROOT, text=True),
        'designSources': collect(sources), 'dependencies': collect(dependencies),
        'productCaptureSources': {s: c['sourceHashes'] for s, c in captures.items()},
        'artifacts': collect([HERE / 'evidence', HERE / 'preview']),
        'limitations': ['No physical-device or human usability approval', 'Score successful PDF-engine path not directly captured', 'Studio final matrix passed but earlier intermittent validation failure preserved', 'R1 manifest not regenerated'],
    }
    MANIFEST.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print('Wrote R2 manifest; did not change R1')
else:
    data = json.loads(MANIFEST.read_text())
    groups = [data['designSources'], data['dependencies'], data['artifacts'], *data['productCaptureSources'].values()]
    failures = sorted({name for group in groups for name, digest in group.items() if not (ROOT / name).is_file() or sha(ROOT / name) != digest})
    if failures:
        raise SystemExit('R2 inputs/artifacts changed; inspect changes, do not blindly regenerate:\n' + '\n'.join(failures))
    print(f"R2 hashes verified: {len({name for g in groups for name in g})} files; recorded HEAD {data['head']}")
