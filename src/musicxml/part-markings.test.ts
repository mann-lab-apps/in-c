import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'
import { scoreRepeatSource } from '../score-core'

const xml = readFileSync('src/musicxml/fixtures/expanded-v1-part-export.musicxml', 'utf8')

describe('part/staff annotation ownership', () => {
  it('preserves secondary grand staff markings and slur chord anchors across export', () => {
    const score = parseMusicXml(xml)
    const reopened = parseMusicXml(serializeMusicXml(score))
    for (const candidate of [score, reopened]) {
      const upper = candidate.parts[1]!.staves[0]!
      const lower = candidate.parts[1]!.staves[1]!
      expect(candidate.dynamics?.map(mark => [mark.value, mark.measureId])).toEqual([
        ['ff', candidate.parts[0]!.staves[0]!.measures[0]!.id],
        ['p', upper.measures[0]!.id], ['mp', lower.measures[0]!.id]
      ])
      expect(candidate.staffTexts?.find(mark => mark.text === 'Left hand')?.measureId).toBe(lower.measures[0]!.id)
      expect(candidate.harmonies?.[0]?.measureId).toBe(upper.measures[0]!.id)
      expect(candidate.slurs).toHaveLength(1)
      expect(candidate.slurs?.[0]).toMatchObject({
        startEventId: upper.measures[0]!.voices[0]!.events[0]!.id,
        endEventId: upper.measures[1]!.voices[0]!.events[0]!.id
      })
      expect(candidate.hairpins).toHaveLength(1)
    }
  })

  it('slurs on a non-primary voice resolve by voice and skip chord continuation nodes', () => {
    const score = parseMusicXml(xml)
    score.hairpins = undefined
    for (const measure of score.parts[1]!.staves[0]!.measures) {
      measure.voices = measure.voices.map(voice => ({ ...voice, id: voice.id === 'voice-1' ? 'voice-2' : 'voice-1' }))
    }
    const reopened = parseMusicXml(serializeMusicXml(score))
    const upper = reopened.parts[1]!.staves[0]!
    expect(reopened.slurs?.[0]).toMatchObject({
      startEventId: upper.measures[0]!.voices.find(voice => voice.id === 'voice-2')!.events[0]!.id,
      endEventId: upper.measures[1]!.voices.find(voice => voice.id === 'voice-2')!.events[0]!.id
    })
  })

  it('only shares repeats when every staff has aligned measure duration/count', () => {
    const score = parseMusicXml(xml)
    expect(scoreRepeatSource(score)?.id).toBe(score.parts[0]!.staves[0]!.id)
    score.parts[1]!.staves[1]!.measures[0]!.timeSignature.beats = 3
    expect(scoreRepeatSource(score)).toBeUndefined()
    score.parts[1]!.staves[1]!.measures.pop()
    expect(scoreRepeatSource(score)).toBeUndefined()
  })
})
