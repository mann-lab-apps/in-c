import { expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { pitchToMidi, shouldDisplayAccidental } from '../../../score-core'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { createConcertPitchView } from './concert-pitch'

const xml = `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths><mode>major</mode></key>
<time><beats>4</beats><beat-type>4</beat-type></time><transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose></attributes>
<harmony><root><root-step>C</root-step></root><kind>major-seventh</kind><bass><bass-step>E</bass-step></bass></harmony>
<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
<note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch><type>eighth</type></note>
<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
<note><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
<note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
</measure></part></score-partwise>`

it('projects the key, notes, chord members, graces and harmony without changing written data', () => {
  const written = parseMusicXml(xml)
  const original = structuredClone(written)
  const result = createConcertPitchView(written)
  expect(result.reason).toBeUndefined()
  const display = result.score!
  const measure = display.parts[0].staves[0].measures[0]
  const voice = measure.voices[0]
  const notes = voice.events.filter(event => event.type === 'note')
  expect(measure.keySignature).toEqual({ fifths: -2, mode: 'major' })
  expect(notes.map(note => pitchToMidi(note.pitch))).toEqual([58, 64, 68, 69])
  expect(notes.map(note => [note.pitch.step, note.pitch.alter, shouldDisplayAccidental(measure, voice, note)]))
    .toEqual([['B', -1, false], ['E', 0, true], ['A', -1, true], ['A', 0, true]])
  expect(notes[1].pitches?.map(pitchToMidi)).toEqual([64, 67])
  expect(notes[1].graceNotes?.[0]).toMatchObject({ slash: true, pitch: { step: 'A', octave: 4, alter: 0 } })
  expect(display.harmonies?.[0]).toMatchObject({ text: 'Bbmaj7/D', root: { step: 'B', alter: -1 }, bass: { step: 'D', alter: 0 } })
  expect(notes.map(note => note.id)).toEqual(original.parts[0].staves[0].measures[0].voices[0].events.map(event => event.id))
  expect(written).toEqual(original)
  expect(serializeMusicXml(written)).toBe(serializeMusicXml(original))
  expect(serializeMidi(display)).toEqual(serializeMidi(original))
  expect(createPlaybackTimeline(written)).toEqual(createPlaybackTimeline(original))
})

it('preserves octave-only intervals and identifies when chromatic data cannot determine a spelling', () => {
  const source = parseMusicXml(xml)
  const measure = source.parts[0].staves[0].measures[0]
  measure.transposition = { chromatic: 0, octaveChange: -1 }
  const octaveDown = createConcertPitchView(source).score!.parts[0].staves[0].measures[0]
  expect(octaveDown.keySignature).toEqual(measure.keySignature)
  expect(octaveDown.voices[0].events[0]).toMatchObject({ pitch: { step: 'C', octave: 3 } })
  measure.transposition = { chromatic: -2 }
  expect(createConcertPitchView(source).reason).toContain('음이름 간격')
})

it('does not partially switch the display when a measure has a different transposition', () => {
  const source = parseMusicXml(xml)
  const staff = source.parts[0].staves[0]
  const later = { ...staff.measures[0], id: 'later', transposition: { chromatic: -7, diatonic: -4 } }
  staff.measures.push(later)
  expect(createConcertPitchView(source)).toEqual({ reason: expect.stringContaining('같은 이조') })
})

it('reports an unrepresentable key or chord symbol instead of showing a mixed view', () => {
  const source = parseMusicXml(xml)
  const measure = source.parts[0].staves[0].measures[0]
  measure.keySignature.fifths = -7
  expect(createConcertPitchView(source)).toEqual({ reason: expect.stringContaining('표기 범위') })
  measure.keySignature.fifths = 0
  source.harmonies![0].text = 'opaque'
  expect(createConcertPitchView(source)).toEqual({ reason: expect.stringContaining('코드 심벌') })
})
