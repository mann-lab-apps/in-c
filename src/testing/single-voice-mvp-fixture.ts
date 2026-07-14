import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  resolveNotePitch,
  sortVoiceEvents,
  type Duration,
  type Measure,
  type Score,
  type VoiceEvent
} from '../score-core'

const quarter = TICKS_PER_QUARTER
const keySignature = { fifths: 1, mode: 'major' as const }
const tripletEighth: Duration = {
  ...createDuration('eighth'),
  tuplet: {
    actualNotes: 3,
    normalNotes: 2
  }
}

export const singleVoiceMvpScore = createScore({
  id: 'single-voice-mvp',
  title: 'Single Voice MVP',
  composer: 'in-C',
  tempo: {
    bpm: 120,
    text: '♩ = 120'
  },
  parts: [
    createPart({
      id: 'part-1',
      name: 'Melody',
      abbreviation: 'Mel.',
      staves: [
        createStaff({
          id: 'staff-1',
          measures: [
            measure(1, [
              note('m1-c4', 0, 'C', 4),
              note('m1-d4', quarter, 'D', 4),
              note('m1-e4', quarter * 2, 'E', 4),
              note('m1-f-sharp-4', quarter * 3, 'F', 4, 1)
            ]),
            measure(
              2,
              ['G', 'A', 'B', 'C', 'D', 'E', 'F', 'G'].map(
                (step, index) =>
                  note(
                    `m2-${index + 1}`,
                    (quarter / 2) * index,
                    step as 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
                    index < 3 ? 4 : 5,
                    step === 'F' ? 1 : undefined,
                    createDuration('eighth')
                  )
              )
            ),
            measure(3, [
              note(
                'm3-d5',
                0,
                'D',
                5,
                undefined,
                createDuration('quarter', 1)
              ),
              note(
                'm3-e5',
                quarter * 1.5,
                'E',
                5,
                undefined,
                createDuration('eighth')
              ),
              rest('m3-half-rest', quarter * 2, createDuration('half'))
            ]),
            measure(4, [
              note('m4-f-natural-1', 0, 'F', 4, 0),
              note('m4-f-natural-2', quarter, 'F', 4, 0),
              note('m4-g4', quarter * 2, 'G', 4),
              note('m4-a4', quarter * 3, 'A', 4)
            ]),
            measure(5, [
              rest('m5-half-rest', 0, createDuration('half')),
              note('m5-g4', quarter * 2, 'G', 4),
              {
                ...note('m5-c5-tie-start', quarter * 3, 'C', 5),
                ties: { start: true }
              }
            ]),
            measure(6, [
              {
                ...note('m6-c5-tie-stop', 0, 'C', 5),
                ties: { stop: true }
              },
              note(
                'm6-d5',
                quarter,
                'D',
                5,
                undefined,
                createDuration('quarter', 1)
              ),
              note(
                'm6-e5',
                quarter * 2.5,
                'E',
                5,
                undefined,
                createDuration('eighth')
              ),
              rest('m6-quarter-rest', quarter * 3, createDuration('quarter'))
            ]),
            measure(
              7,
              [
                note('m7-triplet-c5', 0, 'C', 5, undefined, tripletEighth),
                rest('m7-triplet-rest', quarter / 3, tripletEighth),
                note(
                  'm7-triplet-e5',
                  (quarter * 2) / 3,
                  'E',
                  5,
                  undefined,
                  tripletEighth
                ),
                rest(
                  'm7-dotted-half-rest',
                  quarter,
                  createDuration('half', 1)
                )
              ],
              [
                {
                  id: 'm7-triplet',
                  eventIds: [
                    'm7-triplet-c5',
                    'm7-triplet-rest',
                    'm7-triplet-e5'
                  ],
                  actualNotes: 3,
                  normalNotes: 2
                }
              ]
            ),
            measure(8, [
              note(
                'm8-g4-double-dotted',
                0,
                'G',
                4,
                undefined,
                createDuration('quarter', 2)
              ),
              note(
                'm8-a4-16th',
                quarter * 1.75,
                'A',
                4,
                undefined,
                createDuration('16th')
              ),
              rest('m8-half-rest', quarter * 2, createDuration('half'))
            ])
          ]
        })
      ]
    })
  ]
})

export function createSingleVoiceMvpScore(): Score {
  return structuredClone(singleVoiceMvpScore)
}

export function createReleaseTestScore(): Score {
  const score = createSingleVoiceMvpScore()
  score.id = 'release-test'
  score.title = 'release-test'
  score.tempo = {
    bpm: 75,
    text: '♩ = 75'
  }
  score.rehearsalMarks = [
    {
      id: 'release-rehearsal-a',
      measureId: 'measure-1',
      text: 'A'
    }
  ]
  score.staffTexts = [
    {
      id: 'release-staff-text',
      measureId: 'measure-1',
      text: 'dolce'
    }
  ]
  score.dynamics = [
    {
      id: 'release-dynamic',
      measureId: 'measure-1',
      value: 'mf'
    }
  ]
  score.hairpins = [
    {
      id: 'release-hairpin',
      startEventId: 'm1-c4',
      endEventId: 'm1-f-sharp-4',
      type: 'crescendo'
    }
  ]
  score.slurs = [
    {
      id: 'release-slur',
      startEventId: 'm1-c4',
      endEventId: 'm1-f-sharp-4'
    }
  ]

  const firstEvent = score.parts[0]?.staves[0]?.measures[0]?.voices[0]?.events[0]

  if (firstEvent?.type === 'note') {
    firstEvent.fermata = true
    firstEvent.articulations = ['staccato']
  }

  return score
}

export function createScoreSemanticSnapshot(score: Score) {
  const eventIndexById = createEventIndexById(score)

  return {
    title: score.title,
    composer: score.composer,
    tempo: normalizeTempoForSnapshot(score.tempo),
    rehearsalMarks: score.rehearsalMarks?.map(({ measureId, text }) => ({
      measureId,
      text
    })),
    staffTexts: score.staffTexts?.map(({ measureId, text }) => ({
      measureId,
      text
    })),
    dynamics: score.dynamics?.map(({ measureId, value }) => ({
      measureId,
      value
    })),
    hairpins: score.hairpins?.map((hairpin) => ({
      startIndex: eventIndexById.get(hairpin.startEventId),
      endIndex: eventIndexById.get(hairpin.endEventId),
      type: hairpin.type
    })),
    slurs: score.slurs?.map((slur) => ({
      startIndex: eventIndexById.get(slur.startEventId),
      endIndex: eventIndexById.get(slur.endEventId),
      number: slur.number ?? 1
    })),
    parts: score.parts.map((part) => ({
      name: part.name,
      abbreviation: part.abbreviation,
      staves: part.staves.map((staff) => ({
        measures: staff.measures.map((currentMeasure) => {
          const voice = currentMeasure.voices[0]
          const events = sortVoiceEvents(voice.events)
          const eventIndexes = new Map(
            events.map((event, index) => [event.id, index])
          )

          return {
            number: currentMeasure.number,
            timing: currentMeasure.timing,
            clef: {
              sign: currentMeasure.clef.sign,
              line: currentMeasure.clef.line,
              ...(currentMeasure.clef.octaveChange !== undefined
                ? {
                    octaveChange: currentMeasure.clef.octaveChange
                  }
                : {})
            },
            keySignature: currentMeasure.keySignature,
            timeSignature: currentMeasure.timeSignature,
            events: events.map((event) =>
              semanticEvent(currentMeasure, voice, event)
            ),
            tuplets: (voice.tuplets ?? []).map((group) => ({
              memberIndexes: group.eventIds.map((eventId) =>
                eventIndexes.get(eventId)
              ),
              actualNotes: group.actualNotes,
              normalNotes: group.normalNotes
            }))
          }
        })
      }))
    }))
  }
}

function normalizeTempoForSnapshot(tempo: Score['tempo']) {
  if (!tempo) {
    return undefined
  }

  return {
    bpm: tempo.bpm,
    beatUnit: tempo.beatUnit ?? 'quarter',
    dots: tempo.dots ?? 0,
    text: tempo.text
  }
}

function semanticEvent(
  currentMeasure: Measure,
  voice: Measure['voices'][number],
  event: VoiceEvent
) {
  return {
    type: event.type,
    tick: event.position.tick,
    duration: event.duration,
    ...(event.type === 'note'
      ? {
          pitch: resolveNotePitch(currentMeasure, voice, event),
          ties:
            event.ties?.start || event.ties?.stop
              ? {
                  start: Boolean(event.ties.start),
                  stop: Boolean(event.ties.stop)
                }
              : undefined,
          articulations: event.articulations,
          fermata: Boolean(event.fermata),
          breathMark: event.breathMark
        }
      : {
          fullMeasure: Boolean(event.fullMeasure),
          fermata: Boolean(event.fermata),
          breathMark: event.breathMark
        })
  }
}

function createEventIndexById(score: Score): Map<string, number> {
  const eventIndexById = new Map<string, number>()
  let index = 0

  score.parts.forEach((part) => {
    part.staves.forEach((staff) => {
      staff.measures.forEach((currentMeasure) => {
        currentMeasure.voices.forEach((voice) => {
          sortVoiceEvents(voice.events).forEach((event) => {
            eventIndexById.set(event.id, index)
            index += 1
          })
        })
      })
    })
  })

  return eventIndexById
}

function measure(
  number: number,
  events: VoiceEvent[],
  tuplets?: NonNullable<ReturnType<typeof createVoice>['tuplets']>
) {
  return createMeasure({
    id: `measure-${number}`,
    number,
    keySignature,
    voices: [
      createVoice({
        id: 'voice-1',
        events,
        tuplets
      })
    ]
  })
}

function note(
  id: string,
  tick: number,
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
  octave: number,
  alter?: -2 | -1 | 0 | 1 | 2,
  duration = createDuration('quarter')
) {
  return createNote({
    id,
    position: createTimePosition(tick),
    pitch: {
      step,
      octave,
      alter
    },
    duration
  })
}

function rest(id: string, tick: number, duration: Duration) {
  return createRest({
    id,
    position: createTimePosition(tick),
    duration
  })
}
