import { expect, it } from 'vitest'
import { createInteriorHairpinFixture } from '../../../testing/interior-hairpin-fixture'
import { countMeasureLyricLines, resolveMeasureAnnotationLanes } from './annotation-lanes'
import { hairpinCoveredMeasureIds, reserveInteriorHairpinLanes } from './hairpin-annotation-lanes'

it.each([false, true])('reserves actual interior annotation lanes without mutating source (cross=%s)', cross => {
  const { score } = createInteriorHairpinFixture(cross, false), before = structuredClone(score)
  const measures = score.parts[0].staves[0].measures
  expect(hairpinCoveredMeasureIds(score, score.hairpins![0])).toEqual(measures.map(m => m.id))
  const lanes = new Map(measures.map((m, i) => [m.id, resolveMeasureAnnotationLanes({ hasHairpin: true, hasDynamic: i === 1, lyricLineCount: countMeasureLyricLines(m), expressionTextCount: i === 1 ? 1 : 0 })]))
  const original = structuredClone(lanes), result = reserveInteriorHairpinLanes(score, lanes, () => ({ y: -17, height: 21 }))
  const middle = result.get(measures[1].id)!
  expect([...result.values()].map(l => l.hairpinYOffset)).toEqual([185.9, 185.9, 185.9])
  expect(middle.expressionTextYOffsets[0] - 17 - (185.9 + 10.9)).toBeCloseTo(8)
  expect(middle.requiredBelow).toBeGreaterThan(middle.expressionTextYOffsets[0] + 17)
  expect(lanes).toEqual(original); expect(score).toEqual(before)
})

it('leaves explicit manual offset zero/height and existing short-span lanes untouched', () => {
  const { score } = createInteriorHairpinFixture(false, true), before = structuredClone(score)
  const lanes = new Map(score.parts[0].staves[0].measures.map(m => [m.id, resolveMeasureAnnotationLanes({ hasHairpin: true })]))
  expect(reserveInteriorHairpinLanes(score, lanes, () => ({ y: -17, height: 21 }))).toEqual(lanes)
  expect(score).toEqual(before)
  delete score.hairpins![0].engraving
  score.hairpins![0].endEventId = 'interior-note-0'
  expect(reserveInteriorHairpinLanes(score, lanes, () => ({ y: -17, height: 21 }))).toEqual(lanes)
})

it.each([false, true])('reserves measured endpoint descenders for two-measure automatic spans (cross=%s)', cross => {
  const { score } = createInteriorHairpinFixture(cross, false)
  score.parts[0].staves[0].measures.pop()
  score.hairpins![0].endEventId = 'interior-note-1'
  score.dynamics![0].value = 'fff'
  const measures = score.parts[0].staves[0].measures
  const lanes = new Map(measures.map((m, i) => [m.id, resolveMeasureAnnotationLanes({ hasHairpin: true, hasDynamic: i === 1, lyricLineCount: countMeasureLyricLines(m), expressionTextCount: i === 1 ? 1 : 0 })]))
  const before = structuredClone(score), original = structuredClone(lanes)
  // Real native fff baseline-relative metrics; the transparent hit box is excluded.
  const result = reserveInteriorHairpinLanes(score, lanes, () => ({ y: -15.15625, height: 19.4921875 }))
  const endpoint = result.get(measures[1].id)!
  expect(endpoint.hairpinYOffset! - 10.9 - (endpoint.dynamicMarkYOffset! + 4.3359375)).toBeGreaterThanOrEqual(8 - 1e-8)
  expect(result.get(measures[0].id)!.hairpinYOffset).toBe(endpoint.hairpinYOffset)
  expect(endpoint.requiredBelow).toBeGreaterThan(endpoint.hairpinYOffset! + 10.9)
  expect(lanes).toEqual(original); expect(score).toEqual(before)
  score.hairpins![0].engraving = { offsetY: 0, height: 2 }
  expect(reserveInteriorHairpinLanes(score, lanes, () => ({ y: -15.15625, height: 19.4921875 }))).toEqual(lanes)
})

it('converges overlapping automatic lanes independently of span order', () => {
  const { score } = createInteriorHairpinFixture(false, false), staff = score.parts[0].staves[0]
  const extra = structuredClone(staff.measures[0]); extra.id = 'fourth'; extra.voices[0].events[0].id = 'fourth-note'; staff.measures.push(extra)
  score.hairpins!.push({ id: 'second-long', startEventId: 'interior-note-1', endEventId: 'fourth-note', type: 'diminuendo' })
  const lanes = new Map(staff.measures.map((m, i) => [m.id, { ...resolveMeasureAnnotationLanes({ hasHairpin: true }), hairpinYOffset: i === 3 ? 240 : 126 }]))
  const first = reserveInteriorHairpinLanes(score, lanes, () => undefined)
  const reversed = reserveInteriorHairpinLanes({ ...score, hairpins: [...score.hairpins!].reverse() }, lanes, () => undefined)
  expect(first).toEqual(reversed)
  expect([...first.values()].map(l => l.hairpinYOffset)).toEqual([240, 240, 240, 240])
})

it('does not extend unknown or cross-staff native endpoints into unrelated measures', () => {
  const { score } = createInteriorHairpinFixture(false, false)
  const other = structuredClone(score.parts[0]); other.id = 'other-part'; other.staves[0].id = 'other-staff'
  for (const m of other.staves[0].measures) { m.id = 'other-' + m.id; for (const v of m.voices) for (const e of v.events) e.id = 'other-' + e.id }
  score.parts.push(other)
  expect(hairpinCoveredMeasureIds(score, { ...score.hairpins![0], endEventId: 'other-interior-note-2' })).toEqual([])
  expect(hairpinCoveredMeasureIds(score, { ...score.hairpins![0], endEventId: 'missing' })).toEqual([])
})

it.each([false,true])('treats empty native engraving as automatic interior lanes (cross=%s)',cross=>{
 const {score}=createInteriorHairpinFixture(cross,false),lanes=new Map(score.parts[0].staves[0].measures.map((m,i)=>[m.id,resolveMeasureAnnotationLanes({hasHairpin:true,hasDynamic:i===1,lyricLineCount:countMeasureLyricLines(m),expressionTextCount:i===1?1:0})]))
 const automatic=reserveInteriorHairpinLanes(score,lanes,()=>({y:-17,height:21}))
 score.hairpins![0].engraving={};const before=structuredClone(score)
 expect(reserveInteriorHairpinLanes(score,lanes,()=>({y:-17,height:21}))).toEqual(automatic)
 expect(score).toEqual(before)
})
