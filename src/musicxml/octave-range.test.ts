import { expect, it } from 'vitest'
import { legacySpanOrderFixture } from '../testing/legacy-span-order-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMusicXml, serializeMusicXmlWithReport } from './index'

function fixture(octave: number, kind: 'main' | 'chord' | 'grace' = 'main', shift?: '8va' | '8vb' | '15ma' | '15mb') {
  const score = legacySpanOrderFixture('hairpin', 'equal').repaired
  const event = score.parts[0].staves[0].measures[1].voices[0].events[0]
  if (event.type !== 'note') throw new Error('Typed note required')
  const pitch = { step: 'C' as const, octave }
  if (kind === 'main') event.pitch = pitch
  if (kind === 'chord') event.pitches = [event.pitch, pitch]
  if (kind === 'grace') event.graceNotes = [{ pitch, slash: true }]
  if (shift) score.octaveShifts = [{ id: 'range-shift', type: shift, startEventId: event.id, endEventId: event.id }]
  return score
}

it.each(['main', 'chord', 'grace'] as const)('rejects native-valid -1 %s without emitting nonstandard XML or mutating native', kind => {
  const score = fixture(-1, kind), native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(score)
  for (const serialize of [serializeMusicXml, serializeMusicXmlWithReport]) {
    expect(() => serialize(score)).toThrow(/MusicXML.*2.*마디.*음높이/)
    expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  }
})
it.each([[1, '15mb'], [0, '8vb'], [8, '15ma'], [9, '8va']] as const)('rejects performed octave outside 0–9 from native %s + %s', (octave, shift) => {
  const score = fixture(octave, 'main', shift), native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(score)
  expect(() => serializeMusicXml(score)).toThrow(/MusicXML.*2.*마디.*음높이/)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
it.each([[2, '15mb', 0], [1, '8vb', 0], [7, '15ma', 9], [8, '8va', 9]] as const)('keeps valid performed boundary from %s + %s at octave %s', (octave, shift, performed) => {
  const score = fixture(octave, 'main', shift), before = structuredClone(score)
  expect(serializeMusicXml(score)).toContain(`<octave>${performed}</octave>`)
  expect(score).toEqual(before)
})
it.each([0, 9])('keeps actual serialized chord and grace boundary octave %s', octave => {
  for (const kind of ['main', 'chord', 'grace'] as const) expect(serializeMusicXml(fixture(octave, kind))).toContain(`<octave>${octave}</octave>`)
})

it.each([NaN, Infinity, -Infinity, 0.5])('rejects noninteger octave %s through the raw serializer boundary', octave => {
  expect(() => serializeMusicXml(fixture(octave))).toThrow(/MusicXML.*2.*마디.*음높이/)
})
it.each(['chord', 'grace'] as const)('checks the actually shifted %s member when the main note stays representable', kind => {
  for (const [octave, shift] of [[1, '15mb'], [8, '15ma']] as const) {
    const score = fixture(octave, kind, shift), native = encodeNativeProject(createNativeProject(score))
    expect(() => serializeMusicXmlWithReport(score)).toThrow(/MusicXML.*2.*마디.*음높이/)
    expect(encodeNativeProject(createNativeProject(score))).toBe(native)
  }
})
it('validates actual chord members rather than an unused legacy primary pitch', () => {
  const score = fixture(-1), note = score.parts[0].staves[0].measures[1].voices[0].events[0]
  if (note.type !== 'note') throw new Error('Typed note required')
  note.pitches = [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }]
  expect(serializeMusicXml(score)).not.toContain('<octave>-1</octave>')
})
