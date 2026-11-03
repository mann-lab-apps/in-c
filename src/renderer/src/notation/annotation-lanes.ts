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
// Rehearsal offsets anchor a 24px box; neighboring text offsets are baselines.
const REHEARSAL_TO_TEXT_GAP = 44
const REHEARSAL_ROW_GAP = 28

export interface MeasureAnnotationLaneInput {
  expressionTextCount?: number
  harmonyCount?: number
  harmonyTicks?: readonly number[]
  dynamicExtraSpacing?: number
  hasDynamic?: boolean
  hasHairpin?: boolean
  hasRehearsalMark?: boolean
  rehearsalMarkCount?: number
  hasStaffText?: boolean
  staffTextCount?: number
  lyricLineCount?: number
  lyricScale?: number
  lyricExtraSpacing?: number
  systemTextCount?: number
  tempoCount?: number
}

export interface MeasureAnnotationLanes {
  dynamicMarkYOffset?: number
  expressionTextYOffsets: number[]
  hairpinYOffset?: number
  harmonyMarkYOffsets: number[]
  rehearsalMarkYOffset?: number
  rehearsalMarkYOffsets?: number[]
  requiredAbove: number
  requiredBelow: number
  staffTextYOffset?: number
  staffTextYOffsets?: number[]
  systemTextYOffsets: number[]
  tempoYOffsets: number[]
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
  harmonyTicks,
  hasDynamic = false,
  dynamicExtraSpacing = 0,
  hasHairpin = false,
  hasRehearsalMark = false,
  rehearsalMarkCount,
  hasStaffText = false,
  staffTextCount,
  lyricLineCount = 0,
  lyricScale = 1,
  lyricExtraSpacing = 0,
  systemTextCount = 0,
  tempoCount = 0
}: MeasureAnnotationLaneInput): MeasureAnnotationLanes {
  let systemTextYOffsets = createSystemTextYOffsets(systemTextCount)
  const count = staffTextCount ?? (hasStaffText ? 1 : 0)
  const staffTextYOffset = count > 0
    ? harmonyCount > 0
      ? STAFF_TEXT_Y_OFFSET + 10
      : STAFF_TEXT_Y_OFFSET
    : undefined
  const staffTextYOffsets = Array.from({length:count},(_,index)=>
    staffTextYOffset! - (count-1-index)*SYSTEM_TEXT_LINE_GAP)
  const rehearsalCount = rehearsalMarkCount ?? (hasRehearsalMark ? 1 : 0)
  const harmonyMarkYOffsets = createHarmonyMarkYOffsets(
    harmonyCount,
    rehearsalCount > 0,
    staffTextYOffsets[0],
    harmonyTicks
  )
  // Extra staff-text rows occupy the same upper stack as chords/system text.
  // Keep existing single-row geometry, and raise only a competing system stack.
  if(count>1&&systemTextYOffsets.length){
    const last=Math.min(SYSTEM_TEXT_Y_OFFSET,Math.min(...staffTextYOffsets,...harmonyMarkYOffsets)-SYSTEM_TEXT_LINE_GAP)
    const shift=last-SYSTEM_TEXT_Y_OFFSET
    systemTextYOffsets=systemTextYOffsets.map(offset=>offset+shift)
  }
  const rehearsalMarkYOffset = resolveRehearsalMarkYOffset(
    rehearsalCount > 0,
    harmonyMarkYOffsets,
    systemTextYOffsets,
    staffTextYOffsets
  )
  const rehearsalMarkYOffsets = Array.from({length:rehearsalCount},(_,index)=>
    rehearsalMarkYOffset! - (rehearsalCount-1-index)*REHEARSAL_ROW_GAP)
  const extra = lyricLineCount > 0 && Number.isFinite(lyricExtraSpacing) ? Math.max(0, lyricExtraSpacing) : 0
  const lyricBottom = resolveLyricBottom(lyricLineCount, lyricScale) + extra
  let lowerCursor = Math.max(
    DYNAMIC_MARK_Y_OFFSET,
    lyricBottom > 0 ? lyricBottom + LYRIC_TO_ANNOTATION_GAP : 0
  ) + (hasDynamic && Number.isFinite(dynamicExtraSpacing) ? Math.max(0,dynamicExtraSpacing) : 0)
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
    ...rehearsalMarkYOffsets,
    ...harmonyMarkYOffsets.map((offset) => offset - UPPER_TOP_PADDING),
    ...staffTextYOffsets.map(offset=>offset-UPPER_TOP_PADDING)
  ].filter((offset): offset is number => offset !== undefined)
  const tempoYOffsets = Array.from({ length: tempoCount }, (_, index) =>
    Math.min(-42, Math.min(0, ...upperOffsets) - 16) - index * 24
  )
  upperOffsets.push(...tempoYOffsets.map((offset) => offset - 18))
  const lowerOffsets = [
    extra > 0 ? lyricBottom : undefined,
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
    rehearsalMarkYOffsets,
    requiredAbove:
      upperOffsets.length > 0 ? Math.abs(Math.min(...upperOffsets)) : 0,
    requiredBelow: Math.max(SYSTEM_HEIGHT_BASELINE, ...lowerOffsets),
    staffTextYOffset,
    staffTextYOffsets,
    systemTextYOffsets,
    tempoYOffsets
  }
}

export function resolveAnnotationSystemTop(
  defaultTop: number,
  lanes: Iterable<MeasureAnnotationLanes>,
  hasHeader: boolean
): number {
  const allLanes = [...lanes]
  const extension = resolveAnnotationVerticalExtension(allLanes)
  return Math.max(
    defaultTop + extension.above,
    (hasHeader ? 60 : 12) + Math.max(0, ...allLanes.map((lane) => lane.requiredAbove))
  )
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
  staffTextYOffset: number | undefined,
  ticks?: readonly number[]
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
  if (ticks?.length === count) {
    const groups = new Map<number, number[]>()
    ticks.forEach((tick,index) => {
      const group = groups.get(tick)
      if (group) group.push(index)
      else groups.set(tick,[index])
    })
    const offsets = new Array<number>(count)
    for (const indices of groups.values()) indices.forEach((index,rank) => {
      offsets[index] = lastOffset - (indices.length - 1 - rank) * SYSTEM_TEXT_LINE_GAP
    })
    return offsets
  }
  const firstOffset = lastOffset - Math.max(0, count - 1) * SYSTEM_TEXT_LINE_GAP

  return Array.from(
    { length: count },
    (_, index) => firstOffset + index * SYSTEM_TEXT_LINE_GAP
  )
}

function resolveRehearsalMarkYOffset(
  hasRehearsalMark: boolean,
  harmonyMarkYOffsets: number[],
  systemTextYOffsets: number[],
  staffTextYOffsets: number[]
): number | undefined {
  if (!hasRehearsalMark) {
    return undefined
  }

  const firstHarmonyOffset = harmonyMarkYOffsets.length ? Math.min(...harmonyMarkYOffsets) : undefined

  const harmonyAwareOffset = Math.min(
    REHEARSAL_MARK_Y_OFFSET,
    firstHarmonyOffset === undefined ? REHEARSAL_MARK_Y_OFFSET : firstHarmonyOffset - REHEARSAL_TO_TEXT_GAP
  )
  // Staff-text rows can rise into the rehearsal frame even without chords or
  // system text. Reuse the same box-to-baseline clearance for the whole stack.
  const firstSystemTextOffset = [...systemTextYOffsets,...staffTextYOffsets].length
    ? Math.min(...systemTextYOffsets,...staffTextYOffsets)
    : undefined

  return firstSystemTextOffset === undefined
    ? harmonyAwareOffset
    : Math.min(harmonyAwareOffset, firstSystemTextOffset - REHEARSAL_TO_TEXT_GAP)
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
