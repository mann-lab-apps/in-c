import { createMidiProgramFixture, type MidiProgramCase } from './midi-program-fixture'

export type MidiBankCase = 'initial-min' | 'initial-max' | 'secondary' | 'reordered' | 'direct' | 'direction' | 'with-program' | 'program-only' | 'definition-only' | 'control'

// Bank metadata is independent of the existing name-derived sound/program model.
export function createMidiBankFixture(kind: MidiBankCase) {
  const baseKind: MidiProgramCase = kind === 'initial-min' || kind === 'initial-max' || kind === 'with-program' || kind === 'program-only' ? 'initial' : kind
  const base = createMidiProgramFixture(baseKind)
  const bank = kind === 'initial-min' ? 1 : kind === 'initial-max' ? 16384 : kind === 'reordered' ? 257 : 128
  const title = `MIDI bank import ${kind}`
  let xml = base.xml.replace(base.title, title)
  if (!['program-only', 'definition-only', 'control'].includes(kind)) {
    xml = xml.replace(/<midi-program>[^<]+<\/midi-program>/g, program => `<midi-bank>${bank}</midi-bank>${kind === 'with-program' ? program : ''}`)
  }
  return { title, xml, baselineXml: xml.replace(/<midi-bank>[^<]+<\/midi-bank>/g, '') }
}
