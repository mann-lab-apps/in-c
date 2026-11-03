import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { secondaryRepeatFixture } from '../../../testing/secondary-repeat-fixture'
import { createNativeProject, encodeNativeProject } from '../../../project/schema'
import { createMusicXmlRepeatConflictError, MusicXmlRepeatConflictError } from './musicxml-repeat-conflicts'
const diagnostic='MusicXML 저장 검증에 실패했습니다. (parts)'
const conflict=()=>{const {score}=secondaryRepeatFixture('lower','repeat');score.title='Repeat conflict feedback';score.parts[0].staves[0].measures[0].repeat={start:true};return score}
it('identifies the actual lost staff/bar and keeps the strict diagnostic and source IDs separately',()=>{
 const score=conflict(),before=structuredClone(score),error=createMusicXmlRepeatConflictError(score,diagnostic)!
 expect(error).toBeInstanceOf(MusicXmlRepeatConflictError);expect(error.message).toContain('프로젝트로 저장해 원본을 유지해 주세요. 확인할 위치: Piano · 보표 2 · 2마디');expect(error.message).not.toContain('(parts)');expect(error.technicalMessage).toContain('(parts)');expect(error.technicalMessage).toContain('parts[0].staves[1].measures[1]');expect(error.technicalMessage).toContain('lower-staff/lower-bar-2');expect(score).toEqual(before)
 if(process.env.DDIRORI_REPEAT_CONFLICT_QA_DIR){const dir=process.env.DDIRORI_REPEAT_CONFLICT_QA_DIR;mkdirSync(dir,{recursive:true});const edited=structuredClone(score),note=edited.parts[0].staves[0].measures[0].voices[0].events[0];if(note.type==='note')note.pitch.step='D';writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)))}
})
it.each(['empty','identical','unaligned'] as const)('does not invent a repeat-loss explanation for %s siblings',kind=>{
 const {score,staff}=secondaryRepeatFixture('lower','repeat')
 if(kind==='identical')for(const [index,m]of score.parts[0].staves[0].measures.entries())m.repeat=staff.measures[index].repeat
 if(kind==='unaligned')staff.measures[0].timeSignature={beats:3,beatType:4}
 expect(createMusicXmlRepeatConflictError(score,diagnostic)).toBeUndefined()
})
it('also locates conflicting ending data when repeat signs themselves match',()=>{
 const {score,staff}=secondaryRepeatFixture('lower','volta');for(const [i,m]of score.parts[0].staves[0].measures.entries())m.repeat=staff.measures[i].repeat
 expect(createMusicXmlRepeatConflictError(score,diagnostic)?.message).toContain('Piano · 보표 2 · 2마디')
})
it('disambiguates authored duplicate part names without rewriting them',()=>{
 const score=conflict();score.parts[1].name='Piano';expect(createMusicXmlRepeatConflictError(score,diagnostic)?.message).toContain('1 · Piano · 보표 2');expect(score.parts.map(p=>p.name)).toEqual(['Piano','Piano'])
})
it('keeps every conflicting location in diagnostics while bounding the primary explanation',()=>{
 const score=conflict(),staff=structuredClone(score.parts[0].staves[1]);staff.id='third-staff';for(const m of staff.measures){m.id='third-'+m.id;for(const v of m.voices)for(const e of v.events)e.id='third-'+e.id}score.parts[0].staves.push(staff);const error=createMusicXmlRepeatConflictError(score,diagnostic)!;expect(error.message).toContain('외 1곳');expect(error.technicalMessage).toContain('third-staff/third-lower-bar-2')
})

it.each(['repeat','volta','empty','identical'] as const)('reports actual part projection changes for %s without changing either model',async kind=>{
 const {partRepeatProjectionFixture}=await import('../../../testing/secondary-repeat-fixture'),{collectPartRepeatProjectionWarnings}=await import('./musicxml-repeat-conflicts'),{score,expected}=partRepeatProjectionFixture(kind),before=structuredClone(score),target=structuredClone(expected),warnings=collectPartRepeatProjectionWarnings(score,expected,score.parts[0].id)
 if(kind==='repeat'||kind==='volta'){expect(warnings).toHaveLength(1);expect(warnings[0].summary).toContain('Piano · 보표 2 · 2마디');expect(warnings[0].path).toContain('lower-staff/lower-bar-2');expect(warnings[0].code).toBe('studio-part-repeat-projection')}
 else expect(warnings).toEqual([])
 expect(score).toEqual(before);expect(expected).toEqual(target)
})
it('does not invent projection context for a missing or ambiguous part',async()=>{
 const {partRepeatProjectionFixture}=await import('../../../testing/secondary-repeat-fixture'),{collectPartRepeatProjectionWarnings}=await import('./musicxml-repeat-conflicts'),{score,expected}=partRepeatProjectionFixture('repeat');expect(collectPartRepeatProjectionWarnings(score,expected,'absent')).toEqual([]);expected.parts.push(structuredClone(expected.parts[0]));expect(collectPartRepeatProjectionWarnings(score,expected,score.parts[0].id)).toEqual([])
})
