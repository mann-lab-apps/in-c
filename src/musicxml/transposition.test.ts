import { describe, expect, it } from 'vitest'
import { parseMusicXml, parseMusicXmlWithReport } from './parse'
import { serializeMusicXml } from './serialize'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

function writtenScore(transpose: string) {
  return `<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Wind</part-name></score-part></part-list><part id="P1">
    <measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>${transpose}</attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type><notations><ornaments><trill-mark/></ornaments></notations></note>
    <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
    <measure number="2"><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
    <measure number="3"><attributes><transpose><diatonic>0</diatonic><chromatic>0</chromatic></transpose></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure>
  </part></score-partwise>`
}

describe('written instrument transposition', () => {
  it.each([
    ['Bb', -1, -2, 0, 58],
    ['Eb', -5, -9, 0, 51],
    ['F', -4, -7, 0, 53],
    ['Bb bass', -1, -2, -1, 46]
  ])('preserves %s written notes through save and plays sounding chords/MIDI', (_name, diatonic, chromatic, octaveChange, midi) => {
    const { score, report } = parseMusicXmlWithReport(writtenScore(`<transpose><diatonic>${diatonic}</diatonic><chromatic>${chromatic}</chromatic><octave-change>${octaveChange}</octave-change></transpose>`))
    expect(report.warnings).toEqual([])
    const reopened = parseMusicXml(serializeMusicXml(score))
    const measures = reopened.parts[0].staves[0].measures
    expect(measures[0].transposition).toEqual({ diatonic, chromatic, octaveChange })
    expect(measures[1].transposition).toEqual(measures[0].transposition)
    expect(measures[2].transposition?.chromatic).toBe(0)
    expect(measures[0].voices[0].events[0]).toMatchObject({ pitch: { step: 'C', octave: 4 } })
    const timeline = createPlaybackTimeline(reopened)
    const frequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12)
    expect(timeline.events[0].frequency).toBeCloseTo(frequency(midi))
    expect(timeline.events[0].frequencies?.[1]).toBeCloseTo(frequency(midi + 4))
    expect(timeline.events[0].trillFrequency).toBeCloseTo(frequency(midi + 2))
    expect(timeline.events[1].frequency).toBeCloseTo(frequency(midi))
    expect(timeline.events[2].frequency).toBeCloseTo(frequency(60))
    const bytes = Array.from(serializeMidi(reopened))
    expect(bytes.some((value, i) => value === 0x90 && bytes[i + 1] === midi)).toBe(true)
  })

  it('keeps numbered staff transposition independent', () => {
    const xml = writtenScore('<staves>2</staves><transpose number="1"><chromatic>-2</chromatic></transpose><transpose number="2"><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>')
    const reopened = parseMusicXml(serializeMusicXml(parseMusicXml(xml)))
    expect(reopened.parts[0].staves[0].measures[1].transposition?.chromatic).toBe(-2)
    expect(reopened.parts[0].staves[1].measures[1].transposition).toMatchObject({ chromatic: 0, octaveChange: -1 })
  })

  it('rejects unsupported doubling instead of silently changing playback on save', () => {
    expect(() => parseMusicXml(writtenScore('<transpose><chromatic>0</chromatic><double/></transpose>'))).toThrow(/transpose/)
  })
})
