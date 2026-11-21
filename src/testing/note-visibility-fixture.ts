// Synthetic source only; mark the existing note owner without a product model.
import { createStemlessFixture } from './stemless-fixture'
type Options = Omit<NonNullable<Parameters<typeof createStemlessFixture>[0]>, 'stem'> & {
  printObject?: string; printSpacing?: 'yes'|'no'; printLeger?: 'yes'|'no'
}
const escape = (value:string) => value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;')
export function createNoteVisibilityFixture({printObject='no',printSpacing,printLeger,...options}:Options = {}) {
  const xml=createStemlessFixture({...options,stem:'none'}),marker=xml.indexOf('<stem>none</stem>')
  if(marker<0)throw Error('Synthetic note visibility owner missing')
  const start=xml.lastIndexOf('<note>',marker)
  const attributes=Object.entries({'print-object':printObject,'print-spacing':printSpacing,'print-leger':printLeger})
    .filter(([,value])=>value!==undefined).map(([key,value])=>' '+key+'="'+escape(value!)+'"').join('')
  return (xml.slice(0,start)+'<note'+attributes+'>'+xml.slice(start+6)).replace('<stem>none</stem>','').replace('줄기 숨김 검증','음표 숨김 손실 검증')
}

export function createRepeatedNoteVisibilityFixture(count=30): string {
  if(!Number.isInteger(count)||count<2||count>100)throw Error('Bounded hidden-note fixture count required')
  const seed=createNoteVisibilityFixture({value:'whole',targetMeasure:1})
  return seed.replace(/<part id="P1">[\s\S]*?<\/part>/,part=>{
    const first=part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if(!first)throw Error('Repeated source measure missing')
    return '<part id="P1">'+Array.from({length:count},(_,i)=>first.replace('number="1"','number="'+(i+1)+'"')).join('')+'</part>'
  })
}
