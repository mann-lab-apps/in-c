import { describe, expect, it } from 'vitest'
import { parseMusicXml, serializeMusicXml, serializeMusicXmlWithReport } from '../../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { applyScoreCommand, type Note, type Score } from '../../../score-core'
import { serializeMidiWithReport } from '../midi/serialize-midi'
import { createPracticeLoopPlan } from './practice-loop'
import { createLoopPianoCommands, createPianoCommands } from './piano-transport'
import { createPlaybackTimeline, findPlaybackEvent, findPlaybackStartBeat } from './timeline'

function graceScore(slash: boolean, repeat: boolean) {
  return parseMusicXml(`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Clarinet</part-name></score-part></part-list>
    <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time>
    <transpose><chromatic>-2</chromatic></transpose></attributes>
    ${repeat ? '<barline location="left"><repeat direction="forward"/></barline>' : ''}
    <note><grace slash="${slash ? 'yes' : 'no'}"/><pitch><step>B</step><alter>-1</alter><octave>4</octave></pitch><type>eighth</type></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
    ${repeat ? '<barline location="right"><repeat direction="backward"/></barline>' : ''}
    </measure></part></score-partwise>`)
}

function spans(score: Score) {
  return createPlaybackTimeline(score).events.map(event => [
    event.startBeat, event.startBeat + event.durationBeats,
    Math.round(69 + 12 * Math.log2(event.frequency! / 440))
  ])
}

describe('opt-in leading grace playback', () => {
  it.each([[true, 1 / 16], [false, 1 / 2]] as const)('steals from the principal on each pass with slash=%s', (slash, duration) => {
    const inherited = graceScore(slash, true)
    const oldMidi = serializeMidiWithReport(inherited)
    const result = applyScoreCommand(inherited, { type: 'score-grace-playback.update', enabled: true })
    const score = decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score
    expect(score.gracePlayback).toBe(true)
    expect(serializeMusicXml(score)).toBe(serializeMusicXml(inherited))
    expect(serializeMusicXmlWithReport(score).report.warnings).toEqual([
      expect.objectContaining({ code: 'native-grace-playback', path: 'score.gracePlayback' })
    ])
    expect(parseMusicXml(serializeMusicXml(score)).gracePlayback).toBeUndefined()
    expect(oldMidi.warnings.map(warning => warning.code)).toEqual(['unsupported-midi-grace'])
    expect(serializeMidiWithReport(score).warnings).toEqual([])
    expect(serializeMidiWithReport(score).bytes).not.toEqual(oldMidi.bytes)
    expect(serializeMidiWithReport(applyScoreCommand(score, result.undo).score)).toEqual(oldMidi)
    expect(spans(inherited)).toEqual([[0, 1, 58], [1, 2, 60], [2, 3, 58], [3, 4, 60]])
    expect(spans(score)).toEqual([
      [0, duration, 68], [duration, 1, 58], [1, 2, 60],
      [2, 2 + duration, 68], [2 + duration, 3, 58], [3, 4, 60]
    ])
    const timeline = createPlaybackTimeline(score)
    const [grace, host] = timeline.events
    expect(grace.eventId).toBe(host.eventId)
    expect(findPlaybackStartBeat(timeline, host.eventId, host)).toBe(0)
    expect(findPlaybackEvent(timeline, duration / 2)?.eventId).toBe(host.eventId)
    expect(findPlaybackEvent(timeline, duration)?.eventId).toBe(host.eventId)
    const [resumed] = createPianoCommands(timeline, duration / 2, 120, {})
    expect(resumed).toMatchObject({ type: 'on', pitch: 68, offset: duration / 4 })
    expect(createPracticeLoopPlan(score, { type: 'event', eventId: host.eventId, address: host }).unavailableReason).toMatch(/반복·볼타/)
  })

  it('caps an unmarked grace at half an eighth and keeps the next sounding beat', () => {
    const score = { ...graceScore(false, false), gracePlayback: true }
    const measure = score.parts[0].staves[0].measures[0]
    const first = measure.voices[0].events[0] as Note
    first.duration = { value: 'eighth', dots: 0 }
    expect(spans(score)).toEqual([[0, 1 / 4, 68], [1 / 4, 1 / 2, 58], [1, 2, 60]])
  })

  it('preserves a tie and reports its unplayed grace', () => {
    const original = graceScore(true, false)
    const voice = original.parts[0].staves[0].measures[0].voices[0]
    const [first, second] = voice.events as Note[]
    first.ties = { start: true }
    second.pitch = first.pitch
    second.ties = { stop: true }
    const off = serializeMidiWithReport(original)
    expect(spans({ ...original, gracePlayback: true })).toEqual([[0, 2, 58]])
    expect(serializeMidiWithReport({ ...original, gracePlayback: true })).toEqual(off)
    expect(off.warnings.map(warning => warning.code)).toEqual(['unsupported-midi-grace'])
  })

  it('keeps the selected host loop boundary and retains omission diagnostics for trailing graces', () => {
    const score = { ...graceScore(true, false), gracePlayback: true }
    const measure = score.parts[0].staves[0].measures[0]
    const voice = measure.voices[0]
    const tail = voice.events[1] as Note
    tail.graceNotes = [{ pitch: { step: 'E', octave: 4 }, after: true }]
    const timeline = createPlaybackTimeline(score)
    const host = timeline.events[0]
    const plan = createPracticeLoopPlan(score, { type: 'event', eventId: host.eventId, address: host })
    expect(plan.range).toMatchObject({ startBeat: 0, endBeat: 1 })
    expect(createLoopPianoCommands(timeline, 0, 1, 120, {}).map(command => [command.type, command.pitch, command.time])).toEqual([
      ['on', 68, 0], ['off', 68, 1 / 32], ['on', 58, 1 / 32], ['off', 58, 1 / 2]
    ])
    expect(serializeMidiWithReport(score).warnings).toEqual([expect.objectContaining({
      code: 'unsupported-midi-grace', path: 'part[1].staff[1].measure[1].voice[1].event[2].graceNotes'
    })])
  })
})
