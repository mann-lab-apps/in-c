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
const MAX_MEASURES_PER_SYSTEM = 8
const MIN_SPARSE_MEASURE_WIDTH = 112
const MIN_MEASURE_WIDTH = 150
export const SYSTEM_START_NOTE_PADDING = 48
const MIN_RENDER_HEIGHT = 190
const SYSTEM_HEIGHT = 154
const SYSTEM_TOP = 72
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

interface SystemBreakPlan {
  cost: number
  groups: Measure[][]
  systemCount: number
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
    Math.floor(availableWidth / MIN_SPARSE_MEASURE_WIDTH)
  )
  const measuresPerSystem = Math.min(
    MAX_MEASURES_PER_SYSTEM,
    widthCapacity,
    measures.length
  )
  const systemMeasuresList = createSystemMeasureGroups(
    measures,
    measuresPerSystem,
    availableWidth,
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
  availableWidth: number,
  layout: ScoreLayout | undefined
): Measure[][] {
  const manualBreaks = new Set([
    ...(layout?.systemBreakBeforeMeasureIds ?? []),
    ...(layout?.pageBreakBeforeMeasureIds ?? [])
  ])
  const systems: Measure[][] = []
  let segment: Measure[] = []

  for (const measure of measures) {
    if (segment.length > 0 && manualBreaks.has(measure.id)) {
      systems.push(
        ...optimizeSystemMeasureGroups(
          segment,
          measuresPerSystem,
          availableWidth
        )
      )
      segment = []
    }

    segment.push(measure)
  }

  if (segment.length > 0) {
    systems.push(
      ...optimizeSystemMeasureGroups(
        segment,
        measuresPerSystem,
        availableWidth
      )
    )
  }

  return systems
}

function optimizeSystemMeasureGroups(
  measures: Measure[],
  measuresPerSystem: number,
  availableWidth: number
): Measure[][] {
  const plans: Array<SystemBreakPlan | undefined> = Array.from(
    { length: measures.length + 1 },
    () => undefined
  )
  plans[measures.length] = {
    cost: 0,
    groups: [],
    systemCount: 0
  }

  for (let index = measures.length - 1; index >= 0; index -= 1) {
    let bestPlan: SystemBreakPlan | undefined
    const maxEnd = Math.min(measures.length, index + measuresPerSystem)

    for (let end = index + 1; end <= maxEnd; end += 1) {
      const group = measures.slice(index, end)

      if (!canFitSystemGroup(group, availableWidth)) {
        continue
      }

      const nextPlan = plans[end]

      if (!nextPlan) {
        continue
      }

      const systemCount = 1 + nextPlan.systemCount
      const cost = systemBadness(group, availableWidth) + nextPlan.cost
      const candidate = {
        cost,
        groups: [group, ...nextPlan.groups],
        systemCount
      }

      if (!bestPlan || compareSystemBreakPlans(candidate, bestPlan) < 0) {
        bestPlan = candidate
      }
    }

    plans[index] = bestPlan
  }

  return plans[0]?.groups ?? measures.map((measure) => [measure])
}

function canFitSystemGroup(
  measures: Measure[],
  availableWidth: number
): boolean {
  return measures.length === 1 || systemMinimumWidth(measures) <= availableWidth
}

function systemBadness(measures: Measure[], availableWidth: number): number {
  const leftover = Math.max(0, availableWidth - systemMinimumWidth(measures))

  return leftover ** 2
}

function compareSystemBreakPlans(
  left: SystemBreakPlan,
  right: SystemBreakPlan
): number {
  if (left.systemCount !== right.systemCount) {
    return left.systemCount - right.systemCount
  }

  const leftFirstSystemMeasureCount = left.groups[0]?.length ?? 0
  const rightFirstSystemMeasureCount = right.groups[0]?.length ?? 0

  if (leftFirstSystemMeasureCount !== rightFirstSystemMeasureCount) {
    return rightFirstSystemMeasureCount - leftFirstSystemMeasureCount
  }

  return left.cost - right.cost
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
      return clef.line - 2
    case 'F':
      return clef.line + 2
    case 'C':
      return clef.line
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

  const minimumWidths = measures.map((measure, index) =>
    measureMinimumWidth(measure, index === 0)
  )
  const totalMinimumWidth = minimumWidths.reduce((sum, width) => sum + width, 0)
  const scale = totalMinimumWidth > availableWidth
    ? availableWidth / totalMinimumWidth
    : 1
  const baseWidths = minimumWidths.map((width) => width * scale)
  const baseWidthTotal = baseWidths.reduce((sum, width) => sum + width, 0)
  const remainingWidth = Math.max(0, availableWidth - baseWidthTotal)
  const weights = measures.map(measureSpacingWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  return weights.map(
    (weight, index) =>
      baseWidths[index] + remainingWidth * (weight / totalWeight)
  )
}

function systemMinimumWidth(measures: Measure[]): number {
  return measures.reduce(
    (sum, measure, index) => sum + measureMinimumWidth(measure, index === 0),
    0
  )
}

function measureMinimumWidth(measure: Measure, isSystemStart: boolean): number {
  const rhythmWeight = measureSpacingWeight(measure)
  const voiceCount = Math.max(1, measure.voices.length)
  const baseWidth = sparseMeasureWidth(measure, rhythmWeight)
  const voiceWidth = Math.max(0, voiceCount - 1) * 80
  const denseRhythmWidth = Math.max(0, rhythmWeight - 4) * 18
  const leadingModifierWidth = isSystemStart ? SYSTEM_START_NOTE_PADDING : 0

  return baseWidth + leadingModifierWidth + voiceWidth + denseRhythmWidth
}

function sparseMeasureWidth(measure: Measure, rhythmWeight: number): number {
  const events = measure.voices[0]?.events ?? []
  const isFullRestOnly =
    events.length === 1 &&
    events[0].type === 'rest' &&
    Boolean(events[0].fullMeasure)

  if (isFullRestOnly) {
    return MIN_SPARSE_MEASURE_WIDTH
  }

  return Math.min(
    MIN_MEASURE_WIDTH,
    MIN_SPARSE_MEASURE_WIDTH + Math.max(0, rhythmWeight - 1) * 14
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
