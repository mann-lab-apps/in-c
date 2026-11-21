// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import type {StaveNote} from 'vexflow'
import {drawBreathMark} from './NotationPreview'
import * as ink from './staff-ink-spacing'

const originalFonts=Object.getOwnPropertyDescriptor(document,'fonts')
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();if(originalFonts)Object.defineProperty(document,'fonts',originalFonts);else Reflect.deleteProperty(document,'fonts')})
function setup(){
 document.body.innerHTML='<svg><g data-event-id="rest" data-measure-id="lower-2"></g></svg>'
 const svg=document.querySelector('svg')!,event=svg.querySelector('g')!
 Object.defineProperty(document,'fonts',{configurable:true,value:{status:'loaded'}})
 Object.defineProperty(svg,'getCTM',{value:()=>({})})
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D)
 vi.spyOn(ink,'readSvgTextInk').mockImplementation(node=>node.classList.contains('notation-breath-mark')?{x:250,y:Number(node.getAttribute('y'))-12,width:12,height:10}:node.classList.contains('owned')?{x:250,y:300,width:20,height:10}:undefined)
 const note={getSVGElement:()=>event,getStave:()=>({getYForLine:()=>340})} as unknown as StaveNote
 return{svg,note}
}

it.each(['breath','caesura'])('anchors %s to its own painted staff rather than a neighboring staff origin',kind=>{
 const{svg,note}=setup()
 // Current internal renderer signature will receive its already-rendered note.
 drawBreathMark(svg,240,300,kind,false,'lower-2','rest',note)
 const mark=svg.querySelector<SVGTextElement>('.notation-breath-mark')!
 const bounds=ink.readSvgTextInk(mark,{} as CanvasRenderingContext2D)!
 expect(340-(bounds.y+bounds.height)).toBeCloseTo(8,2)
 expect(mark.dataset.printMeasureId).toBe('lower-2')
})

it('clears final owned fermata/ornament ink but ignores a neighbor with a colliding event id',()=>{
 const{svg,note}=setup()
 svg.insertAdjacentHTML('beforeend','<text class="notation-fermata owned" data-fermata-measure-id="lower-2" data-fermata-event-id="rest">𝄐</text><text class="notation-ornament owned" data-ornament-measure-id="upper-2" data-ornament-event-id="rest">tr</text>')
 drawBreathMark(svg,240,300,'caesura',true,'lower-2','rest',note)
 let mark=svg.querySelector<SVGTextElement>('.notation-breath-mark')!,bounds=ink.readSvgTextInk(mark,{} as CanvasRenderingContext2D)!
 expect(300-(bounds.y+bounds.height)).toBeCloseTo(8,2)
 svg.querySelector('.notation-fermata')!.remove();mark.remove()
 drawBreathMark(svg,240,300,'caesura',false,'lower-2','rest',note)
 mark=svg.querySelector<SVGTextElement>('.notation-breath-mark')!;bounds=ink.readSvgTextInk(mark,{} as CanvasRenderingContext2D)!
 expect(340-(bounds.y+bounds.height)).toBeCloseTo(8,2)
})
