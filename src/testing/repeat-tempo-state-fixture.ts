import { createScore, createPart, createStaff, createMeasure, createVoice, createNote, TICKS_PER_QUARTER } from '../score-core'

export function createRepeatTempoStateFixture() {
  return createScore({ id:'repeat-tempo-state', title:'Implicit tempo at repeat return',
    tempo:{bpm:120,beatUnit:'quarter'},
    tempoEvents:[{id:'late-slow',measureId:'implicit-repeat',tick:TICKS_PER_QUARTER,bpm:60,beatUnit:'quarter'}],
    parts:[createPart({id:'tempo-part',staves:[createStaff({id:'tempo-staff',measures:[
      createMeasure({id:'implicit-repeat',timeSignature:{beats:2,beatType:4},repeat:{start:true,end:true,times:3},voices:[createVoice({events:[
        createNote({id:'tempo-a',pitch:{step:'C',octave:4}}),
        createNote({id:'tempo-b',pitch:{step:'D',octave:4},position:{tick:TICKS_PER_QUARTER}})
      ]})]}),
      createMeasure({id:'implicit-tail',number:2,timeSignature:{beats:2,beatType:4},voices:[createVoice({events:[
        createNote({id:'tempo-c',pitch:{step:'E',octave:4},duration:{value:'half',dots:0}})
      ]})]})
    ]})]})]
  })
}
