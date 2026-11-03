import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, applyScoreCommand, createDuration, createMeasure,
  createNote, createPart, createRest, createScore, createStaff, createTimePosition,
  createVoice, type Note, type Rest, type VoiceEvent
} from '../../../score-core'
import { buildRangeClipboard, buildRangePasteCommand } from './editor-state'

const base = (): Note => createNote({id:'source',position:createTimePosition(0),pitch:{step:'C',octave:4},duration:createDuration('quarter')})
const chord = (): Note => ({...base(),pitches:[{step:'C',octave:4},{step:'E',alter:-1,octave:4},{step:'G',octave:4}]})
const markedNote = (): Note => ({...base(),articulations:['staccato','accent'],fermata:true,breathMark:'caesura',tremolo:{type:'single',marks:2},ornaments:['trill'],lyrics:[{number:1,syllabic:'single',text:'한글',extend:true}],graceNotes:[{pitch:{step:'D',alter:1,octave:4},slash:true}]})
const markedRest = (): Rest => ({...createRest({id:'source',position:createTimePosition(0),duration:createDuration('quarter')}),fermata:true,breathMark:'breath'})
const fixture = (event:VoiceEvent) => createScore({parts:[createPart({staves:[createStaff({measures:[createMeasure({voices:[createVoice({events:[event,...[1,2,3].map(i=>createRest({id:`rest-${i}`,position:createTimePosition(T*i),duration:createDuration('quarter')}))]})]})]})]})]})

describe('range clipboard event contents',()=>{
  it.each([['chord',chord],['note attachments',markedNote],['rest attachments',markedRest]] as const)('preserves existing %s and one undo while assigning a fresh ID/tick',(_name,make)=>{
    const event=make(),score=fixture(event),before=structuredClone(score)
    const clipboard=buildRangeClipboard(score,{type:'event',eventId:'source'})!
    const command=buildRangePasteCommand(score,{type:'event',eventId:'rest-2'},clipboard,()=> 'pasted')!
    const result=applyScoreCommand(score,command)
    const pasted=result.score.parts[0].staves[0].measures[0].voices[0].events[2]
    expect(pasted).toEqual({...event,id:'pasted',position:createTimePosition(T*2)})
    expect(score).toEqual(before)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(pasted.duration).not.toBe(event.duration)
    if(pasted.type==='note'&&event.type==='note'){
      expect(pasted.pitch).not.toBe(event.pitch)
      for(const key of ['pitches','articulations','lyrics','graceNotes','ornaments','tremolo'] as const)if(event[key])expect(pasted[key]).not.toBe(event[key])
      if(pasted.pitches)expect(pasted.pitches[1]).not.toBe(event.pitches![1])
      if(pasted.lyrics)expect(pasted.lyrics[0]).not.toBe(event.lyrics![0])
      if(pasted.graceNotes)expect(pasted.graceNotes[0].pitch).not.toBe(event.graceNotes![0].pitch)
    }
  })
  it('keeps repeated pasted chords detached from the source and each other',()=>{
    const score=fixture(chord()),before=structuredClone(score),clipboard=buildRangeClipboard(score,{type:'event',eventId:'source'})!
    const one=applyScoreCommand(score,buildRangePasteCommand(score,{type:'event',eventId:'rest-1'},clipboard,()=> 'pasted-one')!)
    const two=applyScoreCommand(one.score,buildRangePasteCommand(one.score,{type:'event',eventId:'rest-3'},clipboard,()=> 'pasted-two')!)
    const events=two.score.parts[0].staves[0].measures[0].voices[0].events as Note[]
    expect(events[1].pitches).toEqual(chord().pitches)
    expect(events[3].pitches).toEqual(chord().pitches)
    expect(events[1].pitches).not.toBe(events[3].pitches)
    events[1].pitches![1].alter=1
    expect(events[3].pitches![1].alter).toBe(-1)
    expect(score).toEqual(before)
  })
  it.each(['tie','tuplet'] as const)('retains the unsupported %s copy boundary',kind=>{
    const event=kind==='tie'?{...chord(),ties:{start:true}}:{...chord(),duration:{...createDuration('quarter'),tuplet:{actualNotes:3,normalNotes:2}}}
    expect(buildRangeClipboard(fixture(event),{type:'event',eventId:'source'})).toBeUndefined()
  })
})
