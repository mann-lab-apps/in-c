import { createMidiWarningScore, midiWarningRestOracle } from './midi-warning-fixture'
import { createNativeProject, validateNativeProject } from '../project/schema'
import { parseHarmonyText } from '../musicxml/harmony-text'

export const textSaveFamilies = ['systemTexts', 'staffTexts', 'rehearsalMarks', 'expressionTexts', 'harmonies'] as const
export type TextSaveFamily = typeof textSaveFamilies[number]
export type TextSaveAction = 'change' | 'remove' | 'cancel' | 'trim-equal'
const labels = { systemTexts: '시스템 텍스트', staffTexts: '보표 글자', rehearsalMarks: '연습표', expressionTexts: '표현 텍스트', harmonies: '코드' }
export const textSaveCases: readonly { family: TextSaveFamily; action: TextSaveAction }[] = [
  ...textSaveFamilies.flatMap(family => (['change', 'remove'] as const).map(action => ({ family, action }))),
  { family: 'systemTexts', action: 'cancel' }, { family: 'systemTexts', action: 'trim-equal' }
]
export function selectedTextSaveDraftFixture(family: TextSaveFamily, action: TextSaveAction) {
  const project = createNativeProject(midiWarningRestOracle(createMidiWarningScore('percussion')))
  project.score.title = 'Selected text draft save'
  const measures = project.score.parts[0]!.staves[0]!.measures
  const marks = ['첫 표기', '두 번째', '다음 마디'].map((text, index) => ({ id: `${family}-${index}`, measureId: measures[index === 2 ? 1 : 0]!.id, text }))
  if (family === 'systemTexts') project.score.systemTexts = marks
  if (family === 'staffTexts') project.score.staffTexts = marks
  if (family === 'rehearsalMarks') project.score.rehearsalMarks = marks
  if (family === 'expressionTexts') project.score.expressionTexts = marks.map(mark => ({ ...mark, tick: 0 }))
  if (family === 'harmonies') project.score.harmonies = marks.map((mark, index) => ({ id: mark.id, measureId: mark.measureId, tick: 0, ...parseHarmonyText(['C7', 'G7', 'Dm7'][index]!)! }))
  const value = family === 'harmonies' ? 'G7' : '두 번째'
  const draft = action === 'remove' ? '' : action === 'trim-equal' ? `  ${value}  ` : family === 'harmonies' ? 'Am7' : '수정 표기'
  const expected = structuredClone(project), changed = action === 'change' || action === 'remove'
  if (changed) {
    const replace = <T extends { id: string; text: string }>(items: T[]) => action === 'remove' ? items.filter(item => item.id !== marks[1]!.id) : items.map(item => item.id === marks[1]!.id ? { ...item, text: draft } : item)
    if (family === 'systemTexts') expected.score.systemTexts = replace(expected.score.systemTexts!)
    if (family === 'staffTexts') expected.score.staffTexts = replace(expected.score.staffTexts!)
    if (family === 'rehearsalMarks') expected.score.rehearsalMarks = replace(expected.score.rehearsalMarks!)
    if (family === 'expressionTexts') expected.score.expressionTexts = replace(expected.score.expressionTexts!)
    if (family === 'harmonies') expected.score.harmonies = action === 'remove'
      ? expected.score.harmonies!.filter(item => item.id !== marks[1]!.id)
      : expected.score.harmonies!.map(item => item.id === marks[1]!.id ? { id: item.id, measureId: item.measureId, tick: item.tick, ...parseHarmonyText(draft)! } : item)
  }
  return { project: validateNativeProject(project), expected: validateNativeProject(expected), family, action, kind: `${family}-${action}`, label: `선택 요약 ${labels[family]}`, choiceLabel: `${labels[family]} 대상`, targetId: marks[1]!.id, eventId: 'supported-note-1', draft, value, changed, blocked: action !== 'trim-equal', confirm: action !== 'cancel' }
}
