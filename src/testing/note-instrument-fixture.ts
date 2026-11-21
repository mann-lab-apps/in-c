import { createWarningPartOwnershipFixture } from './warning-part-ownership-fixture'

export type NoteInstrumentCase = 'single' | 'secondary' | 'reordered' | 'multiple' | 'grace' | 'rest' | 'control'

export function createNoteInstrumentFixture(kind: NoteInstrumentCase) {
  const target = kind === 'single' ? 'P1' : 'P2'
  let xml = createWarningPartOwnershipFixture('control').xml
  const definition = (id: string, name: string) => `<score-part id="${id}"><part-name>${name}</part-name><score-instrument id="${id}-I1"><instrument-name>${name}</instrument-name></score-instrument><score-instrument id="${id}-I2"><instrument-name>Clarinet</instrument-name></score-instrument></score-part>`
  const first = definition('P1', 'Piano'), second = definition('P2', 'Flute')
  xml = xml.replace(/<part-list>[\s\S]*?<\/part-list>/, `<part-list>${kind === 'reordered' ? second + first : first + second}</part-list>`)
  if (kind !== 'control') {
    const start = xml.indexOf(`<part id="${target}">`), end = xml.indexOf('</part>', start)
    let part = xml.slice(start, end)
    const references = `<instrument id="${target}-I1"/>${kind === 'multiple' ? `<instrument id="${target}-I2"/>` : ''}`
    if (kind === 'grace') part = part.replace('<note>', `<note><grace/><pitch><step>D</step><octave>4</octave></pitch>${references}<voice>1</voice><type>eighth</type></note><note>`)
    else {
      part = part.replace('<duration>4</duration>', `<duration>4</duration>${references}`)
      if (kind === 'rest') part = part.replace(/<pitch>[\s\S]*?<\/pitch>/, '<rest/>')
    }
    xml = xml.slice(0, start) + part + xml.slice(end)
  }
  return { xml, baselineXml: xml.replace(/<instrument\s+id="[^"]+"\s*\/>/g, ''), target }
}

// Repeated source references for report density/ownership regression, not a score model.
export function createRepeatedNoteInstrumentFixture(count = 30): string {
  return createNoteInstrumentFixture('secondary').xml.replace(
    /<part id="([^"]+)">([\s\S]*?)<\/part>/g,
    (_part: string, id: string, body: string) => `<part id="${id}">${Array.from({ length: count }, (_, index) =>
      body.replace('<measure number="1">', `<measure number="${index + 1}">`)).join('')}</part>`
  )
}
