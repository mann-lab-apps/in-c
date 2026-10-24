import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';
const base=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(base,'../../../..'),qa=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(path.join(qa,'package.json')),{Resvg}=require('@resvg/resvg-js');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');const checks=[],check=(n,v)=>{assert(v,n);checks.push(n);};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ddirori-v4-'));
try{
 const build=spawnSync(process.execPath,[path.join(base,'tools/build.mjs'),'--out',temp],{encoding:'utf8'});check('isolated build succeeds',build.status===0);
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'generated/manifest.json')));
 check('deterministic export',JSON.stringify(manifest)===JSON.stringify(JSON.parse(fs.readFileSync(path.join(temp,'manifest.json')))));
 for(const f of manifest.files)check(`hash ${f.file}`,sha(path.join(base,'generated',f.file))===f.sha256);
 for(const id of ['play','studio','score']){
  for(const kind of ['regular','small']){
   const s=fs.readFileSync(path.join(base,`generated/masters/a/${id}-${kind}.svg`),'utf8');check(`${id}/${kind} editable standalone SVG`,!/<(image|text|filter|mask|clipPath)\b|href=/.test(s));
   fs.writeFileSync(path.join(temp,`${id}-${kind}-glyph.png`),new Resvg(s,{fitTo:{mode:'width',value:256}}).render().asPng());
  }
  const s=fs.readFileSync(path.join(base,`generated/adaptive/a/blue/${id}.svg`),'utf8');fs.writeFileSync(path.join(temp,`adaptive-${id}.png`),new Resvg(s,{fitTo:{mode:'width',value:108}}).render().asPng());
 }
 const py=spawnSync(process.env.DDIRORI_PYTHON||path.join(qa,'venv/bin/python'),[path.join(base,'tools/verify_pixels.py'),path.join(base,'generated'),temp],{encoding:'utf8'});if(py.status!==0)console.error(py.stderr);check('PNG containers, dimensions, alpha, bounds and adaptive safe circle',py.status===0);
 const baseline=JSON.parse(fs.readFileSync(path.join(base,'evidence/baseline.json'))),allowed=new Set(['docs/brand/ddirori-brand-system/README.md','docs/brand/ddirori-brand-system/visual-identity.md','docs/brand/ddirori-design-system/system-review.md']);
 const changed=Object.entries(baseline.hashes).filter(([f,h])=>!fs.existsSync(path.join(repo,f))||sha(path.join(repo,f))!==h).map(([f])=>f);
 check('previous candidates, product code, metadata and unrelated files preserved',changed.every(f=>allowed.has(f)));check('HEAD preserved',spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim()===baseline.head);
 fs.writeFileSync(path.join(base,'evidence/verification.json'),JSON.stringify({status:'passed',checks,pixels:JSON.parse(py.stdout),preservation:{compared:Object.keys(baseline.hashes).length,changed},limitations:['No user recognition test','No native installation or packaging test','No music motif fidelity requirement applies to these functional pictograms']},null,2)+'\n');
 console.log(`${checks.length} asset checks passed`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
