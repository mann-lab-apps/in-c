import {createMeasure,createNote,createPart,createScore,createStaff,createTimePosition,createVoice,TICKS_PER_QUARTER as T} from '../score-core'

/** Owned, aligned score for session-only rehearsal. No repeat marks or schema extension. */
export function createPracticeLoopFixture() {
  return createScore({id:'practice-loop-score',title:'연속 구간 연습',tempo:{bpm:120,beatUnit:'quarter'},parts:['upper','lower'].map((id,p)=>createPart({
    id,name:p?'반주':'선율',staves:[createStaff({id:id+'-staff',measures:[0,1,2].map(bar=>createMeasure({
      id:`${id}-bar-${bar}`,number:bar+1,voices:[createVoice({id:id+'-voice',events:[0,1,2,3].map(n=>createNote({
        id:`${id}-note-${bar*4+n}`,position:createTimePosition(n*T),duration:{value:'quarter',dots:0},pitch:{step:p?'E':'C',octave:4}
      }))})]
    }))})]
  }))})
}
