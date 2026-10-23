import {mkdir,writeFile}from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'evidence');await mkdir(out,{recursive:true});
const{chromium}=await import(process.env.DDIRORI_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.DDIRORI_BROWSER_PATH?{executablePath:process.env.DDIRORI_BROWSER_PATH}:{})});
const report={date:new Date().toISOString(),scope:'Compiled Flutter catalog rendered in Chromium; not native-device or audio QA',captures:[],errors:[],externalHosts:[]};
try{
 const page=await browser.newPage({deviceScaleFactor:1});const hosts=new Set();
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('request',r=>{const h=new URL(r.url()).hostname;if(h!=='127.0.0.1')hosts.add(h)});
 for(const[index,theme,width]of [[0,'light',1440],[1,'light',390],[2,'dark',840],[3,'light',1440],[4,'dark',1440],[5,'light',390]]){
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto((process.env.DDIRORI_FLUTTER_URL||'http://127.0.0.1:8059/')+'?page='+index+'&theme='+theme);
  await page.waitForSelector('flutter-view',{state:'attached',timeout:30000});
  const enable=page.locator('flt-semantics-placeholder');if(await enable.count())await enable.evaluate(n=>n.click());
  await page.waitForSelector('flt-semantics',{state:'attached',timeout:30000});
  if(index===4){await page.getByRole('button',{name:'밀도 전환',exact:true}).focus();await page.keyboard.press('Enter');await page.getByText(/다크 · compact ·/).first().waitFor({state:'attached',timeout:5000});}
  await page.waitForTimeout(700);
  const file='flutter-'+index+'-'+theme+'.png';await page.screenshot({path:path.join(out,file),fullPage:true});
  report.captures.push({file,width,theme,view:index,semanticNodes:await page.locator('flt-semantics').count()});
 }
 report.externalHosts=[...hosts];if(report.errors.length)throw Error(report.errors.join('\n'));report.status='passed';
}catch(e){report.status='failed';report.failure=String(e);throw e}
finally{await browser.close();await writeFile(path.join(out,'flutter-browser.json'),JSON.stringify(report,null,2)+'\n')}
console.log(report.captures.length+' compiled Flutter views captured.');
