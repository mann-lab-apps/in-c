import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { workMovementCases, createWorkMovementFixture, type WorkMovementKind } from '../testing/work-movement-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const kinds = Object.keys(workMovementCases) as WorkMovementKind[]
const losses: Partial<Record<WorkMovementKind, string[]>> = {
  workNumber:['work.work-number'], movementNumber:['movement-number'], differentTitle:['movement-title'],
  all:['work.work-number','movement-number','movement-title'], blankWorkTitle:['movement-title'],
  zeroNumber:['work.work-number','movement-number'], sameNumberText:['work.work-number'],
  escaped:['work.work-number','movement-number','movement-title'], mixed:['work.work-number','movement-number','movement-title']
}
it.each(kinds)('reports the actual root-level %s loss without changing title precedence, score, native, XML or MIDI', kind => {
  const xml = createWorkMovementFixture(kind), actual = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createWorkMovementFixture(kind, true))
  const warnings = actual.report.warnings.filter(warning => warning.message.startsWith('Unrepresented work or movement metadata '))
  expect(warnings.map(warning => warning.path)).toEqual(losses[kind] ?? [])
  expect(warnings.every(warning => warning.code === 'unsupported-notation' && warning.partNumber === undefined && warning.measureNumber === undefined)).toBe(true)
  if (kind === 'escaped') expect(warnings[2].message).toContain('홍 & 김 <검증>')
  if (kind === 'mixed') {
    expect(actual.report.warnings.filter(warning => warning.message.startsWith('Unrepresented creator metadata '))).toHaveLength(1)
    expect(actual.report.warnings.filter(warning => warning.message.startsWith('Unrepresented rights notice '))).toHaveLength(1)
    expect(actual.report.warnings.filter(warning => warning.message.startsWith('Unrepresented credit content '))).toHaveLength(1)
  }
  expect(actual.score).toEqual(control.score)
  expect(serializeMusicXml(actual.score)).toBe(serializeMusicXml(control.score))
  expect(serializeMidi(actual.score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(actual.score))).score).toEqual(actual.score)
  const copy = parseMusicXmlWithReport(serializeMusicXml(actual.score))
  expect(copy.score).toEqual(actual.score); expect(copy.report.warnings).toEqual([])
  expect(xml).toBe(createWorkMovementFixture(kind))
})
const schema = resolve('src/musicxml/schema/musicxml-4.0')
const xsdAvailable = spawnSync('xmllint', ['--version'], { encoding:'utf8' }).status === 0
it.skipIf(!xsdAvailable).each(kinds)('validates %s source and normalized copy with the pinned full offline XSD', kind => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-work-movement-'))
  try {
    const source = createWorkMovementFixture(kind), copy = serializeMusicXml(parseMusicXmlWithReport(source).score)
    for (const [name, bytes] of [['source',source],['copy',copy]]) {
      const file = join(dir, name + '.musicxml'); writeFileSync(file, bytes)
      const r = spawnSync('xmllint', ['--nonet','--noout','--schema',join(schema,'musicxml.xsd'),file], { encoding:'utf8', env:{ ...process.env, XML_CATALOG_FILES:join(schema,'catalog.xml') } })
      expect(r.status, r.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive:true, force:true }) }
})
