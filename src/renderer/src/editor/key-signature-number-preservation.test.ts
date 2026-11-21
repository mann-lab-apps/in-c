import {expect,it} from 'vitest'
import {applyScoreCommand,createDuration,createNote,type Score} from '../../../score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../../musicxml'
import {serializeMidi} from '../midi/serialize-midi'
import {createNewScore} from './new-score'
import {buildKeySignatureCommand} from './key-signature'

it.each([[11,12,13],[10,30,70],[30,20,10]])('preserves valid numbers %j, pitches, other parts and exact undo on a key edit',(...numbers)=>{
  const source=createNewScore({title:'조표와 원본 번호',templateId:'duet',measureCount:3,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}})
  for(const part of source.parts)for(const staff of part.staves){
    staff.measures.forEach((bar,index)=>{bar.number=numbers[index]})
    const bar=staff.measures[2];bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,pitch:{step:'D',octave:4},duration:createDuration('whole')})]
  }
  const staff=source.parts[0].staves[0],bar=staff.measures[1],before=structuredClone(source),expected:Score=structuredClone(source)
  expected.parts[0].staves[0].measures.slice(1).forEach(bar=>{bar.keySignature={fifths:1,mode:'major'}})
  const command=buildKeySignatureCommand(source,{type:'measure',measureId:bar.id},{fifths:1,mode:'major'})!
  const changed=applyScoreCommand(source,command)
  expect(changed.score.parts[0].staves[0].measures.map(bar=>bar.number)).toEqual(numbers)
  expect(changed.score).toEqual(expected);expect(source).toEqual(before)
  expect(applyScoreCommand(changed.score,changed.undo).score).toEqual(source)
  expect(applyScoreCommand(applyScoreCommand(changed.score,changed.undo).score,command).score).toEqual(expected)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(changed.score))).score).toEqual(expected)
  const reopened=parseMusicXml(serializeMusicXml(changed.score))
  expect(reopened.parts.map(part=>part.staves[0].measures.map(bar=>bar.number))).toEqual([numbers,numbers])
  expect(serializeMidi(changed.score)).toEqual(serializeMidi(source));expect(serializeMidi(reopened)).toEqual(serializeMidi(source))
})

it('keeps a number-based global tempo address valid through key edit, undo and native validation',()=>{
  const score=createNewScore({title:'조표와 빠르기 주소',templateId:'solo-melody',measureCount:3,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}})
  const bars=score.parts[0].staves[0].measures;bars.forEach((bar,index)=>{bar.number=[10,30,70][index]})
  score.tempoEvents=[{id:'kept-tempo',measureId:'measure-30',tick:0,bpm:80}]
  const original=createNativeProject(score)
  const result=applyScoreCommand(score,buildKeySignatureCommand(score,{type:'measure',measureId:bars[1].id},{fifths:1,mode:'major'})!)
  expect(()=>createNativeProject(result.score)).not.toThrow()
  expect(result.score.tempoEvents).toEqual(score.tempoEvents)
  expect(serializeMidi(result.score)).toEqual(serializeMidi(score))
  expect(applyScoreCommand(result.score,result.undo).score).toEqual(original.score)
})
