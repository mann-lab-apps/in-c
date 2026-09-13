import { describe, expect, it } from 'vitest'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createStaff, createMeasure, createVoice, createNote, createDuration } from '../score-core'

// Independent standard MusicXML seed: pitch is performed; 8va engraves it down.
function fixture(direction: string, size: number, octave: number) {
  return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1">
  <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
  <direction><direction-type><octave-shift type="${direction}" size="${size}"/></direction-type></direction>
  <note><pitch><step>C</step><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note>
  <note><chord/><pitch><step>E</step><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note>
  <note><pitch><step>D</step><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note>
  <direction><direction-type><octave-shift type="stop" size="${size}"/></direction-type></direction>
  <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><type>half</type></note>
  </measure></part></score-partwise>`
}

describe('standard octave-shift pitch semantics', () => {
  it.each([
    ['8va', 'down', 8, 5], ['8vb', 'up', 8, 3],
    ['15ma', 'down', 15, 6], ['15mb', 'up', 15, 2]
  ] as const)('%s preserves displayed notes and performed audio through XML/native', (type, direction, size, octave) => {
    const score = parseMusicXml(fixture(direction, size, octave))
    const voice = score.parts[0]!.staves[0]!.measures[0]!.voices[0]!
    expect(score.octaveShifts?.[0]?.type).toBe(type)
    expect(score.octaveShifts?.[0]?.endEventId).toBe(voice.events[1]!.id)
    expect(voice.events.map(event => event.type === 'note' && event.pitch.octave)).toEqual([4, 4, 4])
    const chord = voice.events[0]!
    expect(chord.type === 'note' && chord.pitches?.map(pitch => pitch.octave)).toEqual([4, 4])
    const source = JSON.stringify(score)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events[0]!.frequency).toBeCloseTo(261.625565 * 2 ** (octave - 4), 4)
    expect(timeline.events[2]!.frequency).toBeCloseTo(261.625565, 4)
    const exported = serializeMusicXml(score)
    expect(exported).toContain(`<octave-shift type="${direction}" size="${size}"/>`)
    expect(exported).toContain(`<octave>${octave}</octave>`)
    const reopened = parseMusicXml(exported)
    expect(reopened.parts).toEqual(score.parts)
    expect(createPlaybackTimeline(reopened)).toEqual(timeline)
    expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
    const midi = Array.from(serializeMidi(score))
    expect(midi.some((byte, index) => byte === 0x90 && midi[index + 1] === 60 + (octave - 4) * 12 && midi[index + 2] === 75)).toBe(true)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    expect(JSON.stringify(score)).toBe(source)
  })

  it('rejects an unsupported 22 shift rather than silently converting it to 8va', () => {
    expect(() => parseMusicXml(fixture('down', 22, 7))).toThrow('octave-shift size')
  })

  it('keeps a transposing lower staff separate and uses the shift together with instrument transposition', () => {
    const score = parseMusicXml(fixture('down', 8, 5))
    const part = score.parts[0]!
    const lower = part.staves[0]!
    lower.measures[0]!.transposition = { chromatic: -2, diatonic: -1 }
    part.staves.unshift(createStaff({ id: 'unshifted-staff', measures: [createMeasure({
      id: 'unshifted-measure', voices: [createVoice({ events: [createNote({
        id: 'unshifted-note', pitch: { step: 'C', octave: 4 }, duration: createDuration('whole')
      })] })]
    })] }))
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events.find(event => event.eventId === 'unshifted-note')!.frequency).toBeCloseTo(261.625565, 4)
    expect(timeline.events.find(event => event.staffId === lower.id)!.frequency).toBeCloseTo(466.163762, 4)
    expect(createPlaybackTimeline(parseMusicXml(serializeMusicXml(score))).events.map(event => event.frequency)).toEqual(timeline.events.map(event => event.frequency))
  })
})
