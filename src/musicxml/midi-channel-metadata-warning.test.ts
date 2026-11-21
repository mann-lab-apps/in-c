import { it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createMidiChannelMetadataFixture, type MidiChannelMetadataCase } from '../testing/midi-channel-metadata-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { readTestMidiEvents } from '../testing/midi-events'

const cases = [
  ['header-first', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-channel', '1'],
  ['header-last', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-channel', '16'],
  ['header-percussion', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-channel', '10'],
  ['secondary', 2, undefined, 'part-list.score-part[2].midi-instrument[1].midi-channel', '16'],
  ['reordered', 1, undefined, 'part-list.score-part[2].midi-instrument[1].midi-channel', '7'],
  ['direct', 1, 2, 'part[1].measure[2].sound[1].midi-instrument[1].midi-channel', '16'],
  ['direction', 2, 2, 'part[2].measure[2].direction[1].sound.midi-instrument[1].midi-channel', '16'],
  ['mixed', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-channel', '16'],
  ['program-only', 1, undefined, undefined, undefined],
  ['bank-only', 1, undefined, undefined, undefined],
  ['definition-only', 1, undefined, undefined, undefined],
  ['control', 1, undefined, undefined, undefined]
] as const satisfies readonly (readonly [MidiChannelMetadataCase, number, number | undefined, string | undefined, string | undefined])[]

it.each(cases)('reports only unpreserved source channel metadata for %s', (kind, partNumber, measureNumber, path, value) => {
  const fixture = createMidiChannelMetadataFixture(kind), { score, report } = parseMusicXmlWithReport(fixture.xml), baseline = parseMusicXmlWithReport(fixture.baselineXml)
  const channels = report.warnings.filter(w => w.path.endsWith('.midi-channel'))
  expect(channels.map(w => w.path)).toEqual(path ? [path] : [])
  if (path) expect(channels[0]).toMatchObject({ code: 'unsupported-direction', partNumber, ...(measureNumber === undefined ? {} : { measureNumber }), path, message: expect.stringContaining(`value="${value}"`) })
  expect(report.warnings.filter(w => !w.path.endsWith('.midi-channel'))).toEqual(baseline.report.warnings)
  expect(score).toEqual(baseline.score)
  expect(encodeNativeProject(createNativeProject(score))).toBe(encodeNativeProject(createNativeProject(baseline.score)))
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  expect(readTestMidiEvents(serializeMidi(score)).filter(e => e.status >> 4 === 9).map(e => e.status & 15)).toEqual(readTestMidiEvents(serializeMidi(baseline.score)).filter(e => e.status >> 4 === 9).map(e => e.status & 15))
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline.score))
  expect(serializeMusicXml(score)).not.toContain('<midi-channel>')
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates channel source/control/copy fixtures against the full pinned MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), dir = mkdtempSync(join(tmpdir(), 'studio-channel-xsd-'))
  try {
    for (const [kind] of cases) {
      const fixture = createMidiChannelMetadataFixture(kind)
      for (const [name, xml] of [['source', fixture.xml], ['control', fixture.baselineXml], ['copy', serializeMusicXml(parseMusicXml(fixture.xml))]]) {
        const file = join(dir, `${kind}-${name}.musicxml`); writeFileSync(file, xml)
        const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
        expect(result.status, result.stderr).toBe(0)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
