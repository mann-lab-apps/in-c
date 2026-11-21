import { expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPizzicatoFixture, pizzicatoCases } from '../testing/pizzicato-fixture'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
const isPizzicato = (w: { message: string }) => /^Unrepresented (note|sound) pizzicato=/.test(w.message)
it.each(pizzicatoCases)('reports source plucking instructions separately from current music in %s', kind => {
  const { xml, plain, expected } = createPizzicatoFixture(kind), original = xml, baseline = parseMusicXmlWithReport(plain)
  const { score, report } = parseMusicXmlWithReport(xml), warnings = report.warnings.filter(isPizzicato)
  expect(warnings).toHaveLength(expected.length)
  for (const item of expected) expect(warnings).toContainEqual(expect.objectContaining({ code: item.scope === 'note' ? 'unsupported-notation' : 'unsupported-direction', partNumber: item.partNumber,
    measureNumber: 7, ...(item.eventIndex === undefined ? {} : { eventIndex: item.eventIndex }), path: item.path, message: expect.stringContaining(`Unrepresented ${item.scope} pizzicato="${item.value}"`) }))
  expect(report.warnings.filter(w => !isPizzicato(w))).toEqual(baseline.report.warnings)
  expect(score).toEqual(baseline.score);expect(parseMusicXml(xml)).toEqual(score)
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  const native = encodeNativeProject(createNativeProject(score))
  expect(native).toBe(encodeNativeProject(createNativeProject(baseline.score)))
  expect(decodeNativeProject(native).score).toEqual(score)
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline.score));expect(serializeMusicXml(score)).not.toContain('pizzicato=')
  expect(xml).toBe(original)
  if (kind === 'control') expect(report.warnings).toEqual([])
  if (kind === 'technical-control') expect(report.warnings.some(w => w.message === 'technical playing instructions are not imported yet.')).toBe(true)
})
it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates all pizzicato source/copy fixtures against complete pinned MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), manifest = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8'))
  for (const file of manifest.files) expect(createHash('sha256').update(readFileSync(join(schema, file.file))).digest('hex')).toBe(file.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-pizzicato-xsd-'))
  try {
    for (const kind of pizzicatoCases) for (const [mode, text] of [['source', createPizzicatoFixture(kind).xml], ['copy', serializeMusicXml(parseMusicXml(createPizzicatoFixture(kind).xml))]]) {
      const file = join(dir, `${kind}-${mode}.musicxml`);writeFileSync(file, text)
      const checked = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }, timeout: 10000 })
      expect(checked.status, checked.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true }) }
})
