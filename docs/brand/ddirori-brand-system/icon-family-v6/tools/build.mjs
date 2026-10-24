import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {Resvg}=require('@resvg/resvg-js');
const family=JSON.parse(fs.readFileSync(path.join(root,'family.json')));
const motif=fs.readFileSync(path.resolve(root,family.motifSource),'utf8');
const inner=motif.slice(motif.indexOf('<g fill='),motif.lastIndexOf('</svg>')).replaceAll('currentColor','#000');
const palette=JSON.parse(fs.readFileSync(path.resolve(root,family.paletteSource))).variants.find(v=>v.key==='blue').brand;
const arg=process.argv.indexOf('--out');
const out=arg>=0?path.resolve(process.argv[arg+1]):path.join(root,'generated');
const sha=x=>createHash('sha256').update(x).digest('hex');
const files=[];
function write(file,data){const p=path.join(out,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);files.push({file,sha256:sha(data)});}
function svg(p,bg,includeMotif=true){
 const mask=`<mask id="cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" style="mask-type:luminance"><path d="${p.body}" fill="white"/><path d="${p.details}" fill="black"/>${includeMotif?`<g transform="${p.motifTransform}">${inner}</g>`:''}</mask>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="띠로리 ${p.name} · 64·64·점32 음형"><defs>${mask}</defs>${bg?`<rect width="256" height="256" fill="${bg}"/>`:''}<g transform="${p.bodyTransform}"><path d="${p.body}" fill="${palette.onPrimary}" mask="url(#cutout)"/></g></svg>`;
}
for(const p of family.products){
 for(const [name,bg]of [['blue',palette.primary],['mono','#FFFFFF'],['transparent',null]]){
  const s=svg(p,bg);write(`${name}/${p.id}.svg`,s);
  for(const size of [16,24,32,48,64,128,256,512])write(`${name}/${p.id}-${size}.png`,new Resvg(s,{fitTo:{mode:'width',value:size}}).render().asPng());
 }
 // Solid carrier and motif are separately rasterized for containment checks.
 const solid=svg(p,null,false);write(`diagnostics/${p.id}-carrier.png`,new Resvg(solid).render().asPng());
 const m=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><g transform="${p.bodyTransform}"><g transform="${p.motifTransform}">${inner}</g></g></svg>`;
 write(`diagnostics/${p.id}-motif.png`,new Resvg(m).render().asPng());
}
write('review-data.js','window.family='+JSON.stringify(family)+';');
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({status:family.status,motifSourceSha256:sha(motif),familySha256:sha(fs.readFileSync(path.join(root,'family.json'))),files},null,2)+'\n');
console.log(`Generated ${files.length} candidate files`);
