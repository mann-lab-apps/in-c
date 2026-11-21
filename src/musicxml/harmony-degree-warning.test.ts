import { expect, it } from 'vitest'
import { createHarmonyDegreeFixture, stripHarmonyDegrees } from '../testing/harmony-degree-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { expandScoreRepeatsForMusicXml } from './expand-repeats'

const notices = (source: string) => parseMusicXmlWithReport(source).report.warnings
  .filter(warning => warning.message.startsWith('Unrepresented chord degree '))

it.each(['add', 'alter', 'subtract', 'multiple', 'hidden', 'diagram', 'normalized'] as const)(
  'reports unrepresented %s chord-degree structure without changing current music or labels', kind => {
    const source = createHarmonyDegreeFixture(kind)
    const imported = parseMusicXmlWithReport(source), control = parseMusicXmlWithReport(stripHarmonyDegrees(source)).score
    const warnings = notices(source), count = kind === 'multiple' ? 3 : 1
    expect(warnings).toHaveLength(count)
    expect(warnings.map(w => w.path)).toEqual(Array.from({ length: count }, (_, i) => `part[2].measure[2].harmony[1].degree[${i + 1}]`))
    expect(warnings.every(w => w.code === 'unsupported-notation' && w.partNumber === 2 && w.measureNumber === 2)).toBe(true)
    expect(warnings[0].message).toContain(`value="${kind === 'alter' || kind === 'subtract' ? 5 : 9}"`)
    expect(warnings[0].message).toContain(`type="${kind === 'alter' || kind === 'subtract' ? kind : 'add'}"`)
    if (kind === 'hidden') {
      expect(warnings[0].message).toContain('print-object="no"')
      expect(imported.score.harmonies?.[0].text).toBe('C7(#9)')
    }
    if (kind === 'diagram') expect(imported.report.warnings.filter(w => w.message.startsWith('Unrepresented fretboard diagram '))).toHaveLength(1)
    expect(imported.score).toEqual(control)
    const before = encodeNativeProject(createNativeProject(imported.score))
    const midi = serializeMidi(control)
    expect(createPlaybackTimeline(imported.score)).toEqual(createPlaybackTimeline(control))
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(imported.score)))
    expect(native.score).toEqual(control); expect(serializeMidi(native.score)).toEqual(midi)
    for (const model of [imported.score, expandScoreRepeatsForMusicXml(imported.score)]) {
      const copy = serializeMusicXml(model)
      expect(copy).not.toMatch(/<degree(?:\s|>)/)
      expect(notices(copy)).toEqual([])
      expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(midi)
    }
    expect(encodeNativeProject(createNativeProject(imported.score))).toBe(before)
  }
)
it.each(['control', 'none'] as const)('does not invent a chord-degree loss for %s', kind => {
  expect(parseMusicXmlWithReport(createHarmonyDegreeFixture(kind)).report.warnings).toEqual([])
})
