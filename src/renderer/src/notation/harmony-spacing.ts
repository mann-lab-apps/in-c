import { measureDurationTicks, type Measure, type Score } from '../../../score-core'
import { readSvgTextInk, type MeasureInkOwner } from './staff-ink-spacing'
import type { MeasurePlacement } from './system-layout'

export type HarmonySpacingWidths = ReadonlyMap<string, ReadonlyMap<number, number>>

// Distinct in-measure chord times can reserve layout-only rhythmic columns.
// A lone label / coincident stack keeps its previous layout. Never guess a
// different owner or clamp boundary/out-of-bar annotations into this measure.
export function spacedHarmonies(score: Score) {
  const measures = new Map<string, Measure | undefined>()
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    measures.set(measure.id, measures.has(measure.id) ? undefined : measure)
  }
  const eligible = (score.harmonies ?? []).filter(h => {
    const measure = measures.get(h.measureId)
    return measure && Number.isInteger(h.tick) && h.tick >= 0 && h.tick < measureDurationTicks(measure)
  })
  const ticks = new Map<string, Set<number>>()
  for (const h of eligible) {
    const onsets = ticks.get(h.measureId) ?? new Set<number>()
    onsets.add(h.tick); ticks.set(h.measureId, onsets)
  }
  return eligible.filter(h => ticks.get(h.measureId)!.size > 1)
}

export function harmonySpacingByMeasure(score: Score, widths: ReadonlyMap<string, number>): HarmonySpacingWidths {
  const result = new Map<string, Map<number, number>>()
  for (const h of spacedHarmonies(score)) {
    const width = widths.get(h.text)
    if (!width || !Number.isFinite(width) || width <= 0) continue
    const onsets = result.get(h.measureId) ?? new Map<number, number>()
    onsets.set(h.tick, Math.max(onsets.get(h.tick) ?? 0, width)); result.set(h.measureId, onsets)
  }
  return result
}


interface HarmonyInk {
  x: number
  y: number
  width: number
  height: number
  bar: Pick<MeasurePlacement, 'x' | 'width'>
}

// Called for a single staff/system. Nudge only colliding neighbors whose
// full labels fit on their respective sides of the barline.
export function resolveHarmonyBarlineShifts(labels: readonly HarmonyInk[]): number[] {
  const clearance = 4
  const shifts = labels.map(() => 0)
  const overlaps = (a: HarmonyInk, aShift: number, b: HarmonyInk, bShift: number) =>
    a.y < b.y + b.height && b.y < a.y + a.height &&
    a.x + aShift < b.x + bShift + b.width + clearance &&
    b.x + bShift < a.x + aShift + a.width + clearance

  labels.forEach((left, i) => {
    const boundary = left.bar.x + left.bar.width
    labels.forEach((right, j) => {
      if (Math.abs(boundary - right.bar.x) >= 0.02 ||
          !overlaps(left, shifts[i], right, shifts[j])) return
      const leftShift = Math.min(shifts[i], boundary - clearance / 2 - left.x - left.width)
      const rightShift = Math.max(shifts[j], boundary + clearance / 2 - right.x)
      if (left.x + leftShift < left.bar.x || right.x + rightShift + right.width > right.bar.x + right.bar.width) return

      const introducesCollision = labels.some((other, k) => k !== i && k !== j && (
        (leftShift !== shifts[i] && !overlaps(left, shifts[i], other, shifts[k]) && overlaps(left, leftShift, other, shifts[k])) ||
        (rightShift !== shifts[j] && !overlaps(right, shifts[j], other, shifts[k]) && overlaps(right, rightShift, other, shifts[k]))
      ))
      if (!introducesCollision) {
        shifts[i] = leftShift
        shifts[j] = rightShift
      }
    })
  })
  return shifts
}

export function spaceHarmonyInkAcrossBarlines(
  svg: SVGSVGElement,
  owners: ReadonlyMap<string, (MeasureInkOwner & { placement: MeasurePlacement }) | undefined>,
  context: CanvasRenderingContext2D
): void {
  const lanes = new Map<string, (HarmonyInk & { text: SVGTextElement })[]>()
  for (const text of svg.querySelectorAll<SVGTextElement>('.notation-harmony-mark[data-measure-id]')) {
    const owner = owners.get(text.dataset.measureId ?? '')
    const ink = owner && readSvgTextInk(text, context)
    if (!owner || !ink) continue
    const key = `${owner.staffIndex}:${owner.systemIndex}`
    const lane = lanes.get(key) ?? []
    lane.push({ ...ink, text, bar: owner.placement })
    lanes.set(key, lane)
  }
  for (const labels of lanes.values()) {
    resolveHarmonyBarlineShifts(labels).forEach((shift, index) => {
      if (!shift) return
      const { text } = labels[index]
      text.setAttribute('x', String(Number(text.getAttribute('x')) + shift))
      const hit = text.parentElement?.querySelector<SVGRectElement>(':scope > .notation-harmony-hit')
      if (hit) hit.setAttribute('x', String(Number(hit.getAttribute('x')) + shift))
    })
  }
}
