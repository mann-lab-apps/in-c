import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseMusicXmlWithReport, parseMusicXml } from './parse'
import { serializeMusicXml } from './serialize'
import { createPlaybackTimeline } from '../renderer/src/playback/timeline'
import { createPianoCommands } from '../renderer/src/playback/piano-transport'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../project/schema'

const marking=(bpm:number,offset=0,halfDot=false)=>`<direction><direction-type><words>Change ${bpm}</words></direction-type><direction-type><metronome><beat-unit>${halfDot?'half':'quarter'}</beat-unit>${halfDot?'<beat-unit-dot/>':''}<per-minute>${bpm}</per-minute></metronome></direction-type>${offset?`<offset sound="yes">${offset}</offset>`:''}<sound tempo="${bpm*(halfDot?3:1)}"/></direction>`
const note=(step:string,duration:number,type='whole',dot=false)=>`<note><pitch><step>${step}</step><octave>4</octave></pitch><duration>${duration}</duration><type>${type}</type>${dot?'<dot/>':''}</note>`
const variants=[
 {kind:'offset',map:[[0,120],[1,60]],on:[0],off:[3.5]},
 {kind:'cursor',map:[[0,120],[1,60]],on:[0,.5],off:[.5,3.5]},
 {kind:'second-start',map:[[0,120],[4,60]],on:[0,2],off:[2,6]},
 {kind:'second-offset',map:[[0,120],[5,60]],on:[0,2],off:[2,5.5]},
 {kind:'source-order',map:[[0,120],[2,60]],on:[0],off:[3]},
 {kind:'dotted-half',map:[[0,120],[1,180]],on:[0],off:[1.5]},
 {kind:'initial-control',map:[[0,96],[5,60]],on:[0,2.5],off:[2.5,6.125]}
] as const
it.each(variants)('does not apply the first positioned direction retroactively: $kind',({kind,map,on,off})=>{
 const first=kind==='cursor'?note('C',1,'quarter')+marking(60)+note('D',3,'half',true)
  :kind==='source-order'?marking(60,2)+marking(120)+note('C',4)
  :kind==='initial-control'?marking(96)+note('C',4)
  :kind.startsWith('second')?note('C',4):marking(60,1,kind==='dotted-half')+note('C',4)
 const second=kind.startsWith('second')||kind==='initial-control'?`<measure number="2">${marking(60,kind==='second-start'?0:1)}${note('D',4)}</measure>`:''
 const xml=`<?xml version="1.0"?><score-partwise version="4.0"><work><work-title>Late first tempo ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>${first}</measure>${second}</part></score-partwise>`
 const out=process.env.DDIRORI_LATE_TEMPO_OUT,dir=out?join(out,kind):undefined
 if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'oracle.json'),JSON.stringify({kind,map,on,off},null,2))}
 const {score,report}=parseMusicXmlWithReport(xml),before=structuredClone(score),timeline=createPlaybackTimeline(score)
 expect(report.warnings).toEqual([])
 const initial=kind==='source-order'?120:kind==='initial-control'?96:undefined
 expect(score.tempo?.bpm).toBe(initial)
 const effective=[...new Map<number,number>([[0,score.tempo?.bpm??120],...timeline.tempoEvents.map(e=>[e.startBeat,e.quarterBpm]as[number,number])]).entries()]
 expect(effective).toEqual(map)
 const commands=createPianoCommands(timeline,0,score.tempo?.bpm??120,{})
 expect(commands.filter(e=>e.type==='on').map(e=>e.time)).toEqual(on)
 expect(commands.filter(e=>e.type==='off').map(e=>e.time)).toEqual(off)
 expect(score.tempoEvents?.map(e=>e.text)).toEqual(['Change 60'])
 const output=serializeMusicXml(score),reopened=parseMusicXml(output),native=encodeNativeProject(createNativeProject(score))
 expect(reopened.tempo?.bpm).toBe(initial);expect(serializeMidi(reopened)).toEqual(serializeMidi(score));expect(decodeNativeProject(native).score).toEqual(before);expect(score).toEqual(before)
 if(dir){writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.mid'),serializeMidi(score));writeFileSync(join(dir,'output.musicxml'),output)}
})
