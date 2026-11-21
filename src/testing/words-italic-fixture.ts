import { createStaffTextWeightFixture } from './staff-text-weight-fixture'
export type WordsItalicKind = 'staff' | 'system' | 'tempo' | 'rhythm' | 'normalized' | 'bold-italic' | 'second-type' | 'two-types' | 'expression' | 'normal' | 'plain' | 'empty' | 'components'
export function createWordsItalicFixture(kind: WordsItalicKind = 'staff') {
  const baseKind = kind === 'system' || kind === 'tempo' ? kind : 'plain'
  let source = createStaffTextWeightFixture(baseKind).replace('보표 글자 굵게 서식 검증', '글자 기울임 서식 검증')
  if (kind === 'plain') return source
  if (kind === 'expression') return createStaffTextWeightFixture('expression').replace('보표 글자 굵게 서식 검증', '글자 기울임 서식 검증')
  source = baseKind === 'plain'
    ? source.replace('<words>', '<words font-style="italic">')
    : source.replace('font-weight="bold"', 'font-style="italic"')
  if (kind === 'normal') source = source.replace('font-style="italic"', 'font-style="normal"')
  if (kind === 'normalized') source = source.replace('<measure number="2"><direction', '<measure number="intro"><direction')
  if (kind === 'bold-italic') source = source.replace('<words font-style="italic">', '<words font-style="italic" font-weight="bold">')
  if (kind === 'second-type' || kind === 'two-types') {
    if (kind === 'second-type') source = source.replace(' font-style="italic"', '')
    source = source.replace('</direction-type>', '</direction-type><direction-type><words font-style="italic">cantabile</words></direction-type>')
  }
  if (kind === 'empty') source = source.replace('>dolce</words>', '> </words>')
  if (kind === 'components') source = source.replace('</words>', '</words><words>molto</words>')
  if (kind === 'rhythm') {
    source = source.replace('>dolce</words>', '>Swing</words>')
    const whole = '</direction><note><pitch><step>D</step><octave>4</octave></pitch><duration>16</duration><type>whole</type></note>'
    if (!source.includes(whole)) throw new Error('Synthetic rhythm target missing')
    source = source.replace(whole, '</direction>' + Array.from({ length: 8 }, () => '<note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><type>eighth</type></note>').join(''))
    const direction = source.match(/<direction\b[\s\S]*?<\/direction>/)?.[0]
    if (!direction) throw new Error('Synthetic first-measure rhythm direction missing')
    source = source.replace(direction, '').replace('<note>', direction + '<note>')
  }
  return source
}
