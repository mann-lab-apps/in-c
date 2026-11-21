import { expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { createGraceTimingFixture, createRepeatedGraceTimingFixture, type GraceTimingOptions } from '../testing/grace-timing-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

const prefix = 'Unrepresented grace timing '
const cases = [
  { id: 'previous', previous: '25' },
  { id: 'following', following: '50' },
  { id: 'make-time', makeTime: '1.5' },
  { id: 'two-sides', previous: '20', following: '30' },
  { id: 'explicit-zero', following: '0' },
  { id: 'lexical-zero', previous: '0.0' },
  { id: 'all', previous: '10', following: '20', makeTime: '2' },
  { id: 'omitted-slash-zero', following: '0', slash: 'omitted' },
  { id: 'omitted-slash-make-time', makeTime: '1.5', slash: 'omitted' }
] as const

it.each(cases)('reports $id original timing once, preserving source values and projected music', options => {
  const xml = createGraceTimingFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 })
  // The source must actually exercise its requested timing branch. A valid
  // XML document without the intended attribute is not this regression case.
  for (const [key, attribute] of [['previous','steal-time-previous'],['following','steal-time-following'],['makeTime','make-time']] as const) {
    if (key in options) expect(xml).toContain(` ${attribute}="${(options as GraceTimingOptions)[key]}"`)
  }
  const result = parseMusicXmlWithReport(xml)
  // Existing attribute-bearing grace nodes project omitted slash as false.
  // Preserve that legacy model rather than normalizing it to the empty node.
  const controlSlash = 'slash' in options && options.slash === 'omitted' ? 'no' : 'yes'
  const control = parseMusicXmlWithReport(createGraceTimingFixture({ partCount: 2, targetPart: 2, targetMeasure: 2, slash: controlSlash }))
  const field = 'previous' in options ? 'steal-time-previous' : 'following' in options ? 'steal-time-following' : 'make-time'
  const warnings = result.report.warnings.filter(w => w.message.startsWith(prefix))
  expect(warnings).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, eventIndex: 1,
    path: `part[2].measure[2].note[1].grace.@${field}` })])
  for (const [key, field] of [['previous', 'stealTimePrevious'], ['following', 'stealTimeFollowing'], ['makeTime', 'makeTime']] as const) {
    if (key in options) expect(warnings[0].message).toContain(`"${field}":"${(options as GraceTimingOptions)[key]}"`)
    else expect(warnings[0].message).not.toContain(`"${field}":`)
  }
  expect(warnings[0].message).toContain('percent')
  expect(warnings[0].message).toContain('divisions')
  expect(result.report.warnings.filter(w => w.message.startsWith('Unrepresented grace appearance '))).toEqual([])
  expect(result.score).toEqual(control.score)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(control.score))
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(control.score)
  expect(serializeMusicXml(result.score)).toBe(serializeMusicXml(control.score))
})

it('keeps omitted timing quiet and separates ordinary-note attributes', () => {
  const xml = createGraceTimingFixture()
  expect(parseMusicXmlWithReport(xml).report.warnings).toEqual([])
  const ordinary = xml.replace('<note><pitch>', '<note steal-time-following="50"><pitch>')
  expect(parseMusicXmlWithReport(ordinary).report.warnings.filter(w => w.message.startsWith(prefix))).toEqual([])
})

it('keeps graphic appearance and timing losses independently attributable', () => {
  const warnings = parseMusicXmlWithReport(createGraceTimingFixture({ type: 'quarter', following: '0' })).report.warnings
  expect(warnings.filter(w => w.message.startsWith(prefix))).toHaveLength(1)
  expect(warnings.filter(w => w.message.startsWith('Unrepresented grace appearance '))).toHaveLength(1)
})

it('retains source indices for successive grace timing declarations', () => {
  const xml = createGraceTimingFixture({ following: '50' }).replace(/(<note print-object="yes">[\s\S]*?<\/note>)/,
    '$1<note><grace steal-time-previous="0" slash="no"/><pitch><step>A</step><octave>5</octave></pitch><type>eighth</type></note>')
  const warnings = parseMusicXmlWithReport(xml).report.warnings.filter(w => w.message.startsWith(prefix))
  expect(warnings.map(w => w.path)).toEqual(['part[1].measure[1].note[1].grace.@steal-time-following', 'part[1].measure[1].note[2].grace.@steal-time-previous'])
})

it('retains all thirty original timing locations', () => {
  const warnings = parseMusicXmlWithReport(createRepeatedGraceTimingFixture()).report.warnings
  expect(warnings).toHaveLength(30)
  expect(warnings.every(w => w.message.startsWith(prefix))).toBe(true)
  expect(new Set(warnings.map(w => w.path)).size).toBe(30)
})

const schema = resolve('src/musicxml/schema/musicxml-4.0')
const available = spawnSync('xmllint', ['--version'], { encoding: 'utf8' }).status === 0
it.skipIf(!available).each(cases)('validates $id source and projected copy with complete offline XSD', options => {
  const directory = mkdtempSync(join(tmpdir(), 'studio-grace-timing-xsd-'))
  try {
    const xml = createGraceTimingFixture(options)
    for (const [name, contents] of [['source', xml], ['copy', serializeMusicXml(parseMusicXmlWithReport(xml).score)]]) {
      const file = join(directory, name + '.musicxml'); writeFileSync(file, contents)
      const result = spawnSync('xmllint', ['--nonet', '--noout', '--schema', join(schema, 'musicxml.xsd'), file], {
        encoding: 'utf8', env: { ...process.env, XML_CATALOG_FILES: join(schema, 'catalog.xml') }
      })
      expect(result.status, result.stderr).toBe(0)
    }
  } finally { rmSync(directory, { recursive: true, force: true }) }
})
