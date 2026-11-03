export type NoteVelocityCase='attack'|'release'|'both'|'chord-member'|'secondary'|'two-parts'
export function createNoteVelocityFixture(kind:NoteVelocityCase,value='20') {
 const title=`Note playback velocity ${kind}`
 const note=(attributes='',step='C',chord=false)=>`<note ${attributes}>${chord?'<chord/>':''}<pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note>`
 const attributes=kind==='release'?`end-dynamics="${value}"`:kind==='both'?`dynamics="${value}" end-dynamics="12.5"`:`dynamics="${value}"`
 const measure=(content:string)=>`<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${content}</measure>`
 const second=kind==='secondary'||kind==='two-parts'
 const primary=kind==='secondary'?note():kind==='chord-member'?note()+note(attributes,'E',true):note(attributes)
 const xml=`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>${title}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part>${second?'<score-part id="P2"><part-name>Neighbor</part-name></score-part>':''}</part-list><part id="P1">${measure(primary)}</part>${second?`<part id="P2">${measure(note(attributes))}</part>`:''}</score-partwise>`
 return{title,xml}
}
