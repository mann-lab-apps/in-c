import {parseMusicXml} from '../musicxml/parse'
import {serializeMusicXml} from '../musicxml/serialize'
import {type DurationValue,TICKS_PER_QUARTER} from '../score-core'
import {createCreditImageFixture} from './credit-image-fixture'
export function createTempoRoundtripFixture(scope:'global'|'position',bpm:number,beatUnit:DurationValue='quarter',dots=0,tick=0){
 const score=parseMusicXml(createCreditImageFixture('control'));score.title=`빠르기 왕복 감사 ${scope} ${bpm}`
 const mark={bpm,beatUnit,dots,text:'QA 빠르기'}
 score.tempo=scope==='global'?mark:{bpm:120,beatUnit:'quarter',dots:0,text:'QA 기본'}
 if(scope==='position')score.tempoEvents=[{id:'qa-position-tempo',measureId:score.parts[0].staves[0].measures[1].id,tick,...mark}]
 return{score,source:serializeMusicXml(score),mark,scope,tick,quarter:TICKS_PER_QUARTER}
}
