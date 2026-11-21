import { expect, it } from 'vitest'
import { createNoteInstrumentFixture, type NoteInstrumentCase } from '../testing/note-instrument-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const kinds: NoteInstrumentCase[] = ['single','secondary','reordered','multiple','grace','rest','control']
it.each(kinds)('reports lost explicit note instrument references without changing the %s score', kind => {
  const { xml, baselineXml, target } = createNoteInstrumentFixture(kind)
  const { score, report } = parseMusicXmlWithReport(xml), baseline = parseMusicXmlWithReport(baselineXml)
  const partNumber = target === 'P1' ? 1 : 2
  const expected = kind === 'control' ? [] : (kind === 'multiple' ? [1,2] : [1]).map(index => ({
    code:'unsupported-notation', partNumber, measureNumber:1, eventIndex:1,
    path:`part[${partNumber}].measure[1].note[1].instrument[${index}]`,
    message:expect.stringContaining(`id="${target}-I${index}"`)
  }))
  expect(report.warnings).toEqual(expected)
  expect(score).toEqual(baseline.score)
  expect(baseline.report.warnings).toEqual([])
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(JSON.parse(JSON.stringify(score)))
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  const copy=serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(baseline.score))
  expect(copy).not.toContain('<instrument ')
  expect(parseMusicXmlWithReport(copy).report.warnings).toEqual([])
})
