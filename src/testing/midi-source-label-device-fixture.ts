import { createMidiProgramFixture, type MidiProgramCase } from './midi-program-fixture'
import { createMidiChannelMetadataFixture } from './midi-channel-metadata-fixture'

export const midiSourceLabelDeviceCases = [
  'name-header', 'name-secondary', 'name-reordered', 'name-direct', 'name-direction',
  'name-whitespace', 'name-empty', 'name-multiple',
  'device-header', 'device-reordered', 'device-global', 'device-empty', 'device-string',
  'device-direct', 'device-direction', 'device-multiple',
  'mixed', 'metadata-only', 'definition-only', 'control'
] as const
export type MidiSourceLabelDeviceCase = typeof midiSourceLabelDeviceCases[number]

// Only source playback labels/device instructions vary. Their absence in the
// score model must be reported without assigning a new device or instrument.
export function createMidiSourceLabelDeviceFixture(kind: MidiSourceLabelDeviceCase) {
  const baseKind: MidiProgramCase = kind.endsWith('secondary') ? 'secondary'
    : kind.endsWith('reordered') ? 'reordered'
      : kind.endsWith('direct') ? 'direct'
        : kind.endsWith('direction') ? 'direction'
          : kind === 'control' ? 'control'
            : kind.startsWith('device-') || kind === 'definition-only' ? 'definition-only' : 'initial'
  const source = kind === 'mixed' || kind === 'metadata-only'
    ? createMidiChannelMetadataFixture('mixed') : createMidiProgramFixture(baseKind)
  const title = `MIDI source label/device ${kind}`
  let xml = source.xml.replace(source.title, title)
  const header = (part: string, extra: string) => {
    xml = xml.replace(new RegExp(`(<score-part id="${part}">[\\s\\S]*?)(</score-part>)`), `$1${extra}$2`)
  }
  const addSecondInstrument = () => {
    xml = xml.replace('</score-instrument>', '</score-instrument><score-instrument id="P1-I2"><instrument-name>Spare Piano</instrument-name></score-instrument>')
  }
  if (kind.startsWith('name-')) {
    const content = kind === 'name-whitespace' ? '  Studio <![CDATA[Piano]]> &amp; Pads  '
      : kind === 'name-empty' ? '' : 'Studio Piano'
    xml = xml.replace(/<midi-program>[^<]+<\/midi-program>/g, `<midi-name>${content}</midi-name>`)
    if (kind === 'name-multiple') {
      addSecondInstrument()
      header('P1', '<midi-instrument id="P1-I2"><midi-name>예비 Piano</midi-name></midi-instrument>')
    }
  } else if (kind.startsWith('device-')) {
    const part = kind === 'device-direction' ? 'P2' : 'P1'
    const device = kind === 'device-global' ? '<midi-device port="16">Device All</midi-device>'
      : kind === 'device-string' ? '<midi-device>Hardware &amp; Port</midi-device>'
        : `<midi-device port="1" id="${part}-I1">${kind === 'device-empty' ? '' : 'Device A'}</midi-device>`
    if (kind === 'device-direct' || kind === 'device-direction') {
      xml = xml.replace(/<midi-instrument\b[^>]*>[\s\S]*?<\/midi-instrument>/g, device)
    } else {
      xml = xml.replace(/<midi-instrument\b[^>]*>[\s\S]*?<\/midi-instrument>/g, '')
      if (kind === 'device-multiple') addSecondInstrument()
      header('P1', device + (kind === 'device-multiple'
        ? '<midi-device id="P1-I2">예비 Device</midi-device>' : ''))
    }
  } else if (kind === 'mixed') {
    xml = xml.replace('</midi-channel>', '</midi-channel><midi-name>Hybrid Piano</midi-name>')
    xml = xml.replace('<midi-instrument', '<midi-device port="16" id="P1-I1">Hybrid Device</midi-device><midi-instrument')
  }
  const baselineXml = xml.replace(/<midi-name\b[^>]*>[\s\S]*?<\/midi-name>/g, '')
    .replace(/<midi-device\b[^>]*>[\s\S]*?<\/midi-device>/g, '')
  return { title, xml, baselineXml }
}
