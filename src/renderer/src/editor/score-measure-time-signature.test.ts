import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createMeasure, createNote,
  createPart, createRest, createScore, createStaff, createTimePosition, createVoice
} from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createPlaybackTimeline } from '../playback/timeline'
import { buildScoreMeasureTimeSignatureCommand } from './time-signature'

function fixture() {
  const staff = (id: string, number: number) => createStaff({ id, measures: [
    createMeasure({ id: `${id}-first`, number }),
    createMeasure({ id: `${id}-target`, number: number + 1 }),
    createMeasure({ id: `${id}-last`, number: number + 2, voices: [createVoice({ events: [
      createNote({ id: `${id}-note`, pitch: { step: 'C', octave: 4 }, duration: createDuration('whole') })
    ] })] })
  ] })
  return createScore({ parts: [
    createPart({ id: 'piano', name: '피아노', staves: [staff('upper', 1), staff('lower', 1)] }),
    createPart({ id: 'other', name: '플루트', staves: [staff('other-staff', 11)] })
  ] })
}

const target = { type: 'measure', measureId: 'lower-target' } as const
const meter = { beats: 3, beatType: 4 }

describe('applying a time signature to one measure of the whole score', () => {
  it('keeps each address, fits the bar on every staff and shifts subsequent notes together', () => {
    const source = fixture()
    const result = buildScoreMeasureTimeSignatureCommand(source, target, meter)
    expect(result.kind).toBe('change')
    if (result.kind !== 'change') return
    const { score, undo } = applyScoreCommand(source, result.command)
    const before = source.parts.flatMap(part => part.staves)
    const after = score.parts.flatMap(part => part.staves)
    after.forEach((staff, index) => {
      expect(staff.measures[1]).toEqual({ ...before[index].measures[1], timeSignature: meter })
      expect(staff.measures[0]).toBe(before[index].measures[0])
      expect(staff.measures[2]).toBe(before[index].measures[2])
    })
    expect(applyScoreCommand(score, undo).score).toEqual(source)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    expect(parseMusicXml(serializeMusicXml(score)).parts.flatMap(part => part.staves)
      .map(staff => staff.measures.map(bar => bar.timeSignature.beats))).toEqual([[4, 3, 4], [4, 3, 4], [4, 3, 4]])
    const timeline = createPlaybackTimeline(score)
    expect(timeline.events.filter(event => event.frequency !== undefined)
      .map(event => [event.eventId, event.startBeat]).sort()).toEqual([
      ['lower-note', 7], ['other-staff-note', 7], ['upper-note', 7]
    ])
    expect(buildScoreMeasureTimeSignatureCommand(score, target, meter)).toEqual({ kind: 'unchanged' })
  })

  it('rejects all changes when a note or timed marking on any target staff would be lost', () => {
    const source = fixture()
    const bar = source.parts[1].staves[0].measures[1]
    bar.voices[0].events = [
      createRest({ id: 'first-rest', duration: createDuration('half', 1) }),
      createNote({ id: 'late-note', position: createTimePosition(3 * T), pitch: { step: 'C', octave: 4 }, duration: createDuration('quarter') })
    ]
    const before = structuredClone(source)
    expect(buildScoreMeasureTimeSignatureCommand(source, target, meter)).toEqual({
      kind: 'blocked', partName: '플루트', staffNumber: 1
    })
    expect(source).toEqual(before)
    const textScore = fixture()
    textScore.expressionTexts = [{ id: 'expression', measureId: 'other-staff-target', tick: 3 * T + 1, text: 'dolce' }]
    expect(buildScoreMeasureTimeSignatureCommand(textScore, target, meter).kind).toBe('blocked')
  })

  it('requires coincident existing boundaries and matching lengths after the change', () => {
    const source = fixture()
    source.parts[1].staves[0].measures[0].timing = { type: 'pickup', durationTicks: T }
    expect(buildScoreMeasureTimeSignatureCommand(source, target, meter)).toEqual({ kind: 'unaligned' })
    const second = fixture()
    const bar = second.parts[1].staves[0].measures[1]
    bar.timeSignature = { beats: 5, beatType: 4 }
    bar.timing = { type: 'pickup', durationTicks: 4 * T }
    expect(buildScoreMeasureTimeSignatureCommand(second, target, { beats: 6, beatType: 4 })).toEqual({ kind: 'unaligned' })
  })
})
