import { expect, it } from 'vitest'
import { resolveMeasuredPrintLayout, type PrintSystemBand } from './measured-print-pages'
const page={origin:0,height:773.3413059984815,headerBottom:42.796875}
const fixture=():PrintSystemBand[]=>[
  {systemIndex:0,origin:190,top:83.1560001373291,bottom:797.7359619140625},
  {systemIndex:1,origin:979.8,top:926.2218627929688,bottom:1542.199951171875},
  {systemIndex:2,origin:1769.6,top:1795.5999755859375,bottom:2332}
]
it('repairs the actual first/last ink crossings while leaving the safe middle system and source unchanged',()=>{
 const bands=fixture(),before=structuredClone(bands),actual=resolveMeasuredPrintLayout(bands,page)!
 expect(actual).toBeDefined();expect(actual.origins.get(0)).toBeCloseTo(157.64087486,6)
 expect(actual.origins.get(1)).toBe(979.8);expect(actual.origins.get(2)).toBeCloseTo(1749.623918,6)
 expect(actual.height).toBeCloseTo(2316.023918,6)
 const repainted=bands.map(b=>{const shift=actual.origins.get(b.systemIndex)!-b.origin;return{...b,origin:b.origin+shift,top:b.top+shift,bottom:b.bottom+shift}})
 for(const b of repainted)expect(Math.floor((b.top+.25)/page.height)).toBe(Math.floor((b.bottom-.25)/page.height))
 expect(repainted[0].top-page.headerBottom).toBeCloseTo(8,8)
 expect(resolveMeasuredPrintLayout(repainted,page,actual)).toBe(actual);expect(bands).toEqual(before)
})
it('does not replace normal page placement or its existing trailing reservation',()=>{
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:500}],page)).toBeUndefined()
 // A valid page edge is not a request to impose a new eight-unit margin.
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:773.3}],page)).toBeUndefined()
})
it('removes an actual wholly blank trailing page without changing safe or authored system origins',()=>{
 const bands:PrintSystemBand[]=[
  {systemIndex:0,origin:190,top:83.1560001373291,bottom:829.9860229492188},
  {systemIndex:1,origin:1044.3,top:1030.721923828125,bottom:1638.949951171875},
  {systemIndex:2,origin:1920,top:1946.0001220703125,bottom:2514.64990234375,breakBefore:true}
 ],grid={origin:0,height:869.0721649484536,headerBottom:42.796875,viewportBottom:2774.300048828125},before=structuredClone(bands)
 const actual=resolveMeasuredPrintLayout(bands,grid)!
 expect(actual).toBeDefined()
 expect(actual.origins).toEqual(new Map(bands.map(b=>[b.systemIndex,b.origin])))
 expect(actual.height).toBeGreaterThanOrEqual(bands[2].bottom+8)
 expect(Math.ceil(actual.height/grid.height)).toBe(3)
 expect(resolveMeasuredPrintLayout(bands,{...grid,viewportBottom:actual.height},actual)).toBe(actual)
 expect(bands).toEqual(before)
})
it('keeps ordinary final-page reservation and near-edge antialiasing space',()=>{
 const grid={...page,viewportBottom:700}
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:500}],grid)).toBeUndefined()
 const edge={...page,viewportBottom:900}
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:770}],edge)).toBeUndefined()
})
it('does not trim invalid oversized or overlapping manual bands even with a large viewport',()=>{
 const grid={...page,viewportBottom:4000}
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:900}],grid)).toBeUndefined()
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:300},{systemIndex:1,origin:200,top:250,bottom:800}],grid)).toBeUndefined()
})
it('trims only a vacant tail on a shifted physical page grid',()=>{
 const bands=[{systemIndex:0,origin:100,top:20,bottom:180}],grid={origin:-20,height:500,headerBottom:0,viewportBottom:750}
 const actual=resolveMeasuredPrintLayout(bands,grid)!
 expect(actual).toBeDefined();expect(actual.origins.get(0)).toBe(100)
 expect(actual.height).toBeGreaterThanOrEqual(188)
 expect(Math.ceil((actual.height-grid.origin)/grid.height)).toBe(1)
})
it.each([NaN,Infinity,-1])('does not invent a final extent from invalid measured viewport %s',viewportBottom=>{
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:500}],{...page,viewportBottom})).toBeUndefined()
})
it('preserves the original oversized/manual overlap path instead of shrinking or concealing ink',()=>{
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:900}],page)).toBeUndefined()
 expect(resolveMeasuredPrintLayout([{systemIndex:0,origin:72,top:50,bottom:300},{systemIndex:1,origin:200,top:250,bottom:800}],page)).toBeUndefined()
 expect(resolveMeasuredPrintLayout(fixture(),{...page,headerBottom:200})).toBeUndefined()
})
it('respects an explicit page break when upper ink starts above the new page',()=>{
 const actual=resolveMeasuredPrintLayout([
  {systemIndex:0,origin:72,top:50,bottom:250},
  {systemIndex:1,origin:840,top:740,bottom:1000,breakBefore:true}
 ],{origin:0,height:800,headerBottom:40})!
 expect(actual.origins.get(1)).toBe(908)
 expect(740+actual.origins.get(1)!-840).toBe(808)
})
it('accounts for a shifted physical grid rather than assuming SVG origin zero',()=>{
 const actual=resolveMeasuredPrintLayout([{systemIndex:0,origin:100,top:20,bottom:180},{systemIndex:1,origin:500,top:450,bottom:530}],{origin:-20,height:500,headerBottom:0})!
 expect(actual.origins.get(0)).toBe(100);expect(actual.origins.get(1)).toBe(442)
 expect(530+442-500).toBe(472)
})
it.each([NaN,Infinity,-1])('rejects invalid measured data %s without publishing an origin',value=>{
 const bands=fixture();bands[1].origin=value;expect(resolveMeasuredPrintLayout(bands,page)).toBeUndefined()
})
it('does not misaddress an absent system or mutate the input ordering',()=>{
 const bands=fixture();expect(resolveMeasuredPrintLayout([bands[0],bands[2]],page)).toBeUndefined()
 const reversed=[...bands].reverse(),original=[...reversed]
 expect(resolveMeasuredPrintLayout(reversed,page)?.origins).toEqual(resolveMeasuredPrintLayout(bands,page)?.origins)
 expect(reversed).toEqual(original)
})


it('removes an orphan header page caused by reserved height when real first-system ink fits',()=>{
 const bands=[
  {systemIndex:0,origin:1200,top:1036.2,bottom:1807.7359619140623},
  {systemIndex:1,origin:2208.900501447012,top:2045.1003906249998,bottom:2771.3010253906245},
  {systemIndex:2,origin:3236,top:3261.9999999999995,bottom:3798.3999023437495}
 ],grid={origin:0,height:1018.5502751375686,headerBottom:38.506002426147454},before=structuredClone(bands)
 const actual=resolveMeasuredPrintLayout(bands,grid)!
 expect(actual).toBeDefined()
 const paint=bands.map(b=>{const delta=actual.origins.get(b.systemIndex)!-b.origin;return{...b,origin:b.origin+delta,top:b.top+delta,bottom:b.bottom+delta}})
 expect(paint[0].top).toBeCloseTo(grid.headerBottom+8,5)
 expect(Math.ceil(actual.height/grid.height)).toBe(3)
 for(let i=0;i<paint.length;i++){
  expect(Math.floor((paint[i].top+.25)/grid.height)).toBe(i)
  expect(Math.floor((paint[i].bottom-.25)/grid.height)).toBe(i)
  expect(paint[i].bottom-paint[i].top).toBeCloseTo(bands[i].bottom-bands[i].top,8)
 }
 expect(resolveMeasuredPrintLayout(paint,grid,actual)).toBe(actual)
 expect(bands).toEqual(before)
 // A later authored break stays between its systems after removing the empty
 // leading reservation. A deliberate break before the first band is preserved.
 const laterBreak=resolveMeasuredPrintLayout(bands.map((b,i)=>({...b,breakBefore:i===2})),grid)!
 expect(laterBreak.origins).toEqual(actual.origins)
 expect(resolveMeasuredPrintLayout(bands.map((b,i)=>({...b,breakBefore:i===0})),grid)).toBeUndefined()
 expect(resolveMeasuredPrintLayout(bands,{...grid,headerBottom:500})).toBeUndefined()
})
