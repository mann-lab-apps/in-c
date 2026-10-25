import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const require=createRequire(process.env.DDIRORI_QA_PACKAGE || '/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const out=new URL('../evidence/adoption-pilot/',import.meta.url);await mkdir(out,{recursive:true});
const candidates=JSON.parse(await readFile(new URL('../palette-candidates.json',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.DDIRORI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],captures=[],errors=[];
function check(name,value){assert(value,name);checks.push(name);}
try {
 const page=await browser.newPage({viewport:{width:1100,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.DDIRORI_CATALOG_URL||'http://127.0.0.1:8058/')+'?components');await page.evaluate(()=>document.fonts.ready);
 async function choose(label,value){await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('listbox').locator(`[data-value="${value}"]`).click();}
 for(const mode of ['light','dark'])for(const p of candidates.variants){
  await choose('테마',mode);await choose('강조색 · 임시',p.key);
  const accent=page.getByRole('combobox',{name:'강조색 · 임시',exact:true});await accent.click();
  const selected=page.getByRole('option',{selected:true});const before=await selected.evaluate(e=>getComputedStyle(e).backgroundColor);await selected.hover();
  check(`${p.key}/${mode}: selected hover preserves fill`,before===await selected.evaluate(e=>getComputedStyle(e).backgroundColor));
  await page.keyboard.press('Escape');check(`${p.key}/${mode}: Escape restores focus`,await accent.evaluate(e=>document.activeElement===e));
  await page.getByRole('tab',{name:'사보 패널',exact:true}).click();
  const panel=page.locator('.set-tool-panel');await panel.scrollIntoViewIfNeeded();
  for(const range of await panel.locator('input[type="range"]').all())check(`${p.key}/${mode}: range target >=48`,(await range.boundingBox()).height>=48);
  const file=`studio-${p.key}-${mode}.png`;await panel.screenshot({path:new URL(file,out).pathname,animations:'disabled'});
  captures.push({file,palette:p.key,theme:mode,kind:'React shared-component studio composition; not Electron product',sha256:createHash('sha256').update(await readFile(new URL(file,out))).digest('hex')});
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 const panel=page.locator('.set-tool-panel');await panel.scrollIntoViewIfNeeded();
 check('studio at 200% has no page horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await panel.screenshot({path:new URL('studio-large-dark.png',out).pathname,animations:'disabled'});
 check('no browser runtime errors',errors.length===0);
 await writeFile(new URL('browser-pilot.json',out),JSON.stringify({recordedAt:new Date().toISOString(),browser:await browser.version(),checks,captures,errors,status:'passed'},null,2)+'\n');
 console.log(`${checks.length} adoption browser checks passed; ${captures.length} palette captures`);
} finally {await browser.close();}
