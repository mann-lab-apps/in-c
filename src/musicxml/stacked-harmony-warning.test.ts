import { expect, it } from 'vitest'
import { createStackedHarmonyFixture, removeHarmonyContainers, stackedHarmonyRoots, type StackedHarmonyFixtureKind } from '../testing/stacked-harmony-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'

it.each(['vertical', 'triple', 'diagonal', 'default', 'single', 'separate'] as StackedHarmonyFixtureKind[])('reports the lost stacked %s structure without changing current music or independent symbols', kind => {
  const source = createStackedHarmonyFixture(kind), { score, report } = parseMusicXmlWithReport(source)
  const stacked = !['single', 'separate'].includes(kind), roots = stackedHarmonyRoots(kind)
  const warnings = report.warnings.filter(w => w.message.startsWith('Unrepresented stacked harmony '))
  expect(warnings).toHaveLength(stacked ? 1 : 0)
  if (stacked) {
    expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2, path: 'part[2].measure[2].harmony[1]' })
    expect(warnings[0].message).toContain(`chords="${roots.length}"`)
    expect(warnings[0].message).toContain(`roots="${roots.join(',')}"`)
    expect(warnings[0].message).toContain(`kinds="${kind === 'triple' ? 'major,minor,dominant' : 'major,minor'}"`)
    expect(warnings[0].message).toContain(`arrangement="${kind === 'default' ? 'unspecified' : kind === 'diagonal' ? 'diagonal' : 'vertical'}"`)
    expect(score.harmonies).toBeUndefined()
    expect(score).toEqual(parseMusicXmlWithReport(removeHarmonyContainers(source)).score)
  } else {
    expect(report.warnings).toEqual([])
    expect(score.harmonies?.map(h => h.text)).toEqual(kind === 'single' ? ['C'] : ['C', 'Dm'])
    expect(score.harmonies?.map(h => h.tick)).toEqual(roots.map(() => 0))
  }
  const native = encodeNativeProject(createNativeProject(score)), before = structuredClone(score), midi = serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(JSON.parse(JSON.stringify(score)))
  expect(midi).toEqual(serializeMidi(parseMusicXmlWithReport(removeHarmonyContainers(source)).score))
  const reopened = parseMusicXmlWithReport(serializeMusicXml(score))
  expect(reopened.report.warnings).toEqual([])
  expect(reopened.score.harmonies).toEqual(score.harmonies)
  expect(serializeMidi(reopened.score)).toEqual(midi)
  expect(score).toEqual(before)
  expect(encodeNativeProject(createNativeProject(score))).toBe(native)
})

it('keeps the raw accidental values of stacked roots distinct from their step names', () => {
  const source = createStackedHarmonyFixture('vertical')
    .replace('<root-step>C</root-step>', '<root-step>B</root-step><root-alter>-1</root-alter>')
    .replace('<root-step>D</root-step>', '<root-step>F</root-step><root-alter>1</root-alter>')
  const { score, report } = parseMusicXmlWithReport(source)
  expect(score.harmonies).toBeUndefined()
  expect(report.warnings).toHaveLength(1)
  expect(report.warnings[0].message).toContain('roots="B,F"')
  expect(report.warnings[0].message).toContain('root-alters="-1,1"')
  expect(serializeMidi(score)).toEqual(serializeMidi(parseMusicXmlWithReport(removeHarmonyContainers(source)).score))
})
