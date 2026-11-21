import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { additionalNotationCases, createAdditionalNotationFixture } from '../testing/additional-notation-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const kinds = ['accidental', 'other-text', 'other-glyph', 'empty-glyph', 'repeated', 'containers'] as const
it.each(kinds)('reports each unsupported direct mark in $0 without changing supported music', kind => {
  const f = createAdditionalNotationFixture(kind), parsed = parseMusicXmlWithReport(f.xml), control = parseMusicXmlWithReport(f.controlXml)
  const warnings = parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented additional notation '))
  expect(warnings).toHaveLength(kind === 'repeated' || kind === 'containers' ? 2 : 1)
  expect(warnings.every(w => w.code === 'unsupported-notation' && w.partNumber === 1 && w.measureNumber === 1 && w.eventIndex === 1)).toBe(true)
  const paths = kind === 'containers' ? ['notations[1].other-notation[1]', 'notations[2].accidental-mark[1]']
    : kind === 'repeated' ? ['notations[1].accidental-mark[1]', 'notations[1].accidental-mark[2]']
      : [kind === 'accidental' ? 'notations[1].accidental-mark[1]' : 'notations[1].other-notation[1]']
  expect(warnings.map(w => w.path)).toEqual(paths.map(p => 'part[1].measure[1].note[1].' + p))
  expect(parsed.score).toEqual(control.score)
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(control.score))
  const native = decodeNativeProject(encodeNativeProject(createNativeProject(parsed.score)))
  expect(native.score).toEqual(parsed.score)
  const copy = serializeMusicXml(parsed.score)
  expect(copy).not.toMatch(/<(?:accidental-mark|other-notation)(?:\s|>)/u)
  expect(parseMusicXmlWithReport(copy).score).toEqual(parsed.score)
})
it.each(['control', 'supported-control', 'ornament-control'] as const)('does not invent a new direct-mark warning for %s', kind => {
  const { xml } = createAdditionalNotationFixture(kind), warnings = parseMusicXmlWithReport(xml).report.warnings
  expect(warnings.filter(w => w.message.startsWith('Unrepresented additional notation '))).toEqual([])
  if (kind === 'ornament-control') expect(warnings).toEqual([expect.objectContaining({ path: 'part[1].measure[1].note[1].notations.ornaments.accidental-mark', message: 'accidental-mark ornament is not imported yet.' })])
  else expect(warnings).toEqual([])
})
const schema = resolve('src/musicxml/schema/musicxml-4.0'), available = spawnSync('xmllint', ['--version']).status === 0
it.skipIf(!available).each(additionalNotationCases)('validates %s source and control using pinned offline full XSD', kind => {
  const pin = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8')) as { files: { file: string; sha256: string }[] }
  for (const f of pin.files) expect(createHash('sha256').update(readFileSync(join(schema, f.file))).digest('hex')).toBe(f.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-additional-notation-xsd-'))
  try { for (const [name, xml] of Object.entries(createAdditionalNotationFixture(kind)).filter(([key]) => key.endsWith('Xml') || key === 'xml')) {
    const file = join(dir, name + '.musicxml'); writeFileSync(file, xml)
    const r = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
    expect(r.status, r.stderr).toBe(0)
  } } finally { rmSync(dir, { recursive: true, force: true }) }
})
