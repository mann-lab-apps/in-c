"""Capture current product UI into R2 only; never edit product sources or R1 outputs."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess
from datetime import datetime, timezone
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
OUT=ROOT/'out/ddirori/product-design-r2'
OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('service',choices=['play','score','studio']);args=parser.parse_args()
service=args.service
sources={'play':['apps/classical_local_library/lib','apps/classical_local_library/test/product_design_r1_test.dart','packages/ddirori_ui/lib'], 'score':['apps/in_c_sheet/lib','apps/in_c_sheet/test/score_r1_adoption_test.dart','apps/in_c_sheet/test/adoption_pilot_test.dart','apps/in_c_sheet/test/brand_pilot_test.dart','packages/ddirori_ui/lib'], 'studio':['src/renderer/src','src/score-core','packages/ddirori_web/src','scripts/verify-ddirori-studio.cjs']}[service]
def hashes():
    files=[]
    for name in sources:
        p=ROOT/name;files.extend(p.rglob('*') if p.is_dir() else [p])
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file() and not p.name.endswith('.test.tsx')}
before=hashes(); env={**os.environ}; commands=[]; failures=[]
def run(cmd,cwd=ROOT):
    commands.append({'argv':cmd,'cwd':str(cwd.relative_to(ROOT))})
    r=subprocess.run(cmd,cwd=cwd,env=env,capture_output=True,text=True)
    with (HERE/'evidence'/f'{service}-capture.log').open('a') as f:f.write(r.stdout+r.stderr)
    if r.returncode: failures.append({'argv':cmd,'exitCode':r.returncode})
(HERE/'evidence'/f'{service}-capture.log').write_text('')
if service in ['play','score']:
    if not env.get('DDIRORI_BRAND_FONT') or not env.get('DDIRORI_MATERIAL_FONT'):raise SystemExit('Set Flutter capture font paths first')
if service=='play':
    env['DDIRORI_R1_CAPTURE_OUTPUT']=str(HERE/'evidence/play')
    run(['flutter','test','test/product_design_r1_test.dart'],ROOT/'apps/classical_local_library')
elif service=='score':
    source=ROOT/'apps/in_c_sheet/test/score_r1_adoption_test.dart';text=source.read_text()
    for name in ['adoption_pilot_test.dart','brand_pilot_test.dart']:text=text.replace(repr(name),repr(str(source.parent/name)))
    text=text.replace('../../docs/brand/ddirori-design-system/product-design-r1/returns/score-20261025/screens',str(HERE/'evidence/score'))
    target=OUT/'score_capture_test.dart';target.write_text(text);env['DDIRORI_SCORE_R1_CAPTURE']='true'
    run(['flutter','test',str(target)],ROOT/'apps/in_c_sheet')
else:
    config=OUT/'renderer.config.mjs';config.write_text("import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import {resolve} from 'node:path';export default defineConfig({base:'./',root:resolve('src/renderer'),plugins:[react()],build:{outDir:resolve('out/ddirori/product-design-r2/renderer'),emptyOutDir:true}});")
    run([str(ROOT/'node_modules/.bin/vite'),'build','--config',str(config)])
    if failures:raise SystemExit('Renderer build failed; no capture performed')
    text=(ROOT/'scripts/verify-ddirori-studio.cjs').read_text().replace("path.resolve(__dirname, '../out/ddirori/product-design-r1')",repr(str(HERE/'evidence/studio'))).replace("path.resolve(__dirname, '../out/renderer/index.html')",repr(str(OUT/'renderer/index.html')))
    insert="""    const rect=await win.webContents.executeJavaScript(`(()=>{const n=document.querySelector('.notation-preview');n.scrollIntoView({block:'start'});const r=n.getBoundingClientRect();return {x:Math.max(0,Math.ceil(r.x)),y:Math.max(0,Math.ceil(r.y)),width:Math.max(1,Math.floor(Math.min(r.width,innerWidth-Math.max(0,r.x)))),height:Math.max(1,Math.floor(Math.min(r.height,innerHeight-Math.max(0,r.y))))};})()`)
    fs.writeFileSync(path.join(out,'notation-region.png'),(await win.webContents.capturePage(rect)).toPNG())
"""
    text=text.replace('    await verifyR1(win)',insert+'    await verifyR1(win)')
    # Keep the observed failure explicit while collecting the remaining independent
    # captures. Assertions remain strict; the run exits nonzero after the matrix.
    needle="""  assert.equal(await run(() => document.querySelector('[aria-label="표기 세로 이동"]').getAttribute('aria-invalid')), 'true')"""
    text=text.replace("const assert = require('node:assert/strict')", "const assert = require('node:assert/strict'); const auditFailures=[]")
    text=text.replace(needle, "  try {\n"+needle+"\n  } catch(error) {auditFailures.push(String(error)); console.error('R2 audit: invalid-after-composition failed',error)}")
    text=text.replace('    await verifyR1(win)', "    await verifyR1(win)\n    fs.writeFileSync(path.join(out,'r2-audit.json'),JSON.stringify({failures:auditFailures,scope:'Original assertions retained; collect later independent evidence after known invalid-after-composition failure.'},null,2))\n    assert.deepEqual(auditFailures,[], 'R2 actual-product audit failures remain')")
    target=OUT/'studio-capture.cjs';target.write_text(text);env.pop('ELECTRON_RUN_AS_NODE',None)
    run([str(ROOT/'node_modules/.bin/electron'),str(target)])
after=hashes(); changed=[p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)]
(HERE/'evidence'/f'{service}-capture-source.json').write_text(json.dumps({'service':service,'capturedAtUtc':datetime.now(timezone.utc).isoformat(),'failures':failures,'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'commands':commands,'sourceHashes':after,'changedDuringRun':changed,'scope':'Actual UI with fixture; no physical device claim. See validation.md.'},ensure_ascii=False,indent=2))
if failures:raise SystemExit(service+' capture completed with validation failure; see log and source JSON')
if changed:raise SystemExit('Sources changed during capture; review/re-run: '+str(changed))
print(service+' capture passed; input hashes stable')
