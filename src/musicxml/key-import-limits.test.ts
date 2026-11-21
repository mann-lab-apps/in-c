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
