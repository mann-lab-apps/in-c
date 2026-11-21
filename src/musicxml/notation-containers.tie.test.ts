import { expect, it } from 'vitest'
import { createTieRepresentationFixture, tieRepresentationCases } from '../testing/tie-representation-fixture'
import { unattachedTieXml } from '../testing/unattached-tie-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { readTestMidiEvents } from '../testing/midi-events'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'

const split = (xml: string) => xml.replaceAll('</notations>', '</notations><notations/>')
const noteOnly = (later = false) => `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${['start', 'stop'].map(type => `<note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type>${later ? '<notations/>' : ''}<notations><tied type="${type}"/></notations></note>`).join('')}</measure></part></score-partwise>`

function equivalent(actualXml: string, controlXml: string) {
  const actual = parseMusicXmlWithReport(actualXml), control = parseMusicXmlWithReport(controlXml)
  expect(actual.score).toEqual(control.score)
  expect(actual.report.warnings).toEqual(control.report.warnings)
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  const native = encodeNativeProject(createNativeProject(actual.score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control.score)))
  expect(decodeNativeProject(native).score).toEqual(control.score)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  return actual
}

it.each([false, true])('retains the existing notation-only tie fallback with an empty container before=%s', later => {
  const xml = later ? noteOnly(true) : split(noteOnly())
  const result = equivalent(xml, noteOnly())
  const events = result.score.parts[0].staves[0].measures[0].voices[0].events
  expect(events[0]).toMatchObject({ ties: { start: true } })
  expect(events[1]).toMatchObject({ ties: { stop: true } })
  expect(readTestMidiEvents(serializeMidi(result.score)).filter(event => event.status === 144)).toHaveLength(1)
  expect(readTestMidiEvents(serializeMidi(result.score)).find(event => event.status === 128)?.tick).toBe(1920)
})

it.each(tieRepresentationCases)('keeps the existing independent sound/notation loss check for %s', kind => {
  const { xml, warnings } = createTieRepresentationFixture(kind)
  const result = equivalent(split(xml), xml)
  expect(result.report.warnings.filter(w => w.message.startsWith('Member-specific chord ties'))).toHaveLength(warnings)
})

it('does not invent partial-chord loss when equal notation channels use different group counts', () => {
  const { xml } = createTieRepresentationFixture('notation-only')
  const mixed = xml.replace(/<note\b[^>]*>[\s\S]*?<\/note>/g, note => /<chord\b/.test(note) ? note : split(note))
  expect(equivalent(mixed, xml).report.warnings).toEqual([])
})

it.each(['first', 'last', 'chord'] as const)('keeps the standalone visual tie diagnosis across containers: %s', kind => {
  const xml = split(unattachedTieXml(kind))
  expect(() => parseMusicXmlWithReport(xml)).toThrow('한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다')
})

it('keeps an ordinary untied note untied after adding empty notation containers', () => {
  const xml = noteOnly().replace(/<tied[^>]*\/>/g, '')
  const result = equivalent(split(xml), xml)
  expect(result.score.parts[0].staves[0].measures[0].voices[0].events.every(event => !('ties' in event) || !event.ties)).toBe(true)
})
