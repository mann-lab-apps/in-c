import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRepeatTempoStateFixture } from '../../../testing/repeat-tempo-state-fixture'
import { createPlaybackTimeline, beatDeltaToSeconds, resolveQuarterBpmAtBeat } from './timeline'
import { serializeMusicXml, parseMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'
import { createNativeProject, encodeNativeProject, decodeNativeProject } from '../../../project/schema'
import { createMeasure, createVoice, createNote, TICKS_PER_QUARTER } from '../../../score-core'
import { createPianoCommands } from './piano-transport'

it('restores the source-effective tempo at repeat returns while retaining the exit tempo and original markings',()=>{
  const score=createRepeatTempoStateFixture(),before=structuredClone(score),timeline=createPlaybackTimeline(score)
  expect(score).toEqual(before)
  const result={beats:timeline.events.map(e=>e.startBeat),seconds:timeline.events.map(e=>beatDeltaToSeconds(timeline,0,e.startBeat,120)),quarterBpms:timeline.events.map(e=>resolveQuarterBpmAtBeat(timeline,e.startBeat,120)),tempoEvents:timeline.tempoEvents}
  expect(result.seconds).toEqual([0,.5,1.5,2,3,3.5,4.5])
  expect(result.quarterBpms).toEqual([120,60,120,60,120,60,60])
  expect(createPianoCommands(timeline,0,120,{}).filter(c=>c.type==='on').map(c=>c.time)).toEqual(result.seconds)
  for(const beat of [1,2,4,6]){
    const first=createPianoCommands(timeline,beat,120,{}).find(c=>c.type==='on')!
    expect(first.time).toBe(0);expect(first.offset).toBe(0)
  }
  const xml=serializeMusicXml(score),native=encodeNativeProject(createNativeProject(score))
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))
  expect(decodeNativeProject(native).score).toEqual(before)
  const out=process.env.DDIRORI_REPEAT_TEMPO_MEASUREMENT_OUT
  if(out){mkdirSync(out,{recursive:true});writeFileSync(join(out,'measurement.json'),JSON.stringify(result,null,2));writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.musicxml'),serializeMusicXml(score));writeFileSync(join(out,'before.mid'),serializeMidi(score))}
  const qa=process.env.DDIRORI_REPEAT_TEMPO_FIXTURE_OUT
  if(qa){const dir=join(qa,'internal');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expected.mid'),serializeMidi(score));writeFileSync(join(dir,'oracle.json'),JSON.stringify({beats:[0,1,2,3,4,5,6],seconds:[0,.5,1.5,2,3,3.5,4.5],velocities:Array(7).fill(.16),tempo:[[0,120],[1,60],[2,120],[3,60],[4,120],[5,60]],totalBeats:8},null,2))}
})

it('uses a tempo inherited before the repeated section, not just the document header',()=>{
  const score=createRepeatTempoStateFixture()
  score.parts[0].staves[0].measures.unshift(createMeasure({id:'intro',timeSignature:{beats:2,beatType:4},voices:[createVoice({events:[createNote({id:'intro-note',pitch:{step:'F',octave:3},duration:{value:'half',dots:0}})]})]}))
  score.tempoEvents!.push({id:'inherited',measureId:'intro',tick:TICKS_PER_QUARTER,bpm:90,beatUnit:'quarter'})
  const timeline=createPlaybackTimeline(score)
  expect(timeline.events.filter(e=>e.eventId==='tempo-a').map(e=>resolveQuarterBpmAtBeat(timeline,e.startBeat,120))).toEqual([90,90,90])
})

it.each([false,true])('restores the source state after a forward volta skip, explicit destination=%s',explicit=>{
  const score=createRepeatTempoStateFixture(),staff=score.parts[0].staves[0]
  staff.measures[0].repeat={start:true}
  staff.measures.splice(1,0,createMeasure({id:'ending-one',timeSignature:{beats:2,beatType:4},repeat:{end:true,times:2},volta:{number:1,start:true,end:true},voices:[createVoice({events:[createNote({id:'ending-note',pitch:{step:'F',octave:4},duration:{value:'half',dots:0}})]})]}))
  staff.measures[2].volta={number:2,start:true,end:true}
  score.tempoEvents!.push({id:'first-ending-tempo',measureId:'ending-one',tick:0,bpm:40,beatUnit:'quarter'})
  if(explicit)score.tempoEvents!.push({id:'explicit-tail',measureId:'implicit-tail',tick:0,bpm:150,beatUnit:'quarter'})
  const before=structuredClone(score),timeline=createPlaybackTimeline(score),tail=timeline.events.find(e=>e.eventId==='tempo-c')!
  expect(resolveQuarterBpmAtBeat(timeline,tail.startBeat,120)).toBe(explicit?150:40)
  expect(timeline.tempoEvents.filter(e=>e.id.startsWith('playback-tempo-return')).map(e=>e.quarterBpm)).toEqual(explicit?[120]:[120,40])
  expect(score).toEqual(before)
})

it.each([false,true])('prioritizes a destination mark over the preceding end-tick mark, explicit start=%s',explicit=>{
  const score=createRepeatTempoStateFixture()
  score.tempoEvents!.push({id:'end-tick',measureId:'implicit-repeat',tick:2*TICKS_PER_QUARTER,bpm:100,beatUnit:'quarter'})
  if(explicit)score.tempoEvents!.push({id:'start-tick',measureId:'implicit-repeat',tick:0,bpm:70,beatUnit:'half',dots:1})
  const timeline=createPlaybackTimeline(score)
  expect([0,2,4].map(beat=>resolveQuarterBpmAtBeat(timeline,beat,120))).toEqual(explicit?[210,210,210]:[120,120,120])
})

it('avoids synthetic marks when tempo is unchanged or traversal is continuous',()=>{
  const score=createRepeatTempoStateFixture();score.tempoEvents=undefined
  expect(createPlaybackTimeline(score).tempoEvents).toEqual([])
  score.tempoEvents=[{id:'slow',measureId:'implicit-repeat',tick:TICKS_PER_QUARTER,bpm:60}]
  score.parts[0].staves[0].measures[0].repeat=undefined
  const timeline=createPlaybackTimeline(score)
  expect(timeline.tempoEvents).toHaveLength(1)
  expect(resolveQuarterBpmAtBeat(timeline,2,120)).toBe(60)
})
