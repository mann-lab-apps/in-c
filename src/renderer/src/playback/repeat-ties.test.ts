import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRepeatTieFixture, type RepeatTieCase } from '../../../testing/repeat-tie-fixture'
import { applyScoreCommand, buildTieCommand, validateTieRelations } from '../../../score-core'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { serializeMusicXml, parseMusicXml } from '../../../musicxml'
import { createPlaybackTimeline, findPlaybackEvent, findPlaybackStartBeat } from './timeline'
import { serializeMidi } from '../midi/serialize-midi'

const cases: RepeatTieCase[] = ['internal', 'exit', 'entry', 'middle', 'volta']
describe.each([false, true])('performed repeat ties chord=%s', chord => {
  it.each(cases)('matches explicitly expanded %s traversal without altering written ties', kind => {
    const { score, expanded, expected } = createRepeatTieFixture(kind, chord), before = structuredClone(score)
    expect(validateTieRelations(score)).toEqual([])
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events.map(event => [event.startBeat, event.durationBeats])).toEqual(expected)
    expect(findPlaybackStartBeat(timeline, 'chord-tie-2')).toBe(kind === 'exit' ? 4 : 0)
    if (kind === 'middle' || kind === 'volta') expect(findPlaybackStartBeat(timeline, 'chord-tie-3')).toBe(kind === 'middle' ? 8 : 12)
    const boundary = kind === 'exit' ? 4 : kind === 'volta' ? 12 : 8
    expect(findPlaybackEvent(timeline, boundary)?.eventId).toBe(kind === 'volta' ? 'chord-tie-3' : kind === 'entry' || kind === 'middle' ? 'chord-tie-2' : 'chord-tie-1')
    expect(serializeMidi(score)).toEqual(serializeMidi(expanded))
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(expanded))
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(before)
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_REPEAT_TIE_QA_DIR
    if (out && chord) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      const measureCount = score.parts[0].staves[0].measures.length, pairs = kind === 'middle' ? 2 : 1
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'expected.mid'), serializeMidi(expanded))
      writeFileSync(join(dir, 'removed.chromatics'), encodeNativeProject(createNativeProject(applyScoreCommand(score, buildTieCommand(score, 'chord-tie-1', false)!).score)))
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ systems: 1, tiePaths: pairs * 3, removedTiePaths: (pairs - 1) * 3, heads: measureCount * 3, xmlStart: pairs * 3, xmlStop: pairs * 3, expectedPlayback: expected }))
    }
  })
})
