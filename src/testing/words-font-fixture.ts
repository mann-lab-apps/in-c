import { createWordsItalicFixture } from './words-italic-fixture'

export type WordsFontKind = 'staff' | 'system' | 'tempo' | 'rhythm' | 'expression' | 'empty' | 'components'
export function createWordsFontFixture(kind: WordsFontKind = 'staff') {
  const source = createWordsItalicFixture(kind).replace(/ font-style="italic"/g,
    kind === 'expression' ? ' font-style="italic"' : '')
  return source.replace(/<words\b/g, '<words font-family="Studio QA Serif" font-size="24"')
}
