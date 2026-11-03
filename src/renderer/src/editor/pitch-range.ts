import type { Pitch } from '../../../score-core'

// Same persisted octave interval as native projects; reject, never clamp a pitch.
export function isPersistablePitch(pitch: Pitch | undefined): pitch is Pitch {
  return Boolean(pitch && Number.isInteger(pitch.octave) && pitch.octave >= -1 && pitch.octave <= 9)
}
