import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  applyScoreCommand,
  createDuration,
  createFullMeasureRest,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  type VoiceEvent,
  validateMeasureRhythm,
  validateVoiceTuplets
} from '../../../score-core'
import {
  beginTupletInput,
  buildSequentialInput,
  cancelTupletInput,
  createNoteInputState,
  createTupletInputPreviewScore
} from './note-input-state'

const quarter = TICKS_PER_QUARTER
const target = {
  partId: 'part-1',
  staffId: 'staff-1',
  measureId: 'measure-1',
  voiceId: 'voice-1'
}

describe('note input state', () => {
  it('[note-input.empty-long] splits the original dotted-whole request into an existing following bar',()=>{
    const score=twoMeasureScore();score.parts[0].staves[0].measures[0].voices[0].events=[]
    const input=buildSequentialInput(score,createNoteInputState({target,tick:0,duration:createDuration('whole',1),mode:'note'}),'C',idSequence())!
    expect(input).toBeDefined()
    const result=applyScoreCommand(score,input.command),measures=result.score.parts[0].staves[0].measures
    expect(measures).toHaveLength(2);expect(measures[0].voices[0].events[0]).toMatchObject({type:'note',duration:createDuration('whole'),ties:{start:true}})
    expect(measures[1].voices[0].events[0]).toMatchObject({type:'note',duration:createDuration('half'),ties:{stop:true}})
    expect(input.nextState).toMatchObject({target:{measureId:'measure-2'},tick:2*quarter})
    expect(measures.every(m=>validateMeasureRhythm(m).isExact)).toBe(true);expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })
  it.each(['meter','pickup','dotted','short-meter','compound-meter','odd','short-multi','short-multi-existing'] as const)('[note-input.empty-long] matches normal tied entry in an empty %s measure and restores authored emptiness',async kind=>{
    const {serializeMidi}=await import('../midi/serialize-midi'),{serializeMusicXml,parseMusicXml}=await import('../../../musicxml'),{createNativeProject,encodeNativeProject}=await import('../../../project/schema')
    const source=createScore();source.title=`Generated empty long ${kind}`
    const primary=source.parts[0].staves[0];primary.id='primary';primary.measures[0].id='primary-short';primary.measures[0].voices[0].events=[createFullMeasureRest({id:'primary-rest'})]
    if(kind==='meter')primary.measures[0].timeSignature={beats:3,beatType:4}
    else if(kind==='short-meter'||kind==='short-multi'||kind==='short-multi-existing')primary.measures[0].timeSignature={beats:3,beatType:8}
    else if(kind==='compound-meter')primary.measures[0].timeSignature={beats:6,beatType:8}
    else if(kind==='odd')primary.measures[0].timeSignature={beats:7,beatType:8}
    else if(kind==='pickup')primary.measures[0].timing={type:'pickup',durationTicks:quarter}
    const lower=structuredClone(primary);lower.id='lower';lower.measures[0].id='lower-short';lower.measures[0].clef={sign:'F',line:4};lower.measures[0].voices[0].events=[]
    if(kind==='odd'||kind==='short-multi'||kind==='short-multi-existing'){
      lower.measures[0].voices[0].events=[createFullMeasureRest({id:'lower-peer-rest'})]
      lower.measures[0].voices.push(createVoice({id:'voice-2',events:[]}))
    }
    const other=structuredClone(source.parts[0]);other.id='violin';other.name='Violin';other.staves[0].id='other';other.staves[0].measures[0].id='other-short';other.staves[0].measures[0].voices[0].events[0].id='other-rest'
    source.parts[0].staves.push(lower);source.parts.push(other)
    if(kind==='short-multi-existing'){
      for(const part of source.parts)for(const staff of part.staves){
        const next=structuredClone(staff.measures[0]);next.id=staff.id+'-existing';next.number=2
        for(const voice of next.voices)voice.events=[createFullMeasureRest({id:staff.id+'-existing-'+voice.id})]
        staff.measures.push(next)
      }
      source.layout={systemBreakBeforeMeasureIds:['primary-existing']}
    }
    const voiceIndex=kind==='odd'||kind==='short-multi'||kind==='short-multi-existing'?1:0
    const state=createNoteInputState({target:{partId:source.parts[0].id,staffId:'lower',measureId:'lower-short',voiceId:`voice-${voiceIndex+1}`},tick:0,duration:kind==='pickup'?createDuration('half',1):createDuration('whole',kind==='dotted'?1:0),mode:'note'})
    const control=structuredClone(source);control.parts[0].staves[1].measures[0].voices[voiceIndex].events=[createFullMeasureRest({id:'control-rest'})]
    const normal=buildSequentialInput(control,state,'C',idSequence())!,expected=applyScoreCommand(control,normal.command).score
    if(process.env.DDIRORI_EMPTY_LONG_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_EMPTY_LONG_QA_DIR,kind)
      mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)));writeFileSync(join(dir,'expected.mid'),serializeMidi(expected));writeFileSync(join(dir,'control-before-xml.chromatics'),encodeNativeProject(createNativeProject(expected)))
      writeFileSync(join(dir,'expected-target.json'),JSON.stringify({voiceId:state.target.voiceId,measureCount:expected.parts[0].staves[1].measures.length,measures:expected.parts[0].staves[1].measures.map(m=>({timing:m.timing,timeSignature:m.timeSignature,events:m.voices[voiceIndex].events.map(({id,...event})=>event)}))},null,2))
      writeFileSync(join(dir,'expected.musicxml'),serializeMusicXml(expected))
      if(kind==='short-multi-existing'){
        const project=createNativeProject(source)
        project.partLayouts=[{partId:source.parts[0].id,layout:{systemBreakBeforeMeasureIds:[]}}]
        writeFileSync(join(dir,'source-independent.chromatics'),encodeNativeProject(project))
        writeFileSync(join(dir,'expected-part.mid'),serializeMidi({...expected,parts:[expected.parts[0]]}))
      }

    }
    const input=buildSequentialInput(source,state,'C',idSequence())
    expect(input).toBeDefined()
    const result=applyScoreCommand(source,input!.command)
    expect(result.score.parts.flatMap(p=>p.staves.map(s=>s.measures.length))).toEqual(Array(3).fill(kind==='short-meter'||kind==='short-multi'||kind==='short-multi-existing'?3:2))
    for(const part of result.score.parts)for(const staff of part.staves)for(const measure of staff.measures)expect(validateMeasureRhythm(measure).isExact).toBe(true)
    expect(serializeMidi(result.score)).toEqual(serializeMidi(expected));expect(serializeMidi(parseMusicXml(serializeMusicXml(result.score)))).toEqual(serializeMidi(expected))
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(source);expect(lower.measures[0].voices[voiceIndex].events).toEqual([])
    if(kind==='odd'||kind==='short-multi'||kind==='short-multi-existing')expect(result.score.parts[0].staves[1].measures[0].voices[0]).toEqual(lower.measures[0].voices[0])
    if(kind==='short-multi-existing'){
      expect(result.score.layout).toEqual(source.layout)
      for(const [pi,part]of source.parts.entries())for(const [si,staff]of part.staves.entries())for(const [mi,measure]of staff.measures.entries()){
        const after=result.score.parts[pi].staves[si].measures[mi]
        if(pi===0&&si===1)expect(after.voices[0]).toEqual(measure.voices[0])
        else expect(after).toEqual(measure)
      }
    }


  })
  it.each(['tie','tuplet'] as const)('[note-input.boundary-exchange] preserves ensemble %s input across append and XML/native exchange',async kind=>{
    const {measureDynamicsFixture}=await import('../../../testing/measure-dynamics-fixture')
    const {serializeMusicXml,parseMusicXml}=await import('../../../musicxml'),{serializeMidi}=await import('../midi/serialize-midi'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../../project/schema')
    const {source}=measureDynamicsFixture();source.title=`Generated boundary ${kind}`
    const measure=source.parts[0].staves[1].measures[3],voice=measure.voices[0]
    if(kind==='tuplet')voice.events.splice(1,1,
      createRest({id:'lower-bar-4-b',position:{tick:2*quarter},duration:createDuration('quarter')}),
      createRest({id:'lower-bar-4-c',position:{tick:3*quarter},duration:createDuration('quarter')}))
    const selected=voice.events.at(-1)!
    const state=createNoteInputState({target:{partId:source.parts[0].id,staffId:source.parts[0].staves[1].id,measureId:measure.id,voiceId:voice.id},tick:selected.position.tick,duration:createDuration(kind==='tie'?'whole':'eighth'),mode:'note',lastPitch:selected.type==='note'?selected.pitch:undefined})
    const ids=idSequence(),input=kind==='tie'?buildSequentialInput(source,state,'C',ids)!:(()=>{
      const first=buildSequentialInput(source,beginTupletInput(state,'boundary-tuplet')!,'C',ids)!
      const second=buildSequentialInput(source,first.nextState,'D',ids)!
      expect(first.pending&&second.pending).toBe(true)
      return buildSequentialInput(source,second.nextState,'E',ids)!
    })()
    const result=applyScoreCommand(source,input.command),lower=result.score.parts[0].staves[1].measures
    expect(result.score.parts.flatMap(p=>p.staves.map(s=>s.measures.length))).toEqual([5,5,5])
    for(const part of result.score.parts)for(const staff of part.staves)for(const bar of staff.measures)expect(validateMeasureRhythm(bar).isExact).toBe(true)
    if(kind==='tie'){
      expect(lower[3].voices[0].events[1]).toMatchObject({type:'note',ties:{start:true},duration:createDuration('half')})
      expect(lower[4].voices[0].events[0]).toMatchObject({type:'note',ties:{stop:true},duration:createDuration('half')})
    }else{
      const group=lower[3].voices[0].tuplets![0]
      expect(group.eventIds).toEqual(lower[3].voices[0].events.filter(e=>e.duration.tuplet).map(e=>e.id));expect(group).toMatchObject({actualNotes:3,normalNotes:2})
    }
    expect(result.score.slurs).toEqual(source.slurs);expect(result.score.hairpins).toEqual(source.hairpins)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(source)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(result.score))).score).toEqual(result.score)
    const xml=serializeMusicXml(result.score),midi=serializeMidi(result.score)
    expect(serializeMidi(parseMusicXml(xml))).toEqual(midi)
    if(process.env.DDIRORI_BOUNDARY_INPUT_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_BOUNDARY_INPUT_QA_DIR,kind)
      mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)));writeFileSync(join(dir,'expected.chromatics'),encodeNativeProject(createNativeProject(result.score)));writeFileSync(join(dir,'expected.musicxml'),xml);writeFileSync(join(dir,'expected.mid'),midi)
      writeFileSync(join(dir,'expected-part.mid'),serializeMidi({...result.score,parts:[result.score.parts[0]]}))
    }
  })
  it.each([1,2])('[note-input.empty-append] preserves empty peers and all new-bar voices when entering voice %i',number=>{
    const score=createScore(),measure=score.parts[0].staves[0].measures[0]
    measure.voices[0].events=[];measure.voices.push(createVoice({id:'voice-2',events:[]}))
    const input=buildSequentialInput(score,createNoteInputState({target:{...target,voiceId:`voice-${number}`},tick:0,duration:createDuration('whole'),mode:'note'}),'C',idSequence())!
    const result=applyScoreCommand(score,input.command),measures=result.score.parts[0].staves[0].measures
    expect(measures[0].voices[2-number].events).toEqual([])
    expect(measures[0].voices[number-1].events).toHaveLength(1)
    expect(measures[1].voices.map(v=>v.id)).toEqual(['voice-1','voice-2'])
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(input.nextState.target.voiceId).toBe(`voice-${number}`)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })
  it.each(['note','rest'] as const)('[note-input.ensemble-append] keeps aligned staves and parts aligned after final-bar %s entry',mode=>{
    const score=createScore(),first=score.parts[0].staves[0],lower=structuredClone(first)
    lower.id='lower';lower.measures[0].id='lower-bar';lower.measures[0].clef={sign:'F',line:4};lower.measures[0].transposition={diatonic:-1,chromatic:-2}
    lower.measures[0].voices[0].events[0].id='lower-rest';lower.measures[0].voices.push(createVoice({id:'voice-2',events:[createRest({id:'lower-voice2',duration:createDuration('whole')})]}));score.parts[0].staves.push(lower)
    const other=structuredClone(score.parts[0]);other.id='other';other.staves=[structuredClone(first)];other.staves[0].id='other-staff';other.staves[0].measures[0].id='other-bar';other.staves[0].measures[0].voices[0].events[0].id='other-rest';score.parts.push(other)
    const state=createNoteInputState({target:{...target,staffId:'lower',measureId:'lower-bar',voiceId:'voice-2'},tick:0,duration:createDuration('whole'),mode})
    const input=buildSequentialInput(score,state,mode==='note'?'C':undefined,idSequence())!,result=applyScoreCommand(score,input.command)
    expect(result.score.parts.flatMap(p=>p.staves.map(s=>s.measures.length))).toEqual([2,2,2])
    for(const [pi,part]of result.score.parts.entries())for(const [si,staff]of part.staves.entries()){
      const previous=score.parts[pi].staves[si].measures[0],next=staff.measures[1]
      expect(next).toMatchObject({number:2,clef:previous.clef,keySignature:previous.keySignature,timeSignature:previous.timeSignature})
      expect(next.transposition).toEqual(previous.transposition);expect(next.voices.map(v=>v.id)).toEqual(previous.voices.map(v=>v.id));expect(validateMeasureRhythm(next).isExact).toBe(true)
    }
    expect(input.nextState.target).toMatchObject({partId:'part-1',staffId:'lower',voiceId:'voice-2',measureId:result.score.parts[0].staves[1].measures[1].id})
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })
  it('[note-input.empty-peer] fills only the requested voice when both voices are authored empty',async()=>{
    const score=twoMeasureScore(),measure=score.parts[0].staves[0].measures[0]
    measure.voices[0].events=[];measure.voices.push(createVoice({id:'voice-2',events:[]}))
    if(process.env.DDIRORI_EMPTY_MULTIVOICE_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../../project/schema')
      const dir=process.env.DDIRORI_EMPTY_MULTIVOICE_QA_DIR;mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)))
    }
    const ids=idSequence(),state=createNoteInputState({target,tick:0,duration:createDuration('whole'),mode:'note'})
    const first=buildSequentialInput(score,state,'C',ids)
    expect(first).toBeDefined()
    const firstResult=applyScoreCommand(score,first!.command),firstMeasure=firstResult.score.parts[0].staves[0].measures[0]
    expect(firstMeasure.voices[1]).toEqual(measure.voices[1]);expect(firstMeasure.voices[0].events).toHaveLength(1)
    expect(validateMeasureRhythm(firstMeasure).isExact).toBe(false)
    expect(applyScoreCommand(firstResult.score,firstResult.undo).score).toEqual(score)
    const second=buildSequentialInput(firstResult.score,{...state,target:{...target,voiceId:'voice-2'},mode:'rest'},undefined,ids)!
    const final=applyScoreCommand(firstResult.score,second.command)
    expect(validateMeasureRhythm(final.score.parts[0].staves[0].measures[0]).isExact).toBe(true)
    expect(final.score.parts[0].staves[0].measures[0].voices[0]).toEqual(firstMeasure.voices[0])
    expect(applyScoreCommand(final.score,final.undo).score).toEqual(firstResult.score)
    expect(measure.voices.every(v=>v.events.length===0)).toBe(true)
  })
  it.each(['note','rest'] as const)('[note-input.empty-voice] enters %s and restores the authored empty voice in one undo',mode=>{
    const score=twoMeasureScore();score.parts[0].staves[0].measures[0].voices[0].events=[]
    const before=structuredClone(score),state=createNoteInputState({target,tick:0,duration:createDuration('whole'),mode})
    const input=buildSequentialInput(score,state,mode==='note'?'C':undefined,idSequence())
    expect(input).toBeDefined()
    const result=applyScoreCommand(score,input!.command)
    expect(result.score.parts[0].staves[0].measures[0].voices[0].events).toEqual([expect.objectContaining({type:mode,duration:createDuration('whole'),position:{tick:0}})])
    expect(input!.nextState.target.measureId).toBe('measure-2')
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(before)
    expect(score).toEqual(before)
  })

  it('[note-input.empty-voice] uses existing remainder rests and continues into them',()=>{
    const score=twoMeasureScore();score.parts[0].staves[0].measures[0].voices[0].events=[]
    const state=createNoteInputState({target,tick:0,duration:createDuration('quarter'),mode:'note'}),ids=idSequence()
    const input=buildSequentialInput(score,state,'D',ids)!
    expect(input).toBeDefined()
    const result=applyScoreCommand(score,input.command)
    expect(validateMeasureRhythm(result.score.parts[0].staves[0].measures[0]).isExact).toBe(true)
    expect(input.nextState.tick).toBe(quarter)
    expect(buildSequentialInput(result.score,input.nextState,'E',ids)).toBeDefined()
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })

  it('[note-input.empty-voice] preserves last-bar continuation and its exact compound inverse',()=>{
    const score=createScore();score.parts[0].staves[0].measures[0].voices[0].events=[]
    const input=buildSequentialInput(score,createNoteInputState({target,tick:0,duration:createDuration('whole'),mode:'note'}),'G',idSequence())!
    const result=applyScoreCommand(score,input.command)
    expect(result.score.parts[0].staves[0].measures).toHaveLength(2)
    expect(input.nextState.target.measureId).toBe(result.score.parts[0].staves[0].measures[1].id)
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })

  it('[note-input.empty-voice] respects pickup capacity and preserves sibling voices',()=>{
    const score=twoMeasureScore(),measure=score.parts[0].staves[0].measures[0]
    measure.timing={type:'pickup',durationTicks:quarter};measure.voices[0].events=[]
    measure.voices.push(createVoice({id:'voice-2',events:[createRest({id:'sibling-rest',duration:createDuration('quarter')})]}))
    const input=buildSequentialInput(score,createNoteInputState({target,tick:0,duration:createDuration('quarter'),mode:'note'}),'D',idSequence())!
    const result=applyScoreCommand(score,input.command)
    expect(validateMeasureRhythm(result.score.parts[0].staves[0].measures[0]).isExact).toBe(true)
    expect(result.score.parts[0].staves[0].measures[0].voices[1]).toEqual(measure.voices[1])
    expect(applyScoreCommand(result.score,result.undo).score).toEqual(score)
  })

  it('[note-input.empty-voice] rejects nonzero gaps, missing pitches and overlong rests before allocating IDs',()=>{
    const score=twoMeasureScore();score.parts[0].staves[0].measures[0].voices[0].events=[]
    const state=createNoteInputState({target,tick:quarter,duration:createDuration('quarter'),mode:'note'}),ids=()=>{throw Error('Rejected entry must not allocate an ID')}
    expect(buildSequentialInput(score,state,'C',ids)).toBeUndefined()
    expect(buildSequentialInput(score,{...state,tick:0},undefined,ids)).toBeUndefined()
    expect(buildSequentialInput(score,{...state,tick:0,mode:'rest',duration:createDuration('whole',1)},undefined,ids)).toBeUndefined()
  })
  it.each([
    { reference: { step: 'B' as const, octave: 9 }, next: 'C' as const },
    { reference: { step: 'C' as const, octave: -1 }, next: 'B' as const }
  ])('[note-input.persistable-range] rejects $next beyond $reference without changing the score or caret', ({reference, next}) => {
    const score = createScore()
    const state = createNoteInputState({target,tick:0,duration:createDuration('quarter'),mode:'note',lastPitch:reference})
    const original = structuredClone({score,state})
    expect(buildSequentialInput(score,state,next,idSequence())).toBeUndefined()
    expect({score,state}).toEqual(original)
  })
  it('[note-input.persistable-range] rejects an out-of-range pending tuplet member before preview or commit', () => {
    const score = createScore()
    const state = beginTupletInput(createNoteInputState({target,tick:0,duration:createDuration('eighth'),mode:'note',lastPitch:{step:'B',octave:9}}),'limit')!
    const original = structuredClone({score,state})
    expect(buildSequentialInput(score,state,'C',idSequence())).toBeUndefined()
    expect({score,state}).toEqual(original)
  })

  it.each(['whole', 'half', 'quarter', 'eighth', '16th'] as const)(
    '[note-input.enter-selected-duration] accepts %s duration for sequential input',
    (value) => {
      const score = createScore()
      const state = createNoteInputState({
        target,
        tick: 0,
        duration: createDuration(value),
        mode: 'note'
      })

      const input = buildSequentialInput(score, state, 'C', idSequence())
      const result = applyScoreCommand(score, input!.command)

      expect(readEvents(result.score)[0]).toMatchObject({
        type: 'note',
        duration: { value },
        pitch: { step: 'C' }
      })
      expect(
        validateMeasureRhythm(
          result.score.parts[0].staves[0].measures[0]
        ).isExact
      ).toBe(true)
    }
  )

  it('[note-input.advance-cursor] advances by the selected duration after note and rest input', () => {
    const score = createScore()
    const noteState = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const noteInput = buildSequentialInput(
      score,
      noteState,
      'C',
      idSequence()
    )
    const noteResult = applyScoreCommand(score, noteInput!.command)

    expect(noteInput!.nextState.tick).toBe(quarter)
    expect(readEvents(noteResult.score)[0]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C'
      }
    })

    const restState = {
      ...noteInput!.nextState,
      duration: createDuration('eighth'),
      mode: 'rest' as const
    }
    const restInput = buildSequentialInput(
      noteResult.score,
      restState,
      undefined,
      idSequence()
    )

    expect(restInput!.nextState.tick).toBe(quarter + quarter / 2)
  })

  it('advances note and rest input by double-dotted durations', () => {
    const score = createScore()
    const duration = createDuration('eighth', 2)
    const noteState = createNoteInputState({
      target,
      tick: 0,
      duration,
      mode: 'note'
    })
    const noteInput = buildSequentialInput(
      score,
      noteState,
      'C',
      idSequence()
    )
    const noteResult = applyScoreCommand(score, noteInput!.command)

    expect(noteInput!.nextState.tick).toBe(quarter * 0.875)
    expect(readEvents(noteResult.score)[0]).toMatchObject({
      type: 'note',
      duration: { value: 'eighth', dots: 2 }
    })

    const restState = {
      ...noteInput!.nextState,
      mode: 'rest' as const
    }
    const restInput = buildSequentialInput(
      noteResult.score,
      restState,
      undefined,
      idSequence()
    )

    expect(restInput!.nextState.tick).toBe(quarter * 1.75)
  })

  it('moves to the next existing measure at a barline', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'G', idSequence())

    expect(input!.nextState).toMatchObject({
      target: {
        measureId: 'measure-2'
      },
      tick: 0
    })
    expect(input!.command.type).toBe('voice-events.replace')
  })

  it('creates a new inherited measure at the end of the score', () => {
    const score = createScore()
    const state = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('whole'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(input!.command.type).toBe('score.batch')
    expect(measures).toHaveLength(2)
    expect(measures[1]).toMatchObject({
      id: 'measure-2',
      number: 2,
      clef: measures[0].clef,
      keySignature: measures[0].keySignature,
      timeSignature: measures[0].timeSignature
    })
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(input!.nextState).toMatchObject({
      target: {
        measureId: 'measure-2'
      },
      tick: 0
    })

    const undone = applyScoreCommand(result.score, result.undo)
    expect(undone.score).toEqual(score)
    expect(applyScoreCommand(undone.score, undone.undo).score).toEqual(
      result.score
    )
  })

  it('[note-input.split-across-existing-measure] splits note input across a measure boundary and ties the segments', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('half'),
      mode: 'note'
    })

    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(input!.command.type).toBe('score.batch')
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      duration: { value: 'quarter' },
      pitch: { step: 'C' },
      ties: { start: true }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      position: { tick: 0 },
      duration: { value: 'quarter' },
      pitch: { step: 'C' },
      ties: { stop: true }
    })
    expect(validateMeasureRhythm(measures[0]).isExact).toBe(true)
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(input!.nextState).toMatchObject({
      target: { measureId: 'measure-2' },
      tick: quarter
    })
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('keeps rests from crossing a measure boundary', () => {
    const score = twoMeasureScore()
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('half'),
      mode: 'rest'
    })

    expect(
      buildSequentialInput(score, state, undefined, idSequence())
    ).toBeUndefined()
  })

  it('[note-input.split-into-inherited-measure] creates an inherited measure for a tied overflow segment', () => {
    const score = scoreWithEvents(quarterRests(0), 2)
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('whole'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)
    const measures = result.score.parts[0].staves[0].measures

    expect(measures).toHaveLength(2)
    expect(measures[1]).toMatchObject({
      keySignature: measures[0].keySignature,
      timeSignature: measures[0].timeSignature
    })
    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      duration: { value: 'quarter' },
      pitch: { step: 'C' },
      ties: { start: true }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      duration: { value: 'half', dots: 1 },
      pitch: { step: 'C' },
      ties: { stop: true }
    })
    expect(input!.nextState).toMatchObject({
      target: { measureId: 'measure-2' },
      tick: quarter * 3
    })
    expect(validateMeasureRhythm(measures[0]).isExact).toBe(true)
    expect(validateMeasureRhythm(measures[1]).isExact).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('chooses the nearest octave from the preceding note', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-b4',
        position: createTimePosition(0),
        pitch: { step: 'B', octave: 4 }
      }),
      ...quarterRests(1)
    ])
    const state = createNoteInputState({
      target,
      tick: quarter,
      duration: createDuration('quarter'),
      mode: 'note'
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)

    expect(readEvents(result.score)[1]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C',
        octave: 5,
        alter: 0
      }
    })
  })

  it('chooses the nearest octave from the last input pitch before the cursor fallback', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-c4',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 }
      }),
      ...quarterRests(1)
    ])
    const state = createNoteInputState({
      target,
      tick: quarter,
      duration: createDuration('quarter'),
      mode: 'note',
      lastPitch: { step: 'B', octave: 4, alter: 0 }
    })
    const input = buildSequentialInput(score, state, 'C', idSequence())
    const result = applyScoreCommand(score, input!.command)

    expect(readEvents(result.score)[1]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C',
        octave: 5,
        alter: 0
      }
    })
    expect(input!.nextState.lastPitch).toMatchObject({
      step: 'C',
      octave: 5,
      alter: 0
    })
  })

  it('preserves the last input pitch through rest entry', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-c4',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 }
      }),
      ...quarterRests(1)
    ])
    const restInput = buildSequentialInput(
      score,
      createNoteInputState({
        target,
        tick: quarter,
        duration: createDuration('quarter'),
        mode: 'rest',
        lastPitch: { step: 'B', octave: 4, alter: 0 }
      }),
      undefined,
      idSequence()
    )!
    const restResult = applyScoreCommand(score, restInput.command)
    const noteInput = buildSequentialInput(
      restResult.score,
      {
        ...restInput.nextState,
        mode: 'note'
      },
      'C',
      idSequence()
    )!
    const noteResult = applyScoreCommand(restResult.score, noteInput.command)

    expect(readEvents(noteResult.score)[2]).toMatchObject({
      type: 'note',
      pitch: {
        step: 'C',
        octave: 5,
        alter: 0
      }
    })
  })

  it('note-input.accidental-measure-context uses key signatures and same-measure accidental context', () => {
    const score = scoreWithEvents(quarterRests(0), 1)
    const firstState = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('quarter'),
      mode: 'note',
      accidental: 0
    })
    const firstInput = buildSequentialInput(score, firstState, 'F', idSequence())
    const firstResult = applyScoreCommand(score, firstInput!.command)
    const secondInput = buildSequentialInput(
      firstResult.score,
      firstInput!.nextState,
      'F',
      idSequence()
    )
    const secondResult = applyScoreCommand(firstResult.score, secondInput!.command)

    expect(firstInput!.nextState.accidental).toBeUndefined()
    expect(readEvents(secondResult.score).slice(0, 2)).toMatchObject([
      { type: 'note', pitch: { step: 'F', alter: 0 } },
      { type: 'note', pitch: { step: 'F', alter: 0 } }
    ])
  })

  it('note-input.accidental-measure-context resets accidental context at the next measure', () => {
    const score = twoMeasureScore(1)
    const state = createNoteInputState({
      target,
      tick: quarter * 3,
      duration: createDuration('quarter'),
      mode: 'note',
      accidental: 0
    })
    const firstInput = buildSequentialInput(score, state, 'F', idSequence())
    const firstResult = applyScoreCommand(score, firstInput!.command)
    const secondInput = buildSequentialInput(
      firstResult.score,
      firstInput!.nextState,
      'F',
      idSequence()
    )
    const secondResult = applyScoreCommand(firstResult.score, secondInput!.command)
    const measures = secondResult.score.parts[0].staves[0].measures

    expect(measures[0].voices[0].events[3]).toMatchObject({
      type: 'note',
      pitch: { step: 'F', alter: 0 }
    })
    expect(measures[1].voices[0].events[0]).toMatchObject({
      type: 'note',
      pitch: { step: 'F', alter: 1 }
    })
  })

  it('tuplets.input-at-cursor buffers and commits a mixed eighth-note triplet as one command', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const second = buildSequentialInput(
      score,
      { ...first.nextState, mode: 'rest' },
      undefined,
      idSequence()
    )!
    const third = buildSequentialInput(
      score,
      { ...second.nextState, mode: 'note' },
      'E',
      idSequence()
    )!
    const result = applyScoreCommand(score, third.command)
    const voice = result.score.parts[0].staves[0].measures[0].voices[0]

    expect(first.pending).toBe(true)
    expect(second.pending).toBe(true)
    expect(third.pending).toBeUndefined()
    expect(third.command.type).toBe('voice-content.replace')
    expect(voice.events.slice(0, 3)).toMatchObject([
      {
        type: 'note',
        position: { tick: 0 },
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        type: 'rest',
        position: { tick: quarter / 3 }
      },
      {
        type: 'note',
        position: { tick: (quarter * 2) / 3 }
      }
    ])
    expect(voice.tuplets).toEqual([
      {
        id: 'tuplet-1',
        eventIds: voice.events.slice(0, 3).map((event) => event.id),
        actualNotes: 3,
        normalNotes: 2
      }
    ])
    expect(third.nextState).toMatchObject({
      tick: quarter,
      tupletInput: undefined,
      duration: {
        value: 'eighth',
        dots: 0
      }
    })
    expect(third.nextState.duration.tuplet).toBeUndefined()
    expect(
      validateMeasureRhythm(
        result.score.parts[0].staves[0].measures[0]
      ).isExact
    ).toBe(true)
    expect(applyScoreCommand(result.score, result.undo).score).toEqual(score)
  })

  it('starts buffered tuplet input at the end of the final measure', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: quarter * 4,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-after-end'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const firstResult = applyScoreCommand(score, first.command)

    expect(first.pending).toBe(true)
    expect(first.nextState).toMatchObject({
      target: {
        measureId: 'measure-2'
      },
      tick: 0,
      tupletInput: {
        members: [
          {
            mode: 'note',
            step: 'C'
          }
        ]
      }
    })
    expect(firstResult.score.parts[0].staves[0].measures).toHaveLength(2)
  })

  it('cancels a buffered tuplet without changing the score', () => {
    const state = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!
    const pending = buildSequentialInput(
      createScore(),
      state,
      'C',
      idSequence()
    )!
    const cancelled = cancelTupletInput(pending.nextState)

    expect(cancelled.tupletInput).toBeUndefined()
    expect(cancelled.duration.tuplet).toBeUndefined()
    expect(cancelled.tick).toBe(0)
  })

  it('previews staged tuplet members before the group is committed', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-preview'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const second = buildSequentialInput(
      score,
      { ...first.nextState, mode: 'note' },
      'E',
      idSequence()
    )!
    const preview = createTupletInputPreviewScore(score, second.nextState)
    const previewVoice = preview.parts[0].staves[0].measures[0].voices[0]
    const originalVoice = score.parts[0].staves[0].measures[0].voices[0]

    expect(second.pending).toBe(true)
    expect(originalVoice.tuplets).toBeUndefined()
    expect(originalVoice.events).toHaveLength(1)
    expect(previewVoice.events.slice(0, 3)).toMatchObject([
      {
        id: 'preview-tuplet-preview-1',
        type: 'note',
        position: { tick: 0 },
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        id: 'preview-tuplet-preview-2',
        type: 'note',
        position: { tick: quarter / 3 }
      },
      {
        id: 'preview-tuplet-preview-3',
        type: 'rest',
        position: { tick: (quarter * 2) / 3 }
      }
    ])
    expect(previewVoice.tuplets).toEqual([
      {
        id: 'preview-tuplet-preview',
        eventIds: [
          'preview-tuplet-preview-1',
          'preview-tuplet-preview-2',
          'preview-tuplet-preview-3'
        ],
        actualNotes: 3,
        normalNotes: 2
      }
    ])
    expect(
      validateMeasureRhythm(
        preview.parts[0].staves[0].measures[0]
      ).isExact
    ).toBe(true)
  })

  it('previews tuplet members from the last input pitch reference', () => {
    const score = createScore()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note',
        lastPitch: { step: 'B', octave: 4, alter: 0 }
      }),
      'tuplet-preview-last-pitch'
    )!
    const first = buildSequentialInput(
      score,
      tripletState,
      'C',
      idSequence()
    )!
    const preview = createTupletInputPreviewScore(score, first.nextState)
    const previewVoice = preview.parts[0].staves[0].measures[0].voices[0]

    expect(previewVoice.events[0]).toMatchObject({
      id: 'preview-tuplet-preview-last-pitch-1',
      type: 'note',
      pitch: {
        step: 'C',
        octave: 5,
        alter: 0
      }
    })
  })

  it('tuplets.reject-insufficient-time requires rest space before committing tuplet input', () => {
    const score = scoreWithEvents([
      createNote({
        id: 'note-1',
        position: createTimePosition(0),
        duration: createDuration('quarter'),
        pitch: { step: 'C', octave: 4 }
      }),
      createRest({
        id: 'rest-1',
        position: createTimePosition(quarter),
        duration: createDuration('half')
      }),
      createRest({
        id: 'rest-2',
        position: createTimePosition(quarter * 3),
        duration: createDuration('quarter')
      })
    ])
    const noteState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'blocked'
    )!
    const restState = beginTupletInput(
      createNoteInputState({
        target,
        tick: quarter,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-1'
    )!

    expect(buildSequentialInput(score, noteState, 'C', idSequence()))
      .toBeUndefined()
    expect(buildSequentialInput(score, restState, 'C', idSequence()))
      .toBeDefined()
  })

  it('keeps the tuplet model open to other ratios', () => {
    const score = createScore()
    const quintupletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('16th'),
        mode: 'note'
      }),
      'tuplet-5',
      5,
      4
    )!
    const ids = idSequence()
    const first = buildSequentialInput(score, quintupletState, 'C', ids)!
    const second = buildSequentialInput(score, first.nextState, 'D', ids)!
    const third = buildSequentialInput(score, second.nextState, 'E', ids)!
    const fourth = buildSequentialInput(score, third.nextState, 'F', ids)!
    const fifth = buildSequentialInput(score, fourth.nextState, 'G', ids)!
    const result = applyScoreCommand(score, fifth.command)
    const voice = result.score.parts[0].staves[0].measures[0].voices[0]

    expect(first.pending).toBe(true)
    expect(fourth.pending).toBe(true)
    expect(fifth.pending).toBeUndefined()
    expect(voice.events.slice(0, 5)).toMatchObject(
      Array.from({ length: 5 }, () => ({
        duration: {
          value: '16th',
          tuplet: { actualNotes: 5, normalNotes: 4 }
        }
      }))
    )
    expect(voice.tuplets?.[0]).toMatchObject({
      actualNotes: 5,
      normalNotes: 4
    })
    expect(fifth.nextState).toMatchObject({
      tick: quarter,
      tupletInput: undefined
    })
  })

  it('tuplets.input-mixed-duration completes an eighth triplet as eighth plus quarter', () => {
    const score = scoreWithEighthRests()
    const tripletState = beginTupletInput(
      createNoteInputState({
        target,
        tick: 0,
        duration: createDuration('eighth'),
        mode: 'note'
      }),
      'tuplet-mixed'
    )!
    const ids = idSequence()
    const first = buildSequentialInput(score, tripletState, 'C', ids)!
    const second = buildSequentialInput(
      score,
      {
        ...first.nextState,
        duration: {
          ...createDuration('quarter'),
          tuplet: {
            actualNotes: 3,
            normalNotes: 2
          }
        }
      },
      'D',
      ids
    )!
    const result = applyScoreCommand(score, second.command)
    const voice = result.score.parts[0].staves[0].measures[0].voices[0]

    expect(first.pending).toBe(true)
    expect(second.pending).toBeUndefined()
    expect(voice.events.slice(0, 2)).toMatchObject([
      {
        id: 'eighth-rest-1',
        duration: {
          value: 'eighth',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      },
      {
        id: 'event-1',
        position: { tick: quarter / 3 },
        duration: {
          value: 'quarter',
          tuplet: { actualNotes: 3, normalNotes: 2 }
        }
      }
    ])
    expect(voice.tuplets).toEqual([
      {
        id: 'tuplet-mixed',
        eventIds: ['eighth-rest-1', 'event-1'],
        actualNotes: 3,
        normalNotes: 2
      }
    ])
    expect(validateVoiceTuplets(voice)).toEqual([])
    expect(second.nextState).toMatchObject({
      tick: quarter,
      tupletInput: undefined
    })
  })

  it('tuplets.reject-relation-breaking-edit rejects nested, dotted, and measure-crossing tuplet input', () => {
    const base = createNoteInputState({
      target,
      tick: 0,
      duration: createDuration('eighth'),
      mode: 'note'
    })
    const active = beginTupletInput(base, 'tuplet-1')!

    expect(beginTupletInput(active, 'nested')).toBeUndefined()
    expect(
      beginTupletInput(
        {
          ...base,
          duration: createDuration('eighth', 1)
        },
        'dotted'
      )
    ).toBeUndefined()

    const boundaryState = beginTupletInput(
      {
        ...base,
        tick: quarter * 3.5
      },
      'boundary'
    )!

    expect(
      buildSequentialInput(
        scoreWithEighthRests(),
        boundaryState,
        'C',
        idSequence()
      )
    ).toBeUndefined()
  })
})

function twoMeasureScore(fifths = 0) {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: Array.from({ length: 4 }, (_, index) =>
                      createRest({
                        id: `rest-${index + 1}`,
                        position: createTimePosition(quarter * index),
                        duration: createDuration('quarter')
                      })
                    )
                  })
                ]
              }),
              createMeasure({
                id: 'measure-2',
                number: 2,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events: quarterRests(0)
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function scoreWithEvents(
  events: VoiceEvent[],
  fifths = 0
) {
  return createScore({
    parts: [
      createPart({
        staves: [
          createStaff({
            measures: [
              createMeasure({
                id: 'measure-1',
                number: 1,
                keySignature: { fifths },
                voices: [
                  createVoice({
                    id: 'voice-1',
                    events
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
}

function quarterRests(startIndex: number) {
  return Array.from({ length: 4 - startIndex }, (_, index) =>
    createRest({
      id: `rest-${startIndex + index + 1}`,
      position: createTimePosition(quarter * (startIndex + index)),
      duration: createDuration('quarter')
    })
  )
}

function scoreWithEighthRests() {
  return scoreWithEvents(
    Array.from({ length: 8 }, (_, index) =>
      createRest({
        id: `eighth-rest-${index + 1}`,
        position: createTimePosition((quarter / 2) * index),
        duration: createDuration('eighth')
      })
    )
  )
}

function readEvents(score: ReturnType<typeof createScore>) {
  return score.parts[0].staves[0].measures[0].voices[0].events
}

function idSequence() {
  let eventIndex = 0
  let measureIndex = 1

  return (kind: 'event' | 'measure') =>
    kind === 'event'
      ? `event-${++eventIndex}`
      : `measure-${++measureIndex}`
}
