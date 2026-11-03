import { z } from 'zod'
import type { Score } from '../../../score-core'
import { createPlaybackTimeline, tempoMarkingToQuarterBpm, type PlaybackTimeline } from './timeline'

const expressionSchema = z.object({
  version: z.literal(1),
  scoreKey: z.string().min(1),
  bpm: z.number().finite().min(40).max(240),
  modelId: z.string().min(1),
  trainingKind: z.enum(['synthetic', 'human-performance', 'audio-transcribed', 'mixed']),
  provenance: z.object({
    checkpointMetadataSha256: z.string().regex(/^[a-f0-9]{64}$/),
    labelType: z.literal('pseudo-label'),
    sources: z.array(z.object({
      sourceUrl: z.string().min(1), license: z.string().min(1),
      attribution: z.string().min(1), kind: z.string().min(1)
    }).strict()),
    transcriptionModels: z.array(z.record(z.string(), z.unknown()))
  }).strict().optional(),
  notes: z.array(z.object({
    noteId: z.string(),
    timingOffsetSeconds: z.number().finite().min(-0.150001).max(0.150001),
    velocity: z.number().int().min(1).max(127)
  }).strict()).min(1).max(50000)
}).strict()

export type ExpressionProfile = z.infer<typeof expressionSchema>
export interface ScoreRequest {
  version: 1
  scoreKey: string
  bpm: number
  notes: { noteId: string; onsetBeats: number; durationBeats: number; midiPitch: number }[]
}

export function createScoreRequest(score: Score): ScoreRequest {
  const timeline = createPlaybackTimeline(score)
  const bpm = Math.max(40, Math.min(240,
    score.tempo ? tempoMarkingToQuarterBpm(score.tempo) : 120))
  if (timeline.tempoEvents.some(event => event.quarterBpm !== bpm)) {
    throw new Error('첫 연주 모델은 일정한 템포의 악보만 지원합니다.')
  }
  if (timeline.events.some(event => event.tremolo || event.ornaments?.length)) {
    throw new Error('트레몰로와 장식음이 없는 짧은 구간을 선택해 주세요.')
  }
  const notes = timeline.events.flatMap((event, index) =>
    (event.frequencies ?? (event.frequency ? [event.frequency] : [])).map((frequency, pitchIndex) => ({
      noteId: `${index}:${pitchIndex}`,
      onsetBeats: event.startBeat,
      durationBeats: event.durationBeats,
      midiPitch: Math.round(69 + 12 * Math.log2(frequency / 440))
    })))
  if (!notes.length || notes.length > 50000 || notes.some(note => note.durationBeats <= 0)) {
    throw new Error('재생 가능한 음표가 있는 짧은 악보가 필요합니다.')
  }
  // Opaque identity shared with Python; includes event occurrences, rests, dynamics and tempo.
  const scoreKey = JSON.stringify([bpm, timeline])
  return { version: 1, scoreKey, bpm, notes }
}

export function parseExpressionProfile(value: unknown, request: ScoreRequest): ExpressionProfile {
  const profile = expressionSchema.parse(value)
  if (profile.scoreKey !== request.scoreKey || profile.bpm !== request.bpm) {
    throw new Error('현재 악보와 일치하지 않는 예측 파일입니다. 악보를 다시 내보내 주세요.')
  }
  const ids = new Set(profile.notes.map(note => note.noteId))
  if (ids.size !== profile.notes.length || ids.size !== request.notes.length ||
      request.notes.some(note => !ids.has(note.noteId))) {
    throw new Error('예측 파일의 음표 목록이 현재 악보와 다릅니다.')
  }
  return profile
}

export function applyExpressionProfile(
  timeline: PlaybackTimeline, request: ScoreRequest, value?: ExpressionProfile
): PlaybackTimeline {
  if (!value) return timeline
  const profile = parseExpressionProfile(value, request)
  const predictions = new Map(profile.notes.map(note => [note.noteId, note]))
  const events = timeline.events.flatMap((event, index) => {
    const frequencies = event.frequencies ?? (event.frequency ? [event.frequency] : [])
    if (!frequencies.length) return [event]
    return frequencies.map((frequency, pitchIndex) => {
      const prediction = predictions.get(`${index}:${pitchIndex}`)!
      const velocity = (prediction.velocity / 127) * 0.24
      return { ...event, frequency, frequencies: [frequency],
        startBeat: Math.max(0, event.startBeat + prediction.timingOffsetSeconds * request.bpm / 60),
        velocityStart: velocity, velocityEnd: velocity }
    })
  }).sort((a, b) => a.startBeat - b.startBeat)
  return { ...timeline, events,
    totalBeats: Math.max(timeline.totalBeats,
      ...events.map(event => event.startBeat + event.durationBeats)) }
}
