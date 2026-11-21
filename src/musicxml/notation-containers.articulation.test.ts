import { expect, it } from 'vitest'
import { createNotationContainerFixture as fixture } from '../testing/notation-container-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const articulation = (children: string) => `<articulations>${children}</articulations>`
const read = (groups: string[]) => parseMusicXmlWithReport(fixture(groups))
const note = (result: ReturnType<typeof read>) => result.score.parts[0].staves[0].measures[0].voices[0].events[0]

it.each([
  { groups: [articulation('<staccato/>'), articulation('<accent/><tenuto/>')], order: ['staccato', 'accent', 'tenuto'] },
  { groups: [articulation('<tenuto/><accent/>'), articulation('<staccato/><accent/>')], order: ['tenuto', 'accent', 'staccato'] },
  { groups: [articulation('<strong-accent type="up"/><staccato/>'), articulation('<strong-accent type="down"/>')], order: ['marcato', 'staccato'] }
])('retains existing supported marking order across containers: $order', ({ groups, order }) => {
  expect(note(read(groups))).toMatchObject({ type: 'note', articulations: order })
})

it('retains supported marks while diagnosing each later or earlier technical container', () => {
  const result = read(['<technical><fingering>1</fingering></technical>', articulation('<staccato/>'), '<technical><fingering>2</fingering></technical>'])
  expect(note(result)).toMatchObject({ type: 'note', articulations: ['staccato'] })
  expect(result.report.warnings.map(w => ({ message: w.message, path: w.path }))).toEqual([1, 3].map(index => ({
    message: 'technical playing instructions are not imported yet.',
    path: `part[1].measure[1].note[1].notations[${index}].technical`
  })))
})

it('diagnoses unsupported articulation and ornament in their original containers without losing staccato', () => {
  const result = read([articulation('<staccato/>'), articulation('<scoop/>'), '<ornaments><schleifer/></ornaments>'])
  expect(note(result)).toMatchObject({ articulations: ['staccato'] })
  expect(result.report.warnings.map(w => w.path)).toEqual([
    'part[1].measure[1].note[1].notations[2].articulations.scoop',
    'part[1].measure[1].note[1].notations[3].ornaments.schleifer'
  ])
})

it.each([
  { tail: '<breath-mark/>', value: 'breath' },
  { tail: '<caesura/>', value: 'caesura' },
  { tail: '<breath-mark/><caesura/>', value: 'caesura' }
])('preserves existing breath/caesura policy across containers: $value', ({ tail, value }) => {
  expect(note(read([articulation('<staccato/>'), articulation(tail)]))).toMatchObject({ articulations: ['staccato'], breathMark: value })
})

it('keeps supported music, Native and MIDI equal to the existing combined representation', () => {
  const split = read([articulation('<staccato/>'), articulation('<accent/>')])
  const combined = read([articulation('<staccato/><accent/>')])
  expect(split.score).toEqual(combined.score)
  expect(split.report.warnings).toEqual([])
  const native = encodeNativeProject(createNativeProject(split.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(combined.score)))
  expect(decodeNativeProject(native).score).toEqual(combined.score)
  expect(serializeMidi(split.score)).toEqual(serializeMidi(combined.score))
  expect(serializeMusicXml(split.score)).toBe(serializeMusicXml(combined.score))
  expect(parseMusicXmlWithReport(serializeMusicXml(split.score)).score).toEqual(combined.score)
})

it('retains the legacy single-container warning path and ordinary-mark control', () => {
  const one = read([articulation('<staccato/>')])
  expect(note(one)).toMatchObject({ articulations: ['staccato'] })
  expect(one.report.warnings).toEqual([])
  expect(read(['<technical><fingering>2</fingering></technical>']).report.warnings[0].path)
    .toBe('part[1].measure[1].note[1].notations.technical')
})
