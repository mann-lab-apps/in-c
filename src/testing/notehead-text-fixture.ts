// Synthetic interchange fixture; reuse the existing note/voice source builder.
import { createNoteheadFixture } from './notehead-fixture'
export function createNoteheadTextFixture({
  textKind = 'letters', omitHead = false, ...options
}: Parameters<typeof createNoteheadFixture>[0] & {
  textKind?: 'letters' | 'accidental' | 'mixed' | 'formatted' | 'repeated'
  omitHead?: boolean
} = {}) {
  const source = createNoteheadFixture({ head: 'normal', value: 'whole', ...options })
  const contents = {
    letters: '<display-text>C</display-text>',
    accidental: '<accidental-text>sharp</accidental-text>',
    mixed: '<display-text>도</display-text><accidental-text>flat</accidental-text>',
    formatted: '<display-text font-family="QA Note Font" font-size="10" font-weight="bold">Do</display-text>',
    repeated: '<display-text>C</display-text><display-text>Do</display-text>'
  }[textKind]
  const withText = source.replace('</notehead>', `</notehead><notehead-text>${contents}</notehead-text>`)
  if (withText === source) throw new Error('Synthetic notehead-text target missing')
  return (omitHead ? withText.replace(/<notehead\b[^>]*>[^<]*<\/notehead>/, '') : withText)
    .replace('음표 머리 검증', '음표 머리 글자 검증')
}
