// Requires root VexFlow and an external Playwright install. Does not run the product.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'../../..');
const {chromium}=await import(process.env.GIREOGI_PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.GIREOGI_BROWSER_PATH?{executablePath:process.env.GIREOGI_BROWSER_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:760,height:1040},deviceScaleFactor:1});
 await page.setContent('<div id="score"></div>');
 await page.addScriptTag({path:path.join(repo,'node_modules/vexflow/build/cjs/vexflow.js')});
 const output=await page.evaluate(async()=>{
  await document.fonts.ready;
  const VF=VexFlow;
  VF.setFonts('Bravura','Academico');
  const renderer=new VF.Renderer(document.querySelector('#score'),VF.Renderer.Backends.SVG);
  renderer.resize(760,1040);
  const ctx=renderer.getContext();
  ctx.setFillStyle('#172323');ctx.setStrokeStyle('#172323');
  ctx.setFont('Academico',28);ctx.fillText('Small departure',260,92);
  ctx.setFont('Academico',12);ctx.fillText('Original design fixture / solo flute',260,120);
  ctx.fillText('Flute',66,173);ctx.fillText('Andante / 80',66,205);
  const melody=[['c/5','d/5','e/5','g/5'],['a/5','g/5','e/5','d/5'],['e/5','f/5','g/5','a/5'],['g/5','e/5','d/5','c/5'],['e/5','g/5','a/5','c/6'],['b/5','a/5','g/5','e/5'],['d/5','e/5','f/5','a/5'],['g/5','f/5','e/5','d/5'],['c/5','e/5','g/5','c/6'],['a/5','g/5','f/5','d/5'],['e/5','d/5','c/5','d/5'],['c/5','g/4','c/5','c/5']];
  for(let row=0;row<4;row++){
   for(let m=0;m<3;m++){
    const index=row*3+m;
    const stave=new VF.Stave(64+m*210,220+row*175,210);
    if(m===0)stave.addClef('treble');if(index===0)stave.addTimeSignature('4/4');
    if(index===11)stave.setEndBarType(VF.Barline.type.END);
    stave.setContext(ctx).draw();
    const notes=melody[index].map(key=>new VF.StaveNote({keys:[key],duration:'q',autoStem:true}));
    const voice=new VF.Voice({numBeats:4,beatValue:4}).addTickables(notes);
    new VF.Formatter().joinVoices([voice]).format([voice],m===0?135:180);
    voice.draw(ctx,stave);
   }
   ctx.setFont('Academico',10);ctx.fillText(String(row*3+1),64,215+row*175);
  }
  ctx.setFont('Academico',11);ctx.fillText('Design fixture - no third-party score content',234,980);
  const svg=document.querySelector('#score svg');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  return svg.outerHTML;
 });
 await writeFile('/tmp/gireogi-practice-score-text.svg',output);
 console.log('Wrote /tmp/gireogi-practice-score-text.svg; outline with outline-score.py.');
}finally{await browser.close()}
