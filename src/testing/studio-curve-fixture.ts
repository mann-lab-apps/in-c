import {createNote,durationToTicks} from '../score-core'
import {createNewScore} from '../renderer/src/editor/new-score'
import {createNativeProject} from '../project/schema'
export function createStudioCurveFixture(mode:'auto'|'manual'|'cross'='auto'){
 const score=createNewScore({title:`Curve QA ${mode}`,templateId:'solo-melody',keySignature:{fifths:0},timeSignature:{beats:4,beatType:4},measureCount:4,tempo:96})
 const staff=score.parts[0].staves[0]
 staff.measures.forEach((measure,m)=>{measure.voices[0].events=([['C','C','D','E'],['F','G','A','G'],['E','D','C','D'],['C','D','E','C']]as const)[m].map((step,n)=>createNote({id:`curve-${m}-${n}`,position:{tick:n*durationToTicks({value:'quarter',dots:0})},pitch:{step,octave:4},...(m===0&&n<2?{ties:n===0?{start:true}:{stop:true}}:{})}))})
 score.slurs=[{id:'curve-slur',startEventId:'curve-0-2',endEventId:mode==='cross'?'curve-1-1':'curve-0-3',...(mode==='manual'?{engraving:{placement:'below' as const,offsetX:0,offsetY:0,height:3}}:{})}]
 if(mode==='cross')score.layout={systemBreakBeforeMeasureIds:[staff.measures[1].id]}
 return createNativeProject(score)
}
