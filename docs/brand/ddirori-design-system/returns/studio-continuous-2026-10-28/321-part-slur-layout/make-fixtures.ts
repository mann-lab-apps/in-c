import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import assert from 'node:assert/strict'
import {createReleaseTestScore} from '../../../../../../src/testing/single-voice-mvp-fixture'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../../../../src/project/schema'
import {applyPortablePartLayout} from '../../../../../../src/project/part-layout'
import {createFullMeasureRest,createVoice,validateTieRelations} from '../../../../../../src/score-core'
import {parseMusicXml,serializeMusicXml} from '../../../../../../src/musicxml'
import {serializeMidi} from '../../../../../../src/renderer/src/midi/serialize-midi'
for(const mode of ['auto','manual']){
 const score=createReleaseTestScore();score.layout={systemBreakBeforeMeasureIds:['measure-5']}
 score.dynamics!.push({id:'part-qa-mp-4',measureId:'measure-4',value:'mp'},{id:'part-qa-mp-5',measureId:'measure-5',value:'mp'})
 if(mode==='manual')score.slurs![1].engraving={offsetY:0}
 const neighbour=structuredClone(score.parts[0]);neighbour.id='silent-neighbour';neighbour.name='Silent neighbour';neighbour.abbreviation='Rest'
 for(const staff of neighbour.staves){staff.id='neighbour-'+staff.id;for(const m of staff.measures){m.id='neighbour-'+m.id;m.voices=[createVoice({id:'neighbour-voice',events:[createFullMeasureRest({id:m.id+'-rest'})]})]}}
 score.parts.push(neighbour)
 const project=createNativeProject(score)
 project.partLayouts=[{partId:score.parts[0].id,title:'Primary part rehearsal',layout:{systemBreakBeforeMeasureIds:['measure-4','measure-6']}},{partId:neighbour.id,title:'Neighbour rehearsal',layout:{systemBreakBeforeMeasureIds:['neighbour-measure-3']}}]
 const encoded=encodeNativeProject(project);assert.deepEqual(decodeNativeProject(encoded),JSON.parse(encoded));assert.deepEqual(validateTieRelations(score),[])
 const p=join('out/ddirori/continuous-321-source',mode);mkdirSync(p,{recursive:true});writeFileSync(join(p,'source.chromatics'),encoded)
 for(const view of ['score','part']){
  const selected=view==='score'?score:{...applyPortablePartLayout({...score,parts:[score.parts[0]]},project.partLayouts[0]),title:project.partLayouts[0].title!}
  const xml=serializeMusicXml(selected),midi=serializeMidi(selected);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi)
  writeFileSync(join(p,view+'.musicxml'),xml);writeFileSync(join(p,view+'.mid'),midi)
 }
}
console.log('PASS2 two-part sources:shared span/native/layouts/XML/MIDI,score break5 vs primary part4/6')
