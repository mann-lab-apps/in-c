import { describe, expect, it } from 'vitest'
import { applyScoreCommand, createDuration, createFullMeasureRest, createMeasure, createNote, createPart, createScore, createStaff, createVoice } from '../../../score-core'
import { buildClearMeasureContents } from '../editor/measure-management'
import { planPartMultimeasureRests } from './part-multimeasure-rests'

function fixture() {
  const measures = Array.from({ length: 14 }, (_, index) => createMeasure({ id: `m${index+1}`, number: index+1 }))
  const last = measures.at(-1)!
  last.voices = [createVoice({ events: [createNote({ id:'last-note', pitch:{step:'C', octave:4}, duration:createDuration('whole') })] })]
  return createScore({parts:[createPart({staves:[createStaff({measures})]})]})
}

describe('single-staff part rest grouping for print', () => {
  it('keeps the original score and splits at key/meter, text, repeat and system boundaries', () => {
    const score = fixture()
    const staff = score.parts[0].staves[0]
    staff.measures.slice(2).forEach(measure => { measure.keySignature = { fifths:1 } })
    staff.measures.slice(6).forEach(measure => { measure.timeSignature = { beats:3, beatType:4 } })
    staff.measures[4].repeat = { start:true }
    staff.measures[5].repeat = { end:true }
    score.rehearsalMarks = [{id:'mark', measureId:'measure-9', text:'A'}]
    score.layout = {systemBreakBeforeMeasureIds:['measure-12']}
    const before = structuredClone(score)
    const plan = planPartMultimeasureRests(score)!
    expect([...plan.counts]).toEqual([['m1',2],['m3',2],['m7',2],['m10',2],['m12',2]])
    expect(plan.score.parts[0].staves[0].measures.map(measure => measure.number)).toEqual([1,3,5,6,7,9,10,12,14])
    expect(plan.score.parts[0].staves[0].measures.at(-1)).toEqual(before.parts[0].staves[0].measures.at(-1))
    expect(plan.score.layout?.systemBreakBeforeMeasureIds).toEqual(['measure-12'])
    expect(score).toEqual(before)
  })

  it('retains decorated rests, pickups, every measure inside a span and bars with active voltas', () => {
    const score = fixture()
    const staff = score.parts[0].staves[0]
    const measures = staff.measures
    measures[1].voices[0].events[0].fermata = true
    measures[4].volta = { number:1, start:true }
    measures[7].volta = { number:1, end:true }
    measures[12].timing = { type:'pickup', durationTicks:480 }
    score.hairpins = [{id:'hairpin', type:'crescendo', startEventId:measures[8].voices[0].events[0].id,
      endEventId:measures[11].voices[0].events[0].id}]
    expect([...planPartMultimeasureRests(score)!.counts]).toEqual([['m3',2]])
    expect(planPartMultimeasureRests({...score,parts:[{...score.parts[0],staves:[staff,{...staff,id:'other-staff'}]}]})).toBeUndefined()
  })
})

it('groups aligned rests across both staves while protecting lower notes, markings and clef changes', () => {
  const score = fixture()
  const { staves } = score.parts[0]
  const lower = Array.from({ length: 14 }, (_, index) => createMeasure({
    id: `b${index+1}`, number: index+1, clef: { sign:'F', line:4 }
  }))
  staves.push(createStaff({ id:'lower-staff', measures:lower }))
  lower[3].voices = [createVoice({ events:[createNote({
    id:'bass-note', pitch:{ step:'C', octave:3 }, duration:createDuration('whole')
  })] })]
  score.staffTexts = [{ id:'bass-text', measureId:'b7', text:'dolce' }]
  lower.slice(9).forEach(measure => { measure.clef = { sign:'C', line:3 } })
  score.layout = { pageBreakBeforeMeasureIds:['b12'] }
  const before = structuredClone(score)
  const plan = planPartMultimeasureRests(score)!
  expect(plan).toBeDefined()
  expect([...plan.counts]).toEqual([
    ['m1',3],['b1',3],['m5',2],['b5',2],['m8',2],['b8',2],['m10',2],['b10',2],['m12',2],['b12',2]
  ])
  expect(plan.score.parts[0].staves.map(staff => staff.measures.map(measure => measure.number)))
    .toEqual([[1,4,5,7,8,10,12,14], [1,4,5,7,8,10,12,14]])
  expect(plan.score.parts[0].staves[1].measures[1]).toEqual(lower[3])
  expect(plan.score.layout?.pageBreakBeforeMeasureIds).toEqual(['b12'])
  expect(score).toEqual(before)
  lower[0].timeSignature = { beats:3, beatType:4 }
  expect(planPartMultimeasureRests(score)).toBeUndefined()
})

it('groups bars cleared to full-measure rests in every voice and keeps sounding or decorated secondary voices', () => {
  const score = fixture()
  const staff = score.parts[0].staves[0]
  staff.measures = staff.measures.slice(0, 7)
  for (const measure of staff.measures) {
    const rest = createFullMeasureRest({ id: `${measure.id}-secondary-rest` })
    measure.voices.push(createVoice({ id: 'voice-2', events: [rest] }))
  }
  const getSecondaryVoice = (number: number) => staff.measures[number - 1].voices[1]
  for (const number of [2, 4]) {
    getSecondaryVoice(number).events = [createNote({
      id: `secondary-note-${number}`, pitch: { step: 'D', octave: 4 }, duration: createDuration('whole')
    })]
  }
  getSecondaryVoice(7).events[0].fermata = true

  const cleared = buildClearMeasureContents(score, 'm2', () => 'cleared-secondary')
  expect(cleared.kind).toBe('change')
  if (cleared.kind !== 'change') throw new Error('Expected a clear measure command')
  const { score: next, undo } = applyScoreCommand(score, cleared.command)
  const beforePrint = structuredClone(next)
  const plan = planPartMultimeasureRests(next)
  const measures = next.parts[0].staves[0].measures

  expect([...(plan?.counts ?? [])]).toEqual([['m1', 3], ['m5', 2]])
  expect(plan?.score.parts[0].staves[0].measures).toEqual([
    measures[0], measures[3], measures[4], measures[6]
  ])
  expect(next).toEqual(beforePrint)
  expect(applyScoreCommand(next, undo).score).toEqual(score)
})

it('preserves silent bars with jump markers on either staff in part PDF', () => {
  const score = fixture()
  const { staves } = score.parts[0]
  const lower = Array.from({ length: 14 }, (_, index) =>
    createMeasure({ id: `b${index + 1}`, number: index + 1 }))
  staves.push(createStaff({ id: 'lower-staff', measures: lower }))
  lower[3].navigation = [{ type: 'segno', label: 'A' }]
  staves[0].measures[6].navigation = [{ type: 'fine' }]
  lower[10].navigation = [{ type: 'dalsegno', label: 'A' }]
  const original = structuredClone(score)

  const plan = planPartMultimeasureRests(score)!
  const retained = [1, 4, 5, 7, 8, 11, 12, 14]
  expect(plan.score.parts[0].staves.map(staff => staff.measures.map(measure => measure.number)))
    .toEqual([retained, retained])
  expect([...plan.counts]).toEqual([
    ['m1', 3], ['b1', 3], ['m5', 2], ['b5', 2],
    ['m8', 3], ['b8', 3], ['m12', 2], ['b12', 2]
  ])
  expect(plan.score.parts[0].staves[1].measures[5].navigation).toEqual(lower[10].navigation)
  expect(score).toEqual(original)
})

it.each([
  { octaveChange: 0, expected: [['m1', 13]] },
  { octaveChange: 1, expected: [['m2', 12]] }
])('uses octave change $octaveChange to split rests only when the clef changes', ({ octaveChange, expected }) => {
  const score = fixture()
  const { measures } = score.parts[0].staves[0]
  for (const measure of measures.slice(1)) {
    measure.clef = { ...measure.clef, octaveChange }
  }
  const original = structuredClone(score)
  const plan = planPartMultimeasureRests(score)
  expect([...(plan?.counts ?? [])]).toEqual(expected)
  expect(score).toEqual(original)
})

it.each([
  { label: 'an explicit neutral interval', transposition: { chromatic: 0, diatonic: 0, octaveChange: 0 }, expected: [['m1', 13]] },
  { label: 'a chromatic and diatonic change', transposition: { chromatic: -2, diatonic: -1 }, expected: [['m2', 12]] },
  { label: 'an octave change', transposition: { chromatic: 0, octaveChange: -1 }, expected: [['m2', 12]] },
  { label: 'a diatonic-only change', transposition: { chromatic: 0, diatonic: -1 }, expected: [['m2', 12]] }
])('plans grouped rests for $label', ({ transposition, expected }) => {
  const score = fixture()
  for (const measure of score.parts[0].staves[0].measures.slice(1)) {
    measure.transposition = transposition
  }
  const original = structuredClone(score)
  expect([...(planPartMultimeasureRests(score)?.counts ?? [])]).toEqual(expected)
  expect(score).toEqual(original)
})

it('keeps grouped rests when an existing transposition only makes its zero octave explicit', () => {
  const score = fixture()
  const { measures } = score.parts[0].staves[0]
  const transposition = { chromatic: -2, diatonic: -1 }
  measures[0].transposition = transposition
  for (const measure of measures.slice(1)) {
    measure.transposition = { ...transposition, octaveChange: 0 }
  }
  const original = structuredClone(score)
  expect([...(planPartMultimeasureRests(score)?.counts ?? [])]).toEqual([['m1', 13]])
  expect(score).toEqual(original)
})
