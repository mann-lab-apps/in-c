// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {drawExpressionText} from './NotationPreview'
import * as ink from './staff-ink-spacing'
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks()})
function fixture(x:number,width=33.777){
 document.body.innerHTML='<svg width="750"></svg>';const svg=document.querySelector('svg')!
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({}as CanvasRenderingContext2D)
 vi.spyOn(ink,'readSvgTextInk').mockImplementation(node=>({x:Number(node.getAttribute('x'))+.6045,y:90,width,height:9.776}))
 return{svg,draw:(onSelect?:()=>void)=>drawExpressionText(svg,x,100,'dolce','m',onSelect,{id:'expression',selected:true})}
}
it('keeps a short expression at the rightmost source tick inside the physical music viewport',()=>{
 const f=fixture(718.2);f.draw();const text=f.svg.querySelector('text')!,bounds=ink.readSvgTextInk(text,{}as CanvasRenderingContext2D)!
 expect(bounds.x+bounds.width).toBeLessThanOrEqual(746.001);expect(text.textContent).toBe('dolce');expect(text.getAttribute('y')).toBe('100');expect(text.dataset.measureId).toBe('m')
})
it('measures the pointer target after automatic ink fitting and preserves keyboard activation',()=>{
 const f=fixture(718.2),select=vi.fn();f.draw(select);const text=f.svg.querySelector('text')!,hit=f.svg.querySelector('rect')!,target=f.svg.querySelector('[role="button"]')!,bounds=ink.readSvgTextInk(text,{}as CanvasRenderingContext2D)!
 expect(Number(hit.getAttribute('x'))).toBeCloseTo(bounds.x);expect(Number(hit.getAttribute('width'))).toBe(bounds.width);expect(bounds.x+bounds.width).toBeLessThanOrEqual(746.001)
 target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(select).toHaveBeenCalledOnce();expect(target.getAttribute('aria-pressed')).toBe('true')
})
it('keeps an ordinary clear onset at its exact source anchor',()=>{const f=fixture(240);f.draw();expect(f.svg.querySelector('text')!.getAttribute('x')).toBe('240')})
it('does not shorten or force-fit an overlong expression that must retain output diagnostics',()=>{const f=fixture(718.2,900);f.draw();expect(f.svg.querySelector('text')!.getAttribute('x')).toBe('718.2');expect(f.svg.querySelector('text')!.textContent).toBe('dolce')})
