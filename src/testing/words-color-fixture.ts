import { createWordsItalicFixture } from './words-italic-fixture'

export type WordsColorKind = 'staff' | 'system' | 'tempo' | 'rhythm' | 'expression' | 'empty' | 'components'
export function createWordsColorFixture(kind: WordsColorKind = 'staff', color = '#FF0000') {
  return createWordsItalicFixture(kind)
    .replace(/ font-style="italic"/g, kind === 'expression' ? ' font-style="italic"' : '')
    .replace(/<words\b/g, `<words color="${color}"`)
}
