import {expect,it} from 'vitest'
import {parseCustomTimeSignature} from './custom-time-signature'
import {createNewScore} from './new-score'
import {buildTimeSignatureCommand} from './time-signature'
import {applyScoreCommand,validateMeasureRhythm} from '../../../score-core'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../../musicxml'
it.each([['0','4'],['129','4'],['3.5','4'],['','4'],['5','3'],['5','128'],['Infinity','4']])('rejects nonportable meter %s/%s', (n,d)=>expect(parseCustomTimeSignature(n,d)).toBeUndefined())
it.each([{beats:5,beatType:4},{beats:7,beatType:8},{beats:1,beatType:64},{beats:128,beatType:1}])('reuses existing command/undo/native/XML for $beats/$beatType',meter=>{
 const source=createNewScore({title:'Meter bounds',templateId:'duet',measureCount:2,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}})
 const measure=source.parts[0].staves[0].measures[0],parsed=parseCustomTimeSignature(String(meter.beats),String(meter.beatType))!
 const command=buildTimeSignatureCommand(source,{type:'measure',measureId:measure.id},parsed);expect(command).toBeDefined()
 const result=applyScoreCommand(source,command!),changed=result.score
 expect(validateMeasureRhythm(changed.parts[0].staves[0].measures[0]).isExact).toBe(true)
 expect(changed.parts[0].staves[0].measures[0].timeSignature).toEqual(meter);expect(changed.parts[1]).toEqual(source.parts[1])
 expect(applyScoreCommand(changed,result.undo).score).toEqual(source)
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(changed))).score).toEqual(changed)
 expect(parseMusicXml(serializeMusicXml(changed)).parts[0].staves[0].measures[0].timeSignature).toEqual(meter)
})
