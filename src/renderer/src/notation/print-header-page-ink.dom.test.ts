// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { assertPrintPageInk, PrintPageInkError } from './print-page-ink'

it('rejects painted HTML header glyphs split across pages while preserving safe pages and the original text', () => {
  const root=document.createElement('div')
  root.innerHTML='<div class="score-page"><div class="score-title"><span>Boundary word</span><span>\u00a0</span></div><div class="notation-preview"><svg/></div></div>'
  document.body.append(root)
  const host=root.querySelector<HTMLElement>('.score-page')!,svg=root.querySelector('svg')!
  const paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:8,staffSizePercent:100,systemSpacingPercent:100}
  const width=750,h=width*(297-16)/(210-16),rect={top:0,left:-30000,width,height:h*4} as DOMRect
  host.getBoundingClientRect=svg.getBoundingClientRect=()=>rect
  Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:0,y:0,width,height:h*4}}})
  svg.getCTM=()=>({}) as DOMMatrix
  let top=h-10,fontAscent=14,fontDescent=3,actualAscent=10.895,actualDescent=2.777
  const context={font:'',save:vi.fn(),restore:vi.fn(),measureText:(text:string)=>({width:text.length*7,actualBoundingBoxLeft:0,actualBoundingBoxRight:text.length*7,actualBoundingBoxAscent:actualAscent,actualBoundingBoxDescent:actualDescent,fontBoundingBoxAscent:fontAscent,fontBoundingBoxDescent:fontDescent})} as unknown as CanvasRenderingContext2D
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context)
  const ranges=vi.spyOn(document,'createRange').mockImplementation(()=>{
    let start=0,end=1
    return {setStart:(_node:Node,value:number)=>{start=value},setEnd:(_node:Node,value:number)=>{end=value},
      getBoundingClientRect:()=>({left:-29900+start*7,top,width:(end-start)*7,height:17,right:-29900+end*7,bottom:top+17}),
      getClientRects:()=>[],detach:()=>{}} as unknown as Range
  })
  try {
    const before=root.innerHTML
    for(const page of ['all',1,2] as const){
      let error:unknown;try{assertPrintPageInk(root,paper,page)}catch(e){error=e}
      expect(error).toBeInstanceOf(PrintPageInkError)
      expect((error as PrintPageInkError).issue).toMatchObject({kind:'header',afterPage:1})
      expect((error as Error).message).toContain('제목·작곡가')
    }
    expect(()=>assertPrintPageInk(root,paper,3)).not.toThrow()
    // A line/EM rectangle may cross while actual glyph ink stays safely inside.
    top=h-12;fontAscent=10;fontDescent=7;actualAscent=8;actualDescent=0
    expect(top+17).toBeGreaterThan(h)
    expect(()=>assertPrintPageInk(root,paper)).not.toThrow()
    expect(root.innerHTML).toBe(before)
  } finally {canvas.mockRestore();ranges.mockRestore();root.remove()}
})
