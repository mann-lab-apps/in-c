import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(process.env.DDIRORI_BRAND_TOOLS?path.join(process.env.DDIRORI_BRAND_TOOLS,'package.json'):'/tmp/ddirori-brand-tools/package.json');
const {Resvg}=require('@resvg/resvg-js');
const f=JSON.parse(fs.readFileSync(path.join(root,'family.json')));
const source=fs.readFileSync(path.resolve(root,f.motifSource),'utf8');
const group=source.slice(source.indexOf('<g fill='),source.lastIndexOf('</svg>'));
const palette=JSON.parse(fs.readFileSync(path.resolve(root,f.paletteSource))).variants.find(v=>v.key==='blue').brand;
const arg=process.argv.indexOf('--out'),out=arg>=0?path.resolve(process.argv[arg+1]):path.join(root,'generated');
const sha=x=>createHash('sha256').update(x).digest('hex'),files=[];
function write(file,data){const p=path.join(out,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data);files.push({file,sha256:sha(data)});}
function rhythm(p,ink){return `<g transform="${p.motifTransform}">${group.replaceAll('currentColor',ink)}</g>`;}
function wrap(body,label){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${label}">${body}</svg>`;}
function glyph(p,ink,cut=true){
 if(p.standalone)return rhythm(p,ink);
 const mask=`<defs><mask id="cutout" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256" style="mask-type:luminance"><path d="${p.body}" fill="white"/><path d="${p.details}" fill="black"/>${cut?rhythm(p,'#000'):''}</mask></defs>`;
 return mask+`<g transform="${p.bodyTransform}"><path d="${p.body}" fill="${ink}" mask="url(#cutout)"/></g>`;
}
for(const p of [...f.products,...f.alternatives]){
 for(const [theme,bg]of [['blue',palette.primary],['mono','#FFFFFF'],['transparent',null]]){
  const s=wrap((bg?`<rect width="256" height="256" fill="${bg}"/>`:'')+glyph(p,palette.onPrimary),`${p.name} · 64·64·점32`);
  write(`${theme}/${p.id}.svg`,s);
  for(const size of [16,24,32,48,64,128,256,512])write(`${theme}/${p.id}-${size}.png`,new Resvg(s,{fitTo:{mode:'width',value:size}}).render().asPng());
 }
 const rhythmSvg=wrap(`<g transform="${p.bodyTransform}">${rhythm(p,'#202020')}</g>`,p.name);
 write(`diagnostics/${p.id}-motif.png`,new Resvg(rhythmSvg).render().asPng());
 if(!p.standalone)write(`diagnostics/${p.id}-carrier.png`,new Resvg(wrap(glyph(p,palette.onPrimary,false),p.name)).render().asPng());
}
write('review-data.js','window.family='+JSON.stringify(f)+';');
const sources=Object.fromEntries(['family.json',f.motifSource,f.previousMotif,f.paletteSource,'tools/build.mjs'].map(name=>[name,sha(fs.readFileSync(path.resolve(root,name)))]));
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({status:f.status,sources,files},null,2)+'\n');
console.log(`Generated ${files.length} candidate files`);
