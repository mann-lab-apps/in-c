import { TICKS_PER_QUARTER as T, globalSwingPlaybackUnavailableReason, measureDurationTicks, voiceEventDurationTicks, type RepeatPlaybackPlan, type Score, type VoiceAddress } from '../../../score-core'

export type SwingVoiceScope = Pick<VoiceAddress, 'partId' | 'staffId' | 'voiceId'>

export function swingPlaybackUnavailableReason(score: Score): string | undefined {
  const reason = globalSwingPlaybackUnavailableReason(score)
  if (reason === 'empty') return '스윙 재생을 적용할 마디가 없습니다.'
  if (reason === 'unaligned') {
    return '보표별 박자·마디 길이가 다른 악보는 전역 스윙 재생을 적용하지 않습니다. 설정은 보존하며 직선 리듬으로 재생합니다.'
  }
  return undefined
}

/** Derived timing only: never edits authored ticks, duration, or voice order.
 * The global grid is independent of other parts' contents. When a voice scope
 * is supplied, its subdivided/tuplet pairs remain straight without cancelling
 * another voice's swing or changing timing when a part is exported alone.
 */
export function createSwingBeatMapper(score: Score, repeatPlan?: RepeatPlaybackPlan, scope?: SwingVoiceScope): (beat: number, edge?: 'end') => number {
  const setting = score.swingPlayback
  if (!setting || swingPlaybackUnavailableReason(score)) return beat => beat
  const bars = score.parts[0].staves[0].measures
  const unit = setting.unit === 'eighth' ? 0.5 : 0.25, pair = 2 * unit
  const fraction = setting.ratio === '2:1' ? 2 / 3 : 3 / 5
  const sourceStaff = scope ? score.parts.find(part => part.id === scope.partId)?.staves.find(staff => staff.id === scope.staffId) : undefined
  let cursor = 0
  const entries = repeatPlan?.entries ?? bars.map((bar, measureIndex) => {
    const outputBeat = cursor; cursor += measureDurationTicks(bar) / T
    return { measureIndex, outputBeat }
  })
  const segments = entries.map(entry => {
    const bar = bars[entry.measureIndex], length = measureDurationTicks(bar) / T
    const offset = bar.timing.type === 'pickup' ? bar.timeSignature.beats * 4 / bar.timeSignature.beatType - length : 0
    const blocked = new Set<number>()
    for (const voice of sourceStaff?.measures[entry.measureIndex].voices ?? []) {
      if (voice.id !== scope?.voiceId) continue
      const tuplets = new Set(voice.tuplets?.flatMap(group => group.eventIds))
      for (const event of voice.events) {
        const duration = voiceEventDurationTicks(event, bar) / T
        if (!event.duration.tuplet && !tuplets.has(event.id) && duration >= unit - 1e-9) continue
        const start = event.position.tick / T + offset, end = start + duration
        for (let index = Math.floor((start + 1e-9) / pair); index <= Math.floor((end - 1e-9) / pair); index++) blocked.add(index)
      }
    }
    return { start: entry.outputBeat, end: entry.outputBeat + length, offset, blocked }
  })
  return (beat, edge) => {
    // Ending boundaries stay fixed, including the last unpaired subdivision.
    let lo = 0, hi = segments.length
    while (lo < hi) {
      const mid = (lo + hi) >>> 1
      // A source boundary can close one bar and open a later pickup. Its
      // delayed attack must never extend the preceding note's release.
      const before = edge === 'end' ? segments[mid].start < beat - 1e-9 : segments[mid].start <= beat + 1e-9
      if (before) lo = mid + 1; else hi = mid
    }
    const segment = segments[lo - 1]
    if (!segment || beat >= segment.end - 1e-9) return beat
    const nominal = beat - segment.start + segment.offset, index = Math.floor((nominal + 1e-9) / pair)
    if (segment.blocked.has(index) || (index + 1) * pair > segment.end - segment.start + segment.offset + 1e-9) return beat
    const local = nominal - index * pair
    const warped = local <= unit ? local * 2 * fraction : pair * fraction + (local - unit) * 2 * (1 - fraction)
    return segment.start + index * pair + warped - segment.offset
  }
}
