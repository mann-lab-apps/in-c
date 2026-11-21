import { createMidiProgramFixture, type MidiProgramCase } from './midi-program-fixture'
import { createMidiBankFixture } from './midi-bank-fixture'

export type MidiChannelMetadataCase = 'header-first' | 'header-last' | 'header-percussion' | 'secondary' | 'reordered' | 'direct' | 'direction' | 'mixed' | 'program-only' | 'bank-only' | 'definition-only' | 'control'
const configurations: Record<MidiChannelMetadataCase, { base: MidiProgramCase; channel?: number; mixed?: boolean; bankOnly?: boolean }> = {
  'header-first': { base: 'initial', channel: 1 },
  'header-last': { base: 'initial', channel: 16 },
  'header-percussion': { base: 'initial', channel: 10 },
  secondary: { base: 'secondary', channel: 16 },
  reordered: { base: 'reordered', channel: 7 },
  direct: { base: 'direct', channel: 16 },
  direction: { base: 'direction', channel: 16 },
  mixed: { base: 'initial', channel: 16, mixed: true },
  'program-only': { base: 'initial' },
  'bank-only': { base: 'initial', bankOnly: true },
  'definition-only': { base: 'definition-only' },
  control: { base: 'control' }
}

// Original channel routing is separate from the current part-order output policy.
export function createMidiChannelMetadataFixture(kind: MidiChannelMetadataCase) {
  const config = configurations[kind]
  const source = config.mixed ? createMidiBankFixture('with-program') : config.bankOnly ? createMidiBankFixture('initial-max') : createMidiProgramFixture(config.base)
  const title = `MIDI channel metadata ${kind}`
  let xml = source.xml.replace(source.title, title)
  if (config.channel !== undefined) {
    const channel = `<midi-channel>${config.channel}</midi-channel>`
    xml = config.mixed ? xml.replace('<midi-bank>', channel + '<midi-bank>') : xml.replace(/<midi-program>[^<]+<\/midi-program>/g, channel)
  }
  return { title, xml, baselineXml: xml.replace(/<midi-channel>[^<]+<\/midi-channel>/g, '') }
}
