import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const p=await b.newPage({viewport:{width:1100,height:900},deviceScaleFactor:2});
const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await p.goto('http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v7/');await p.evaluate(()=>document.fonts.ready);
for(const [selector,name]of [['#pair','comparison-preview'],['#sizes','sizes']])await p.locator(selector).screenshot({path:path.join(root,`evidence/${name}.png`)});
let combinations=0;
for(const size of [16,24,32,48,64,128])for(const circle of [false,true])for(const mono of [false,true]){
 await p.locator('#size').selectOption(String(size));await p.locator('#circle').setChecked(circle);await p.locator('#mono').setChecked(mono);
 await p.waitForFunction(()=>[...document.querySelectorAll('#comparison img')].every(i=>i.complete&&i.naturalWidth));
 const ok=await p.locator('#comparison img').evaluateAll((imgs,n)=>imgs.length===6&&imgs.every(i=>Math.abs(i.getBoundingClientRect().width-n)<1&&i.alt),size);if(!ok)throw Error('size/load/alt');combinations++;
}
await p.locator('#names').uncheck();await p.locator('#dark').check();
if(await p.locator('#comparison .app span').first().evaluate(e=>getComputedStyle(e).visibility)!=='hidden')throw Error('labels');
await p.locator('#comparison').screenshot({path:path.join(root,'evidence/dark-mono.png')});
await p.locator('#size').selectOption('64');await p.locator('#circle').uncheck();await p.locator('#mono').uncheck();await p.locator('#dark').uncheck();await p.locator('#names').check();
await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(root,'evidence/mobile.png'),fullPage:true});
if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('mobile overflow');
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(path.join(root,'evidence/browser.json'),JSON.stringify({status:'passed',combinations,checks:['six images load at selected size','image alternative text','hidden names','dark background and monoscale','390px no page overflow','no page/resource errors'],limitations:['Standalone isolated Playwright: connected browser tool unavailable','No screen reader or native platform review']},null,2)+'\n');
await b.close();console.log('Review checks passed');
