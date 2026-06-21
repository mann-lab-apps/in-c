import type { Measure } from '../../../score-core'

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
  const measureWidth = availableWidth / measuresPerSystem
  const systemCount = Math.ceil(measures.length / measuresPerSystem)
  const placements = measures.map((measure, measureIndex) => {
    const systemIndex = Math.floor(measureIndex / measuresPerSystem)
    const columnIndex = measureIndex % measuresPerSystem

    return {
      isSystemStart: columnIndex === 0,
      measure,
      systemIndex,
      width: measureWidth,
      x: HORIZONTAL_PADDING + columnIndex * measureWidth,
      y: SYSTEM_TOP + systemIndex * SYSTEM_HEIGHT
    }
  })

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
