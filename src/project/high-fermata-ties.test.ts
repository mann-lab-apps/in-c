import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateTieRelations } from '../score-core'
import { createWholeChordTieScore } from '../testing/chord-tie-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe.each([6,7])('high-register fermata octave=%s',octave=>{
describe.each([false,true])('whole-event tie cross=%s',cross=>{
 it.each([false,true])('preserves single/chord=%s native/XML and performed duration',chord=>{
  const score=createWholeChordTieScore(cross,chord)
  score.title='High-register fermata and tie'
  for(const measure of score.parts[0].staves[0].measures){
   const note=measure.voices[0].events[0];if(note.type!=='note')throw Error('Owned note fixture')
   note.pitch={step:'C',octave,alter:0};if(chord)note.pitches=[note.pitch,{step:'E',octave,alter:0}]
   note.fermata=true
  }
  const before=structuredClone(score),native=createNativeProject(score),xml=serializeMusicXml(score)
  expect(validateTieRelations(score)).toEqual([])
  expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native);expect(score).toEqual(before)
  const output=process.env.DDIRORI_HIGH_FERMATA_QA_DIR
  if(output){const dir=join(output,octave===7?'ledger':'normal',`${chord?'':'single-'}${cross?'cross':'same'}`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(native));writeFileSync(join(dir,'expected.mid'),serializeMidi(score));writeFileSync(join(dir,'contract.json'),JSON.stringify({systems:cross?2:1,tiePaths:(cross?2:1)*(chord?2:1),heads:chord?4:2},null,2))}
 })
})

})
