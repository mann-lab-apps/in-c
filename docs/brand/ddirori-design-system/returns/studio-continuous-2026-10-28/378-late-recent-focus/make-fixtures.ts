import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createImportWarningFixture} from './src/testing/import-warning-fixture'
import {parseMusicXmlWithReport,serializeMusicXml} from './src/musicxml'
import {buildTieCommand,applyScoreCommand} from './src/score-core'
import {createNativeProject,encodeNativeProject} from './src/project/schema'
import {serializeMidi} from './src/renderer/src/midi/serialize-midi'
const out=path.resolve('out/ddirori/continuous-378-source/many');assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true})
const {xml}=createImportWarningFixture('many'),{score,report}=parseMusicXmlWithReport(xml),before=structuredClone(score)
assert.equal(report.warnings.length,16)
const event=score.parts[0].staves[0].measures[0].voices[0].events[0],command=buildTieCommand(score,event.id,false);assert(command)
const result=applyScoreCommand(score,command),edited=result.score
assert.deepEqual(score,before);assert.deepEqual(applyScoreCommand(edited,result.undo).score,score)
assert.equal(edited.parts[0].staves[0].measures.filter(m=>m.voices[0].events[0].type==='note'&&m.voices[0].events[0].ties?.start).length,3)
fs.writeFileSync(path.join(out,'source.musicxml'),xml);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))
for(const [name,value] of [['source',score],['edited',edited]] as const){fs.writeFileSync(path.join(out,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));fs.writeFileSync(path.join(out,name+'.mid'),serializeMidi(value));fs.writeFileSync(path.join(out,name+'-converted.musicxml'),serializeMusicXml(value))}
fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify({eventId:event.id,sourceTiePaths:8,editedTiePaths:6,command},null,2))
console.log('PASS16-warning source;one first-chord tie removal;exact inverse/native/XML/MIDI oracles')
