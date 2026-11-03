// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createNote, createScore, TICKS_PER_QUARTER } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { Stave } from 'vexflow'
import { createStaveNote } from './NotationPreview'
import { formatSharedRhythm, minimumSharedRhythmWidth } from './shared-rhythm-layout'
import { harmonySpacingByMeasure, spacedHarmonies } from './harmony-spacing'
import { minimumTextScoreWidths } from './use-lyric-layout'
import { resolveMeasureAnnotationLanes } from './annotation-lanes'

function fixture(kind: string) {
  const score = createScore(), staff = score.parts[0].staves[0]
  score.title = 'Generated dense harmony study'
  const first = staff.measures[0]
  staff.measures = [0, 1].map(index => ({ ...structuredClone(first), id: `dense-${index}`, number: index + 1,
    voices: [{ id: 'voice-1', events: Array.from({ length: 4 }, (_, i) => ({
      ...createNote({ id: `dense-${index}-${i}`, position: { tick: i * TICKS_PER_QUARTER },
        duration: { value: 'quarter', dots: 0 }, pitch: { step: 'C', octave: 4 } }),
      ...(kind === 'lyrics' ? { lyrics: [{ text: ['함께', '연습', '이어', '가요'][i] }] } : {})
    })) }] }))
  if (kind === 'grand-staff') {
    const lower = structuredClone(staff); lower.id = 'dense-lower'
    lower.measures.forEach((bar, index) => {
      bar.id = `lower-${index}`; bar.clef = { sign: 'F', line: 4 }
      bar.voices[0].events.forEach((event, i) => {
        event.id = `lower-${index}-${i}`
        if (event.type === 'note') event.pitch.octave = 3
      })
    })
    score.parts[0].staves.push(lower)
  }
  if (kind.startsWith('voices')) for (const bar of staff.measures) {
    bar.voices[0].events.forEach(event => { if (event.type === 'note') event.pitch = { step: 'A', octave: 4 } })
    bar.voices.push({ id: 'voice-2', events: bar.voices[0].events.map((event, i) => {
      if (event.type !== 'note') throw new Error('Generated voice source requires notes')
      return { ...structuredClone(event), id: event.id + '-voice-two', pitch: { step: 'F' as const, octave: 4, alter: 1 as const },
        lyrics: [{ number: 1, text: ['함께', '연습', '이어', '가요'][i] }, { number: 2, text: ['둘이', '같이', '노래', '하자'][i] }] }
    }) })
  }
  if (kind === 'voices-lower-staff') {
    const upper = structuredClone(staff); upper.id = 'upper-reference'
    upper.measures.forEach((bar, index) => {
      bar.id = `upper-reference-${index}`; bar.voices = [bar.voices[0]]
      bar.voices[0].events.forEach((event, i) => {
        event.id = `upper-reference-${index}-${i}`
        if (event.type === 'note') event.pitch = { step: 'C', octave: 5 }
      })
    })
    score.parts[0].staves.unshift(upper)
  }
  const owner = score.parts[0].staves.at(-1)!
  score.harmonies = owner.measures.flatMap(bar => bar.voices[0].events.map((event, i) => ({
    id: `h-${event.id}`, measureId: bar.id, tick: event.position.tick, text: i % 2 ? 'Fmaj7/Gb' : 'Cmaj7/Gb'
  })))
  score.slurs = [{ id: 'manual-dense', startEventId: owner.measures[0].voices[0].events[0].id,
    endEventId: owner.measures[1].voices[0].events[3].id, engraving: { offsetX: 0, height: 3 } }]
  if (kind === 'voices-auto-lower' || kind === 'voices-manual-lower') score.hairpins = [{
    id: 'lower-hairpin', type: 'crescendo', startEventId: owner.measures[0].voices[0].events[0].id,
    endEventId: owner.measures[0].voices[0].events[3].id,
    engraving: { placement: 'below', offsetX: 0, height: 1, ...(kind === 'voices-manual-lower' ? { offsetY: 0 } : {}) }
  }]
  return score
}

it.each(['solo', 'grand-staff', 'lyrics', 'voices', 'voices-auto-lower', 'voices-manual-lower', 'voices-lower-staff'])('preserves the generated dense %s source/native and XML/MIDI contracts', kind => {
  const score = fixture(kind), before = structuredClone(score)
  const native = encodeNativeProject(createNativeProject(score)), xml = serializeMusicXml(score), midi = serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  const imported = parseMusicXml(xml)
  expect(imported.harmonies?.map(h => [h.tick, h.text])).toEqual(score.harmonies!.map(h => [h.tick, h.text]))
  expect(serializeMidi(imported)).toEqual(midi)
  if (kind.startsWith('voices')) expect(staffVoices(imported))
    .toEqual(staffVoices(score))
  expect(score).toEqual(before)
  const out = process.env.DDIRORI_DENSE_HARMONY_QA_DIR
  if (out) {
    const dir = join(out, kind); mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'source.chromatics'), native)
    writeFileSync(join(dir, 'source.musicxml'), xml)
    writeFileSync(join(dir, 'source.mid'), midi)
    if (score.hairpins?.length) {
      const bar = score.parts[0].staves[0].measures[0], event = bar.voices[0].events[0]
      const note = createStaveNote(event, bar, bar.voices[0], new Set()).setStave(new Stave(8, 0, 750).addClef('treble'))
      writeFileSync(join(dir, 'expectations.json'), JSON.stringify({
        anchorNoteYOffset: note.getYs()[0], hairpinDefaultOffset: resolveMeasureAnnotationLanes({
          lyricLineCount: 2, hasHairpin: true, harmonyCount: 4, harmonyTicks: [0, 1, 2, 3]
        }).hairpinYOffset
      }, null, 2))
    }
  }
})

it.each(['solo', 'grand-staff', 'lyrics', 'voices'])('reserves measured chord widths at shared onsets in %s without changing source', kind => {
  const score = fixture(kind), before = structuredClone(score)
  const groups = score.parts[0].staves.map((staff, i) => {
    const measure = staff.measures[0]
    return { measure, stave: new Stave(8, i * 140, 540).addClef(i ? 'bass' : 'treble'),
      lyricWidths: new Map([['함께', 50], ['연습', 50], ['이어', 50], ['가요', 50]]),
      harmonyWidths: new Map((score.harmonies ?? []).filter(h => h.measureId === measure.id).map(h => [h.tick, 84])),
      voices: measure.voices.map(voice => ({ events: voice.events,
        notes: voice.events.map(event => createStaveNote(event, measure, voice, new Set())) })) }
  })
  const ordinary = minimumSharedRhythmWidth(groups.map(({ harmonyWidths: _h, ...group }) => group))
  expect(minimumSharedRhythmWidth(groups)).toBeGreaterThan(ordinary + 80)
  formatSharedRhythm(groups)
  const centers = groups.at(-1)!.voices[0].notes.map(n => (n.getNoteHeadBeginX() + n.getNoteHeadEndX()) / 2)
  for (let i = 1; i < centers.length; i++) expect(centers[i] - centers[i - 1]).toBeGreaterThanOrEqual(92)
  for (const group of groups) group.voices[0].notes.forEach((note, i) =>
    expect((note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2).toBeCloseTo(centers[i], 6))
  if (kind === 'voices') groups[0].voices[1].notes.forEach((note, i) =>
    expect((note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2).toBeCloseTo(centers[i], 6))
  expect(score).toEqual(before)
})

function staffVoices(score: ReturnType<typeof createScore>) {
  return score.parts.map(p => p.staves.map(s => s.measures.map(m => m.voices.map(v => v.events.map(e => e.type === 'note' ? e.lyrics : undefined)))))
}

it('reserves lower-staff chord widths in the primary column and leaves unrelated bars alone', () => {
  const score = fixture('grand-staff'), widths = new Map([['Cmaj7/Gb', 84], ['Fmaj7/Gb', 84]])
  score.harmonies = score.harmonies!.filter(h => h.measureId === 'lower-0')
  const before = structuredClone(score), byMeasure = harmonySpacingByMeasure(score, widths)
  expect([...byMeasure.keys()]).toEqual(['lower-0'])
  const minima = minimumTextScoreWidths(score, new Map(), byMeasure)
  expect(minima.get('dense-0')).toBeGreaterThan(350)
  expect(minima.has('dense-1')).toBe(false)
  expect(score).toEqual(before)
})

it('keeps lone/coincident, boundary and unknown-owner chords out of the interior spacing policy', () => {
  const score = fixture('solo'), first = score.harmonies![0]
  score.harmonies = [first, { ...first, id: 'stack' }, { ...first, id: 'boundary', tick: TICKS_PER_QUARTER * 4 },
    { ...first, id: 'unknown', measureId: 'absent' }]
  expect(spacedHarmonies(score)).toEqual([])
  expect(harmonySpacingByMeasure(score, new Map([[first.text, 84]])).size).toBe(0)
})
