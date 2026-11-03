import {describe,expect,it} from 'vitest'
import {createScore,createNote,type Articulation} from '../score-core'
import {parseMusicXml,serializeMusicXml} from './index'
import {serializeMidi} from '../renderer/src/midi/serialize-midi'
const permutations=(items:Articulation[]):Articulation[][]=>items.length?items.flatMap((item,index)=>permutations(items.filter((_,i)=>i!==index)).map(rest=>[item,...rest])):[[]]
describe('supported articulation order preserves rendered stack and safe save',()=>{
 it.each(permutations(['staccato','accent','tenuto','marcato']).map(order=>[order.join(','),order] as const))('%s',(_name,order)=>{
  const score=createScore(),measure=score.parts[0].staves[0].measures[0]
  measure.voices[0].events=[createNote({id:'ordered-marks',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0},articulations:[...order]})]
  const before=structuredClone(score),xml=serializeMusicXml(score),roundtrip=parseMusicXml(xml),note=roundtrip.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(note.type).toBe('note');if(note.type!=='note')throw Error('Expected own note')
  expect(note.articulations).toEqual(order)
  expect(serializeMidi(roundtrip)).toEqual(serializeMidi(score));expect(score).toEqual(before)
 })
})
