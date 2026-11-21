import { expect, it } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNativePartIdFixture } from '../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from './index'

const parser = new XMLParser({ ignoreAttributes: false })
const cases: [string, string, boolean][] = [
  ['ascii', 'P1', true], ['hangul', '피아노', true], ['accent', 'é-琴_1.2', true],
  ['combining-tail', 'a\u0301', true], ['digit', '1', false], ['space', 'Piano One', false],
  ['colon', 'Piano:One', false], ['quote', 'Piano"One', false], ['ampersand', 'Piano&One', false],
  ['emoji', '🎵', false], ['supplementary', '𐀀', false], ['joiner', 'a\u200Db', false],
  ['combining-head', '\u0301P1', false], ['xml-control', 'a\u0000b', false],
  ['newline-tail', 'P1\n', false], ['whitespace-head', ' P1', false],
  ['whitespace-tail', 'P1 ', false], ['tab-tail', 'P1\t', false],
  ['non-ascii-digit-tail', 'a١', true], ['underscore', '_P1', true]
]
const hasValidator = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!hasValidator).each(cases)('validates the %s transport IDs against the complete pinned XSD', (_label, id) => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-part-id-xsd-')), file = join(dir, 'score.musicxml')
  try {
    const schema = resolve('src/musicxml/schema/musicxml-4.0')
    writeFileSync(file, serializeMusicXml(createNativePartIdFixture([id])))
    const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
      encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
    })
    expect(result.status, result.stderr).toBe(0)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
it.each(cases)('exports a valid transport ID without mutating the %s Native ID', (_label, id, valid) => {
  const score = createNativePartIdFixture([id]), before = JSON.stringify(score)
  const project = createNativeProject(score); project.view = { mode: 'part', partId: id }
  const native = encodeNativeProject(project), midi = serializeMidi(score)
  const { contents, report } = serializeMusicXmlWithReport(score)
  const root = parser.parse(contents)['score-partwise'], expected = valid ? id : 'P1'
  expect(root['part-list']['score-part']['@_id']).toBe(expected)
  expect(root.part['@_id']).toBe(expected)
  expect(report.warnings).toEqual(valid ? [] : [{ code: 'converted-part-id', path: 'part[1].id', message: expect.stringContaining('Converted part identifier ') }])
  if (!valid) {
    expect(report.warnings[0].message).toContain(JSON.stringify(id))
    expect(report.warnings[0].message).toContain('output="P1"')
  }
  expect(contents).toBe(serializeMusicXml(score))
  expect(contents).toBe(serializeMusicXmlWithReport(score).contents)
  expect(JSON.stringify(score)).toBe(before)
  expect(encodeNativeProject(project)).toBe(native)
  expect(decodeNativeProject(native).view).toEqual({ mode: 'part', partId: id })
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(before))
  expect(serializeMidi(parseMusicXml(contents))).toEqual(midi)
})

it('reserves valid IDs from later parts before allocating deterministic unique transport IDs', () => {
  const score = createNativePartIdFixture(['Piano One', 'P1', 'Flute Two', 'P2', '피아노'])
  const before = JSON.stringify(score), { contents, report } = serializeMusicXmlWithReport(score)
  const root = parser.parse(contents)['score-partwise']
  expect(root['part-list']['score-part'].map((part: Record<string, string>) => part['@_id'])).toEqual(['P3', 'P1', 'P4', 'P2', '피아노'])
  expect(root.part.map((part: Record<string, string>) => part['@_id'])).toEqual(['P3', 'P1', 'P4', 'P2', '피아노'])
  expect(report.warnings.map(warning => warning.path)).toEqual(['part[1].id', 'part[3].id'])
  expect(root['part-list']['score-part'].map((part: Record<string, string>) => part['part-name'])).toEqual(score.parts.map(part => part.name))
  expect(JSON.stringify(score)).toBe(before)
  expect(serializeMidi(parseMusicXml(contents))).toEqual(serializeMidi(score))
})
