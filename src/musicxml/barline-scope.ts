import {scoreRepeatSource,type Score,type Part,type Staff,type Measure} from '../score-core'

// XML has one part-measure barline;the native score keeps concrete staff owners.
export function musicXmlBarlineStaff(score:Score,part:Part):Staff {
 const source=scoreRepeatSource(score)
 return source&&part.staves.includes(source)?source:part.staves[0]
}

// Permit only the representable expansion of an aligned sequence onto empty
// sibling staves.Conflicting markings stay raw in the strict save signature.
export function comparableMusicXmlBarlines(score:Score,part:Part):readonly {repeat:Measure['repeat']|null;volta:Measure['volta']|null}[]|undefined {
 if(!scoreRepeatSource(score))return undefined
 const source=musicXmlBarlineStaff(score,part),shape=(staff:Staff)=>staff.measures.map(m=>({repeat:m.repeat??null,volta:m.volta??null})),sequence=shape(source),signature=JSON.stringify(sequence)
 for(const staff of part.staves){
  const marked=staff.measures.some(m=>m.repeat?.start||m.repeat?.end||m.volta)
  if(marked&&JSON.stringify(shape(staff))!==signature)return undefined
 }
 return sequence
}
