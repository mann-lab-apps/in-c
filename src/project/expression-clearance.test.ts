import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createStemExpressionHairpinFixture } from '../testing/stem-expression-hairpin-fixture'
import { decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'
it('isolates expression/music clearance without a span model or source mutation',()=>{
 for(const cross of [false,true]){
  const project=createStemExpressionHairpinFixture(cross,false);delete project.score.hairpins;project.score.title='Generated expression-only clearance'
  expect(decodeNativeProject(encodeNativeProject(project))).toEqual(project)
  const xml=serializeMusicXml(project.score);expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(project.score))
  const out=process.env.DDIRORI_EXPRESSION_CLEARANCE_QA_DIR
  if(out){const dir=join(out,`${cross?'cross':'single'}-auto`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'expected.musicxml'),xml);writeFileSync(join(dir,'expected.mid'),serializeMidi(project.score))}
 }
})
