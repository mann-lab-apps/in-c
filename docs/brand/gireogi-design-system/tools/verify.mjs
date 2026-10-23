// Design-artifact checks and genuine browser captures; no product tests are run.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'evidence');await mkdir(out,{recursive:true});
const data=JSON.parse(await readFile(path.join(root,'tokens.json'),'utf8'));
const report={generatedAt:new Date().toISOString(),status:'running',scope:'Isolated design proposal; not product or device QA',checks:[],contrast:[],screenshots:[],iconBounds:[],errors:[]};
function check(name,fn){fn();report.checks.push({name,result:'pass'})}
function value(x,mode='light',density='comfortable',seen=new Set()){
 if(typeof x!=='string'||!x.startsWith('{'))return x;
 const ref=x.slice(1,-1).replaceAll('$mode',mode).replaceAll('$density',density);assert(!seen.has(ref),'Alias cycle '+ref);seen.add(ref);
 const item=ref.split('.').reduce((v,k)=>v?.[k],data);assert(item&&'$value'in item,'Unresolved token '+ref);return value(item.$value,mode,density,seen);
}
function traverse(obj,mode,density){if(obj&&typeof obj==='object'){if('$value'in obj)value(obj.$value,mode,density);else Object.values(obj).forEach(v=>traverse(v,mode,density))}}
for(const mode of ['light','dark'])for(const density of ['compact','comfortable'])check(`All aliases resolve: ${mode}/${density}`,()=>traverse(data,mode,density));
function lum(hex){let c=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function ratio(a,b){const [x,y]=[lum(a),lum(b)].sort((a,b)=>b-a);return(x+.05)/(y+.05)}
for(const mode of ['light','dark']){
 const s=Object.fromEntries(Object.entries(data.semantic[mode]).map(([k,v])=>[k,value(v.$value,mode)]));
 const pairs=[['text','background',4.5],['text','surface',4.5],['muted','background',4.5],['muted','surface',4.5],['onAction','action',4.5],['focus','surface',3],['focus','background',3],['controlBorder','surface',3],['controlBorder','background',3],['selection','selectionFill',4.5],['input','surface',4.5],['error','surface',4.5],['playback','surface',4.5],['scoreSelection','scorePaper',3],['scoreInput','scorePaper',3],['scorePlayback','scorePaper',3]];
 for(const [fg,bg,min] of pairs){const n=ratio(s[fg],s[bg]);report.contrast.push({mode,foreground:fg,background:bg,colors:[s[fg],s[bg]],ratio:n,minimum:min,pass:n>=min});check(`Contrast ${mode} ${fg}/${bg}`,()=>assert(n>=min,`${n} < ${min}`))}
}
report.contrast.push({mode:'brand',foreground:'white',background:'apricot',colors:['#FFFFFF','#F5B878'],ratio:ratio('#FFFFFF','#F5B878'),minimum:4.5,pass:false,usage:'Forbidden for normal text; use ink foreground.'});
const {chromium}=await import(process.env.GIREOGI_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.GIREOGI_BROWSER_PATH?{executablePath:process.env.GIREOGI_BROWSER_PATH}:{})});
const base=process.env.GIREOGI_PREVIEW_URL||'http://127.0.0.1:8043/docs/brand/gireogi-design-system/preview/';
report.browser=browser.version();
try{
 const page=await browser.newPage({deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))report.errors.push(`${r.status()} ${r.url()}`)});
 async function open(view,theme='light',width=1400,height=960,extra=''){
   await page.setViewportSize({width,height});await page.goto(`${base}?view=${view}&theme=${theme}${extra}`);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(x=>x.complete&&x.naturalWidth>0));
 }
 async function capture(name,fullPage=false){await page.screenshot({path:path.join(out,name+'.png'),fullPage});report.screenshots.push(name+'.png')}
 async function overflow(label){const n=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check(label,()=>assert(n<=1,'Horizontal viewport overflow '+n))}
 for(const theme of ['light','dark']){
  await open('overview',theme,1440,1024);await page.locator('.flock-art').evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished))});await capture(`overview-${theme}`,true);await overflow(`Overview ${theme} bounds`);
  await open('library',theme,390,844);await capture(`library-mobile-${theme}`,true);await overflow(`Library mobile ${theme} bounds`);
  await open('reader',theme,1024,1000);await capture(`reader-tablet-${theme}`);await overflow(`Reader tablet ${theme} bounds`);
  await page.locator('[data-action="annotation"]').first().click();await page.locator('[data-action="practice"]').click();await capture(`reader-annotation-${theme}`);
  await open('reader',theme,390,844);await capture(`reader-mobile-${theme}`,true);await overflow(`Reader mobile ${theme} bounds`);
  const targetSizes=await page.locator('.reader-header button,.reader-mode button,.reader-footer button').evaluateAll(nodes=>nodes.map(n=>({label:n.getAttribute('aria-label')||n.textContent.trim(),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
  check(`Reader mobile ${theme} touch targets >=44`,()=>assert(targetSizes.every(x=>x.width>=44&&x.height>=44),JSON.stringify(targetSizes)));
  await open('editor',theme);await capture(`editor-default-${theme}`);await overflow(`Editor ${theme} bounds`);
  await page.locator('[data-action="select-score"]').click();await capture(`editor-selected-${theme}`);
  await page.locator('[data-action="input-mode"]').click();await page.locator('[data-action="playback"]').click();await capture(`editor-states-${theme}`);
  await open('editor',theme,960,800);await capture(`editor-compact-${theme}`);await overflow(`Editor compact ${theme} bounds`);
  await open('components',theme,1280,960);await capture(`components-${theme}`,true);
 }
 await open('library');await page.locator('#search').fill('존재하지않는곡');
 // Assertions that depend on browser values are collected before synchronous check().
 let actual=await page.locator('#results').innerText();check('Search empty state has recovery text',()=>assert(actual.includes('검색어를 줄이거나')));
 await capture('library-empty');await page.locator('#search').fill('작은');actual=await page.locator('.score-row').count();check('Search narrows library',()=>assert.equal(actual,1));
 await page.locator('#search').fill('');await page.locator('[data-action="favorites"]').click();actual=await page.locator('.score-row').count();check('Favorite filter returns two fixtures',()=>assert.equal(actual,2));
 await page.locator('[data-action="all"]').first().click();await page.locator('[data-action="sort"]').click();actual=await page.locator('.score-open h2').allTextContents();check('Title sort orders fixtures',()=>assert.deepEqual(actual,[...actual].sort((a,b)=>a.localeCompare(b,'ko'))));
 await page.locator('[data-action="import"]').click();actual=await page.locator('[role="dialog"]').count();check('Import explains prototype boundary',()=>assert.equal(actual,1));await page.keyboard.press('Tab');actual=await page.evaluate(()=>document.activeElement.hasAttribute('data-close'));check('Dialog traps Tab on available action',()=>assert.equal(actual,true));await page.keyboard.press('Escape');actual=await page.evaluate(()=>document.activeElement?.dataset.action);check('Dialog restores triggering focus',()=>assert.equal(actual,'import'));
 await page.locator('[data-action="open-score"]').first().click();actual=await page.locator('.page-count').innerText();check('Library opens reader',()=>assert.equal(actual,'1 / 3'));
 await page.locator('[data-action="next-page"]').click();actual=await page.locator('.page-count').innerText();check('Page navigation increments index',()=>assert.equal(actual,'2 / 3'));
 actual=await page.evaluate(()=>document.activeElement?.dataset.action);check('Page navigation preserves focus',()=>assert.equal(actual,'next-page'));
 await page.locator('[data-action="practice"]').click();actual=await page.locator('#practice-panel').isVisible();check('Practice panel opens outside score',()=>assert.equal(actual,true));
 await page.locator('#bpm').fill('96');actual=await page.locator('#bpm-value').innerText();check('Tempo output follows range input',()=>assert.equal(actual,'96'));
 await open('editor');await page.locator('.score-hit').focus();await page.keyboard.press('Enter');actual=await page.locator('.properties h3').first().innerText();check('Score selection works from keyboard',()=>assert.equal(actual,'선택 속성'));
 await page.keyboard.press('Escape');actual=await page.locator('.editor').evaluate(n=>n.classList.contains('selected'));check('Escape clears selection',()=>assert.equal(actual,false));
 await page.locator('[data-action="properties"]').click();actual=await page.locator('.properties').isVisible();check('Properties panel can collapse',()=>assert.equal(actual,false));
 await page.emulateMedia({reducedMotion:'reduce'});actual=await page.locator('[data-action="properties"]').evaluate(n=>getComputedStyle(n).transitionDuration);check('Reduced motion removes control transitions',()=>assert.equal(actual,'0s'));
 await open('overview');actual=await page.locator('.flock-art').evaluate(n=>getComputedStyle(n).animationName);check('Reduced motion leaves flock still',()=>assert.equal(actual,'none'));
 actual=await page.locator('.flight-replay').isVisible();check('Reduced motion hides replay action',()=>assert.equal(actual,false));
 await page.emulateMedia({reducedMotion:'no-preference'});await open('overview','light',390,844);await overflow('Flock overview mobile bounds');await capture('flock-mobile',true);
 await page.locator('.flock-art').evaluate(async n=>{await Promise.all(n.getAnimations().map(a=>a.finished))});
 await page.locator('[data-action="flight-replay"]').click();actual=await page.locator('.flock-art').evaluate(n=>n.getAnimations().some(a=>a.playState==='running'));check('Flock motion replays on request',()=>assert.equal(actual,true));
 const boards=['family-board','flock-board','flock-light','flock-dark','flight-rise','flight-glide','icon-comparison','small-icons','wordmark','derivation-board','typography'];
 const exports=[...boards,...(await readdir(path.join(root,'assets'))).filter(x=>/-(tile|a|mono|inverse)\.svg$/.test(x)).map(x=>x.slice(0,-4))];
 const exportPage=await browser.newPage({deviceScaleFactor:1});
 for(const asset of exports){
  let source=await readFile(path.join(root,'assets',asset+'.svg'),'utf8');
  source=source.replaceAll('fonts/PretendardVariable.woff2',new URL('../assets/fonts/PretendardVariable.woff2',base).href);
  const width=Number(source.match(/width="([\d.]+)"/)[1]),height=Number(source.match(/height="([\d.]+)"/)[1]);
  await exportPage.setViewportSize({width:Math.ceil(width),height:Math.ceil(height)});
  await exportPage.setContent('<html><head><style>html,body{margin:0;background:transparent}svg{display:block}</style></head><body>'+source+'</body></html>');
  await exportPage.evaluate(()=>document.fonts.ready);
  if(asset.endsWith('-a')){
   const bounds=await exportPage.locator('svg').evaluate(n=>{
    const b=n.getBBox();let maxRadius=0;
    for(const p of n.querySelectorAll('path')){
     const length=p.getTotalLength(),matrix=p.getCTM();
     for(let i=0;i<=160;i++){const q=p.getPointAtLength(length*i/160);const v=new DOMPoint(q.x,q.y).matrixTransform(matrix);maxRadius=Math.max(maxRadius,Math.hypot(v.x-128,v.y-128))}
    }
    return{x:b.x,y:b.y,width:b.width,height:b.height,sampledMaxRadius:maxRadius};
   });
   report.iconBounds.push({asset,...bounds});
   check(`Symbol stays inside master: ${asset}`,()=>assert(bounds.x>=16&&bounds.y>=16&&bounds.x+bounds.width<=240&&bounds.y+bounds.height<=240,JSON.stringify(bounds)));
   check(`Sampled contours keep circular mask margin: ${asset}`,()=>assert(bounds.sampledMaxRadius<=120,JSON.stringify(bounds)));
  }
  await exportPage.screenshot({path:path.join(out,asset+'.png'),omitBackground:true});report.screenshots.push(asset+'.png');
 }
 await exportPage.close();
 check('No runtime errors or missing assets',()=>assert.deepEqual(report.errors,[]));
 report.status='passed';
}catch(error){report.status='failed';report.failure=String(error);throw error}finally{
 await browser.close();await writeFile(path.join(out,'validation.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.checks.length} checks passed; ${report.screenshots.length} screenshots. See evidence/validation.json.`);
