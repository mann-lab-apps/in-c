import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const qa=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(path.join(qa,'package.json')),{chromium}=require('playwright');
const base=fileURLToPath(new URL('../',import.meta.url)),out=path.join(base,'evidence');
const browser=await chromium.launch({headless:true,executablePath:process.env.DDIRORI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],errors=[];const check=(n,v)=>{assert(v,n);checks.push(n);};
try{
 const page=await browser.newPage({viewport:{width:1160,height:1040},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(process.env.DDIRORI_ICON_REVIEW_URL||'http://127.0.0.1:8076/docs/brand/ddirori-brand-system/icon-family-v2/');
 await page.evaluate(()=>document.fonts.ready);
 for(const palette of ['mono','violet','blue','teal'])for(const mask of ['round','circle','square','adaptive'])for(const size of ['16','24','32','48','64','128']){
  await page.locator('#palette').selectOption(palette);await page.locator('#mask').selectOption(mask);await page.locator('#size').selectOption(size);
  await page.locator('#comparison img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  check(`${palette}/${mask}/${size}: all nine source images decode`,await page.locator('#comparison img').count()===9);
  check(`${palette}/${mask}/${size}: exact display size`,await page.locator('.frame').evaluateAll((frames,n)=>frames.every(f=>Math.abs(f.getBoundingClientRect().width-n)<.1),Number(size)));
 }
 await page.locator('#palette').selectOption('violet');await page.locator('#size').selectOption('128');await page.locator('#mask').selectOption('round');
 for(const bg of ['light','dark','wallpaper']){
  await page.locator('#background').selectOption(bg);await page.locator('#comparison img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  await page.locator('#comparison').screenshot({path:path.join(out,`comparison-${bg}.png`)});
 }
 await page.locator('#background').selectOption('light');await page.locator('#size').selectOption('64');
 await page.locator('#gray').check();await page.locator('#names').uncheck();
 check('hidden names retain accessible image names',await page.locator('.app-label').first().evaluate(e=>getComputedStyle(e).visibility==='hidden')&&await page.getByAltText('플레이 A · 열린 면').count()===1);
 await page.locator('#comparison').screenshot({path:path.join(out,'comparison-blind-gray.png')});
 await page.locator('#gray').uncheck();await page.locator('#names').check();
 await page.clock.install();await page.locator('#memory').click();await page.clock.fastForward(3001);
 check('memory exercise hides labels after three seconds',!(await page.locator('#names').isChecked()));
 await page.locator('#names').check();await page.locator('#mask').selectOption('adaptive');await page.locator('#size').selectOption('128');
 await page.locator('#comparison').screenshot({path:path.join(out,'comparison-adaptive.png')});
 await page.locator('#mask').selectOption('round');await page.locator('#size').selectOption('64');
 await page.locator('summary').click();await page.waitForFunction(()=>document.querySelectorAll('#references img').length===5);
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 check('all reference and brand images decode',true);
 await page.screenshot({path:path.join(out,'review-desktop.png'),fullPage:true});
 await page.locator('#hero').screenshot({path:path.join(out,'family-preview.png')});
 await page.locator('#sizes').screenshot({path:path.join(out,'size-preview.png')});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 check('390px page has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(out,'review-mobile.png'),fullPage:true});
 check('no browser or resource errors',errors.length===0);
 fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({recordedAt:new Date().toISOString(),browser:await browser.version(),checks,errors,status:'passed',scope:'Candidate review page; simulated masks, not native OS installation'},null,2)+'\n');
 console.log(`${checks.length} review browser checks passed`);
}finally{await browser.close();}
