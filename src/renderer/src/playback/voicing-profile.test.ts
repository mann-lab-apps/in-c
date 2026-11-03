import { describe, expect, it } from 'vitest'
import { createSingleVoiceMvpScore } from '../../../testing/single-voice-mvp-fixture'
import { createPlaybackTimeline } from './timeline'
import { createPianoCommands } from './piano-transport'
import { createVoicingRequest, parseVoicingProfile, applyVoicingProfile,
  type VoicingProfile } from './voicing-profile'

function sample(chord = false) {
  const score = createSingleVoiceMvpScore()
  if (chord) {
    const note = score.parts[0].staves[0].measures[0].voices[0].events[0]
    if (note.type !== 'note') throw Error('fixture')
    note.pitches = [note.pitch, { step: 'E', octave: 4 }, { step: 'G', octave: 4 }]
  }
  const request = createVoicingRequest(score)
  const profile: VoicingProfile = { version: 2, policy: 'relative-voicing-only-v1',
    scoreKey: request.scoreKey, bpm: request.bpm, modelId: 'a'.repeat(64),
    trainingKind: 'audio-transcribed', provenance: {
      checkpointMetadataSha256: 'b'.repeat(64), labelType: 'pseudo-label',
      sources: [{ sourceUrl: 'https://example.org/fixture', license: 'CC0', attribution: 'Fixture', kind: 'audio-transcribed' }],
      transcriptionModels: [{ package: 'fixture' }]
    }, notes: request.notes.map(n => ({ noteId: n.noteId, velocityGain: 1 })) }
  return { score, request, profile }
}

describe('relative voicing profile v2', () => {
  it('neutral predictions preserve every chord command and the exact original timeline', () => {
    const { score, request, profile } = sample(true)
    const timeline = createPlaybackTimeline(score)
    expect(applyVoicingProfile(timeline, request, profile)).toBe(timeline)
    expect(createPianoCommands(applyVoicingProfile(timeline, request, profile), 0, request.bpm, {}))
      .toEqual(createPianoCommands(timeline, 0, request.bpm, {}))
  })

  it('changes only per-note velocity and preserves chord normalization and authored envelopes', () => {
    const { score, request, profile } = sample(true)
    profile.notes[0].velocityGain = .9
    profile.notes[2].velocityGain = 1.1
    const original = createPlaybackTimeline(score), before = structuredClone(original)
    original.events[0].velocityStart = .08
    original.events[0].velocityEnd = .18
    const applied = applyVoicingProfile(original, request, profile)
    const first = applied.events.filter(e => e.eventId === original.events[0].eventId)
    expect(first).toHaveLength(3)
    for (const [i, gain] of [.9, 1, 1.1].entries()) {
      expect(first[i].velocityStart).toBeCloseTo(.08 * gain / Math.sqrt(3), 12)
      expect(first[i].velocityEnd).toBeCloseTo(.18 * gain / Math.sqrt(3), 12)
      expect(first[i].startBeat).toBe(original.events[0].startBeat)
      expect(first[i].durationBeats).toBe(original.events[0].durationBeats)
    }
    expect(applied.totalBeats).toBe(original.totalBeats)
    expect(applied.tempoEvents).toBe(original.tempoEvents)
    expect(applied.pedalEvents).toBe(original.pedalEvents)
    expect(original.events.slice(1)).toEqual(before.events.slice(1))
  })

  it('rejects absolute timing fields, stale identity, duplicate notes and unbounded gains', () => {
    const { request, profile } = sample()
    for (const value of [
      { ...profile, scoreKey: 'another' }, { ...profile, bpm: request.bpm + 1 },
      { ...profile, notes: [...profile.notes, profile.notes[0]] },
      { ...profile, notes: profile.notes.slice(1) },
      { ...profile, notes: profile.notes.map(n => ({ ...n, velocityGain: 1.1 })) },
      ...[NaN, .84, 1.16].map(velocityGain => ({ ...profile,
        notes: profile.notes.map(n => ({ ...n, velocityGain })) })),
      { ...profile, notes: profile.notes.map(n => ({ ...n, timingOffsetSeconds: .1 })) },
      { ...profile, provenance: undefined }
    ]) expect(() => parseVoicingProfile(value, request)).toThrow()
  })

  it('binds identity to meter and rejects unsupported pickup or meter changes', () => {
    const { score, request } = sample()
    const changed = structuredClone(score)
    for (const m of changed.parts[0].staves[0].measures) m.timeSignature = { beats: 3, beatType: 4 }
    expect(createVoicingRequest(changed).context.meterQuarters).toBe(3)
    expect(createVoicingRequest(changed).scoreKey).not.toBe(request.scoreKey)
    changed.parts[0].staves[0].measures[0].timing = { type: 'pickup', durationTicks: 480 }
    expect(() => createVoicingRequest(changed)).toThrow('못갖춘마디')
  })
})
