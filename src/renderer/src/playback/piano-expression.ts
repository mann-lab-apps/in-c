import { TICKS_PER_QUARTER, type Score } from '../../../score-core'
import type { PlaybackTimeline } from './timeline'

export const PIANO_RULES_VERSION = 'score-rules-v1'

/** Score rules, not learned predictions. Preserve written dynamics and ensemble onsets. */
export function expressPianoScore(score: Score, timeline: PlaybackTimeline, natural: boolean): PlaybackTimeline {
  const notation = new Map<string, { beat: number; unit: number; articulations: string[] }>()
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    const compound = measure.timeSignature.beats > 3 && measure.timeSignature.beats % 3 === 0
      && measure.timeSignature.beatType === 8
    const unit = (compound ? 3 : 1) * 4 / measure.timeSignature.beatType
    for (const voice of measure.voices) for (const note of voice.events) {
      notation.set(`${part.id}:${staff.id}:${measure.id}:${note.id}`, {
        beat: note.position.tick / TICKS_PER_QUARTER, unit,
        articulations: note.type === 'note' ? note.articulations ?? [] : []
      })
    }
  }
  const starts = [...new Set(timeline.events.filter(e => e.frequency).map(e => e.startBeat))].sort((a, b) => a - b)
  const offsets = new Map(starts.map((beat, i) => {
    const gap = Math.min(i ? beat - starts[i - 1] : Infinity,
      i + 1 < starts.length ? starts[i + 1] - beat : Infinity)
    return [beat, natural ? Math.sin(beat * 2.399963) * Math.min(.006, gap * .15) : 0]
  }))
  const events = timeline.events.map(event => {
    if (!event.frequency) return event
    const source = notation.get(`${event.partId}:${event.staffId}:${event.measureId}:${event.eventId}`)
    const articulation = source?.articulations ?? []
    const isDownbeat = source ? source.beat < 1e-7 : false
    const isBeat = source ? Math.abs(source.beat / source.unit - Math.round(source.beat / source.unit)) < 1e-6 : false
    const expression = natural ? (isDownbeat ? 1.03 : isBeat ? 1 : .98) : 1
    const accent = articulation.includes('marcato') ? 1.18 : articulation.includes('accent') ? 1.1 : 1
    const durationScale = articulation.includes('staccato') && !event.tiedEvents?.length ? .5 : 1
    const durationBeats = event.durationBeats * durationScale
    const shift = event.tremolo || event.ornaments?.length ? 0 : offsets.get(event.startBeat) ?? 0
    return { ...event, startBeat: Math.max(0, event.startBeat + shift), durationBeats,
      velocityStart: Math.min(.24, event.velocityStart * expression * accent),
      velocityEnd: Math.min(.24, event.velocityEnd * expression * accent) }
  }).sort((a, b) => a.startBeat - b.startBeat)
  return { ...timeline, events,
    totalBeats: events.reduce((max, e) => Math.max(max, e.startBeat + e.durationBeats), timeline.totalBeats) }
}
