import { createMidiProgramFixture } from './midi-program-fixture'

export const midiMixerCases = ['header-zero', 'header-pan', 'header-elevation', 'direct-zero', 'direction-pan-zero', 'both-combined', 'reordered-volume', 'control', 'program-control'] as const
export type MidiMixerCase = typeof midiMixerCases[number]

export function createMidiMixerFixture(kind: MidiMixerCase) {
  const definition = {
    'header-zero': ['initial', '<volume>0</volume>'],
    'header-pan': ['initial', '<pan>-90</pan>'],
    'header-elevation': ['initial', '<elevation>90</elevation>'],
    'direct-zero': ['direct', '<volume>0</volume>'],
    'direction-pan-zero': ['direction', '<pan>0</pan>'],
    'both-combined': ['both', '<volume>50</volume><pan>45</pan>'],
    'reordered-volume': ['reordered', '<volume>25</volume>'],
    control: ['control', undefined],
    'program-control': ['initial', undefined]
  } as const
  const [source, fields] = definition[kind], fixture = createMidiProgramFixture(source)
  return { ...fixture, xml: fields ? fixture.xml.replace(/<midi-program>[^<]*<\/midi-program>/g, fields) : fixture.xml }
}
