// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { Stave } from 'vexflow'
import { createFullMeasureRest, createNote, createScore, TICKS_PER_QUARTER } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createPlaybackTimeline } from '../playback/timeline'
import { createStaveNote } from './NotationPreview'
import { formatSharedRhythm, minimumSharedRhythmWidth } from './shared-rhythm-layout'
import type { TimedAnnotationAnchor } from './timed-annotation-position'

it.each(['rest-solo', 'rest-grand', 'rest-grand-reference'])('keeps %s full-measure rest semantics separate from chord time columns', kind => {
  const score = createScore({ title: 'Generated rest harmony ' + kind }), upper = score.parts[0].staves[0], base = upper.measures[0]
  upper.measures = Array.from({ length: 2 }, (_, index) => ({ ...structuredClone(base), id: `rest-bar-${index}`, number: index + 1,
    voices: [{ id: 'voice-1', events: [createFullMeasureRest({ id: `full-rest-${index}` })] }] }))
  if (kind !== 'rest-solo') {
    const lower = structuredClone(upper); lower.id = 'full-rest-lower'
    lower.measures.forEach((bar, index) => { bar.id = `lower-rest-bar-${index}`; bar.clef = { sign: 'F', line: 4 }; bar.voices[0].events[0].id = `lower-full-rest-${index}` })
    score.parts[0].staves.push(lower)
    upper.measures.forEach((bar, index) => { bar.voices[0].events = Array.from({ length: 4 }, (_, i) => createNote({
      id: `upper-${index}-${i}`, position: { tick: i * TICKS_PER_QUARTER }, pitch: { step: 'C', octave: 4 }, duration: { value: 'quarter', dots: 0 }
    })) })
  }
  const owner = score.parts[0].staves.at(-1)!
  score.harmonies = kind.endsWith('reference') ? [] : owner.measures.flatMap(bar => [0, TICKS_PER_QUARTER / 4, TICKS_PER_QUARTER / 2, TICKS_PER_QUARTER * 2].map((tick, i) => ({
    id: `rest-chord-${bar.id}-${i}`, measureId: bar.id, tick, text: i % 2 ? 'Fmaj7/Gb' : 'Cmaj7/Gb',
    root: { step: i % 2 ? 'F' as const : 'C' as const }, kind: 'major-seventh', bass: { step: 'G' as const, alter: -1 as const }
  })))
  const harmonies = score.harmonies
  score.layout = { systemBreakBeforeMeasureIds: [upper.measures[1].id] }
  const before = structuredClone(score), native = encodeNativeProject(createNativeProject(score)), xml = serializeMusicXml(score), midi = serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  const imported = parseMusicXml(xml), importedOwner = imported.parts[0].staves.at(-1)!
  expect(importedOwner.measures.every(m => m.voices[0].events[0].type === 'rest' && m.voices[0].events[0].fullMeasure)).toBe(true)
  expect((imported.harmonies ?? []).map(h => [h.tick, h.text])).toEqual(score.harmonies.map(h => [h.tick, h.text]))
  expect(serializeMidi(imported)).toEqual(midi)
  expect(createPlaybackTimeline(score).events.filter(e => e.staffId === owner.id)
    .map(e => [e.startBeat, e.durationBeats, e.frequency, e.frequencies]))
    .toEqual([[0, 4, undefined, undefined], [4, 4, undefined, undefined]])

  const groups = score.parts[0].staves.map((staff, i) => ({ measure: staff.measures[0], stave: new Stave(8, i * 140, 750).addClef(i ? 'bass' : 'treble'),
    harmonyWidths: new Map(harmonies.filter(h => h.measureId === staff.measures[0].id).map(h => [h.tick, 84])),
    timedAnnotationAnchors: new Map<number, TimedAnnotationAnchor>(), voices: staff.measures[0].voices.map(voice => ({ events: voice.events,
      notes: voice.events.map(event => createStaveNote(event, staff.measures[0], voice, new Set())) })) }))
  const group = groups.at(-1)!
  if (score.harmonies.length) expect(minimumSharedRhythmWidth(groups)).toBeGreaterThan(350)
  formatSharedRhythm(groups)
  if (score.harmonies.length) {
    const ticks = [...group.harmonyWidths.keys()].sort((a, b) => a - b), xs = ticks.map(t => group.timedAnnotationAnchors.get(t)!.centerX)
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(92 - 1e-6)
    expect(xs[0]).toBeLessThan(350) // A time-zero chord must not follow the centered rest.
    if (kind === 'rest-grand') for (const i of [0, 2]) {
      const note = groups[0].voices[0].notes[i]
      expect(group.timedAnnotationAnchors.get(i * TICKS_PER_QUARTER)!.centerX).toBeCloseTo((note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2, 6)
    }
  } else expect(group.timedAnnotationAnchors.size).toBe(0)
  expect(score).toEqual(before); expect(serializeMidi(score)).toEqual(midi)
  const out = process.env.DDIRORI_REST_HARMONY_QA_DIR
  if (out) {
    const dir = join(out, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native); writeFileSync(join(dir, 'source.musicxml'), xml); writeFileSync(join(dir, 'source.mid'), midi)
  }
})
