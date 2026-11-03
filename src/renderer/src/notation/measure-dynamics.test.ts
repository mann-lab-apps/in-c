import { expect,it } from 'vitest'
import { measureDynamicsFixture } from '../../../testing/measure-dynamics-fixture'
import { createPlaybackTimeline } from '../playback/timeline'
import { indexMeasureDynamics } from './measure-dynamics'

it('renders the same first measure dynamic used by Inspector and playback without rewriting authored duplicates',()=>{
 const {source}=measureDynamicsFixture(),before=structuredClone(source),index=indexMeasureDynamics(source.dynamics)
 expect(index.get('primary-bar-1')).toBe(source.dynamics![0]);expect(index.get('lower-bar-1')).toBe(source.dynamics![2]);expect(index.get('other-bar-2')).toBe(source.dynamics![4])
 const firstOnly={...source,dynamics:[source.dynamics![0],source.dynamics![2],source.dynamics![4]]}
 expect(createPlaybackTimeline(source)).toEqual(createPlaybackTimeline(firstOnly));expect(source).toEqual(before)
})
it('keeps owners distinct and does not invent marks for empty measures',()=>{
 const {source}=measureDynamicsFixture(),index=indexMeasureDynamics(source.dynamics)
 expect(index.get('primary-bar-1')!.value).toBe('p');expect(index.get('primary-bar-2')).toBeUndefined();expect(indexMeasureDynamics().size).toBe(0)
})
it('generates owned measure dynamics production fixtures when requested',async()=>{
 const dir=process.env.DDIRORI_MEASURE_DYNAMICS_QA_DIR;if(!dir)return
 const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../../project/schema'),{serializeMusicXml}=await import('../../../musicxml'),{serializeMidi}=await import('../midi/serialize-midi')
 mkdirSync(dir,{recursive:true});for(const [name,score]of Object.entries(measureDynamicsFixture())){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(score));writeFileSync(join(dir,name+'.mid'),serializeMidi(score))}
})
