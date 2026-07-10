import {
  TICKS_PER_QUARTER,
  voiceEventDurationTicks,
  type Clef,
  type Measure,
  type Pitch,
  type ScoreLayout
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

export interface SystemLayoutOptions {
  layout?: ScoreLayout
}

const HORIZONTAL_PADDING = 16
const MAX_MEASURES_PER_SYSTEM = 4
const MIN_MEASURE_WIDTH = 180
const MIN_RENDER_HEIGHT = 190
const SYSTEM_HEIGHT = 154
const SYSTEM_TOP = 28
const STAFF_LINE_SPACING = 10
const MAX_LINE_WITHOUT_EXTRA_SPACE = 8
const MIN_LINE_WITHOUT_EXTRA_SPACE = -6
const STEM_SPACE_LINES = 4.8

interface SystemVerticalSpace {
  below: number
  above: number
}

interface SystemPitchExtremes {
  highestLine: number
  lowestLine: number
}

export function createSystemLayout(
  measures: Measure[],
  renderWidth: number,
  options: SystemLayoutOptions = {}
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
  const systemMeasuresList = createSystemMeasureGroups(
    measures,
    measuresPerSystem,
    options.layout
  )
  const systemCount = systemMeasuresList.length
  const placements: MeasurePlacement[] = []
  let verticalCursor = SYSTEM_TOP

  for (let systemIndex = 0; systemIndex < systemCount; systemIndex += 1) {
    const systemMeasures = systemMeasuresList[systemIndex]
    const widths = distributeSystemWidths(systemMeasures, availableWidth)
    let x = HORIZONTAL_PADDING
    const verticalSpace = systemVerticalSpace(systemMeasures)
    const y = verticalCursor + verticalSpace.above

    systemMeasures.forEach((measure, columnIndex) => {
      const width = widths[columnIndex]
      const placement = {
        isSystemStart: columnIndex === 0,
        measure,
        systemIndex,
        width,
        x,
        y
      }

      x += width
      placements.push(placement)
    })

    verticalCursor = y + SYSTEM_HEIGHT + verticalSpace.below
  }

  return {
    height: Math.max(MIN_RENDER_HEIGHT, verticalCursor),
    measuresPerSystem,
    placements,
    systemCount
  }
}

function createSystemMeasureGroups(
  measures: Measure[],
  measuresPerSystem: number,
  layout: ScoreLayout | undefined
): Measure[][] {
  const manualBreaks = new Set([
    ...(layout?.systemBreakBeforeMeasureIds ?? []),
    ...(layout?.pageBreakBeforeMeasureIds ?? [])
  ])
  const systems: Measure[][] = []
  let currentSystem: Measure[] = []

  for (const measure of measures) {
    if (
      currentSystem.length > 0 &&
      (manualBreaks.has(measure.id) ||
        currentSystem.length >= measuresPerSystem)
    ) {
      systems.push(currentSystem)
      currentSystem = []
    }

    currentSystem.push(measure)
  }

  if (currentSystem.length > 0) {
    systems.push(currentSystem)
  }

  return systems
}

function systemVerticalSpace(measures: Measure[]): SystemVerticalSpace {
  const { highestLine, lowestLine } = systemPitchExtremes(measures)

  return {
    above: Math.max(
      0,
      highestLine + STEM_SPACE_LINES - MAX_LINE_WITHOUT_EXTRA_SPACE
    ) * STAFF_LINE_SPACING,
    below: Math.max(
      0,
      MIN_LINE_WITHOUT_EXTRA_SPACE - (lowestLine - STEM_SPACE_LINES)
    ) * STAFF_LINE_SPACING
  }
}

function systemPitchExtremes(measures: Measure[]): SystemPitchExtremes {
  let highestLine = MAX_LINE_WITHOUT_EXTRA_SPACE - STEM_SPACE_LINES
  let lowestLine = MIN_LINE_WITHOUT_EXTRA_SPACE + STEM_SPACE_LINES

  for (const measure of measures) {
    for (const voice of measure.voices) {
      for (const event of voice.events) {
        if (event.type !== 'note') {
          continue
        }

        const line = pitchStaffLine(event.pitch, measure.clef)
        highestLine = Math.max(highestLine, line)
        lowestLine = Math.min(lowestLine, line)
      }
    }
  }

  return {
    highestLine,
    lowestLine
  }
}

export function pitchStaffLine(pitch: Pitch, clef: Clef): number {
  const stepIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(pitch.step)
  const baseLine = ((pitch.octave - 4) * 7 + stepIndex) / 2

  return baseLine + clefLineShift(clef)
}

function clefLineShift(clef: Clef): number {
  switch (clef.sign) {
    case 'G':
      return 0
    case 'F':
      return 6
    case 'C':
      return clef.line >= 4 ? 4 : 3
    case 'percussion':
    case 'tab':
      return 0
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
