"""Write/verify a content-based design revision; never invent a future Git commit."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
MANIFEST=HERE/'revision.json'
def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def mapping(paths):
    return {str(p.relative_to(ROOT)):digest(p) for p in sorted(set(paths)) if p.is_file()}
if '--check' in sys.argv:
    manifest=json.loads(MANIFEST.read_text())
    failed=[]
    for category in ['designFiles','dependencyFiles','artifacts']:
        for name, expected in manifest[category].items():
            p=ROOT/name
            if not p.is_file() or digest(p)!=expected: failed.append(name)
    if failed: raise SystemExit('Changed since R1 manifest:\n'+'\n'.join(failed))
    print('R1 design/dependency/artifact hashes match')
else:
    local=[p for p in HERE.iterdir() if p.is_file() and p.name!='revision.json']
    catalog=[ROOT/'packages/ddirori_web/catalog'/n for n in ['product-review.tsx','product-review.css','main.tsx']]
    dependencies=list((ROOT/'packages/ddirori_web/src').glob('*'))
    dependencies += [ROOT/'docs/brand/ddirori-design-system'/n for n in ['tokens.json','palette-candidates.json','color-system.json','generated/tokens.css','generated/geometry.json']]
    dependencies += list((ROOT/'docs/brand/ddirori-brand-system/icon-family-v8/generated/transparent').glob('*.svg'))
    dependencies += list((ROOT/'docs/brand/ddirori-brand-system/assets').glob('bach*.svg'))
    artifacts=[p for folder in ['evidence','preview'] for p in (HERE/folder).rglob('*') if p.is_file()]
    manifest={'revision':'product-design-r1','status':'design-ready; product-implementation-and-human-review-pending','baselineProductCommit':'6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1','observedHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'note':'Shared Item changes were observed from concurrent work. Dependency hashes describe what was reviewed, not ownership or approval. Palette/runtime launcher remain unapproved.','designFiles':mapping(local+catalog),'dependencyFiles':mapping(dependencies),'artifacts':mapping(artifacts)}
    MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'Wrote {MANIFEST.relative_to(ROOT)}')
