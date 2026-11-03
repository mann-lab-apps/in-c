import { mkdirSync,writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect,it } from 'vitest'
import { createPrintHeaderFixture } from '../testing/print-header-fixture'
import { decodeNativeProject,encodeNativeProject } from './schema'
import { parseMusicXml,serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it('isolates paper header and global tempo without changing music or native content',()=>{
 for(const kind of ['short','wrapped','no-tempo','swing','tempo-text','tall-no-tempo'] as const){
  const project=createPrintHeaderFixture(kind),xml=serializeMusicXml(project.score)
  expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
  const out=process.env.DDIRORI_HEADER_QA_DIR
  if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'expected.musicxml'),xml);writeFileSync(join(dir,'expected.mid'),serializeMidi(project.score))}
 }
})
