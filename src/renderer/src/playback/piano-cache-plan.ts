import type { PlaybackTimeline } from './timeline'

/** Include every part and trill pitch; mute/volume changes must not need new I/O.
 * Out-of-range notes are still rejected by the audible transport, not by a muted part's preload. */
export function collectPianoPitches(timeline: PlaybackTimeline): number[] {
  const frequencies = timeline.events.flatMap(event => [
    ...(event.frequencies ?? (event.frequency ? [event.frequency] : [])),
    ...(event.ornaments?.includes('trill') && event.trillFrequency ? [event.trillFrequency] : [])
  ])
  return [...new Set(frequencies.map(frequency => Math.round(69 + 12 * Math.log2(frequency / 440)))
    .filter(pitch => Number.isFinite(pitch) && pitch >= 21 && pitch <= 108))]
}
