import { it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createMidiUnpitchedMetadataFixture, midiUnpitchedMetadataCases } from '../testing/midi-unpitched-metadata-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(midiUnpitchedMetadataCases)('reports %s source unpitched assignment without changing musical data or existing warnings', kind => {
  const f = createMidiUnpitchedMetadataFixture(kind), a = parseMusicXmlWithReport(f.xml), b = parseMusicXmlWithReport(f.baselineXml)
  const target = (path: string) => path.endsWith('.midi-unpitched')
  const actual = a.report.warnings.filter(w => target(w.path))
  const control = kind === 'definition-only' || kind === 'control'
  const prefix = kind === 'direct' ? 'part[1].measure[2].sound[1]' : kind === 'direction'
    ? 'part[2].measure[2].direction[1].sound' : `part-list.score-part[${kind === 'secondary' || kind === 'reordered' ? 2 : 1}]`
  const paths = control ? [] : [`${prefix}.midi-instrument[1].midi-unpitched`, ...(kind === 'multiple' ? [`${prefix}.midi-instrument[2].midi-unpitched`] : [])]
  expect(actual.map(w => w.path)).toEqual(paths)
  for (const [index, warning] of actual.entries()) {
    const part = kind === 'secondary' || kind === 'direction' ? 2 : 1
    expect(warning).toMatchObject({ code: 'unsupported-direction', partNumber: part, path: paths[index] })
    if (kind === 'direct' || kind === 'direction') expect(warning.measureNumber).toBe(2)
    else expect(warning).not.toHaveProperty('measureNumber')
    expect(warning.message).toContain('Unrepresented MIDI instrument unpitched ')
    expect(warning.message).toContain(`value="${index === 1 ? 128 : f.value}"`)
    expect(warning.message).toContain(`instrument="P${part}-I${index + 1}"`)
  }
  expect(a.report.warnings.filter(w => !target(w.path))).toEqual(b.report.warnings)
  expect(a.score).toEqual(b.score)
  expect(encodeNativeProject(createNativeProject(a.score))).toBe(encodeNativeProject(createNativeProject(b.score)))
  expect(serializeMidi(a.score)).toEqual(serializeMidi(b.score))
  expect(serializeMusicXml(a.score)).toBe(serializeMusicXml(b.score))
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates all source/control/copy fixtures against the pinned full XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), dir = mkdtempSync(join(tmpdir(), 'studio-midi-unpitched-metadata-'))
  try {
    for (const kind of midiUnpitchedMetadataCases) {
      const f = createMidiUnpitchedMetadataFixture(kind)
      for (const [suffix, xml] of [['source', f.xml], ['control', f.baselineXml], ['copy', serializeMusicXml(parseMusicXmlWithReport(f.xml).score)]]) {
        const file = join(dir, `${kind}-${suffix}.musicxml`); writeFileSync(file, xml)
        const r = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
        expect(r.status, r.stderr).toBe(0)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
