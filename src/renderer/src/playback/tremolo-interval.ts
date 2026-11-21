import { durationToTicks, TICKS_PER_QUARTER, type Duration } from '../../../score-core'

/** Single-note strokes combine with source flags; dots extend pulse count. */
export function resolveTremoloBeatInterval(marks: 1 | 2 | 3, duration?: Duration): number {
  const base = duration
    ? Math.min(1, durationToTicks({ value: duration.value, dots: 0 }) / TICKS_PER_QUARTER)
    : 1
  const ratio = duration?.tuplet
    ? duration.tuplet.normalNotes / duration.tuplet.actualNotes
    : 1
  return base * ratio / 2 ** marks
}
