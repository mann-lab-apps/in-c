// @vitest-environment jsdom
import { Stave, StaveNote, Voice } from 'vexflow'
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
