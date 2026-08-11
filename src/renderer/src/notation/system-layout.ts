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
  compactSpacing?: boolean
  layout?: ScoreLayout
  lyricScale?: number
  pageHeight?: number
  systemHeight?: number
  systemTop?: number
}

const HORIZONTAL_PADDING = 8
const MAX_MEASURES_PER_SYSTEM = 8
const MIN_SPARSE_MEASURE_WIDTH = 104
const COMPACT_SPARSE_MEASURE_WIDTH = 94
const MIN_MEASURE_WIDTH = 132
const LEADING_NOTATION_BASE_PADDING = 12
const CLEF_PADDING = 4
const KEY_SIGNATURE_ACCIDENTAL_PADDING = 4
const TIME_SIGNATURE_PADDING = 8
const MAX_LEADING_NOTATION_PADDING = 52
const EVENT_CROWDING_WIDTH = 10
const DENSE_RHYTHM_WIDTH = 8
const MIN_RENDER_HEIGHT = 190
const SYSTEM_HEIGHT = 154
const SYSTEM_TOP = 72
const STAFF_LINE_SPACING = 10
const MAX_LINE_WITHOUT_EXTRA_SPACE = 8
const MIN_LINE_WITHOUT_EXTRA_SPACE = -6
const STEM_SPACE_LINES = 4.8
const LYRIC_BASELINE_OFFSET = 116
const LYRIC_LINE_GAP = 16
const LYRIC_FONT_SIZE = 13
const LYRIC_BOTTOM_PADDING = 8

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

interface LayoutSpacing {
  minSparseMeasureWidth: number
}

interface LayoutMetrics {
  systemHeight: number
  systemTop: number
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
  const spacing = {
    minSparseMeasureWidth: options.compactSpacing
      ? COMPACT_SPARSE_MEASURE_WIDTH
      : MIN_SPARSE_MEASURE_WIDTH
  }
  const metrics = {
    systemHeight: options.systemHeight ?? SYSTEM_HEIGHT,
    systemTop: options.systemTop ?? SYSTEM_TOP
  }
  const widthCapacity = Math.max(
    1,
    Math.floor(availableWidth / spacing.minSparseMeasureWidth)
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
    options.layout,
    spacing
  )
  const systemCount = systemMeasuresList.length
  const placements: MeasurePlacement[] = []
  let verticalCursor = metrics.systemTop

  for (let systemIndex = 0; systemIndex < systemCount; systemIndex += 1) {
    const systemMeasures = systemMeasuresList[systemIndex]
    const verticalSpace = systemVerticalSpace(
      systemMeasures,
      options.lyricScale ?? 1,
      metrics
    )
    const y = alignSystemToPage(
      verticalCursor + verticalSpace.above,
      verticalSpace.below,
      options.pageHeight,
      metrics
    )
    const widths = distributeSystemWidths(
      systemMeasures,
      availableWidth,
      true,
      spacing
    )
    let x = HORIZONTAL_PADDING

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

    verticalCursor = y + metrics.systemHeight + verticalSpace.below
  }

  return {
    height: Math.max(MIN_RENDER_HEIGHT, verticalCursor),
    measuresPerSystem,
    placements,
    systemCount
  }
}

function alignSystemToPage(
  y: number,
  below: number,
  pageHeight: number | undefined,
  metrics: Pick<LayoutMetrics, 'systemHeight' | 'systemTop'>
): number {
  if (!pageHeight) {
    return y
  }

  const pageTop = Math.floor(y / pageHeight) * pageHeight
  const pageBottom = pageTop + pageHeight
  const systemBottom = y + metrics.systemHeight + below

  if (systemBottom <= pageBottom) {
    return y
  }

  return pageBottom + metrics.systemTop
}

function createSystemMeasureGroups(
  measures: Measure[],
  measuresPerSystem: number,
  availableWidth: number,
  layout: ScoreLayout | undefined,
  spacing: LayoutSpacing
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
          availableWidth,
          spacing
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
        availableWidth,
        spacing
      )
    )
  }

  return systems
}

function optimizeSystemMeasureGroups(
  measures: Measure[],
  measuresPerSystem: number,
  availableWidth: number,
  spacing: LayoutSpacing
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

      if (!canFitSystemGroup(group, availableWidth, spacing)) {
        continue
      }

      const nextPlan = plans[end]

      if (!nextPlan) {
        continue
      }

      const systemCount = 1 + nextPlan.systemCount
      const cost = systemBadness(group, availableWidth, spacing) + nextPlan.cost
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
  availableWidth: number,
  spacing: LayoutSpacing
): boolean {
  return (
    measures.length === 1 ||
    systemMinimumWidth(measures, spacing) <= availableWidth
  )
}

function systemBadness(
  measures: Measure[],
  availableWidth: number,
  spacing: LayoutSpacing
): number {
  const leftover = Math.max(
    0,
    availableWidth - systemMinimumWidth(measures, spacing)
  )

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

function systemVerticalSpace(
  measures: Measure[],
  lyricScale: number,
  metrics: Pick<LayoutMetrics, 'systemHeight'>
): SystemVerticalSpace {
  const { highestLine, lowestLine } = systemPitchExtremes(measures)
  const noteBelow = Math.max(
    0,
    MIN_LINE_WITHOUT_EXTRA_SPACE - (lowestLine - STEM_SPACE_LINES)
  ) * STAFF_LINE_SPACING
  const lyricBelow = Math.max(
    0,
    systemLyricBottom(measures, lyricScale) - metrics.systemHeight
  )

  return {
    above: Math.max(
      0,
      highestLine + STEM_SPACE_LINES - MAX_LINE_WITHOUT_EXTRA_SPACE
    ) * STAFF_LINE_SPACING,
    below: Math.max(noteBelow, lyricBelow)
  }
}

function systemLyricBottom(measures: Measure[], lyricScale: number): number {
  const maxLyricLine = measures.reduce(
    (maxLine, measure) =>
      Math.max(
        maxLine,
        ...measure.voices.flatMap((voice) =>
          voice.events.flatMap((event) =>
            event.type === 'note'
              ? (event.lyrics ?? []).map((lyric, index) =>
                  Math.max(1, lyric.number ?? index + 1)
                )
              : []
          )
        )
      ),
    0
  )

  if (maxLyricLine === 0) {
    return 0
  }

  return (
    LYRIC_BASELINE_OFFSET * lyricScale +
    (maxLyricLine - 1) * LYRIC_LINE_GAP * lyricScale +
    LYRIC_FONT_SIZE * lyricScale +
    LYRIC_BOTTOM_PADDING
  )
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
  availableWidth: number,
  justifySystem: boolean,
  spacing: LayoutSpacing
): number[] {
  if (measures.length === 0) {
    return []
  }

  const minimumWidths = measures.map((measure, index) =>
    measureMinimumWidth(measure, measures[index - 1], index === 0, spacing)
  )
  const totalMinimumWidth = minimumWidths.reduce((sum, width) => sum + width, 0)
  const scale = totalMinimumWidth > availableWidth
    ? availableWidth / totalMinimumWidth
    : 1
  const baseWidths = minimumWidths.map((width) => width * scale)

  if (!justifySystem || totalMinimumWidth >= availableWidth) {
    return baseWidths
  }

  const baseWidthTotal = baseWidths.reduce((sum, width) => sum + width, 0)
  const remainingWidth = Math.max(0, availableWidth - baseWidthTotal)
  const weights = measures.map(measureSpacingWeight)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

  return weights.map(
    (weight, index) =>
      baseWidths[index] + remainingWidth * (weight / totalWeight)
  )
}

function systemMinimumWidth(
  measures: Measure[],
  spacing: LayoutSpacing
): number {
  return measures.reduce(
    (sum, measure, index) =>
      sum + measureMinimumWidth(measure, measures[index - 1], index === 0, spacing),
    0
  )
}

function measureMinimumWidth(
  measure: Measure,
  previousMeasure: Measure | undefined,
  isSystemStart: boolean,
  spacing: LayoutSpacing
): number {
  const rhythmWeight = measureSpacingWeight(measure)
  const voiceCount = Math.max(1, measure.voices.length)
  const maxEventCount = Math.max(
    0,
    ...measure.voices.map((voice) => voice.events.length)
  )
  const baseWidth = sparseMeasureWidth(measure, rhythmWeight, spacing)
  const eventCrowdingWidth = Math.max(0, maxEventCount - 3) * EVENT_CROWDING_WIDTH
  const voiceWidth = Math.max(0, voiceCount - 1) * 80
  const denseRhythmWidth = Math.max(0, rhythmWeight - 4) * DENSE_RHYTHM_WIDTH
  const leadingModifierWidth = leadingNotationPadding(measure, {
    showsClef:
      isSystemStart || !previousMeasure || !sameClef(previousMeasure, measure),
    showsKeySignature:
      isSystemStart || !previousMeasure || !sameKeySignature(previousMeasure, measure),
    showsTimeSignature:
      isSystemStart || !previousMeasure || !sameTimeSignature(previousMeasure, measure)
  })

  return (
    baseWidth +
    leadingModifierWidth +
    eventCrowdingWidth +
    voiceWidth +
    denseRhythmWidth
  )
}

export function leadingNotationPadding(
  measure: Measure,
  leadingNotation: {
    showsClef: boolean
    showsKeySignature: boolean
    showsTimeSignature: boolean
  }
): number {
  if (
    !leadingNotation.showsClef &&
    !leadingNotation.showsKeySignature &&
    !leadingNotation.showsTimeSignature
  ) {
    return 0
  }

  const keyAccidentalCount = leadingNotation.showsKeySignature
    ? Math.min(7, Math.abs(measure.keySignature.fifths))
    : 0
  const padding =
    LEADING_NOTATION_BASE_PADDING +
    (leadingNotation.showsClef ? CLEF_PADDING : 0) +
    keyAccidentalCount * KEY_SIGNATURE_ACCIDENTAL_PADDING +
    (leadingNotation.showsTimeSignature ? TIME_SIGNATURE_PADDING : 0)

  return Math.min(MAX_LEADING_NOTATION_PADDING, padding)
}

function sameClef(previous: Measure, current: Measure): boolean {
  return (
    previous.clef.sign === current.clef.sign &&
    previous.clef.line === current.clef.line
  )
}

function sameKeySignature(previous: Measure, current: Measure): boolean {
  return (
    previous.keySignature.fifths === current.keySignature.fifths &&
    previous.keySignature.mode === current.keySignature.mode
  )
}

function sameTimeSignature(previous: Measure, current: Measure): boolean {
  return (
    previous.timeSignature.beats === current.timeSignature.beats &&
    previous.timeSignature.beatType === current.timeSignature.beatType
  )
}

function sparseMeasureWidth(
  measure: Measure,
  rhythmWeight: number,
  spacing: LayoutSpacing
): number {
  const events = measure.voices[0]?.events ?? []
  const isFullRestOnly =
    events.length === 1 &&
    events[0].type === 'rest' &&
    Boolean(events[0].fullMeasure)

  if (isFullRestOnly) {
    return spacing.minSparseMeasureWidth
  }

  return Math.min(
    MIN_MEASURE_WIDTH,
    spacing.minSparseMeasureWidth + Math.max(0, rhythmWeight - 1) * 14
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
