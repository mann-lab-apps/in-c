import { hasManualSpanEngraving } from '../../../project/span-engraving'
import { measureDurationTicks, voiceEventDurationTicks, type Score, type Staff } from '../../../score-core'
import { readScoreVoiceNumber } from '../../../score-core/voice-order'

type Interval = { tick: number; end: number }
type SlurSide = 'above' | 'below'

export function planSlurVoiceSides(score: Score): ReadonlyMap<string, SlurSide> {
  const sides = new Map<string, SlurSide>()
  const automatic = (score.slurs ?? []).filter(slur => !hasManualSpanEngraving(slur.engraving))
  if (!automatic.length) return sides

  const endpoints = new Set(automatic.flatMap(slur => [slur.startEventId, slur.endEventId]))
  const locations = new Map<string, Interval & { staff: Staff; primary: boolean }>()
  const secondaryByStaff = new Map<Staff, Interval[]>()
  for (const part of score.parts) for (const staff of part.staves) {
    const secondary: Interval[] = []
    let measureTick = 0
    for (const measure of staff.measures) {
      for (const voice of measure.voices) {
        const primary = readScoreVoiceNumber(voice.id) === 1
        for (const event of voice.events) {
          if (primary && !endpoints.has(event.id)) continue
          const tick = measureTick + event.position.tick
          const interval = { tick, end: tick + voiceEventDurationTicks(event, measure) }
          if (!primary) secondary.push(interval)
          if (endpoints.has(event.id)) locations.set(event.id, { ...interval, staff, primary })
        }
      }
      measureTick += measureDurationTicks(measure)
    }
    secondaryByStaff.set(staff, secondary)
  }

  for (const slur of automatic) {
    const start = locations.get(slur.startEventId)
    const stop = locations.get(slur.endEventId)
    if (!start || !stop || start.staff !== stop.staff || start.tick >= stop.tick) continue
    const overlapsSecondaryVoice = secondaryByStaff.get(start.staff)?.some(event =>
      event.tick < stop.end && event.end > start.tick
    )
    if (overlapsSecondaryVoice) sides.set(slur.id, start.primary && stop.primary ? 'above' : 'below')
  }
  return sides
}
