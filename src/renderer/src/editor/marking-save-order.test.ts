import { expect,it } from 'vitest'
import { orderMeasureMarkingSignatures as order } from './marking-save-order'
it('canonicalizes different part/staff/measure/tick anchors numerically without mutating source',()=>{
  const rows=[{measure:'1:0:0',text:'Other part'}, {measure:'0:0:10',text:'Ten'},
    {measure:'0:0:2',tick:20,text:'Later tick'}, {measure:'0:0:2',tick:0,text:'First'},
    {measure:'0:0:2',tick:0,text:'Second'}]
  const before=structuredClone(rows)
  expect(order(rows).map(x=>x.text)).toEqual(['First','Second','Later tick','Ten','Other part'])
  expect(rows).toEqual(before)
})
it('keeps text, owner, tick, counts and same-anchor order significant',()=>{
  const rows=[{measure:'0:0:0',tick:0,text:'A'}, {measure:'0:0:0',tick:0,text:'B'}]
  expect(order(rows)).not.toEqual(order(rows.slice().reverse()))
  expect(order(rows)).not.toEqual(order([rows[0]]))
  expect(order(rows)).not.toEqual(order([rows[0],{...rows[1],text:'Changed'}]))
  expect(order(rows)).not.toEqual(order([rows[0],{...rows[1],measure:'1:0:0'}]))
  expect(order(rows)).not.toEqual(order([rows[0],{...rows[1],tick:10}]))
})
