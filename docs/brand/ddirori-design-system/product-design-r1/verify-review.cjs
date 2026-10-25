// Isolated Chromium review: this tests the proposal, not Flutter/PDF/audio engines.
const {chromium}=require(process.env.DDIRORI_PLAYWRIGHT || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve(__dirname,'evidence');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER?{executablePath:process.env.DDIRORI_BROWSER}:{})});
 const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const base=process.env.DDIRORI_REVIEW_URL || 'http://127.0.0.1:8091/?products';
 const select=async(label,option)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:option,exact:true}).click();};
 const snap=async(name)=>{await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,`proposal-${name}.png`),fullPage:true});};
 const overflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page horizontal overflow');
 await page.goto(base);await overflow();await snap('family-light');
 await select('비교 방식','같은 화면 · 세 팔레트');await snap('palettes-light');
 await select('테마','어두운 화면');await snap('palettes-dark');
 await select('비교 방식','한 앱 상세 / 상태');await select('테마','밝은 화면');await select('화면 상태','선택');
 await page.getByRole('button',{name:'일괄 편집',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('textbox',{name:'분류',exact:true}).fill('무대 준비');
 await dialog.getByRole('button',{name:'저장',exact:true}).click();
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'busy Escape must not dismiss');
 await snap('score-saving');await dialog.getByRole('alert').waitFor();
 assert.equal(await dialog.getByRole('textbox',{name:'분류',exact:true}).inputValue(),'무대 준비');await snap('score-save-error');
 await dialog.getByRole('button',{name:'다시 저장',exact:true}).click();await dialog.waitFor({state:'hidden'});
 assert.ok(await page.getByText('1개 악보의 분류를 변경했어요. (메모리 예제)',{exact:true}).isVisible());await snap('score-save-success');
 await page.getByRole('button',{name:'선택',exact:true}).click();
 await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'일괄 편집',exact:true}).click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 assert.equal(await page.getByRole('button',{name:'일괄 편집',exact:true}).evaluate(e=>document.activeElement===e),true,'focus returns to trigger');
 await select('화면 상태','기본');await page.getByRole('searchbox',{name:'악보 검색',exact:true}).fill('없는곡');assert.ok(await page.getByText('찾는 항목이 없어요',{exact:true}).isVisible());await page.getByRole('button',{name:'검색 초기화',exact:true}).click();
 await page.getByRole('button',{name:'평균율 — 전주곡과 푸가 다장조',exact:true}).click();await snap('score-viewer');
 await select('대상 앱','Studio');await snap('studio-wide');
 await select('테마','어두운 화면');await snap('studio-dark');
 await select('대상 앱','Score');await select('화면 상태','처음 / 빈 목록');await snap('score-empty-dark');
 await select('화면 상태','준비 중');await page.emulateMedia({reducedMotion:'reduce'});
 const animations=await page.locator('.pr-screen .dd-mark,.pr-screen .dd-mark *').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).animationName));
 assert.ok(animations.length>0 && animations.every(n=>n==='none'),'reduced motion must stop motif');
 await snap('score-loading-reduced');await page.emulateMedia({reducedMotion:'no-preference'});
 await select('비교 방식','아이콘 크기 / 용도');await snap('icons-named');await page.getByRole('button',{name:'이름 숨기기',exact:true}).click();await snap('icons-blind');await page.getByRole('button',{name:'단색',exact:true}).click();await page.getByRole('button',{name:'회색조',exact:true}).click();await snap('icons-mono-gray');
 for(const width of [840,390,320]){
  await page.setViewportSize({width,height:1000});await select('비교 방식','한 앱 상세 / 상태');await select('화면 상태','기본');await select('테마','밝은 화면');await select('대상 앱','Score');await overflow();await snap(`score-${width}`);
 }
 // CSS zoom stress check; this does not emulate browser breakpoint changes or OS text scaling.
 await page.setViewportSize({width:780,height:1400});await page.evaluate(()=>{document.body.style.zoom='2';});await overflow();await page.locator('.pr-screen').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'proposal-score-200pct.png'),fullPage:false});await page.evaluate(()=>{document.body.style.zoom='';});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'review-checks.json'),JSON.stringify({at:new Date().toISOString(),browser:await browser.version(),url:base,checks:['same layout palette/light/dark','local failed save + retry + draft retention','busy Escape blocked','cancel focus restoration','search/reset','static viewer','Studio layout','reduced motion','icons named/blind/mono/grayscale','840/390/320 overflow','200% CSS zoom stress (viewport capture)'],pageErrors:errors,limitations:['no human recognition participants','no screen-reader or physical hardware QA','mock data and engines disconnected','CSS zoom does not replace browser page zoom or OS text scaling']},null,2));
 await browser.close();console.log('Product R1 review checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
