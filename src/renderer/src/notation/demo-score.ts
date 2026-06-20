import {
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  TICKS_PER_QUARTER
} from '../../../score-core'

const quarter = TICKS_PER_QUARTER

export const demoScore = createScore({
  id: 'renderer-prototype',
  title: 'Untitled Score',
  composer: 'in-C',
  parts: [
    createPart({
      id: 'piano',
      name: 'Piano',
      staves: [
        createStaff({
          id: 'piano-staff',
          measures: [
            createMeasure({
              id: 'measure-1',
              number: 1,
              voices: [
                createVoice({
                  id: 'voice-1',
                  events: [
                    createNote({
                      id: 'note-c4',
                      position: createTimePosition(0),
                      pitch: { step: 'C', octave: 4 }
                    }),
                    createNote({
                      id: 'note-d4',
                      position: createTimePosition(quarter),
                      pitch: { step: 'D', octave: 4 }
                    }),
                    createNote({
                      id: 'note-e4',
                      position: createTimePosition(quarter * 2),
                      pitch: { step: 'E', octave: 4 }
                    }),
                    createNote({
                      id: 'note-f-sharp-4',
                      position: createTimePosition(quarter * 3),
                      pitch: { step: 'F', octave: 4, alter: 1 }
                    })
                  ]
                })
              ]
            }),
            createMeasure({
              id: 'measure-2',
              number: 2,
              voices: [
                createVoice({
                  id: 'voice-1',
                  events: [
                    createNote({
                      id: 'note-g4',
                      position: createTimePosition(0),
                      pitch: { step: 'G', octave: 4 },
                      duration: createDuration('half')
                    }),
                    createRest({
                      id: 'rest-half',
                      position: createTimePosition(quarter * 2),
                      duration: createDuration('half')
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
