import { describe, expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  buildInvalidTieRepairCommand,
  buildTieCommand,
  collectTiePairs,
  createMeasure,
  createNote,
  createPart,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  formatTieValidationIssues,
  validateTieRelationIssues,
  validateTieRelations
} from './index'

const quarter = TICKS_PER_QUARTER

describe('score-core ties', () => {
  it('preserves both alternate-ending tie stops through native save and reopen', () => {
    const score = voltaTieFixture(true)
    expect(validateTieRelations(score)).toEqual([])
    expect(buildInvalidTieRepairCommand(score)).toBeUndefined()
    expect(collectTiePairs(score)).toEqual([
      { fromEventId: 'branch-start', toEventId: 'first-stop' },
      { fromEventId: 'branch-start', toEventId: 'second-stop', isDiscontinuous: true }
    ])
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
    const reopened = parseMusicXml(serializeMusicXml(score))
    expect(validateTieRelations(reopened)).toEqual([])
    expect(collectTiePairs(reopened)).toHaveLength(2)
    expect(createPlaybackTimeline(reopened).events.map(event => [event.startBeat, event.durationBeats])).toEqual([[0, 2], [2, 2]])
  })

  it('keeps lower-voice cross-measure ties independent of interleaved upper voices', () => {
    const score = crossMeasureFixture()
    score.parts[0]!.staves[0]!.measures.forEach((measure, index) => {
      measure.voices[0]!.id = 'lower'
      measure.voices.unshift(createVoice({ id: 'upper', events: [createNote({ id: `upper-${index}`, pitch: { step: 'G', octave: 5 } })] }))
    })
    const result = applyScoreCommand(score, buildTieCommand(score, 'measure-2-note', true)!)
    expect(collectTiePairs(result.score)).toEqual([{ fromEventId: 'measure-1-note', toEventId: 'measure-2-note' }])
    expect(validateTieRelations(result.score)).toEqual([])
  })

  it('does not tie across an unfilled timing gap', () => {
    const score = crossMeasureFixture()
    score.parts[0]!.staves[0]!.measures[0]!.timeSignature = { beats: 2, beatType: 4 }
    expect(buildTieCommand(score, 'measure-2-note', true)).toBeUndefined()
  })

  it('creates a second-ending tie from the repeated body, not the exclusive first ending', () => {
    const score = voltaTieFixture(false)
    const command = buildTieCommand(score, 'second-stop', true)
    expect(command).toBeDefined()
    const result = applyScoreCommand(score, command!)
    expect(collectTiePairs(result.score)).toEqual([
      { fromEventId: 'branch-start', toEventId: 'second-stop', isDiscontinuous: true }
    ])
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('prefers the forward ending when starting a tie at the repeat body', () => {
    const score = voltaTieFixture(false)
    const result = applyScoreCommand(score, buildTieCommand(score, 'branch-start', true)!)
    expect(collectTiePairs(result.score)).toEqual([{ fromEventId: 'branch-start', toEventId: 'first-stop' }])
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it.each(['branch-start', 'second-stop'])('removes branching ties from %s without leaving orphan flags', selected => {
    const score = voltaTieFixture(true)
    const result = applyScoreCommand(score, buildTieCommand(score, selected, false)!)
    expect(collectTiePairs(result.score)).toEqual(selected === 'branch-start' ? [] : [
      { fromEventId: 'branch-start', toEventId: 'first-stop' }
    ])
    expect(validateTieRelations(result.score)).toEqual([])
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('rejects a linear tie between mutually exclusive endings', () => {
    const score = voltaTieFixture(false)
    const measures = score.parts[0]!.staves[0]!.measures
    Object.assign(measures[1]!.voices[0]!.events[0]!, { ties: { start: true } })
    Object.assign(measures[2]!.voices[0]!.events[0]!, { ties: { stop: true } })
    expect(collectTiePairs(score)).toEqual([])
    expect(validateTieRelations(score)).toHaveLength(2)
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

  it('describes invalid ties with musical locations', () => {
    const issues = validateTieRelationIssues(tiedFixture(true, 'D'))
    const formatted = formatTieValidationIssues(issues)

    expect(issues).toHaveLength(2)
    expect(formatted[0]).toContain('마디 1')
    expect(formatted[0]).toContain('보표 1')
    expect(formatted[0]).toContain('성부 1')
    expect(formatted[0]).toContain('C4')
    expect(formatted[0]).toContain('타이 시작')
    expect(formatted[0]).toContain('note-1')
    expect(formatted[1]).toContain('D4')
    expect(formatted[1]).toContain('타이 끝')
  })

  it('builds a repair command that clears invalid tie flags', () => {
    const score = tiedFixture(true, 'D')
    const repair = buildInvalidTieRepairCommand(score)

    expect(repair?.issues).toHaveLength(2)

    const result = applyScoreCommand(score, repair!.command)
    const events = result.score.parts[0].staves[0].measures[0].voices[0].events

    expect(events[0].type === 'note' ? events[0].ties : undefined).toBeUndefined()
    expect(events[1].type === 'note' ? events[1].ties : undefined).toBeUndefined()
    expect(validateTieRelations(result.score)).toEqual([])
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

function voltaTieFixture(tied: boolean) {
  return createScore({ parts: [createPart({ staves: [createStaff({ measures:
    ['branch-start', 'first-stop', 'second-stop'].map((id, index) => createMeasure({
      id: `branch-measure-${index}`, number: index + 1, timeSignature: { beats: 1, beatType: 4 },
      repeat: index === 0 ? { start: true } : index === 1 ? { end: true } : undefined,
      volta: index === 0 ? undefined : { number: index as 1 | 2, start: true, end: true },
      voices: [createVoice({ events: [createNote({ id, pitch: { step: 'E', octave: 4 },
        ties: tied ? index === 0 ? { start: true } : { stop: true } : undefined
      })] })]
    }))
  })] })] })
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
