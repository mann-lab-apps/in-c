// Independent headless browser and profile; no user browser session is accessed.
const {chromium}=require(process.env.DDIRORI_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=path.join(__dirname,'evidence/review');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER?{executablePath:process.env.DDIRORI_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(process.env.DDIRORI_REVIEW_URL||'http://127.0.0.1:8096/catalog/product-r3.html');
 const select=async(label,value)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();};
 const button=name=>page.getByRole('button',{name,exact:true});
 const shot=async(name)=>{await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(n=>n.complete&&n.naturalWidth>0));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
 const idle=async()=>{await page.getByRole('progressbar').waitFor({state:'visible'});await page.getByRole('progressbar').waitFor({state:'hidden'});};
 const reset=async()=>{await button('시안 상태 초기화').click();};
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page must not overflow horizontally');
 await shot('journey-map');

 await button('Play 첫 사용 보기').click();await shot('play-start');
 await button('음원 파일 가져오기').click();await button('취소').click();
 assert.equal(await page.getByRole('dialog').count(),0);
 assert.equal(await button('음원 파일 가져오기').evaluate(n=>n===document.activeElement),true,'cancel returns focus');
 await button('음원 파일 가져오기').click();await button('선택한 파일 가져오기').click();await idle();
 assert.ok(await page.getByText('가져오기 완료 · 아직 작품에 연결하지 않았어요',{exact:true}).isVisible());
 await shot('play-import-review');
 await select('다음 작업의 검토 조건','저장 실패');await button('작품·녹음으로 정리').click();
 const title=page.getByRole('textbox',{name:'작품명',exact:true});
 await title.fill('취소할 제목');await button('취소').click();await button('작품·녹음으로 정리').click();
 assert.equal(await title.inputValue(),'나의 연습곡','cancelled form draft must not leak');
 await button('라이브러리에 저장').click();
 const composer=page.getByRole('textbox',{name:'작곡가',exact:true});
 await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-invalid')==='true');
 assert.equal(await composer.evaluate(n=>n===document.activeElement),true);
 await composer.fill('검토용 작곡가');
 await button('라이브러리에 저장').click();await idle();await shot('play-register-failure');
 assert.match(await page.getByRole('alert').innerText(),/변경 사항을 저장하지 못했어요/);
 await select('다음 작업의 검토 조건','정상 완료');await button('다시 시도').click();await idle();
 await button('재생').click();await select('대상 앱','Score');await page.waitForTimeout(550);await select('대상 앱','Play');
 assert.ok(await button('일시정지').isVisible(),'background completion remains owned by source app');
 await shot('play-first-achievement');

 await select('대상 앱','Score');await reset();await button('PDF 악보 추가').click();await button('선택한 파일 가져오기').click();await idle();
 await select('다음 작업의 검토 조건','파일 없음');await button('악보 열기').click();await idle();await shot('score-open-failure');
 assert.ok(await button('악보 열기').isVisible(),'failed open preserves imported library entry');
 await select('다음 작업의 검토 조건','정상 완료');await button('다시 시도').click();await idle();
 await button('다음 페이지').click();await button('주석').click();
 await select('다음 작업의 검토 조건','저장 실패');await button('연습 표시 추가').click();await idle();
 assert.equal(await page.getByLabel('아직 저장하지 못한 주석 예제',{exact:true}).count(),1);assert.ok(await page.getByText('2 / 3',{exact:true}).isVisible());
 await shot('score-annotation-failure');
 await select('다음 작업의 검토 조건','정상 완료');await button('다시 시도').click();await idle();
 assert.equal(await page.getByLabel('메모리에 저장된 주석 예제',{exact:true}).count(),1);await shot('score-first-achievement');
 await select('사용자 상황','기존 자료 있음');
 assert.equal(await page.getByRole('list',{name:'첫 성취 흐름'}).count(),0,'existing users skip onboarding');
 assert.equal(await button('PDF 악보 추가').count(),0);
 await select('사용자 상황','중간에 돌아옴');await button('악보 열기').click();await idle();assert.ok(await page.getByText('2 / 3',{exact:true}).isVisible());
 await select('사용자 상황','외부 PDF 추가 완료 · Score');assert.ok(await button('악보 열기').isVisible());await shot('score-received-pdf');

 await select('대상 앱','Studio');await select('사용자 상황','처음 사용');await reset();
 await button('새 악보 만들기').click();const studioTitle=page.getByRole('textbox',{name:'악보 제목',exact:true});
 await studioTitle.fill('');await studioTitle.press('Enter');assert.equal(await studioTitle.getAttribute('aria-invalid'),'true');
 await studioTitle.fill('처음 만든 악보');await studioTitle.press('Enter');
 await button('첫 음표 입력').click();assert.equal(await button('첫 음표 입력').isDisabled(),true);
 await select('다음 작업의 검토 조건','파일 선택 / 저장 취소');await button('프로젝트 저장').click();await idle();
 assert.equal(await page.getByText('첫 악보를 파일로 저장했어요.',{exact:true}).count(),0);
 await select('다음 작업의 검토 조건','저장 실패');await button('프로젝트 저장').click();await idle();await shot('studio-save-failure');
 assert.ok(await page.getByRole('img',{name:'시안 악보에 입력된 4분음표 하나',exact:true}).isVisible());
 await select('다음 작업의 검토 조건','정상 완료');await button('다시 시도').click();await idle();await shot('studio-first-achievement');
 assert.ok(await page.getByText('저장됨',{exact:true}).isVisible());

 // Reset must invalidate an older mock completion, without advancing another session.
 await select('대상 앱','Play');await reset();await button('음원 파일 가져오기').click();await button('선택한 파일 가져오기').click();await reset();await page.waitForTimeout(550);
 assert.ok(await button('음원 파일 가져오기').isVisible());assert.equal(await button('작품·녹음으로 정리').count(),0);
 await select('다음 작업의 검토 조건','복수 파일 일부 실패');await button('음원 파일 가져오기').click();await button('선택한 파일 가져오기').click();await idle();await shot('play-partial-result');
 assert.match(await page.getByRole('status').filter({hasText:'가져옴 1개'}).innerText(),/실패 1개/);await select('다음 작업의 검토 조건','정상 완료');await button('실패한 파일 다시 가져오기').click();await idle();assert.ok(await page.getByText('2개 보관 중',{exact:true}).isVisible());

 await select('검토 화면','서비스 연결');await select('연결 여정','Studio → Score · PDF');await reset();
 await button('PDF로 내보내기').click();await idle();await shot('pdf-export-result');
 await button('가져오는 방법').click();await page.keyboard.press('Escape');assert.equal(await button('가져오는 방법').evaluate(n=>n===document.activeElement),true);
 await select('다음 전달 작업의 조건','도착 앱 미설치');assert.equal(await button('도착 화면 검토').isDisabled(),true);
 await button('스코어 연결 조건 · 설치 안내 보기').click();await shot('pdf-not-installed');await page.keyboard.press('Escape');
 await select('다음 전달 작업의 조건','설치 확인 불가');assert.ok(await page.getByText('설치 여부를 확인하지 못한 검토 상태',{exact:true}).isVisible());
 await select('다음 전달 작업의 조건','수동 전달 가능');await button('도착 화면 검토').click();
 await select('다음 전달 작업의 조건','저장 / 가져오기 실패');await button('PDF 악보 추가').click();await idle();await shot('pdf-arrival-failure');
 assert.match(await page.getByRole('alert').innerText(),/도착 앱에 추가하지 못했어요/);
 await select('다음 전달 작업의 조건','수동 전달 가능');await button('PDF 악보 추가').click();await idle();await button('악보 펼치기').click();await shot('pdf-arrival-success');
 await button('출발 앱으로 돌아가기').click();assert.ok(await page.getByText('저장하지 않은 변경 · 음표 1개 · 선택 위치 유지',{exact:true}).isVisible());
 await button('도착 화면 검토').click();assert.equal(await button('추가 완료').isDisabled(),true,'same mock transfer is not imported twice');
 await select('연결 여정','Play → Score · 음원');await button('앱 관리 복사본 내보내기').click();await idle();await button('도착 화면 검토').click();
 await select('다음 전달 작업의 조건','도착 형식 불일치');assert.ok(await page.getByText('연습 녹음.opus',{exact:true}).isVisible());await button('연결 파일 추가').click();await idle();await shot('audio-format-failure');
 await select('다음 전달 작업의 조건','사용자가 취소');await button('연결 파일 추가').click();await idle();assert.equal(await button('추가 완료').count(),0);
 await select('다음 전달 작업의 조건','수동 전달 가능');await button('연결 파일 추가').click();await idle();await button('연결 음원 보기').click();await shot('audio-arrival-success');
 await button('출발 앱으로 돌아가기').click();assert.ok(await page.getByText('재생 위치 42초 · 일시정지 · 페이지가 바뀌어도 유지',{exact:true}).isVisible());

 const layouts=[];
 for(const theme of ['밝은 화면','어두운 화면'])for(const width of [320,840,1440]){
  await page.setViewportSize({width,height:1000});await select('테마',theme);
  for(const scenario of ['map','Play','Score','Studio','pdf','audio']){
   if(scenario==='map')await select('검토 화면','전체 여정');
   else if(['Play','Score','Studio'].includes(scenario)){await select('검토 화면','첫 사용');await select('대상 앱',scenario);await select('사용자 상황','처음 사용');await select('다음 작업의 검토 조건','정상 완료');await reset();}
   else {await select('검토 화면','서비스 연결');await select('연결 여정',scenario==='pdf'?'Studio → Score · PDF':'Play → Score · 음원');await select('다음 전달 작업의 조건','수동 전달 가능');await reset();}
   await overflow();layouts.push({scenario,theme,width});if(width!==840)await shot(`${scenario}-${width}-${theme==='밝은 화면'?'light':'dark'}`);
  }
 }
 await page.setViewportSize({width:390,height:1000});await select('검토 화면','첫 사용');await select('대상 앱','Play');await reset();await page.emulateMedia({reducedMotion:'reduce'});await button('음원 파일 가져오기').click();await button('선택한 파일 가져오기').click();
 const motion=await page.locator('.r3-product .dd-mark .dd-head').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationName));assert.ok(motion.length&&motion.every(x=>x==='none'));await idle();
 await page.setViewportSize({width:780,height:1400});await page.evaluate(()=>document.body.style.zoom='2');await overflow();await shot('play-css-zoom-200');await page.evaluate(()=>document.body.style.zoom='');
 assert.equal(await page.locator('audio,video').count(),0,'no media engine is connected');
 assert.equal(await page.locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)),true);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),url:page.url(),browser:await browser.version(),checks:['picker cancel and focus return','local form draft cancel','required validation and first invalid focus','registration failure/retry','source-owned completion after app switch','import preserved on viewer open failure','page and annotation draft retained after failed save','existing-user bypass and resume','external PDF after confirmed import','Studio Enter/first note/cancel/failure/retry','old async result invalidated on scenario reset','partial import result','manual PDF handoff','guide dialog focus return','not installed and unknown are distinct','arrival failure retains source','completed transfer replay is idempotent in mock only','unsupported audio selection','transfer cancel adds nothing','source playback position retained','36 layout combinations','reduced motion','CSS zoom200 stress','no media engine or private file access'],layouts,errors,limits:'Design-memory examples only. No native chooser, OS transfer, PDF renderer, audio, physical IME or assistive technology certification.'},null,2));
 await browser.close();console.log('R3 review checks passed');
})().catch(e=>{console.error(e);process.exit(1);});
