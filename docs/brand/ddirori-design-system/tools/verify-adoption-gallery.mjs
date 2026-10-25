import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.env.DDIRORI_QA_PACKAGE||'/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DDIRORI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(new URL('../adoption-pilot.html',import.meta.url).href);
 for(const theme of ['light','dark'])for(const state of ['normal','selected'])for(const scope of ['shortlist','all']){
  for(const [name,value]of Object.entries({theme,state,scope}))await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.locator('#grid img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
  assert.equal(await page.locator('#grid article').count(),scope==='all'?6:3);
  assert(await page.locator('#grid img').evaluateAll(images=>images.every(i=>i.naturalWidth>0)));
  checks.push(`${theme}/${state}/${scope}: image decode and candidate count`);
 }
 await page.locator('summary').click();
 await page.locator('.states img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 checks.push('all expanded state images decode');
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 checks.push('390px gallery has no horizontal overflow');
 assert.equal(errors.length,0);checks.push('no runtime errors');
 await writeFile(new URL('../evidence/adoption-pilot/gallery.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),browser:await browser.version(),checks,errors,status:'passed'},null,2)+'\n');
 console.log(`${checks.length} gallery checks passed`);
}finally{await browser.close();}
