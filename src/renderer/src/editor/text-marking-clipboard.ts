import { measureDurationTicks, type ExpressionText, type Score, type ScoreCommand, type StaffText } from '../../../score-core'

export type TextMarkingType = 'staffTexts' | 'systemTexts' | 'rehearsalMarks' | 'expressionTexts'
export type TextMarkingClipboard =
  | { type: Exclude<TextMarkingType, 'expressionTexts'>; marks: StaffText[] }
  | { type: 'expressionTexts'; marks: ExpressionText[] }

export function isTextMarkingType(type: string): type is TextMarkingType {
  return ['staffTexts', 'systemTexts', 'rehearsalMarks', 'expressionTexts'].includes(type)
}

export function buildTextMarkingClipboard(score: Score, measureId: string, type: TextMarkingType): TextMarkingClipboard | undefined {
  if (type === 'expressionTexts') {
    const marks = score.expressionTexts?.filter(mark => mark.measureId === measureId)
    return marks?.length ? structuredClone({ type, marks }) : undefined
  }
  const marks = score[type]?.filter(mark => mark.measureId === measureId)
  return marks?.length ? structuredClone({ type, marks }) : undefined
}

function replaceTextMarks<T extends StaffText>(current: T[] | undefined, incoming: T[], measureId: string) {
  const marks = [...(current ?? []).filter(mark => mark.measureId !== measureId), ...incoming]
  return marks.length ? marks : undefined
}

function textCommand(score: Score, target: string, clipboard: TextMarkingClipboard): ScoreCommand {
  switch (clipboard.type) {
    case 'staffTexts': return { type: 'score-staff-texts.update', staffTexts: replaceTextMarks(score.staffTexts, clipboard.marks, target) }
    case 'systemTexts': return { type: 'score-system-texts.update', systemTexts: replaceTextMarks(score.systemTexts, clipboard.marks, target) }
    case 'rehearsalMarks': return { type: 'score-rehearsal-marks.update', rehearsalMarks: replaceTextMarks(score.rehearsalMarks, clipboard.marks, target) }
    case 'expressionTexts': return { type: 'score-expression-texts.update', expressionTexts: replaceTextMarks(score.expressionTexts, clipboard.marks, target) }
  }
}

export function buildTextMarkingDeleteCommand(score: Score, measureId: string, type: TextMarkingType): ScoreCommand | undefined {
  const clipboard = buildTextMarkingClipboard(score, measureId, type)
  return clipboard ? textCommand(score, measureId, { ...clipboard, marks: [] }) : undefined
}

export function buildTextMarkingPasteCommand(score: Score, measureId: string, clipboard: TextMarkingClipboard, createId: () => string): ScoreCommand | undefined {
  const targets = score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures.filter(measure => measure.id === measureId)))
  if (targets.length !== 1 || !clipboard.marks.length) return undefined
  // System text has no scoped interchange contract yet; rehearsal marks use system="none".
  if (clipboard.type === 'systemTexts' &&
    !score.parts[0]?.staves[0]?.measures.some(measure => measure.id === measureId)) return undefined
  if (clipboard.type === 'expressionTexts' && clipboard.marks.some(mark =>
    !Number.isInteger(mark.tick) || mark.tick < 0 || mark.tick >= measureDurationTicks(targets[0]))) return undefined
  const ids = new Set([score.tempoEvents, score.harmonies, score.dynamics, score.staffTexts, score.systemTexts,
    score.rehearsalMarks, score.expressionTexts, score.slurs, score.hairpins, score.octaveShifts]
    .flatMap(marks => (marks ?? []).map(mark => mark.id)))
  const copied = structuredClone(clipboard)
  for (const mark of copied.marks) {
    const id = `text-${createId()}`
    if (ids.has(id)) return undefined
    ids.add(id)
    mark.id = id
    mark.measureId = measureId
  }
  return textCommand(score, measureId, copied)
}
