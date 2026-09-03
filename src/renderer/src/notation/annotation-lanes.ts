import type { Measure } from '../../../score-core'

export const SYSTEM_TEXT_Y_OFFSET = -84
export const REHEARSAL_MARK_Y_OFFSET = -62
export const STAFF_TEXT_Y_OFFSET = -24
export const HARMONY_MARK_Y_OFFSET = -42
export const DYNAMIC_MARK_Y_OFFSET = 122
export const EXPRESSION_TEXT_Y_OFFSET = 148
export const HAIRPIN_Y_OFFSET = 126

const SYSTEM_TEXT_LINE_GAP = 16
const LOWER_ANNOTATION_GAP = 22
const HAIRPIN_LANE_GAP = 20
const LYRIC_BASELINE_OFFSET = 116
const LYRIC_LINE_GAP = 16
const LYRIC_FONT_SIZE = 13
const LYRIC_TO_ANNOTATION_GAP = 18
const SYSTEM_HEIGHT_BASELINE = 154
const LOWER_BOTTOM_PADDING = 18
const UPPER_TOP_PADDING = 12

export interface MeasureAnnotationLaneInput {
  expressionTextCount?: number
  harmonyCount?: number
  hasDynamic?: boolean
  hasHairpin?: boolean
  hasRehearsalMark?: boolean
  hasStaffText?: boolean
  lyricLineCount?: number
  lyricScale?: number
  systemTextCount?: number
}

export interface MeasureAnnotationLanes {
  dynamicMarkYOffset?: number
  expressionTextYOffsets: number[]
  hairpinYOffset?: number
  harmonyMarkYOffsets: number[]
  rehearsalMarkYOffset?: number
  requiredAbove: number
  requiredBelow: number
  staffTextYOffset?: number
  systemTextYOffsets: number[]
}

export type SlurSide = 'above' | 'below'

export function countMeasureLyricLines(measure: Measure): number {
  return measure.voices.reduce(
    (maxLine, voice) =>
      Math.max(
        maxLine,
        ...voice.events.flatMap((event) =>
          event.type === 'note'
            ? (event.lyrics ?? []).map((lyric, index) =>
                Math.max(1, lyric.number ?? index + 1)
              )
            : []
        )
      ),
    0
  )
}

export function resolveMeasureAnnotationLanes({
  expressionTextCount = 0,
  harmonyCount = 0,
  hasDynamic = false,
  hasHairpin = false,
  hasRehearsalMark = false,
  hasStaffText = false,
  lyricLineCount = 0,
  lyricScale = 1,
  systemTextCount = 0
}: MeasureAnnotationLaneInput): MeasureAnnotationLanes {
  const systemTextYOffsets = createSystemTextYOffsets(systemTextCount)
  const staffTextYOffset = hasStaffText
    ? harmonyCount > 0
      ? STAFF_TEXT_Y_OFFSET + 10
      : STAFF_TEXT_Y_OFFSET
    : undefined
  const harmonyMarkYOffsets = createHarmonyMarkYOffsets(
    harmonyCount,
    hasRehearsalMark,
    staffTextYOffset
  )
  const rehearsalMarkYOffset = resolveRehearsalMarkYOffset(
    hasRehearsalMark,
    harmonyMarkYOffsets
  )
  const lyricBottom = resolveLyricBottom(lyricLineCount, lyricScale)
  let lowerCursor = Math.max(
    DYNAMIC_MARK_Y_OFFSET,
    lyricBottom > 0 ? lyricBottom + LYRIC_TO_ANNOTATION_GAP : 0
  )
  const dynamicMarkYOffset = hasDynamic ? lowerCursor : undefined

  if (hasDynamic) {
    lowerCursor += LOWER_ANNOTATION_GAP
  }

  const hairpinYOffset = hasHairpin
    ? Math.max(HAIRPIN_Y_OFFSET, lowerCursor)
    : undefined

  if (hasHairpin) {
    lowerCursor = (hairpinYOffset ?? lowerCursor) + HAIRPIN_LANE_GAP
  }

  const expressionStart = Math.max(EXPRESSION_TEXT_Y_OFFSET, lowerCursor)
  const expressionTextYOffsets = Array.from(
    { length: expressionTextCount },
    (_, index) => expressionStart + index * LOWER_ANNOTATION_GAP
  )
  const upperOffsets = [
    ...systemTextYOffsets.map((offset) => offset - UPPER_TOP_PADDING),
    rehearsalMarkYOffset,
    ...harmonyMarkYOffsets.map((offset) => offset - UPPER_TOP_PADDING),
    staffTextYOffset === undefined
      ? undefined
      : staffTextYOffset - UPPER_TOP_PADDING
  ].filter((offset): offset is number => offset !== undefined)
  const lowerOffsets = [
    dynamicMarkYOffset,
    hairpinYOffset === undefined ? undefined : hairpinYOffset + 6,
    ...expressionTextYOffsets.map((offset) => offset + LOWER_BOTTOM_PADDING)
  ].filter((offset): offset is number => offset !== undefined)

  return {
    dynamicMarkYOffset,
    expressionTextYOffsets,
    hairpinYOffset,
    harmonyMarkYOffsets,
    rehearsalMarkYOffset,
    requiredAbove:
      upperOffsets.length > 0 ? Math.abs(Math.min(...upperOffsets)) : 0,
    requiredBelow: Math.max(SYSTEM_HEIGHT_BASELINE, ...lowerOffsets),
    staffTextYOffset,
    systemTextYOffsets
  }
}

export function resolveAnnotationVerticalExtension(
  lanes: Iterable<MeasureAnnotationLanes>
): { above: number; below: number } {
  let requiredAbove = 0
  let requiredBelow = SYSTEM_HEIGHT_BASELINE

  for (const lane of lanes) {
    requiredAbove = Math.max(requiredAbove, lane.requiredAbove)
    requiredBelow = Math.max(requiredBelow, lane.requiredBelow)
  }

  return {
    above: Math.max(0, requiredAbove - 72),
    below: Math.max(0, requiredBelow - SYSTEM_HEIGHT_BASELINE)
  }
}

export function resolveHairpinSpanYOffset(
  lanes: Iterable<MeasureAnnotationLanes | undefined>
): number | undefined {
  const offsets = [...lanes]
    .map((lane) => lane?.hairpinYOffset)
    .filter((offset): offset is number => offset !== undefined)

  return offsets.length > 0 ? Math.max(...offsets) : undefined
}

export function resolveSlurSideForAnnotationLanes(
  preferredSide: SlurSide,
  lanes: Iterable<MeasureAnnotationLanes | undefined>
): SlurSide {
  if (preferredSide === 'above') {
    return preferredSide
  }

  return [...lanes].some(hasLowerAnnotationCompetition)
    ? 'above'
    : preferredSide
}

function hasLowerAnnotationCompetition(
  lanes: MeasureAnnotationLanes | undefined
): boolean {
  if (!lanes) {
    return false
  }

  return (
    lanes.dynamicMarkYOffset !== undefined ||
    lanes.hairpinYOffset !== undefined ||
    lanes.expressionTextYOffsets.length > 0 ||
    lanes.requiredBelow > SYSTEM_HEIGHT_BASELINE
  )
}

function createSystemTextYOffsets(count: number): number[] {
  if (count <= 0) {
    return []
  }

  const firstOffset = SYSTEM_TEXT_Y_OFFSET - (count - 1) * SYSTEM_TEXT_LINE_GAP

  return Array.from(
    { length: count },
    (_, index) => firstOffset + index * SYSTEM_TEXT_LINE_GAP
  )
}

function createHarmonyMarkYOffsets(
  count: number,
  hasRehearsalMark: boolean,
  staffTextYOffset: number | undefined
): number[] {
  if (count <= 0) {
    return []
  }

  const lastOffset =
    staffTextYOffset !== undefined
      ? staffTextYOffset - SYSTEM_TEXT_LINE_GAP
      : hasRehearsalMark
        ? HARMONY_MARK_Y_OFFSET + 12
        : HARMONY_MARK_Y_OFFSET
  const firstOffset = lastOffset - Math.max(0, count - 1) * SYSTEM_TEXT_LINE_GAP

  return Array.from(
    { length: count },
    (_, index) => firstOffset + index * SYSTEM_TEXT_LINE_GAP
  )
}

function resolveRehearsalMarkYOffset(
  hasRehearsalMark: boolean,
  harmonyMarkYOffsets: number[]
): number | undefined {
  if (!hasRehearsalMark) {
    return undefined
  }

  const firstHarmonyOffset = harmonyMarkYOffsets[0]

  if (firstHarmonyOffset === undefined) {
    return REHEARSAL_MARK_Y_OFFSET
  }

  return Math.min(
    REHEARSAL_MARK_Y_OFFSET,
    firstHarmonyOffset - SYSTEM_TEXT_LINE_GAP
  )
}

function resolveLyricBottom(lineCount: number, lyricScale: number): number {
  if (lineCount <= 0) {
    return 0
  }

  return (
    LYRIC_BASELINE_OFFSET * lyricScale +
    (lineCount - 1) * LYRIC_LINE_GAP * lyricScale +
    LYRIC_FONT_SIZE * lyricScale
  )
}
