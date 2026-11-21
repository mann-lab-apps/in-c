import {createPartGroupFixture} from './part-group-fixture'
export const partSymbolFixtureKinds=['bracket','line','square','none','partial','top-only','bottom-only','later','brace','full-bounds','plain'] as const
export type PartSymbolFixtureKind=typeof partSymbolFixtureKinds[number]
export function createPartSymbolFixture(kind:PartSymbolFixtureKind){
 let source=createPartGroupFixture('grand')
 const three=['partial','top-only','bottom-only','later'].includes(kind)
 if(three)source=source.replace('<staves>2</staves>','<staves>3</staves>').replace('</attributes>','<clef number="3"><sign>F</sign><line>4</line></clef></attributes>').replace('</measure>','<backup><duration>16</duration></backup><note><pitch><step>C</step><octave>2</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><staff>3</staff></note></measure>')
 const symbol=kind==='plain'?'':kind==='partial'||kind==='later'?'<part-symbol top-staff="1" bottom-staff="2">brace</part-symbol>':kind==='top-only'?'<part-symbol top-staff="2">brace</part-symbol>':kind==='bottom-only'?'<part-symbol bottom-staff="2">brace</part-symbol>':kind==='full-bounds'?'<part-symbol top-staff="1" bottom-staff="2">brace</part-symbol>':'<part-symbol>'+kind+'</part-symbol>'
 if(kind==='later'){
  const first=source.split('<measure number="1">')[1].split('</measure>')[0]
  const second=first.replace(/<attributes>[\s\S]*?<\/attributes>/,'<attributes>'+symbol+'</attributes>')
  return source.replace('</part>','<measure number="2">'+second+'</measure></part>')
 }
 return source.replace('</staves>','</staves>'+symbol)
}
export const stripPartSymbols=(xml:string)=>xml.replace(/<part-symbol\b[^>]*>[\s\S]*?<\/part-symbol>/g,'')
