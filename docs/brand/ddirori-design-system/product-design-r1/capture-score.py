"""Redirect existing actual-app capture tests to R1, without editing app source/tests."""
from pathlib import Path
import os
import subprocess
import hashlib
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / 'apps/in_c_sheet/test/adoption_pilot_test.dart'
OUT = ROOT / 'out/ddirori/product-design-r1'
OUT.mkdir(parents=True, exist_ok=True)
text = SOURCE.read_text().replace("'brand_pilot_test.dart'", repr(str(ROOT / 'apps/in_c_sheet/test/brand_pilot_test.dart')))
text = text.replace('../../docs/brand/ddirori-design-system/evidence/adoption-pilot/', str(HERE / 'evidence') + '/actual-')
target = OUT / 'score_capture_test.dart'
target.write_text(text)
env = {**os.environ, 'DDIRORI_PILOT_CAPTURE': 'true'}
# Font paths are caller-provided. Missing fonts must not be reported as rendered QA.
if not env.get('DDIRORI_BRAND_FONT') or not env.get('DDIRORI_MATERIAL_FONT'):
    raise SystemExit('Set DDIRORI_BRAND_FONT and DDIRORI_MATERIAL_FONT before visual capture')
result = subprocess.run(['flutter', 'test', str(target)], cwd=ROOT / 'apps/in_c_sheet', env=env, capture_output=True, text=True)
(HERE / 'evidence/score-capture.log').write_text(result.stdout + result.stderr)
(HERE / 'evidence/score-capture-source.json').write_text(json.dumps({'source': str(SOURCE.relative_to(ROOT)), 'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'adaptation': 'Only fixture import path and screenshot destination changed; package app sources unchanged.', 'exitCode': result.returncode}, indent=2))
print(result.stdout[-1000:])
raise SystemExit(result.returncode)
