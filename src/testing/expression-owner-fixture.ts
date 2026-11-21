export type ExpressionOwnerKind = 'grand-staff' | 'ensemble'
export function createExpressionOwnerFixture(kind: ExpressionOwnerKind) {
  const leadId = kind === 'ensemble' ? 'P1' : undefined
  const pianoId = kind === 'ensemble' ? 'P2' : 'P1'
  const note = (step:string, octave:number, duration:number, type:string, staff:number, voice:number) => `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>${duration}</duration><voice>${voice}</voice><type>${type}</type><staff>${staff}</staff></note>`
  const text = (staff:number, offset:number) => `<direction placement="below"><direction-type><words font-style="italic">dolce</words></direction-type><offset>${offset}</offset><staff>${staff}</staff></direction>`
  const lead = leadId ? `<part id="${leadId}"><measure number="7"><attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${note('G',5,4,'half',1,1)}${text(1,-2)}${note('A',5,4,'half',1,1)}</measure></part>` : ''
  const piano = `<part id="${pianoId}"><measure number="7"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>${note('C',5,16,'whole',1,1)}<backup><duration>16</duration></backup>${note('C',3,8,'half',2,2)}${text(2,2)}${note('D',3,8,'half',2,2)}${text(1,-16)}</measure></part>`
  const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>표현 글자 보표 소유권</work-title></work><part-list>${leadId?`<score-part id="${leadId}"><part-name>Lead</part-name></score-part>`:''}<score-part id="${pianoId}"><part-name>Piano</part-name></score-part></part-list>${lead}${piano}</score-partwise>`
  const expected = [...(leadId?[{partId:leadId,staff:1,tick:13440}]:[]),{partId:pianoId,staff:1,tick:0},{partId:pianoId,staff:2,tick:33600}]
  return {kind,xml,pianoId,expected}
}
