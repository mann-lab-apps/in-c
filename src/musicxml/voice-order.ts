import type { Voice } from '../score-core'

// Internal writer/round-trip contract, not a display index or a score mutation.
export function readMusicXmlVoiceNumber(voiceId: string): number {
  const match = /^voice-(\d+)$/.exec(voiceId)
  return match ? Number(match[1]) : 1
}

export function sortScoreVoices(voices: Voice[]): Voice[] {
  return [...voices].sort(
    (left, right) =>
      readMusicXmlVoiceNumber(left.id) - readMusicXmlVoiceNumber(right.id) ||
      left.id.localeCompare(right.id)
  )
}
