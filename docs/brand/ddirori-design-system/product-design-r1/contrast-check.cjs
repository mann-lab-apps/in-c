const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const palettes=require('../palette-candidates.json');const tokens=require('../tokens.json');
function luminance(hex){const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
function ratio(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const checks=[];for(const p of palettes.variants.filter(x=>['violet','blue','coral'].includes(x.key)))for(const theme of ['light','dark']){
 const roles=Object.fromEntries(Object.entries(tokens.themes[theme]).map(([key,v])=>{if(!v.startsWith('@'))return [key,v];const [group,name]=v.slice(1).split('.');return [key,p[group][name]];}));
 for(const [fg,bg,min] of [['text','background',4.5],['muted','background',4.5],['onAction','action',4.5],['onSelection','selection',4.5],['onBrand','brand',4.5],['focus','surface',3],['controlBorder','surface',3],['error','surface',4.5],['success','surface',4.5],['warning','surface',4.5]]){
 const result=ratio(roles[fg],roles[bg]);checks.push({palette:p.key,theme,fg,bg,ratio:Number(result.toFixed(2)),minimum:min,pass:result>=min});
 }
}
fs.writeFileSync(path.join(__dirname,'evidence/contrast.json'),JSON.stringify({method:'sRGB relative luminance; opaque token pairs only. Not a full accessibility audit or color-vision simulation.',checks},null,2));
assert.ok(checks.every(x=>x.pass),JSON.stringify(checks.filter(x=>!x.pass)));console.log(`${checks.length} token contrast pairs passed`);
