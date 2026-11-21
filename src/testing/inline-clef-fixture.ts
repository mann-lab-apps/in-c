// Synthetic compatibility fixture; no user score or product command.
const note=(step:string,type='half',duration=2)=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration><type>${type}</type></note>`
const clef='<attributes><clef><sign>F</sign><line>4</line></clef></attributes>'
export function createInlineClefFixture(kind:string){
 const second=kind==='start'?clef+note('D')+note('E'):kind==='end'?note('D','whole',4)+clef:kind==='backup'?note('D','whole',4)+'<backup><duration>4</duration></backup>'+clef+'<note><rest measure="yes"/><duration>4</duration><voice>2</voice><type>whole</type></note>':note('D')+clef+note('E')
 return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Inline clef audit ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Audit</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${note('C','whole',4)}</measure><measure number="2">${second}</measure><measure number="3">${note('F','whole',4)}</measure></part></score-partwise>`
}
