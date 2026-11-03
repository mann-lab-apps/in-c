// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sharedLyricFixture, sharedLyricKinds } from '../../../testing/shared-lyric-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { Stave } from 'vexflow'
import { createStaveNote } from './NotationPreview'
import { formatSharedRhythm, type SharedStaffLayout } from './shared-rhythm-layout'
import { TICKS_PER_QUARTER, collectTiePairs, type Measure, type VoiceEvent } from '../../../score-core'
import { createPlaybackTimeline } from '../playback/timeline'
import { describe, expect, it } from 'vitest'
import { createNote, createScore } from '../../../score-core'
import { minimumLyricScoreWidths, supportsAutomaticLyricSpacing } from './use-lyric-layout'

describe('shared lyric layout', () => {
  it.each(['ensemble', 'grand-staff'])('reserves the lower staff lyric width in %s without changing source', kind => {
    const score = createScore(), part = score.parts[0], staff = part.staves[0]
    const lower = structuredClone(staff)
    lower.id = 'lower'
    const measure = lower.measures[0], rest = measure.voices[0].events[0]
    measure.voices[0].events = [{ ...createNote({ id: 'lower-lyric', position: rest.position,
      duration: rest.duration, pitch: { step: 'C', octave: 3 } }), lyrics: [{ text: '긴가사' }] }]
    if (kind === 'ensemble') score.parts.push({ ...structuredClone(part), id: 'lower-part', staves: [lower] })
    else part.staves.push(lower)
    const before = structuredClone(score)
    expect(supportsAutomaticLyricSpacing(score)).toBe(true)
    expect(minimumLyricScoreWidths(score, new Map([['긴가사', 540]])).get(staff.measures[0].id)).toBeGreaterThan(540)
    expect(score).toEqual(before)
  })
})

const quarter = TICKS_PER_QUARTER
function staffGroup(measure: Measure, y: number, width = 1000): SharedStaffLayout {
  return { measure, stave: new Stave(8, y, width).addClef(y ? 'bass' : 'treble'),
    lyricWidths: new Map([['긴가사', 240]]), voices: measure.voices.map(voice => ({ events: voice.events,
      notes: voice.events.map(event => {
        const note = createStaveNote(event, measure, voice, new Set())
        return note
      }) })) }
}
function n(id: string, tick: number, value: 'quarter' | 'eighth' | 'half' = 'quarter'): ReturnType<typeof createNote> {
  return createNote({ id, position: { tick }, duration: { value, dots: 0 }, pitch: { step: 'C', octave: 4 } })
}
function bar(events: VoiceEvent[]): Measure {
  const base = createScore().parts[0].staves[0].measures[0]
  return { ...base, voices: [{ id: 'voice-1', events }] }
}
it('preserves an all-empty shared staff without inventing score events', () => {
  const measures = [bar([]), bar([])]
  const before = structuredClone(measures)
  const groups = measures.map((measure, index) => staffGroup(measure, index * 130))
  expect(() => formatSharedRhythm(groups)).not.toThrow()
  expect(measures).toEqual(before)
  expect(groups.flatMap(group => group.voices.flatMap(voice => voice.notes))).toHaveLength(0)
})
it('aligns populated peers while retaining empty shared voices and their source data', () => {
  const measures = [bar([]), bar([n('peer', 0, 'half'), n('peer-end', quarter * 2, 'half')])]
  measures[1].voices.push({ id: 'empty-second-voice', events: [] })
  const before = structuredClone(measures)
  const groups = measures.map((measure, index) => staffGroup(measure, index * 130))
  expect(() => formatSharedRhythm(groups)).not.toThrow()
  const xs = groups[1].voices[0].notes.map(note => note.getAbsoluteX())
  expect(xs.every(Number.isFinite)).toBe(true)
  expect(xs[1]).toBeGreaterThan(xs[0])
  expect(measures).toEqual(before)
})
it('shares actual tick contexts across different durations, chords, rests, and staff-local accidentals', () => {
  const top = bar([{ ...n('a', 0, 'half'), type: 'note', lyrics: [{ text: '긴가사' }] }, n('b', quarter * 2, 'half')])
  const lower = bar([n('c', 0), { ...n('d', quarter), type: 'rest' },
    { ...n('e', quarter * 2), type: 'note', pitch: { step: 'F', octave: 3, alter: 1 },
      pitches: [{ step: 'F', octave: 3, alter: 1 }, { step: 'A', octave: 3 }] }, n('f', quarter * 3)])
  const source = structuredClone([top, lower]), groups = [staffGroup(top, 0), staffGroup(lower, 130)]
  formatSharedRhythm(groups)
  const [a, b] = groups[0].voices[0].notes, [c, , e] = groups[1].voices[0].notes
  expect(a.getAbsoluteX()).toBeCloseTo(c.getAbsoluteX(), 6)
  expect(b.getAbsoluteX()).toBeCloseTo(e.getAbsoluteX(), 6)
  expect(a.getTickContext()).toBe(c.getTickContext())
  expect(a.getModifierContext()).not.toBe(c.getModifierContext())
  expect(groups[1].voices[0].notes.every(note => note.getStave() === groups[1].stave)).toBe(true)
  expect([top, lower]).toEqual(source)
})
it('uses explicit model onsets for mixed tuplets, pickup and a late-starting second voice', () => {
  const top = bar([n('t0', 0, 'eighth'), n('t1', quarter / 3), n('t2', quarter)])
  for (const event of top.voices[0].events.slice(0, 2)) event.duration.tuplet = { actualNotes: 3, normalNotes: 2 }
  top.timing = { type: 'pickup', durationTicks: quarter * 2 }
  const lower = bar([n('l0', 0, 'eighth'), n('l1', quarter / 3), n('l2', quarter)])
  lower.timing = top.timing
  for (const event of lower.voices[0].events.slice(0, 2)) event.duration.tuplet = { actualNotes: 3, normalNotes: 2 }
  lower.voices.push({ id: 'voice-2', events: [n('late', quarter)] })
  lower.voices.push({ id: 'voice-3', events: [{...n('late-triplet', quarter / 3),duration:{value:'quarter',dots:0,tuplet:{actualNotes:3,normalNotes:2}}}] })
  const groups = [staffGroup(top, 0), staffGroup(lower, 130)]
  // The model onsets, not uniform visual triplet slots or performed beats, align.
  formatSharedRhythm(groups)
  for (let i = 0; i < 3; i++) expect(groups[0].voices[0].notes[i].getAbsoluteX())
    .toBeCloseTo(groups[1].voices[0].notes[i].getAbsoluteX(), 6)
  expect(groups[1].voices[1].notes[0].getAbsoluteX()).toBeCloseTo(groups[0].voices[0].notes[2].getAbsoluteX(), 6)
  expect(groups[1].voices[2].notes[0].getAbsoluteX()).toBeCloseTo(groups[0].voices[0].notes[1].getAbsoluteX(), 6)
  // A repeated layout pass must not multiply tuplet timing again.
  const before = groups[0].voices[0].notes.map(note => note.getAbsoluteX())
  formatSharedRhythm(groups)
  expect(groups[0].voices[0].notes.map(note => note.getAbsoluteX())).toEqual(before)
})

it('aligns dotted durations with ordinary notes at the same later onset', () => {
  const top = bar([n('dotted', 0), n('next', quarter * 1.5, 'eighth')])
  top.voices[0].events[0].duration.dots = 1
  const lower = bar([n('one', 0), n('two', quarter, 'eighth'), n('three', quarter * 1.5, 'eighth')])
  const groups = [staffGroup(top, 0), staffGroup(lower, 130)]
  formatSharedRhythm(groups)
  expect(groups[0].voices[0].notes[1].getAbsoluteX()).toBeCloseTo(groups[1].voices[0].notes[2].getAbsoluteX(), 6)
})

for (const kind of sharedLyricKinds) it(`preserves native/XML/MIDI contracts for ${kind}`, () => {
  const score = sharedLyricFixture(kind), before = structuredClone(score)
  const xml = serializeMusicXml(score), midi = serializeMidi(score)
  if (kind.startsWith('ties-')) {
    expect(collectTiePairs(score)).toEqual([{ fromEventId: 'upper-0', toEventId: 'upper-1' }])
    const events = createPlaybackTimeline(score).events.filter(e => e.partId === score.parts[0].id)
    expect(events[0].durationBeats).toBe(8)
    expect(events[0].frequencies).toHaveLength(kind.includes('-chord-') ? 2 : 1)
    expect(events.some(e => e.eventId === 'upper-1')).toBe(false)
  }
  expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
  const root = process.env.DDIRORI_SHARED_LYRIC_QA_DIR
  if (root) {
    const dir = join(root, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.mid'), midi)
  }
  expect(score).toEqual(before)
})

it('does not count the clef prefix twice for a long word in a single-staff part view', () => {
  const score = sharedLyricFixture('ensemble-lower')
  const partScore = { ...score, parts: [score.parts[1]] }
  const widths = new Map([['가'.repeat(48), 540], ['나'.repeat(48), 540]])
  const minima = minimumLyricScoreWidths(partScore, widths)
  expect(minima.get(partScore.parts[0].staves[0].measures[0].id)).toBeGreaterThan(540)
  expect(minima.get(partScore.parts[0].staves[0].measures[0].id)).toBeLessThan(600)
})

it('aligns a shared onset without forcing equal printed meters across staves', () => {
  const top = bar([n('top0', 0, 'half'), n('top2', quarter * 2, 'half')])
  const lower = bar([n('lower0', 0), n('lower1', quarter), n('lower2', quarter * 2)])
  lower.timeSignature = { beats: 3, beatType: 4 }
  const before = structuredClone([top, lower]), groups = [staffGroup(top, 0), staffGroup(lower, 130)]
  formatSharedRhythm(groups)
  expect(groups[0].voices[0].notes[1].getAbsoluteX()).toBeCloseTo(groups[1].voices[0].notes[2].getAbsoluteX(), 6)
  expect([top, lower]).toEqual(before)
})

it('orders shared contexts by notated tick, including ticks introduced only by later staves', () => {
  const top = bar([n('top-a', 0, 'half'), n('top-b', quarter * 2, 'half')])
  const lower = bar([n('lower-a', 0), n('lower-b', quarter), n('lower-c', quarter * 2), n('lower-d', quarter * 3)])
  const groups = [staffGroup(top, 0, 80), staffGroup(lower, 130, 80)]
  formatSharedRhythm(groups)
  const xs = groups[1].voices[0].notes.map(note => note.getAbsoluteX())
  for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThan(xs[i-1])
})
