// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { measurePrintPageLayout, resolveMeasuredPrintLayout } from './measured-print-pages'

it('keeps complete normal systems between oversized systems independently printable without changing their relative ink', () => {
  const host = document.createElement('div')
  host.innerHTML = '<svg>'+[0,1,2,3].map(i=>`<g data-measure-id="m${i}"><path style="fill:black;stroke:none"/></g>`).join('')+'</svg>'
  document.body.append(host)
  const svg=host.querySelector('svg')!, paths=[...svg.querySelectorAll('path')]
  const rect={top:0,width:750,height:6000} as DOMRect
  host.getBoundingClientRect=svg.getBoundingClientRect=()=>rect
  Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:0,y:0,width:750,height:6000}}})
  const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
  svg.getCTM=()=>identity
  // Actual 663 production bands on A4 portrait, 100%, public target10.
  const bands=[
    {systemIndex:0,origin:180,top:125,bottom:1406.0700439453124},
    {systemIndex:1,origin:1300.18,top:1326.260051727295,bottom:2273.7901039123535},
    {systemIndex:2,origin:2528.36,top:2473.360107421875,bottom:3640.530029296875},
    {systemIndex:3,origin:4327.280787663411,top:4353.360759735107,bottom:5300.8911781311035}
  ]
  paths.forEach((p,i)=>{p.getCTM=()=>identity;p.getBBox=()=>({x:50,y:bands[i].top,width:650,height:bands[i].bottom-bands[i].top} as DOMRect)})
  const fonts=Object.getOwnPropertyDescriptor(document,'fonts')
  Object.defineProperty(document,'fonts',{configurable:true,value:{}})
  const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  const paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:8,staffSizePercent:100,systemSpacingPercent:100}
  const h=750*(297-16)/(210-16),origins=new Map(bands.map(b=>[b.systemIndex,b.origin])),owners=new Map(bands.map(b=>['m'+b.systemIndex,b.systemIndex])),breaks=new Set([1,2,3])
  try {
    const html=host.innerHTML,original=structuredClone(bands)
    expect(resolveMeasuredPrintLayout(bands,{origin:0,height:h,headerBottom:0})).toBeUndefined()
    const result=measurePrintPageLayout(svg,host,null,origins,owners,breaks,paper)
    expect(result.unknown).toBe(0);expect(result.layout).toBeDefined()
    const plan=result.layout!
    expect(plan.origins.get(0)).toBe(180)
    const moved=bands.map(b=>{const dy=plan.origins.get(b.systemIndex)!-b.origin;return{...b,origin:b.origin+dy,top:b.top+dy,bottom:b.bottom+dy}})
    expect(moved[1].top).toBeGreaterThanOrEqual(h*2)
    expect(moved[1].bottom).toBeLessThan(h*3)
    expect(moved[2].top).toBeGreaterThanOrEqual(h*3)
    expect(moved[2].bottom-moved[2].top).toBeCloseTo(bands[2].bottom-bands[2].top)
    expect(moved[3].top).toBeGreaterThanOrEqual(h*5)
    expect(moved[3].bottom).toBeLessThan(h*6)
    expect(plan.height).toBeGreaterThan(moved[3].bottom)
    expect(host.innerHTML).toBe(html);expect(bands).toEqual(original)
    paths.forEach((p,i)=>{p.getBBox=()=>({x:50,y:moved[i].top,width:650,height:moved[i].bottom-moved[i].top} as DOMRect)})
    expect(measurePrintPageLayout(svg,host,null,plan.origins,owners,breaks,paper,plan).layout).toBe(plan)
    // Existing overlapping normal/manual systems are not an oversized repair.
    const extra=document.createElementNS('http://www.w3.org/2000/svg','path')
    extra.setAttribute('data-system-index','4');extra.setAttribute('style','fill:black;stroke:none')
    extra.getCTM=()=>identity
    extra.getBBox=()=>({x:50,y:moved[3].top+40,width:650,height:100} as DOMRect)
    svg.append(extra)
    expect(measurePrintPageLayout(svg,host,null,new Map([...plan.origins,[4,moved[3].origin+40]]),owners,breaks,paper,plan).layout).toBeUndefined()
    extra.remove()
    paths[1].parentElement!.removeAttribute('data-measure-id')
    expect(measurePrintPageLayout(svg,host,null,origins,owners,breaks,paper).layout).toBeUndefined()
  } finally {
    canvas.mockRestore();host.remove()
    if(fonts)Object.defineProperty(document,'fonts',fonts)
    else Reflect.deleteProperty(document,'fonts')
  }
})
