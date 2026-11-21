import { it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createMidiBankFixture, type MidiBankCase } from '../testing/midi-bank-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const cases = [
  ['initial-min', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-bank', '1'],
  ['initial-max', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-bank', '16384'],
  ['secondary', 2, undefined, 'part-list.score-part[2].midi-instrument[1].midi-bank', '128'],
  ['reordered', 1, undefined, 'part-list.score-part[2].midi-instrument[1].midi-bank', '257'],
  ['direct', 1, 2, 'part[1].measure[2].sound[1].midi-instrument[1].midi-bank', '128'],
  ['direction', 2, 2, 'part[2].measure[2].direction[1].sound.midi-instrument[1].midi-bank', '128'],
  ['with-program', 1, undefined, 'part-list.score-part[1].midi-instrument[1].midi-bank', '128'],
  ['program-only', 1, undefined, undefined, undefined],
  ['definition-only', 1, undefined, undefined, undefined],
  ['control', 1, undefined, undefined, undefined]
] as const satisfies readonly (readonly [MidiBankCase, number, number | undefined, string | undefined, string | undefined])[]

it.each(cases)('reports only explicit unpreserved bank metadata for %s', (kind, partNumber, measureNumber, path, value) => {
  const fixture = createMidiBankFixture(kind), { score, report } = parseMusicXmlWithReport(fixture.xml)
  const baseline = parseMusicXmlWithReport(fixture.baselineXml)
  const banks = report.warnings.filter(w => w.path.endsWith('.midi-bank'))
  expect(banks.map(w => w.path)).toEqual(path ? [path] : [])
  if (path) expect(banks[0]).toMatchObject({ code: 'unsupported-direction', partNumber, ...(measureNumber === undefined ? {} : { measureNumber }), path, message: expect.stringContaining(`value="${value}"`) })
  expect(report.warnings.filter(w => !w.path.endsWith('.midi-bank'))).toEqual(baseline.report.warnings)
  expect(score).toEqual(baseline.score)
  expect(encodeNativeProject(createNativeProject(score))).toBe(encodeNativeProject(createNativeProject(baseline.score)))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline.score))
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline.score))
  expect(serializeMusicXml(score)).not.toContain('<midi-bank>')
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates all bank source/control/copy fixtures against the full pinned MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), dir = mkdtempSync(join(tmpdir(), 'studio-bank-xsd-'))
  try {
    for (const [kind] of cases) {
      const fixture = createMidiBankFixture(kind)
      for (const [name, xml] of [['source', fixture.xml], ['control', fixture.baselineXml], ['copy', serializeMusicXml(parseMusicXml(fixture.xml))]]) {
        const file = join(dir, `${kind}-${name}.musicxml`); writeFileSync(file, xml)
        const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
        expect(result.status, result.stderr).toBe(0)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
