import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNoteLedgerVisibilityFixture, createRepeatedNoteLedgerVisibilityFixture } from '../testing/note-ledger-visibility-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented note ledger visibility '
const cases = [
  { id: 'main', owner: 'main', value: 'quarter' },
  { id: 'chord', owner: 'chord', value: 'quarter' },
  { id: 'grace', owner: 'grace', value: 'quarter' },
  { id: 'whole', owner: 'main', value: 'whole' }
] as const

it.each(cases)('reports $id ledger suppression at its source owner without changing music', options => {
  const xml = createNoteLedgerVisibilityFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
  const { score, report } = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(xml.replaceAll(' print-leger="no"', ''))
  const warnings = report.warnings.filter(warning => warning.message.startsWith(prefix))
  const index = options.owner === 'chord' ? 2 : 1
  expect(warnings).toEqual([expect.objectContaining({
    code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: index,
    path: `part[2].measure[2].note[${index}].@print-leger`,
    message: expect.stringContaining('"printLeger":"no"')
  })])
  expect(score).toEqual(control.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(copy).not.toContain('print-leger=')
  expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
})

it.each(['main', 'chord', 'grace', 'rest'] as const)('does not invent ledger loss for default-visible %s', owner => {
  for (const printLeger of ['yes', 'omitted'] as const) {
    const { report } = parseMusicXmlWithReport(createNoteLedgerVisibilityFixture({ owner, printLeger }))
    expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
  }
})

it('ignores ledger suppression on rests and keeps one existing combined hidden-note notice', () => {
  expect(parseMusicXmlWithReport(createNoteLedgerVisibilityFixture({ owner: 'rest' })).report.warnings).toEqual([])
  const warnings = parseMusicXmlWithReport(createNoteLedgerVisibilityFixture({ printObject: 'no' })).report.warnings
  expect(warnings).toHaveLength(1)
  expect(warnings[0].message).toContain('Unrepresented note visibility {"printObject":"no","printLeger":"no"}')
})

it('recognizes omitted note visibility as visible and retains all repeated ledger source paths', () => {
  const single = parseMusicXmlWithReport(createNoteLedgerVisibilityFixture({ printObject: 'omitted' })).report.warnings
  expect(single.filter(warning => warning.message.startsWith(prefix))).toHaveLength(1)
  const warnings = parseMusicXmlWithReport(createRepeatedNoteLedgerVisibilityFixture()).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(warning => warning.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(warning => warning.path)).size).toBe(30)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available).each(cases)('validates actual $id ledger source and copy against complete offline XSD', options => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-ledger-xsd-'))
  try {
    const xml = createNoteLedgerVisibilityFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(directory, name + '.musicxml')
      writeFileSync(file, contents)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
