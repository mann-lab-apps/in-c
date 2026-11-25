import { expect, it } from 'vitest'
import { createKeyImportFixture } from '../testing/key-import-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

it.each(['major', 'minor'] as const)('keeps supported %s key native/XML/MIDI semantics', kind => {
  const { score, report } = parseMusicXmlWithReport(createKeyImportFixture(kind))
  expect(report.warnings).toEqual([])
  expect(score.parts[0].staves[0].measures[0].keySignature).toEqual({ fifths: 0, mode: kind })
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  expect(serializeMidi(parseMusicXmlWithReport(serializeMusicXml(score)).score)).toEqual(serializeMidi(score))
})
it.each(['dorian', 'none'] as const)('rejects %s without silently replacing its source mode', kind => {
  expect(() => parseMusicXmlWithReport(createKeyImportFixture(kind))).toThrow(`지원하지 않는 key mode입니다: ${kind}`)
})
it('identifies a nontraditional source key as unsupported rather than inventing missing fifths', () => {
  expect(() => parseMusicXmlWithReport(createKeyImportFixture('nontraditional'))).toThrow('현재 가져오기에서 지원하지 않는 비전통 조표입니다:')
})
it('retains ordinary malformed key rejection when no nontraditional steps exist', () => {
  expect(() => parseMusicXmlWithReport(createKeyImportFixture('major').replace('<fifths>0</fifths>', ''))).toThrow('MusicXML 정수 값이 없습니다: fifths')
})

it.each(['+8', '-8'])('rejects traditional keys beyond the score range with the original value %s', fifths => {
  const xml = createKeyImportFixture('major').replace('<fifths>0</fifths>', `<fifths>${fifths}</fifths>`)
  expect(() => parseMusicXmlWithReport(xml)).toThrow(`현재 가져오기에서 지원하지 않는 조표 범위입니다: fifths=${fifths} (지원 범위: -7~7)`)
})

it.each([7, -7])('keeps the inclusive traditional key boundary %s', fifths => {
  const xml = createKeyImportFixture('major').replace('<fifths>0</fifths>', `<fifths>${fifths}</fifths>`)
  const { score, report } = parseMusicXmlWithReport(xml)
  expect(report.warnings).toEqual([])
  expect(score.parts[0].staves[0].measures[0].keySignature.fifths).toBe(fifths)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  expect(serializeMusicXml(score)).toContain(`<fifths>${fifths}</fifths>`)
})
