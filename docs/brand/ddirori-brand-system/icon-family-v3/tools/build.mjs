// Candidate-only build. No app source, previous assets or release folders are written.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const here=fileURLToPath(new URL('../',import.meta.url));
const repo=path.resolve(here,'../../../..');
const qa=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(path.join(qa,'package.json'));
const {Resvg}=require('@resvg/resvg-js');
const family=JSON.parse(fs.readFileSync(path.join(here,'family.json')));
const paletteFile=path.resolve(here,family.paletteSource);
const palettes=JSON.parse(fs.readFileSync(paletteFile)).variants.filter(p=>family.palettes.includes(p.key));
const targetArg=process.argv.indexOf('--out');
const out=targetArg<0?path.join(here,'generated'):path.resolve(process.argv[targetArg+1]);
const files=[];
function write(file,body){const p=path.join(out,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body);files.push(file);}
function svg(body,label,box='0 0 256 256'){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${label}">${body}</svg>\n`;}
function glyph(parts,fill){return parts.map(p=>`<path data-role="${p.role}" d="${p.d}" fill="${fill}" fill-rule="evenodd"/>`).join('');}
function icon(d,bg,ink,label){return svg(`<rect width="256" height="256" fill="${bg}"/>${glyph(d,ink)}`,label);}
function png(s,size){return new Resvg(s,{fitTo:{mode:'width',value:size},font:{loadSystemFonts:false}}).render().asPng();}
for(const [id,direction]of Object.entries(family.directions))for(const product of family.products){
 const normal=direction.paths[product.id],small=direction.smallPaths[product.id]||normal;
 for(const [kind,d]of [['regular',normal],['small',small]])write(`masters/${id}/${product.id}-${kind}.svg`,svg(glyph(d,'#202020'),`띠로리 ${product.name} · ${direction.name} · ${kind}`));
 for(const p of [{key:'mono',brand:{primary:'#FFFFFF',onPrimary:'#202020'}},...palettes]){
  const master=icon(normal,p.brand.primary,p.brand.onPrimary,`띠로리 ${product.name} · ${direction.name} · ${p.key}`);
  write(`icons/${id}/${p.key}/${product.id}.svg`,master);
  const {scale,translate}=family.android;
  write(`adaptive/${id}/${p.key}/${product.id}.svg`,svg(`<g transform="translate(${translate} ${translate}) scale(${scale})">${glyph(normal,p.brand.onPrimary)}</g>`,product.name,'0 0 108 108'));
  for(const size of [16,24,32,48,64,128,256,1024]){
   const s=icon(size<=family.smallMaxPx?small:normal,p.brand.primary,p.brand.onPrimary,`띠로리 ${product.name}`);
   write(`png/${id}/${p.key}/${product.id}-${size}.png`,png(s,size));
  }
 }
}
write('review-data.js', 'window.ddiroriIconReview='+JSON.stringify({products:family.products,palettes:palettes.map(p=>({key:p.key,name:p.name,brand:p.brand})),directions:family.directions})+';\n');
// Export A for all three review palettes, preserving existing product manifests.
for(const p of palettes)for(const product of family.products){
 const d=family.directions[family.recommendedDirection].paths[product.id];
 const small=family.directions[family.recommendedDirection].smallPaths[product.id]||d;
 const s=icon(d,p.brand.primary,p.brand.onPrimary,`띠로리 ${product.name}`);
 const prefix=`platform/${p.key}/${product.id}`;
 write(`${prefix}/layers/foreground.svg`,svg(glyph(d,p.brand.onPrimary),product.name));
 write(`${prefix}/layers/background.svg`,svg(`<rect width="256" height="256" fill="${p.brand.primary}"/>`,product.name));
 if(product.id!=='studio'){
  const app=product.id==='play'?'classical_local_library':'in_c_sheet';
  const contents=JSON.parse(fs.readFileSync(path.join(repo,`apps/${app}/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json`)));
  write(`${prefix}/ios/AppIcon.appiconset/Contents.json`,JSON.stringify(contents,null,2)+'\n');
  for(const item of contents.images)if(item.filename){const size=Math.round(parseFloat(item.size)*parseFloat(item.scale));write(`${prefix}/ios/AppIcon.appiconset/${item.filename}`,png(size<=family.smallMaxPx?icon(small,p.brand.primary,p.brand.onPrimary,product.name):s,size));}
  write(`${prefix}/google-play-512.png`,png(s,512));
  for(const [density,size]of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192}))write(`${prefix}/android/res/mipmap-${density}/ic_launcher.png`,png(s,size));
  const {scale,translate}=family.android;
  const vector=`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:scaleX="${scale}" android:scaleY="${scale}" android:translateX="${translate}" android:translateY="${translate}">${d.map(part=>`<path android:fillColor="${p.brand.onPrimary}" android:fillType="evenOdd" android:pathData="${part.d}"/>`).join('')}</group></vector>\n`;
  write(`${prefix}/android/res/drawable/ddirori_foreground.xml`,vector);
  write(`${prefix}/android/res/values/ddirori_brand.xml`,`<resources><color name="ddirori_background">${p.brand.primary}</color></resources>\n`);
  write(`${prefix}/android/res/mipmap-anydpi-v26/ic_launcher.xml`,'<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ddirori_background"/><foreground android:drawable="@drawable/ddirori_foreground"/><monochrome android:drawable="@drawable/ddirori_foreground"/></adaptive-icon>\n');
  write(`${prefix}/android/adaptive-foreground.svg`,svg(`<g transform="translate(${translate} ${translate}) scale(${scale})">${glyph(d,p.brand.onPrimary)}</g>`,product.name,'0 0 108 108'));
 }else{
  write(`${prefix}/desktop/icon.png`,png(s,1024));
  for(const size of [16,24,32,48,64,128,256,512])write(`${prefix}/desktop/linux/icon_${size}x${size}.png`,png(icon(size<=24?small:d,p.brand.primary,p.brand.onPrimary,product.name),size));
  // Legacy Electron ICNS iconset: explicit frame, inset, transparent outside. Not an Icon Composer layer.
  for(const logical of [16,32,128,256,512])for(const scale of [1,2]){
   const frame=svg(`<rect x="20" y="20" width="216" height="216" rx="48" fill="${p.brand.primary}"/><g transform="translate(20 20) scale(.84375)">${glyph(logical<=24?small:d,p.brand.onPrimary)}</g>`,product.name);
   write(`${prefix}/desktop/icon.iconset/icon_${logical}x${logical}${scale===2?'@2x':''}.png`,png(frame,logical*scale));
  }
 }
}
// Format conversion only: RGB PNG for opaque app catalogs; PNG-backed multi-size ICO and ICNS.
const python=process.env.DDIRORI_PYTHON||path.join(qa,'venv/bin/python');
const conversion=spawnSync(python,[path.join(here,'tools/containers.py'),out],{encoding:'utf8'});
if(conversion.status!==0)throw Error(conversion.stderr||conversion.stdout);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest={schemaVersion:1,status:'candidate, not installed or submitted',generator:'tools/build.mjs + tools/containers.py',sources:{'family.json':sha(path.join(here,'family.json')),'palette-candidates.json':sha(paletteFile),'build.mjs':sha(fileURLToPath(import.meta.url)),'containers.py':sha(path.join(here,'tools/containers.py')),'approved-motif.svg':sha(path.resolve(here,family.sourceMotif))},files:walk(out).filter(f=>path.basename(f)!=='manifest.json').sort().map(f=>({file:path.relative(out,f),bytes:fs.statSync(f).size,sha256:sha(f)}))};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`${manifest.files.length} candidate assets → ${out}`);
