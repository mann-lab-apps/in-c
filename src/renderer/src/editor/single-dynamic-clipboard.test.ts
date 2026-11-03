import { expect,it,vi } from 'vitest'
import { measureDynamicsFixture } from '../../../testing/measure-dynamics-fixture'
import { buildSingleMeasureTextClipboard,buildMeasureMarkingClipboard,buildMeasureMarkingPasteCommand } from './measure-markings'

it('snapshots one effective dynamic and explicitly replaces only the target staff measure without inventing tick or voice',()=>{
 const {source}=measureDynamicsFixture(),before=structuredClone(source),clip=buildSingleMeasureTextClipboard(source,'dynamics','primary-first')!
 expect(clip.type).toBe('dynamics');expect(clip.pasteMode).toBe('replace-measure');if(clip.type!=='dynamics')throw Error('Dynamic clipboard expected')
 expect(clip.dynamics).toEqual([before.dynamics![0]])
 const command=buildMeasureMarkingPasteCommand(source,'other-bar-2',clip,()=> 'new',12345)!
 if(command.type!=='score-dynamics.update')throw Error('Dynamic command expected')
 expect(command.dynamics).toEqual([...before.dynamics!.filter(mark=>mark.measureId!=='other-bar-2'),{...before.dynamics![0],id:'dynamic-new',measureId:'other-bar-2'}]);expect(source).toEqual(before)
 expect(command.dynamics!.at(-1)).not.toHaveProperty('tick');expect(command.dynamics!.at(-1)).not.toHaveProperty('voiceId')
 source.dynamics![0].value='ff';command.dynamics!.at(-1)!.value='f';expect(clip.dynamics[0].value).toBe('p')
})
it('snapshots an explicitly chosen stored dynamic under the approved measure-only policy',()=>{
 const {source}=measureDynamicsFixture(),before=structuredClone(source)
 const clip=buildSingleMeasureTextClipboard(source,'dynamics','primary-later')!
 expect(clip).toEqual({type:'dynamics',dynamics:[before.dynamics![1]],pasteMode:'replace-measure'})
 if(clip.type!=='dynamics')throw Error('Dynamic clipboard expected')
 source.dynamics![1].value='f'
 expect(clip.dynamics[0].value).toBe('ff');expect(before.dynamics![0].value).toBe('p')
})
it.each(['missing','ambiguous-owner','duplicate-id','alias-owner'] as const)('rejects %s source without rebinding another marking',kind=>{
 const {source}=measureDynamicsFixture()
 if(kind==='ambiguous-owner')source.parts[1].staves[0].measures[0].id='primary-bar-1'
 if(kind==='duplicate-id')source.dynamics!.push({...source.dynamics![0]})
 if(kind==='alias-owner')source.dynamics![0].measureId='measure-1'
 expect(buildSingleMeasureTextClipboard(source,'dynamics',kind==='missing'?'absent':'primary-first')).toBeUndefined()
})
it('keeps legacy whole-measure replacement and rejects forged single replacement lists before allocating IDs',()=>{
 const {source}=measureDynamicsFixture(),bulk=buildMeasureMarkingClipboard(source,'primary-bar-1','dynamics')!,ids=vi.fn(()=> 'new')
 expect(bulk.pasteMode).toBeUndefined();expect(buildMeasureMarkingPasteCommand(source,'other-bar-2',{...bulk,pasteMode:'replace-measure'},ids)).toBeUndefined();expect(ids).not.toHaveBeenCalled()
 const command=buildMeasureMarkingPasteCommand(source,'other-bar-2',bulk,(()=>{let i=0;return()=>String(++i)})())!
 if(command.type!=='score-dynamics.update')throw Error('Dynamic command expected')
 expect(command.dynamics!.filter(mark=>mark.measureId==='other-bar-2').map(mark=>mark.value)).toEqual(['p','ff'])
 const single=buildSingleMeasureTextClipboard(source,'dynamics','primary-first')!
 expect(buildMeasureMarkingPasteCommand(source,'absent',single,ids)).toBeUndefined();expect(ids).not.toHaveBeenCalled()
})
