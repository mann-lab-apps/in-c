import { expect, it } from 'vitest'
import { createHarmonyKindTextFixture, harmonyKindTextCases } from '../testing/harmony-kind-text-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createHarmonyDegreeFixture } from '../testing/harmony-degree-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

it.each(harmonyKindTextCases)('keeps root/kind/bass display and existing explicit-name boundaries for $id', entry => {
  const source = createHarmonyKindTextFixture(entry.id), { score, report } = parseMusicXmlWithReport(source)
  const mark = score.harmonies![0], before = structuredClone(score)
  expect(mark.text).toBe(entry.expected)
  expect(mark.kind).toBe(entry.kind)
  expect(mark.tick).toBe(0)
  expect(mark.id).toBe('P2:P2-staff-1:measure-2-harmony-1')
  if (entry.id === 'dominant-bass') {
    expect(mark.root).toEqual({ step: 'B', alter: -1 })
    expect(mark.bass).toEqual({ step: 'F', alter: 1 })
  }
  if (entry.id === 'major-seventh-bass' || entry.id === 'legacy') expect(mark.bass).toEqual({ step: 'G' })
  expect(report.warnings).toHaveLength(entry.id === 'relative' ? 1 : 0)
  const native = encodeNativeProject(createNativeProject(score))
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  const midi = serializeMidi(score)
  expect(midi).toEqual(serializeMidi(parseMusicXmlWithReport(createHarmonyDegreeFixture('control')).score))
  if (entry.id === 'relative') expect(() => serializeMusicXml(score)).toThrow('화음 구조를 MusicXML로 보존할 수 없습니다')
  else {
    const reopened = parseMusicXmlWithReport(serializeMusicXml(score)).score
    expect(reopened.harmonies).toEqual(score.harmonies)
    expect(serializeMidi(reopened)).toEqual(midi)
  }
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
