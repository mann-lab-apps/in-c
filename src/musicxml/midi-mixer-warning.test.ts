import { expect, it } from 'vitest'
import { createMidiMixerFixture, midiMixerCases, type MidiMixerCase } from '../testing/midi-mixer-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const header = 'part-list.score-part[1].midi-instrument[1]'
const direct = 'part[1].measure[2].sound[1].midi-instrument[1]'
const direction = 'part[2].measure[2].direction[1].sound.midi-instrument[1]'
type Fact = { path: string; partNumber: number; measureNumber?: number; field: string; value: string }
const facts: Record<MidiMixerCase, Fact[]> = {
  'header-zero': [{ path: header, partNumber: 1, field: 'volume', value: '0' }],
  'header-pan': [{ path: header, partNumber: 1, field: 'pan', value: '-90' }],
  'header-elevation': [{ path: header, partNumber: 1, field: 'elevation', value: '90' }],
  'direct-zero': [{ path: direct, partNumber: 1, measureNumber: 2, field: 'volume', value: '0' }],
  'direction-pan-zero': [{ path: direction, partNumber: 2, measureNumber: 2, field: 'pan', value: '0' }],
  'both-combined': [header, direct].flatMap(path => ['volume', 'pan'].map(field => ({ path, partNumber: 1, ...(path === direct ? { measureNumber: 2 } : {}), field, value: field === 'volume' ? '50' : '45' }))),
  'reordered-volume': [{ path: 'part-list.score-part[2].midi-instrument[1]', partNumber: 1, field: 'volume', value: '25' }],
  control: [], 'program-control': []
}

it.each(midiMixerCases)('reports unrepresented %s mixer instructions without changing musical data or local playback', kind => {
  const { xml, baselineXml } = createMidiMixerFixture(kind), { score, report } = parseMusicXmlWithReport(xml), baseline = parseMusicXmlWithReport(baselineXml)
  const warnings = report.warnings.filter(warning => warning.message.startsWith('Unrepresented MIDI instrument mixer '))
  expect(warnings).toEqual(facts[kind].map(({ path, partNumber, measureNumber, field, value }) => ({
    code: 'unsupported-direction', partNumber, ...(measureNumber === undefined ? {} : { measureNumber }),
    path: `${path}.${field}`, message: expect.stringContaining(`field="${field}", value="${value}"`)
  })))
  if (kind === 'program-control') {
    expect(report.warnings).toHaveLength(1)
    expect(report.warnings[0].message).toContain('Explicit MIDI instrument program (71)')
  } else expect(report.warnings).toHaveLength(facts[kind].length)
  expect(baseline.report.warnings).toEqual([])
  expect(score).toEqual(baseline.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(JSON.parse(JSON.stringify(baseline.score)))
})
