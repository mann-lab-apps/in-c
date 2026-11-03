import type { StaveNote } from 'vexflow'
import type { NotationEventTone } from './visual-state'

const tones = new WeakMap<StaveNote, NotationEventTone>()

/** VexFlow compares note styles during voice displacement. UI colors are not engraving. */
export function deferNotationEventTone(note: StaveNote, tone: NotationEventTone): void {
  tones.set(note, tone)
}

/** Call only after all ordinary/shared formatting, immediately before drawing. */
export function paintNotationEventTone(note: StaveNote): void {
  const tone = tones.get(note)
  if (tone === 'selected') note.setStyle({ fillStyle: '#b43d2f', strokeStyle: '#b43d2f' })
  else if (tone === 'playback') note.setStyle({ fillStyle: '#25766f', strokeStyle: '#25766f' })
}
