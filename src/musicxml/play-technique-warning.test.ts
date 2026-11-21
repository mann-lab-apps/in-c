import { expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createPlayTechniqueFixture, playTechniqueCases } from '../testing/play-technique-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(playTechniqueCases)('reports %s source playback technique loss while preserving supported music', kind => {
  const fixture = createPlayTechniqueFixture(kind)
  const parsed = parseMusicXmlWithReport(fixture.xml), baseline = parseMusicXmlWithReport(fixture.baselineXml)
  const warnings = parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented playback technique '))
  const control = kind === 'empty' || kind === 'control'
  const note = kind.startsWith('note-') || kind === 'mixed'
  const part = kind === 'direction' ? 2 : 1
  const prefix = note ? 'part[1].measure[1].note[1]' : kind === 'direction'
    ? 'part[2].measure[1].direction[1].sound' : 'part[1].measure[1].sound[1]'
  expect(warnings.map(w => w.path)).toEqual(control ? [] : [prefix + '.play[1]', ...(kind === 'multiple' ? [prefix + '.play[2]'] : [])])
  for (const warning of warnings) {
    expect(warning).toMatchObject({ code: note ? 'unsupported-notation' : 'unsupported-direction', partNumber: part, measureNumber: 1 })
    expect(warning.message).toContain(`owner="${note ? 'note' : 'sound'}"`)
    expect(warning.message).toContain(`instrument="P${part}-I1"`)
    expect(warning.message).toContain('source=')
    if (note) expect(warning.eventIndex).toBe(1)
    else expect(warning).not.toHaveProperty('eventIndex')
  }
  if (kind === 'mixed') for (const token of ['on', 'off', 'ɑ', 'medium-low', 'vibrato', 'slow']) expect(warnings[0].message).toContain(token)
  if (kind === 'note-ipa') expect(warnings[0].message).toContain('ɑ ɹ')
  if (kind === 'note-other') expect(warnings[0].message).toContain('천천히')
  expect(parsed.report.warnings.filter(w => !w.message.startsWith('Unrepresented playback technique '))).toEqual(baseline.report.warnings)
  expect(parsed.score).toEqual(baseline.score)
  expect(encodeNativeProject(createNativeProject(parsed.score))).toBe(encodeNativeProject(createNativeProject(baseline.score)))
  expect(serializeMidi(parsed.score)).toEqual(serializeMidi(baseline.score))
  const copy = serializeMusicXml(parsed.score)
  expect(copy).toBe(serializeMusicXml(baseline.score))
  expect(copy).not.toMatch(/<play(?:\s|>)/)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates every source, control and copy with the pinned offline full XSD', () => {
  const pin = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8')) as { files: { file: string; sha256: string }[] }
  for (const file of pin.files) expect(createHash('sha256').update(readFileSync(join(schema, file.file))).digest('hex')).toBe(file.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-play-technique-'))
  try {
    for (const kind of playTechniqueCases) {
      const fixture = createPlayTechniqueFixture(kind)
      for (const [name, xml] of [['source', fixture.xml], ['control', fixture.baselineXml], ['copy', serializeMusicXml(parseMusicXmlWithReport(fixture.xml).score)]]) {
        const file = join(dir, kind + '-' + name + '.musicxml'); writeFileSync(file, xml)
        const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
        expect(result.status, result.stderr).toBe(0)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
