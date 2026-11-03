import { describe, expect, it } from 'vitest'
import { applyScoreCommand, createMeasure, TICKS_PER_QUARTER } from '../../../score-core'
import { parseMusicXml, parseMusicXmlWithReport } from '../../../musicxml/parse'
import { serializeMusicXml } from '../../../musicxml/serialize'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { buildRemoveMeasure } from '../editor/measure-management'
import { buildTimeSignatureCommand } from '../editor/time-signature'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline, type PlaybackTimeline } from './timeline'
import { createPianoCommands, pedalReleaseBeat } from './piano-transport'

const xml = (directions: string, afterNote = '', afterBackup = '') => `<?xml version="1.0"?>
<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1"><measure number="1"><attributes><divisions>8</divisions><key><fifths>0</fifths></key>
<time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef>
<clef number="2"><sign>F</sign><line>4</line></clef></attributes>${directions}
<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
${afterNote}<note><rest/><duration>24</duration><voice>1</voice><type>half</type><dot/><staff>1</staff></note>
<backup><duration>32</duration></backup>${afterBackup}
<note><pitch><step>C</step><octave>3</octave></pitch><duration>32</duration><voice>2</voice><type>whole</type><staff>2</staff></note>
</measure></part></score-partwise>`
const mark = (type: string, offset = 0, staff = 1) => `<direction><direction-type><pedal type="${type}"/></direction-type>
<offset sound="yes">${offset}</offset><staff>${staff}</staff></direction>`
const fixture = () => parseMusicXml(xml(mark('start'), mark('change', 8), mark('stop', 24, 2)))
const fields = (score: ReturnType<typeof fixture>) => score.pedalEvents?.map(p => ({
  tick: p.tick, value: p.value, staff: score.parts[0].staves.findIndex(s => s.id === p.staffId)
}))

describe('authored piano damper pedal', () => {
  it('imports real divisions, cursor backup, staff ownership and lift/retake without changing key lengths', () => {
    const score = fixture(), timeline = createPlaybackTimeline(score)
    expect(fields(score)).toEqual([
      { tick: 0, value: 127, staff: 0 }, { tick: 2 * TICKS_PER_QUARTER, value: 0, staff: 0 },
      { tick: 2 * TICKS_PER_QUARTER, value: 127, staff: 0 }, { tick: 3 * TICKS_PER_QUARTER, value: 0, staff: 1 }
    ])
    expect(timeline.events.find(e => e.frequency && e.staffId === score.parts[0].staves[0].id)?.durationBeats).toBe(1)
    expect(pedalReleaseBeat(timeline, 'P1', 1)).toBe(2)
    expect(pedalReleaseBeat(timeline, 'P1', 2)).toBe(2)
    expect(pedalReleaseBeat(timeline, 'P1', 2.5)).toBe(3)
    expect(pedalReleaseBeat(timeline, 'other', 1)).toBe(1)
  })

  it('round-trips native and MusicXML pedal times and values, including same-tick change order', () => {
    const score = fixture()
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score.pedalEvents).toEqual(score.pedalEvents)
    const exported = serializeMusicXml(score), reopened = parseMusicXml(exported)
    expect(fields(reopened)).toEqual(fields(score))
    expect(createPlaybackTimeline(reopened).pedalEvents?.map(e => [e.startBeat, e.value]))
      .toEqual([[0, 127], [2, 0], [2, 127], [3, 0]])
  })

  it('honors explicit sound values and sound offset over a visual pedal sign', () => {
    const score = parseMusicXml(xml(`<direction><direction-type><pedal type="start"/></direction-type>
      <offset>16</offset><sound damper-pedal="25"><offset>8</offset></sound></direction>`))
    expect(fields(score)).toEqual([{ tick: TICKS_PER_QUARTER, value: 32, staff: 0 }])
    expect(fields(parseMusicXml(serializeMusicXml(score)))).toEqual(fields(score))
    expect(() => parseMusicXml(xml('<direction><sound damper-pedal="101"/></direction>'))).toThrow(/0–100/)
  })

  it('does not invent damper playback for unsupported sostenuto/formatting marks', () => {
    const { score, report } = parseMusicXmlWithReport(xml(mark('sostenuto'), '', mark('stop', 24)))
    expect(score.pedalEvents).toBeUndefined()
    expect(report.warnings.some(w => w.message.includes('single damper'))).toBe(true)
  })

  it('retains damper playback but warns when the original pedal line geometry cannot round-trip', () => {
    const { score, report } = parseMusicXmlWithReport(xml(mark('start').replace('type="start"', 'type="start" line="yes"')))
    expect(score.pedalEvents?.[0].value).toBe(127)
    expect(report.warnings.some(w => w.message.includes('line geometry'))).toBe(true)
  })

  it('resumes an already released key while its authored pedal is still ringing', () => {
    const timeline = createPlaybackTimeline(fixture()), commands = createPianoCommands(timeline, 1.5, 60, {})
    const upper = commands.filter(c => c.pitch === 60)
    expect(upper).toHaveLength(2)
    expect(upper[0]).toMatchObject({ type: 'on', time: 0, offset: 1.5 })
    expect(upper[1]).toMatchObject({ type: 'off', time: .5 })
    expect(createPianoCommands(timeline, 2, 60, {}).some(c => c.pitch === 60)).toBe(false)
  })

  it('expands pedal changes for repeats and releases at structural jumps', () => {
    const score = fixture(), staff = score.parts[0].staves[0]
    staff.measures[0].repeat = { start: true, end: true, times: 2 }
    const timeline = createPlaybackTimeline(score)
    expect(timeline.pedalEvents?.map(p => [p.startBeat, p.value]))
      .toEqual([[0,127],[2,0],[2,127],[3,0],[4,0],[4,127],[6,0],[6,127],[7,0]])
    expect(timeline.totalBeats).toBe(8)
  })

  it('rejects cross-part, missing and out-of-measure native pedal anchors', () => {
    for (const invalid of [{ partId: 'wrong' }, { staffId: 'wrong' }, { tick: 4 * TICKS_PER_QUARTER + 1 }, { value: 128 }]) {
      const score = fixture()
      Object.assign(score.pedalEvents![0], invalid)
      expect(() => createNativeProject(score)).toThrow()
    }
  })

  it('removes deleted pedal anchors, restores on undo, and rejects shortening a pedal-bearing bar', () => {
    const score = fixture(), staff = score.parts[0].staves[0]
    for (const s of score.parts[0].staves) s.measures.push(createMeasure({ id: `${s.id}-second`, number: 2 }))
    const result = applyScoreCommand(score, buildRemoveMeasure(score, staff.measures[0].id)!.command)
    expect(result.score.pedalEvents).toHaveLength(0)
    expect(createNativeProject(result.score)).toBeDefined()
    expect(applyScoreCommand(result.score, result.undo).score.pedalEvents).toEqual(score.pedalEvents)
    expect(buildTimeSignatureCommand(score, { type: 'measure', measureId: staff.measures[0].id,
      address: { partId: 'P1', staffId: staff.id, measureId: staff.measures[0].id, voiceId: staff.measures[0].voices[0].id } },
    { beats: 1, beatType: 4 })).toBeUndefined()
  })

  it('writes real CC64 into MIDI while retaining note-off at the written quarter note', () => {
    const bytes = Array.from(serializeMidi(fixture()))
    const contains = (pattern: number[]) => bytes.some((_, i) => pattern.every((value, j) => bytes[i + j] === value))
    expect(contains([0xb0, 64, 127])).toBe(true)
    expect(contains([0xb0, 64, 0])).toBe(true)
    expect(contains([0x80, 60, 0])).toBe(true)
    expect(createPlaybackTimeline(fixture()).events.find(e => e.frequencies?.includes(261.6255653005986))?.durationBeats).toBe(1)
  })

  it('keeps tremolo key attacks and restores ringing samples at pause without re-attacking all pulses', () => {
    const event = { eventId: 'a', partId: 'p', staffId: 's', measureId: 'm', voiceId: 'v', startBeat: 0,
      durationBeats: 1, frequency: 440, velocityStart: .16, velocityEnd: .16, tremolo: { type: 'single' as const, marks: 1 as const } }
    const timeline: PlaybackTimeline = { events: [event], tempoEvents: [], totalBeats: 4,
      pedalEvents: [{ id: 'down', partId: 'p', startBeat: 0, value: 127 }, { id: 'up', partId: 'p', startBeat: 3, value: 0 }] }
    const ons = createPianoCommands(timeline, 1.5, 60, {}).filter(c => c.type === 'on')
    expect(ons.map(c => c.offset)).toEqual([1.5, 1])
    expect(ons.every(c => c.time === 0)).toBe(true)
  })
})
