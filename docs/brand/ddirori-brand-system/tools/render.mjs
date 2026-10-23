import {createRequire} from 'node:module';
const toolsRoot=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(toolsRoot+'/package.json');
const {Resvg}=require('@resvg/resvg-js');
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(base,'../../..'),assets=path.join(base,'assets');
const apply=process.argv.includes('--apply');
const palette=JSON.parse(await readFile(path.join(repo,'docs/brand/ddirori-design-system/palette-pilot.json'),'utf8'));
const render=async(svg,size,target)=>{await mkdir(path.dirname(target),{recursive:true});const png=new Resvg(svg,{fitTo:{mode:'width',value:size},font:{fontFiles:[toolsRoot+'/Pretendard.ttf'],loadSystemFonts:false,defaultFontFamily:'Pretendard'}}).render().asPng();await writeFile(target,png);
if(svg.includes('<rect width="256" height="256"')){
 const result=spawnSync(toolsRoot+'/venv/bin/python',['-c','from PIL import Image; import sys; p=sys.argv[1]; im=Image.open(p); assert im.getextrema()[-1]==(255,255); im.convert("RGB").save(p)',target],{encoding:'utf8'});
 if(result.status!==0)throw Error(result.stderr);
}};
for(const file of await readdir(assets))if(file.endsWith('.svg')&& !file.startsWith('wordmark')&&!file.startsWith('lockup')){
 await render(await readFile(path.join(assets,file),'utf8'),file.startsWith('banner')?1600:file.startsWith('store')?660:1024,path.join(assets,'png',file.replace('.svg','.png')));
}
const family=JSON.parse(await readFile(path.join(base,'family.json'),'utf8'));
for(const id of ['play','score']){
 const app=id==='play'?'classical_local_library':'in_c_sheet',root=path.join(repo,'apps',app);
 const svg=await readFile(path.join(assets,`icon-${id}.svg`),'utf8');
 const dest=path.join(assets,'platform',id);await mkdir(dest,{recursive:true});
 await render(svg,1024,path.join(dest,'ios-1024.png'));await render(svg,512,path.join(dest,'play-store-512.png'));
 if(!apply)continue;
 const ios=path.join(root,'ios/Runner/Assets.xcassets/AppIcon.appiconset');
 const contents=JSON.parse(await readFile(path.join(ios,'Contents.json'),'utf8'));
 for(const image of contents.images)if(image.filename)await render(svg,Math.round(parseFloat(image.size)*parseFloat(image.scale)),path.join(ios,image.filename));
 const res=path.join(root,'android/app/src/main/res');
 for(const [density,size]of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192}))await render(svg,size,path.join(res,`mipmap-${density}/ic_launcher.png`));
 const p=family.products.find(p=>p.id===id);
 const shape=p.path+' '+(p.cutouts||[]).join(' ');
 const vector=`<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><group android:scaleX="0.27" android:scaleY="0.27" android:translateX="19.44" android:translateY="19.44"><path android:fillColor="${palette.brand.onPrimary}" android:fillType="evenOdd" android:pathData="${shape}"/></group></vector>\n`;
 await writeFile(path.join(res,'drawable/ddirori_launcher_foreground.xml'),vector);
 await mkdir(path.join(res,'mipmap-anydpi-v26'),{recursive:true});
 await writeFile(path.join(res,'mipmap-anydpi-v26/ic_launcher.xml'),`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ddirori_icon_background"/><foreground android:drawable="@drawable/ddirori_launcher_foreground"/><monochrome android:drawable="@drawable/ddirori_launcher_foreground"/></adaptive-icon>\n`);
 await writeFile(path.join(res,'values/ddirori_brand.xml'),'<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ddirori_icon_background">'+palette.brand.primary+'</color></resources>\n');
}
const files=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else if(e.name!=='manifest.json'){const body=await readFile(p);files.push({file:path.relative(assets,p),bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')})}}}
await walk(assets);await writeFile(path.join(assets,'manifest.json'),JSON.stringify({generatedBy:'tools/build.py + tools/render.mjs',files},null,2)+'\n');
console.log(`${files.length} brand assets; platform application ${apply}`);
