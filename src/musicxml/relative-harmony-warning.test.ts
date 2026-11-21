import { expect, it } from 'vitest'
import { createRelativeHarmonyFixture } from '../testing/relative-harmony-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

it.each(['function', 'numeral', 'numeral-key', 'mixed'] as const)(
  'reports unrepresented %s relative harmony without inventing a root or changing the existing export guard', kind => {
    const source = createRelativeHarmonyFixture(kind), parsed = parseMusicXmlWithReport(source)
    const warnings = parsed.report.warnings.filter(w => w.message.startsWith('Unrepresented relative harmony '))
    const element = kind === 'function' || kind === 'mixed' ? 'function' : 'numeral'
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatchObject({ code: 'unsupported-notation', partNumber: 2, measureNumber: 2,
      path: `part[2].measure[2].harmony[1].${element}[1]` })
    expect(warnings[0].message).toContain(`element="${element}"`)
    expect(warnings[0].message).toContain(element === 'function' ? 'value="V"' : 'root="5"')
    if (kind === 'numeral-key') {
      expect(warnings[0].message).toContain('alter="-1"')
      expect(warnings[0].message).toContain('fifths="1"')
      expect(warnings[0].message).toContain('mode="minor"')
    }
    const harmony = parsed.score.harmonies![0]
    expect(harmony.root).toBeUndefined(); expect(harmony.text).toBe(kind === 'numeral-key' ? 'b5m7' : 'V7')
    if (kind === 'mixed') expect(parsed.score.harmonies![1]).toMatchObject({ text: 'Gm', root: { step: 'G' }, kind: 'minor' })
    const before = encodeNativeProject(createNativeProject(parsed.score))
    expect(decodeNativeProject(before).score).toEqual(JSON.parse(JSON.stringify(parsed.score)))
    expect(() => serializeMusicXml(parsed.score)).toThrow('화음 구조를 MusicXML로 보존할 수 없습니다')
    expect(encodeNativeProject(createNativeProject(parsed.score))).toBe(before)
    const notesOnly = parseMusicXmlWithReport(createRelativeHarmonyFixture('none')).score
    expect(serializeMidi(parsed.score)).toEqual(serializeMidi(notesOnly))
    expect(createPlaybackTimeline(parsed.score)).toEqual(createPlaybackTimeline(notesOnly))
  }
)
it.each(['absolute', 'none'] as const)('does not mistake %s chords for relative harmony', kind => {
  expect(parseMusicXmlWithReport(createRelativeHarmonyFixture(kind)).report.warnings).toEqual([])
})
