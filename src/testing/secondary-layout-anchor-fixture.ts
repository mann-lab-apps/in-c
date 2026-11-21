import {createMeasure,createScore} from '../score-core'
import {createNativeProject,validateNativeProject} from '../project/schema'

export function createSecondaryLayoutAnchorFixture(){
 const parts=['upper','lower'].map(id=>({id,name:id,staves:[{id:id+'-staff',measures:Array.from({length:3},(_,i)=>createMeasure({id:id+'-bar-'+i,number:i+1}))}]}))
 const score=createScore({title:'Secondary layout anchor fixture',parts,layout:{systemBreakBeforeMeasureIds:['lower-bar-1'],pageBreakBeforeMeasureIds:['lower-bar-2']}})
 const project=createNativeProject(score);validateNativeProject(project)
 return{project,primary:parts[0].staves[0].measures,secondary:parts[1].staves[0].measures}
}
