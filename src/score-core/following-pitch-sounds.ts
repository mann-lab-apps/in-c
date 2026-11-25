import { effectiveAlterAt } from './pitch'
import type { Measure, Pitch, Tick, Voice, VoiceEvent } from './types'

// Edits can change the accidental context for unselected notes.
// Pin only inherited pitches that would change after replacing or shifting events.
export function preserveFollowingPitchSounds(
  measure: Measure,
  voice: Voice,
  replacement: VoiceEvent[],
  afterTick: Tick
): VoiceEvent[] {
  const events = [...replacement]
  const nextVoice = { ...voice, events }
  const originalById = new Map(voice.events.map(event => [event.id, event]))

  for (const [index, event] of events.entries()) {
    if (event.type !== 'note') continue
    const original = originalById.get(event.id)
    if (original?.type !== 'note' || original.position.tick <= afterTick) continue

    const preserve = (pitch: Pitch): Pitch => {
      if (pitch.alter !== undefined) return pitch
      const input = { measure, step: pitch.step, octave: pitch.octave }
      const desired = effectiveAlterAt({ ...input, voice, tick: original.position.tick })
      const actual = effectiveAlterAt({ ...input, voice: nextVoice, tick: event.position.tick })
      return desired === actual ? pitch : { ...pitch, alter: desired }
    }

    const originalPitches = original.pitches?.length ? original.pitches : [original.pitch]
    const pitches = originalPitches.map(preserve)
    const graceNotes = original.graceNotes?.map(grace => {
      const pitch = preserve(grace.pitch)
      return pitch === grace.pitch ? grace : { ...grace, pitch }
    })
    if (pitches.every((pitch, i) => pitch === originalPitches[i]) &&
        !graceNotes?.some((grace, i) => grace !== original.graceNotes?.[i])) continue

    // Keep the legacy primary field if it differs from the authoritative chord.
    const first = originalPitches[0]
    const primaryMatches = original.pitch.step === first.step &&
      original.pitch.octave === first.octave && original.pitch.alter === first.alter
    events[index] = {
      ...event,
      pitch: primaryMatches ? pitches[0] : original.pitch,
      ...(original.pitches?.length ? { pitches } : {}),
      ...(graceNotes ? { graceNotes } : {})
    }
  }

  return events
}
