import { expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNotePerformanceFixture, notePerformanceCases } from '../testing/note-performance-fixture'

it.each(notePerformanceCases)('diagnoses discarded performance time offsets without changing notation for %s', kind => {
  const { xml, plain, attrs, owner, eventIndex } = createNotePerformanceFixture(kind), baseline = parseMusicXml(plain)
  const { score, report } = parseMusicXmlWithReport(xml), affected = Object.entries(attrs).filter(([, value]) => Number(value) !== 0)
  const warnings = report.warnings.filter(w => w.message.startsWith('Unrepresented note performance '))
  expect(warnings).toHaveLength(affected.length)
  for (const [attr, value] of affected) expect(warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-notation', partNumber: owner, measureNumber: 7, eventIndex,
    path: `part[${owner}].measure[7].note[${eventIndex}].@${attr}`, message: expect.stringContaining(`${attr}="${value}"`) }))
  expect(score).toEqual(baseline)
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline))
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline))
  expect(serializeMusicXml(score)).not.toMatch(/ (attack|release)=/)
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toBe(encodeNativeProject(createNativeProject(baseline)))
  expect(decodeNativeProject(native).score).toEqual(baseline)
  if (!affected.length) expect(report.warnings).toEqual([])
})
