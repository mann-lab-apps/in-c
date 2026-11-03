import { describe, expect, it } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import { createPlaybackTimeline } from './timeline'
import { expressPianoScore } from './piano-expression'
import { createPianoCommands } from './piano-transport'
import { TICKS_PER_QUARTER } from '../../../score-core'

describe('piano score expression', () => {
  it('honors staccato/accent and keeps authored dynamics, score identity and tempo map', () => {
    const score = createSingleVoiceMvpScore()
    const source = score.parts[0].staves[0].measures[0].voices[0].events[0]
    if (source.type !== 'note') throw Error('fixture')
    source.articulations = ['staccato', 'accent']
    const snapshot = structuredClone(score), basic = createPlaybackTimeline(score)
    const result = expressPianoScore(score, basic, false)
    const before = basic.events.find(n => n.eventId === source.id)!
    const after = result.events.find(n => n.eventId === source.id)!
    expect(after.durationBeats).toBe(before.durationBeats * .5)
    expect(after.velocityStart).toBeCloseTo(before.velocityStart * 1.1)
    expect(result.tempoEvents).toBe(basic.tempoEvents)
    expect(score).toEqual(snapshot)
  })

  it('preserves chord simultaneity and event ordering with bounded expression', () => {
    const score = createSingleVoiceMvpScore(), basic = createPlaybackTimeline(score)
    const result = expressPianoScore(score, basic, true)
    expect(result.events).toHaveLength(basic.events.length)
    for (const event of result.events) {
      const original = basic.events.find(e => e.eventId === event.eventId && e.startBeat <= event.startBeat + .01)!
      expect(Math.abs(event.startBeat - original.startBeat)).toBeLessThanOrEqual(.006001)
      expect(event.frequencies).toEqual(original.frequencies)
      expect(event.velocityStart / original.velocityStart).toBeGreaterThanOrEqual(.97)
      expect(event.velocityStart / original.velocityStart).toBeLessThanOrEqual(1.031)
    }
    expect(result.events.every((e, i) => !i || e.startBeat >= result.events[i - 1].startBeat)).toBe(true)
  })

  it('uses compound beat groups rather than hardcoded four-quarter phases', () => {
    const score = createSingleVoiceMvpScore()
    const measure = score.parts[0].staves[0].measures[0]
    measure.timeSignature = { beats: 6, beatType: 8 }
    measure.voices[0].events[1].position.tick = TICKS_PER_QUARTER * 1.5
    const basic = createPlaybackTimeline(score)
    const result = expressPianoScore(score, basic, true)
    const id = measure.voices[0].events[1].id
    expect(result.events.find(e => e.eventId === id)!.velocityStart)
      .toBe(basic.events.find(e => e.eventId === id)!.velocityStart)
  })

  it('prepares commands at the current tempo and resumes held notes at their sample offset', () => {
    const score = createSingleVoiceMvpScore(), timeline = createPlaybackTimeline(score)
    const commands = createPianoCommands(timeline, .5, 120, {})
    expect(commands[0].time).toBe(0)
    expect(commands[0].offset).toBeCloseTo(.25)
    expect(commands.filter(c => c.type === 'on').every(c => c.pitch >= 21 && c.pitch <= 108)).toBe(true)
    expect(createPianoCommands(timeline, 0, 120, { 'part-1': { muted: true, solo: false, volume: 1 } })).toEqual([])
  })
})
