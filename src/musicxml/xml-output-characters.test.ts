import { expect, it } from 'vitest'
import { createNativePartIdFixture } from '../testing/native-part-id-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMusicXml, serializeMusicXmlWithReport } from './index'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each([0, 1, 11, 12, 31, 0xD800, 0xDC00, 0xFFFE, 0xFFFF])('rejects XML-inexpressible title U+%s while keeping Native and MIDI intact', code => {
  const score = createNativePartIdFixture(['P1'])
  score.title = `앞${String.fromCharCode(code)}뒤`
  const before = JSON.stringify(score), project = createNativeProject(score)
  const native = encodeNativeProject(project), midi = serializeMidi(score)
  expect(() => serializeMusicXml(score)).toThrow(/MusicXML로 표현할 수 없는 문자/)
  expect(() => serializeMusicXmlWithReport(score)).toThrow(/U\+[0-9A-F]{4}/)
  expect(JSON.stringify(score)).toBe(before)
  expect(encodeNativeProject(project)).toBe(native)
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(before))
  expect(serializeMidi(score)).toEqual(midi)
})

it.each(['composer', 'partName', 'partAbbreviation', 'staffText', 'lyric'] as const)('checks actual serialized %s text, not just the title', field => {
  const score = createNativePartIdFixture(['P1']), bad = '앞\u0000뒤'
  const measure = score.parts[0]!.staves[0]!.measures[0]!
  if (field === 'composer') score.composer = bad
  else if (field === 'partName') score.parts[0]!.name = bad
  else if (field === 'partAbbreviation') score.parts[0]!.abbreviation = bad
  else if (field === 'staffText') score.staffTexts = [{ id: 'text-1', measureId: measure.id, text: bad }]
  else {
    const event = measure.voices[0]!.events[0]!
    if (event.type !== 'note') throw new Error('Expected generated note')
    event.lyrics = [{ number: 1, text: bad, syllabic: 'single' }]
  }
  expect(() => serializeMusicXml(score)).toThrow(/MusicXML로 표현할 수 없는 문자/)
})

it.each([9, 10, 13, 32, 0x7F, 0x85, 0xFDD0, 0xFFFD, 0x10000, 0x10FFFF])('allows XML 1.0 character U+%s without inventing a stricter text policy', code => {
  const score = createNativePartIdFixture(['P1'])
  score.title = `앞${String.fromCodePoint(code)}뒤`
  expect(() => serializeMusicXml(score)).not.toThrow()
})

it('keeps literal references and approved XML-only ID mapping outside the text rejection policy', () => {
  const score = createNativePartIdFixture(['Piano\u0000One'])
  score.title = '원문 &#0; & < 🎵'
  const before = JSON.stringify(score), result = serializeMusicXmlWithReport(score)
  expect(result.contents).toContain('&amp;#0;')
  expect(result.report.warnings.some(w => w.code === 'converted-part-id')).toBe(true)
  expect(JSON.stringify(score)).toBe(before)
})
