import {readFileSync,mkdirSync,writeFileSync}from 'node:fs'
import {join}from 'node:path'
import assert from 'node:assert/strict'
import {createNativeProject,decodeNativeProject,encodeNativeProject}from '../../../../../../src/project/schema'
import {serializeMusicXml}from '../../../../../../src/musicxml'
import {serializeMidi}from '../../../../../../src/renderer/src/midi/serialize-midi'
import {spanEndpointOptions}from '../../../../../../src/renderer/src/editor/span-editing'
const original=decodeNativeProject(readFileSync('out/ddirori/continuous-346-source/source.chromatics','utf8')).score,dir='out/ddirori/continuous-347-source';mkdirSync(dir,{recursive:true})
const cases=[{name:'equal',start:'lower-bar-1-a',end:'lower-bar-1-a'},{name:'reversed',start:'lower-bar-2-a',end:'lower-bar-1-b'},{name:'extreme',start:'lower-bar-4-b',end:'lower-bar-1-a'}]
for(const row of cases){const input=structuredClone(original);input.hairpins![0].startEventId=row.start;input.hairpins![0].endEventId=row.end
 for(const phase of ['source','repaired','deleted']){const score=structuredClone(input);if(phase==='repaired'){if(row.name==='extreme')continue;score.hairpins![0].endEventId='lower-bar-3-b'}if(phase==='deleted')delete score.hairpins
  const native=encodeNativeProject(createNativeProject(score));assert.deepEqual(decodeNativeProject(native).score,score,'Native accepts referenced same-owner chronological legacy data without silently repairing')
  writeFileSync(join(dir,row.name+'-'+phase+'.chromatics'),native)
  if(phase!=='source'){writeFileSync(join(dir,row.name+'-'+phase+'.musicxml'),serializeMusicXml(score));writeFileSync(join(dir,row.name+'-'+phase+'.mid'),serializeMidi(score))}
 }
 const options=spanEndpointOptions(input,{kind:'hairpin',id:'manual-dynamic-control'});writeFileSync(join(dir,row.name+'-owners.json'),JSON.stringify({options,reference:{kind:'hairpin',id:'manual-dynamic-control'},targetEndId:row.name==='extreme'?undefined:'lower-bar-3-b'},null,2))
}
console.log('PASS3same-owner legacy chronological native inputs preserved;2explicit repair and3delete valid output oracles;no legacy-invalid XML/PDF success assumed')
