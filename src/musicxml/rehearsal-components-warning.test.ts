import { expect, it } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRehearsalComponentsFixture, stripRehearsalComponentDirections } from '../testing/rehearsal-components-fixture'
import { parseMusicXmlWithReport, serializeMusicXml } from './index'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../project/schema'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
const notices=(xml:string)=>parseMusicXmlWithReport(xml).report.warnings.filter(w=>w.message.startsWith('Unrepresented rehearsal components '))
const emit=(kind:string,source:string,result:ReturnType<typeof parseMusicXmlWithReport>)=>{
  const out=process.env.STUDIO_REHEARSAL_COMPONENT_QA_DIR
  if(!out)return
  mkdirSync(out,{recursive:true});writeFileSync(join(out,kind+'.musicxml'),source)
  writeFileSync(join(out,kind+'-report.json'),JSON.stringify(result.report,null,2))
  writeFileSync(join(out,kind+'-expected.chromatics'),encodeNativeProject(createNativeProject(result.score)))
  writeFileSync(join(out,kind+'-expected.musicxml'),serializeMusicXml(result.score))
  writeFileSync(join(out,kind+'-expected.mid'),serializeMidi(result.score))
}
it.each(['styled','plain','multiple','normalized','one-nonempty'] as const)('reports actual lost %s rehearsal components without joining or changing music',kind=>{
  const source=createRehearsalComponentsFixture(kind),result=parseMusicXmlWithReport(source),control=parseMusicXmlWithReport(stripRehearsalComponentDirections(source)),warnings=notices(source)
  emit(kind,source,result)
  expect(warnings.map(w=>w.path)).toEqual(kind==='multiple'?['part[1].measure[3].direction[1].direction-type[1].rehearsal','part[2].measure[2].direction[1].direction-type[1].rehearsal','part[2].measure[2].direction[2].direction-type[1].rehearsal']:['part[1].measure[2].direction[1].direction-type[1].rehearsal'])
  expect(warnings.map(w=>[w.partNumber,w.measureNumber])).toEqual(kind==='multiple'?[[1,3],[2,2],[2,2]]:[[1,2]])
  expect(warnings.every(w=>w.code==='unsupported-direction'&&w.message.includes('count=2'))).toBe(true)
  expect(result.score).toEqual(control.score);expect(result.score.rehearsalMarks).toBeUndefined()
  const copy=serializeMusicXml(result.score);expect(copy).toBe(serializeMusicXml(control.score));expect(copy).not.toContain('<rehearsal');expect(notices(copy)).toEqual([])
  const native=decodeNativeProject(encodeNativeProject(createNativeProject(result.score)));expect(native.score).toEqual(result.score);expect(serializeMidi(native.score)).toEqual(serializeMidi(control.score));expect(serializeMidi(parseMusicXmlWithReport(copy).score)).toEqual(serializeMidi(control.score))
})
it.each(['single','separate','empty','none'] as const)('preserves existing %s rehearsal behavior without inventing component loss',kind=>{
  const source=createRehearsalComponentsFixture(kind),result=parseMusicXmlWithReport(source)
  emit(kind,source,result)
  expect(notices(source)).toEqual([])
  if(kind==='single')expect(result.score.rehearsalMarks?.map(m=>m.text)).toEqual(['A'])
  if(kind==='separate')expect(result.score.rehearsalMarks?.map(m=>m.text)).toEqual(['A','B'])
  if(kind==='empty'||kind==='none')expect(result.score.rehearsalMarks).toBeUndefined()
  expect(notices(serializeMusicXml(result.score))).toEqual([])
})
