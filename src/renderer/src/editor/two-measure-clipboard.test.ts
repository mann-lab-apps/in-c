import { describe, expect, it, vi } from 'vitest'
import {
  applyScoreCommand, createDuration, createMeasure, createNote, createPart, createScore,
  createStaff, createVoice, TICKS_PER_QUARTER as T
} from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { buildFilteredRangePasteResult, buildRangeClipboard, buildRangePasteCommand, createEventSelection, createRangeSelection } from './editor-state'

function fixture() {
  const three = { beats: 3, beatType: 4 }
  const source = createMeasure({ id: 'first', number: 1, timeSignature: three,
    voices: [createVoice({ events: [createNote({ id: 'first-note', pitch: { step: 'F', octave: 4 },
      duration: createDuration('half', 1), lyrics: [{ number: 1, syllabic: 'single', text: '가사' }] })] })] })
  source.keySignature = { fifths: 1 }
  return createScore({ parts: [createPart({ staves: [createStaff({ measures: [
    source,
    createMeasure({ id: 'second', number: 2, voices: [createVoice({ events: [createNote({
      id: 'second-note', pitch: { step: 'F', octave: 4 }, duration: createDuration('whole')
    })] })] }),
    createMeasure({ id: 'third', number: 3, timeSignature: three }),
    createMeasure({ id: 'fourth', number: 4 })
  ] })] })] })
}

describe('clipboard for two complete neighboring measures', () => {
  it('pastes matching bars with new IDs, per-bar accidentals, note attachments and one undo', () => {
    const original = fixture()
    const source = createRangeSelection(original, 'second-note', 'first-note')!
    const target = createRangeSelection(original, 'third-full-measure-rest', 'fourth-full-measure-rest')!
    const clipboard = buildRangeClipboard(original, source)!
    expect(clipboard?.events.map(event => event.relativeTick)).toEqual([0, 3 * T])
    let counter = 0
    const command = buildRangePasteCommand(original, target, clipboard, () => `new-${++counter}`)!
    expect(command.type).toBe('score.batch')
    const { score, undo } = applyScoreCommand(original, command)
    const bars = score.parts[0].staves[0].measures
    expect(bars.slice(0, 2)).toEqual(original.parts[0].staves[0].measures.slice(0, 2))
    expect(bars[2].voices[0].events).toMatchObject([{ id: 'new-1', position: { tick: 0 },
      pitch: { step: 'F', alter: 1 }, lyrics: [{ text: '가사' }] }])
    expect(bars[3].voices[0].events).toMatchObject([{ id: 'new-2', position: { tick: 0 }, pitch: { step: 'F' } }])
    expect(applyScoreCommand(score, undo).score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  })

  it('rejects a destination with a different meter boundary or an attached span endpoint', () => {
    const score = fixture()
    const clipboard = buildRangeClipboard(score, createRangeSelection(score, 'first-note', 'second-note')!)!
    expect(clipboard).toBeDefined()
    const target = createRangeSelection(score, 'third-full-measure-rest', 'fourth-full-measure-rest')!
    const changed = structuredClone(score)
    const bars = changed.parts[0].staves[0].measures
    ;[bars[2].timeSignature, bars[3].timeSignature] = [bars[3].timeSignature, bars[2].timeSignature]
    expect(buildRangePasteCommand(changed, target, clipboard, () => 'unused')).toBeUndefined()
    score.hairpins = [{ id: 'span', type: 'crescendo', startEventId: 'second-note', endEventId: 'fourth-full-measure-rest' }]
    expect(buildRangePasteCommand(score, target, clipboard, () => 'unused')).toBeUndefined()
    expect(buildRangeClipboard(score, createRangeSelection(score, 'first-note', 'second-note')!)).toBeUndefined()
  })

  it('preserves inherited grace pitches when a two-bar paste overlaps its source', () => {
    const note = (id: string, step: 'C' | 'D') => createNote({
      id,
      pitch: { step, octave: 4 },
      duration: createDuration('whole'),
      graceNotes: [{ pitch: { step: 'F', octave: 4 }, slash: true }]
    })
    const original = createScore({ parts: [createPart({ staves: [createStaff({ measures: [
      createMeasure({ id: 'a', number: 1, keySignature: { fifths: 1 },
        voices: [createVoice({ events: [note('first', 'C')] })] }),
      createMeasure({ id: 'b', number: 2,
        voices: [createVoice({ events: [note('second', 'D')] })] }),
      createMeasure({ id: 'c', number: 3, keySignature: { fifths: 1 } })
    ] })] })] })
    const sourceBefore = structuredClone(original)
    const source = createRangeSelection(original, 'first', 'second')!
    const clipboard = buildRangeClipboard(original, source)!
    const target = createEventSelection(original, 'second')
    let counter = 0
    const command = buildRangePasteCommand(original, target, clipboard, () => `new-${++counter}`)!
    expect(command.type).toBe('score.batch')
    const { score, undo } = applyScoreCommand(original, command)
    const bars = score.parts[0].staves[0].measures
    expect(original).toEqual(sourceBefore)
    expect(bars[0]).toEqual(sourceBefore.parts[0].staves[0].measures[0])
    expect(bars.slice(1).map(bar => bar.voices[0].events[0])).toMatchObject([
      { id: 'new-1', pitch: { step: 'C' }, graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 1 }, slash: true }] },
      { id: 'new-2', pitch: { step: 'D' }, graceNotes: [{ pitch: { step: 'F', octave: 4, alter: 0 }, slash: true }] }
    ])
    const undone = applyScoreCommand(score, undo)
    expect(undone.score).toEqual(sourceBefore)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(score)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
  })
})

function passageFixture() {
  const score = fixture()
  const staff = score.parts[0].staves[0]
  const seven = { beats: 7, beatType: 8 }
  staff.measures.splice(1, 0, createMeasure({ id: 'silent', number: 2, timeSignature: seven }))
  staff.measures.splice(4, 0, createMeasure({ id: 'middle-target', number: 5, timeSignature: seven }))
  staff.measures.forEach((bar, index) => { bar.number = index + 1 })
  return score
}

it('copies three complete bars including an odd-meter rest to a start anchor or an explicit range', () => {
  const score = passageFixture()
  const original = structuredClone(score)
  const source = createRangeSelection(score, 'first-note', 'second-note')!
  const clipboard = buildRangeClipboard(score, source)!
  expect(clipboard?.measureDurations).toEqual([3 * T, 7 * T / 2, 4 * T])
  expect(clipboard.events.map(row => row.relativeTick)).toEqual([0, 3 * T, 13 * T / 2])
  const start = createEventSelection(score, 'third-full-measure-rest')
  expect(start).toMatchObject({ type:'event', eventId:'third-full-measure-rest' })
  const range = createRangeSelection(score, 'third-full-measure-rest', 'fourth-full-measure-rest')!
  for (const destination of [start, range]) {
    let counter = 0
    const command = buildRangePasteCommand(score, destination, clipboard, () => `pasted-${++counter}`)!
    expect(command.type).toBe('score.batch')
    const { score: pasted, undo } = applyScoreCommand(score, command)
    const bars = pasted.parts[0].staves[0].measures
    expect(bars.slice(0, 3)).toEqual(original.parts[0].staves[0].measures.slice(0, 3))
    expect(bars.slice(3).map(bar => bar.id)).toEqual(['third', 'middle-target', 'fourth'])
    expect(bars.slice(3).map(bar => bar.voices[0].events[0])).toMatchObject([
      { id:'pasted-1', pitch:{step:'F',alter:1}, lyrics:[{text:'가사'}] },
      { id:'pasted-2', type:'rest', fullMeasure:true },
      { id:'pasted-3', pitch:{step:'F'} }
    ])
    expect(applyScoreCommand(pasted, undo).score).toEqual(original)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(pasted))).score).toEqual(pasted)
  }
})

it('rejects a passage without enough destination bars or with a mismatched interior bar', () => {
  const score = passageFixture()
  const clipboard = buildRangeClipboard(score, createRangeSelection(score, 'first-note', 'second-note')!)!
  expect(clipboard).toBeDefined()
  const generated = vi.fn(() => 'unused')
  expect(buildRangePasteCommand(score, createEventSelection(score, 'middle-target-full-measure-rest'), clipboard, generated)).toBeUndefined()
  const changed = structuredClone(score)
  changed.parts[0].staves[0].measures[4].timeSignature = { beats:4, beatType:4 }
  expect(buildRangePasteCommand(changed, createEventSelection(changed, 'third-full-measure-rest'), clipboard, generated)).toBeUndefined()
  expect(generated).not.toHaveBeenCalled()
  expect(buildFilteredRangePasteResult(score, createEventSelection(score, 'third-full-measure-rest'), clipboard, generated, {eventTypes:'rests'})).toEqual({})
  expect(generated).not.toHaveBeenCalled()
})
