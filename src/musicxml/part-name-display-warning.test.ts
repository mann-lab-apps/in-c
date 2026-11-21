import { expect, it } from 'vitest'
import { createPartNameDisplayFixture, createSystemPartNameDisplayFixture, partNameDisplayCases, type PartNameDisplayKind } from '../testing/part-name-display-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const kinds = Object.keys(partNameDisplayCases) as PartNameDisplayKind[]
it.each(kinds)('reports %s separate part display loss while preserving formal names/model/Native/XML/MIDI', kind => {
  const xml = createPartNameDisplayFixture(kind), result = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createPartNameDisplayFixture())
  const field = kind.startsWith('abbreviation') ? 'part-abbreviation-display' : 'part-name-display'
  const warnings = result.report.warnings.filter(w => w.message.startsWith('Unrepresented part name display '))
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 1,
    path: `part-list.score-part[1].${field}` })
  expect(warnings[0]?.message).toContain(`"field":"${field}"`)
  if (kind.includes('Hidden')) expect(warnings[0]?.message).toContain('"printObject":"no"')
  if (kind === 'nameStyled') {
    expect(warnings[0]?.message).toContain('"@_font-style":"italic"')
    expect(warnings[0]?.message).toContain('"@_font-weight":"bold"')
    expect(warnings[0]?.message).toContain('"accidentalText":["sharp"]')
  }
  expect(result.score).toEqual(control.score)
  expect(result.score.parts[0]).toMatchObject({ name: 'Piano 1', abbreviation: 'Pno. 1' })
  expect(result.score.parts[1]).toEqual(control.score.parts[1])
  expect(serializeMusicXml(result.score)).toBe(serializeMusicXml(control.score))
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(JSON.parse(JSON.stringify(result.score)))
  expect(parseMusicXmlWithReport(serializeMusicXml(result.score)).report.warnings).toEqual([])
  expect(xml).toBe(createPartNameDisplayFixture(kind))
})
it('does not add a display warning when only formal name and abbreviation exist', () => {
  expect(parseMusicXmlWithReport(createPartNameDisplayFixture()).report.warnings).toEqual([])
})
it.each([1, 2])('keeps header source address and actual body owner for part %i with reversed definitions', part => {
  const xml = createPartNameDisplayFixture('nameText', part, true)
  const result = parseMusicXmlWithReport(xml)
  expect(result.report.warnings).toEqual([expect.objectContaining({ partNumber: part,
    path: `part-list.score-part[${3 - part}].part-name-display` })])
  expect(result.score).toEqual(parseMusicXmlWithReport(createPartNameDisplayFixture(undefined, part, true)).score)
})

it.each(kinds)('reports %s system-local display loss without changing breaks/model/Native/MIDI', kind => {
  const xml = createSystemPartNameDisplayFixture(kind)
  const result = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createSystemPartNameDisplayFixture())
  const field = kind.startsWith('abbreviation') ? 'part-abbreviation-display' : 'part-name-display'
  expect(result.report.warnings).toEqual([expect.objectContaining({code: 'unsupported-notation',
    partNumber: 1, measureNumber: 10, path: `part[1].measure[10].print[1].${field}`})])
  expect(result.report.warnings[0]?.message).toContain('Unrepresented part name display ')
  expect(result.score).toEqual(control.score)
  expect(result.score.layout?.systemBreakBeforeMeasureIds).toHaveLength(1)
  expect(serializeMusicXml(result.score)).toBe(serializeMusicXml(control.score))
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)
    .toEqual(JSON.parse(JSON.stringify(control.score)))
  expect(xml).toBe(createSystemPartNameDisplayFixture(kind))
})
it.each([1, 2])('assigns a second print display to actual part %i and nonordinal measure 10', partNumber => {
  const result = parseMusicXmlWithReport(createSystemPartNameDisplayFixture('nameEmpty', partNumber, 2))
  expect(result.report.warnings).toEqual([expect.objectContaining({partNumber, measureNumber: 10,
    path: `part[${partNumber}].measure[10].print[2].part-name-display`})])
})
it('keeps plain system breaks free of display warnings', () => {
  expect(parseMusicXmlWithReport(createSystemPartNameDisplayFixture()).report.warnings).toEqual([])
})
it('reports header and system directives independently instead of applying either as formal name', () => {
  const xml = createSystemPartNameDisplayFixture('abbreviationHiddenEmpty')
    .replace('</part-name>', '</part-name>' + partNameDisplayCases.nameText)
  const result = parseMusicXmlWithReport(xml)
  expect(result.report.warnings.map(w => w.path)).toEqual([
    'part-list.score-part[1].part-name-display',
    'part[1].measure[10].print[1].part-abbreviation-display'
  ])
  expect(result.score).toEqual(parseMusicXmlWithReport(createSystemPartNameDisplayFixture()).score)
})
