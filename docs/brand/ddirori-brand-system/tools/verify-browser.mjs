import {createRequire} from 'node:module';
const toolsRoot=process.env.DDIRORI_BRAND_TOOLS||'/tmp/ddirori-brand-tools';
const require=createRequire(toolsRoot+'/package.json');
const {chromium}=require('playwright');
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER_PATH?{executablePath:process.env.DDIRORI_BROWSER_PATH}:{})});
const evidence=path.join(root,'evidence');await mkdir(evidence,{recursive:true});
const report={date:new Date().toISOString(),scope:'Local brand gallery in Chromium; CSS masks are geometric previews, not installed platform launchers',checks:[],errors:[]};
async function check(name,fn){await fn();report.checks.push(name)}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(process.env.DDIRORI_BRAND_URL||'http://127.0.0.1:8064/docs/brand/ddirori-brand-system/');
 await page.locator('.family .card').last().waitFor();await page.evaluate(()=>document.fonts.ready);await page.evaluate(async()=>{for(const n of document.images)n.loading='eager';await Promise.all([...document.images].map(n=>n.complete?Promise.resolve():new Promise(r=>{n.onload=r;n.onerror=r}))) });
 await check('7 product identities',async()=>{if(await page.locator('.family .card').count()!==7)throw Error('Expected 7 products')});
 await check('all images loaded',async()=>{const bad=await page.locator('img').evaluateAll(ns=>ns.filter(n=>!n.complete||!n.naturalWidth).map(n=>n.src));if(bad.length)throw Error(bad.join('\n'))});
 await page.screenshot({path:path.join(evidence,'gallery-desktop.png'),fullPage:true});
 await check('dark theme',async()=>{await page.getByRole('button',{name:'다크 모드',exact:true}).click();if(await page.locator('body.dark').count()!==1)throw Error('dark missing')});
 await page.screenshot({path:path.join(evidence,'gallery-dark.png'),fullPage:true});
 await check('24px icons and circular mask',async()=>{await page.locator('#size').selectOption('24');await page.locator('#mask').selectOption('circle');const width=await page.locator('.icon-box').first().evaluate(n=>n.getBoundingClientRect().width);if(width!==24)throw Error('Wrong icon width')});
 await check('grayscale',async()=>{await page.getByRole('button',{name:'회색조 비교'}).click();const f=await page.locator('.family img').first().evaluate(n=>getComputedStyle(n).filter);if(f!=='grayscale(1)')throw Error(f)});
 await page.locator('#family').screenshot({path:path.join(evidence,'icons-24-mono-circle.png')});
 await check('completion replaces loader',async()=>{await page.getByRole('button',{name:'완료',exact:true}).click();await page.locator('#statusVisual img[src*="happy"]').waitFor();if(!(await page.locator('#statusText').innerText()).includes('추가했습니다'))throw Error('No completion copy')});
 await check('error replaces success',async()=>{await page.getByRole('button',{name:'오류',exact:true}).click();if(await page.locator('#statusVisual img').count())throw Error('Character remained on error')});
 await check('real progress semantics in example',async()=>{await page.getByRole('button',{name:'진행률',exact:true}).click();if(await page.getByRole('progressbar').getAttribute('value')!=='0.6')throw Error('Missing progress')});
 await check('reduced motion',async()=>{await page.emulateMedia({reducedMotion:'reduce'});const names=await page.locator('.motion-bars i').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationName));if(names.some(n=>n!=='none'))throw Error(names.join(','))});
 await page.getByRole('button',{name:'진행 중',exact:true}).click();await page.getByRole('button',{name:'움직임 줄이기',exact:true}).click();await page.locator('#statusVisual img[src$="motif.svg"]').waitFor();
 await check('mobile layout 390px',async()=>{await page.setViewportSize({width:390,height:844});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow')});
 await page.locator('#size').selectOption('88');await page.locator('#mask').selectOption('rounded');await page.getByRole('button',{name:'회색조 비교'}).click();await page.getByRole('button',{name:'다크 모드',exact:true}).click();
 await page.screenshot({path:path.join(evidence,'gallery-mobile.png'),fullPage:true});
 await check('mobile 200 percent typography',async()=>{await page.evaluate(()=>{const ns=[...document.querySelectorAll('h1,h2,h3,p,button,select,a,label,figcaption,.eyebrow,strong')];const sizes=ns.map(n=>parseFloat(getComputedStyle(n).fontSize));ns.forEach((n,i)=>n.style.fontSize=sizes[i]*2+'px')});await page.addStyleTag({content:'body{overflow-wrap:anywhere}.controls>*{max-width:100%}.options label{flex-wrap:wrap}'});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Large typography overflows')});
 if(report.errors.length)throw Error(report.errors.join('\n'));report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e}
finally{await browser.close();await writeFile(path.join(evidence,'browser-validation.json'),JSON.stringify(report,null,2)+'\n')}
console.log(report.checks.length+' browser checks passed');
