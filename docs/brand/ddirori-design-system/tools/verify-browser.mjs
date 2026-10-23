import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'evidence');await mkdir(out,{recursive:true});
const {chromium}=await import(process.env.DDIRORI_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER_PATH?{executablePath:process.env.DDIRORI_BROWSER_PATH}:{})});
const base=process.env.DDIRORI_CATALOG_URL||'http://127.0.0.1:8057/docs/brand/ddirori-design-system/preview/';
const report={date:new Date().toISOString(),scope:'Built React catalog in standalone Chromium; not product or hardware certification',checks:[],captures:[],errors:[]};
const check=(name,ok)=>{assert(ok,name);report.checks.push({name,result:'pass'})};
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.errors.push(r.status()+' '+r.url())});
 await page.goto(base);await page.evaluate(()=>document.fonts.ready);
 const nav=page.getByRole('navigation',{name:'예제 선택'});
 async function view(name,mode,width,density='comfortable',scale=1){
  await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(s=>document.documentElement.style.fontSize=16*s+'px',scale);
  await page.getByRole('combobox',{name:'테마',exact:true}).selectOption(mode);
  await page.getByRole('combobox',{name:'밀도',exact:true}).selectOption(density);
  await nav.getByRole('button',{name,exact:true}).click();
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  check(name+' '+mode+' '+width+' '+density+' '+scale+' bounds',overflow<=1);
 }
 const scenes=[['컴포넌트','light',1440],['악보함','light',1440],['악보함','dark',1440],['악보 보기','dark',390],['연습 도구','light',840],['사보 작업','dark',1440,'compact'],['플레이','light',390],['악보함','light',390,'comfortable',2]];
 for(let i=0;i<scenes.length;i++){const [n,m,w,d,s]=scenes[i];await view(n,m,w,d,s);const name='web-'+i+'-'+m+'.png';await page.screenshot({path:path.join(out,name),fullPage:true});report.captures.push(name)}
 for(const width of [390,840,1440])for(const mode of ['light','dark'])for(const n of ['컴포넌트','악보함','악보 보기','연습 도구','사보 작업','플레이'])await view(n,mode,width,'compact',2);
 await view('악보함','light',1440);
 await page.getByRole('searchbox').fill('없는 곡');check('Empty state after query',await page.getByText('찾는 악보가 없어요').isVisible());
 await page.getByRole('button',{name:'검색 초기화',exact:true}).click();check('Query reset restores items',await page.locator('.dd-item').count()===3);
 await page.getByRole('group',{name:'악기 필터',exact:true}).getByRole('button',{name:'현악',exact:true}).click();check('Instrument filter changes items',await page.locator('.dd-item').count()===1);
 await page.getByRole('group',{name:'악기 필터',exact:true}).getByRole('button',{name:'전체 악기',exact:true}).click();
 await page.getByRole('button',{name:'제목순',exact:true}).click();const sorted=await page.locator('.dd-item-title').allTextContents();check('Title sort applies',JSON.stringify(sorted)===JSON.stringify([...sorted].sort((a,b)=>a.localeCompare(b,'ko'))));
 const opened=sorted[1];await page.locator('.dd-item-title').nth(1).click();await nav.getByRole('button',{name:'악보함',exact:true}).click();check('Opening a score updates recents',await page.locator('.catalog-recent .dd-button').first().textContent()===opened);
 await page.getByRole('button',{name:'다중 선택',exact:true}).click();
 await page.getByRole('checkbox').first().check();check('Controlled selection callback',await page.getByText('1개 선택됨 · 앱 데이터에 접근하지 않는 샘플').isVisible());
 await view('악보 보기','dark',390);
 check('First page cannot move previous',await page.getByRole('button',{name:'이전 페이지',exact:true}).isDisabled());
 await page.getByRole('button',{name:'다음 페이지',exact:true}).click();check('Page advances',await page.getByText('2 / 4',{exact:true}).isVisible());
 await page.getByRole('button',{name:'공연 모드',exact:true}).click();check('Performance mode removes annotation toolbar',await page.getByRole('group',{name:'주석 도구',exact:true}).count()===0);
 await view('연습 도구','light',1440);
 await page.getByRole('button',{name:'3/4',exact:true}).click();check('Meter selection updates beat count',await page.getByRole('img',{name:'3박 대기',exact:true}).isVisible());await page.getByRole('button',{name:'시작',exact:true}).click();await page.getByRole('button',{name:'다음 박 · 데모',exact:true}).click();check('Manual demo advances within selected meter',await page.getByRole('img',{name:'3박 중 2번째 박',exact:true}).isVisible());
 const bpm=page.getByRole('textbox',{name:'빠르기 BPM',exact:true});await bpm.fill('999');await bpm.press('Enter');check('Invalid number reports error',await page.getByText('40~240 범위로 입력해주세요').isVisible());await bpm.fill('120');await bpm.press('Enter');check('Valid number updates slider',await page.getByRole('slider',{name:'빠르기 슬라이더'}).inputValue()==='120');
 await page.getByRole('button',{name:'신호 없음',exact:true}).click();check('Tuner has no stale cents on no signal',await page.getByRole('img',{name:'A4 신호 없음',exact:true}).isVisible());
 await view('컴포넌트','light',1440);
 const trigger=page.getByRole('button',{name:'설정 시트',exact:true});await trigger.click();check('Sheet opens as modal',await page.getByRole('dialog').isVisible());
 await page.getByRole('dialog').getByRole('textbox').focus();for(let i=0;i<6;i++)await page.keyboard.press('Tab');check('Modal Tab stays inside',await page.getByRole('dialog').evaluate(n=>n.contains(document.activeElement)));await page.keyboard.press('Escape');check('Escape dismisses sheet',!(await page.getByRole('dialog').isVisible()));check('Modal returns focus',await trigger.evaluate(n=>n===document.activeElement));
 const first=page.getByRole('button',{name:'저장 예제',exact:true});await first.focus();check('Focus ring visible',await first.evaluate(n=>getComputedStyle(n).outlineWidth)==='3px');
 check('Reduced motion stops note pulse',await page.locator('.dd-mark--pulse .dd-head').first().evaluate(n=>getComputedStyle(n).animationName)==='none');
 await page.evaluate(()=>{const b=document.createElement('button');b.id='outside';b.textContent='외부';document.body.append(b)});
 check('Scoped CSS leaves outside button native',await page.locator('#outside').evaluate(n=>getComputedStyle(n).borderRadius)!=='10px');
 await nav.getByRole('button',{name:'악보함',exact:true}).focus();await page.keyboard.press('Enter');check('Keyboard activates navigation',await page.getByRole('heading',{name:'나의 악보함',exact:true}).isVisible());const toggle=page.getByRole('button',{name:'다중 선택',exact:true});const was=await toggle.getAttribute('aria-pressed');await toggle.focus();await page.keyboard.press('Space');check('Keyboard toggles selection mode',await toggle.getAttribute('aria-pressed')!==was);
 check('No asset or runtime errors',report.errors.length===0);
 report.browser=browser.version();report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e}
finally{await browser.close();await writeFile(path.join(out,'browser-validation.json'),JSON.stringify(report,null,2)+'\n')}
console.log(report.checks.length+' browser checks; '+report.captures.length+' captures.');
