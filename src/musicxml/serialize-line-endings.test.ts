import { expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNativePartIdFixture } from '../testing/native-part-id-fixture'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXml, serializeMusicXmlWithReport } from './index'

const values = [
  { kind: 'CR', value: '앞\r뒤' },
  { kind: 'CRLF', value: '앞\r\n뒤' },
  { kind: 'LF and tab', value: '앞\n가\t뒤' },
  { kind: 'literal reference and escaped Unicode', value: '앞&#xD; <&"🎵뒤' }
]
const cases = (['title', 'composer'] as const).flatMap(field => values.map(example => ({ field, ...example })))

it.each(cases)('preserves Native $field $kind through XML without normalizing the source', ({ field, value }) => {
  const score = createNativePartIdFixture(['P1'])
  score[field] = value
  const before = JSON.stringify(score), project = createNativeProject(score)
  const native = encodeNativeProject(project), midi = serializeMidi(score)
  const { contents, report } = serializeMusicXmlWithReport(score)
  expect(parseMusicXml(contents)[field]).toBe(value)
  expect(report.warnings).toEqual([])
  expect(JSON.stringify(score)).toBe(before)
  expect(encodeNativeProject(project)).toBe(native)
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(before))
  expect(serializeMidi(parseMusicXml(contents))).toEqual(midi)
})

const validatorAvailable = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!validatorAvailable).each(cases)('preserves $field $kind with an independent XML processor and full pinned XSD', ({ field, value }) => {
  const score = createNativePartIdFixture(['P1'])
  score[field] = value
  const dir = mkdtempSync(join(tmpdir(), 'studio-line-end-xsd-'))
  try {
    const file = join(dir, 'score.musicxml'), schema = resolve('src/musicxml/schema/musicxml-4.0')
    const { contents } = serializeMusicXmlWithReport(score)
    writeFileSync(file, contents)
    const env = { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
    const validated = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', env })
    expect(validated.status, validated.stderr).toBe(0)
    const xpath = field === 'title' ? '/score-partwise/work/work-title' : '/score-partwise/identification/creator'
    // Compare both strings inside libxml2. Windows CLI text mode otherwise
    // translates literal LF bytes in the extracted value to CRLF on stdout.
    const expected = Array.from(value, char => `&#${char.codePointAt(0)};`).join('')
    const comparison = join(dir, 'comparison.xml')
    writeFileSync(comparison, contents.replace('</score-partwise>', `<expected>${expected}</expected></score-partwise>`))
    const parsed = spawnSync('xmllint', ['--nonet', '--xpath', `string(${xpath}) = string(/score-partwise/expected)`, comparison], { encoding: 'utf8', env })
    expect(parsed.status, parsed.stderr).toBe(0)
    expect(parsed.stdout.trim()).toBe('true')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
