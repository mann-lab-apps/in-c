import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const out='docs/brand/ddirori-design-system/evidence/controls';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8058/?compare');await page.evaluate(()=>document.fonts.ready);
 const group=page.getByRole('group',{name:'악보 필터'}),all=group.getByRole('button',{name:'전체',exact:true}),favorite=group.getByRole('button',{name:'즐겨찾기',exact:true});
 async function capture(name){const b=await group.boundingBox();await page.screenshot({path:`${out}/${name}.png`,clip:{x:b.x-8,y:b.y-8,width:b.width+16,height:b.height+16}})}
 for(const theme of ['light','dark']){
  await page.getByLabel('테마',{exact:true}).selectOption(theme);
  await page.getByRole('heading',{name:'띠로리 색상 작업실',exact:true}).click();
  await all.click();await page.mouse.move(0,0);
  assert.equal(await group.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)');
  assert.equal(await group.evaluate(n=>getComputedStyle(n).flexWrap),'wrap');
  assert.equal(await all.evaluate(n=>getComputedStyle(n).boxShadow),'none');
  assert.equal(await all.evaluate(n=>n.matches(':focus-visible')),false);
  assert.equal(await all.evaluate(n=>getComputedStyle(n).fontWeight),'500');
  assert.equal(await all.evaluate(n=>getComputedStyle(n).fontSize),'14px');
  assert.equal(Math.round((await all.boundingBox()).height),36);
  await capture(theme+'-selected');checks.push(theme+': pointer selection has check + fill, 14/500 label, 36px height, no focus halo or inset shadow');
  await favorite.click();assert.equal(await page.locator('.dd-item').count(),1);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await all.evaluate(n=>n.matches(':focus-visible')),true);
  assert.equal(await all.evaluate(n=>getComputedStyle(n).outlineWidth),'2px');
  await page.keyboard.press('Space');assert.equal(await page.locator('.dd-item').count(),3);
  await capture(theme+'-keyboard');checks.push(theme+': keyboard ring + Space toggles filter');
 }
 await page.getByLabel('테마',{exact:true}).selectOption('light');
 await page.getByLabel('밀도',{exact:true}).selectOption('compact');
 assert.equal(Math.round((await all.boundingBox()).height),32);checks.push('pointer compact 32px');
 await page.setViewportSize({width:390,height:844});await page.addStyleTag({content:'html{font-size:200%}'});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/large-type.png',fullPage:true});checks.push('390px at 200% text without horizontal overflow');
 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 await touch.goto('http://127.0.0.1:8058/?compare');await touch.evaluate(()=>document.fonts.ready);
 const chip=touch.getByRole('group',{name:'악보 필터'}).getByRole('button',{name:'전체',exact:true});
 assert((await chip.boundingBox()).height>=48);await touch.screenshot({path:out+'/touch.png',fullPage:true});checks.push('touch target at least 48px');
 assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/browser.json',JSON.stringify({checks,errors},null,2)+'\n');await browser.close()}
console.log(checks.length+' control checks passed');
