import { expect, it } from 'vitest'
import { createNotationContainerFixture } from '../testing/notation-container-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { readTestMidiEvents } from '../testing/midi-events'

const technical = '<technical><fingering>2</fingering></technical>'
const xml = (groups: string[], rest = false) => {
  const source = createNotationContainerFixture(groups)
  return rest ? source.replace('<pitch><step>C</step><octave>4</octave></pitch>', '<rest/>') : source
}
const first = (result: ReturnType<typeof parseMusicXmlWithReport>) => result.score.parts[0].staves[0].measures[0].voices[0].events[0]

it.each([
  { rest: false, groups: ['<fermata/>', technical] },
  { rest: false, groups: [technical, '<fermata/>'] },
  { rest: true, groups: ['<fermata/>', technical] },
  { rest: true, groups: [technical, '<fermata/>'] }
])('preserves the existing fermata flag and performed clock (rest=$rest, $groups)', ({ rest, groups }) => {
  const actual = parseMusicXmlWithReport(xml(groups, rest))
  const control = parseMusicXmlWithReport(xml(['<fermata/>'], rest))
  expect(first(actual).fermata).toBe(true)
  expect(first(actual).duration).toEqual({ value: 'whole', dots: 0 })
  expect(actual.score).toEqual(control.score)
  expect(createPlaybackTimeline(actual.score)).toEqual(createPlaybackTimeline(control.score))
  expect(createPlaybackTimeline(actual.score).totalBeats).toBe(6)
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  if (!rest) expect(readTestMidiEvents(serializeMidi(actual.score)).find(event => event.status === 128)?.tick).toBe(2880)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  expect(first(parseMusicXmlWithReport(serializeMusicXml(actual.score))).fermata).toBe(true)
  expect(actual.report.warnings).toHaveLength(1)
  expect(actual.report.warnings[0].path).toBe(`part[1].measure[1].note[1].notations[${groups.indexOf(technical) + 1}].technical`)
})

it('retains a single existing Boolean hold for repeated fermata containers rather than multiplying it', () => {
  const actual = parseMusicXmlWithReport(xml(['<fermata/>', '<fermata/>']))
  expect(first(actual).fermata).toBe(true)
  expect(createPlaybackTimeline(actual.score).totalBeats).toBe(6)
  expect(readTestMidiEvents(serializeMidi(actual.score)).find(event => event.status === 128)?.tick).toBe(2880)
})

it.each([{ groups: [] }, { groups: ['<articulations><staccato/></articulations>', technical] }, { groups: ['', technical] }])('keeps an absent fermata undefined with no added hold: $groups', ({ groups }) => {
  const actual = parseMusicXmlWithReport(xml(groups))
  expect(first(actual).fermata).toBeUndefined()
  expect(createPlaybackTimeline(actual.score).totalBeats).toBe(4)
  expect(readTestMidiEvents(serializeMidi(actual.score)).find(event => event.status === 128)?.tick).toBe(1920)
})
