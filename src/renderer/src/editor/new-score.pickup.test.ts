import {expect,it} from 'vitest'
import {createNewScore,type NewScoreOptions} from './new-score'
import {measureDurationTicks,timeSignatureDurationTicks,TICKS_PER_QUARTER,validateMeasureRhythm} from '../../../score-core'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../../musicxml'
const options:NewScoreOptions={title:'Pickup',keySignature:{fifths:0},timeSignature:{beats:4,beatType:4},measureCount:3}
it.each(['solo-melody','piano-grand-staff','string-quartet'] as const)('creates one eighth pickup in every staff of %s and preserves native/XML timing',templateId=>{
 const score=createNewScore({...options,templateId,pickupDurationTicks:TICKS_PER_QUARTER/2})
 for(const staff of score.parts.flatMap(p=>p.staves)){
  expect(staff.measures).toHaveLength(3)
  expect(staff.measures[0].timing).toEqual({type:'pickup',durationTicks:TICKS_PER_QUARTER/2})
  expect(measureDurationTicks(staff.measures[0])).toBe(TICKS_PER_QUARTER/2)
  expect(staff.measures.slice(1).map(m=>m.timing)).toEqual([{type:'regular'},{type:'regular'}])
  expect(staff.measures.every(m=>validateMeasureRhythm(m).isExact)).toBe(true)
 }
 expect(decodeNativeProject(encodeNativeProject(createNativeProject(score))).score).toEqual(score)
 const xml=serializeMusicXml(score);expect(xml).toContain('implicit="yes"')
 const reopened=parseMusicXml(xml)
 expect(reopened.parts.flatMap(p=>p.staves).map(s=>s.measures.map(measureDurationTicks))).toEqual(score.parts.flatMap(p=>p.staves).map(s=>s.measures.map(measureDurationTicks)))
})
it.each([0,-1,.5,NaN,Infinity,TICKS_PER_QUARTER*4,TICKS_PER_QUARTER*5])('rejects invalid/non-short pickup %s without clamping',pickupDurationTicks=>{
 expect(()=>createNewScore({...options,pickupDurationTicks})).toThrow(/못갖춘|pickup/i)
})
it('leaves normal creation unchanged when no pickup is requested',()=>{
 const s=createNewScore(options);expect(s.parts[0].staves[0].measures.every(m=>m.timing.type==='regular'&&measureDurationTicks(m)===timeSignatureDurationTicks(options.timeSignature))).toBe(true)
})
