import { measureDurationTicks, TICKS_PER_QUARTER } from './timing'
import type { RepeatPlaybackPlan } from './repeat-plan'
import type { Score } from './types'

/** Performed transport/copy metadata only; never stored in the source score. */
export interface PerformedPedalEntry {
  id: string
  partId: string
  startBeat: number
  value: number
  occurrence: number
  measureIndex: number
  sourceId?: string
}

export function createPerformedPedalPlan(score: Score, plan?: RepeatPlaybackPlan): PerformedPedalEntry[] {
  const result: PerformedPedalEntry[] = []
  for (const part of score.parts) {
    const pedals = score.pedalEvents?.filter(pedal => pedal.partId === part.id) ?? []
    if (!pedals.length) continue
    const primary = part.staves[0]?.measures ?? []
    const starts = new Map<string, number>(); let beat = 0
    for (const measure of primary) { starts.set(measure.id, beat); beat += measureDurationTicks(measure) / TICKS_PER_QUARTER }
    // Preserve the existing linear fallback when no shared repeat plan exists.
    const entries = plan?.entries ?? primary.map((measure, measureIndex) => ({
      measureIndex, outputBeat: starts.get(measure.id) ?? 0, pass: 1
    }))
    entries.forEach((entry, occurrence) => {
      if (occurrence && entry.measureIndex !== entries[occurrence - 1].measureIndex + 1) {
        result.push({ id: `pedal-reset-${part.id}-${occurrence}`, partId: part.id,
          startBeat: entry.outputBeat, value: 0, occurrence, measureIndex: entry.measureIndex })
      }
      for (const pedal of pedals) {
        const staff = part.staves.find(staff => staff.id === pedal.staffId)
        if (staff?.measures[entry.measureIndex]?.id !== pedal.measureId) continue
        result.push({ id: `${pedal.id}-${occurrence}`, partId: part.id,
          startBeat: entry.outputBeat + pedal.tick / TICKS_PER_QUARTER, value: pedal.value,
          occurrence, measureIndex: entry.measureIndex, sourceId: pedal.id })
      }
    })
  }
  return result.sort((a, b) => a.startBeat - b.startBeat)
}
