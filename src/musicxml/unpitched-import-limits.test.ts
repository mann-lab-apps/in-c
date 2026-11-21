import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createUnpitchedFixture } from '../testing/unpitched-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'

const expected = '현재 가져오기에서 지원하지 않는 무음정 음표입니다: unpitched'
function fixture(name: string, options: Parameters<typeof createUnpitchedFixture>[0]) {
  const xml = createUnpitchedFixture(options), directory = process.env.STUDIO_UNPITCHED_QA_DIR
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, name + '.musicxml'), xml) }
  return xml
}
it.each(['main', 'grace', 'chord'] as const)('explains unsupported %s unpitched instead of claiming valid source has no pitch', owner => {
  const xml = fixture(owner, { owner })
  expect(() => parseMusicXmlWithReport(xml)).toThrow(expected)
  expect(() => parseMusicXml(xml)).toThrow(expected)
  if (owner === 'main') expect(() => parseMusicXmlWithReport(fixture('main-omitted-clef-line', { line: false }))).toThrow(expected)
})
it('does not require optional display coordinates to identify an unpitched note', () => {
  expect(() => parseMusicXmlWithReport(fixture('no-display', { display: false }))).toThrow(expected)
})
it.each(['pitched', 'rest'] as const)('keeps the existing percussion-clef %s control separate from unpitched support', kind => {
  const xml = fixture(kind, { kind }), { score } = parseMusicXmlWithReport(xml)
  expect(score.parts[0].staves[0].measures[0].clef.sign).toBe('percussion')
  const native = createNativeProject(score)
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native)
  const copy = serializeMusicXml(score)
  expect(copy).not.toContain('<unpitched')
  expect(parseMusicXml(copy).parts[0].staves[0].measures[0].voices[0].events[0].type).toBe(kind === 'pitched' ? 'note' : 'rest')
  if (process.env.STUDIO_UNPITCHED_QA_DIR) writeFileSync(join(process.env.STUDIO_UNPITCHED_QA_DIR, kind + '-copy.musicxml'), copy)
})
it('retains the ordinary malformed-source diagnostic when both pitch and unpitched are absent', () => {
  expect(() => parseMusicXmlWithReport(fixture('missing', { kind: 'missing' }))).toThrow('MusicXML 필수 요소가 없습니다: pitch')
})

it('uses the existing internal percussion line when source omits its optional clef line', () => {
  const xml = fixture('omitted-clef-line', { kind: 'rest', line: false })
  const parsed = parseMusicXmlWithReport(xml)
  expect(parsed.score).toEqual(parseMusicXmlWithReport(createUnpitchedFixture({ kind: 'rest', line: true })).score)
  expect(parsed.score.parts[0].staves[0].measures[0].clef).toEqual({ sign: 'percussion', line: 2 })
})

it('keeps an explicit percussion line and refuses a malformed explicit line', () => {
  const xml = createUnpitchedFixture({ kind: 'rest' })
  expect(parseMusicXml(xml.replace('<line>2</line>', '<line>4</line>')).parts[0].staves[0].measures[0].clef.line).toBe(4)
  expect(() => parseMusicXml(xml.replace('<line>2</line>', '<line>oops</line>'))).toThrow('MusicXML 정수 값이 올바르지 않습니다: line')
})
it.each(['G', 'F', 'C'])('does not change the existing missing-line policy for pitched %s clefs', sign => {
  const xml = createUnpitchedFixture({ kind: 'rest', line: false }).replace('<sign>percussion</sign>', `<sign>${sign}</sign>`)
  expect(() => parseMusicXml(xml)).toThrow('MusicXML 정수 값이 없습니다: line')
})

it.each(['main', 'grace', 'chord'] as const)('still identifies an unsupported %s unpitched note when graphic type is omitted', owner => {
  const source = createUnpitchedFixture({ owner })
  const offset = owner === 'chord' ? source.indexOf('<chord/>') : 0
  const type = owner === 'grace' ? '<type>eighth</type>' : '<type>whole</type>'
  const xml = source.slice(0, offset) + source.slice(offset).replace(type, '')
  expect(xml).not.toBe(source)
  const directory = process.env.STUDIO_UNPITCHED_QA_DIR
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, 'omitted-type-' + owner + '.musicxml'), xml) }
  expect(() => parseMusicXmlWithReport(xml)).toThrow(expected)
})
it('keeps the previous missing graphic-type diagnostic for an otherwise supported pitched note', () => {
  const xml = createUnpitchedFixture({ kind: 'pitched' }).replace('<type>whole</type>', '')
  expect(() => parseMusicXmlWithReport(xml)).toThrow('MusicXML 필수 값이 없습니다: type')
})

it('identifies an unpitched speaking-voice control without assuming a percussion instrument', () => {
  const xml = createUnpitchedFixture().replace('<sign>percussion</sign>', '<sign>G</sign>').replace('Snare QA', 'Speaking voice QA')
    .replace(/<score-instrument\b[^>]*>[\s\S]*?<\/score-instrument>/, '')
    .replace(/<midi-instrument\b[^>]*>[\s\S]*?<\/midi-instrument>/, '')
  expect(xml).not.toContain('<midi-unpitched>')
  const directory = process.env.STUDIO_UNPITCHED_QA_DIR
  if (directory) { mkdirSync(directory, { recursive: true }); writeFileSync(join(directory, 'speaking-voice.musicxml'), xml) }
  expect(() => parseMusicXmlWithReport(xml)).toThrow('현재 가져오기에서 지원하지 않는 무음정 음표입니다: unpitched')
})
