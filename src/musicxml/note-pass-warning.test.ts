import { expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createNotePassFixture, notePassCases } from '../testing/note-pass-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { readTestMidiEvents } from '../testing/midi-events'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

it.each(notePassCases)('diagnoses discarded general note pass conditions in %s without changing current music', kind => {
  const { xml, plain, condition, owner, eventIndex } = createNotePassFixture(kind), original = xml
  const baseline = parseMusicXml(plain), { score, report } = parseMusicXmlWithReport(xml)
  const warnings = report.warnings.filter(w => w.message.startsWith('Pass-specific note '))
  expect(warnings).toHaveLength(condition === undefined ? 0 : 1)
  if (condition !== undefined) expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: owner, measureNumber: 7, eventIndex,
    path: `part[${owner}].measure[7].note[${eventIndex}].@time-only`, message: expect.stringContaining(`time-only="${condition}"`) })
  expect(score).toEqual(baseline)
  expect(encodeNativeProject(createNativeProject(score))).toBe(encodeNativeProject(createNativeProject(baseline)))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  expect(serializeMidi(score)).toEqual(serializeMidi(baseline))
  expect(serializeMusicXml(score)).toBe(serializeMusicXml(baseline))
  expect(serializeMusicXml(score)).not.toContain('time-only=')
  expect(xml).toBe(original)
  const ties = report.warnings.filter(w => w.message.startsWith('Pass-specific tie '))
  expect(ties).toEqual(parseMusicXmlWithReport(plain).report.warnings.filter(w => w.message.startsWith('Pass-specific tie ')))
  expect(ties).toHaveLength(kind === 'tie-and-note' ? 2 : 0)
  if (kind === 'control') expect(report.warnings).toEqual([])
})

it('keeps the existing unconditional MIDI explicit instead of pretending that the second-pass note was implemented', () => {
  const { xml } = createNotePassFixture('second-pass'), { score, report } = parseMusicXmlWithReport(xml)
  expect(report.warnings.some(w => w.message.startsWith('Pass-specific note '))).toBe(true)
  const bytes = serializeMidi(score), events = readTestMidiEvents(bytes)
  expect(events.filter(e => e.track === 1 && e.status >> 4 === 9 && e.data[1] > 0).map(e => [e.tick, e.data[0]])).toEqual([[0, 60], [960, 62], [1920, 60], [2880, 62]])
})

it.skipIf(spawnSync('xmllint', ['--version']).status !== 0)('validates every source and current copy against pinned complete MusicXML XSD', () => {
  const schema = resolve('src/musicxml/schema/musicxml-4.0'), source = JSON.parse(readFileSync(join(schema, 'SOURCE.json'), 'utf8'))
  for (const f of source.files) expect(createHash('sha256').update(readFileSync(join(schema, f.file))).digest('hex')).toBe(f.sha256)
  const dir = mkdtempSync(join(tmpdir(), 'studio-note-pass-xsd-'))
  try {
    for (const kind of notePassCases) for (const [mode, text] of [['source', createNotePassFixture(kind).xml], ['copy', serializeMusicXml(parseMusicXml(createNotePassFixture(kind).xml))]]) {
      const file = join(dir, `${kind}-${mode}.musicxml`); writeFileSync(file, text)
      const checked = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], { encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }, timeout: 10000 })
      expect(checked.status, checked.stderr).toBe(0)
    }
  } finally { rmSync(dir, { recursive: true }) }
})
