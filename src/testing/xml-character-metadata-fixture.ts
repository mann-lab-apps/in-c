import { createLyricVisibilityFixture } from './lyric-visibility-fixture'
export const xmlCharacterMetadataCases=['numeric-fields','metadata-words'] as const
export function createXmlCharacterMetadataFixture(kind:typeof xmlCharacterMetadataCases[number],scalar=false):string {
 const seed=createLyricVisibilityFixture('default')
 if(kind==='numeric-fields'){
  if(scalar)return seed
  const replacements=[['<score-part id="P1">','<score-part id="P&#49;">'],['<part id="P2">','<part id="P&#50;">'],['<measure number="1">','<measure number="&#49;">'],['<measure number="2">','<measure number="&#x32;">'],['<divisions>2</divisions>','<divisions>&#50;</divisions>'],['<beats>4</beats>','<beats>&#52;</beats>'],['<beat-type>4</beat-type>','<beat-type>&#x34;</beat-type>'],['<sign>G</sign>','<sign>&#71;</sign>'],['<line>2</line>','<line>&#x32;</line>'],['<step>C</step>','<step>&#67;</step>'],['<octave>4</octave>','<octave>&#x34;</octave>'],['<duration>8</duration>','<duration>&#56;</duration>']]
  return replacements.reduce((xml,[before,after])=>{if(!xml.includes(before))throw Error('Numeric source owner missing: '+before);return xml.replaceAll(before,after)},seed)
 }
 const title=scalar?'café':'caf&#233;',composer=scalar?'José':'Jos&#233;',part=scalar?'Stém 2':'St&#233;m 2',word=scalar?'élan':'&#233;lan'
 return seed.replace(/<work-title>[^<]*<\/work-title>/,'<work-title>'+title+'</work-title>')
  .replace('</work>','</work><identification><creator type="composer">'+composer+'</creator></identification>')
  .replace('<part-name>Stem 2</part-name>','<part-name>'+part+'</part-name>')
  .replace('</attributes>','</attributes><direction placement="above"><direction-type><words>'+word+'</words></direction-type><staff>1</staff></direction>')
}
