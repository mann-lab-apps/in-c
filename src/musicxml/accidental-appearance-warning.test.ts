import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createAccidentalAppearanceFixture, createRepeatedAccidentalAppearanceFixture, type AccidentalAppearanceStyle } from '../testing/accidental-appearance-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented accidental appearance '
const styles = ['parentheses', 'bracket', 'editorial', 'cautionary', 'cue-size', 'grace-cue-size', 'large-size', 'combined'] as const

it.each(styles)('reports %s explicit accidental presentation once without rewriting pitch or playback', style => {
  const options = { style, partCount: 2, targetPart: 2, targetMeasure: 2 }
  const result = parseMusicXmlWithReport(createAccidentalAppearanceFixture(options))
  const control = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ ...options, style: 'plain' }))
  const warnings = result.report.warnings.filter(w => w.message.startsWith(prefix))
  expect(warnings).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: 1,
    path: 'part[2].measure[2].note[1].accidental', message: expect.stringContaining('"value":"natural"') })])
  if (style.endsWith('-size')) expect(warnings[0].message).toContain(`"size":"${style.replace('-size', '')}"`)
  else if (style === 'combined') for (const key of ['parentheses','bracket','editorial','cautionary']) expect(warnings[0].message).toContain(`"${key}":"yes"`)
  else expect(warnings[0].message).toContain(`"${style}":"yes"`)
  expect(result.score).toEqual(control.score)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(control.score)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  const copy = serializeMusicXml(result.score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
  expect(result.report.warnings.some(w => w.message.startsWith('Unrepresented cue note kind '))).toBe(false)
})

it.each(['chord','grace'] as const)('retains the original %s member source location', owner => {
  const { score, report } = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ owner }))
  const index = owner === 'chord' ? 2 : 1
  expect(report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([expect.objectContaining({ eventIndex: index, path: `part[1].measure[1].note[${index}].accidental` })])
  expect(score).toEqual(parseMusicXmlWithReport(createAccidentalAppearanceFixture({ owner, style:'plain' })).score)
})

it.each(['plain','explicit-defaults','none'] as AccidentalAppearanceStyle[])('keeps %s accidental controls quiet', style => {
  expect(parseMusicXmlWithReport(createAccidentalAppearanceFixture({ style })).report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([])
})

it('keeps visibility and accidental appearance losses distinct', () => {
  const warnings = parseMusicXmlWithReport(createAccidentalAppearanceFixture({ printObject:'no' })).report.warnings
  expect(warnings.filter(w => w.message.startsWith('Unrepresented note visibility '))).toHaveLength(1)
  expect(warnings.filter(w => w.message.startsWith(prefix))).toHaveLength(1)
})

it('retains all repeated and mixed original source rows', () => {
  const xml = createRepeatedAccidentalAppearanceFixture()
  const warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(w => w.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(w => w.path)).size).toBe(30)
  const mixed = parseMusicXmlWithReport(xml.replace('</accidental>', '</accidental><notehead>none</notehead>')).report.warnings
  expect(mixed).toHaveLength(31)
  expect(mixed.filter(w => w.message.startsWith('Explicit notehead appearance '))).toHaveLength(1)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
const xsdCases = [...styles.map(style => ({ id:style, xml:createAccidentalAppearanceFixture({ style }) })),
  ...(['chord','grace'] as const).map(owner => ({ id:owner, xml:createAccidentalAppearanceFixture({ owner }) })),
  { id:'defaults', xml:createAccidentalAppearanceFixture({ style:'explicit-defaults' }) },
  { id:'mixed', xml:createRepeatedAccidentalAppearanceFixture().replace('</accidental>', '</accidental><notehead>none</notehead>') }]
it.skipIf(!available).each(xsdCases)('validates $id source and copy using complete offline XSD', ({ xml }) => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-accidental-style-xsd-'))
  try {
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(directory, name + '.musicxml'); writeFileSync(file, contents)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally { rmSync(directory, { recursive:true, force:true }) }
})
