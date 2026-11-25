import { findSimpleRepeatForVolta, locateCoveredVolta, resolveMeasureVoltas, sameVoltaPasses, scoreRepeatSource, type Measure, type Score, type VoltaMark } from '../../../score-core'
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
  const measures = part.staves[staffIndex].measures
  const covered = resolveMeasureVoltas(measures)
  const volta = covered.get(target.id)
  const voltaPassEdit = volta && resolveVoltaPassEdit(measures, index, volta, covered)
  return { location, measures, index, volta, voltaPassEdit, shared: Boolean(source), label }
}

type VoltaEdit = { kind: 'change'; measures: Measure[] } | { kind: 'saved-passes' | 'overlap' }

export function toggleMeasureVolta(
  measures: Measure[], index: number, number: 1 | 2
): VoltaEdit {
  const covered = resolveMeasureVoltas(measures)
  const mark = covered.get(measures[index].id)
  if (mark?.passes) return { kind: 'saved-passes' }

  if (mark) {
    const [start, end] = locateCoveredVolta(measures, index, mark, covered)
    return {
      kind: 'change',
      measures: measures.map((bar, place) => {
        if (place < start || place > end || !bar.volta || !sameVoltaPasses(mark, bar.volta)) return bar
        return {
          ...bar,
          volta: mark.number === number ? undefined : { number, start: bar.volta.start, end: bar.volta.end }
        }
      })
    }
  }

  let repeatEnd: number | undefined
  for (let place = index; place < measures.length; place += 1) {
    const repeat = measures[place].repeat
    // A combined start/end retains its existing role as the closing endpoint.
    if (repeat?.end) {
      repeatEnd = place
      break
    }
    if (place > index && repeat?.start) break
  }
  const end = repeatEnd ?? index
  for (const bar of measures.slice(index, end + 1)) {
    const existing = covered.get(bar.id)
    if (existing) return { kind: existing.passes ? 'saved-passes' : 'overlap' }
  }

  return {
    kind: 'change',
    measures: measures.map((bar, place) => place === index || place === repeatEnd
      ? { ...bar, volta: { number, start: place === index || undefined, end: place === repeatEnd || undefined } }
      : bar)
  }
}

export interface VoltaPassEditScope {
  startIndex: number
  endIndex: number
  repeatCount: number
  afterRepeat: boolean
  label: string
  mark: VoltaMark
}

function resolveVoltaPassEdit(
  measures: Measure[], index: number, mark: VoltaMark, covered: ReadonlyMap<string, VoltaMark>
): VoltaPassEditScope | undefined {
  const [startIndex, endIndex] = locateCoveredVolta(measures, index, mark, covered)
  if (!measures[startIndex].volta?.start) return undefined
  const repeat = findSimpleRepeatForVolta(measures, startIndex, endIndex)
  if (!repeat) return undefined

  const first = measures[startIndex].number, last = measures[endIndex].number
  const span = first === last ? `${first}마디` : `${first}–${last}마디`
  return {
    startIndex, endIndex, mark, afterRepeat: startIndex > repeat.end,
    repeatCount: repeat.count, label: `${span} · 도돌이표 끝 ${measures[repeat.end].number}마디 · ${repeat.count}회`
  }
}

export function parseVoltaPassEdit(
  draft: string, scope: VoltaPassEditScope
): { mark: VoltaMark } | { error: string } {
  if (!/^\s*[1-9]\d*(?:\s*,\s*[1-9]\d*)*\s*$/.test(draft)) {
    return { error: '쉼표로 구분한 회차 번호를 입력하세요. 예 1, 2' }
  }
  const passes = draft.split(',').map(Number).sort((left, right) => left - right)
  if (passes.some(pass => !Number.isSafeInteger(pass) || pass > scope.repeatCount)) {
    return { error: `1–${scope.repeatCount} 사이의 회차를 입력하세요.` }
  }
  if (new Set(passes).size !== passes.length) return { error: '중복된 회차 번호를 지워 주세요.' }
  if (passes.length === 1 && passes[0] === 2 && scope.repeatCount > 2) {
    return { error: '세 번 이상 반복할 때 두 번째 회차만 지정하는 기능은 준비 중입니다.' }
  }
  if (scope.afterRepeat && !passes.includes(scope.repeatCount)) {
    return { error: `도돌이표 뒤의 괄호에는 마지막 회차 ${scope.repeatCount}을 포함하세요.` }
  }
  const pass = passes[0]
  return { mark: passes.length === 1 && (pass === 1 || pass === 2) ? { number: pass } : { passes } }
}

export function updateVoltaPassEdit(measures: Measure[], scope: VoltaPassEditScope, mark: VoltaMark): Measure[] {
  if (sameVoltaPasses(scope.mark, mark)) return measures
  return measures.map((bar, index) => index >= scope.startIndex && index <= scope.endIndex && bar.volta &&
    sameVoltaPasses(bar.volta, scope.mark)
    ? { ...bar, volta: { ...mark, start: bar.volta.start, end: bar.volta.end } }
    : bar
  )
}
