import type { Score } from '../../../score-core'
import { countMeasureLyricLines, type MeasureAnnotationLanes } from './annotation-lanes'
import { lyricDisplayText } from './lyric-spacing'
import { resolvePartLabel } from './part-label-layout'

export interface TextInkMetrics { y: number; height: number }
export type MeasureTextInk = (className: string, text: string) => TextInkMetrics | undefined
export interface StaffAnnotationSpacing {
  offsets: number[]
  labelBaselines: number[]
  requiredAbove: number
  requiredBelow: number
  minimumSystemHeight: number
  measured: boolean
}

// Layout-only text envelopes. No source/staff/span geometry is written back.
// A missing font measurement retains the existing layout rather than guessing ink.
export function createStaffAnnotationSpacing(
  score: Score,
  lanes: ReadonlyMap<string, MeasureAnnotationLanes>,
  measureInk: MeasureTextInk,
  lyricScale = 1,
  lyricOffsets: ReadonlyMap<number, number> = new Map()
): StaffAnnotationSpacing {
  const targets = score.parts.flatMap(part => part.staves.map((staff, staffIndex) => ({
    staff, staffIndex, partName: part.name, partAbbreviation: part.abbreviation
  })))
  const fallback: StaffAnnotationSpacing = {
    offsets: targets.map((_, index) => index * 96),
    labelBaselines: targets.map(() => -12),
    requiredAbove: 0, requiredBelow: 154,
    minimumSystemHeight: 154 + Math.max(0, targets.length - 1) * 96, measured: false
  }
  if (!targets.length) return fallback
  const singleStaff = targets.length === 1
  // A shared-width reflow can put the next system's upper text into the
  // preceding lyric lane even in a one-staff score. Lyric-only spacing keeps
  // its established path; measure the competing upper/lower envelopes here.
  if (singleStaff && !(Number.isFinite(lyricOffsets.get(0)) && (lyricOffsets.get(0) ?? 0) > 0) && (!targets[0].staff.measures.some(m => (lanes.get(m.id)?.requiredAbove ?? 0) > 0)
    || !targets[0].staff.measures.some(m => countMeasureLyricLines(m) > 0))) return fallback
  const envelopes: Array<{ top: number; bottom: number; labelBaseline: number }> = []
  let missing = false
  const ink = (kind: string, text: string) => {
    const result = measureInk(kind, text)
    if (!result || !Number.isFinite(result.y) || !Number.isFinite(result.height) || result.height <= 0) {
      missing = true
      return { y: 0, height: 0 }
    }
    return result
  }
  for (const [targetIndex, target] of targets.entries()) {
    const offset = lyricOffsets.get(targetIndex) ?? 0
    const lyricOffset = Number.isFinite(offset) ? Math.max(0, offset) : 0
    let top = 0, bottom = 80, hasUpper = false
    const include = (kind: string, text: string, baseline: number, side: 'upper' | 'lower') => {
      const measured = ink(kind, text)
      top = Math.min(top, baseline + measured.y)
      bottom = Math.max(bottom, baseline + measured.y + measured.height)
      if (side === 'upper') hasUpper = true
    }
    for (const measure of target.staff.measures) {
      const lane = lanes.get(measure.id)
      if (!lane) continue
      top = Math.min(top, -lane.requiredAbove)
      if (lane.requiredAbove > 0) hasUpper = true
      for(const [index,staffText]of(score.staffTexts??[]).filter(text=>text.measureId===measure.id).entries()){
        include('notation-staff-text',staffText.text,lane.staffTextYOffsets?.[index]??lane.staffTextYOffset??-24,'upper')
      }
      for (const [index, harmony] of (score.harmonies ?? []).filter(mark => mark.measureId === measure.id).entries()) {
        include('notation-harmony-mark', harmony.text, lane.harmonyMarkYOffsets[index] ?? -42, 'upper')
      }
      for (const [index, text] of (score.systemTexts ?? []).filter(mark => mark.measureId === measure.id).entries()) {
        include('notation-system-text', text.text, lane.systemTextYOffsets[index] ?? -84, 'upper')
      }
      for (const [index, text] of (score.expressionTexts ?? []).filter(mark => mark.measureId === measure.id).entries()) {
        include('notation-expression-text', text.text, lane.expressionTextYOffsets[index] ?? 148, 'lower')
      }
      const dynamic = score.dynamics?.find(mark => mark.measureId === measure.id)
      if (dynamic) include('notation-dynamic-mark', dynamic.value, lane.dynamicMarkYOffset ?? 122, 'lower')
      if (lane.hairpinYOffset !== undefined) bottom = Math.max(bottom, lane.hairpinYOffset + 8)
      if (countMeasureLyricLines(measure)) for (const voice of measure.voices) for (const event of voice.events) {
        if (event.type !== 'note') continue
        for (const [index, lyric] of (event.lyrics ?? []).entries()) {
          include('notation-lyric', lyricDisplayText(lyric), (116 + (Math.max(1, lyric.number ?? index + 1) - 1) * 16) * lyricScale + lyricOffset, 'lower')
        }
      }
    }
    let labelBaseline = -12
    const labels = new Set([resolvePartLabel(target,0),resolvePartLabel(target,1)].filter((text):text is string=>text!==undefined))
    if (!singleStaff && labels.size) {
      const measured=[...labels].map(text=>ink('notation-staff-label',text))
      const labelTop=Math.min(...measured.map(label=>label.y))
      const labelBottom=Math.max(...measured.map(label=>label.y+label.height))
      labelBaseline = hasUpper ? Math.min(-12, top - 6 - labelBottom) : -12
      top = Math.min(top, labelBaseline + labelTop)
      bottom = Math.max(bottom, labelBaseline + labelBottom)
    }
    envelopes.push({ top, bottom, labelBaseline })
  }
  if (missing) return fallback
  const offsets = [0]
  for (let index = 1; index < envelopes.length; index++) {
    offsets.push(offsets[index - 1] + Math.max(96, envelopes[index - 1].bottom - envelopes[index].top + 8))
  }
  const requiredAbove = -Math.min(0, ...envelopes.map((envelope, index) => envelope.top + offsets[index]))
  const requiredBelow = Math.max(154, ...envelopes.map(envelope => envelope.bottom))
  return {
    offsets, labelBaselines: envelopes.map(envelope => envelope.labelBaseline),
    requiredAbove, requiredBelow,
    minimumSystemHeight: singleStaff
      ? Math.max(154, envelopes[0].bottom + requiredAbove + 8)
      : (offsets.at(-1) ?? 0) + requiredBelow + requiredAbove + 8,
    measured: true
  }
}
