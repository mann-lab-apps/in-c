import { expect,it,vi } from 'vitest'
import { TICKS_PER_QUARTER } from '../../../score-core'
import { singleHarmonyFixture } from '../../../testing/single-harmony-fixture'
import { buildSingleMeasureTextClipboard,buildMeasureMarkingClipboard,buildMeasureMarkingPasteCommand } from './measure-markings'

it('copies the exact rich harmony snapshot and appends it at a selected event without replacing any neighbor',()=>{
 const score=singleHarmonyFixture(),before=structuredClone(score),source=score.harmonies!.find(h=>h.id==='h-source-second')!,clip=buildSingleMeasureTextClipboard(score,'harmonies',source.id)!
 expect(clip.type).toBe('harmonies');expect(clip.pasteMode).toBe('append-single');if(clip.type!=='harmonies')throw Error('Single harmony expected');expect(clip.harmonies).toEqual([source]);const command=buildMeasureMarkingPasteCommand(score,'other-bar-2',clip,()=> 'new-one',2*TICKS_PER_QUARTER)!
 expect(command.type).toBe('score-harmonies.update');if(command.type!=='score-harmonies.update')throw Error('Harmony command expected');expect(command.harmonies).toEqual([...before.harmonies!,{...source,id:'harmony-new-one',measureId:'other-bar-2',tick:2*TICKS_PER_QUARTER}]);expect(score).toEqual(before)
 source.root!.step='A';source.bass!.step='D';expect(clip.harmonies[0].root?.step).toBe('G');expect(clip.harmonies[0].bass?.step).toBe('B');command.harmonies!.at(-1)!.root!.step='F';const second=buildMeasureMarkingPasteCommand(score,'other-bar-3',clip,()=> 'new-two',0)!
 if(second.type!=='score-harmonies.update')throw Error('Harmony command expected');expect(second.harmonies!.at(-1)!.root?.step).toBe('G');expect(second.harmonies!.at(-1)!.tick).toBe(0)
})
it.each([-1,1.5,Number.NaN,Number.POSITIVE_INFINITY,4*TICKS_PER_QUARTER+1])('rejects an unsupported single harmony source tick %s',tick=>{
 const score=singleHarmonyFixture();score.harmonies![1].tick=tick;expect(buildSingleMeasureTextClipboard(score,'harmonies','h-source-second')).toBeUndefined()
})
it.each(['duplicate-object','ambiguous-measure','missing'] as const)('rejects %s source identity',kind=>{
 const score=singleHarmonyFixture();if(kind==='duplicate-object')score.harmonies!.push({...score.harmonies![1]});if(kind==='ambiguous-measure')score.parts[1].staves[0].measures[0].id='primary-bar-1';expect(buildSingleMeasureTextClipboard(score,'harmonies',kind==='missing'?'absent':'h-source-second')).toBeUndefined()
})
it('retains the existing measure-filter replacement and recorded-tick contract',()=>{
 const score=singleHarmonyFixture(),clip=buildMeasureMarkingClipboard(score,'primary-bar-1','harmonies')!,command=buildMeasureMarkingPasteCommand(score,'other-bar-2',clip,()=> 'filtered',2*TICKS_PER_QUARTER)!
 expect(clip.pasteMode).toBeUndefined();if(command.type!=='score-harmonies.update')throw Error('Harmony command expected');expect(command.harmonies!.filter(h=>h.measureId==='other-bar-2').map(h=>h.tick)).toEqual([TICKS_PER_QUARTER,TICKS_PER_QUARTER,3*TICKS_PER_QUARTER]);expect(command.harmonies!.some(h=>h.id==='h-target-existing')).toBe(false)
})
it('rejects forged append lists and invalid target ticks before allocating IDs',()=>{
 const score=singleHarmonyFixture(),clip=buildMeasureMarkingClipboard(score,'primary-bar-1','harmonies')!,ids=vi.fn(()=> 'never');expect(buildMeasureMarkingPasteCommand(score,'other-bar-2',{...clip,pasteMode:'append-single'},ids,0)).toBeUndefined();expect(ids).not.toHaveBeenCalled()
 const single=buildSingleMeasureTextClipboard(score,'harmonies','h-source-second')!;expect(buildMeasureMarkingPasteCommand(score,'other-bar-2',single,ids,Number.NaN)).toBeUndefined();expect(ids).not.toHaveBeenCalled()
})

it('generates owned single-harmony production fixtures when requested',async()=>{
 const dir=process.env.DDIRORI_SINGLE_HARMONY_QA_DIR
 if(!dir)return
 const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path')
 const {createNativeProject,encodeNativeProject}=await import('../../../project/schema')
 const {serializeMusicXml}=await import('../../../musicxml'),{serializeMidi}=await import('../midi/serialize-midi')
 const {parseHarmonyText}=await import('../../../musicxml/harmony-text')
 const score=singleHarmonyFixture();score.title=process.env.DDIRORI_SINGLE_HARMONY_QA_TITLE??score.title
 const edited=structuredClone(score)
 Object.assign(edited.harmonies![1],parseHarmonyText('Dm7/A'))
 const clip=buildSingleMeasureTextClipboard(score,'harmonies','h-source-second')!
 const cmd=buildMeasureMarkingPasteCommand(edited,'other-bar-2',clip,()=> 'expected-new',2*TICKS_PER_QUARTER)!
 if(cmd.type!=='score-harmonies.update')throw Error('Expected harmony command')
 const pasted={...edited,harmonies:cmd.harmonies}
 mkdirSync(dir,{recursive:true})
 const destination=structuredClone(score);destination.title='Destination document same IDs';Object.assign(destination.harmonies![1],parseHarmonyText('Cm7/Eb'))
 const destinationCommand=buildMeasureMarkingPasteCommand(destination,'other-bar-2',clip,()=> 'destination-new',0)!
 if(destinationCommand.type!=='score-harmonies.update')throw Error('Expected destination command')
 const destinationPasted={...destination,harmonies:destinationCommand.harmonies}
 const removed=structuredClone(score);removed.harmonies=removed.harmonies!.filter(mark=>mark.id!=='h-source-second')
 for(const [name,value]of Object.entries({source:score,edited,pasted,removed,destination,'destination-pasted':destinationPasted})){
  writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)))
  writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(value))
  writeFileSync(join(dir,name+'.mid'),serializeMidi(value))
 }
})
