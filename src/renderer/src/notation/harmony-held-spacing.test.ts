// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createNote, createScore, collectTiePairs, TICKS_PER_QUARTER } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline } from '../playback/timeline'
import { Stave } from 'vexflow'
import { createStaveNote } from './NotationPreview'
import { formatSharedRhythm, minimumSharedRhythmWidth } from './shared-rhythm-layout'
import type { TimedAnnotationAnchor } from './timed-annotation-position'
import { harmonySpacingByMeasure } from './harmony-spacing'

function fixture(kind: string) {
  const score = createScore({ title: 'Generated held harmony ' + kind }), staff = score.parts[0].staves[0]
  const pickup = kind === 'pickup-held' || kind === 'pickup-tuplet'
  const first = staff.measures[0]
  const bars = kind === 'pages' ? 6 : 2
  staff.measures = Array.from({ length: bars }, (_, index) => ({ ...structuredClone(first), id: `measure-${index + 1}`, number: index + 1,
    voices: [{ id: 'voice-1', events: [{ ...createNote({ id: `held-upper-${index}`, pitch: { step: 'C', octave: 4 },
      duration: { value: 'whole', dots: 0 } }), ties: { ...(index > 0 ? { stop: true } : {}), ...(index < bars - 1 ? { start: true } : {}) },
      ...(kind === 'lyrics' ? { lyrics: [{ text: index ? '이어' : '길게' }] } : {}) }] }] }))
  if (kind === 'grand-staff' || kind === 'pages' || kind === 'pickup-tuplet') {
    const lower = structuredClone(staff); lower.id = 'held-lower'
    lower.measures.forEach((bar, i) => {
      bar.id = `held-lower-${i + 1}`; bar.clef = { sign: 'F', line: 4 }
      const event = bar.voices[0].events[0]; event.id = `held-lower-note-${i}`
      if (event.type === 'note') event.pitch.octave = 3
    })
    score.parts[0].staves.push(lower)
    staff.measures.forEach((bar, index) => { bar.voices[0].events = Array.from({ length: 4 }, (_, i) =>
      createNote({ id: `upper-quarter-${index}-${i}`, position: { tick: TICKS_PER_QUARTER * i },
        duration: { value: 'quarter', dots: 0 }, pitch: { step: 'C', octave: 4 } })) })
  }
  if (pickup) {
    for (const target of score.parts[0].staves) {
      target.measures[0].timing = { type: 'pickup', durationTicks: TICKS_PER_QUARTER * 2 }
      if (target.measures[0].voices[0].events.length === 1) target.measures[0].voices[0].events[0].duration = { value: 'half', dots: 0 }
    }
    if (kind === 'pickup-tuplet') {
      const events = Array.from({ length: 3 }, (_, i) => createNote({ id: `pickup-triplet-${i}`,
        position: { tick: i * TICKS_PER_QUARTER / 3 }, pitch: { step: 'C', octave: 4 },
        duration: { value: 'eighth', dots: 0, tuplet: { actualNotes: 3, normalNotes: 2 } } }))
      staff.measures[0].voices[0] = { id: 'voice-1', events: [...events, createNote({ id: 'pickup-final-quarter',
        position: { tick: TICKS_PER_QUARTER }, pitch: { step: 'C', octave: 4 }, duration: { value: 'quarter', dots: 0 } })],
        tuplets: [{ id: 'pickup-triplet-group', eventIds: events.map(e => e.id), actualNotes: 3, normalNotes: 2 }] }
    }
    score.layout = { systemBreakBeforeMeasureIds: [staff.measures[1].id] }
  }
  const owner = score.parts[0].staves.at(-1)!, ticks = [0, TICKS_PER_QUARTER / 4, TICKS_PER_QUARTER / 2, TICKS_PER_QUARTER * 2]
  score.harmonies = owner.measures.flatMap((bar, index) => (pickup && index === 0
    ? [0, TICKS_PER_QUARTER / 3, TICKS_PER_QUARTER * 2 / 3, TICKS_PER_QUARTER] : ticks).map((tick, i) => ({ id: `h-${bar.id}-${i}`, measureId: bar.id, tick,
    text: i % 2 ? 'Fmaj7/Gb' : 'Cmaj7/Gb', root: { step: i % 2 ? 'F' as const : 'C' as const },
    kind: 'major-seventh', bass: { step: 'G' as const, alter: -1 as const } })))
  score.slurs = [{ id: 'held-manual', startEventId: owner.measures[0].voices[0].events[0].id,
    endEventId: owner.measures.at(-1)!.voices[0].events[0].id, engraving: { offsetX: 0, height: 3 } }]
  return score
}

it.each(['held', 'grand-staff', 'lyrics', 'pages', 'pickup-held', 'pickup-tuplet'])('preserves the %s held-note harmony fixture, tied playback, native/XML and MIDI', kind => {
  const score = fixture(kind), before = structuredClone(score), owner = score.parts[0].staves.at(-1)!
  const events = createPlaybackTimeline(score).events.filter(e => e.staffId === owner.id)
  expect(events).toHaveLength(1); expect(events[0].durationBeats).toBe(kind === 'pages' ? 24 : kind.startsWith('pickup-') ? 6 : 8)
  expect(collectTiePairs(score)).toEqual(owner.measures.slice(1).map((bar, index) => ({
    fromEventId: owner.measures[index].voices[0].events[0].id, toEventId: bar.voices[0].events[0].id })))
  const native = encodeNativeProject(createNativeProject(score)), midi = serializeMidi(score), xml = serializeMusicXml(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  const imported = parseMusicXml(xml), importedOwner = imported.parts[0].staves.at(-1)!
  expect(imported.harmonies?.map(h => [h.tick, h.text])).toEqual(score.harmonies!.map(h => [h.tick, h.text]))
  expect(imported.harmonies?.every(h => importedOwner.measures.some(m => m.id === h.measureId))).toBe(true)
  expect(serializeMidi(imported)).toEqual(midi)
  if (kind.startsWith('pickup-')) {
    expect(importedOwner.measures[0].timing).toEqual({ type: 'pickup', durationTicks: TICKS_PER_QUARTER * 2 })
    expect(imported.layout?.systemBreakBeforeMeasureIds).toEqual([imported.parts[0].staves[0].measures[1].id])
  }
  if (kind === 'pickup-tuplet') {
    expect(imported.parts[0].staves[0].measures[0].voices[0].tuplets?.map(t => [t.eventIds.length, t.actualNotes, t.normalNotes])).toEqual([[3, 3, 2]])
  }
  expect(score).toEqual(before)
  const out = process.env.DDIRORI_HELD_HARMONY_QA_DIR
  if (out) {
    const dir = join(out, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native)
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.mid'), midi)
  }
})

it.each(['held', 'grand-staff', 'lyrics', 'pickup-held', 'pickup-tuplet'])('reserves %s interior chord onsets without adding score notes or changing tied playback', kind => {
  const score = fixture(kind), before = structuredClone(score), midi = serializeMidi(score)
  const groups = score.parts[0].staves.map((staff, i) => {
    const measure = staff.measures[0]
    return { measure, stave: new Stave(8, i * 140, 750).addClef(i ? 'bass' : 'treble'),
      harmonyWidths: new Map(score.harmonies!.filter(h => h.measureId === measure.id).map(h => [h.tick, 84])),
      timedAnnotationAnchors: new Map<number, TimedAnnotationAnchor>(),
      voices: measure.voices.map(voice => ({ events: voice.events,
        notes: voice.events.map(event => createStaveNote(event, measure, voice, new Set())) })) }
  })
  expect(minimumSharedRhythmWidth(groups)).toBeGreaterThan(350)
  formatSharedRhythm(groups)
  const owner = groups.at(-1)!, ticks = [...owner.harmonyWidths.keys()].sort((a, b) => a - b)
  expect(ticks.every(t => owner.timedAnnotationAnchors.has(t))).toBe(true)
  const xs = ticks.map(t => owner.timedAnnotationAnchors.get(t)!.centerX)
  for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(92 - 1e-6)
  if (kind === 'grand-staff') {
    const upper = groups[0].voices[0].notes[2]
    expect(owner.timedAnnotationAnchors.get(TICKS_PER_QUARTER * 2)!.centerX)
      .toBeCloseTo((upper.getNoteHeadBeginX() + upper.getNoteHeadEndX()) / 2, 6)
  }
  if (kind === 'pickup-tuplet') {
    const upper = groups[0].voices[0].notes[1]
    expect(owner.timedAnnotationAnchors.get(TICKS_PER_QUARTER / 3)!.centerX)
      .toBeCloseTo((upper.getNoteHeadBeginX() + upper.getNoteHeadEndX()) / 2, 6)
  }
  const once = [...owner.timedAnnotationAnchors]
  formatSharedRhythm(groups)
  expect([...owner.timedAnnotationAnchors]).toEqual(once)
  owner.harmonyWidths = new Map([[0, 84]])
  formatSharedRhythm(groups)
  expect(owner.timedAnnotationAnchors.size).toBe(0)
  expect(score).toEqual(before); expect(serializeMidi(score)).toEqual(midi)
})

it('keeps rational interior times stable in a pickup and excludes the boundary without clamping it', () => {
  const score = fixture('held'), measure = score.parts[0].staves[0].measures[0]
  measure.timing = { type: 'pickup', durationTicks: TICKS_PER_QUARTER * 2 }
  measure.voices[0].events[0].duration = { value: 'half', dots: 0 }
  const ticks = [0, TICKS_PER_QUARTER / 3, TICKS_PER_QUARTER * 2 / 3, TICKS_PER_QUARTER]
  score.harmonies!.slice(0, 4).forEach((h, i) => h.tick = ticks[i])
  score.harmonies!.push({ ...score.harmonies![0], id: 'at-boundary', tick: TICKS_PER_QUARTER * 2 })
  const before = structuredClone(score), midi = serializeMidi(score)
  const widths = harmonySpacingByMeasure(score, new Map([['Cmaj7/Gb', 84], ['Fmaj7/Gb', 84]]))
  expect(widths.get(measure.id)?.has(TICKS_PER_QUARTER * 2)).toBe(false)
  const group = { measure, stave: new Stave(8, 0, 750).addClef('treble'), harmonyWidths: widths.get(measure.id),
    timedAnnotationAnchors: new Map<number, TimedAnnotationAnchor>(), voices: measure.voices.map(voice => ({
      events: voice.events, notes: voice.events.map(event => createStaveNote(event, measure, voice, new Set())) })) }
  formatSharedRhythm([group]); const points = [...group.timedAnnotationAnchors]
  expect(ticks.every(t => group.timedAnnotationAnchors.has(t))).toBe(true)
  for (let i = 0; i < 3; i++) { formatSharedRhythm([group]); expect([...group.timedAnnotationAnchors]).toEqual(points) }
  expect(score).toEqual(before); expect(serializeMidi(score)).toEqual(midi)
})

it('does not assign an ambiguous measure ID to a guessed annotation owner', () => {
  const score = fixture('grand-staff'), [upper, lower] = score.parts[0].staves, id = upper.measures[0].id
  const previous = lower.measures[0].id; lower.measures[0].id = id
  score.harmonies!.filter(h => h.measureId === previous).forEach(h => h.measureId = id)
  const before = structuredClone(score)
  expect(harmonySpacingByMeasure(score, new Map([['Cmaj7/Gb', 84], ['Fmaj7/Gb', 84]])).has(id)).toBe(false)
  expect(score).toEqual(before)
})
