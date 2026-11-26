import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {isDeepStrictEqual} from 'node:util';
import {spawnSync} from 'node:child_process';
const base=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(base,'../../../..');
const qa=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(path.join(qa,'package.json')),{Resvg}=require('@resvg/resvg-js');
const evidence=path.join(base,'evidence');
const current = process.argv.includes('--current');
const reportPath = current
  ? path.resolve(repo, process.env.DDIRORI_ICON_REPORT || 'out/ddirori/icon-family-v2-verification.json')
  : path.join(evidence, 'verification.json');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ddirori-icons-'));
const checks=[];const check=(name,condition)=>{assert(condition,name);checks.push(name);};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
try{
 const built=spawnSync(process.execPath,[path.join(base,'tools/build.mjs'),'--out',temp],{encoding:'utf8'});check('isolated rebuild succeeds',built.status===0);
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'generated/manifest.json')));
 const rebuilt=JSON.parse(fs.readFileSync(path.join(temp,'manifest.json')));
 const reencodedPngs = [];
 if (current) {
  const contract = spawnSync(process.execPath, [path.join(base, 'tools/check-contract.mjs')], {encoding: 'utf8'});
  assert.equal(contract.status, 0, contract.stderr || contract.stdout);
  checks.push('checked-in exports and reviewed rasters match their hashes');
  const {files: originals, ...source} = manifest;
  const {files: rebuiltFiles, ...rebuiltSource} = rebuilt;
  check('rebuilt manifest source matches', isDeepStrictEqual(source, rebuiltSource));
  check('rebuilt file list matches', isDeepStrictEqual(originals.map(f => f.file), rebuiltFiles.map(f => f.file)));
  for (const [index, file] of originals.entries()) {
   if (isDeepStrictEqual(file, rebuiltFiles[index])) continue;
   assert.equal(path.extname(file.file), '.png', `Rebuilt export bytes differ: ${file.file}`);
   reencodedPngs.push(file.file);
  }
 } else {
  check('generated manifest is deterministic',JSON.stringify(manifest)===JSON.stringify(rebuilt));
 }
 for (const file of manifest.files) {
  const exported = path.join(base, 'generated', file.file);
  check(`bytes and hash ${file.file}`, fs.statSync(exported).size === file.bytes && sha(exported) === file.sha256);
 }
 const spec=JSON.parse(fs.readFileSync(path.join(base,'family.json')));
 for(const d of ['a','b'])for(const p of spec.products){
  const s=fs.readFileSync(path.join(base,`generated/masters/${d}/${p.id}-regular.svg`),'utf8');
  check(`${d}/${p.id} no embedded text/image/filter/stroke`,!/<(text|image|filter)\b|stroke=/.test(s));
  fs.writeFileSync(path.join(temp,`${d}-${p.id}-glyph.png`),new Resvg(s,{fitTo:{mode:'width',value:256}}).render().asPng());
 }
 for(const id of ['play','score']){
  const s=fs.readFileSync(path.join(base,`generated/platform/violet/${id}/android/adaptive-foreground.svg`),'utf8');
  fs.writeFileSync(path.join(temp,`adaptive-${id}.png`),new Resvg(s,{fitTo:{mode:'width',value:108}}).render().asPng());
 }
 const pixelArgs = [path.join(base, 'tools/verify_pixels.py'), path.join(base, 'generated'), temp];
 if (reencodedPngs.length) pixelArgs.push(JSON.stringify(reencodedPngs));
 const py = spawnSync(process.env.DDIRORI_PYTHON || path.join(qa, 'venv/bin/python'), pixelArgs, {encoding: 'utf8'});
 assert.equal(py.status, 0, py.stderr || py.stdout);
 checks.push('pixel dimensions, alpha, containers and adaptive safe zone');
 const pixels=JSON.parse(py.stdout);
 if (reencodedPngs.length) checks.push('rebuilt PNG pixels and metadata match');
 let preservation;
 if (!current) {
  // Existing task work is a separate baseline. This run permits only the audited documentation and Studio field patches.
  const baseline=JSON.parse(fs.readFileSync(path.join(evidence,'baseline.json')));
  const allowed=new Set(['src/renderer/src/SpanProperties.tsx','.github/workflows/design-system.yml',
  'docs/brand/ddirori-brand-system/README.md','docs/brand/ddirori-brand-system/visual-identity.md',
  'docs/brand/ddirori-design-system/README.md','docs/brand/ddirori-design-system/system-review.md',
  'docs/brand/ddirori-design-system/specifications/services/studio.md','docs/brand/ddirori-design-system/specifications/decisions.md']);
  const changed=Object.entries(baseline.hashes).filter(([f,h])=>!fs.existsSync(path.join(repo,f))||sha(path.join(repo,f))!==h).map(([f])=>f);
  check('baseline changes restricted to scoped paths',changed.every(f=>allowed.has(f)));
  const head=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim();
  check('HEAD preserved',head===baseline.head);
  preservation = {compared:Object.keys(baseline.hashes).length, changed, unchanged:Object.keys(baseline.hashes).length-changed.length};
 }
 const report = {recordedAt:new Date().toISOString(),status:'passed',checks,pixels,preservation,limitations:['Geometry/format/rebuild checks do not establish user recognition or OS installation approval','Source icon family and palette remain candidates']};
 fs.mkdirSync(path.dirname(reportPath), {recursive:true});
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 console.log(`${checks.length} checks passed; ${pixels.pngCount} PNGs inspected`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
