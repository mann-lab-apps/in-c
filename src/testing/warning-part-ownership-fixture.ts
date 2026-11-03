export type WarningPartCase='technical'|'direction'|'both'|'single'|'control'
export function createWarningPartOwnershipFixture(kind:WarningPartCase) {
 const title=`Warning part ownership ${kind}`,technical=kind==='technical'||kind==='both'||kind==='single',direction=kind==='direction'||kind==='both',second=kind!=='single'
 const measure=`<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${direction?'<direction><direction-type><coda/></direction-type></direction>':''}<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type>${technical?'<notations><technical><fingering>1</fingering><fingering>2</fingering></technical></notations>':''}</note></measure>`
 const xml=`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>${title}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part>${second?'<score-part id="P2"><part-name>Flute</part-name></score-part>':''}</part-list><part id="P1">${measure}</part>${second?`<part id="P2">${measure}</part>`:''}</score-partwise>`
 return{title,xml}
}
