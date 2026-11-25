import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'

const source = readFileSync(new URL('./fixtures/lower-staff-voice-collision.musicxml', import.meta.url), 'utf8')

describe('MusicXML voice identity', () => {
  it.each([
    ['5', '9'],
    ['1', '5'],
    ['5', '6'],
    ['Bass', 'Inner'],
    ['1', 'Inner'],
    ['1', '01'],
    ['0', 'Inner']
  ])('keeps lower-staff voices %s and %s separate across measures and spans', (first, second) => {
    const withUpperVoice = second === 'Inner' ? source.replaceAll(
      '<voice>1</voice><type>whole</type><staff>1</staff>',
      '<voice>Melody</voice><type>whole</type><staff>1</staff>'
    ) : source
    const xml = withUpperVoice.replace(/<voice>(5|9)<\/voice>/g,
      (_, voice: string) => `<voice>${voice === '5' ? first : second}</voice>`)
    const imported = parseMusicXml(xml)
    const native = decodeNativeProject(encodeNativeProject(createNativeProject(imported)))
    expect(native.score).toEqual(imported)
    for (const score of [imported, parseMusicXml(serializeMusicXml(imported))]) {
      const [upper, lower] = score.parts[0].staves
      expect(upper.measures.map(measure => measure.voices.map(voice => voice.id))).toEqual([['voice-1'], ['voice-1']])
      const [firstBar, secondBar] = lower.measures
      expect(firstBar.voices.map(voice => voice.id)).toEqual(['voice-1', 'voice-2'])
      expect(secondBar.voices.map(voice => voice.id)).toEqual(['voice-2'])
      const start = firstBar.voices[1].events[0].id
      const stop = secondBar.voices[0].events[1].id
      expect(score.hairpins).toMatchObject([{ type: 'crescendo', startEventId: start, endEventId: stop }])
      expect(score.slurs).toMatchObject([{ startEventId: start, endEventId: stop }])
      const events = createPlaybackTimeline(score).events.filter(event => event.staffId === lower.id)
      expect(events.map(event => [event.voiceId, event.startBeat, event.durationBeats])).toEqual([
        ['voice-1', 0, 4], ['voice-2', 0, 2], ['voice-2', 2, 2], ['voice-2', 4, 2], ['voice-2', 6, 2]
      ])
    }
  })
})
