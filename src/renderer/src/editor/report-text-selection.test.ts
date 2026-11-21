// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { ownsReportTextSelection } from './report-text-selection'
afterEach(()=>{document.getSelection()?.removeAllRanges();document.body.replaceChildren();vi.restoreAllMocks()})
function fixture() {
 document.body.innerHTML='<section class="studio-warning-report"><button id="read">기술 정보</button><code id="one">part[2].measure[10]</code></section><div class="studio-warning-technical"><button id="other">기술 정보</button><span id="two">원본 오류</span></div><span class="studio-status__result" id="status">파일 결과</span><button id="score">악보</button><span id="music">C4</span>'
 const one=document.getElementById('one')!,two=document.getElementById('two')!,read=document.getElementById('read')!,range=document.createRange()
 range.selectNodeContents(one);document.getSelection()!.addRange(range)
 return {one,two,read,range,selection:document.getSelection()!}
}
it.each(['button','body','other-reading-context'] as const)('owns visible diagnostic text in %s',context=>{
 const f=fixture();expect(ownsReportTextSelection(context==='body'?document.body:context==='button'?f.read:document.getElementById('other'))).toBe(true)
})
it('keeps multi-node and cross-report reading selections with their browser owner',()=>{
 const f=fixture();f.range.setEnd(f.two.firstChild!,2);expect(ownsReportTextSelection(document.body)).toBe(true)
})
it('accepts a visible standalone file result without changing its DOM or selection',()=>{
 const f=fixture(),status=document.getElementById('status')!,before=document.body.innerHTML;f.range.selectNodeContents(status)
 expect(ownsReportTextSelection(document.body)).toBe(true);expect(document.body.innerHTML).toBe(before);expect(f.selection.toString()).toBe('파일 결과')
})
it.each(['collapsed','empty','detached','hidden','inert','aria-hidden','display','visibility','opacity','browser-visibility','outside-selection','outside-end','new-score-focus','null-target','window-target'] as const)('rejects stale or unowned %s selection',kind=>{
 const f=fixture();let target:EventTarget|null=f.read
 if(kind==='collapsed')f.selection.collapseToStart()
 if(kind==='empty'){f.one.textContent='';f.range.selectNodeContents(f.one)}
 if(kind==='detached')f.one.remove()
 if(kind==='hidden')f.one.hidden=true
 if(kind==='inert')f.one.setAttribute('inert','')
 if(kind==='aria-hidden')f.one.setAttribute('aria-hidden','true')
 if(kind==='display')f.one.style.display='none'
 if(kind==='visibility')f.one.style.visibility='hidden'
 if(kind==='opacity')f.one.style.opacity='0'
 if(kind==='browser-visibility')Object.defineProperty(f.one,'checkVisibility',{configurable:true,value:()=>false})
 if(kind==='outside-selection')f.range.selectNodeContents(document.getElementById('music')!)
 if(kind==='outside-end')f.range.setEnd(document.getElementById('music')!.firstChild!,1)
 if(kind==='new-score-focus')target=document.getElementById('score')
 if(kind==='null-target')target=null
 if(kind==='window-target')target=window
 expect(ownsReportTextSelection(target)).toBe(false)
})
it('rejects a hidden current reading control even with valid visible text selected',()=>{
 const f=fixture();f.read.hidden=true;expect(ownsReportTextSelection(f.read)).toBe(false)
})
