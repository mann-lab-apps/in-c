import { measureDurationTicks, voiceEventDurationTicks } from './timing'
import { resolveNotePitch } from './pitch'
import type { Measure, Pitch, Score, Voice } from './types'

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
  return {
    ...score,
    parts: score.parts.map(part => ({
      ...part,
      staves: part.staves.map(staff => ({
        ...staff,
        measures: staff.measures.map(measure => ({
          ...measure,
          voices: measure.voices.map(voice => convertVoiceOctaves(measure, voice, offsets))
        }))
      }))
    }))
  }
}

function convertVoiceOctaves(measure: Measure, voice: Voice, offsets: ReadonlyMap<string, number>): Voice {
  if (!voice.events.some(event => offsets.get(event.id))) return voice

  const events = [...voice.events]
  const projected = { ...voice, events }
  const musicalOrder = Array.from(voice.events.entries())
    .sort(([, left], [, right]) => left.position.tick - right.position.tick)

  // Earlier projected notes can change the accidental inherited at the new
  // octave, even for a pitch just outside the line. Preserve each written
  // pitch's alteration and process history in score order.
  for (const [index, event] of musicalOrder) {
    if (event.type !== 'note') continue
    const amount = offsets.get(event.id) ?? 0
    const convertPitch = (source: Pitch, forceExplicit = false): Pitch => {
      const shifted = amount ? { ...source, octave: source.octave + amount } : source
      if (source.alter !== undefined) return shifted

      const { alter } = resolveNotePitch(measure, voice, { ...event, pitch: source })
      if (forceExplicit) return { ...shifted, alter }
      const inherited = resolveNotePitch(measure, projected, { ...event, pitch: shifted }).alter
      return alter === inherited ? shifted : { ...shifted, alter }
    }

    const pitch = convertPitch(event.pitch, amount !== 0)
    const pitches = event.pitches?.map(member => convertPitch(member))
    const graceNotes = event.graceNotes?.map(note => {
      const pitch = convertPitch(note.pitch)
      return pitch === note.pitch ? note : { ...note, pitch }
    })

    if (pitch !== event.pitch || pitches?.some((member, i) => member !== event.pitches?.[i]) ||
        graceNotes?.some((note, i) => note !== event.graceNotes?.[i])) {
      events[index] = { ...event, pitch, pitches, graceNotes }
    }
  }

  return projected
}
