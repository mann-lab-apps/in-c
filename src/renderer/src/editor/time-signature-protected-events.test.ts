import { expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createRest,
  createTimePosition, type Rest, type Score
} from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { buildScoreMeasureTimeSignatureCommand, buildTimeSignatureCommand } from './time-signature'
import { createNewScore } from './new-score'

const rest = (id: string, tick: number, half = false): Rest => createRest({
  id, position: createTimePosition(tick), duration: createDuration(half ? 'half' : 'quarter')
})
function source() {
  return createNewScore({ title: 'Meter protection', templateId: 'duet', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
}
const measure = (s: Score) => s.parts[0].staves[0].measures[0]
const quarters = (s: Score) => {
  measure(s).voices[0].events = [0, 1, 2, 3].map(i => rest(`owned-rest-${i}`, i * T))
}
const command = (s: Score, beats: number) => buildTimeSignatureCommand(s,
  { type: 'measure', measureId: measure(s).id }, { beats, beatType: 4 })

it.each([{ fermata: true as const }, { breathMark: 'caesura' as const }])(
  'preserves full-measure rest notation %j while changing meter', mark => {
    for (const beats of [3, 5]) {
      const s = source(), original = measure(s).voices[0].events[0]
      Object.assign(original, mark)
      const before = createNativeProject(s), c = command(s, beats)
      expect(c).toBeDefined()
      const changed = applyScoreCommand(s, c!).score
      expect(measure(changed).voices[0].events[0]).toMatchObject({ id: original.id, ...mark })
      expect(decodeNativeProject(encodeNativeProject(createNativeProject(changed))).score).toEqual(changed)
      expect(createNativeProject(applyScoreCommand(changed, applyScoreCommand(s, c!).undo).score)).toEqual(before)
    }
  }
)

it.each([0, 2])('rejects shrinking away an authored hairpin endpoint starting at rest %i', start => {
  const s = source(); quarters(s)
  s.hairpins = [{ id: 'protected-hairpin', startEventId: `owned-rest-${start}`,
    endEventId: 'owned-rest-3', type: 'crescendo', engraving: { offsetY: 0, height: 4 } }]
  const before = createNativeProject(s), c = command(s, 2)
  // A command which leaves a dangling endpoint must never reach the editor.
  if (c) expect(() => createNativeProject(applyScoreCommand(s, c).score)).not.toThrow()
  expect(c).toBeUndefined()
  expect(createNativeProject(s)).toEqual(before)
})

it.each([{ fermata: true as const }, { breathMark: 'breath' as const }])(
  'rejects removing a rest carrying notation %j', mark => {
    const s = source(); quarters(s)
    Object.assign(measure(s).voices[0].events[3], mark)
    const before = structuredClone(s)
    expect(command(s, 2)).toBeUndefined()
    expect(s).toEqual(before)
  }
)

it.each([{ fermata: true as const }, { breathMark: 'caesura' as const }])(
  'rejects silently dropping %j when subdividing a clipped rest', mark => {
    const s = source()
    measure(s).voices[0].events = [rest('head', 0, true), { ...rest('clipped', 2 * T, true), ...mark }]
    const c = command(s, 3)
    // Rejection or faithful attachment preservation is safe; silent loss is not.
    if (c) expect(measure(applyScoreCommand(s, c).score).voices[0].events.find(e => e.id === 'clipped')).toMatchObject(mark)
    expect(createNativeProject(s).score).toEqual(s)
  }
)

it('keeps a surviving rest endpoint and exact manual settings with undo/native', () => {
  const s = source(); quarters(s)
  s.hairpins = [{ id: 'surviving-hairpin', startEventId: 'owned-rest-0', endEventId: 'owned-rest-1',
    type: 'diminuendo', engraving: { offsetY: 0, height: 4 } }]
  const before = createNativeProject(s), c = command(s, 3)
  expect(c).toBeDefined()
  const result = applyScoreCommand(s, c!)
  expect(result.score.hairpins).toEqual(s.hairpins)
  expect(createNativeProject(result.score).score.parts[1]).toEqual(s.parts[1])
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(before)
})

it('continues allowing plain rest cleanup and preserves a different part’s endpoints', () => {
  const s = source(); quarters(s)
  const other = s.parts[1].staves[0].measures[0]
  other.voices[0].events = [0, 1, 2, 3].map(i => rest(`other-${i}`, i * T))
  s.hairpins = [{ id: 'other-hairpin', startEventId: 'other-0', endEventId: 'other-3', type: 'crescendo' }]
  const before = createNativeProject(s), c = command(s, 2)
  expect(c).toBeDefined()
  const result = applyScoreCommand(s, c!)
  expect(result.score.parts[1]).toEqual(s.parts[1]); expect(result.score.hairpins).toEqual(s.hairpins)
  expect(createNativeProject(applyScoreCommand(result.score, result.undo).score)).toEqual(before)
})

it.each(['staff', 'score'] as const)('protects a hairpin release when %s meter divides its clipped rest', scope => {
  const score = source()
  const bar = measure(score)
  const clipped = createRest({
    id: 'clipped', position: createTimePosition(T), duration: createDuration('half', 1)
  })
  bar.voices[0].events = [rest('head', 0), clipped]
  score.hairpins = [{ id: 'ending', startEventId: 'head', endEventId: clipped.id,
    type: 'diminuendo', endAnchor: 'release' }]
  const before = structuredClone(score)
  const selection = { type: 'measure' as const, measureId: bar.id }
  const splitMeter = { beats: 9, beatType: 16 }

  if (scope === 'staff') {
    expect(buildTimeSignatureCommand(score, selection, splitMeter)).toBeUndefined()
  } else {
    expect(buildScoreMeasureTimeSignatureCommand(score, selection, splitMeter)).toMatchObject({ kind: 'blocked' })
  }
  expect(score).toEqual(before)

  const shorter = applyScoreCommand(score, command(score, 3)!).score
  expect(measure(shorter).voices[0].events.at(-1)).toMatchObject({
    id: clipped.id, position: { tick: T }, duration: { value: 'half' }
  })
  expect(shorter.hairpins).toEqual(score.hairpins)

  const onsetScore = structuredClone(score)
  onsetScore.hairpins![0].endAnchor = 'onset'
  const onset = applyScoreCommand(onsetScore, buildTimeSignatureCommand(onsetScore, selection, splitMeter)!).score
  expect(measure(onset).voices[0].events.map(event => event.position.tick)).toEqual([0, T, 2 * T])
  expect(measure(onset).voices[0].events[1].id).toBe(clipped.id)
  expect(onset.hairpins).toEqual(onsetScore.hairpins)
})
