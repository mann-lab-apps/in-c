// Static brand-artifact review only. No production app tests.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url)),out=path.join(root,'evidence/round-4');
await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.DDIRORI_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER_PATH?{executablePath:process.env.DDIRORI_BROWSER_PATH}:{})});
const report={generatedAt:new Date().toISOString(),scope:'Static brand gallery and vector structure; not product/device/icon/accessibility certification',checks:[],screenshots:[],errors:[]};
function check(name,fn){fn();report.checks.push({name,result:'pass'})}
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.errors.push(r.status()+' '+r.url())});
 async function open(width,height){await page.setViewportSize({width,height});await page.goto(process.env.DDIRORI_PREVIEW_URL||'http://127.0.0.1:8057/docs/brand/ddirori-visuals/');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(n=>n.complete&&n.naturalWidth>0))}
 async function bounds(label){check(label,()=>assert((awaitOverflow)<=1))}
 let awaitOverflow;
 await open(1440,1000);awaitOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);await bounds('Desktop bounds');
 const palette=JSON.parse(await readFile(path.join(root,'palette.json'),'utf8'));
 check('Selected light/dark declared color pairs',()=>assert(palette.contrasts.every(p=>p.ratio>=p.minimum)));
 check('Delegated primary choice is blue',()=>assert.equal(palette.selectedPalette,'blue'));
 check('Rhythm 64/64/dotted32',()=>assert.deepEqual(palette.motif.durations,['64','64','dotted32']));
 check('All declared primary-label contrasts >=4.5',()=>assert(palette.proposals.every(p=>p.contrasts.onPrimary>=4.5)));
 const sizes=await page.locator('#blue .sizes img').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width));
 check('24/32/48/64 review widths',()=>assert.deepEqual(sizes,[24,32,48,64]));
 for(const file of ['motif.svg','motif-small.svg']){
   const source=await readFile(path.join(root,'round-4',file),'utf8');
   await page.goto('http://127.0.0.1:8057/docs/brand/ddirori-visuals/round-4/'+file);
   const counts=await page.evaluate(()=>({heads:document.querySelectorAll('ellipse').length,beams:document.querySelectorAll('[data-role="shared-beams"] rect').length,partial:document.querySelectorAll('[data-role="partial-fourth-beam"]').length,dot:document.querySelectorAll('[data-role="augmentation-dot"]').length}));
   check(file+' three heads/three shared beams/partial fourth/dot',()=>assert.deepEqual(counts,{heads:3,beams:3,partial:1,dot:1}));
   const structure=await page.evaluate(()=>{const partial=document.querySelector('[data-role="partial-fourth-beam"]');const beams=[...document.querySelectorAll('[data-role="shared-beams"] rect')];return {shortAtTop:+partial.getAttribute('y')<Math.min(...beams.map(n=>+n.getAttribute('y'))),shorter:+partial.getAttribute('width')<+beams[0].getAttribute('width'),stem:document.querySelector('path').getAttribute('d')}});
   check(file+' short top beam and full right stem',()=>{assert(structure.shortAtTop&&structure.shorter);assert(structure.stem.endsWith(file.includes('small')?'M15 7V19':'M155 68V206'))});
 }
 await open(1440,1000);await page.screenshot({path:path.join(out,'gallery-desktop.png'),fullPage:true});report.screenshots.push('gallery-desktop.png');
 await page.locator('#icon-pair').screenshot({path:path.join(out,'icon-pair.png')});report.screenshots.push('icon-pair.png');
 await page.locator('#blue .sizes').screenshot({path:path.join(out,'icon-sizes.png')});report.screenshots.push('icon-sizes.png');
 await open(390,844);awaitOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);await bounds('Mobile bounds');
 await page.screenshot({path:path.join(out,'gallery-mobile.png'),fullPage:true});report.screenshots.push('gallery-mobile.png');
 await page.addStyleTag({content:'html{font-size:200%}body{font-size:1rem}'});
 awaitOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);await bounds('200% text bounds');
 const first=page.locator('nav a').first();await first.focus();
 const awaitOutline=await first.evaluate(n=>getComputedStyle(n).outlineWidth);
 check('Keyboard focus visible',()=>assert.equal(awaitOutline,'3px'));
 check('No page errors or failed asset responses',()=>assert.deepEqual(report.errors,[]));
 report.browser=browser.version();report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error}
finally{await browser.close();await writeFile(path.join(out,'browser-review.json'),JSON.stringify(report,null,2)+'\n')}
console.log(report.checks.length+' checks passed; '+report.screenshots.length+' captures.');
