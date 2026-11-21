import { expect, it } from 'vitest'
import { createPedalAppearanceFixture as fixture } from '../testing/pedal-appearance-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'

it.each(['sign', 'default'] as const)('reports omitted pedal signs while preserving damper data: %s', kind => {
  const { score, report } = parseMusicXmlWithReport(fixture(kind))
  expect(report.warnings).toEqual([1, 2].map(direction => expect.objectContaining({
    code: 'unsupported-direction', partNumber: 1, measureNumber: 1,
    path: `part[1].measure[1].direction[${direction}].pedal[1]`,
    message: expect.stringMatching(/^Unrepresented pedal sign /)
  })))
  const control = parseMusicXmlWithReport(fixture('hidden')).score
  expect(score).toEqual(control)
  expect(createPlaybackTimeline(score).pedalEvents?.map(e => [e.startBeat, e.value])).toEqual([[0, 127], [2, 0]])
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toEqual(encodeNativeProject(createNativeProject(control)))
  expect(decodeNativeProject(native).score).toEqual(score)
  expect(serializeMusicXml(score)).toEqual(serializeMusicXml(control))
})

it.each(['plain', 'hidden', 'sound'] as const)('does not invent visible pedal loss for %s', kind => {
  const { score, report } = parseMusicXmlWithReport(fixture(kind))
  expect(report.warnings).toEqual([])
  expect(createPlaybackTimeline(score).pedalEvents?.map(e => [e.startBeat, e.value]) ?? []).toEqual(kind === 'plain' ? [] : [[0, 127], [2, 0]])
})

it.each(['line', 'secondary'] as const)('keeps the existing unsupported-pedal warning without double reporting: %s', kind => {
  const { report } = parseMusicXmlWithReport(fixture(kind))
  expect(report.warnings).toHaveLength(2)
  expect(report.warnings.every(w => w.message === 'Only single damper pedal start/stop/change playback is imported; other pedal types and line geometry are not represented.')).toBe(true)
})

it('addresses separate signs in one direction without overwriting their diagnostics', () => {
  const { report } = parseMusicXmlWithReport(fixture('multiple'))
  expect(report.warnings.map(w => w.path)).toEqual([1, 2].flatMap(direction => [1, 2].map(pedal => `part[1].measure[1].direction[${direction}].pedal[${pedal}]`)))
})
