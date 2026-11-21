import { expect, it } from 'vitest'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createSoundPedalFixture as fixture, type SoundPedalSource } from '../testing/sound-pedal-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

const sources: SoundPedalSource[] = ['direction', 'measure']
it.each(sources.flatMap(source => (['soft-pedal', 'sostenuto-pedal'] as const).flatMap(attribute =>
  ['yes', 'no', '37.5', '0'].map(value => ({ source, attribute, value })))))
('reports the explicit $source $attribute=$value instruction without inventing pedal playback', ({ source, attribute, value }) => {
  const { score, report } = parseMusicXmlWithReport(fixture({ [attribute]: value }, source))
  const control = parseMusicXmlWithReport(fixture({}, source)).score
  expect(report.warnings).toEqual([expect.objectContaining({ code: 'unsupported-direction', partNumber: 2, measureNumber: 7,
    path: `part[2].measure[7].${source === 'measure' ? 'sound[1]' : 'direction[1].sound'}.@${attribute}`,
    message: `Unrepresented sound pedal ${attribute} ${JSON.stringify(value)} is not retained by the current damper-only playback model. Keep the original MusicXML and compare pedal playback and re-export.` })])
  expect(score).toEqual(control)
  expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(control))
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
  expect(serializeMusicXml(score)).toEqual(serializeMusicXml(control))
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toBe(encodeNativeProject(createNativeProject(control)))
  expect(decodeNativeProject(native).score).toEqual(score)
})
it.each(sources)('keeps simultaneous unsupported pedals distinct and supported damper data intact: %s', source => {
  const { score, report } = parseMusicXmlWithReport(fixture({ 'soft-pedal': 'yes', 'sostenuto-pedal': '50', 'damper-pedal': '75' }, source))
  const control = parseMusicXmlWithReport(fixture({ 'damper-pedal': '75' }, source)).score
  expect(report.warnings.map(w => w.path)).toEqual(['soft-pedal', 'sostenuto-pedal'].map(key => `part[2].measure[7].${source === 'measure' ? 'sound[1]' : 'direction[1].sound'}.@${key}`))
  expect(score).toEqual(control)
  expect(createPlaybackTimeline(score).pedalEvents?.map(e => e.value)).toEqual([95])
  expect(serializeMidi(score)).toEqual(serializeMidi(control))
})
it.each(sources.flatMap(source => [{ source, attributes: {} }, { source, attributes: { 'damper-pedal': 'yes' } }, { source, attributes: { 'damper-pedal': '0' } }]))
('keeps the existing supported/omitted $source controls quiet', ({ source, attributes }) => {
  expect(parseMusicXmlWithReport(fixture(attributes, source)).report.warnings).toEqual([])
})
