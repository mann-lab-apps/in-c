import { createNote, TICKS_PER_QUARTER, type Score } from '../score-core'
import { parseHarmonyText } from '../musicxml/harmony-text'
import { secondaryRepeatFixture } from './secondary-repeat-fixture'

export function singleHarmonyFixture(): Score {
  const { input: score } = secondaryRepeatFixture('primary','repeat')
  score.title = 'Generated single harmony selection'
  for (const part of score.parts) for (const staff of part.staves) for (const measure of staff.measures) {
    const original = measure.voices[0].events[0]
    if (original.type !== 'note') throw new Error('Generated note expected')
    measure.voices[0].events = [
      createNote({id:measure.id+'-a',position:{tick:0},pitch:{...original.pitch},duration:{value:'half',dots:0}}),
      createNote({id:measure.id+'-b',position:{tick:2*TICKS_PER_QUARTER},pitch:{step:'G',octave:original.pitch.octave},duration:{value:'half',dots:0}})
    ]
  }
  const harmony = (id:string,measureId:string,tick:number,text:string) => {
    const parsed = parseHarmonyText(text)
    if (!parsed) throw new Error('Valid generated harmony expected')
    return {id,measureId,tick,...parsed}
  }
  score.harmonies = [
    harmony('h-source-first','primary-bar-1',TICKS_PER_QUARTER,'Cmaj7'),
    harmony('h-source-second','primary-bar-1',TICKS_PER_QUARTER,'G7/B'),
    harmony('h-source-third','primary-bar-1',3*TICKS_PER_QUARTER,'F'),
    harmony('h-lower-neighbor','lower-bar-1',TICKS_PER_QUARTER,'Dm'),
    harmony('h-target-existing','other-bar-2',2*TICKS_PER_QUARTER,'Am'),
    harmony('h-target-earlier','other-bar-2',0,'F')
  ]
  score.expressionTexts=[{id:'keep-expression',measureId:'other-bar-2',tick:2*TICKS_PER_QUARTER,text:'dolce'}]
  return score
}

// Independent structural oracle: remove authored first measures, keep surviving
// concrete IDs/manual geometry, and renumber only the displayed measure number.
export function singleHarmonyStructureFixture() {
  const source=singleHarmonyFixture()
  source.title='Generated harmony clipboard structural boundary'
  source.slurs=[{id:'surviving-manual',startEventId:'primary-bar-2-a',endEventId:'primary-bar-4-b',engraving:{offsetX:0,height:3}}]
  source.layout={systemBreakBeforeMeasureIds:['primary-bar-3']}
  const removed=structuredClone(source),deleted=new Set(source.parts.flatMap(part=>part.staves.map(staff=>staff.measures[0].id)))
  for(const part of removed.parts)for(const staff of part.staves)staff.measures=staff.measures.slice(1).map((measure,index)=>({...measure,number:index+1}))
  removed.harmonies=removed.harmonies!.filter(mark=>!deleted.has(mark.measureId))
  const pasted=structuredClone(removed)
  pasted.harmonies!.push({...structuredClone(source.harmonies![1]),id:'harmony-structural-new',measureId:'other-bar-2',tick:2*TICKS_PER_QUARTER})
  return {source,removed,pasted}
}
