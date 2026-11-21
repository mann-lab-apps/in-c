import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createCueNoteFixture, createRepeatedCueNoteFixture } from '../testing/cue-note-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { readTestMidiEvents } from '../testing/midi-events'

const prefix = 'Unrepresented cue note kind '
const cases = [
  { id: 'main', owner: 'main' }, { id: 'chord', owner: 'chord' },
  { id: 'grace', owner: 'grace' }, { id: 'rest', owner: 'rest' },
  { id: 'full-size', owner: 'main', size: 'full' }
] as const

it.each(cases)('reports $id cue loss while preserving the current projected model and MIDI', options => {
  const xml = createCueNoteFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
  const { score, report } = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(xml.replaceAll('<cue/>', ''))
  const index = options.owner === 'chord' ? 2 : 1
  const warnings = report.warnings.filter(warning => warning.message.startsWith(prefix))
  expect(warnings).toEqual([expect.objectContaining({
    code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: index,
    path: `part[2].measure[2].note[${index}].cue`, message: expect.stringContaining('"cue":true')
  })])
  expect(warnings[0].message).toContain(`"grace":${options.owner === 'grace'}`)
  expect(warnings[0].message).toContain(`"rest":${options.owner === 'rest'}`)
  expect(warnings[0].message).toContain(`"chord":${options.owner === 'chord'}`)
  if ('size' in options) expect(warnings[0].message).toContain('"typeSize":"full"')
  expect(score).toEqual(control.score)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
  expect(readTestMidiEvents(serializeMidi(score))).toEqual(readTestMidiEvents(serializeMidi(control.score)))
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(copy).not.toContain('<cue')
  expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
})

it.each([undefined, 'cue'] as const)('does not infer silent cue semantics from size=%s alone', size => {
  const { report } = parseMusicXmlWithReport(createCueNoteFixture({ cue: false, size }))
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
})

it('keeps independent visibility loss and all repeated cue source addresses', () => {
  const hidden = parseMusicXmlWithReport(createCueNoteFixture({ printObject: 'no' })).report.warnings
  expect(hidden.filter(warning => warning.message.startsWith('Unrepresented note visibility '))).toHaveLength(1)
  expect(hidden.filter(warning => warning.message.startsWith(prefix))).toHaveLength(1)
  const repeated = parseMusicXmlWithReport(createRepeatedCueNoteFixture()).report.warnings
  expect(repeated).toHaveLength(30)
  expect(repeated.every(warning => warning.message.startsWith(prefix))).toBe(true)
  expect(new Set(repeated.map(warning => warning.path)).size).toBe(30)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available).each(cases)('validates actual $id cue source and copy against complete offline XSD', options => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-cue-xsd-'))
  try {
    const xml = createCueNoteFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(directory, name + '.musicxml')
      writeFileSync(file, contents)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
