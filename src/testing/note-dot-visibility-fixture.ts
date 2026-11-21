import { createNoteVisibilityFixture } from './note-visibility-fixture'

type Options = {
  owner?: 'main' | 'chord' | 'grace' | 'rest'
  dotted?: boolean
  printDot?: 'yes' | 'no' | 'omitted'
  printObject?: 'yes' | 'no' | 'omitted'
  partCount?: number
  targetPart?: number
  targetMeasure?: number
}

export function createNoteDotVisibilityFixture({ owner = 'main', dotted = true, printDot = 'no', printObject = 'yes', ...options }: Options = {}) {
  const xml = createNoteVisibilityFixture({ ...options, owner, value: 'half', printObject: 'yes' })
  const marker = xml.indexOf(' print-object="yes"')
  const start = xml.lastIndexOf('<measure ', marker)
  const end = xml.indexOf('</measure>', marker) + '</measure>'.length
  if (marker < 0 || start < 0 || end < start) throw Error('Synthetic dotted-note owner missing')
  const measure = xml.slice(start, end).replace(/<note(?: [^>]*)?>[\s\S]*?<\/note>/g, note => {
    const target = note.includes(' print-object="yes"')
    if (dotted) {
      if (owner === 'grace') {
        if (target) note = note.replace('<type>eighth</type>', '<type>eighth</type><dot/>')
      } else if (note.includes('<rest/>') && !target) {
        note = note.replace('<duration>4</duration><type>half</type>', '<duration>2</duration><type>quarter</type>')
      } else {
        // All chord members share the principal dotted duration; the remaining
        // quarter rest keeps the same four-beat measure and source addresses.
        note = note.replace('<duration>4</duration><type>half</type>', '<duration>6</duration><type>half</type><dot/>')
      }
    }
    if (target) {
      if (printDot !== 'omitted') note = note.replace('<note ', `<note print-dot="${printDot}" `)
      note = note.replace(' print-object="yes"', printObject === 'omitted' ? '' : ` print-object="${printObject}"`)
    }
    return note
  })
  return (xml.slice(0, start) + measure + xml.slice(end))
    .replaceAll('<octave>4</octave>', '<octave>5</octave>')
    .replace('음표 숨김 손실 검증', '음가 점 표시 검증')
}

export function createRepeatedNoteDotVisibilityFixture(count = 30) {
  if (!Number.isInteger(count) || count < 2 || count > 100) throw Error('Bounded dotted-note fixture count required')
  return createNoteDotVisibilityFixture().replace(/<part id="P1">[\s\S]*?<\/part>/, part => {
    const first = part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if (!first) throw Error('Repeated dotted measure missing')
    return '<part id="P1">' + Array.from({ length: count }, (_, index) => first.replace('number="1"', `number="${index + 1}"`)).join('') + '</part>'
  })
}
