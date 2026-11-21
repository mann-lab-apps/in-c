import { expect, it } from 'vitest'
import { createFormalPartNameStyleFixture, formalPartNameStyleCases, partNameDisplayCases, type FormalPartNameStyleKind } from '../testing/part-name-display-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(Object.keys(formalPartNameStyleCases) as FormalPartNameStyleKind[])('reports formal %s attributes without changing names/Native/XML/MIDI', kind => {
  const xml = createFormalPartNameStyleFixture(kind), result = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createFormalPartNameStyleFixture())
  const {field, attributes} = formalPartNameStyleCases[kind]
  expect(result.report.warnings).toEqual([expect.objectContaining({code:'unsupported-notation',partNumber:1,
    path:`part-list.score-part[1].${field}`})])
  expect(result.report.warnings[0]?.message).toContain('Unrepresented part name display ')
  expect(result.report.warnings[0]?.message).toContain(`"field":"${field}"`)
  for (const [, key, value] of attributes.matchAll(/([\w-]+)="([^"]*)"/g)) {
    expect(result.report.warnings[0]?.message).toContain(JSON.stringify(key) + ':' + JSON.stringify(value))
  }
  expect(result.score).toEqual(control.score)
  expect(result.score.parts[0]).toMatchObject({name:'Piano 1',abbreviation:'Pno. 1'})
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  expect(serializeMusicXml(result.score)).toBe(serializeMusicXml(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score)
    .toEqual(JSON.parse(JSON.stringify(control.score)))
  expect(parseMusicXmlWithReport(serializeMusicXml(result.score)).report.warnings).toEqual([])
  expect(xml).toBe(createFormalPartNameStyleFixture(kind))
})
it.each([1,2])('keeps reversed-header address and actual body owner of formal attributes for part %i', partNumber => {
  const result = parseMusicXmlWithReport(createFormalPartNameStyleFixture('namePosition',partNumber,true))
  expect(result.report.warnings).toEqual([expect.objectContaining({partNumber,
    path:`part-list.score-part[${3-partNumber}].part-name`})])
  expect(result.score).toEqual(parseMusicXmlWithReport(createFormalPartNameStyleFixture(undefined,partNumber,true)).score)
})
it('keeps an explicitly hidden empty abbreviation as a display-loss diagnostic, not a replacement name', () => {
  const xml=createFormalPartNameStyleFixture('abbreviationHidden').replace('>Pno. 1</part-abbreviation>','></part-abbreviation>')
  const result=parseMusicXmlWithReport(xml)
  const control=parseMusicXmlWithReport(createFormalPartNameStyleFixture().replace('>Pno. 1</part-abbreviation>','></part-abbreviation>'))
  expect(result.report.warnings).toEqual([expect.objectContaining({path:'part-list.score-part[1].part-abbreviation'})])
  // Preserve the pre-existing scalar reader distinction: a plain empty scalar
  // is "", while an attributed empty node has no readable scalar (undefined).
  // This diagnostic must not rewrite either value or infer a replacement label.
  expect(control.score.parts[0]?.abbreviation).toBe('')
  expect(result.score).toEqual({...control.score, parts: control.score.parts.map((part, index) =>
    index === 0 ? {...part, abbreviation: undefined} : part)})
})
it.each(['part-name','part-abbreviation'])('does not warn for the explicit default print-object=yes on %s alone', field => {
  const xml=createFormalPartNameStyleFixture().replace(`<${field}>`,`<${field} print-object="yes">`)
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
})
it('keeps plain names quiet', () => {
  expect(parseMusicXmlWithReport(createFormalPartNameStyleFixture()).report.warnings).toEqual([])
})
it('reports formal attributes and a separate display independently at their original fields', () => {
  const xml=createFormalPartNameStyleFixture('nameFont').replace('</part-name>','</part-name>'+partNameDisplayCases.nameHidden)
  const result=parseMusicXmlWithReport(xml)
  expect(result.report.warnings.map(w=>w.path)).toEqual([
    'part-list.score-part[1].part-name',
    'part-list.score-part[1].part-name-display'
  ])
})
