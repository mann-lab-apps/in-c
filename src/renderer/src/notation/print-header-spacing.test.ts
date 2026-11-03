// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { measurePrintHeaderInset, resolvePrintHeaderInset, resolvePrintHeaderInkInset } from './print-header-spacing'

it('reserves the recorded long-header collision without shrinking text and settles after moving the first system', () => {
  const header = 183.546875, first = 54.16800022125244
  const inset = resolvePrintHeaderInset(header, first, 1, 0)
  expect(inset).toBeCloseTo(137.38, 6)
  expect(first + inset - header).toBeGreaterThanOrEqual(8)
  expect(resolvePrintHeaderInset(header, first + inset, 1, inset)).toBe(inset)
  expect(resolvePrintHeaderInset(42.796875, first, 1, 0)).toBe(0)
})

it('converts physical clearance to the printed SVG scale and ignores unavailable metrics', () => {
  expect(resolvePrintHeaderInset(100, 100, 0.5, 0)).toBe(16)
  expect(resolvePrintHeaderInset(100, 100, 2, 0)).toBe(4)
  for (const scale of [0, -1, NaN, Infinity]) expect(resolvePrintHeaderInset(100, 20, scale, 3)).toBe(3)
  expect(resolvePrintHeaderInset(NaN, 20, 1, 3)).toBe(3)
  expect(resolvePrintHeaderInset(100, Infinity, 1, 3)).toBe(3)
})

it('does not reserve space for a painted but empty SVG path', () => {
  const header = document.createElement('div'), svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS(svg.namespaceURI, 'path') as SVGPathElement
  path.style.fill = 'black'; svg.append(path); document.body.append(header, svg)
  const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => matrix, multiply: () => matrix }
  const fonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: {} })
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  Object.defineProperties(svg, { getScreenCTM: { value: () => matrix }, getCTM: { value: () => matrix } })
  Object.defineProperties(path, { getBBox: { value: () => ({ x: 0, y: 0, width: 0, height: 0 }) }, getCTM: { value: () => matrix } })
  vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 520, 43))
  try { expect(measurePrintHeaderInset(svg, header, 0)).toBe(0) }
  finally {
    canvas.mockRestore(); header.remove(); svg.remove()
    if (fonts) Object.defineProperty(document, 'fonts', fonts)
    else Reflect.deleteProperty(document, 'fonts')
  }
})

it.each([{left:350,expected:0},{left:20,expected:10}])('uses rendered heading text lines instead of the whole header block at x=$left', ({left,expected}) => {
  const header=document.createElement('div'),label=document.createElement('span'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),tempo=document.createElementNS(svg.namespaceURI,'text') as SVGTextElement
  label.textContent='ABC';header.append(label);tempo.textContent='mark';tempo.style.fill='black';tempo.setAttribute('y','20');svg.append(tempo);document.body.append(header,svg)
  const matrix={a:1,b:0,c:0,d:1,e:0,f:0,inverse:()=>matrix,multiply:()=>matrix}
  const fonts=Object.getOwnPropertyDescriptor(document,'fonts'),rects=Object.getOwnPropertyDescriptor(Range.prototype,'getClientRects')
  Object.defineProperty(document,'fonts',{configurable:true,value:{}})
  Object.defineProperty(Range.prototype,'getClientRects',{configurable:true,value:()=>[new DOMRect(left,0,24,12)]})
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({measureText:()=>({actualBoundingBoxLeft:0,actualBoundingBoxRight:40,actualBoundingBoxAscent:10,actualBoundingBoxDescent:0})} as unknown as CanvasRenderingContext2D)
  Object.defineProperties(svg,{getScreenCTM:{value:()=>matrix},getCTM:{value:()=>matrix}})
  Object.defineProperties(tempo,{getCTM:{value:()=>matrix},getStartPositionOfChar:{value:()=>({x:30,y:Number(tempo.getAttribute('y'))})}})
  vi.spyOn(header,'getBoundingClientRect').mockReturnValue(new DOMRect(0,0,750,40))
  try {
    const offset=measurePrintHeaderInset(svg,header,0)
    expect(offset).toBe(expected)
    tempo.setAttribute('y',String(20+offset))
    expect(measurePrintHeaderInset(svg,header,offset)).toBe(offset)
  } finally {
    canvas.mockRestore();header.remove();svg.remove()
    if(fonts)Object.defineProperty(document,'fonts',fonts);else Reflect.deleteProperty(document,'fonts')
    if(rects)Object.defineProperty(Range.prototype,'getClientRects',rects);else Reflect.deleteProperty(Range.prototype,'getClientRects')
  }
})


it('uses the maximum overlapping line constraint and settles without summing independent boxes',()=>{
 const headings=[{x:100,y:0,width:100,height:15},{x:100,y:20,width:100,height:15}],ink=[{x:110,y:12,width:10,height:10}],before=structuredClone(headings)
 expect(resolvePrintHeaderInkInset(headings,ink,1,0)).toBe(31)
 expect(resolvePrintHeaderInkInset(headings,[{...ink[0],y:43}],1,31)).toBe(31)
 expect(headings).toEqual(before)
})
it('ignores disjoint, empty or unavailable text envelopes while retaining a valid inset',()=>{
 const ink=[{x:30,y:10,width:40,height:10}]
 expect(resolvePrintHeaderInkInset([{x:350,y:0,width:24,height:12}],ink,1,3)).toBe(3)
 expect(resolvePrintHeaderInkInset([{x:30,y:0,width:0,height:12}],ink,1,3)).toBe(3)
 expect(resolvePrintHeaderInkInset([],ink,1,3)).toBe(3)
 expect(resolvePrintHeaderInkInset([{x:30,y:0,width:24,height:12}],ink,0,3)).toBe(3)
})
