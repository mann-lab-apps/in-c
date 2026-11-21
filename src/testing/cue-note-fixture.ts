import { createNoteDotVisibilityFixture } from './note-dot-visibility-fixture'

type Options = {
  owner?: 'main' | 'chord' | 'grace' | 'rest'
  cue?: boolean
  size?: 'full' | 'cue'
  printObject?: 'yes' | 'no'
  partCount?: number
  targetPart?: number
  targetMeasure?: number
}

export function createCueNoteFixture({ owner = 'main', cue = true, size, printObject = 'yes', ...options }: Options = {}) {
  const xml = createNoteDotVisibilityFixture({ ...options, owner, dotted: false, printDot: 'omitted' })
  let found = false
  const result = xml.replace(/<note print-object="yes">[\s\S]*?<\/note>/, note => {
    found = true
    if (cue) note = owner === 'grace'
      ? note.replace('<grace slash="yes"/>', '<grace slash="yes"/><cue/>')
      : note.replace('<note print-object="yes">', '<note print-object="yes"><cue/>')
    if (size) note = note.replace(/<type>([^<]+)<\/type>/, `<type size="${size}">$1</type>`)
    return note.replace(' print-object="yes"', ` print-object="${printObject}"`)
  })
  if (!found) throw Error('Synthetic cue owner missing')
  return result.replace('음가 점 표시 검증', '개별 큐 표기 검증')
}

export function createRepeatedCueNoteFixture(count = 30) {
  if (!Number.isInteger(count) || count < 2 || count > 100) throw Error('Bounded cue fixture count required')
  return createCueNoteFixture().replace(/<part id="P1">[\s\S]*?<\/part>/, part => {
    const first = part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if (!first) throw Error('Repeated cue measure missing')
    return '<part id="P1">' + Array.from({ length: count }, (_, index) => first.replace('number="1"', `number="${index + 1}"`)).join('') + '</part>'
  })
}
