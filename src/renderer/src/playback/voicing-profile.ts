import { z } from 'zod'
import type { Score } from '../../../score-core'
import { createScoreRequest, type ExpressionProfile, type ScoreRequest } from './expression-profile'
import type { PlaybackTimeline } from './timeline'

export interface VoicingRequest extends Omit<ScoreRequest, 'version'> {
  version: 2
  context: { meterQuarters: 3 | 4; pickup: false }
}

const voicingSchema = z.object({
  version: z.literal(2),
  policy: z.literal('relative-voicing-only-v1'),
  scoreKey: z.string().min(1),
  bpm: z.number().finite().min(40).max(240),
  modelId: z.string().regex(/^[a-f0-9]{64}$/),
  trainingKind: z.literal('audio-transcribed'),
  provenance: z.object({
    checkpointMetadataSha256: z.string().regex(/^[a-f0-9]{64}$/),
    labelType: z.literal('pseudo-label'),
    sources: z.array(z.object({ sourceUrl: z.string().min(1), license: z.string().min(1),
      attribution: z.string().min(1), kind: z.string().min(1) }).strict()).min(1),
    transcriptionModels: z.array(z.record(z.string(), z.unknown())).min(1)
  }).strict(),
  notes: z.array(z.object({ noteId: z.string().min(1),
    velocityGain: z.number().finite().min(.85).max(1.15) }).strict()).min(1).max(5000)
}).strict()

export type VoicingProfile = z.infer<typeof voicingSchema>
export type AnyExpressionProfile = ExpressionProfile | VoicingProfile

export function createVoicingRequest(score: Score): VoicingRequest {
  const basic = createScoreRequest(score)
  const measures = score.parts.flatMap(p => p.staves.flatMap(s => s.measures))
  const first = measures[0]?.timeSignature
  if (!first || first.beatType !== 4 || ![3, 4].includes(first.beats) ||
    measures.some(m => m.timeSignature.beats !== first.beats || m.timeSignature.beatType !== 4 ||
      m.timing.type === 'pickup')) {
    throw new Error('음별 강약 실험은 못갖춘마디와 박자 변경이 없는 3/4·4/4 구간만 지원합니다.')
  }
  if (basic.notes.length > 5000) throw new Error('음별 강약 실험은 5000음표 이하의 구간만 지원합니다.')
  const context = { meterQuarters: first.beats as 3 | 4, pickup: false as const }
  return { ...basic, version: 2, context,
    scoreKey: JSON.stringify(['relative-voicing-request-v2', basic.scoreKey, context]) }
}

export function parseVoicingProfile(value: unknown, request: VoicingRequest): VoicingProfile {
  const profile = voicingSchema.parse(value)
  if (profile.scoreKey !== request.scoreKey || profile.bpm !== request.bpm) {
    throw new Error('현재 악보·박자와 일치하지 않는 음별 강약 예측입니다. 입력을 다시 내보내 주세요.')
  }
  const ids = new Set(profile.notes.map(n => n.noteId))
  if (ids.size !== profile.notes.length || ids.size !== request.notes.length ||
      request.notes.some(n => !ids.has(n.noteId))) {
    throw new Error('음별 강약 예측의 음표 목록이 현재 악보와 다릅니다.')
  }
  const gainById = new Map(profile.notes.map(n => [n.noteId, n.velocityGain]))
  const groups: { beat: number; gains: number[] }[] = []
  for (const note of [...request.notes].sort((a, b) => a.onsetBeats - b.onsetBeats)) {
    if (!groups.length || note.onsetBeats - groups.at(-1)!.beat > 1e-6) {
      groups.push({ beat: note.onsetBeats, gains: [] })
    }
    groups.at(-1)!.gains.push(gainById.get(note.noteId)!)
  }
  for (const group of groups) {
    const values = group.gains.sort((a, b) => a - b), middle = Math.floor(values.length / 2)
    const median = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2
    if (Math.abs(median - 1) > 1e-6) throw new Error('음별 강약 예측은 onset의 중앙 세기를 유지해야 합니다.')
  }
  return profile
}

export function applyVoicingProfile(timeline: PlaybackTimeline, request: VoicingRequest,
  value: VoicingProfile): PlaybackTimeline {
  const profile = parseVoicingProfile(value, request)
  const gains = new Map(profile.notes.map(n => [n.noteId, n.velocityGain]))
  if (profile.notes.every(n => n.velocityGain === 1)) return timeline
  const events = timeline.events.flatMap((event, index) => {
    const frequencies = event.frequencies ?? (event.frequency ? [event.frequency] : [])
    if (!frequencies.length || frequencies.every((_, p) => gains.get(`${index}:${p}`) === 1)) {
      return [event]
    }
    return frequencies.map((frequency, p) => {
      const gain = gains.get(`${index}:${p}`)!
      const normalization = Math.sqrt(frequencies.length)
      // Splitting a chord must preserve its original per-tone normalization.
      return { ...event, frequency, frequencies: [frequency],
        velocityStart: Math.min(.24, event.velocityStart * gain) / normalization,
        velocityEnd: Math.min(.24, event.velocityEnd * gain) / normalization }
    })
  })
  // Timing, duration, tempo map, pedal and occurrence ownership stay on the supplied timeline.
  return { ...timeline, events }
}
