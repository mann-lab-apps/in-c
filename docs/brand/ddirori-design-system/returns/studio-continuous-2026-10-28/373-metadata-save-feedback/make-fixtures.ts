import { mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createNativeProject,decodeNativeProject,encodeNativeProject } from '../../../../../../src/project/schema'
import { applyScoreCommand } from '../../../../../../src/score-core'
import { buildKeySignatureCommand } from '../../../../../../src/renderer/src/editor/key-signature'
import { serializeMidi } from '../../../../../../src/renderer/src/midi/serialize-midi'
import { serializeMusicXml,parseMusicXml } from '../../../../../../src/musicxml'

const dir='out/ddirori/continuous-373-source';mkdirSync(dir,{recursive:true})
const source=decodeNativeProject(readFileSync('out/ddirori/continuous-371-high-source/lower-d-same-source.chromatics','utf8')).score
source.title='Generated measure dynamics consistency · 이전 제목  '
source.composer='작곡가 원본  '
const selection={type:'event'as const,eventId:'lower-bar-2-chord',address:{partId:'boundary-part',staffId:'boundary-lower',measureId:'lower-bar-2',voiceId:'voice-1'}}
const keyResult=applyScoreCommand(source,buildKeySignatureCommand(source,selection,{fifths:2,mode:'major'})!),keyEdited=keyResult.score
const titleResult=applyScoreCommand(keyEdited,{type:'score-metadata.update',title:source.title.trim(),composer:source.composer}),titleEdited=titleResult.score
const composerResult=applyScoreCommand(titleEdited,{type:'score-metadata.update',title:titleEdited.title,composer:source.composer.trim()}),normalized=composerResult.score
assert.deepEqual(applyScoreCommand(normalized,composerResult.undo).score,titleEdited)
assert.deepEqual(applyScoreCommand(titleEdited,titleResult.undo).score,keyEdited)
assert.deepEqual(applyScoreCommand(keyEdited,keyResult.undo).score,source)
const midi=serializeMidi(source)
for(const[name,score]of [['source',source],['key-edited',keyEdited],['title-edited',titleEdited],['normalized',normalized]]as const){
 assert.deepEqual(serializeMidi(score),midi)
 const xml=serializeMusicXml(score),parsed=parseMusicXml(xml);assert.deepEqual(serializeMidi(parsed),midi)
 if(name==='normalized'){assert.equal(parsed.title,score.title);assert.equal(parsed.composer,score.composer)}
 else assert(parsed.title!==score.title||parsed.composer!==score.composer)
 writeFileSync(`${dir}/${name}.chromatics`,encodeNativeProject(createNativeProject(score)))
 writeFileSync(`${dir}/${name}.musicxml`,xml);writeFileSync(`${dir}/${name}.mid`,midi)
}
writeFileSync(`${dir}/meta.json`,JSON.stringify({eventId:selection.eventId,label:'라장조 (♯ 2개)',rawTitle:source.title,rawComposer:source.composer,title:normalized.title,composer:normalized.composer},null,2))
console.log('PASSraw metadata guard controls and three real-command/inverse states;native/MIDI preservation;normalizedXMLrecovery')
