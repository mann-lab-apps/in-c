import { expect, it } from 'vitest'
import { applyScoreCommand, createDuration, createFullMeasureRest, createNote, createRest, createTimePosition, createVoice,
  measureDurationTicks, TICKS_PER_QUARTER as T, validateMeasureRhythm } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createNewScore } from './new-score'
import { buildEmptyFirstMeasurePickupCommand as build, inspectEmptyFirstMeasures } from './existing-pickup'

const source = (templateId: 'duet' | 'piano-grand-staff' = 'duet') => createNewScore({ title: '빈 첫 마디', templateId,
  measureCount: 3, keySignature: { fifths: -1 }, timeSignature: { beats: 4, beatType: 4 } })

it.each(['duet', 'piano-grand-staff'] as const)('changes all %s staves in one command and preserves authored numbers, objects, native and exact undo', template => {
  const score = source(template)
  for (const part of score.parts) for (const staff of part.staves) {
    staff.measures.forEach((bar, i) => { bar.number = i + 11 })
    staff.measures[0].voices[0].events[0].fermata = true
    staff.measures[0].voices[0].events[0].breathMark = 'caesura'
    staff.measures[0].voices.push(createVoice({ id: `${part.id}-${staff.id}-extra-voice`, events: [createFullMeasureRest({ id: `${part.id}-${staff.id}-extra-rest` })] }))
  }
  const before = structuredClone(score), command = build(score, T / 2).command!
  expect(command.type).toBe('score-parts.replace')
  const result = applyScoreCommand(score, command)
  expect(score).toEqual(before)
  for (const [p, part] of result.score.parts.entries()) for (const [s, staff] of part.staves.entries()) {
    const previous = before.parts[p].staves[s]
    expect(staff.measures.map(bar => bar.number)).toEqual([11, 12, 13])
    expect(staff.measures[0]).toEqual({ ...previous.measures[0], timing: { type: 'pickup', durationTicks: T / 2 } })
    expect(staff.measures.slice(1)).toEqual(previous.measures.slice(1))
    expect(validateMeasureRhythm(staff.measures[0]).isExact).toBe(true)
  }
  const native = createNativeProject(result.score)
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native)
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
  expect(serializeMidi(applyScoreCommand(result.score, result.undo).score)).toEqual(serializeMidi(before))
})

it('restores regular length, keeps full-measure rest/span IDs and explicit geometry, and has no-op results', () => {
  const score = source(), first = score.parts[0].staves[0].measures[0], next = score.parts[0].staves[0].measures[1]
  score.hairpins = [{ id: 'manual', startEventId: first.voices[0].events[0].id, endEventId: next.voices[0].events[0].id,
    type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  expect(build(score)).toEqual({ unchanged: true })
  const changed = applyScoreCommand(score, build(score, T / 2).command!).score
  expect(changed.hairpins).toEqual(score.hairpins)
  expect(build(changed, T / 2)).toEqual({ unchanged: true })
  const restored = applyScoreCommand(changed, build(changed).command!)
  expect(restored.score).toEqual(score)
  expect(applyScoreCommand(restored.score, restored.undo).score).toEqual(changed)
  expect(() => createNativeProject(changed)).not.toThrow()
})

it.each([0, -1, 0.5, 4 * T, 5 * T, Number.NaN])('rejects invalid new length %s without mutating anything', ticks => {
  const score = source(), before = structuredClone(score)
  expect(build(score, ticks)).toEqual({ issue: 'length' }); expect(score).toEqual(before)
})

it.each(['note', 'split-rest', 'empty-voice'] as const)('refuses a non-full-rest first voice: %s', kind => {
  const score = source(), voice = score.parts[1].staves[0].measures[0].voices[0]
  voice.events = kind === 'note' ? [createNote({ id: 'occupied-note', pitch: { step: 'C', octave: 4 } }), createRest({ id: 'occupied-tail', position: createTimePosition(T), duration: createDuration('half', 1) })]
    : kind === 'split-rest' ? [createRest({ id: 'half-a', duration: createDuration('half') }), createRest({ id: 'half-b', position: createTimePosition(2 * T), duration: createDuration('half') })] : []
  const before = structuredClone(score)
  expect(build(score, T / 2)).toEqual({ issue: 'occupied' }); expect(score).toEqual(before)
})

it.each(['meter', 'timing'] as const)('refuses inconsistent %s across first staves', kind => {
  const score = source(), bar = score.parts[1].staves[0].measures[0]
  if (kind === 'meter') bar.timeSignature = { beats: 3, beatType: 4 }
  else bar.timing = { type: 'pickup', durationTicks: T }
  expect(inspectEmptyFirstMeasures(score).issue).toBe(kind)
  expect(build(score, T / 2)).toEqual({ issue: kind })
})

it.each(['tempo', 'harmony', 'expression', 'pedal'] as const)('rejects an out-of-range %s anchor, accepts the exact boundary and preserves all values', kind => {
  const score = source(), part = score.parts[1], staff = part.staves[0], bar = staff.measures[0]
  if (kind === 'tempo') score.tempoEvents = [{ id: 'tempo', measureId: 'measure-1', tick: T, bpm: 80 }]
  if (kind === 'harmony') score.harmonies = [{ id: 'harmony', measureId: bar.id, tick: T, text: 'Cm' }]
  if (kind === 'expression') score.expressionTexts = [{ id: 'expression', measureId: bar.id, tick: T, text: 'dolce' }]
  if (kind === 'pedal') score.pedalEvents = [{ id: 'pedal', partId: part.id, staffId: staff.id, measureId: bar.id, tick: T, value: 127 }]
  const before = structuredClone(score)
  expect(build(score, T / 2)).toEqual({ issue: 'anchor' }); expect(score).toEqual(before)
  const accepted = applyScoreCommand(score, build(score, T).command!).score
  expect(accepted.tempoEvents).toEqual(score.tempoEvents); expect(accepted.harmonies).toEqual(score.harmonies)
  expect(accepted.expressionTexts).toEqual(score.expressionTexts); expect(accepted.pedalEvents).toEqual(score.pedalEvents)
  expect(() => createNativeProject(accepted)).not.toThrow()
})

it('does not constrain a later bar anchor and preserves unusual imported length until an explicit restore', () => {
  const score = source()
  for (const part of score.parts) part.staves[0].measures[0].timing = { type: 'pickup', durationTicks: 1 }
  score.tempoEvents = [{ id: 'later', measureId: score.parts[0].staves[0].measures[1].id, tick: 2 * T, bpm: 60 }]
  expect(build(score, 1)).toEqual({ unchanged: true })
  expect(build(score).command).toBeDefined()
  expect(build(score, T / 2).command).toBeDefined()
})

it('round-trips the shortened first measure and following note timing through XML/MIDI without changing written notes', () => {
  const score = source(), voice = score.parts[0].staves[0].measures[1].voices[0]
  voice.events = [createNote({ id: 'following-note', pitch: { step: 'D', octave: 4 } }),
    createRest({ id: 'following-tail', position: createTimePosition(T), duration: createDuration('half', 1) })]
  const result = applyScoreCommand(score, build(score, T / 2).command!), roundtrip = parseMusicXml(serializeMusicXml(result.score))
  expect(result.score.parts[0].staves[0].measures[1]).toEqual(score.parts[0].staves[0].measures[1])
  expect(roundtrip.parts.flatMap(p => p.staves.map(s => measureDurationTicks(s.measures[0])))).toEqual([T / 2, T / 2])
  expect(serializeMidi(roundtrip)).toEqual(serializeMidi(result.score))
  expect(serializeMidi(result.score)).not.toEqual(serializeMidi(score))
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
})
