import type { Voice } from './types'

export function readScoreVoiceNumber(voiceId: string): number {
  const match = /^voice-(\d+)$/.exec(voiceId)
  return match ? Number(match[1]) : 1
}

export function sortScoreVoices(voices: Voice[]): Voice[] {
  return [...voices].sort(
    (left, right) =>
      readScoreVoiceNumber(left.id) - readScoreVoiceNumber(right.id) ||
      left.id.localeCompare(right.id)
  )
}
