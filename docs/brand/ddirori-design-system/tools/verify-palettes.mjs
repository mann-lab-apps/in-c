import {readFile, writeFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = new URL('../', import.meta.url);
const candidates = JSON.parse(await readFile(new URL('palette-candidates.json', base)));
const source = JSON.parse(await readFile(new URL('tokens.json', base)));
const resolved = JSON.parse(await readFile(new URL('generated/tokens.resolved.json', base)));
const lum = c => c.match(/[a-f\d]{2}/gi).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const checks = [], invariants = [];
function check(palette, mode, fg, bg, a, b, min) {
  const ratio=contrast(a,b);
  checks.push({palette,mode,fg,bg,ratio:+ratio.toFixed(2),minimum:min});
  assert(ratio >= min, JSON.stringify(checks.at(-1)));
}
for (const p of candidates.variants) for (const mode of ['light','dark']) {
  const c=Object.fromEntries(Object.entries(source.themes[mode]).map(([k,v])=>[k,v.startsWith('@')?v.slice(1).split('.').reduce((a,k)=>a[k],p):v]));
  for (const [fg,bg,min] of [
    ['text','background',4.5],['muted','surface',4.5],['muted','surfaceMuted',4.5],
    ['onAction','action',4.5],['onAction','actionHover',4.5],['onAction','actionPressed',4.5],
    ['onSelection','selection',4.5],['action','selection',3],['text','surfaceMuted',4.5],
    ['controlBorder','surface',3],['focus','surface',3],['error','surfaceMuted',4.5],
    ['success','surfaceMuted',4.5],['warning','surfaceMuted',4.5],['onBrand','brand',4.5],
    ['onPastel','sky',4.5],['onPastel','peach',4.5],
    ['info','surfaceMuted',4.5],['text','interactionHover',4.5],
    ['text','interactionPressed',4.5],['onDisabled','disabled',4.5],
  ]) check(p.key,mode,fg,bg,c[fg],c[bg],min);
  for (const role of ['background','surface','surfaceMuted','text','muted','border','controlBorder','disabled','onDisabled']) {
    const rgb=c[role].slice(1).match(/../g);
    assert(rgb.every(n=>n===rgb[0]),`${p.key}/${mode}/${role} must be neutral`);
  }
  assert.notEqual(c.surfaceMuted,c.selection,'selection must not tint ordinary surfaces');
  assert.equal(p.scorePaper.background,'#FFFFFF');assert.equal(p.scorePaper.notation,'#202020');
  invariants.push(`${p.key}/${mode}: neutral surfaces/text, independent selection and score paper`);
}
for (const [mode, colors] of Object.entries(resolved.content)) {
  for (const fill of Object.keys(colors).filter(k=>k.endsWith('Fill'))) {
    const name=fill.slice(0,-4);
    check('content/'+name,mode,'text','fill',colors[name+'Text'],colors[fill],4.5);
    check('content/'+name,mode,'stroke','fill',colors[name+'Stroke'],colors[fill],3);
  }
}
await mkdir(new URL('evidence/neutral/',base),{recursive:true});
await writeFile(new URL('evidence/neutral/contrasts.json',base),JSON.stringify({checks,invariants,status:'passed'},null,2)+'\n');
console.log(checks.length+' contrast pairs; '+invariants.length+' neutral/selection/music invariants passed');
