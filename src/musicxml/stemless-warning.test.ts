import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createStemlessFixture as fixture } from '../testing/stemless-fixture'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const stemWarnings = (xml: string) => parseMusicXmlWithReport(xml).report.warnings.filter(w => w.path.endsWith('.stem'))

it.each(['eighth', 'quarter', 'half'] as const)('reports discarded stem hiding on %s without altering supported score/time/native/MIDI', value => {
  const xml = fixture({ value }), { score } = parseMusicXmlWithReport(xml)
  expect(stemWarnings(xml)).toEqual([expect.objectContaining({ code: 'unsupported-notation', partNumber: 1, measureNumber: 1,
    eventIndex: 1, path: 'part[1].measure[1].note[1].stem', message: expect.stringContaining('Explicit stem hiding') })])
  expect(score).toEqual(parseMusicXml(xml.replace('<stem>none</stem>', '')))
  const native = createNativeProject(score)
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native)
  const copy = serializeMusicXml(score)
  expect(copy).not.toContain('<stem>')
  expect(serializeMidi(parseMusicXml(copy))).toEqual(serializeMidi(score))
  if (process.env.STUDIO_STEMLESS_QA_DIR && value !== 'eighth') {
    mkdirSync(process.env.STUDIO_STEMLESS_QA_DIR, { recursive: true }); writeFileSync(join(process.env.STUDIO_STEMLESS_QA_DIR, value + '.musicxml'), xml)
  }
})
it.each(['chord', 'grace'] as const)('retains the actual raw %s member index for the warning', owner => {
  const xml = fixture({ owner }), warnings = stemWarnings(xml)
  expect(warnings).toHaveLength(1)
  expect(warnings[0]).toMatchObject({ partNumber: 1, measureNumber: 1, eventIndex: owner === 'chord' ? 2 : 1,
    path: `part[1].measure[1].note[${owner === 'chord' ? 2 : 1}].stem` })
  expect(parseMusicXml(xml)).toEqual(parseMusicXml(xml.replace('<stem>none</stem>', '')))
})
it('distinguishes an equal numbered note in the second part and final measure', () => {
  expect(stemWarnings(fixture({ partCount: 2, targetPart: 2, targetMeasure: 2 }))).toEqual([
    expect.objectContaining({ partNumber: 2, measureNumber: 2, eventIndex: 1, path: 'part[2].measure[2].note[1].stem' })])
})
it.each([{ stem: 'omitted' as const }, { stem: 'up' as const }, { stem: 'down' as const }, { value: 'whole' as const }, { owner: 'rest' as const }])('does not add stem-hiding warnings outside the audited visible-loss scope: %j', options => {
  expect(stemWarnings(fixture(options))).toEqual([])
  // This is not proof manual up/down or rest stemlet metadata is preserved.
})
