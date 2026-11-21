import { measureDurationTicks, timeSignatureDurationTicks, validateMeasureRhythm,
  type Measure, type Score, type ScoreCommand } from '../../../score-core'

export const firstMeasurePickupIssues = {
  missing: '모든 보표에 첫 마디가 있어야 합니다.',
  meter: '모든 보표의 첫 마디 박자표가 같아야 합니다.',
  timing: '모든 보표의 첫 마디 실제 길이가 같아야 합니다.',
  occupied: '모든 보표의 첫 마디는 성부마다 한 개의 온마디 쉼표여야 합니다. 음표·분할 쉼표·잇단음표가 있는 마디는 바꾸지 않습니다.',
  length: '못갖춘 길이는 현재 박자표의 한 마디보다 짧은 양의 길이여야 합니다.',
  anchor: '줄어든 길이 밖에 빠르기·코드·표현 글자·페달 위치가 있습니다. 원본 표기를 확인해 주세요.'
} as const
type Issue = keyof typeof firstMeasurePickupIssues

export function inspectEmptyFirstMeasures(score: Score): { first?: Measure; issue?: Issue } {
  const staves = score.parts.flatMap(part => part.staves)
  if (!staves.length || staves.some(staff => !staff.measures.length)) return { issue: 'missing' }
  const first = staves[0].measures[0], bars = staves.map(staff => staff.measures[0])
  if (bars.some(bar => bar.timeSignature.beats !== first.timeSignature.beats ||
    bar.timeSignature.beatType !== first.timeSignature.beatType)) return { first, issue: 'meter' }
  if (bars.some(bar => bar.timing.type !== first.timing.type ||
    measureDurationTicks(bar) !== measureDurationTicks(first))) return { first, issue: 'timing' }
  if (bars.some(bar => !bar.voices.length || !validateMeasureRhythm(bar).isExact || bar.voices.some(voice =>
    voice.events.length !== 1 || voice.events[0].type !== 'rest' || !voice.events[0].fullMeasure ||
    voice.events[0].position.tick !== 0 || Boolean(voice.events[0].duration.tuplet) || Boolean(voice.tuplets?.length)))) {
    return { first, issue: 'occupied' }
  }
  return { first }
}

export function buildEmptyFirstMeasurePickupCommand(score: Score, durationTicks?: number): {
  command?: ScoreCommand; issue?: Issue; unchanged?: true
} {
  const { first, issue } = inspectEmptyFirstMeasures(score)
  if (issue || !first) return { issue: issue ?? 'missing' }
  const nominal = timeSignatureDurationTicks(first.timeSignature)
  if (durationTicks !== undefined && (!Number.isInteger(durationTicks) || durationTicks <= 0 || durationTicks >= nominal)) {
    return { issue: 'length' }
  }
  const timing: Measure['timing'] = durationTicks === undefined ? { type: 'regular' } : { type: 'pickup', durationTicks }
  if (first.timing.type === timing.type && (timing.type === 'regular' ||
    first.timing.type === 'pickup' && first.timing.durationTicks === timing.durationTicks)) return { unchanged: true }
  const targetIds = new Set(score.parts.flatMap(part => part.staves.flatMap(staff => {
    const bar = staff.measures[0]
    return [bar.id, `measure-${bar.number}`]
  })))
  const limit = durationTicks ?? nominal
  const tickAnchors = [...(score.tempoEvents ?? []), ...(score.harmonies ?? []),
    ...(score.expressionTexts ?? []), ...(score.pedalEvents ?? [])]
  if (tickAnchors.some(mark => targetIds.has(mark.measureId) && mark.tick > limit)) return { issue: 'anchor' }
  // staff-measures.replace renumbers all bars. Preserve imported numbering and
  // every authored object by reusing the existing whole-parts undo command.
  return { command: { type: 'score-parts.replace', parts: score.parts.map(part => ({ ...part,
    staves: part.staves.map(staff => ({ ...staff, measures: staff.measures.map((bar, index) =>
      index === 0 ? { ...bar, timing: { ...timing } } : bar) })) })) } }
}
