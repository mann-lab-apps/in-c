import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand } from '../../../../../../src/score-core'
import { musicXmlSignatureConflictFixture } from '../../../../../../src/testing/musicxml-signature-conflict-fixture'
import { buildPitchStepCommand } from '../../../../../../src/renderer/src/editor/pitch-editing'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'

const dir='out/ddirori/continuous-374-expanded-source';mkdirSync(dir,{recursive:true})
for(const kind of ['system','mixed','broad']as const){
 const source=musicXmlSignatureConflictFixture(kind),command=buildPitchStepCommand(source,{type:'event',eventId:'signature-note',address:{partId:'signature-primary',staffId:'signature-primary-staff',measureId:'signature-primary-measure',voiceId:'voice-1'}},'D')!,result=applyScoreCommand(source,command)
 assert.deepEqual(applyScoreCommand(result.score,result.undo).score,source)
 for(const[phase,score]of [['source',source],['edited',result.score]]as const){
  const xml=serializeMusicXml(score),parsed=parseMusicXml(xml)
  assert.notDeepEqual(parsed.systemTexts,score.systemTexts)
  if(kind==='broad'){assert.notDeepEqual(serializeMidi(parsed),serializeMidi(score));assert(!parsed.tempoEvents?.length)}else assert.deepEqual(serializeMidi(parsed),serializeMidi(score))
  assert.deepEqual(score.systemTexts,source.systemTexts)
  assert.deepEqual(score.parts[1],source.parts[1])
  writeFileSync(`${dir}/${kind}-${phase}.chromatics`,encodeNativeProject(createNativeProject(score)))
  writeFileSync(`${dir}/${kind}-${phase}.musicxml`,xml);writeFileSync(`${dir}/${kind}-${phase}.mid`,serializeMidi(score))
 }
 writeFileSync(`${dir}/${kind}-meta.json`,JSON.stringify({kind,eventId:'signature-note',diagnostic:kind==='broad'?'(title, composer, 위치별 빠르기(tempoEvents), systemTexts)':kind==='mixed'?'(title, composer, systemTexts)':'(systemTexts)',labels:kind==='broad'?['제목','작곡가','위치별 빠르기 외 1개 항목']:kind==='mixed'?['제목','작곡가','시스템 텍스트']:['시스템 텍스트']},null,2))
}
writeFileSync(`${dir}/source.chromatics`,readFileSync(`${dir}/system-source.chromatics`));console.log('PASS3existing-native/unsupportedXML-owner fixtures;native MIDI controls distinguish metadata/text loss from off-primary tempo loss;one-pitch-command undo')
