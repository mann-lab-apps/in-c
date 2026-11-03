import { describe, expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createNativeProject, encodeNativeProject } from '../project/schema'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildTieCommand,
  collectTiePairs,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  validateTieRelations
} from './index'

const quarter = TICKS_PER_QUARTER

describe('score-core ties', () => {
  it.each(['same-gap', 'same-overlap', 'boundary-gap', 'boundary-offset'] as const)(
    '[tie-time-adjacency] rejects %s without losing invalid-marker cleanup', kind => {
      const score = kind.startsWith('same') ? tiedFixture(false) : crossMeasureFixture()
      const measures = score.parts[0].staves[0].measures
      const first = measures[0].voices[0].events[0]
      const second = kind.startsWith('same')
        ? measures[0].voices[0].events[1]
        : measures[1].voices[0].events[0]
      if (first.type !== 'note' || second.type !== 'note') throw Error('Expected notes')
      if (kind === 'same-gap') {
        second.position.tick = quarter * 2
        measures[0].timeSignature.beats = 3
      }
      if (kind === 'same-overlap') second.position.tick = quarter / 2
      if (kind === 'boundary-gap') measures[0].timeSignature.beats = 2
      if (kind === 'boundary-offset') {
        second.position.tick = quarter / 2
        measures[1].timeSignature.beats = 2
      }
      const before = structuredClone(score)
      const fixtureRoot = process.env.DDIRORI_TIE_TIME_QA_DIR
      // Native projects deliberately reject overlapping rhythm. Keep that
      // core-only invalid input separate from the supported gap fixtures.
      if (fixtureRoot && kind !== 'same-overlap') {
        const directory = join(fixtureRoot, kind)
        mkdirSync(directory, { recursive: true })
        writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
        writeFileSync(join(directory, 'contract.json'), JSON.stringify({ eventId: first.id, enabled: false }))
      }
      expect(buildTieCommand(score, first.id, true)).toBeUndefined()
      expect(buildTieCommand(score, second.id, true)).toBeUndefined()
      expect(score).toEqual(before)
      first.ties = { start: true }; second.ties = { stop: true }
      expect(collectTiePairs(score)).toEqual([])
      expect(validateTieRelations(score)).toHaveLength(2)
      expect(createPlaybackTimeline(score).events).toHaveLength(2)
      expect(buildTieCommand(score, second.id, false)).toBeDefined()
    }
  )

  it('[tie-time-adjacency] keeps a pickup boundary tie despite the nominal meter', () => {
    const score = crossMeasureFixture()
    score.parts[0].staves[0].measures[0].timeSignature.beats = 4
    score.parts[0].staves[0].measures[0].timing = { type: 'pickup', durationTicks: quarter }
    const fixtureRoot = process.env.DDIRORI_TIE_TIME_QA_DIR
    if (fixtureRoot) {
      const directory = join(fixtureRoot, 'pickup')
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(createNativeProject(score)))
      writeFileSync(join(directory, 'contract.json'), JSON.stringify({ eventId: 'measure-1-note', enabled: true }))
    }
    const result = applyScoreCommand(score, buildTieCommand(score, 'measure-1-note', true)!)
    if (fixtureRoot) {
      writeFileSync(join(fixtureRoot, 'pickup', 'expected.chromatics'), encodeNativeProject(createNativeProject(result.score)))
      writeFileSync(join(fixtureRoot, 'pickup', 'expected.mid'), serializeMidi(result.score))
    }
    expect(validateTieRelations(result.score)).toEqual([])
    expect(collectTiePairs(result.score)).toHaveLength(1)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it.each([false,true])('keeps the second-voice tie across peer events and reordered voices: %s',reverse=>{
    const score=crossMeasureFixture()
    for(const [index,measure]of score.parts[0].staves[0].measures.entries())measure.voices.push(createVoice({id:'voice-2',events:[createNote({id:`voice2-${index}`,pitch:{step:'D',octave:4}})]}))
    if(reverse)score.parts[0].staves[0].measures[1].voices.reverse()
    const command=buildTieCommand(score,'voice2-0',true)
    expect(command).toBeDefined()
    const result=applyScoreCommand(score,command!)
    expect(collectTiePairs(result.score)).toEqual([{fromEventId:'voice2-0',toEventId:'voice2-1'}]);expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
    const remove=buildTieCommand(result.score,'voice2-1',false)!
    expect(collectTiePairs(applyScoreCommand(result.score,remove).score)).toEqual([])
  })

  it.each(['rest','missing','empty'] as const)('does not jump a %s voice measure when finding tie neighbours',kind=>{
    const score=crossMeasureFixture(),measures=score.parts[0].staves[0].measures,third=structuredClone(measures[1])
    third.id='measure-3';third.number=3;third.voices[0].events[0].id='peer-3';measures.push(third)
    for(const [index,measure]of measures.entries())measure.voices.push(createVoice({id:'voice-2',events:[createNote({id:`voice2-${index}`,pitch:{step:'D',octave:4}})]}))
    if(kind==='rest')measures[1].voices[1].events=[createRest({id:'voice2-rest'})]
    else if(kind==='missing')measures[1].voices=measures[1].voices.filter(v=>v.id!=='voice-2')
    else measures[1].voices[1].events=[]
    expect(buildTieCommand(score,'voice2-0',true)).toBeUndefined()
    const first=measures[0].voices[1].events[0],last=measures[2].voices[1].events[0]
    if(first.type!=='note'||last.type!=='note')throw Error('Expected authored note controls')
    first.ties={start:true};last.ties={stop:true}
    expect(collectTiePairs(score)).toEqual([]);expect(validateTieRelations(score)).toHaveLength(2)
    const cleanup=buildTieCommand(score,'voice2-0',false)!
    expect(validateTieRelations(applyScoreCommand(score,cleanup).score)).toEqual([])
  })
  it('creates and removes a tie between adjacent equal pitches', () => {
    const score = tiedFixture(false)
    const command = buildTieCommand(score, 'note-1', true)
    const result = applyScoreCommand(score, command!)

    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'note-1',
        toEventId: 'note-2'
      }
    ])
    expect(validateTieRelations(result.score)).toEqual([])

    const remove = buildTieCommand(result.score, 'note-1', false)
    const removed = applyScoreCommand(result.score, remove!)

    expect(collectTiePairs(removed.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('creates a tie to the previous note when the selected note is the tie stop', () => {
    const score = tiedFixture(false)
    const command = buildTieCommand(score, 'note-2', true)
    const result = applyScoreCommand(score, command!)

    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'note-1',
        toEventId: 'note-2'
      }
    ])
    expect(validateTieRelations(result.score)).toEqual([])
  })

  it('removes a tie when the selected note is the tie stop', () => {
    const score = tiedFixture(true)
    const command = buildTieCommand(score, 'note-2', false)
    const result = applyScoreCommand(score, command!)

    expect(collectTiePairs(result.score)).toEqual([])
    expect(validateTieRelations(result.score)).toEqual([])
  })

  it('creates a tie across a measure boundary as one undoable batch', () => {
    const score = crossMeasureFixture()
    const command = buildTieCommand(score, 'measure-1-note', true)
    const result = applyScoreCommand(score, command!)

    expect(command?.type).toBe('score.batch')
    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'measure-1-note',
        toEventId: 'measure-2-note'
      }
    ])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('creates a tie to the previous measure when selecting the later note', () => {
    const score = crossMeasureFixture()
    const command = buildTieCommand(score, 'measure-2-note', true)
    const result = applyScoreCommand(score, command!)

    expect(command?.type).toBe('score.batch')
    expect(collectTiePairs(result.score)).toEqual([
      {
        fromEventId: 'measure-1-note',
        toEventId: 'measure-2-note'
      }
    ])
    expect(validateTieRelations(result.score)).toEqual([])
  })

  it('rejects different pitches and non-adjacent notes', () => {
    const differentPitch = tiedFixture(false, 'D')

    expect(buildTieCommand(differentPitch, 'note-1', true)).toBeUndefined()

    const withGap = tiedFixture(false)
    const events =
      withGap.parts[0].staves[0].measures[0].voices[0].events
    events.splice(
      1,
      0,
      createNote({
        id: 'intervening-note',
        position: createTimePosition(quarter),
        pitch: { step: 'G', octave: 4 }
      })
    )
    events[2] = {
      ...events[2],
      position: createTimePosition(quarter * 2)
    }

    expect(buildTieCommand(withGap, 'note-1', true)).toBeUndefined()
  })

  it('can remove tie markers after an intervening edit invalidates the tie', () => {
    const score = tiedFixture(true, 'D')
    const command = buildTieCommand(score, 'note-1', false)
    const result = applyScoreCommand(score, command!)

    expect(command).toBeDefined()
    expect(validateTieRelations(result.score)).toEqual([])
    expect(collectTiePairs(result.score)).toEqual([])
  })
})

function tiedFixture(tied: boolean, secondStep: 'C' | 'D' = 'C') {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                timeSignature: { beats: 2, beatType: 4 },
                voices: [
                  createVoice({
                    events: [
                      createNote({
                        id: 'note-1',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 },
                        ties: tied ? { start: true } : undefined
                      }),
                      createNote({
                        id: 'note-2',
                        position: createTimePosition(quarter),
                        pitch: { step: secondStep, octave: 4 },
                        ties: tied ? { stop: true } : undefined
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function crossMeasureFixture() {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                timeSignature: { beats: 1, beatType: 4 },
                voices: [
                  createVoice({
                    events: [
                      createNote({
                        id: 'measure-1-note',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 }
                      })
                    ]
                  })
                ]
              }),
              createMeasure({
                id: 'measure-2',
                number: 2,
                timeSignature: { beats: 1, beatType: 4 },
                voices: [
                  createVoice({
                    events: [
                      createNote({
                        id: 'measure-2-note',
                        position: createTimePosition(0),
                        pitch: { step: 'C', octave: 4 }
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}
