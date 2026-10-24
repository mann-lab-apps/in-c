import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:process.env.DDIRORI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const p=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:2});
const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await p.goto(process.env.DDIRORI_ICON_REVIEW_URL||'http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v8/');
await p.evaluate(()=>document.fonts.ready);await p.waitForFunction(()=>document.querySelectorAll('#metrics tr').length===4);
await p.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
for(const [sel,name]of [['#hero','family-preview'],['#studio-options','studio-options'],['#sizes','sizes'],['#comparison','before-after']])await p.locator(sel).screenshot({path:path.join(root,`evidence/${name}.png`)});
let combinations=0;
for(const size of [16,24,32,48,64,128])for(const circle of [false,true])for(const mono of [false,true]){
 await p.locator('#size').selectOption(String(size));await p.locator('#circle').setChecked(circle);await p.locator('#mono').setChecked(mono);
 await p.waitForFunction(()=>[...document.querySelectorAll('#comparison img')].every(i=>i.complete&&i.naturalWidth));
 const ok=await p.locator('#comparison img').evaluateAll((imgs,n)=>imgs.length===7&&imgs.every(i=>Math.abs(i.getBoundingClientRect().width-n)<1&&i.alt),size);if(!ok)throw Error('size/load/alt');combinations++;
}
await p.locator('#names').uncheck();await p.locator('#dark').check();
if(await p.locator('#comparison .app span').first().evaluate(e=>getComputedStyle(e).visibility)!=='hidden')throw Error('hidden labels');
await p.locator('#comparison').screenshot({path:path.join(root,'evidence/dark-mono-circle.png')});
await p.locator('#size').selectOption('64');for(const id of ['circle','mono','dark'])await p.locator('#'+id).uncheck();await p.locator('#names').check();
await p.screenshot({path:path.join(root,'evidence/desktop.png'),fullPage:true});
for(const width of [390,320]){
 await p.setViewportSize({width,height:844});
 if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`${width}px page overflow`);
 if(width===390)await p.screenshot({path:path.join(root,'evidence/mobile.png'),fullPage:true});
}
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(path.join(root,'evidence/browser.json'),JSON.stringify({status:'passed',combinations,checks:['seven current/previous images load at selected size','image alternative text','hidden names','dark background and monochrome','four measured metric rows','all page images loaded','390px and 320px no page overflow','no page/resource errors'],limitations:['Standalone isolated Playwright: connected browser tool unavailable','No screen reader or native platform review']},null,2)+'\n');
await browser.close();console.log('Review checks passed');
