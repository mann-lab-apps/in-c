// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { assertPrintPageInk, crossingPrintPage, PrintPageInkError } from './print-page-ink'

it('detects a split staff/glyph while preserving exact edges, subpixel tolerance and safe selected pages',()=>{
  expect(crossingPrintPage(490,530,500)).toBe(1)
  expect(crossingPrintPage(490,530,500,1)).toBe(1)
  expect(crossingPrintPage(490,530,500,2)).toBe(1)
  expect(crossingPrintPage(490,530,500,3)).toBeUndefined()
  expect(crossingPrintPage(0,500,500)).toBeUndefined()
  expect(crossingPrintPage(500,520,500)).toBeUndefined()
  expect(crossingPrintPage(490,500.2,500)).toBeUndefined()
  expect(crossingPrintPage(1490,2020,500,4)).toBe(3)
  expect(crossingPrintPage(NaN,50,500)).toBeUndefined()
})

it('measures painted staff lines across a negative viewBox origin, excluding hit rectangles and preserving DOM',()=>{
  const root=document.createElement('div');root.innerHTML='<div class="score-page"><div class="notation-preview"><svg viewBox="0 -20 190 600"><g class="vf-stave"><path style="stroke:black;stroke-width:1;fill:none"/></g><rect opacity="0" width="100" height="600"/></svg></div></div>';document.body.append(root)
  const host=root.querySelector<HTMLElement>('.score-page')!,svg=root.querySelector('svg')!,line=root.querySelector('path')!,hit=root.querySelector('rect')!
  const rect={x:-30000,y:0,top:0,left:-30000,width:190,height:600,right:-29810,bottom:600,toJSON(){return{}}} as DOMRect
  host.getBoundingClientRect=svg.getBoundingClientRect=()=>rect
  Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:0,y:-20,width:190,height:600}}})
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
  svg.getCTM=line.getCTM=hit.getCTM=()=>identity
  line.getBBox=()=>({x:10,y:250,width:160,height:40} as DOMRect)
  hit.getBBox=()=>{throw Error('Transparent selection rectangle must not be measured')}
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  const paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:10,staffSizePercent:100,systemSpacingPercent:100},before=root.innerHTML
  try{
    expect(()=>assertPrintPageInk(root,paper)).toThrow(PrintPageInkError)
    expect(()=>assertPrintPageInk(root,paper)).toThrow('1–2쪽 사이에서 보표')
    expect(()=>assertPrintPageInk(root,paper,3)).not.toThrow()
    line.getBBox=()=>({x:10,y:180,width:160,height:40} as DOMRect)
    expect(()=>assertPrintPageInk(root,paper)).not.toThrow()
    expect(root.innerHTML).toBe(before)
  }finally{canvas.mockRestore();root.remove()}
})

it('uses actual glyph ink instead of font em or transparent selection geometry',()=>{
  const root=document.createElement('div');root.innerHTML='<div class="score-page"><div class="notation-preview"><svg viewBox="0 0 190 600"><text style="font:40px Bravura;fill:black;stroke:none">mp</text><text style="opacity:0;fill:black">hidden</text></svg></div></div>';document.body.append(root)
  const host=root.querySelector<HTMLElement>('.score-page')!,svg=root.querySelector('svg')!,texts=[...root.querySelectorAll('text')]
  const rect={top:0,width:190,height:600} as DOMRect;host.getBoundingClientRect=svg.getBoundingClientRect=()=>rect
  Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:0,y:0,width:190,height:600}}})
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
  svg.getCTM=()=>identity;for(const n of texts){n.getCTM=()=>identity;n.getBBox=()=>{throw Error('Font em box must not be substituted')}}
  texts[0].getStartPositionOfChar=()=>({x:20,y:280} as DOMPoint)
  texts[1].getStartPositionOfChar=()=>{throw Error('Invisible glyph has no output ink')}
  const context={font:'',measureText:()=>({actualBoundingBoxLeft:0,actualBoundingBoxRight:20,actualBoundingBoxAscent:10,actualBoundingBoxDescent:2})} as unknown as CanvasRenderingContext2D
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context),paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:10,staffSizePercent:100,systemSpacingPercent:100}
  try{expect(()=>assertPrintPageInk(root,paper)).toThrow('음악 기호');texts[0].getStartPositionOfChar=()=>({x:20,y:200} as DOMPoint);expect(()=>assertPrintPageInk(root,paper)).not.toThrow()}
  finally{canvas.mockRestore();root.remove()}
})


it.each(['left','right'] as const)('rejects real %s ink overflow only on affected physical pages, with a negative expanded viewBox', side=>{
  const root=document.createElement('div')
  root.innerHTML='<div class="score-page"><div class="notation-preview"><svg><path style="stroke:black;stroke-width:1;fill:none"/><rect opacity="0" width="900" height="900"/></svg></div></div>'
  document.body.append(root)
  const host=root.querySelector<HTMLElement>('.score-page')!,svg=root.querySelector('svg')!,line=root.querySelector('path')!,hit=root.querySelector('rect')!
  host.getBoundingClientRect=()=>({left:-30000,top:0,width:190,height:900} as DOMRect)
  // Keep the SVG wider than the page, as VexFlow's inline dimensions do in production.
  svg.getBoundingClientRect=()=>({left:-30000,top:0,width:210,height:900} as DOMRect)
  Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:-10,y:-20,width:210,height:900}}})
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
  svg.getCTM=line.getCTM=hit.getCTM=()=>identity
  let ink={x:side==='left'?-12:175,y:340,width:10,height:10}
  line.getBBox=()=>ink as DOMRect
  hit.getBBox=()=>{throw Error('Invisible hit geometry is not output ink')}
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  const paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:10,staffSizePercent:100,systemSpacingPercent:100},before=root.innerHTML
  try{
    for(const selected of ['all',2] as const){
      let caught:unknown;try{assertPrintPageInk(root,paper,selected)}catch(e){caught=e}
      expect(caught).toBeInstanceOf(PrintPageInkError)
      expect((caught as PrintPageInkError).issue).toEqual({axis:'horizontal',page:2,kind:'symbol'})
      expect((caught as Error).message).toContain('2쪽의 음악 기호가 가로 출력 영역')
    }
    expect(()=>assertPrintPageInk(root,paper,1)).not.toThrow()
    expect(()=>assertPrintPageInk(root,paper,3)).not.toThrow()
    // Entirely inside, then .2px round-off at the right edge: both remain safe.
    ink={x:160,y:340,width:10,height:10};expect(()=>assertPrintPageInk(root,paper)).not.toThrow()
    ink={x:170,y:340,width:9.7,height:10};expect(()=>assertPrintPageInk(root,paper)).not.toThrow()
    expect(root.innerHTML).toBe(before)
  }finally{canvas.mockRestore();root.remove()}
})
