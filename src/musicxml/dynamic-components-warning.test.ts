import {expect,it} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createDynamicComponentsCases} from '../testing/dynamic-components-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './index'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../project/schema'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
const sourceComponents:Record<string,Array<{kind:string;text?:string}>>={
 compound:[{kind:'p'},{kind:'sfz'}],reordered:[{kind:'sfz'},{kind:'p'}],
 'repeated-symbol':[{kind:'p'},{kind:'p'}],unsupported:[{kind:'pppp'}],text:[{kind:'other-dynamics',text:'subito p'}],
 array:[{kind:'p'},{kind:'f'}],'empty-and-p':[{kind:'p'}],note:[{kind:'p'}],'note-combined':[{kind:'p'}],'note-rest':[{kind:'p'}],owner:[{kind:'p'},{kind:'sfz'}]
}
const notices=(warnings:ReturnType<typeof parseMusicXmlWithReport>['report']['warnings'])=>warnings.filter(w=>w.message.startsWith('Unrepresented dynamic marking ')||w.message.startsWith('Unrepresented note-attached dynamics '))
it.each(createDynamicComponentsCases())('diagnoses $id symbolic dynamic loss while preserving the existing projection and velocity notice',c=>{
 const result=parseMusicXmlWithReport(c.xml),control=parseMusicXmlWithReport(c.control),warnings=notices(result.report.warnings),note=c.lost&&c.id.startsWith('note')
 expect(warnings).toHaveLength(c.lost?1:0)
 if(c.lost){const path=c.id==='owner'?'part[2].measure[2].direction[2].direction-type[2].dynamics':note?'part[1].measure[1].note[1].notations[1].dynamics[1]':'part[1].measure[1].direction[1].direction-type[1].dynamics';expect(warnings[0]).toMatchObject({code:note?'unsupported-notation':'unsupported-direction',partNumber:c.id==='owner'?2:1,measureNumber:c.id==='owner'?2:1,path});if(note)expect(warnings[0]).toMatchObject({eventIndex:1});expect(warnings[0].message).toContain('Keep the original MusicXML')}
 if(c.lost){expect(warnings[0].message).toContain('"components":'+JSON.stringify(sourceComponents[c.id]));if(!note)expect(warnings[0].message).toContain('"retainedValue":'+JSON.stringify(control.score.dynamics?.[0]?.value??null));if(c.id==='array'||c.id==='empty-and-p')expect(warnings[0].message).toContain('"elements":2')}
 const oldVelocity=result.report.warnings.filter(w=>w.message.startsWith('Explicit note dynamics '))
 expect(oldVelocity).toHaveLength(c.knownAttribute?1:0)
 if(c.knownAttribute){expect(oldVelocity[0].path).toBe('part[1].measure[1].note[1].dynamics');expect(oldVelocity[0].message).toContain('30% of default forte')}
 expect(result.score).toEqual(control.score)
 const native=encodeNativeProject(createNativeProject(result.score)),copy=serializeMusicXml(result.score),midi=serializeMidi(result.score)
 expect(native).toBe(encodeNativeProject(createNativeProject(control.score)));expect(decodeNativeProject(native).score).toEqual(control.score);expect(copy).toBe(serializeMusicXml(control.score));expect(midi).toEqual(serializeMidi(control.score));expect(notices(parseMusicXmlWithReport(copy).report.warnings)).toEqual([])
 const root=process.env.STUDIO_DYNAMIC_COMPONENT_QA_DIR
 if(root){const d=join(root,c.id);mkdirSync(d,{recursive:true});for(const[n,data]of[['source.musicxml',c.xml],['control.musicxml',c.control],['project.chromatics',native],['copy.musicxml',copy],['current.mid',midi],['report.json',JSON.stringify(result.report,null,2)]]as const)writeFileSync(join(d,n),data)}
})
