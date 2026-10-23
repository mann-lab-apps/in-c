// Isolated design review, not product/device QA. Supply an external Playwright path.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tokens=JSON.parse(await readFile(path.join(root,'tokens.json'),'utf8'));
const report={generatedAt:new Date().toISOString(),scope:'Doyo design artifacts only; no real file/audio/notation validation',checks:[],contrast:[],screenshots:[],errors:[]};
function check(name,fn){fn();report.checks.push({name,result:'pass'})}
function resolve(v){if(typeof v!=='string'||!v.startsWith('{'))return v;return resolve(v.slice(1,-1).split('.').reduce((x,k)=>x[k],tokens))}
function lum(h){const c=h.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function ratio(a,b){const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return(x+.05)/(y+.05)}
for(const [mode,values] of Object.entries(tokens.themes)){
 const colors=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,resolve(v)]));
 for(const [fg,bg,min] of tokens.contrastRequirements){
  const n=ratio(colors[fg],colors[bg]);report.contrast.push({mode,fg,bg,ratio:n,minimum:min});
  check(`Contrast ${mode}: ${fg}/${bg}`,()=>assert(n>=min,`${n.toFixed(3)} < ${min}`));
 }
}
for(const name of ['selection','input','playback'])check(`Score overlay ${name} on white`,()=>assert(ratio(tokens.score[name],tokens.score.paper)>=3));
const {chromium}=await import(process.env.DOYO_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DOYO_BROWSER_PATH?{executablePath:process.env.DOYO_BROWSER_PATH}:{})});
report.browser=browser.version();
const base=process.env.DOYO_PREVIEW_URL||'http://127.0.0.1:8057/docs/brand/doyo-design-system/preview/';
await mkdir(path.join(root,'evidence'),{recursive:true});
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.errors.push(`${r.status()} ${r.url()}`)});
 async function open(view,theme='light',width=1400,height=1000){
  await page.setViewportSize({width,height});await page.goto(`${base}?view=${view}&theme=${theme}`);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].every(n=>n.complete&&n.naturalWidth>0));
 }
 async function capture(name){await page.screenshot({path:path.join(root,'evidence',name+'.png'),fullPage:true});report.screenshots.push(name+'.png')}
 async function bounds(name){const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check(name,()=>assert(overflow<=1,`Overflow ${overflow}`))}
 for(const theme of ['light','dark']){
  for(const view of ['overview','components','reader','studio']){
   await open(view,theme,view==='reader'?1024:1400,1000);await bounds(`${view} ${theme} desktop bounds`);await capture(`${view}-${theme}`);
   await open(view,theme,390,844);await bounds(`${view} ${theme} mobile bounds`);
   if(view==='components'||view==='reader')await capture(`${view}-mobile-${theme}`);
  }
 }
 await open('components');
 const primary=page.getByRole('button',{name:'주 행동',exact:true});await primary.focus();
 const outline=await primary.evaluate(n=>getComputedStyle(n).outlineWidth);check('Keyboard focus visible',()=>assert.equal(outline,'3px'));
 await page.getByRole('button',{name:'주석',exact:true}).click();
 async function attr(selector,key){return page.locator(selector).getAttribute(key)}
 const selectedMode=await page.getByRole('button',{name:'주석',exact:true}).getAttribute('aria-pressed');check('Mode selection semantics',()=>assert.equal(selectedMode,'true'));
 const bodyTransform=await page.locator('.loader-demo [data-part=body]').first().evaluate(async n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=0;const first=getComputedStyle(n).transform;a.currentTime=450;return [first,getComputedStyle(n).transform]});
 check('Bird body moves over the cycle',()=>assert.notEqual(...bodyTransform));
 const rearTransform=await page.locator('.loader-demo [data-part=rear-leg]').first().evaluate(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=0;const first=getComputedStyle(n).transform;a.currentTime=450;return [first,getComputedStyle(n).transform]});
 check('Support leg compresses independently',()=>assert.notEqual(...rearTransform));
 const frontTransform=await page.locator('.loader-demo [data-part=front-leg]').first().evaluate(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=0;const first=getComputedStyle(n).transform;a.currentTime=450;return [first,getComputedStyle(n).transform]});
 check('Front leg articulates independently',()=>assert.notEqual(...frontTransform));
 await page.locator('.loader-demo [data-part]').evaluateAll(nodes=>nodes.forEach(n=>{const a=n.getAnimations()[0];a.pause();a.currentTime=450}));
 await page.locator('.loader-demo').screenshot({path:path.join(root,'evidence','loader-mid-cycle.png')});report.screenshots.push('loader-mid-cycle.png');
 await page.getByRole('button',{name:'로딩 예시 실행',exact:true}).click();
 const busy=await attr('#operation','aria-busy');
 check('Busy region semantics',()=>assert.equal(busy,'true'));
 const buttonBirds=await page.locator('#loading-trigger .doyo-bird').count();check('Loading button uses bird',()=>assert.equal(buttonBirds,1));
 await page.getByRole('button',{name:'취소',exact:true}).click();
 const cancelled=await page.locator('#operation-status').innerText();check('Cancellation restores state',()=>assert(cancelled.includes('취소')));
 await page.getByRole('button',{name:'로딩 예시 실행',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#operation').getAttribute('aria-busy')==='false');
 const complete=await page.locator('#operation-status').innerText();check('Completion restores state',()=>assert(complete.includes('끝났어요')));
 await page.emulateMedia({reducedMotion:'reduce'});
 const animation=await page.locator('.loader-demo [data-part=body]').first().evaluate(n=>getComputedStyle(n).animationName);check('Reduced motion stops bird',()=>assert.equal(animation,'none'));
 const label=await page.locator('.loader-demo').innerText();check('Reduced motion retains loading text',()=>assert(label.includes('불러오는 중')));
 await capture('loader-reduced-motion');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await open('reader','dark',390,844);
 const sizes=await page.locator('.reader-tools button,.page-controls button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));
 check('Mobile reader targets >=48px',()=>assert(sizes.every(x=>x>=48)));
 await page.getByRole('button',{name:'다음 쪽',exact:true}).click();
 const pageCount=await page.locator('#page-count').innerText();check('Reader page state updates',()=>assert.equal(pageCount,'2 / 3'));
 await page.getByRole('button',{name:'연습 도구',exact:true}).click();
 const expanded=await attr('[data-practice]','aria-expanded');check('Practice panel expands',()=>assert.equal(expanded,'true'));
 const pageColor=await page.locator('.doyo-score-paper').evaluate(n=>getComputedStyle(n).backgroundColor);check('Dark theme keeps score white',()=>assert.equal(pageColor,'rgb(255, 255, 255)'));
 await page.locator('#bpm').fill('96');const bpm=await page.locator('#bpm-value').innerText();check('Tempo range updates output',()=>assert.equal(bpm,'96 BPM'));
 await open('studio');await page.locator('.score-hit').focus();await page.keyboard.press('Enter');
 const title=await page.locator('#inspector-title').innerText();check('Keyboard can select score',()=>assert.equal(title,'선택한 마디'));
 await page.getByRole('button',{name:'음표 입력',exact:true}).click();const inputVisible=await page.locator('#input-overlay').isVisible();check('Input caret distinct from selection',()=>assert(inputVisible));
 await page.getByRole('button',{name:'재생 표시',exact:true}).click();const playbackVisible=await page.locator('#playback-overlay').isVisible();check('Playback cursor distinct',()=>assert(playbackVisible));
 await page.keyboard.press('Escape');const selectionHidden=await page.locator('#selection-overlay').isHidden();check('Escape clears selection',()=>assert(selectionHidden));
 await page.getByRole('button',{name:'저장 흐름 보기',exact:true}).click();const dialogVisible=await page.locator('dialog').isVisible();check('Native dialog opens',()=>assert(dialogVisible));await page.keyboard.press('Escape');
 for(const view of ['components','reader','studio']){
  await open(view,'light',390,844);await page.addStyleTag({content:'html{font-size:200%}'});await bounds(`${view} 200% text bounds`);
 }
 const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:1024,height:768}});const touchPage=await touch.newPage();
 await touchPage.goto(`${base}?view=components`);
 const touchSizes=await touchPage.locator('.dense-demo button').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().height));check('Compact becomes >=48px for coarse pointer',()=>assert(touchSizes.every(x=>x>=48)));await touch.close();
 check('No browser errors or missing assets',()=>assert.deepEqual(report.errors,[]));report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error}finally{
 await browser.close();await writeFile(path.join(root,'evidence','validation.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.checks.length} checks passed; ${report.screenshots.length} screenshots.`);
