import { expect, it } from 'vitest'
import { applyScoreCommand, createDuration, createNote, type Score } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createNewScore } from './new-score'
import { buildTimeSignatureCommand } from './time-signature'

it.each([[11, 12, 13], [10, 30, 70], [30, 20, 10]])(
  'preserves valid authored numbers %j through meter edit, undo, native and XML', (...numbers) => {
    const score = createNewScore({ title: '원본 번호 보존', templateId: 'duet', measureCount: 3,
      keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
    for (const part of score.parts) for (const staff of part.staves) {
      staff.measures.forEach((bar, i) => { bar.number = numbers[i] })
      const last = staff.measures[2]
      last.voices[0].events = [createNote({ id: last.voices[0].events[0].id,
        pitch: { step: 'D', octave: 4 }, duration: createDuration('whole') })]
    }
    const bars = score.parts[0].staves[0].measures
    score.hairpins = [{ id: 'kept-manual', type: 'crescendo', startEventId: bars[0].voices[0].events[0].id,
      endEventId: bars[1].voices[0].events[0].id, engraving: { offsetX: 0, height: 4 } }]
    const before = structuredClone(score), expected: Score = structuredClone(score)
    expected.parts[0].staves[0].measures[1].timeSignature = { beats: 3, beatType: 4 }
    const command = buildTimeSignatureCommand(score, { type: 'measure', measureId: bars[1].id,
      address: { partId: score.parts[0].id, staffId: score.parts[0].staves[0].id,
        measureId: bars[1].id, voiceId: bars[1].voices[0].id } }, { beats: 3, beatType: 4 })
    expect(command).toBeDefined()
    const applied = applyScoreCommand(score, command!)
    expect(applied.score.parts[0].staves[0].measures.map(bar => bar.number)).toEqual(numbers)
    expect(applied.score).toEqual(expected)
    expect(score).toEqual(before)
    expect(applyScoreCommand(applied.score, applied.undo).score).toEqual(before)
    expect(applyScoreCommand(applyScoreCommand(applied.score, applied.undo).score, command!).score).toEqual(expected)
    const project = createNativeProject(applied.score)
    expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
    const roundtrip = parseMusicXml(serializeMusicXml(applied.score))
    expect(roundtrip.parts.map(part => part.staves[0].measures.map(bar => bar.number))).toEqual([numbers, numbers])
    expect(serializeMidi(applied.score)).toEqual(serializeMidi(expected))
    expect(serializeMidi(roundtrip)).toEqual(serializeMidi(expected))
  }
)

it('keeps sparse-number global tempo references valid when the selected bar changes meter', () => {
  const score = createNewScore({ title: '번호 기반 빠르기', templateId: 'solo-melody', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const bars = score.parts[0].staves[0].measures
  bars.forEach((bar, i) => { bar.number = [10, 30, 70][i] })
  score.tempoEvents = [{ id: 'kept-tempo', measureId: 'measure-30', tick: 0, bpm: 80 }]
  expect(() => createNativeProject(score)).not.toThrow()
  const command = buildTimeSignatureCommand(score, { type: 'measure', measureId: bars[1].id }, { beats: 3, beatType: 4 })!
  const result = applyScoreCommand(score, command)
  expect(() => createNativeProject(result.score)).not.toThrow()
  expect(result.score.tempoEvents).toEqual(score.tempoEvents)
  expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
})
