import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const base=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(base,'../../../..');
const qa=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(path.join(qa,'package.json')),{Resvg}=require('@resvg/resvg-js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ddirori-motif-icons-'));
const checks=[],check=(name,condition)=>{assert(condition,name);checks.push(name);};
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
try{
 const build=spawnSync(process.execPath,[path.join(base,'tools/build.mjs'),'--out',temp],{encoding:'utf8'});
 check('isolated rebuild succeeds',build.status===0);
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'generated/manifest.json')));
 check('manifest and all asset hashes reproduce',JSON.stringify(manifest)===JSON.stringify(JSON.parse(fs.readFileSync(path.join(temp,'manifest.json')))));
 for(const f of manifest.files)check(`hash ${f.file}`,sha(path.join(base,'generated',f.file))===f.sha256);
 const spec=JSON.parse(fs.readFileSync(path.join(base,'family.json')));
 const approved=fs.readFileSync(path.resolve(base,spec.sourceMotif),'utf8');
 check('approved SVG explicitly carries exact rhythm',approved.includes('data-rhythm="64-64-dotted32"')&&approved.includes('partial-fourth-beam')&&approved.includes('augmentation-dot'));
 for(const dir of ['a','b'])for(const product of spec.products)for(const [kind,key]of [['regular','paths'],['small','smallPaths']]){
  const parts=spec.directions[dir][key][product.id];
  check(`${dir}/${product.id}/${kind} three heads, three stems, three shared beams, one partial, one dot`,
   ['head-','stem-','shared-beam-'].every(prefix=>parts.filter(p=>p.role.startsWith(prefix)&&!p.role.endsWith('extension')).length===3)&&parts.filter(p=>p.role==='partial-fourth-beam').length===1&&parts.filter(p=>p.role==='augmentation-dot').length===1);
  const svg=fs.readFileSync(path.join(base,`generated/masters/${dir}/${product.id}-${kind}.svg`),'utf8');
  check(`${dir}/${product.id}/${kind} editable paths without external imagery or clipping`,!/<(text|image|filter|clipPath|mask)\b|href=|stroke=/.test(svg));
  fs.writeFileSync(path.join(temp,`${dir}-${product.id}-${kind}-glyph.png`),new Resvg(svg,{fitTo:{mode:'width',value:256}}).render().asPng());
  // Render each head separately: the upper stem cap must be covered by its head, never exposed.
  for(let i=1;i<=3;i++){
   const head=parts.find(p=>p.role.startsWith(`head-${i}`));
   const s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="${head.d}" fill="#000" fill-rule="evenodd"/></svg>`;
   fs.writeFileSync(path.join(temp,`${dir}-${product.id}-${kind}-head-${i}.png`),new Resvg(s,{fitTo:{mode:'width',value:256}}).render().asPng());
  }
 }
 for(const dir of ['a','b'])for(const id of ['play','studio','score']){
  const svg=fs.readFileSync(path.join(base,`generated/adaptive/${dir}/blue/${id}.svg`),'utf8');
  fs.writeFileSync(path.join(temp,`adaptive-${dir}-${id}.png`),new Resvg(svg,{fitTo:{mode:'width',value:108}}).render().asPng());
 }
 const py=spawnSync(process.env.DDIRORI_PYTHON||path.join(qa,'venv/bin/python'),[path.join(base,'tools/verify_pixels.py'),path.join(base,'generated'),temp],{encoding:'utf8'});
 if(py.status!==0)console.error(py.stderr,py.stdout);
 check('raster rhythm, joins, bounds, alpha, adaptive safe zone and platform formats',py.status===0);
 const pixels=JSON.parse(py.stdout);
 const baseline=JSON.parse(fs.readFileSync(path.join(base,'evidence/baseline.json')));
 const allowed=new Set(['docs/brand/ddirori-brand-system/README.md','docs/brand/ddirori-brand-system/visual-identity.md','docs/brand/ddirori-design-system/system-review.md']);
 const changed=Object.entries(baseline.hashes).filter(([f,h])=>!fs.existsSync(path.join(repo,f))||sha(path.join(repo,f))!==h).map(([f])=>f);
 check('all previous assets, product files, metadata and unrelated work preserved',changed.every(f=>allowed.has(f)));
 check('HEAD preserved',spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim()===baseline.head);
 const reviewed=path.join(base,'evidence/reviewed-raster-baseline.json');
 if(fs.existsSync(reviewed))for(const f of JSON.parse(fs.readFileSync(reviewed)).files)check(`independent reviewed raster ${f.file}`,sha(path.join(base,'generated',f.file))===f.sha256);
 fs.writeFileSync(path.join(base,'evidence/verification.json'),JSON.stringify({recordedAt:new Date().toISOString(),status:'passed',checks,pixels,preservation:{compared:Object.keys(baseline.hashes).length,changed,unchanged:Object.keys(baseline.hashes).length-changed.length},limitations:['Not a user recognition test or native OS install approval','A functional heads are brand shapes, not standard notation glyphs','16px is a stress preview, not an exact-rhythm readability guarantee']},null,2)+'\n');
 console.log(`${checks.length} checks passed; ${pixels.pngCount} PNGs inspected`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
