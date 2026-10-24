import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const base=fileURLToPath(new URL('../',import.meta.url)),out=path.join(base,'evidence');
const require=createRequire(path.join(process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DDIRORI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],errors=[];const check=(n,v)=>{assert(v,n);checks.push(n);};
try{
 const page=await browser.newPage({viewport:{width:1100,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(process.env.DDIRORI_ICON_REVIEW_URL||'http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v4/');await page.evaluate(()=>document.fonts.ready);
 for(const palette of ['mono','blue','violet','teal'])for(const mask of ['round','circle','square'])for(const size of ['16','24','32','48','64','128']){
  await page.locator('#palette').selectOption(palette);await page.locator('#mask').selectOption(mask);await page.locator('#size').selectOption(size);
  await page.locator('#comparison img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
  check(`${palette}/${mask}/${size} six images and exact size`,await page.locator('#comparison img').count()===6&&await page.locator('.frame').evaluateAll((xs,n)=>xs.every(x=>x.getBoundingClientRect().width===n),Number(size)));
 }
 await page.locator('#palette').selectOption('blue');await page.locator('#mask').selectOption('round');await page.locator('#size').selectOption('64');
 await page.locator('img').evaluateAll(xs=>Promise.all(xs.map(x=>x.decode())));
 await page.locator('#hero').screenshot({path:path.join(out,'family-preview.png')});await page.locator('#sizes').screenshot({path:path.join(out,'sizes.png')});
 for(const bg of ['light','dark','wallpaper']){await page.locator('#background').selectOption(bg);await page.locator('#comparison').screenshot({path:path.join(out,`comparison-${bg}.png`)});}
 await page.locator('#background').selectOption('light');await page.locator('#gray').check();await page.locator('#names').uncheck();
 check('names hidden and image labels preserved',await page.locator('.app-label').first().evaluate(e=>getComputedStyle(e).visibility==='hidden')&&await page.getByAltText('플레이 최신 · 기능 중심').count()===1);
 await page.locator('#comparison').screenshot({path:path.join(out,'comparison-blind-gray.png')});await page.locator('#gray').uncheck();await page.locator('#names').check();
 await page.screenshot({path:path.join(out,'review-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.style.fontSize='200%';scrollTo(0,0);});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 check('390px at 200% has no page horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,'review-mobile.png')});
 check('no browser or resource errors',errors.length===0);
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'passed',checks,errors,browser:await browser.version(),scope:'static review only; native devices not tested'},null,2)+'\n');console.log(`${checks.length} browser checks passed`);
}finally{await browser.close();}
