import { expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createCreatorMetadataFixture, creatorMetadataCases, type CreatorMetadataKind } from '../testing/creator-metadata-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const cases = Object.keys(creatorMetadataCases) as CreatorMetadataKind[]
const losses: Partial<Record<CreatorMetadataKind, number[]>> = {
  arranger: [1], lyricist: [1], poet: [1], translator: [1], untyped: [1], custom: [1],
  second: [2], mixed: [2], reversed: [1], blankFirst: [2], sameNameOtherRole: [2],
  escaped: [1], rights: [2], many: Array.from({ length: 30 }, (_, i) => i + 1),
  manyRights: Array.from({ length: 30 }, (_, i) => i + 1)
}

it.each(cases)('reports only unrepresented %s creator names/roles at their original root addresses', kind => {
  const xml = createCreatorMetadataFixture(kind)
  const result = parseMusicXmlWithReport(xml)
  const projected = parseMusicXmlWithReport(createCreatorMetadataFixture(kind, true))
  const warnings = result.report.warnings.filter(warning => warning.message.startsWith('Unrepresented creator metadata '))
  expect(warnings.map(warning => warning.path)).toEqual((losses[kind] ?? []).map(index => `identification.creator[${index}]`))
  expect(warnings.every(warning => warning.code === 'unsupported-notation' && warning.partNumber === undefined && warning.measureNumber === undefined)).toBe(true)
  expect(result.report.warnings.filter(warning => warning.message.startsWith('Unrepresented rights notice '))).toHaveLength(kind === 'rights' || kind === 'manyRights' ? 1 : 0)
  if (kind === 'escaped') expect(warnings[0].message).toContain('홍 & 김 <검증>')
  if (kind === 'sameNameOtherRole') expect(warnings[0].message).toContain('type="arranger"')
  expect(result.score).toEqual(projected.score)
  expect(serializeMusicXml(result.score)).toBe(serializeMusicXml(projected.score))
  expect(serializeMidi(result.score)).toEqual(serializeMidi(projected.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
  expect(parseMusicXmlWithReport(serializeMusicXml(result.score)).report.warnings).toEqual([])
  expect(xml).toBe(createCreatorMetadataFixture(kind))
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const xsdAvailable = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!xsdAvailable).each(cases)('keeps %s original and normalized copy valid under full offline XSD', kind => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-creator-metadata-'))
  try {
    const source = createCreatorMetadataFixture(kind)
    const copy = serializeMusicXml(parseMusicXmlWithReport(source).score)
    for (const [name, text] of [['source', source], ['copy', copy]]) {
      const file = join(dir, name + '.musicxml')
      writeFileSync(file, text)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
