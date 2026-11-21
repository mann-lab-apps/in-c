import { it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createMidiSourceLabelDeviceFixture, midiSourceLabelDeviceCases, type MidiSourceLabelDeviceCase } from '../testing/midi-source-label-device-fixture'
import { parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

type Expected = { part: number; measure?: number; path: string; text: string; instrument?: string; port?: string; device?: boolean }
function expected(kind: MidiSourceLabelDeviceCase): Expected[] {
  if (['metadata-only', 'definition-only', 'control'].includes(kind)) return []
  const part = kind === 'name-secondary' || kind.endsWith('direction') ? 2 : 1
  const measure = kind.endsWith('direct') || kind.endsWith('direction') ? 2 : undefined
  const prefix = kind.endsWith('direct') ? 'part[1].measure[2].sound[1]'
    : kind.endsWith('direction') ? 'part[2].measure[2].direction[1].sound'
      : `part-list.score-part[${kind.endsWith('reordered') || kind === 'name-secondary' ? 2 : 1}]`
  const facts: Expected[] = []
  if (kind.startsWith('name-') || kind === 'mixed') {
    facts.push({ part, measure, path: `${prefix}.midi-instrument[1].midi-name`, instrument: `P${part}-I1`,
      text: kind === 'name-whitespace' ? '  Studio Piano & Pads  ' : kind === 'name-empty' ? '' : kind === 'mixed' ? 'Hybrid Piano' : 'Studio Piano' })
    if (kind === 'name-multiple') facts.push({ part, path: `${prefix}.midi-instrument[2].midi-name`, instrument: 'P1-I2', text: '예비 Piano' })
  }
  if (kind.startsWith('device-') || kind === 'mixed') {
    facts.push({ part, measure, path: `${prefix}.midi-device[1]`, device: true,
      text: kind === 'device-empty' ? '' : kind === 'device-global' ? 'Device All' : kind === 'device-string' ? 'Hardware & Port' : kind === 'mixed' ? 'Hybrid Device' : 'Device A',
      instrument: kind === 'device-global' || kind === 'device-string' ? undefined : `P${part}-I1`,
      port: kind === 'device-string' ? undefined : kind === 'device-global' || kind === 'mixed' ? '16' : '1' })
    if (kind === 'device-multiple') facts.push({ part, path: `${prefix}.midi-device[2]`, device: true, instrument: 'P1-I2', text: '예비 Device' })
  }
  return facts
}

const isMetadata = (path: string) => /(?:\.midi-name|\.midi-device\[\d+\])$/.test(path)
it.each(midiSourceLabelDeviceCases)('reports %s source labels/devices without changing existing music, copies or diagnostics', kind => {
  const fixture = createMidiSourceLabelDeviceFixture(kind), a = parseMusicXmlWithReport(fixture.xml), b = parseMusicXmlWithReport(fixture.baselineXml)
  const wanted = expected(kind), actual = a.report.warnings.filter(w => isMetadata(w.path))
  expect(actual.map(w => w.path)).toEqual(wanted.map(w => w.path))
  for (const [index, fact] of wanted.entries()) {
    const warning = actual[index]!
    expect(warning).toMatchObject({ code: 'unsupported-direction', partNumber: fact.part, path: fact.path })
    if (fact.measure === undefined) expect(warning).not.toHaveProperty('measureNumber')
    else expect(warning.measureNumber).toBe(fact.measure)
    expect(warning.message).toContain(`${fact.device ? 'name' : 'value'}=${JSON.stringify(fact.text)}`)
    expect(warning.message).toContain(`instrument=${JSON.stringify(fact.instrument ?? null)}`)
    if (fact.device) expect(warning.message).toContain(`port=${JSON.stringify(fact.port ?? null)}`)
  }
  expect(a.report.warnings.filter(w => !isMetadata(w.path))).toEqual(b.report.warnings)
  expect(a.score).toEqual(b.score)
  expect(encodeNativeProject(createNativeProject(a.score))).toBe(encodeNativeProject(createNativeProject(b.score)))
  expect(serializeMidi(a.score)).toEqual(serializeMidi(b.score))
  expect(serializeMusicXml(a.score)).toBe(serializeMusicXml(b.score))
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates every source/control/copy against the full pinned MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), dir = mkdtempSync(join(tmpdir(), 'studio-midi-source-label-device-'))
  try {
    for (const kind of midiSourceLabelDeviceCases) {
      const f = createMidiSourceLabelDeviceFixture(kind)
      for (const [name, xml] of [['source', f.xml], ['control', f.baselineXml], ['copy', serializeMusicXml(parseMusicXmlWithReport(f.xml).score)]]) {
        const file = join(dir, `${kind}-${name}.musicxml`); writeFileSync(file, xml)
        const r = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', timeout: 10000, env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') } })
        expect(r.status, r.stderr).toBe(0)
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
