import { createWarningPartOwnershipFixture } from './warning-part-ownership-fixture'

export type MidiProgramCase = 'initial' | 'matching' | 'secondary' | 'reordered' | 'direct' | 'direction' | 'both' | 'definition-only' | 'control'

export function createMidiProgramFixture(kind: MidiProgramCase) {
 const title = `MIDI program import ${kind}`
 const instrument = (id: string, program: number) => `<midi-instrument id="${id}"><midi-program>${program}</midi-program></midi-instrument>`
 const definition = (part: string, name: string, program?: number) => `<score-part id="${part}"><part-name>${name}</part-name><score-instrument id="${part}-I1"><instrument-name>${name}</instrument-name></score-instrument>${program === undefined ? '' : instrument(`${part}-I1`, program)}</score-part>`
 const initial = ['initial', 'matching', 'reordered', 'both'].includes(kind)
 const first = definition('P1', 'Piano', initial ? kind === 'matching' ? 1 : 71 : undefined)
 const second = definition('P2', 'Flute', kind === 'secondary' ? 128 : undefined)
 let xml = createWarningPartOwnershipFixture('control').xml.replace('Warning part ownership control', title)
 if (kind !== 'control') xml = xml.replace(/<part-list>[\s\S]*?<\/part-list>/, `<part-list>${kind === 'reordered' ? second + first : first + second}</part-list>`)
 if (['direct', 'direction', 'both'].includes(kind)) {
  const note = (step: string) => `<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>`
  const sound = (part: string) => `<sound>${instrument(`${part}-I1`, 73)}</sound>`
  let index = 0
  xml = xml.replace(/<\/part>/g, () => {
   index++
   const marking = index === 1 && kind !== 'direction' ? sound('P1')
    : index === 2 && kind === 'direction' ? `<direction><direction-type><dynamics><mf/></dynamics></direction-type>${sound('P2')}</direction>` : ''
   return `<measure number="2">${marking}${note(index === 1 ? 'D' : 'E')}</measure></part>`
  })
 }
 const baselineXml = xml.replace(/<midi-instrument\b[^>]*>[\s\S]*?<\/midi-instrument>/g, '')
 return { title, xml, baselineXml }
}
