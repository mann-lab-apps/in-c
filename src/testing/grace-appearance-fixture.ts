import { createNoteDotVisibilityFixture } from './note-dot-visibility-fixture'

export type GraceAppearanceOptions = {
  type?: 'eighth' | 'quarter' | '16th' | 'omitted'
  dots?: 0 | 1 | 2
  slash?: 'yes' | 'no' | 'omitted'
  printDot?: 'yes' | 'no' | 'omitted'
  printObject?: 'yes' | 'no' | 'omitted'
  partCount?: number
  targetPart?: number
  targetMeasure?: number
}

export function createGraceAppearanceFixture({ type = 'quarter', dots = 0, slash = 'yes', printDot = 'omitted', ...options }: GraceAppearanceOptions = {}) {
  let xml = createNoteDotVisibilityFixture({ ...options, owner: 'grace', dotted: dots > 0, printDot })
  if (dots === 2) xml = xml.replace('<dot/>', '<dot/><dot/>')
  if (type === 'omitted') xml = xml.replace('<type>eighth</type>', '')
  else xml = xml.replace('<type>eighth</type>', `<type>${type}</type>`)
  if (slash !== 'yes') xml = xml.replace('<grace slash="yes"/>', slash === 'no' ? '<grace slash="no"/>' : '<grace/>')
  return xml.replace('음가 점 표시 검증', '꾸밈음 기보 검증')
}

export function createRepeatedGraceAppearanceFixture(count = 30) {
  if (!Number.isInteger(count) || count < 2 || count > 100) throw Error('Bounded grace appearance fixture count required')
  return createGraceAppearanceFixture().replace(/<part id="P1">[\s\S]*?<\/part>/, part => {
    const first = part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if (!first) throw Error('Repeated grace measure missing')
    return '<part id="P1">' + Array.from({ length: count }, (_, index) => first.replace('number="1"', `number="${index + 1}"`)).join('') + '</part>'
  })
}
