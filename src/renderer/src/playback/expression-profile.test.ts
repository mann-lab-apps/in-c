import { describe, expect, it } from 'vitest'
import { createPlaybackTimeline } from './timeline'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import { applyExpressionProfile, createScoreRequest, parseExpressionProfile,
  type ExpressionProfile } from './expression-profile'

function sample() {
  const score = createSingleVoiceMvpScore()
  const request = createScoreRequest(score)
  const profile: ExpressionProfile = { version: 1, bpm: request.bpm, scoreKey: request.scoreKey,
    trainingKind: 'synthetic', modelId: 'test',
    notes: request.notes.map(note => ({ noteId: note.noteId, timingOffsetSeconds: 0.05, velocity: 90 })) }
  return { score, request, profile }
}

describe('experimental expression playback contract', () => {
  it('applies model timing and velocity without mutating the original timeline', () => {
    const { score, request, profile } = sample()
    const basic = createPlaybackTimeline(score)
    const snapshot = structuredClone(basic)
    const applied = applyExpressionProfile(basic, request, profile)
    const before = basic.events.find(event => event.frequency)!
    const after = applied.events.find(event => event.eventId === before.eventId)!
    expect(after.startBeat).toBeCloseTo(before.startBeat + 0.05 * request.bpm / 60)
    expect(after.velocityStart).toBeCloseTo(90 / 127 * 0.24)
    expect(basic).toEqual(snapshot)
    expect(applyExpressionProfile(basic, request)).toBe(basic)
  })

  it('rejects stale score, tempo, duplicate notes, missing notes and unsafe numeric values', () => {
    const { request, profile } = sample()
    for (const bad of [
      { ...profile, scoreKey: 'another score' },
      { ...profile, bpm: request.bpm + 1 },
      { ...profile, notes: profile.notes.slice(1) },
      { ...profile, notes: [profile.notes[0], ...profile.notes] },
      { ...profile, notes: profile.notes.map(note => ({ ...note, timingOffsetSeconds: NaN })) },
      { ...profile, notes: profile.notes.map(note => ({ ...note, velocity: 128 })) }
    ]) expect(() => parseExpressionProfile(bad, request)).toThrow()
  })

  it('changes score identity after an edit and gives repeat occurrences unique note IDs', () => {
    const { score, request } = sample()
    const edited = structuredClone(score)
    edited.tempo = { bpm: 90, beatUnit: 'quarter' }
    expect(createScoreRequest(edited).scoreKey).not.toBe(request.scoreKey)
    expect(new Set(request.notes.map(note => note.noteId)).size).toBe(request.notes.length)
  })
})
