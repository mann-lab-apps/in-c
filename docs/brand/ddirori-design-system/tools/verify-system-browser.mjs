import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire('/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const out='docs/brand/ddirori-design-system/evidence/system'; await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const checks=[],errors=[];
function check(name,ok){assert(ok,name);checks.push(name)}
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8058/?foundations');await page.evaluate(()=>document.fonts.ready);
 const toggle=page.getByRole('button',{name:/반복 연습/}), disabled=page.getByRole('button',{name:'선택했지만 사용 불가'});
 for(const theme of ['light','dark']){
  await page.getByLabel('테마',{exact:true}).selectOption(theme);
  const heading=page.getByRole('heading',{name:'평균율 클라비어곡집 제1권',level:3});
  check(theme+' semantic h3 with 24px visual title',await heading.evaluate(n=>getComputedStyle(n).fontSize==='24px'));
  await toggle.click();await page.mouse.move(0,0);await page.waitForTimeout(160);
  check(theme+' selected state',await toggle.getAttribute('aria-pressed')==='true');
  const selected=await toggle.evaluate(n=>getComputedStyle(n).backgroundColor);
  await toggle.hover();await page.waitForTimeout(160);
  check(theme+' hover preserves selection',await toggle.evaluate(n=>getComputedStyle(n).backgroundColor)===selected);
  check(theme+' disabled wins over selected',await disabled.isDisabled()&&(await disabled.evaluate(n=>getComputedStyle(n).backgroundColor))!==selected);
  const input=page.getByLabel('작품 이름');await input.focus();
  check(theme+' error and focus coexist',await input.evaluate(n=>n.getAttribute('aria-invalid')==='true'&&!!n.getAttribute('aria-describedby')&&getComputedStyle(n).outlineWidth==='2px'));
  await page.getByLabel('밀도',{exact:true}).selectOption('compact');
  check(theme+' nested comfortable does not inherit compact selector',Math.round((await page.getByRole('group',{name:'독립 필터'}).getByRole('button').boundingBox()).height)===36);
  check(theme+' outer compact is 32px',Math.round((await page.getByRole('group',{name:'자료 필터'}).getByRole('button').first().boundingBox()).height)===32);
  await page.screenshot({path:`${out}/foundations-${theme}.png`,fullPage:true});
  const trigger=page.getByRole('button',{name:'설정 열기'});await trigger.click();
  check(theme+' dialog opens',await page.getByRole('dialog').isVisible());
  await page.keyboard.press('Escape');
  check(theme+' modal restores trigger focus',await trigger.evaluate(n=>document.activeElement===n));
  await toggle.click();await page.getByLabel('밀도',{exact:true}).selectOption('comfortable');
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 check('reduced motion stops motif',await page.locator('.dd-head').first().evaluate(n=>getComputedStyle(n).animationName==='none'));
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 check('390px 200% has no horizontal page overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check('large type control grows',(await toggle.boundingBox()).height>48);
 await page.screenshot({path:out+'/foundations-large.png',fullPage:true});
 assert.deepEqual(errors,[]);
} finally {await writeFile(out+'/browser.json',JSON.stringify({generatedAt:new Date().toISOString(),scope:'Web contract fixture, not native app',checks,errors},null,2)+'\n');await browser.close()}
console.log(checks.length+' system browser checks passed');
