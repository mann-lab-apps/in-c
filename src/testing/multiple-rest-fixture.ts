// Synthetic grouping directives; the actual five-bar music remains explicit.
export function createMultipleRestFixture({count=4,symbols='no',include=true}:{count?:number;symbols?:'yes'|'no'|'omitted';include?:boolean}={}) {
  const parts=[1,2].map(part=>`<part id="P${part}">${[1,2,3,4,5].map(bar=>{
    const initial=bar===1?'<divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>':''
    const style=part===2&&bar===2&&include?`<measure-style number="1"><multiple-rest${symbols==='omitted'?'':` use-symbols="${symbols}"`}>${count}</multiple-rest></measure-style>`:''
    const attributes=initial||style?`<attributes>${initial}${style}</attributes>`:''
    const note=part===2&&bar>1?'<rest measure="yes"/><duration>4</duration>':`<pitch><step>${part===1?'C':'D'}</step><octave>4</octave></pitch><duration>4</duration><type>whole</type>`
    return `<measure number="${bar}">${attributes}<note>${note}</note></measure>`
  }).join('')}</part>`).join('')
  return `<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>쉼표 묶음 조사 ${count} ${symbols}</work-title></work><part-list><score-part id="P1"><part-name>Flute 1</part-name></score-part><score-part id="P2"><part-name>Flute 2</part-name></score-part></part-list>${parts}</score-partwise>`
}
