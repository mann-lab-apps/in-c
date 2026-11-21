import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createGraceAppearanceFixture, createRepeatedGraceAppearanceFixture, type GraceAppearanceOptions } from '../testing/grace-appearance-fixture'
import { createNoteDotVisibilityFixture } from '../testing/note-dot-visibility-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented grace appearance '
const cases = [
  { id: 'quarter', type: 'quarter', dots: 0 },
  { id: 'sixteenth', type: '16th', dots: 0 },
  { id: 'dotted-eighth', type: 'eighth', dots: 1 },
  { id: 'double-dotted-eighth', type: 'eighth', dots: 2 },
  { id: 'dotted-quarter', type: 'quarter', dots: 1 },
  { id: 'omitted-type-dotted', type: 'omitted', dots: 1 },
  { id: 'hidden-dotted', type: 'eighth', dots: 1, printObject: 'no', printDot: 'yes' }
] as const

it.each(cases)('reports $id appearance loss without adding grace duration or changing projected music', options => {
  const location = { partCount: 2, targetPart: 2, targetMeasure: 2 }
  const xml = createGraceAppearanceFixture({ ...options, ...location })
  const { score, report } = parseMusicXmlWithReport(xml)
  const control = parseMusicXmlWithReport(createGraceAppearanceFixture({ ...options, ...location, type: 'eighth', dots: 0 }))
  const warnings = report.warnings.filter(warning => warning.message.startsWith(prefix))
  const sourceField = options.type !== 'eighth' && options.type !== 'omitted' ? 'type' : 'dot[1]'
  expect(warnings).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: 1,
    path: `part[2].measure[2].note[1].${sourceField}`, message: expect.stringContaining(`"dots":${options.dots}`) })])
  if (options.type === 'omitted') expect(warnings[0].message).not.toContain('"type":')
  else expect(warnings[0].message).toContain(`"type":"${options.type}"`)
  if ('printDot' in options) expect(warnings[0].message).toContain('"printDot":"yes"')
  expect(report.warnings.filter(warning => warning.message.startsWith('Unrepresented note visibility '))).toHaveLength('printObject' in options ? 1 : 0)
  expect(report.warnings.filter(warning => warning.message.startsWith('Unrepresented note dot visibility '))).toEqual([])
  expect(score).toEqual(control.score)
  expect(serializeMidi(score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(control.score)
  const copy = serializeMusicXml(score)
  expect(copy).toBe(serializeMusicXml(control.score))
  expect(parseMusicXmlWithReport(copy).score).toEqual(control.score)
})

it.each([
  { id: 'default', type: 'eighth', slash: 'yes' },
  { id: 'omitted-type', type: 'omitted', slash: 'yes' },
  { id: 'unslashed', type: 'eighth', slash: 'no' },
  { id: 'omitted-slash', type: 'eighth', slash: 'omitted' }
] as const)('keeps $id quiet and preserves its existing slash state', options => {
  const { score, report } = parseMusicXmlWithReport(createGraceAppearanceFixture({ ...options, dots: 0 }))
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
  const host = score.parts[0].staves[0].measures[0].voices[0].events.find(event => event.type === 'note')
  expect(host?.type === 'note' ? host.graceNotes?.[0].slash : 'missing host').toBe(options.slash === 'omitted' ? undefined : options.slash === 'yes')
})

it('does not misclassify ordinary dotted notes as grace appearance', () => {
  const { report } = parseMusicXmlWithReport(createNoteDotVisibilityFixture())
  expect(report.warnings.filter(warning => warning.message.startsWith(prefix))).toEqual([])
  expect(report.warnings.filter(warning => warning.message.startsWith('Unrepresented note dot visibility '))).toHaveLength(1)
})

it('retains distinct source indices for two grace notes on the same host', () => {
  const second = '<note><grace slash="no"/><pitch><step>A</step><octave>5</octave></pitch><type>eighth</type><dot/></note>'
  const xml = createGraceAppearanceFixture().replace(/(<note print-object="yes">[\s\S]*?<\/note>)/, '$1' + second)
  const result = parseMusicXmlWithReport(xml)
  expect(result.report.warnings.filter(warning => warning.message.startsWith(prefix)).map(warning => warning.path)).toEqual([
    'part[1].measure[1].note[1].type', 'part[1].measure[1].note[2].dot[1]'
  ])
  const host = result.score.parts[0].staves[0].measures[0].voices[0].events.find(event => event.type === 'note')
  expect(host?.type === 'note' && host.graceNotes).toEqual([
    { pitch: { step: 'G', octave: 5, alter: undefined }, slash: true },
    { pitch: { step: 'A', octave: 5, alter: undefined }, slash: false }
  ])
})

it('retains all repeated source paths', () => {
  const warnings = parseMusicXmlWithReport(createRepeatedGraceAppearanceFixture()).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(warning => warning.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(warning => warning.path)).size).toBe(30)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available).each(cases)('validates actual $id source and copy with complete offline XSD', options => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-grace-style-xsd-'))
  try {
    const xml = createGraceAppearanceFixture(options as GraceAppearanceOptions)
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
