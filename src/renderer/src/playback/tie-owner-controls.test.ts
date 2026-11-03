import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWholeChordTieScore } from '../../../testing/chord-tie-fixture'
import { createRepeatTieFixture } from '../../../testing/repeat-tie-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createPlaybackTimeline } from './timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'

// Staff IDs may repeat across parts; event/measure IDs must remain globally unique.
describe.each(['shared-staff-id', 'repeat-fermata'] as const)('valid tie owner control %s', kind => {
  it('preserves native-valid ownership and matches an explicit performed reference', () => {
    const source = createWholeChordTieScore(false, false)
    let score = source, expectedMidi: Uint8Array, pairs = 1, heads = 4
    if (kind === 'shared-staff-id') {
      const peer = structuredClone(source.parts[0]); peer.id = 'peer-part'
      for (const m of peer.staves[0].measures) {
        m.id += '-peer'
        for (const n of m.voices[0].events) { n.id += '-peer'; if (n.type !== 'note') throw Error('Fixture'); n.pitch = { step: 'G', octave: 4, alter: 0 }; delete n.ties }
      }
      source.parts.push(peer)
      const timeline = createPlaybackTimeline(source)
      expect(timeline.events.filter(e => e.partId === source.parts[0].id).map(e => [e.startBeat, e.durationBeats])).toEqual([[0, 8]])
      expect(timeline.events.filter(e => e.partId === peer.id).map(e => [e.startBeat, e.durationBeats])).toEqual([[0, 4], [4, 4]])
      // Independent XML import generates distinct owned event IDs and retains sound.
      expectedMidi = serializeMidi(parseMusicXml(serializeMusicXml(source)))
    } else {
      const fixture = createRepeatTieFixture('middle', false); score = fixture.score
      score.parts[0].staves[0].measures[1].voices[0].events[0].fermata = true
      fixture.expanded.parts[0].staves[0].measures[1].voices[0].events[0].fermata = true
      fixture.expanded.parts[0].staves[0].measures[2].voices[0].events[0].fermata = true
      expect(createPlaybackTimeline(score).events.map(e => [e.startBeat, e.durationBeats])).toEqual([[0, 10], [10, 10]])
      expect(createPlaybackTimeline(score).totalBeats).toBe(20)
      expectedMidi = serializeMidi(fixture.expanded); pairs = 2; heads = 3
    }
    const before = structuredClone(score)
    expect(createNativeProject(score).score).toEqual(before)
    expect(serializeMidi(score)).toEqual(expectedMidi)
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(expectedMidi)
    expect(score).toEqual(before)
    const out = process.env.DDIRORI_TIE_OWNER_QA_DIR
    if (out) {
      const dir = join(out, kind); mkdirSync(dir, { recursive: true })
      const removed = structuredClone(score), m = removed.parts[0].staves[0].measures
      const first = m[0].voices[0].events[0], second = m[1].voices[0].events[0]
      if (first.type !== 'note' || second.type !== 'note') throw Error('Fixture')
      delete first.ties; second.ties = second.ties?.start ? { start: true } : undefined
      writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(dir, 'removed.chromatics'), encodeNativeProject(createNativeProject(removed)))
      writeFileSync(join(dir, 'expected.mid'), expectedMidi)
      writeFileSync(join(dir, 'contract.json'), JSON.stringify({ systems: 1, tiePaths: pairs, removedTiePaths: pairs - 1, heads, xmlStart: pairs, xmlStop: pairs }))
    }
  })
})
