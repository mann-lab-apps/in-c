import { createMetronomeTextFixture, type MetronomeTextOptions } from './metronome-text-fixture'

export type ConvertedMetronomeUnit = '128th' | '256th' | '512th' | '1024th' | 'breve' | 'long' | 'maxima'
export function createMetronomeBeatUnitFixture(unit: ConvertedMetronomeUnit, options: MetronomeTextOptions = {}) {
  return createMetronomeTextFixture({ ...options, beatUnit: 'quarter' })
    .replace('<beat-unit>quarter</beat-unit>', `<beat-unit>${unit}</beat-unit>`)
}
