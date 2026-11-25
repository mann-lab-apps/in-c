import { collectNavigationRepeatSettings, measureDurationTicks, scoreRepeatSource, type Part, type Score } from '../../../score-core'

/** Keep score-wide jumps on their musical bar when their notation owner is removed. */
export function remapRemovedStaffNavigation(score: Score, remaining: Part[]): Part[] | undefined {
  const source = scoreRepeatSource(score)
  if (!source) return remaining

  const original = score.parts.flatMap(part => part.staves)
  const removed = score.parts.flatMap(part => {
    const next = remaining.find(candidate => candidate.id === part.id)
    return part.staves.filter(staff => !next?.staves.some(candidate => candidate.id === staff.id))
  })
  const marked = removed.filter(staff => staff.measures.some(measure =>
    measure.navigation?.length || measure.repeat?.afterJump !== undefined))
  if (!marked.length) return remaining

  const receiver = scoreRepeatSource({ parts: remaining }) ?? remaining[0]?.staves[0]
  const survivors = remaining.flatMap(part => part.staves)
  const durations = source.measures.map(measureDurationTicks)
  if (!receiver || !survivors.every(staff => staff.measures.length === durations.length &&
      staff.measures.every((measure, index) => measureDurationTicks(measure) === durations[index]))) return undefined

  const repeatSettings = collectNavigationRepeatSettings(original, source.measures)
  const measures = receiver.measures.map((measure, index) => {
    const kept = survivors.flatMap(staff => staff.measures[index].navigation ?? [])
    const signatures = new Set(kept.map(mark => JSON.stringify(mark)))
    const navigation = [...(measure.navigation ?? [])]
    for (const staff of marked) {
      for (const mark of staff.measures[index].navigation ?? []) {
        const key = JSON.stringify(mark)
        if (!signatures.has(key)) navigation.push(mark)
        signatures.add(key)
      }
    }
    const afterJump = repeatSettings?.get(index)
    const relocateRepeat = afterJump !== undefined &&
      !survivors.some(staff => {
        const repeat = staff.measures[index].repeat
        return repeat?.end && repeat.afterJump === afterJump
      })
    const relocateMarks = navigation.length !== (measure.navigation?.length ?? 0)
    if (!relocateMarks && !relocateRepeat) return measure
    return {
      ...measure,
      ...(relocateMarks ? { navigation } : {}),
      ...(relocateRepeat ? { repeat: { ...source.measures[index].repeat, afterJump } } : {})
    }
  })
  if (measures.some(measure => (measure.navigation?.length ?? 0) > 100)) return undefined
  if (measures.every((measure, index) => measure === receiver.measures[index])) return remaining
  return remaining.map(part => part.staves.includes(receiver)
    ? { ...part, staves: part.staves.map(staff => staff === receiver ? { ...staff, measures } : staff) }
    : part)
}
