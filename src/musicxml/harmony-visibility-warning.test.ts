import { expect, it } from 'vitest'
import { createHarmonyVisibilityFixture, removeHarmonyVisibility, type HarmonyVisibilityFixtureKind } from '../testing/harmony-visibility-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

it.each(['hidden', 'mixed', 'visible', 'default'] as HarmonyVisibilityFixtureKind[])('reports %s whole-chord visibility loss without changing the current model', kind => {
  const source = createHarmonyVisibilityFixture(kind), { score, report } = parseMusicXmlWithReport(source)
  const hidden = kind === 'hidden' || kind === 'mixed'
  const warnings = report.warnings.filter(w => w.message.startsWith('Unrepresented harmony visibility '))
  expect(warnings).toHaveLength(hidden ? 1 : 0)
  if (hidden) {
    expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, path: 'part[2].measure[2].harmony[1]' })
    expect(warnings[0].message).toContain('print-object="no"')
  } else expect(report.warnings).toEqual([])
  const control = parseMusicXmlWithReport(removeHarmonyVisibility(source)).score
  expect(score).toEqual(control)
  expect(score.harmonies?.map(h => h.text)).toEqual(kind === 'mixed' ? ['C7', 'Dm'] : ['C7'])
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  const copy = serializeMusicXml(score), reopened = parseMusicXmlWithReport(copy)
  expect(copy).not.toContain('print-object="no"') // Existing model does not preserve hidden chords.
  expect(reopened.report.warnings).toEqual([])
  expect(reopened.score.harmonies).toEqual(score.harmonies)
  expect(serializeMidi(reopened.score)).toEqual(midi)
  expect(midi).toEqual(serializeMidi(control))
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})
