// Synthetic source only; existing valid note/voice template, not a product model.
import {createStemlessFixture} from './stemless-fixture'
type Options=Omit<NonNullable<Parameters<typeof createStemlessFixture>[0]>,'stem'>&{head?:string;filled?:'yes'|'no';parentheses?:'yes'|'no';smufl?:string}
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')
export function createNoteheadFixture({head='diamond',filled,parentheses,smufl,...options}:Options={}){
 const xml=createStemlessFixture({...options,stem:'none'})
 const attrs=Object.entries({filled,parentheses,smufl}).filter(([,v])=>v!==undefined).map(([k,v])=>` ${k}="${escape(v!)}"`).join('')
 if(!xml.includes('<stem>none</stem>'))throw Error('Synthetic notehead source target missing')
 return xml.replace('<stem>none</stem>',`<notehead${attrs}>${escape(head)}</notehead>`).replace('줄기 숨김 검증','음표 머리 검증')
}
