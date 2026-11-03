import { expect, it } from 'vitest'
import { createMeasure } from '../../../score-core'
import { createSystemLayout } from './system-layout'

it('repaints measured print origins and actual trailing ink instead of keeping an oversized reserved slot', () => {
  const measures = [1,2,3].map(number => createMeasure({id:`print-band-${number}`,number}))
  const source = structuredClone(measures)
  const base = {layout:{systemBreakBeforeMeasureIds:measures.slice(1).map(m=>m.id)},systemTop:190,systemHeight:789.8,pageHeight:773.3413059984815}
  const natural = createSystemLayout(measures,1019,base)
  const origins = new Map([[0,157.6408748626709],[1,979.8],[2,1749.6239179954446]])
  const options = {...base,measuredPrintLayout:{origins,height:2316.0239179954447}}
  const actual = createSystemLayout(measures,1019,options)
  expect(actual.placements.map(p=>p.y)).toEqual([...origins.values()])
  expect(actual.height).toBe(options.measuredPrintLayout.height)
  expect(actual.placements.map(p=>[p.x,p.width,p.systemIndex,p.measure.id])).toEqual(natural.placements.map(p=>[p.x,p.width,p.systemIndex,p.measure.id]))
  expect(measures).toEqual(source)
})
