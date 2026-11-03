import { measureDurationTicks, timeSignatureDurationTicks, type Score } from '../../../score-core'
import { locateMeasure } from './editor-state'
import type { NoteInputState } from './note-input-state'

// Readout only: use the written meter's denominator, not playback tempo or
// compound-meter grouping. A pending tuplet's tick is its group anchor.
export function describeInputPosition(score: Score, state?: NoteInputState): string | undefined {
  if (!state) return undefined
  const location = locateMeasure(score, state.target.measureId, state.target)
  if (!location || !Number.isSafeInteger(state.tick) || state.tick < 0) return undefined
  const { measure } = location
  const end = measureDurationTicks(measure)
  if (state.tick > end) return undefined
  const measureLabel = `${measure.timing.type === 'pickup' ? '못갖춘 ' : ''}${location.measureNumber}마디`
  if (state.tick === end) return `${measureLabel} · 끝`

  const beatTicks = timeSignatureDurationTicks({ beats: 1, beatType: measure.timeSignature.beatType })
  const whole = Math.floor(state.tick / beatTicks) + 1
  const remainder = state.tick % beatTicks
  let fraction = ''
  if (remainder) {
    let a = remainder, b = beatTicks
    while (b) [a, b] = [b, a % b]
    fraction = `+${remainder / a}/${beatTicks / a}`
  }
  const unit = measure.timeSignature.beatType === 1 ? '온음표' : `${measure.timeSignature.beatType}분음표`
  return `${measureLabel} · ${state.tupletInput ? '묶음 시작 ' : ''}${whole}${fraction}박 (${unit} 기준)`
}
