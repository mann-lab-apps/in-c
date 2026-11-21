import { expect, it } from 'vitest'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const fixture = (start: string[], stop: string[]) => `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Multiple notation slur probe</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${[start, stop].map((groups, index) => `<note><pitch><step>${index ? 'D' : 'C'}</step><octave>4</octave></pitch><duration>2</duration><type>half</type>${groups.map(group => `<notations>${group}</notations>`).join('')}</note>`).join('')}</measure></part></score-partwise>`
const start = '<slur type="start" number="1"/>'
const stop = '<slur type="stop" number="1"/>'

it.each([
  { startGroups: [start, ''], stopGroups: [stop, ''] },
  { startGroups: [start, ''], stopGroups: [stop] },
  { startGroups: [start], stopGroups: [stop, ''] },
  { startGroups: ['', start], stopGroups: ['', stop] },
  { startGroups: [start], stopGroups: [stop] }
])('retains slur endpoints and file/MIDI meaning across notation containers: $startGroups / $stopGroups', ({ startGroups, stopGroups }) => {
  const actual = parseMusicXmlWithReport(fixture(startGroups, stopGroups))
  const control = parseMusicXmlWithReport(fixture([start], [stop]))
  expect(actual.report.warnings).toEqual([])
  expect(actual.score.slurs).toHaveLength(1)
  expect(actual.score.slurs![0]).toEqual({ id: 'slur-1', startEventId: 'event-1', endEventId: 'event-2', number: 1 })
  expect(actual.score).toEqual(control.score)
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  const xml = serializeMusicXml(actual.score)
  expect(xml).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(xml).score.slurs).toEqual(control.score.slurs)
})

it('keeps an absent slur absent without inventing endpoints', () => {
  expect(parseMusicXmlWithReport(fixture(['', ''], [''])).score.slurs).toBeUndefined()
})

it.each([
  { first: ['', start], last: [''], error: /slur의 종료/ },
  { first: [''], last: ['', stop], error: /slur stop에 대응/ }
])('still rejects a genuinely unmatched endpoint in a later container: $first / $last', ({ first, last, error }) => {
  expect(() => parseMusicXmlWithReport(fixture(first, last))).toThrow(error)
})
