import {createMeasure,createNote,createPart,createScore,createStaff,createVoice} from '../score-core'
// Owned, aligned two-part rehearsal score. No new score schema or audio assets.
export function createMetronomeFixture(compound=false){
 const meter=compound?{beats:6,beatType:8}:{beats:4,beatType:4}
 return createScore({id:compound?'metronome-compound':'metronome-simple',title:compound?'겹박자 메트로놈 검증':'메트로놈 검증',tempo:{bpm:120,beatUnit:'quarter'},parts:['upper','lower'].map((id,index)=>createPart({id,name:index?'반주':'선율',staves:[createStaff({id:id+'-staff',measures:[0,1,2].map(n=>createMeasure({id:`${id}-bar-${n}`,number:n+1,timeSignature:meter,repeat:n===0?{start:true}:n===1?{end:true,times:2}:undefined,voices:[createVoice({events:[createNote({id:`${id}-note-${n}`,pitch:{step:index?'E':'C',octave:4},duration:{value:compound?'half':'whole',dots:compound?1:0},fermata:n===1})]})]}))})]}))})
}
