import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createBarlineStyleFixture as fixture } from '../testing/barline-style-fixture'

it.each(['light-light', 'dashed', 'dotted', 'heavy', 'light-heavy', 'heavy-light', 'heavy-heavy', 'tick', 'short', 'none'])('warns about discarded explicit %s barline style without changing the score/native/playback', style => {
  const xml = fixture({ style }), { score, report } = parseMusicXmlWithReport(xml)
  expect(report.warnings).toContainEqual(expect.objectContaining({ code: 'unsupported-notation', partNumber: 1,
    measureNumber: 1, path: 'part[1].measure[1].barline[1].bar-style', message: expect.stringContaining(`Explicit barline style "${style}"`) }))
  expect(score).toEqual(parseMusicXml(xml))
  expect(serializeMusicXml(score)).not.toContain('<bar-style>')
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
  const project = createNativeProject(score)
  expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
  const dir = process.env.STUDIO_BARLINE_QA_DIR
  if (dir && ['light-light', 'dashed'].includes(style)) { mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, style + '.musicxml'), xml) }
})

it.each([
  { style: 'regular' }, { style: 'omitted' },
  { style: 'heavy-light', location: 'left', repeat: 'forward' as const },
  { style: 'light-heavy', repeat: 'backward' as const }
])('does not warn about default or preserved repeat-derived style %j', options => {
  const { score, report } = parseMusicXmlWithReport(fixture(options))
  expect(report.warnings.filter(w => w.path.includes('.barline['))).toEqual([])
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
})

it('retains the actual owner and final-measure location of an explicit final barline', () => {
  const { report } = parseMusicXmlWithReport(fixture({ style: 'light-heavy', partCount: 2, targetPart: 2, targetMeasure: 2 }))
  const warnings = report.warnings.filter(w => w.path.endsWith('.bar-style'))
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ partNumber: 2, measureNumber: 2, path: 'part[2].measure[2].barline[1].bar-style' })
})

it('warns when an explicit style differs from the supported repeat appearance while preserving repeat playback', () => {
  const { score, report } = parseMusicXmlWithReport(fixture({ style: 'dashed', repeat: 'backward' }))
  expect(report.warnings.some(w => w.path.endsWith('.bar-style'))).toBe(true)
  expect(score.parts[0].staves[0].measures[0].repeat).toMatchObject({ end: true, times: 2 })
  expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
})
