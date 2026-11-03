import { expect, it } from 'vitest'
import { resolveNearNoteArticulationOffset } from './articulation-ink-placement'

const mark={x:110.54,y:56.9,width:6.2,height:6.2}
const heads=[{x:109.64,y:157,width:11.8,height:10}]
const stems=[{x:119.94,y:126.25,width:1.5,height:36.5}]
const base={mark,heads,stems,staffLines:[],obstacles:[],stemDirection:1,lane:'neutral' as const}

it('places the reproduced upward-stem mark below its head without resizing or changing inputs',()=>{
  const before=structuredClone(base),result=resolveNearNoteArticulationOffset(base)!
  expect(result.side).toBe('below')
  expect(mark.y+result.y).toBeCloseTo(175,4)
  expect(mark.x+result.x+mark.width/2).toBeCloseTo(115.54,4)
  expect(base).toEqual(before)
})
it('places neutral downward-stem marks above the head and outer voices at their actual stems',()=>{
  const above=resolveNearNoteArticulationOffset({...base,stemDirection:-1})!
  expect(above.side).toBe('above')
  expect(mark.y+above.y+mark.height).toBeCloseTo(heads[0].y-8,4)
  const upper=resolveNearNoteArticulationOffset({...base,lane:'upper'})!
  expect(mark.y+upper.y+mark.height).toBeCloseTo(stems[0].y-8,4)
  const lower=resolveNearNoteArticulationOffset({...base,lane:'lower',stemDirection:-1,stems:[{...stems[0],height:60}]})!
  expect(mark.y+lower.y).toBeCloseTo(stems[0].y+60+8,4)
})
it('uses the full chord head range and retains a stemless head-side fallback',()=>{
  const result=resolveNearNoteArticulationOffset({...base,heads:[...heads,{...heads[0],x:120,y:187}],stems:[]})!
  expect(mark.y+result.y).toBeCloseTo(205,4)
  expect(mark.x+result.x+mark.width/2).toBeCloseTo((109.64+131.8)/2,4)
})
it('moves outward into a white staff space while preserving minimum note clearance',()=>{
  const result=resolveNearNoteArticulationOffset({...base,stemDirection:-1,heads:[{...heads[0],y:126}],staffLines:[{x:0,y:112,width:300,height:1}]})!
  expect(mark.y+result.y+mark.height).toBeCloseTo(111,4)
  expect(126-(mark.y+result.y+mark.height)).toBeGreaterThanOrEqual(14.99)
})
it('clears real prior glyph ink and ignores nonoverlapping horizontal objects',()=>{
  const obstacles=[{x:112,y:175,width:8,height:7},{x:400,y:170,width:10,height:30}]
  const result=resolveNearNoteArticulationOffset({...base,obstacles})!
  expect(mark.y+result.y).toBeCloseTo(190,4)
  expect(obstacles[0]).toEqual({x:112,y:175,width:8,height:7})
})
it('does not invent positions when ink or direction is unavailable',()=>{
  expect(resolveNearNoteArticulationOffset({...base,mark:{...mark,width:0}})).toBeUndefined()
  expect(resolveNearNoteArticulationOffset({...base,heads:[]})).toBeUndefined()
  expect(resolveNearNoteArticulationOffset({...base,stemDirection:0})).toBeUndefined()
})

it('keeps staff-anchored accents below the full painted staff when the head is inside it', () => {
  const staffLines = Array.from({ length: 5 }, (_, index) => ({ x: 0, y: 111.5 + index * 10, width: 300, height: 1 }))
  const result = resolveNearNoteArticulationOffset({ ...base, anchor: 'staff', heads: [{ ...heads[0], y: 126 }], staffLines })!
  expect(result.side).toBe('below')
  expect(mark.y + result.y).toBeCloseTo(160.5, 4)
})
it('keeps staff-anchored accents above the full painted staff for downward stems', () => {
  const staffLines = Array.from({ length: 5 }, (_, index) => ({ x: 0, y: 111.5 + index * 10, width: 300, height: 1 }))
  const result = resolveNearNoteArticulationOffset({ ...base, anchor: 'staff', stemDirection: -1, heads: [{ ...heads[0], y: 138 }], staffLines })!
  expect(result.side).toBe('above')
  expect(mark.y + result.y + mark.height).toBeCloseTo(103.5, 4)
})

it('keeps the supported upward marcato above an up-stem that projects past the staff', () => {
  const staffLines = Array.from({ length: 5 }, (_, index) => ({ x: 0, y: 111.5 + index * 10, width: 300, height: 1 }))
  const result = resolveNearNoteArticulationOffset({ ...base, anchor: 'staff', fixedAbove: true, stems: [{ ...stems[0], y: 90, height: 70 }], staffLines })!
  expect(result.side).toBe('above')
  expect(mark.y + result.y + mark.height).toBeCloseTo(82, 4)
})
it('preserves the upward glyph direction on lower voices without changing the default note-side policy', () => {
  const staffLines = Array.from({ length: 5 }, (_, index) => ({ x: 0, y: 111.5 + index * 10, width: 300, height: 1 }))
  const result = resolveNearNoteArticulationOffset({ ...base, anchor: 'staff', fixedAbove: true, lane: 'lower', stemDirection: -1, staffLines })!
  expect(result.side).toBe('above')
  expect(mark.y + result.y + mark.height).toBeCloseTo(103.5, 4)
  expect(resolveNearNoteArticulationOffset({ ...base, fixedAbove: false })).toEqual(resolveNearNoteArticulationOffset(base))
})
