import {
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createVoice
} from '../../../score-core'

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
                      pitch: { step: 'C', octave: 4 }
                    }),
                    createNote({
                      id: 'note-d4',
                      pitch: { step: 'D', octave: 4 }
                    }),
                    createNote({
                      id: 'note-e4',
                      pitch: { step: 'E', octave: 4 }
                    }),
                    createNote({
                      id: 'note-f-sharp-4',
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
                      pitch: { step: 'G', octave: 4 },
                      duration: createDuration('half')
                    }),
                    createRest({
                      id: 'rest-half',
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
