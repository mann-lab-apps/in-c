import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createNoteDotVisibilityFixture, createRepeatedNoteDotVisibilityFixture } from '../testing/note-dot-visibility-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented note dot visibility '
const owners = ['main', 'chord', 'rest'] as const
it.each(owners)('reports %s dot suppression without changing the dotted rhythm or projected native score', owner => {
  const source = createNoteDotVisibilityFixture({ owner, partCount: 2, targetPart: 2, targetMeasure: 2 })
  const { score, report } = parseMusicXmlWithReport(source)
  const control = parseMusicXmlWithReport(source.replaceAll(' print-dot="no"', ''))
  const index = owner === 'chord' ? 2 : 1
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([expect.objectContaining({
    code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: index,
    path: `part[2].measure[2].note[${index}].@print-dot`, message: expect.stringContaining('"printDot":"no"')
  })])
  expect(score).toEqual(control.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(copy).not.toContain('print-dot=')
  expect(parseMusicXmlWithReport(copy).score).toEqual(score)
})

it.each(owners)('does not warn for visible/default or absent dots on %s', owner => {
  for (const options of [{ printDot: 'yes' }, { printDot: 'omitted' }, { dotted: false }] as const) {
    const { report } = parseMusicXmlWithReport(createNoteDotVisibilityFixture({ owner, ...options }))
    expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
  }
})

it.each(['yes', 'no'] as const)('retains explicit print-dot=%s in the existing hidden-note notice once', printDot => {
  const { report } = parseMusicXmlWithReport(createNoteDotVisibilityFixture({ printObject: 'no', printDot }))
  expect(report.warnings).toHaveLength(1)
  expect(report.warnings[0].path).toBe('part[1].measure[1].note[1].@print-object')
  expect(report.warnings[0].message).toContain('Unrepresented note visibility ')
  expect(report.warnings[0].message).toContain(`"printDot":"${printDot}"`)
})

it('keeps omitted object visibility and all repeated dot source addresses', () => {
  expect(parseMusicXmlWithReport(createNoteDotVisibilityFixture({ printObject: 'omitted' })).report.warnings.filter(warning => warning.message.startsWith(prefix))).toHaveLength(1)
  const warnings = parseMusicXmlWithReport(createRepeatedNoteDotVisibilityFixture()).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(warning => warning.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(warning => warning.path)).size).toBe(30)
})

it('does not mislabel the separate grace appearance limitation as rhythmic-dot display support', () => {
  const { report, score } = parseMusicXmlWithReport(createNoteDotVisibilityFixture({ owner: 'grace' }))
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
  const host = score.parts[0].staves[0].measures[0].voices[0].events.find(event => event.type === 'note')
  expect(host?.type === 'note' && host.graceNotes?.[0]).toMatchObject({ pitch: { step: 'G', octave: 5 }, slash: true })
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available)('keeps the mixed repeated fixture in MusicXML note element order', () => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-dot-mixed-xsd-'))
  try {
    const source = createRepeatedNoteDotVisibilityFixture().replace('<type>half</type><dot/>', '<type>half</type><dot/><notehead>none</notehead>')
    for (const [name, xml] of [['source', source], ['copy', serializeMusicXml(parseMusicXmlWithReport(source).score)]]) {
      const file = join(directory, name + '.musicxml')
      writeFileSync(file, xml)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
it.skipIf(!available).each(owners)('validates actual %s dotted source and copy against complete offline XSD', owner => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-dot-xsd-'))
  try {
    const source = createNoteDotVisibilityFixture({ owner, partCount: 2, targetPart: 2, targetMeasure: 2 })
    for (const [name, xml] of [['source', source], ['copy', serializeMusicXml(parseMusicXmlWithReport(source).score)]]) {
      const file = join(directory, name + '.musicxml')
      writeFileSync(file, xml)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
