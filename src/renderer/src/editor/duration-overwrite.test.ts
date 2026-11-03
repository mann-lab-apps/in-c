import {expect,it} from 'vitest'
import {applyScoreCommand,validateMeasureRhythm} from '../../../score-core'
import {createStudioEditingFixture} from '../../../testing/studio-editing-fixture'
import {buildDurationCommand,locateEvent} from './editor-state'
import {buildDurationOverwrite} from './duration-overwrite'
it.each([0,1])('explicit overwrite preserves bar, unaffected positions and exact undo (%s dots)',dots=>{
 const score=createStudioEditingFixture().score,before=structuredClone(score),selection={type:'event' as const,eventId:'editing-source'},location=locateEvent(score,selection.eventId)!,duration={value:'quarter' as const,dots:dots===0?0:1}
 if(dots===0)Object.assign(duration,{value:'half'})
 expect(buildDurationCommand(score,selection,duration)).toBeUndefined()
 let i=0;const proposal=buildDurationOverwrite(score,location,duration,()=>`rest-${++i}`)
 expect(proposal.count).toBe(1);expect(score).toEqual(before)
 const applied=applyScoreCommand(score,proposal.command!),measure=applied.score.parts[0].staves[0].measures[0]
 expect(validateMeasureRhythm(measure).isExact).toBe(true)
 expect(measure.voices[0].events.find(e=>e.id==='editing-third')?.position).toEqual(before.parts[0].staves[0].measures[0].voices[0].events[2].position)
 if(dots===0)expect(measure.voices[0].events.find(e=>e.id==='editing-host')).toBeUndefined()
 else expect(measure.voices[0].events.find(e=>e.id==='editing-host')).toMatchObject({type:'rest',duration:{value:'eighth'},position:{tick:20160}})
 if(dots===1)expect(measure.voices[0].events.some(e=>e.type==='rest')).toBe(true)
 expect(applyScoreCommand(applied.score,applied.undo).score).toEqual(before)
})
it.each(['tie','span','tuplet','overflow'])('does not silently destroy protected %s',kind=>{
 const score=createStudioEditingFixture().score,measure=score.parts[0].staves[0].measures[0],voice=measure.voices[0]
 if(kind==='tie'&&voice.events[1].type==='note')voice.events[1].ties={stop:true}
 if(kind==='span')score.slurs=[{id:'protected',startEventId:'editing-host',endEventId:'editing-third'}]
 if(kind==='tuplet')voice.tuplets=[{id:'protected',eventIds:['editing-host'],actualNotes:3,normalNotes:2,baseDuration:{value:'quarter',dots:0}}] as any
 const selection=kind==='overflow'?'editing-fourth':'editing-source',before=structuredClone(score)
 const result=buildDurationOverwrite(score,locateEvent(score,selection),{value:'whole',dots:0},()=> 'unused')
 expect(result.command).toBeUndefined();expect(score).toEqual(before)
})
