import { scoreRepeatSource, type Score } from '../../../score-core'
import { locateMeasure } from './editor-state'
import { createPartOptionLabels } from './part-option-labels'

// Edit the same aligned sequence already used by playback and the linked part
// projection. Generic clef/key/time edits retain their concrete local address.
export function resolveRepeatEditScope(score: Score, measureId: string) {
  const staves = score.parts.flatMap(part => part.staves)
  const unique = (id: string) => staves.reduce((count, staff) =>
    count + staff.measures.filter(measure => measure.id === id).length, 0) === 1
  if (!unique(measureId)) return undefined
  const requested = locateMeasure(score, measureId)
  if (!requested) return undefined
  const local = staves.find(staff => staff.id === requested.address.staffId &&
    staff.measures.some(measure => measure.id === measureId))
  const index = local?.measures.findIndex(measure => measure.id === measureId) ?? -1
  if (index < 0) return undefined
  const source = scoreRepeatSource(score)
  const target = source?.measures[index] ?? requested.measure
  if (!unique(target.id)) return undefined
  const location = locateMeasure(score, target.id)
  if (!location) return undefined
  const partIndex = score.parts.findIndex(part => part.id === location.address.partId)
  const part = score.parts[partIndex]
  const staffIndex = part.staves.findIndex(staff => staff.id === location.address.staffId)
  const label = `${source ? '총보 공통 반복' : '선택 보표 반복'} · ${createPartOptionLabels(score.parts)[partIndex]} · 보표 ${staffIndex + 1} · ${location.measureNumber}마디`
  return { location, shared: Boolean(source), label }
}
