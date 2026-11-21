import {createWordsComponentsFixture} from './words-components-fixture'

export type StaffTextWeightKind='bold'|'below-bold'|'normalized'|'plain'|'normal'|'system'|'expression'|'tempo'|'empty'|'components'
export function createStaffTextWeightFixture(kind:StaffTextWeightKind='bold'){
 let source=createWordsComponentsFixture('single').replace('여러 글자 조각 검증','보표 글자 굵게 서식 검증')
 if(kind==='expression')return source
 source=source.replace('placement="below"','placement="above"').replace('font-style="italic"','font-weight="bold"')
 if(kind==='below-bold')source=source.replace('placement="above"','placement="below"')
 if(kind==='normalized')source=source.replace('<measure number="2"><direction','<measure number="intro"><direction')
 if(kind==='plain')source=source.replace(' font-weight="bold"','')
 if(kind==='normal')source=source.replace('font-weight="bold"','font-weight="normal"')
 if(kind==='system')source=source.replace('placement="above"','placement="above" system="only-top"')
 if(kind==='tempo')source=source.replace('</words></direction-type>','</words></direction-type><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>90</per-minute></metronome></direction-type>')
 if(kind==='system'||kind==='tempo'){
  const direction=source.match(/<direction\b[\s\S]*?<\/direction>/)?.[0]
  if(!direction)throw Error('Missing generated text direction')
  source=source.replace(direction,'').replace('<note>',direction+'<note>')
 }
 if(kind==='empty')source=source.replace('>dolce</words>','> </words>')
 if(kind==='components')source=source.replace('</words>','</words><words>molto</words>')
 return source
}
