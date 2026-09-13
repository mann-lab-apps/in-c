import { measureDurationTicks, voiceEventDurationTicks } from './timing'
import { resolveNotePitch } from './pitch'
import type { Pitch, Score } from './types'

export function convertOctaveShiftPitches(score: Score, direction: 'performed' | 'display'): Score {
  if (!score.octaveShifts?.length) return score
  const offsets = new Map<string, number>()
  for (const part of score.parts) for (const staff of part.staves) {
    let tick = 0
    const locations = staff.measures.flatMap(measure => {
      const start = tick
      tick += measureDurationTicks(measure)
      return measure.voices.flatMap(voice => voice.events.map(event => ({
        event, tick: start + event.position.tick, end: start + event.position.tick + voiceEventDurationTicks(event, measure)
      })))
    })
    for (const span of score.octaveShifts) {
      const start = locations.find(location => location.event.id === span.startEventId)
      const end = locations.find(location => location.event.id === span.endEventId)
      if (!start && !end) continue
      if (!start || !end || start.event.type !== 'note' || end.event.type !== 'note' || end.tick < start.tick) {
        // Unsupported anchors are rejected by XML export; keep existing native
        // documents editable rather than throwing during playback preparation.
        continue
      }
      const amount = (span.type.startsWith('15') ? 2 : 1) * (span.type.endsWith('b') ? -1 : 1)
      // Octave lines apply to the staff's sounding interval, including all voices.
      for (const location of locations) {
        if (location.event.type !== 'note' || location.tick < start.tick || location.tick >= end.end) continue
        offsets.set(location.event.id, (offsets.get(location.event.id) ?? 0) + amount * (direction === 'performed' ? 1 : -1))
      }
    }
  }
  const shift = (pitch: Pitch, amount: number): Pitch => ({ ...pitch, octave: pitch.octave + amount })
  return { ...score, parts: score.parts.map(part => ({ ...part, staves: part.staves.map(staff => ({
    ...staff, measures: staff.measures.map(measure => ({ ...measure, voices: measure.voices.map(voice => ({
      ...voice, events: voice.events.map(event => {
        const amount = offsets.get(event.id)
        if (!amount || event.type !== 'note') return event
        return { ...event, pitch: shift(resolveNotePitch(measure, voice, event), amount),
          ...(event.pitches ? { pitches: event.pitches.map(pitch => shift(pitch, amount)) } : {}),
          ...(event.graceNotes ? { graceNotes: event.graceNotes.map(note => ({ ...note, pitch: shift(note.pitch, amount) })) } : {})
        }
      })
    })) }))
  })) })) }
}
