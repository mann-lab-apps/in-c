import { TICKS_PER_QUARTER } from '../score-core'
import { parseMusicXml } from '../musicxml/parse'

export type ImplicitTempoUnitCase = 'missing' | 'global-implicit' | 'global-half' | 'point-implicit' | 'point-half' | 'explicit-dotted'
export function createImplicitTempoUnitFixture(kind: ImplicitTempoUnitCase) {
  const score=parseMusicXml(`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Implicit tempo ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure><measure number="2"><attributes><time><beats>6</beats><beat-type>8</beat-type></time></attributes><note><pitch><step>D</step><octave>4</octave></pitch><duration>3</duration><type>half</type><dot/></note></measure></part></score-partwise>`)
  if(kind==='global-implicit')score.tempo={bpm:96}
  if(kind==='global-half')score.tempo={bpm:96,beatUnit:'half'}
  if(kind==='explicit-dotted')score.tempo={bpm:96,beatUnit:'quarter',dots:1,text:'Andante',transparent:false}
  if(kind==='point-implicit'||kind==='point-half')score.tempoEvents=[{id:'legacy-rate-point',measureId:score.parts[0].staves[0].measures[1].id,tick:TICKS_PER_QUARTER,bpm:60,...(kind==='point-half'?{beatUnit:'half' as const}:{}),text:'rit.',transparent:true}]
  return score
}
