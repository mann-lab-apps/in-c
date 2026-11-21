import {expect,it} from 'vitest'
import {createNote,createDuration} from '../../../score-core'
import {createNewScore} from '../editor/new-score'
import {isSpanOffsetOnlyChange} from './focus-viewport'
function example(){
 const score=createNewScore({title:'배치 포커스',templateId:'solo-melody',measureCount:2,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}})
 const bars=score.parts[0].staves[0].measures
 for(const bar of bars)bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,duration:createDuration('whole'),pitch:{step:'C',octave:4}})]
 score.slurs=[{id:'s',startEventId:bars[0].voices[0].events[0].id,endEventId:bars[1].voices[0].events[0].id,engraving:{placement:'above',offsetY:0,height:2}}]
 return score
}
const ref={kind:'slur',id:'s'}as const
it('recognizes a manual offset command and its undo across cloned layout projections',()=>{
 const before=example(),after=structuredClone(before);after.slurs![0].engraving!.offsetY=-.25
 expect(isSpanOffsetOnlyChange(before,after,ref)).toBe(true);expect(isSpanOffsetOnlyChange(after,before,ref)).toBe(true)
})
it('does not classify a repaint or equal model as positioning',()=>{const score=example();expect(isSpanOffsetOnlyChange(score,score,ref)).toBe(false);expect(isSpanOffsetOnlyChange(score,structuredClone(score),ref)).toBe(false)})
it.each(['pitch','tempo','endpoint','height','placement','other-span']as const)('keeps normal focus following for simultaneous %s changes',kind=>{
 const before=example(),after=structuredClone(before);after.slurs![0].engraving!.offsetY=-.25
 if(kind==='pitch'){const note=after.parts[0].staves[0].measures[0].voices[0].events[0];if(note.type==='note')note.pitch.step='D'}
 if(kind==='tempo')after.tempo!.bpm=90
 if(kind==='endpoint')after.slurs![0].endEventId=after.slurs![0].startEventId
 if(kind==='height')after.slurs![0].engraving!.height=3
 if(kind==='placement')after.slurs![0].engraving!.placement='below'
 if(kind==='other-span')after.slurs!.push({...after.slurs![0],id:'other'})
 expect(isSpanOffsetOnlyChange(before,after,ref)).toBe(false)
})
it('does not treat automatic transitions or another document as a manual offset command',()=>{
 const before=example(),after=structuredClone(before);after.slurs![0].engraving!.offsetY=-.25;before.slurs![0].engraving=undefined;expect(isSpanOffsetOnlyChange(before,after,ref)).toBe(false)
 const next=structuredClone(after);next.id+='-new';expect(isSpanOffsetOnlyChange(after,next,ref)).toBe(false);expect(isSpanOffsetOnlyChange(undefined,after,ref)).toBe(false)
})
