// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { measurePrintPageLayout } from './measured-print-pages'

it('maps actual ink through a negative viewBox to the physical grid and refuses unowned paint',()=>{
 const host=document.createElement('div');host.innerHTML='<svg viewBox="0 -20 190 600"><g data-measure-id="m"><path style="fill:black;stroke:none"/></g><rect opacity="0"/></svg>';document.body.append(host)
 const svg=host.querySelector('svg')!,path=host.querySelector('path')!,hit=host.querySelector('rect')!
 const rect={top:0,width:190,height:600} as DOMRect;host.getBoundingClientRect=svg.getBoundingClientRect=()=>rect
 Object.defineProperty(svg,'viewBox',{value:{baseVal:{x:0,y:-20,width:190,height:600}}})
 const identity={a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this},multiply(){return this}} as unknown as DOMMatrix
 svg.getCTM=path.getCTM=hit.getCTM=()=>identity
 path.getBBox=()=>({x:10,y:250,width:160,height:40} as DOMRect)
 hit.getBBox=()=>{throw Error('Transparent hit geometry is not print ink')}
 const fonts=Object.getOwnPropertyDescriptor(document,'fonts');Object.defineProperty(document,'fonts',{configurable:true,value:{}})
 const canvas=vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({} as CanvasRenderingContext2D)
 const paper={pageSize:'a4' as const,orientation:'portrait' as const,pageMarginMm:10,staffSizePercent:100,systemSpacingPercent:100}
 try{
  const before=host.innerHTML,result=measurePrintPageLayout(svg,host,null,new Map([[0,230]]),new Map([['m',0]]),new Set(),paper)
  expect(result.unknown).toBe(0);expect(result.layout?.origins.get(0)).toBe(189)
  expect(host.innerHTML).toBe(before)
  path.parentElement!.removeAttribute('data-measure-id')
  const incomplete=measurePrintPageLayout(svg,host,null,new Map([[0,230]]),new Map([['m',0]]),new Set(),paper)
  expect(incomplete.layout).toBeUndefined();expect(incomplete.unknown).toBeGreaterThan(0)
 }finally{canvas.mockRestore();host.remove();if(fonts)Object.defineProperty(document,'fonts',fonts);else Reflect.deleteProperty(document,'fonts')}
})
