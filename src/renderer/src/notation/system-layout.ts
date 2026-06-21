import {
  TICKS_PER_QUARTER,
  voiceEventDurationTicks,
  type Measure
} from '../../../score-core'

export interface MeasurePlacement {
  isSystemStart: boolean
  measure: Measure
  systemIndex: number
  width: number
  x: number
  y: number
}

export interface SystemLayout {
  height: number
  measuresPerSystem: number
  placements: MeasurePlacement[]
  systemCount: number
}

const HORIZONTAL_PADDING = 16
const MAX_MEASURES_PER_SYSTEM = 4
const MIN_MEASURE_WIDTH = 180
const MIN_RENDER_HEIGHT = 190
const SYSTEM_HEIGHT = 154
const SYSTEM_TOP = 28

export function createSystemLayout(
  measures: Measure[],
  renderWidth: number
): SystemLayout {
  if (measures.length === 0) {
    return {
      height: MIN_RENDER_HEIGHT,
      measuresPerSystem: 1,
      placements: [],
      systemCount: 0
    }
  }

  const availableWidth = Math.max(1, renderWidth - HORIZONTAL_PADDING * 2)
  const widthCapacity = Math.max(
    1,
    Math.floor(availableWidth / MIN_MEASURE_WIDTH)
  )
  const measuresPerSystem = Math.min(
    MAX_MEASURES_PER_SYSTEM,
    widthCapacity,
    measures.length
  )
  const systemCount = Math.ceil(measures.length / measuresPerSystem)
  const placements = Array.from({ length: systemCount }, (_, systemIndex) => {
    const systemMeasures = measures.slice(
      systemIndex * measuresPerSystem,
      (systemIndex + 1) * measuresPerSystem
    )
    const widths = distributeSystemWidths(systemMeasures, availableWidth)
    let x = HORIZONTAL_PADDING

    return systemMeasures.map((measure, columnIndex) => {
      const width = widths[columnIndex]
      const placement = {
        isSystemStart: columnIndex === 0,
        measure,
        systemIndex,
        width,
        x,
        y: SYSTEM_TOP + systemIndex * SYSTEM_HEIGHT
      }

      x += width
      return placement
    })
  }).flat()

  return {
    height: Math.max(
      MIN_RENDER_HEIGHT,
      SYSTEM_TOP + systemCount * SYSTEM_HEIGHT
    ),
    measuresPerSystem,
    placements,
    systemCount
  }
}

function distributeSystemWidths(
  measures: Measure[],
  availableWidth: number
): number[] {
  if (measures.length === 0) {
    return []
  }

  const baseWidth = Math.min(
    MIN_MEASURE_WIDTH,
    availableWidth / measures.length
  )
  const remainingWidth = Math.max(
    0,
    availableWidth - baseWidth * measures.length
  )
  const weights = measures.map(measureSpacingWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  return weights.map(
    (weight) => baseWidth + remainingWidth * (weight / totalWeight)
  )
}

function measureSpacingWeight(measure: Measure): number {
  const events = measure.voices[0]?.events ?? []

  if (events.length === 0) {
    return 1
  }

  return Math.max(
    1,
    events.reduce((weight, event) => {
      if (event.type === 'rest' && event.fullMeasure) {
        return weight + 1
      }

      const durationTicks = voiceEventDurationTicks(event, measure)
      return weight + Math.sqrt(TICKS_PER_QUARTER / durationTicks)
    }, 0)
  )
}
