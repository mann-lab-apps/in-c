// @vitest-environment jsdom
import { Stave } from 'vexflow'
import { expect, it } from 'vitest'
import { createNote, createScore, TICKS_PER_QUARTER, type Measure } from '../../../score-core'
import { createStaveNote } from './NotationPreview'
import { formatSharedRhythm, type SharedStaffLayout } from './shared-rhythm-layout'

function group(width: number, staff: number, kind: 'whole' | 'quarters', lyric = false): SharedStaffLayout {
  const measure: Measure = structuredClone(createScore().parts[0].staves[0].measures[0])
  const events = Array.from({ length: kind === 'whole' ? 1 : 4 }, (_, index) => ({
    ...createNote({ id: `note-${staff}-${index}`, position: { tick: index * TICKS_PER_QUARTER },
      duration: { value: kind === 'whole' ? 'whole' : 'quarter', dots: 0 }, pitch: { step: 'C', octave: 4 } }),
    ...(lyric ? { lyrics: [{ text: '가' }] } : {})
  }))
  measure.voices = [{ id: 'voice-1', events }]
  const voice = measure.voices[0]
  return { measure, stave: new Stave(8, staff * 130, width).addClef('treble'),
    lyricWidths: lyric ? new Map([['가', 12]]) : undefined,
    voices: [{ events, notes: events.map(event => createStaveNote(event, measure, voice, new Set())) }] }
}

it.each(['ensemble', 'short-lyric'] as const)('keeps the first onset next to the prefix when a %s measure is stretched', kind => {
  const layout = (width: number) => {
    const groups = kind === 'ensemble' ? [group(width, 0, 'whole'), group(width, 1, 'whole')]
      : [group(width, 0, 'whole', true)]
    const before = structuredClone(groups.map(g => g.measure))
    formatSharedRhythm(groups)
    expect(groups.map(g => g.measure)).toEqual(before)
    return groups[0].voices[0].notes[0].getAbsoluteX()
  }
  expect(layout(900)).toBeCloseTo(layout(480), 6)
})

it('does not move a held first-onset note solely because the peer staff gains later onsets', () => {
  const layout = (peer: 'whole' | 'quarters') => {
    const groups = [group(900, 0, 'whole'), group(900, 1, peer)]
    formatSharedRhythm(groups)
    expect(groups[0].voices[0].notes[0].getTickContext()).toBe(groups[1].voices[0].notes[0].getTickContext())
    return groups[0].voices[0].notes[0].getAbsoluteX()
  }
  expect(layout('whole')).toBeCloseTo(layout('quarters'), 6)
})
