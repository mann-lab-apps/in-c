import type { Score, Staff } from '../../../score-core'
import type { MeasurePlacement } from './system-layout'
import { projectGlobalAnnotationsForRendering } from './global-annotation-projection'
import {
  countMeasureLyricLines, resolveAnnotationSystemTop, resolveMeasureAnnotationLanes,
  type MeasureAnnotationLaneInput
} from './annotation-lanes'

export function createScoreAnnotationLanes(score: Score, lyricScale: number, lowerOffsets: ReadonlyMap<string, number> = new Map(),
  hairpinStackOffsets: ReadonlyMap<string, number> = new Map()) {
  score = projectGlobalAnnotationsForRendering(score)
  const inputs = new Map<string, MeasureAnnotationLaneInput>()
  const inputFor = (id: string) => {
    if (!inputs.has(id)) inputs.set(id, {})
    return inputs.get(id)!
  }
  const count = (items: { measureId: string }[] | undefined, field: 'harmonyCount' | 'expressionTextCount' | 'systemTextCount' | 'tempoCount' | 'rehearsalMarkCount' | 'staffTextCount' | 'dynamicCount') => {
    for (const item of items ?? []) { const input = inputFor(item.measureId); input[field] = (input[field] ?? 0) + 1 }
  }
  count(score.harmonies, 'harmonyCount'); count(score.expressionTexts, 'expressionTextCount')
  count(score.systemTexts, 'systemTextCount'); count(score.tempoEvents, 'tempoCount')
  count(score.dynamics, 'dynamicCount')
  count(score.staffTexts, 'staffTextCount')
  count(score.rehearsalMarks, 'rehearsalMarkCount')
  const anchors = new Map<string, { staff: Staff; index: number }>()
  for (const part of score.parts) for (const staff of part.staves) staff.measures.forEach((measure, index) => {
    for (const voice of measure.voices) for (const event of voice.events) anchors.set(event.id, { staff, index })
  })
  for (const span of score.hairpins ?? []) {
    const start = anchors.get(span.startEventId), end = anchors.get(span.endEventId)
    if (start && end && start.staff === end.staff) {
      for (const measure of start.staff.measures.slice(Math.min(start.index, end.index), Math.max(start.index, end.index) + 1)) inputFor(measure.id).hasHairpin = true
    } else {
      for (const anchor of [start, end]) if (anchor) inputFor(anchor.staff.measures[anchor.index]!.id).hasHairpin = true
    }
  }
  return new Map(score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures.map(measure => [measure.id,
    resolveMeasureAnnotationLanes({ ...inputs.get(measure.id), lowerOffset: lowerOffsets.get(measure.id), hairpinStackOffset: hairpinStackOffsets.get(measure.id), lyricScale, lyricLineCount: countMeasureLyricLines(measure) })
  ] as const))))
}

export function resolveScoreVerticalLayout(score: Score, lyricScale: number, baseHeight: number, baseTop: number,
  staffInkBounds: ReadonlyMap<number, { top: number; bottom: number }> = new Map(),
  lowerOffsets: ReadonlyMap<string, number> = new Map(),
  hairpinStackOffsets: ReadonlyMap<string, number> = new Map(),
  measureIndices?: ReadonlySet<number>) {
  const lanesByMeasureId = createScoreAnnotationLanes(score, lyricScale, lowerOffsets, hairpinStackOffsets)
  const staves = score.parts.flatMap(part => part.staves)
  const localMeasures = staves.map(staff => staff.measures.filter((_, index) => !measureIndices || measureIndices.has(index)))
  const staffLanes = localMeasures.map(measures => measures.map(measure => lanesByMeasureId.get(measure.id)!))
  const extents = staffLanes.map((lanes, index) => ({
    above: Math.max(20, ...lanes.map(lane => lane.requiredAbove), ...localMeasures[index]!.flatMap(measure =>
      measure.voices.flatMap(voice => voice.events.map(event => Math.max(
        event.fermata ? 60 : 0,
        event.breathMark ? 40 : 0,
        // Ornament ink rises above its baseline, and sits higher above a fermata.
        event.type === 'note' && event.ornaments?.length ? (event.fermata ? 80 : 56) : 0
      ))))),
    below: Math.max(80, ...lanes.map(lane => lane.contentBottom))
  }))
  const staffByEvent = new Map<string, number>()
  staves.forEach((staff, index) => { for (const measure of staff.measures) for (const voice of measure.voices) for (const event of voice.events) staffByEvent.set(event.id, index) })
  // Reserve an envelope for manual geometry before assigning system/page positions.
  for (const kind of ['slurs', 'hairpins'] as const) for (const span of score[kind] ?? []) {
    const index = staffByEvent.get(span.startEventId)
    if (index === undefined || staffByEvent.get(span.endEventId) !== index || !span.engraving) continue
    const extent = extents[index]!
    for (const geometry of [span.engraving, ...(span.engraving.segments ?? []).map(segment => segment.geometry)]) {
      const offset = (geometry?.offsetY ?? 0) * 10
      if (kind === 'hairpins') {
        const baseline = geometry?.placement === 'above' ? -34 : Math.max(126, ...staves[index]!.measures.map(measure => lanesByMeasureId.get(measure.id)!.hairpinYOffset ?? 0))
        const halfHeight = geometry?.height === undefined ? 10 : geometry.height * 5
        extent.above = Math.max(extent.above, -(baseline + offset - halfHeight))
        extent.below = Math.max(extent.below, baseline + offset + halfHeight)
      } else {
        const height = geometry?.height === undefined ? 22 : geometry.height * 10
        if (geometry?.placement !== 'below') extent.above = Math.max(extent.above, height - 20 - offset)
        if (geometry?.placement !== 'above') extent.below = Math.max(extent.below, 100 + offset + height)
      }
    }
  }
  // Inner staff gaps use measured contours; outer system ink has its own layout pass.
  for (const [index, ink] of staffInkBounds) {
    const extent = extents[index]
    if (!extent) continue
    if (index > 0) extent.above = Math.max(extent.above, -ink.top)
    if (index < staves.length - 1) extent.below = Math.max(extent.below, ink.bottom)
  }
  const staffOffsets = [0]
  for (let index = 1; index < staves.length; index++) {
    const previousBottom = extents[index - 1]!.below
    const nextAbove = extents[index]!.above
    staffOffsets.push(staffOffsets[index - 1]! + Math.max(96, previousBottom + nextAbove + 12))
  }
  const lastBelow = Math.max(154, ...(staffLanes.at(-1) ?? []).map(lane => lane.requiredBelow))
  return {
    lanesByMeasureId, staffOffsets,
    // Keep the page/header margin separate from extra space reserved for annotation lanes.
    topInkPadding: Math.max(baseTop, score.tempo || score.rhythmFeel ? 60 : 12),
    systemHeight: staffOffsets.at(-1)! + Math.max(baseHeight + Math.max(0, lastBelow - 154), (extents.at(-1)?.below ?? 80) + (extents[0]?.above ?? 20) + 12),
    systemTop: Math.max(resolveAnnotationSystemTop(baseTop, staffLanes[0] ?? [], Boolean(score.tempo || score.rhythmFeel)), (extents[0]?.above ?? 20) + (score.tempo || score.rhythmFeel ? 60 : 12))
  }
}

export type SystemStaffInkBounds = Map<number, Map<number, { top: number; bottom: number }>>

export function resolveScoreSystemVerticalLayouts(score: Score, placements: readonly MeasurePlacement[],
  lyricScale: number, baseHeight: number, baseTop: number,
  staffInkBounds: SystemStaffInkBounds = new Map(), lowerOffsets: ReadonlyMap<string, number> = new Map(),
  hairpinStackOffsets: ReadonlyMap<string, number> = new Map()) {
  const measureIndices = new Map((score.parts[0]?.staves[0]?.measures ?? []).map((measure, index) => [measure.id, index]))
  const systems = new Map<number, Set<number>>()
  for (const placement of placements) {
    const index = measureIndices.get(placement.measure.id)
    if (index === undefined) continue
    if (!systems.has(placement.systemIndex)) systems.set(placement.systemIndex, new Set())
    systems.get(placement.systemIndex)!.add(index)
  }
  return new Map([...systems].map(([system, indices]) => [system,
    resolveScoreVerticalLayout(score, lyricScale, baseHeight, baseTop,
      staffInkBounds.get(system), lowerOffsets, hairpinStackOffsets, indices)]))
}
