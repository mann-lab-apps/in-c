import { describe, expect, it } from 'vitest'
import { parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createStaff, createMeasure, createVoice, createNote, createDuration, TICKS_PER_QUARTER } from '../score-core'

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

  it.each([['down', 5], ['up', 3]] as const)(
    'writes mid-measure %s octave directions at the actual MusicXML cursor, including grace and chord members',
    (direction, octave) => {
      const openingNote = '<note><pitch><step>B</step><octave>3</octave></pitch><duration>1</duration><type>quarter</type></note>'
      const graceNote = `<note><grace slash="yes"/><pitch><step>B</step><octave>${octave}</octave></pitch><type>eighth</type></note>`
      const start = `<direction><direction-type><octave-shift type="${direction}" size="8"/></direction-type></direction>`
      const source = fixture(direction, 8, octave)
        .replace('</attributes>', '</attributes>' + openingNote)
        .replace(start, start + graceNote)
        .replace('<duration>2</duration><type>half</type>', '<duration>1</duration><type>quarter</type>')
      const score = parseMusicXml(source)
      const contents = serializeMusicXml(score)
      const order = [...contents.matchAll(/<(note|direction)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g)].map(([body, tag]) => {
        if (tag === 'note') return body.includes('<grace') ? 'grace' : body.includes('<chord') ? 'chord' : 'note'
        expect(body).not.toContain('<offset')
        return body.includes('type="stop"') ? 'stop' : 'start'
      })
      expect(order).toEqual(['note', 'start', 'grace', 'note', 'chord', 'note', 'stop', 'note'])
      const reimported = parseMusicXml(contents)
      expect(reimported.parts).toEqual(score.parts)
      expect(reimported.octaveShifts).toEqual(score.octaveShifts)
      expect(serializeMidi(reimported)).toEqual(serializeMidi(score))
    }
  )

  it('reopens different-voice endpoints even when the stop is serialized before the start', () => {
    const score = parseMusicXml(fixture('down', 8, 5))
    const measure = score.parts[0].staves[0].measures[0]
    // Voice 1 ends its shifted note at beat two. Voice 2 starts the line
    // at beat one and has no note ending on beat two.
    const quarter = TICKS_PER_QUARTER
    const second = createVoice({
      id: 'voice-2',
      events: [
        createNote({ id: 'second-a', position: { tick: 0 }, pitch: { step: 'A', octave: 3 } }),
        createNote({ id: 'second-b', position: { tick: quarter }, pitch: { step: 'B', octave: 3 }, duration: createDuration('half') }),
        createNote({ id: 'second-c', position: { tick: 3 * quarter }, pitch: { step: 'C', octave: 4 } })
      ]
    })
    measure.voices.push(second)
    const span = score.octaveShifts![0]
    span.startEventId = second.events[1].id
    const output = serializeMusicXml(score)
    const markers = [...output.matchAll(/<direction(?:\s[^>]*)?>[\s\S]*?<\/direction>/g)]
    const reopened = parseMusicXml(output)
    const [start, stop] = [reopened.octaveShifts![0].startEventId, reopened.octaveShifts![0].endEventId]
    const [firstVoice, secondVoice] = reopened.parts[0].staves[0].measures[0].voices
    expect(start).toBe(secondVoice.events[1].id)
    expect(stop).toBe(firstVoice.events[1].id)
    expect(markers.map(([body]) => [body.includes('type="stop"') ? 'stop' : 'start', body.match(/<voice>([^<]+)<\/voice>/)?.[1]]))
      .toEqual([['stop', '1'], ['start', '2']])
    expect(markers.every(([body]) => !body.includes('<offset'))).toBe(true)
    expect(markers[0].index).toBeLessThan(output.indexOf('<backup>'))
    expect(markers[1].index).toBeGreaterThan(output.indexOf('<backup>'))
    expect(serializeMidi(reopened)).toEqual(serializeMidi(score))
  })

  it('accepts legacy offset markers with separate explicit start and stop voices', () => {
    const quarter = TICKS_PER_QUARTER
    const note = (voice: number, duration: number) =>
      `<note><pitch><step>C</step><octave>4</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>${duration === 1 ? 'quarter' : 'half'}</type></note>`
    const direction = (type: string, voice: number, offset: number) =>
      `<direction><direction-type><octave-shift type="${type}" size="8"/></direction-type><offset>${offset}</offset><voice>${voice}</voice></direction>`
    const legacy = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
      direction('down', 2, 1) + direction('stop', 1, 2) +
      note(1, 1).repeat(4) + '<backup><duration>4</duration></backup>' + note(2, 1) + note(2, 2) + note(2, 1) +
      '</measure></part></score-partwise>'
    const reopened = parseMusicXml(legacy)
    const [first, second] = reopened.parts[0].staves[0].measures[0].voices
    expect(first.events[1].position.tick).toBe(quarter)
    expect(reopened.octaveShifts?.[0]).toMatchObject({
      startEventId: second.events[1].id, endEventId: first.events[1].id
    })
  })

  it('allows the same octave number in two separate file-order pairs', () => {
    const note = (voice: number) =>
      `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>${voice}</voice><type>quarter</type></note>`
    const marker = (type: string, voice: number) =>
      `<direction><direction-type><octave-shift type="${type}" size="8"/></direction-type><voice>${voice}</voice></direction>`
    const voice = (number: number) => note(number) + marker('down', number) +
      note(number).repeat(2) + marker('stop', number) + note(number)
    const source = '<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1">' +
      '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>' +
      voice(1) + '<backup><duration>4</duration></backup>' + voice(2) + '</measure></part></score-partwise>'
    const score = parseMusicXml(source)
    const [firstVoice, secondVoice] = score.parts[0].staves[0].measures[0].voices
    expect(score.octaveShifts?.map(({ startEventId, endEventId }) => [startEventId, endEventId])).toEqual([
      [firstVoice.events[1].id, firstVoice.events[2].id],
      [secondVoice.events[1].id, secondVoice.events[2].id]
    ])
    expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score))
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
