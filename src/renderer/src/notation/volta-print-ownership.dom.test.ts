// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {drawVoltaMark} from './NotationPreview'
import {readPrintSystemInk} from './print-system-ink'
import {resolveMeasuredPrintLayout} from './measured-print-pages'
import {crossingPrintPage} from './print-page-ink'
import * as readers from './staff-ink-spacing'
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks()})
it.each([{number:1,start:true,end:true,system:0},{number:2,start:true,end:false,system:1},{number:2,start:false,end:true,system:1}])('keeps all visible volta $number pieces owned by system $system without changing their ink',({number,start,end,system})=>{
 document.body.innerHTML='<svg width="1087"></svg>';const svg=document.querySelector('svg')!
 vi.spyOn(readers,'readSvgTextInk').mockImplementation(n=>({x:Number(n.getAttribute('x')),y:Number(n.getAttribute('y'))-9,width:12,height:10}))
 vi.spyOn(readers,'readSvgShapeInk').mockImplementation(n=>({x:Math.min(Number(n.getAttribute('x1')),Number(n.getAttribute('x2')))-.5,y:Math.min(Number(n.getAttribute('y1')),Number(n.getAttribute('y2')))-.5,width:Math.max(1,Math.abs(Number(n.getAttribute('x2'))-Number(n.getAttribute('x1')))+1),height:Math.max(1,Math.abs(Number(n.getAttribute('y2'))-Number(n.getAttribute('y1')))+1)}))
 drawVoltaMark(svg,40,1040,100,{number:number as 1|2,start,end},system)
 const result=readPrintSystemInk(svg,{}as CanvasRenderingContext2D,new Map([[system,80]]),new Map())
 expect(result.unknown).toBe(0);expect(result.bands).toHaveLength(1);expect(result.bands[0].systemIndex).toBe(system)
 const group=svg.querySelector('.notation-volta-mark')!;expect(group.getAttribute('data-system-index')).toBe(String(system))
 const lines=[...group.querySelectorAll('line')];expect(lines).toHaveLength(1+Number(start)+Number(end));expect(lines.at(-1)?.getAttribute('x1')).toBe('40');expect(lines.at(-1)?.getAttribute('x2')).toBe('1040');expect(lines.at(-1)?.getAttribute('y1')).toBe('78');expect(group.querySelector('text')?.textContent).toBe(start?`${number}.`:undefined)
})
it('uses complete measured bands to repair the observed first-system crossing and remove the blank reservation',()=>{
 const bands=[{systemIndex:0,origin:226,top:117.16800022125244,bottom:771.1950006484985},{systemIndex:1,origin:971,top:875.6319999694824,bottom:1494.3359375}],before=structuredClone(bands),height=750.4555160142348
 const result=resolveMeasuredPrintLayout(bands,{origin:0,height,headerBottom:38.50600242614746,viewportBottom:1716})!
 expect(result).toBeDefined();expect(Math.ceil(result.height/height)).toBe(2)
 for(const b of bands){const shift=result.origins.get(b.systemIndex)!-b.origin;expect(crossingPrintPage(b.top+shift,b.bottom+shift,height)).toBeUndefined();expect(b.bottom+shift-(b.top+shift)).toBeCloseTo(b.bottom-b.top)}
 expect(bands).toEqual(before)
})
