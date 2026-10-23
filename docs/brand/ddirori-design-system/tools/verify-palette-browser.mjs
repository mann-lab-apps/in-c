import {createRequire} from 'node:module';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const out='docs/brand/ddirori-design-system/evidence/neutral';
await mkdir(out,{recursive:true});
const candidates=JSON.parse(await readFile('docs/brand/ddirori-design-system/palette-candidates.json'));
const browser=await chromium.launch({headless:true,executablePath:process.env.DDIRORI_BROWSER_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage({viewport:{width:1280,height:1000}});
const errors=[], checks=[];page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:8058/?compare');await page.getByRole('heading',{name:'내 악보',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.palette-accents button').count(),6);
  for(const mode of ['light','dark']) {
    await page.getByLabel('테마',{exact:true}).selectOption(mode);
    for(const p of candidates.variants) {
      await page.getByRole('button',{name:p.name,exact:true}).click();
      await page.mouse.move(0,0);
      const expected=(mode==='light'?p.light.primary:p.darkProposal.primary).slice(1).match(/../g).map(v=>parseInt(v,16));
      await page.waitForFunction(rgb=>getComputedStyle(document.querySelector('.palette-states .dd-button--primary')).backgroundColor===`rgb(${rgb.join(', ')})`,expected);
      assert.equal(await page.locator('.dd-item').first().evaluate(n=>getComputedStyle(n).borderRadius),'0px');
      assert.equal(await page.locator('.palette-review').evaluate(n=>getComputedStyle(n).backgroundColor),mode==='light'?'rgb(255, 255, 255)':'rgb(24, 24, 24)');
      await page.screenshot({path:`${out}/${p.key}-${mode}.png`,fullPage:true});
      checks.push(`${p.key}/${mode}: same neutral canvas; screenshot recorded`);
    }
  }
  await page.getByLabel('인벤션 1번 BWV 772 선택',{exact:true}).check();
  assert.equal(await page.locator('.dd-item.is-selected').count(),1);
  assert.notEqual(await page.locator('.dd-item.is-selected').evaluate(n=>getComputedStyle(n).backgroundColor),await page.locator('.dd-item').nth(1).evaluate(n=>getComputedStyle(n).backgroundColor));
  await page.getByRole('button',{name:'블루',exact:true}).click();
  assert.equal(await page.getByLabel('인벤션 1번 BWV 772 선택',{exact:true}).isChecked(),true);
  checks.push('selection has checkbox + accent, and persists across palette switches');
  await page.getByRole('searchbox').fill('없는 곡');assert.equal(await page.locator('.dd-item').count(),0);
  await page.getByRole('button',{name:'검색 초기화',exact:true}).first().click();assert.equal(await page.locator('.dd-item').count(),3);
  checks.push('search/reset uses common components');
  await page.getByRole('button',{name:'즐겨찾기',exact:true}).click();assert.equal(await page.locator('.dd-item').count(),1);
  await page.getByRole('button',{name:'전체',exact:true}).click();
  await page.getByRole('button',{name:'악보 열기',exact:true}).click();assert.equal(await page.getByRole('dialog').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').isVisible(),false);
  checks.push('favorite filter and dialog keyboard dismissal');
  await page.getByLabel('밀도',{exact:true}).selectOption('compact');
  await page.locator('.palette-roles summary').click();await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.dd-mark--pulse .dd-head').evaluateAll(ns=>ns.some(n=>getComputedStyle(n).animationName!=='none')),false);
  checks.push('compact and reduced motion');
  await page.getByLabel('테마',{exact:true}).selectOption('light');await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/mobile.png',fullPage:true});checks.push('390px no horizontal overflow');
  await page.addStyleTag({content:'html{font-size:200%}'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/large-text.png',fullPage:true});checks.push('200% root text on 390px');
  assert.deepEqual(errors,[]);
} finally {
  await writeFile(out+'/browser.json',JSON.stringify({date:new Date().toISOString(),checks,errors},null,2)+'\n');await browser.close();
}
console.log(checks.length+' browser checks passed');
