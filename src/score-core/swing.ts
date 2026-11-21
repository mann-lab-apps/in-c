import { measureDurationTicks } from './timing'
import type { Score } from './types'

export function globalSwingPlaybackUnavailableReason(score: Score): 'empty' | 'unaligned' | undefined {
  const staves = score.parts.flatMap(part => part.staves), reference = staves[0]?.measures
  if (!reference?.length) return 'empty'
  if (staves.some(staff => staff.measures.length !== reference.length || staff.measures.some((bar, index) =>
    measureDurationTicks(bar) !== measureDurationTicks(reference[index]) ||
    bar.timeSignature.beats !== reference[index].timeSignature.beats || bar.timeSignature.beatType !== reference[index].timeSignature.beatType ||
    bar.timing.type !== reference[index].timing.type))) return 'unaligned'
  return undefined
}
