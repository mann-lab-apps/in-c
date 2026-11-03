import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { Accidental } from 'vexflow'
import { applyScoreCommand, createRest } from '../../../score-core'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createChordAccidentalMemoryScore, explicitChordMemoryOracle } from '../../../testing/chord-accidental-memory-fixture'
import { buildPitchStepCommand } from '../editor/pitch-editing'
import { createPlaybackTimeline } from '../playback/timeline'
import { serializeMidi } from '../midi/serialize-midi'
import { createStaveNote } from './NotationPreview'

beforeAll(() => {
  const out = process.env.DDIRORI_CHORD_MEMORY_QA_DIR
  if (!out) return
  const score = createChordAccidentalMemoryScore()
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
  writeFileSync(join(out, 'expected.mid'), serializeMidi(explicitChordMemoryOracle(score)))
  writeFileSync(join(out, 'contract.json'), JSON.stringify({ notesByBeat: [[60, 65], [65], [64], [64]], visibleAccidentalsByEvent: [1, 0, 1, 0], scope: 'Authored unique pitches/same voice/bar;MIDI oracle explicitly spells every alteration' }, null, 2))
})

describe('chord.accidental-memory integration', () => {
  it('agrees on playback/MIDI/XML with independently explicit pitches without modifying source', () => {
    const score = createChordAccidentalMemoryScore(), before = structuredClone(score), oracle = explicitChordMemoryOracle(score)
    expect(createPlaybackTimeline(score)).toEqual(createPlaybackTimeline(oracle))
    expect(serializeMidi(score)).toEqual(serializeMidi(oracle))
    const reopened = parseMusicXml(serializeMusicXml(score))
    expect(serializeMidi(reopened)).toEqual(serializeMidi(oracle))
    expect(score).toEqual(before)
  })
  it('shows the secondary sharp,then an explicit natural,without redundant repeated signs', () => {
    const score = createChordAccidentalMemoryScore(), measure = score.parts[0]!.staves[0]!.measures[0]!, voice = measure.voices[0]!
    const modifiers = voice.events.map(event => createStaveNote(event, measure, voice, new Set()).getModifiers().filter(modifier => modifier instanceof Accidental))
    expect(modifiers.map(values => values.length)).toEqual([1, 0, 1, 0])
    expect(modifiers[0]![0]!.getIndex()).toBe(1)
    expect(modifiers[2]![0]!.getIndex()).toBe(0)
  })
  it('uses the same carry for an existing letter-entry command with exact undo', () => {
    const score = createChordAccidentalMemoryScore(), measure = score.parts[0]!.staves[0]!.measures[0]!, voice = measure.voices[0]!, old = voice.events[1]!
    voice.events[1] = createRest({ id: old.id, position: old.position, duration: old.duration })
    const before = structuredClone(score), command = buildPitchStepCommand(score, { type: 'event', eventId: old.id }, 'E')!
    const result = applyScoreCommand(score, command)
    expect(result.score.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[1]).toMatchObject({ type: 'note', pitch: { step: 'E', octave: 4, alter: 1 } })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })
})
