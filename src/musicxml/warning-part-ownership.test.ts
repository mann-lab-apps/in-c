import { expect,it } from 'vitest'
import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createWarningPartOwnershipFixture,type WarningPartCase } from '../testing/warning-part-ownership-fixture'
import { parseMusicXml,parseMusicXmlWithReport } from './parse'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
import { createNativeProject,encodeNativeProject } from '../project/schema'

it.each(['technical','direction','both','single','control']as WarningPartCase[])('preserves warning source ownership for %s',kind=>{
 const {xml}=createWarningPartOwnershipFixture(kind),baseline=parseMusicXml(xml),{score,report}=parseMusicXmlWithReport(xml)
 const parts=kind==='single'?[1]:[1,2],paths=kind==='control'?[]:parts.flatMap(part=>[
  ...(kind!=='direction'?[`part[${part}].measure[1].note[1].notations.technical`]:[]),
  ...(kind==='direction'||kind==='both'?[`part[${part}].measure[1].direction[1].direction-type[1].coda`]:[])
 ])
 expect(report.warnings.map(w=>w.path)).toEqual(paths);expect(score).toEqual(baseline);expect(serializeMidi(score)).toEqual(serializeMidi(baseline))
 if(kind==='technical'||kind==='single')expect(report.warnings).toHaveLength(parts.length)
 const out=process.env.DDIRORI_WARNING_PART_QA_DIR
 if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expected.chromatics'),encodeNativeProject(createNativeProject(baseline)));writeFileSync(join(dir,'expected.mid'),serializeMidi(baseline));writeFileSync(join(dir,'warnings.json'),JSON.stringify(report,null,2))}
})
