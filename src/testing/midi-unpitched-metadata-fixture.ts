import { createMidiProgramFixture, type MidiProgramCase } from './midi-program-fixture'

export const midiUnpitchedMetadataCases = ['header', 'minimum', 'maximum', 'secondary', 'reordered', 'direct', 'direction', 'multiple', 'mixed', 'definition-only', 'control'] as const
export type MidiUnpitchedMetadataCase = typeof midiUnpitchedMetadataCases[number]

// Source percussion routing metadata is independent of note <unpitched> support.
// Keep the pitched score and its current playback unchanged in these fixtures.
export function createMidiUnpitchedMetadataFixture(kind: MidiUnpitchedMetadataCase) {
  const base: MidiProgramCase = kind === 'header' || kind === 'minimum' || kind === 'maximum' || kind === 'multiple' || kind === 'mixed'
    ? 'initial' : kind
  const original = createMidiProgramFixture(base)
  const title = `MIDI unpitched metadata ${kind}`
  const value = kind === 'minimum' ? 1 : kind === 'maximum' || kind === 'secondary' ? 128 : 36
  let xml = original.xml.replace(original.title, title)
    .replace(/<midi-program>[^<]*<\/midi-program>/g, kind === 'mixed'
      ? `<midi-program>71</midi-program><midi-unpitched>${value}</midi-unpitched>`
      : `<midi-unpitched>${value}</midi-unpitched>`)
  if (kind === 'multiple') {
    xml = xml.replace('</score-instrument>', '</score-instrument><score-instrument id="P1-I2"><instrument-name>Spare Piano</instrument-name></score-instrument>')
      .replace('</score-part>', '<midi-instrument id="P1-I2"><midi-unpitched>128</midi-unpitched></midi-instrument></score-part>')
  }
  const baselineXml = xml.replace(/<midi-unpitched>[^<]*<\/midi-unpitched>/g, '')
  return { title, xml, baselineXml, value }
}
