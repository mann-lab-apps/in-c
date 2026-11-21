import {createWordsComponentsFixture} from './words-components-fixture'
export type PartGroupFixtureKind='named'|'default'|'nested'|'separate'|'stop-children'|'none'|'grand'
export function createPartGroupFixture(kind:PartGroupFixtureKind='named'){
 let source=createWordsComponentsFixture('none').replace('여러 글자 조각 검증','파트 묶음 가져오기 검증')
 if(kind==='none')return source
 if(kind==='grand'){
  return '<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><staff>1</staff></note><backup><duration>16</duration></backup><note><pitch><step>C</step><octave>3</octave></pitch><duration>16</duration><voice>1</voice><type>whole</type><staff>2</staff></note></measure></part></score-partwise>'
 }
 if(kind==='separate')return source.replace('<score-part id="P1">','<part-group type="start" number="one"><group-symbol>bracket</group-symbol></part-group><score-part id="P1">').replace('</score-part><score-part id="P2">','</score-part><part-group type="stop" number="one"/><part-group type="start" number="two"><group-symbol>brace</group-symbol></part-group><score-part id="P2">').replace('</part-list>','<part-group type="stop" number="two"/></part-list>')
 const start=kind==='default'?'<part-group type="start"/>':'<part-group type="start" number="outer"><group-name>Woodwinds</group-name><group-abbreviation>Ww.</group-abbreviation><group-symbol>bracket</group-symbol><group-barline>yes</group-barline></part-group>'
 const end=kind==='default'?'<part-group type="stop"/>':kind==='stop-children'?'<part-group type="stop" number="outer"><group-name>Ignored stop text</group-name></part-group>':'<part-group type="stop" number="outer"/>'
 source=source.replace('<part-list>','<part-list>'+start).replace('</part-list>',end+'</part-list>')
 if(kind==='nested')source=source.replace('<score-part id="P1">','<part-group type="start" number="inner"><group-symbol>brace</group-symbol></part-group><score-part id="P1">').replace('</score-part><score-part id="P2">','</score-part><part-group type="stop" number="inner"/><score-part id="P2">')
 return source
}
export const stripPartGroups=(xml:string)=>xml.replace(/<part-group\b[^>]*\/>|<part-group\b[^>]*>[\s\S]*?<\/part-group>/g,'')
