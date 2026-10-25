import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
// Use an isolated QA installation; no product dependency is added.
const require=createRequire(process.env.DDIRORI_QA_PACKAGE || '/tmp/ddirori-brand-tools/package.json');
const {chromium}=require('playwright');
const out=process.env.DDIRORI_EVIDENCE_DIR ? pathToFileURL(path.resolve(process.env.DDIRORI_EVIDENCE_DIR) + '/') : new URL('../evidence/basic-set/',import.meta.url);await mkdir(out,{recursive:true});
const checks=[],errors=[],captures=[];
function check(name,value){assert(value,name);checks.push(name);}
const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER_PATH?{executablePath:process.env.DDIRORI_BROWSER_PATH}:{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
await page.goto((process.env.DDIRORI_CATALOG_URL||'http://127.0.0.1:8058/')+'?components');await page.evaluate(()=>document.fonts.ready);
check('actual component catalog renders',await page.locator('.set-spec').count()===12);
const shot=async(name,locator)=>{const file=new URL(name+'.png',out);if(locator)await locator.screenshot({path:file.pathname,animations:'disabled'});else await page.screenshot({path:file.pathname,animations:'disabled'});captures.push({file:name+'.png',sha256:createHash('sha256').update(await readFile(file)).digest('hex')});};
async function choose(control,value){
 await control.click();
 await page.getByRole('listbox').locator(`[role="option"][data-value="${value}"]`).click();
}
const paletteControl=page.getByRole('combobox',{name:'강조색 · 임시',exact:true});
for(const theme of ['light','dark']){
 await choose(page.getByRole('combobox',{name:'테마',exact:true}),theme);
 await paletteControl.click();
 const list=page.getByRole('listbox',{name:'강조색 · 임시',exact:true});
 check(theme+' Select retains trigger focus',await paletteControl.evaluate(n=>document.activeElement===n));
 check(theme+' Select popup width matches trigger',Math.abs((await list.boundingBox()).width-(await paletteControl.boundingBox()).width)<1);
 check(theme+' Select inherits surface color',await list.evaluate(n=>getComputedStyle(n).backgroundColor)===await paletteControl.evaluate(n=>getComputedStyle(n).backgroundColor));
 await shot('select-'+theme);
 await page.keyboard.press('Home');
 check(theme+' Select exploration keeps committed value',await paletteControl.textContent()==='라임');
 check(theme+' Select active descendant is visible',await paletteControl.evaluate(n=>{const el=document.getElementById(n.getAttribute('aria-activedescendant')); const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom;}));
 await page.keyboard.press('Escape');
 check(theme+' Select Escape cancels',await paletteControl.textContent()==='라임'&&await paletteControl.getAttribute('aria-expanded')==='false');
 await paletteControl.press('Home');await page.keyboard.press('Enter');
 check(theme+' Select Enter commits',await paletteControl.textContent()==='바이올렛');
 await paletteControl.press('End');await page.keyboard.press('Tab');
 check(theme+' Select Tab commits without trapping',await paletteControl.textContent()==='라임'&&await paletteControl.evaluate(n=>document.activeElement!==n));
 await paletteControl.click();await page.getByRole('heading',{name:'기본 컴포넌트',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.dd-select[aria-expanded="true"]')===null);
 check(theme+' Select outside dismiss',await paletteControl.getAttribute('aria-expanded')==='false');
 await paletteControl.click();await page.getByRole('searchbox',{name:'컴포넌트 검색',exact:true}).click();
 check(theme+' Select outside input keeps focus',await page.getByRole('searchbox',{name:'컴포넌트 검색',exact:true}).evaluate(n=>document.activeElement===n));
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
await paletteControl.click();
check('Select 390px/200% stays inside viewport',await page.getByRole('listbox').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
await page.keyboard.press('End');
check('Select 200% active option scrolls into view',await paletteControl.evaluate(n=>{const el=document.getElementById(n.getAttribute('aria-activedescendant'));const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.top>=b.top&&a.bottom<=b.bottom;}));
await shot('select-mobile-200');await page.keyboard.press('Escape');
await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});
const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
await touch.goto((process.env.DDIRORI_CATALOG_URL||'http://127.0.0.1:8058/')+'?components');
const touchControl=touch.getByRole('combobox',{name:'강조색 · 임시',exact:true});
await touchControl.tap();await touch.getByRole('option',{name:'블루',exact:true}).tap();
check('Select touch commits and closes',await touchControl.textContent()==='블루'&&await touchControl.getAttribute('aria-expanded')==='false');
await touch.close();
const overlays=page.locator('[data-name="Dialog · Sheet · Menu · Popover · Tooltip"]');
for(const theme of ['light','dark']){
await choose(page.getByLabel('테마',{exact:true}),theme);
await choose(page.getByLabel('강조색 · 임시',{exact:true}),'violet');
const menu=overlays.getByRole('button',{name:'자료 메뉴'});await menu.click();
check(theme+' menu focuses first enabled action',await page.getByRole('menuitem',{name:'열기',exact:true}).evaluate(n=>document.activeElement===n));
await page.keyboard.press('ArrowDown');check(theme+' menu skips disabled',await page.getByRole('menuitem',{name:'사본 만들기',exact:true}).evaluate(n=>document.activeElement===n));
await page.keyboard.press('Home');check(theme+' menu Home',await page.getByRole('menuitem',{name:'열기',exact:true}).evaluate(n=>document.activeElement===n));
await page.keyboard.press('End');await page.keyboard.press('Enter');
check(theme+' menu action restores focus',await menu.evaluate(n=>document.activeElement===n));
await menu.click();await page.keyboard.press('Escape');check(theme+' menu Escape restores focus',await menu.evaluate(n=>document.activeElement===n));
const popover=overlays.getByRole('button',{name:'표시 설정',exact:true});await popover.click();
const pop=page.getByRole('dialog',{name:'표시 설정'});
check(theme+' popover inherits active theme',await pop.evaluate(n=>getComputedStyle(n).getPropertyValue('--dd-action').trim())===await page.locator('.set-root').evaluate(n=>getComputedStyle(n).getPropertyValue('--dd-action').trim()));
await page.getByRole('textbox',{name:'표시 이름',exact:true}).fill('길고 긴 한국어 표시 이름');await shot('popover-'+theme);
await page.keyboard.press('Escape');check(theme+' popover closes and returns focus',await popover.evaluate(n=>document.activeElement===n));
await menu.click();await page.getByRole('menu').dispatchEvent('keydown',{key:'사'});check(theme+' menu typeahead',await page.getByRole('menuitem',{name:'사본 만들기',exact:true}).evaluate(n=>document.activeElement===n));await page.keyboard.press('Tab');check(theme+' menu Tab leaves without trapping',await page.getByRole('menu').count()===0);

const trigger=overlays.getByRole('button',{name:'삭제 확인',exact:true});await trigger.click();
const dialog=page.getByRole('dialog',{name:'예제 삭제'});check(theme+' confirm is modal',await dialog.isVisible());
for(let n=0;n<6;n++)await page.keyboard.press('Tab');check(theme+' modal traps keyboard',await dialog.evaluate(n=>n.contains(document.activeElement)));
await page.keyboard.press('Escape');check(theme+' modal restores trigger',await trigger.evaluate(n=>document.activeElement===n));
const tooltip=overlays.getByRole('button',{name:'사본 안내'});await tooltip.focus();check(theme+' tooltip appears on focus',await page.getByRole('tooltip').isVisible());await page.keyboard.press('Escape');check(theme+' tooltip Escape',await page.getByRole('tooltip').count()===0);
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='200%');
const narrowTrigger=overlays.getByRole('button',{name:'표시 설정',exact:true});await narrowTrigger.click();
const narrowPop=page.getByRole('dialog',{name:'표시 설정'});check('390px 200% popover stays inside viewport',await narrowPop.evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
await page.keyboard.press('Escape');
const narrowTip=overlays.getByRole('button',{name:'사본 안내'});await narrowTip.focus();
check('390px 200% tooltip stays inside viewport',await page.getByRole('tooltip').evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));await page.keyboard.press('Escape');
await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});
const tabs=page.locator('[data-name="Tabs · Panel"]');await tabs.getByRole('tab',{name:'악보',exact:true}).focus();await page.keyboard.press('End');check('tabs skip disabled and activate panel',await tabs.getByRole('tab',{name:'녹음',exact:true}).getAttribute('aria-selected')==='true');
await page.getByLabel('컴포넌트 검색',{exact:true}).fill('Tabs');check('catalog search filters examples',await page.locator('.set-spec').count()===1);await page.getByLabel('컴포넌트 검색',{exact:true}).fill('');
const themeSelect=page.getByLabel('테마',{exact:true}),accentSelect=page.getByLabel('강조색 · 임시',{exact:true});
await accentSelect.click();
const accents=await page.getByRole('option').evaluateAll(nodes=>nodes.map(n=>n.dataset.value));
await page.keyboard.press('Escape');
for(const theme of ['light','dark'])for(const accent of accents){await choose(themeSelect,theme);await choose(accentSelect,accent);check(`${theme}/${accent} neutral surface`,await page.locator('.set-root').evaluate(n=>{const c=getComputedStyle(n).backgroundColor.match(/\d+/g).slice(0,3);return c[0]===c[1]&&c[1]===c[2];}));}
for(const width of [390,840,1440])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:1000});await choose(themeSelect,theme);await choose(accentSelect,'lime');
 for(const scale of [1,2]){
  await page.evaluate(s=>document.documentElement.style.fontSize=(s*100)+'%',scale);
  check(`${width}/${theme}/${scale} no page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const name of ['악보함','작품·녹음','설정','사보 패널']){
   const examples=page.locator('#examples');await examples.getByRole('tab',{name,exact:true}).click();
   check(`${width}/${theme}/${scale}/${name} no overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(name==='사보 패널')check(`${width}/${theme}/${scale} nested density preserves theme`,await examples.locator('.set-tool-panel').evaluate(n=>getComputedStyle(n).getPropertyValue('--dd-action').trim())===await page.locator('.set-root').evaluate(n=>getComputedStyle(n).getPropertyValue('--dd-action').trim()));
   if(scale===1&&(width===390||width===1440))await shot(`composition-${['악보함','작품·녹음','설정','사보 패널'].indexOf(name)}-${width}-${theme}`,examples);
  }
 }
}
await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.setViewportSize({width:1440,height:1000});await choose(themeSelect,'light');await page.evaluate(()=>window.scrollTo(0,0));await shot('catalog-light');
await choose(page.getByLabel('밀도',{exact:true}),'compact');check('compact control height',await page.locator('[data-name="Button · IconButton · Toggle · Group"] .dd-button').first().evaluate(n=>getComputedStyle(n).minHeight==='32px'));
await page.emulateMedia({reducedMotion:'reduce'});check('reduced motion stops logo animation',await page.locator('.dd-mark--pulse .dd-head').first().evaluate(n=>getComputedStyle(n).animationName==='none'));
const examples=page.locator('#examples');await examples.getByRole('tab',{name:'설정',exact:true}).click();await examples.getByLabel('프로필 이름',{exact:false}).fill('');await examples.getByRole('button',{name:'변경 저장'}).click();check('settings rejects empty name',await examples.getByText('이름을 입력해 주세요',{exact:true}).isVisible());
await examples.getByLabel('프로필 이름',{exact:false}).fill('나의 연습');await examples.getByRole('button',{name:'변경 저장'}).click();await page.getByRole('dialog').getByRole('button',{name:'저장',exact:true}).click();check('settings persists fixture and announces save',await examples.getByRole('status').getByText('예제 설정을 저장했어요').isVisible());
check('no browser runtime errors',errors.length===0);
}finally{await writeFile(new URL('browser.json',out),JSON.stringify({recordedAt:new Date().toISOString(),scope:'Public React component catalog, fixture data, headless browser; not product/device approval',checks,errors,captures},null,2)+'\n');await browser.close();}
console.log(checks.length+' basic-set browser checks passed');
