// @vitest-environment jsdom
import VexFlow, { Stave, StaveNote, Voice } from 'vexflow'
import { describe, expect, it } from 'vitest'
import { formatNotationVoices } from './format-voices'

const voice = () => new Voice({ numBeats: 4, beatValue: 4 }).setMode(Voice.Mode.SOFT)

describe('formatting authored empty voices', () => {
  it('keeps an empty voice intact without asking VexFlow for nonexistent tick metrics', () => {
    const empty = voice()
    expect(() => formatNotationVoices([empty], new Stave(8, 0, 400))).not.toThrow()
    expect(empty.getTickables()).toHaveLength(0)
  })

  it('formats populated voices identically alongside an authored empty voice', () => {
    const empty = voice()
    const notes = [0, 1].map(() => new StaveNote({ keys: ['c/4'], duration: 'h' }))
    const populated = voice().addTickables(notes)
    formatNotationVoices([empty, populated], new Stave(8, 0, 400).addClef('treble'))
    const baseline = notes.map(note => note.getAbsoluteX())
    formatNotationVoices([populated], new Stave(8, 0, 400).addClef('treble'))
    expect(notes.map(note => note.getAbsoluteX())).toEqual(baseline)
    expect(empty.getTickables()).toHaveLength(0)
  })
})

it.each([
  { kind: 'note', upperKeys: ['f#/4'] },
  { kind: 'chord', upperKeys: ['f#/4', 'c/5'] }
])('separates an unequal pitch from a $kind and keeps a matching unison together', ({ upperKeys }) => {
  const stave = new Stave(8, 0, 400).addClef('treble')
  const note = (key: string, stemDirection: number) =>
    new StaveNote({ keys: [key], duration: 'q', stemDirection }).setStave(stave)
  const upper = [
    new StaveNote({ keys: upperKeys, duration: 'q', stemDirection: 1 }).setStave(stave),
    note('f#/4', 1)
  ]
  const lower = [note('f/4', -1), note('f#/4', -1)]
  const unison = VexFlow.UNISON

  formatNotationVoices([voice().addTickables(upper), voice().addTickables(lower)], stave)

  expect(lower[0].getTickContext()).toBe(upper[0].getTickContext())
  expect(lower[0].getNoteHeadBeginX()).toBeGreaterThanOrEqual(upper[0].getNoteHeadEndX())
  expect(lower[0].getModifierContext()?.getRightShift()).toBeGreaterThan(0)
  expect(lower[1].getNoteHeadBeginX()).toBe(upper[1].getNoteHeadBeginX())
  expect(VexFlow.UNISON).toBe(unison)
})

it('assigns distinct positions to three chromatic pitches without respacing matching unisons', () => {
  const stave = new Stave(8, 0, 400).addClef('treble')
  const format = (keys: string[]) => {
    const notes = keys.map((key, index) =>
      new StaveNote({ keys: [key], duration: 'q', stemDirection: index === 1 ? -1 : 1 }).setStave(stave))
    formatNotationVoices(notes.map(note => voice().addTickable(note)), stave)
    return notes
  }

  const control = format(['f#/4', 'f#/4', 'f#/4'])
  const conflicting = format(['f#/4', 'f/4', 'fb/4'])
  const heads = conflicting.map(note => note.getNoteHeadBeginX()).sort((a, b) => a - b)

  expect(heads[1]).toBeGreaterThan(heads[0])
  expect(heads[2]).toBeGreaterThan(heads[1])
  expect(new Set(conflicting.map(note => note.getTickContext())).size).toBe(1)
  expect(conflicting[0].getTickContext().getMetrics().modRightPx)
    .toBeGreaterThan(control[0].getTickContext().getMetrics().modRightPx)
  expect(new Set(control.map(note => note.getNoteHeadBeginX())).size).toBe(2)
})

it('separates the pitches beside a third voice rest without changing the rest position', () => {
  const stave = new Stave(8, 0, 400).addClef('treble')
  const format = (lowerPitch: string) => {
    const upper = new StaveNote({ keys: ['f#/4'], duration: 'q', stemDirection: 1 }).setStave(stave)
    const rest = new StaveNote({ keys: ['b/4'], duration: 'qr' }).setStave(stave)
    const lower = new StaveNote({ keys: [lowerPitch], duration: 'q', stemDirection: -1 }).setStave(stave)
    formatNotationVoices([upper, rest, lower].map(note => voice().addTickable(note)), stave)
    return { upper, rest, lower }
  }

  const control = format('f#/4')
  const { upper, rest, lower } = format('fb/4')

  expect(lower.getNoteHeadBeginX()).toBeGreaterThan(upper.getNoteHeadEndX())
  expect(lower.getNoteHeadBeginX()).toBeGreaterThan(rest.getNoteHeadEndX())
  expect(rest.getYs()).toEqual(control.rest.getYs())
  expect(rest.getXShift()).toBe(control.rest.getXShift())
  expect(rest.getTickContext()).toBe(lower.getTickContext())
  expect(rest.getTickContext().getMetrics().modRightPx).toBeGreaterThan(control.rest.getTickContext().getMetrics().modRightPx)
})

it.each([
  { kind: 'a chord', firstKeys: ['f#/4', 'c/5'], lastDuration: 'q' },
  { kind: 'a whole note', firstKeys: ['f#/4'], lastDuration: 'w' },
  { kind: 'a chord and a whole note', firstKeys: ['f#/4', 'c/5'], lastDuration: 'w' }
])('separates chromatic pitches when three voices include $kind', ({ firstKeys, lastDuration }) => {
  const stave = new Stave(8, 0, 400).addClef('treble')
  const format = (secondKey: string, thirdKey: string) => {
    const notes = [
      new StaveNote({ keys: firstKeys, duration: 'q', stemDirection: 1 }),
      new StaveNote({ keys: [secondKey], duration: 'q', stemDirection: -1 }),
      new StaveNote({ keys: [thirdKey], duration: lastDuration, stemDirection: 1 })
    ].map(note => note.setStave(stave))
    formatNotationVoices(notes.map(note => voice().addTickable(note)), stave)
    return notes
  }

  const matching = format('f#/4', 'f#/4')
  const conflicting = format('f/4', 'fb/4')
  const positions = conflicting.map(note => note.getNoteHeadBeginX()).sort((a, b) => a - b)
  expect(new Set(conflicting.map(note => note.getTickContext())).size).toBe(1)
  expect(positions[1]).toBeGreaterThan(positions[0])
  expect(positions[2]).toBeGreaterThan(positions[1])
  expect(conflicting[0].getTickContext().getMetrics().modRightPx)
    .toBeGreaterThan(matching[0].getTickContext().getMetrics().modRightPx)
  expect(matching[0].getNoteHeadBeginX()).toBe(matching[2].getNoteHeadBeginX())
})
