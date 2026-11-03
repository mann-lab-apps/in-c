import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {legacySpanOrderFixture}from '../../../../../../src/testing/legacy-span-order-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {serializeMusicXml,serializeMusicXmlWithReport,parseMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
import {spanEndpointOptions}from '../../../../../../src/renderer/src/editor/span-editing'
const dir='out/ddirori/continuous-352-source';mkdirSync(dir,{recursive:true});const audit=[]
for(const kind of ['hairpin','slur']as const)for(const order of ['equal','reversed']as const){const f=legacySpanOrderFixture(kind,order),name=kind+'-'+order
 for(const state of ['source','edited','repaired']as const){const score=f[state],native=encodeNativeProject(createNativeProject(score));assert.deepEqual(decodeNativeProject(native).score,JSON.parse(JSON.stringify(score)));writeFileSync(join(dir,name+'-'+state+'.chromatics'),native)
  if(state==='repaired'){const xml=serializeMusicXml(score),midi=serializeMidi(score);assert.deepEqual(serializeMidi(parseMusicXml(xml)),midi);writeFileSync(join(dir,name+'-'+state+'.musicxml'),xml);writeFileSync(join(dir,name+'-'+state+'.mid'),midi)}
 }
 writeFileSync(join(dir,name+'-owners.json'),JSON.stringify({reference:f.reference,repair:f.repair,options:spanEndpointOptions(f.source,f.reference)},null,2));const row:{name:string;serialized:boolean;parseSucceeded?:boolean;error?:string;warnings?:unknown}={name,serialized:false}
 try{const result=serializeMusicXmlWithReport(f.source);row.serialized=true;row.warnings=result.report.warnings;writeFileSync(join(dir,name+'-before.musicxml'),result.contents);try{parseMusicXml(result.contents);row.parseSucceeded=true}catch(e){row.parseSucceeded=false;row.error=String(e)}}catch(e){row.error=String(e)}audit.push(row)
}
writeFileSync(join(dir,'source.chromatics'),readFileSync(join(dir,'hairpin-equal-source.chromatics')));writeFileSync(join(dir,'serializer-before.json'),JSON.stringify(audit,null,2));console.log(JSON.stringify(audit,null,2))
