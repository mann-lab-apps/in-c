import type { DynamicMark } from '../../../score-core'

// Match the existing Inspector/playback first-value policy without rewriting
// the authored array or inventing timed/voice-scoped dynamic semantics.
export function indexMeasureDynamics(marks: readonly DynamicMark[] = []): Map<string, DynamicMark> {
  const index = new Map<string, DynamicMark>()
  for (const mark of marks) {
    if (!index.has(mark.measureId)) index.set(mark.measureId, mark)
  }
  return index
}
