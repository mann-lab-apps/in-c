import { createNoteDotVisibilityFixture } from './note-dot-visibility-fixture'

export type AccidentalAppearanceStyle = 'parentheses' | 'bracket' | 'editorial' | 'cautionary' | 'cue-size' | 'grace-cue-size' | 'large-size' | 'combined' | 'plain' | 'explicit-defaults' | 'none'
export type AccidentalAppearanceOptions = {
  owner?: 'main' | 'chord' | 'grace'
  style?: AccidentalAppearanceStyle
  printObject?: 'yes' | 'no'
  partCount?: number
  targetPart?: number
  targetMeasure?: number
}

const attributes: Record<AccidentalAppearanceStyle, string> = {
  parentheses: ' parentheses="yes"', bracket: ' bracket="yes"', editorial: ' editorial="yes"', cautionary: ' cautionary="yes"',
  'cue-size': ' size="cue"', 'grace-cue-size': ' size="grace-cue"', 'large-size': ' size="large"',
  combined: ' parentheses="yes" bracket="yes" cautionary="yes" editorial="yes" size="cue"',
  plain: '', 'explicit-defaults': ' parentheses="no" bracket="no" editorial="no" cautionary="no" size="full"', none: ''
}

export function createAccidentalAppearanceFixture({ style = 'parentheses', printObject = 'yes', ...options }: AccidentalAppearanceOptions = {}) {
  const xml = createNoteDotVisibilityFixture({ ...options, printDot: 'omitted', dotted: false, printObject: 'yes' })
  return xml.replace(/<note print-object="yes">[\s\S]*?<\/note>/, note => {
    if (style !== 'none') note = note.replace(/(<type>[^<]+<\/type>)/, '$1<accidental' + attributes[style] + '>natural</accidental>')
    return note.replace(' print-object="yes"', ` print-object="${printObject}"`)
  }).replace('음가 점 표시 검증', '임시표 표시 검증')
}

export function createRepeatedAccidentalAppearanceFixture(count = 30) {
  if (!Number.isInteger(count) || count < 2 || count > 100) throw Error('Bounded accidental appearance fixture count required')
  return createAccidentalAppearanceFixture().replace(/<part id="P1">[\s\S]*?<\/part>/, part => {
    const first = part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if (!first) throw Error('Repeated accidental appearance measure missing')
    return '<part id="P1">' + Array.from({ length: count }, (_, index) => first.replace('number="1"', `number="${index + 1}"`)).join('') + '</part>'
  })
}
