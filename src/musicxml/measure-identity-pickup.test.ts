import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {TICKS_PER_QUARTER as q,validateMeasureRhythm,validateTieRelations} from '../score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
import {createPlaybackTimeline} from '../renderer/src/playback/timeline'
import {parseMusicXml,parseMusicXmlWithReport,serializeMusicXml} from './index'
import {expandScoreRepeatsForMusicXml} from './expand-repeats'
function fixture(partCount:number,affectedPart:number,ordinalControl=false){
 const definitions=Array.from({length:partCount},(_,i)=>`<score-part id="P${i+1}"><part-name>Pickup ${i+1}</part-name></score-part>`).join('')
 const parts=Array.from({length:partCount},(_,i)=>{
  const numbers=i===affectedPart?(ordinalControl?[1,2]:[0,1]):[10,20]
  return `<part id="P${i+1}"><measure number="${numbers[0]}" implicit="yes"><attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><tie type="start"/><type>quarter</type><notations><tied type="start"/></notations></note></measure><measure number="${numbers[1]}"><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><tie type="stop"/><type>quarter</type><notations><tied type="stop"/></notations></note><note><rest/><duration>12</duration><type>half</type><dot/></note></measure></part>`
 }).join('')
 return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>못갖춘마디 번호 감사</work-title></work><part-list>${definitions}</part-list>${parts}</score-partwise>`
}
it.each([{partCount:1,affectedPart:0},{partCount:2,affectedPart:0},{partCount:2,affectedPart:1}])('preserves actual pickup length and a sustained tie when only part $affectedPart of $partCount uses zero-based identities',({partCount,affectedPart})=>{
 const source=fixture(partCount,affectedPart),control=fixture(partCount,affectedPart,true),result=parseMusicXmlWithReport(source),expected=parseMusicXml(control)
 expect(result.score).toEqual(expected);expect(result.report.warnings).toHaveLength(1);expect(result.report.warnings[0]).toMatchObject({partNumber:affectedPart+1,message:expect.stringContaining('Source measure identifiers normalized')})
 for(const[i,p]of result.score.parts.entries()){
  const measures=p.staves[0].measures;expect(measures.map(m=>m.number)).toEqual(i===affectedPart?[1,2]:[10,20]);expect(measures[0].timing).toEqual({type:'pickup',durationTicks:q});expect(measures[1].timing).toEqual({type:'regular'});for(const m of measures)expect(validateMeasureRhythm(m).isExact).toBe(true)
 }
 expect(validateTieRelations(result.score)).toEqual([])
 const timeline=createPlaybackTimeline(result.score),notes=timeline.events.filter(e=>e.frequency!==undefined||e.frequencies?.length),rests=timeline.events.filter(e=>e.frequency===undefined&&!e.frequencies?.length);expect(timeline.totalBeats).toBe(5);expect(timeline.events).toHaveLength(partCount*2);expect(notes).toHaveLength(partCount);expect(notes.every(e=>e.startBeat===0&&e.durationBeats===2)).toBe(true);expect(rests).toHaveLength(partCount);expect(rests.every(e=>e.startBeat===2&&e.durationBeats===3)).toBe(true)
 const before=encodeNativeProject(createNativeProject(result.score)),midi=serializeMidi(expected)
 expect(decodeNativeProject(before).score).toEqual(expected)
 for(const score of[result.score,parseMusicXml(serializeMusicXml(result.score)),expandScoreRepeatsForMusicXml(result.score)])expect(serializeMidi(score)).toEqual(midi)
 expect(encodeNativeProject(createNativeProject(result.score))).toBe(before)
 const dir=process.env.STUDIO_MEASURE_IDENTITY_PICKUP_QA_DIR;if(dir){const folder=join(dir,`${partCount}-${affectedPart}`);mkdirSync(folder,{recursive:true});for(const[name,contents]of Object.entries({'source.musicxml':source,'control.musicxml':control,'expected.chromatics':before,'expected.mid':Buffer.from(midi)}))writeFileSync(join(folder,name),contents,{flag:'wx'})}
})
