// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { applyStaffInkSpacing, readSvgTextInk, resolveStaffInkSpacing, type StaffInk } from './staff-ink-spacing'

const ink=(staffIndex:number,systemIndex:number,x:number,y:number,width:number,height:number):StaffInk=>({staffIndex,systemIndex,x,y,width,height})

it('reserves actual low-note ink before a lower staff chord without restoring a fictitious label',()=>{
  const head=ink(0,0,110.16,157,11.8,10),chord=ink(1,0,77.94,162.40625,81.3125,15.5625),original=structuredClone({head,chord})
  const initial=new Map<number,number>(),gaps=resolveStaffInkSpacing([head],[chord],initial)
  expect(gaps.get(0)).toBe(12.6);expect(initial.size).toBe(0)
  expect(resolveStaffInkSpacing([head],[{...chord,y:chord.y+12.6}],gaps)).toBe(gaps)
  expect({head,chord}).toEqual(original)
})

it('keeps different systems and same-staff or horizontally separate user geometry on their existing path',()=>{
  const existing=new Map([[0,10]]),head=ink(0,0,20,100,10,10)
  for(const text of [ink(1,1,20,100,20,10),ink(0,0,20,100,20,10),ink(1,0,50,100,20,10)])
    expect(resolveStaffInkSpacing([head],[text],existing)).toBe(existing)
})

it('moves subsequent staff origins and the system envelope together, preserving relative manual geometry',()=>{
  const base={offsets:[0,100,200],labelBaselines:[-12,-12,-12],requiredAbove:36,requiredBelow:154,minimumSystemHeight:390,measured:true}
  const before=structuredClone(base),gaps=new Map([[0,12.6],[1,8],[2,999]])
  const next=applyStaffInkSpacing(base,gaps)
  expect(next.offsets).toEqual([0,112.6,220.6]);expect(next.minimumSystemHeight).toBe(410.6)
  expect(next.labelBaselines).toEqual(base.labelBaselines);expect(base).toEqual(before)
  expect(applyStaffInkSpacing(base,new Map([[0,NaN],[1,-4],[2,999]]))).toBe(base)
})

it('uses glyph ink and SVG-local transforms rather than the music font em box',()=>{
  const host=document.createElement('div');host.innerHTML='<svg><text style="font:40px Bravura;fill:black;stroke:none">&#xe0a4;</text></svg>';document.body.append(host)
  const svg=host.querySelector('svg')!,text=host.querySelector('text')!,before=host.innerHTML
  const identity={inverse(){return this},multiply(m:DOMMatrix){return m}} as unknown as DOMMatrix
  svg.getCTM=()=>identity;text.getCTM=()=>({a:2,b:0,c:0,d:2,e:30,f:40} as DOMMatrix)
  text.getStartPositionOfChar=()=>({x:10,y:20} as DOMPoint)
  text.getBBox=()=>{throw Error('An em-box estimate must not replace actual glyph ink')}
  const context={font:'',letterSpacing:'',wordSpacing:'',measureText:()=>({actualBoundingBoxLeft:.2,actualBoundingBoxRight:11.6,actualBoundingBoxAscent:5,actualBoundingBoxDescent:5,fontBoundingBoxAscent:181,fontBoundingBoxDescent:181})} as unknown as CanvasRenderingContext2D
  const b=readSvgTextInk(text,context)!
  expect(b.x).toBeCloseTo(49.6);expect(b.y).toBeCloseTo(70);expect(b.width).toBeCloseTo(23.6);expect(b.height).toBe(20)
  expect(host.innerHTML).toBe(before);host.remove()
})

it('ignores invisible glyphs instead of reserving transparent hit surfaces',()=>{
  const host=document.createElement('div');host.innerHTML='<svg><g style="opacity:0"><text style="font:40px Bravura;fill:black">&#xe0a4;</text></g></svg>';document.body.append(host)
  const text=host.querySelector('text')!,measureText=vi.fn(),context={measureText} as unknown as CanvasRenderingContext2D
  expect(readSvgTextInk(text,context)).toBeUndefined();expect(measureText).not.toHaveBeenCalled();host.remove()
})

it('protects low music ink from the following staff stem even with no lower text annotation', async () => {
  const { measureStaffInkSpacing } = await import('./staff-ink-spacing')
  const host = document.createElement('div')
  host.innerHTML = '<svg><g class="notation-event" data-measure-id="upper" data-part-id="part" data-staff-id="a"><text style="font:40px Bravura;fill:black;stroke:none">C</text></g><g class="notation-event" data-measure-id="lower" data-part-id="part" data-staff-id="b"><text style="font:40px Bravura;fill:black;stroke:none">D</text><path style="fill:black;stroke:none" d="M110 260V300"/></g></svg>'
  document.body.append(host)
  const svg = host.querySelector('svg')!, identity = { a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this} } as unknown as DOMMatrix
  for (const node of [svg,...svg.querySelectorAll<SVGGraphicsElement>('text,path')]) node.getCTM = () => identity
  const [upper,lower] = host.querySelectorAll<SVGTextContentElement>('text')
  upper.getStartPositionOfChar = () => ({x:110,y:267} as DOMPoint)
  lower.getStartPositionOfChar = () => ({x:110,y:317} as DOMPoint)
  host.querySelector('path')!.getBBox = () => ({x:110,y:260,width:1,height:40} as DOMRect)
  const context = {font:'',letterSpacing:'',wordSpacing:'',measureText:()=>({actualBoundingBoxLeft:0,actualBoundingBoxRight:12,actualBoundingBoxAscent:5,actualBoundingBoxDescent:5})} as unknown as CanvasRenderingContext2D
  const fonts = Object.getOwnPropertyDescriptor(document,'fonts')
  Object.defineProperty(document,'fonts',{configurable:true,value:{}})
  const canvas = vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context)
  try {
    const existing = new Map<number,number>(), before = host.innerHTML
    const next = measureStaffInkSpacing(svg,new Map([
      ['upper',{partId:'part',staffId:'a',staffIndex:0,systemIndex:0}],
      ['lower',{partId:'part',staffId:'b',staffIndex:1,systemIndex:0}]
    ]),existing)
    expect(next.get(0)).toBe(20)
    expect(existing.size).toBe(0)
    expect(host.innerHTML).toBe(before)
  } finally {
    canvas.mockRestore();host.remove()
    if (fonts) Object.defineProperty(document,'fonts',fonts)
    else Reflect.deleteProperty(document,'fonts')
  }
})

it('reserves measured manual slur ink before an adjacent staff line without changing span geometry', async () => {
  const { measureStaffInkSpacing } = await import('./staff-ink-spacing')
  const host=document.createElement('div');host.innerHTML='<svg><g class="vf-stave" data-measure-id="lower"><path style="fill:none;stroke:black;stroke-width:1" d="M8 988.16H308"/></g></svg>';document.body.append(host)
  const svg=host.querySelector('svg')!,line=host.querySelector('path')!,identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
  svg.getCTM=()=>identity;line.getCTM=()=>identity;line.getBBox=()=>({x:8,y:988.16,width:300,height:0} as DOMRect)
  const context={} as CanvasRenderingContext2D,fonts=Object.getOwnPropertyDescriptor(document,'fonts');Object.defineProperty(document,'fonts',{configurable:true,value:{}})
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context)
  const slur=ink(0,1,75.84,981.85,378.56,16.6),before=structuredClone(slur),existing=new Map<number,number>()
  try {
    const next=measureStaffInkSpacing(svg,new Map([['lower',{partId:'part',staffId:'b',staffIndex:1,systemIndex:1}]]),existing,[slur])
    expect(next.get(0)).toBeGreaterThanOrEqual(18.79)
    expect(next.get(0)).toBeLessThanOrEqual(18.8)
    expect(slur).toEqual(before);expect(existing.size).toBe(0)
  } finally {canvas.mockRestore();host.remove();if(fonts)Object.defineProperty(document,'fonts',fonts);else Reflect.deleteProperty(document,'fonts')}
})
