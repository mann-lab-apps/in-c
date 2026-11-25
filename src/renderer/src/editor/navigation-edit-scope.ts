import { createScoreRepeatPlaybackPlan, measureDurationTicks, type NavigationMark, type Score } from '../../../score-core'
import { createPartOptionLabels } from './part-option-labels'

export const navigationTypeOptions = [
  { value: 'segno', label: '세뇨' },
  { value: 'coda', label: '코다' },
  { value: 'dacapo', label: 'D.C.' },
  { value: 'dalsegno', label: 'D.S.' },
  { value: 'fine', label: 'Fine' },
  { value: 'tocoda', label: 'To Coda' }
] as const satisfies readonly { value: NavigationMark['type']; label: string }[]

export interface NavigationEditEntry {
  id: string
  index: number
  measureId: string
  name: string
  mark: NavigationMark
}

export function resolveNavigationEditScope(score: Score, measureId: string) {
  const parts = createPartOptionLabels(score.parts)
  const staves = score.parts.flatMap((part, partIndex) => part.staves.map((staff, staffIndex) => ({
    staff, label: `${parts[partIndex]} · 보표 ${staffIndex + 1}`
  })))
  const matching = staves.flatMap(owner => owner.staff.measures.flatMap((measure, index) =>
    measure.id === measureId ? [{ owner, index }] : []))
  if (matching.length !== 1) return undefined
  const [{ owner, index }] = matching
  const first = staves[0]
  const durations = first.staff.measures.map(measureDurationTicks)
  const aligned = staves.every(({ staff }) => staff.measures.length === durations.length &&
    staff.measures.every((measure, bar) => measureDurationTicks(measure) === durations[bar]))
  const candidates = aligned ? staves : [owner]
  const ids = staves.flatMap(({ staff }) => staff.measures.map(measure => measure.id))
  const isAddressable = (id: string) => ids.indexOf(id) === ids.lastIndexOf(id)
  const rows = candidates.flatMap(({ staff, label }) => {
    const measure = staff.measures[index]
    if (!isAddressable(measure.id)) return []
    return (measure.navigation ?? []).map((mark, index): NavigationEditEntry => ({
      id: JSON.stringify([measure.id, index]),
      index, measureId: measure.id, mark,
      name: `${navigationTypeOptions.find(option => option.value === mark.type)?.label} · ${label} · ${measure.number}마디${(measure.navigation?.length ?? 0) > 1 ? ` · ${index + 1}` : ''}`
    }))
  })
  const target = first.staff.measures[index]
  const add = aligned && isAddressable(target.id) && (target.navigation?.length ?? 0) < 100
    ? { measureId: target.id, number: target.number, label: first.label } : undefined
  const marks = staves.flatMap(({ staff }) => staff.measures.flatMap(measure => measure.navigation ?? []))
  const labels = (type: 'segno' | 'coda') => [...new Set(marks.flatMap(mark =>
    mark.type === type ? [mark.label] : []))]
  return {
    rows, add, segnoLabels: labels('segno'), codaLabels: labels('coda'),
    disabledReason: aligned ? '이 마디에는 새 이동 표지를 추가할 수 없습니다.' : '모든 보표의 마디 길이와 개수가 일치해야 이동 표지를 추가할 수 있습니다.',
    playbackIssue: marks.length ? createScoreRepeatPlaybackPlan(score)?.navigationIssue : undefined
  }
}

export type NavigationEditScope = NonNullable<ReturnType<typeof resolveNavigationEditScope>>
