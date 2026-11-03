import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { collectTiePairs, validateTieRelations } from '../score-core'
import { createWholeChordTieScore } from '../testing/chord-tie-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

// Same authored pitches through a written clef change; no partial-chord model.
describe.each([false,true])('whole tie across clef change, cross-system=%s',cross=>{
 it.each([false,true])('preserves single/chord=%s pitches, native clefs and MIDI through XML',chord=>{
  const score=createWholeChordTieScore(cross,chord),control=structuredClone(score)
  score.parts[0].staves[0].measures[1].clef={sign:'F',line:4}
  score.title='Tie across treble to bass clef'
  const before=structuredClone(score),native=createNativeProject(score),xml=serializeMusicXml(score),roundtrip=parseMusicXml(xml)
  expect(validateTieRelations(score)).toEqual([]);expect(collectTiePairs(score)).toHaveLength(1)
  expect(roundtrip.parts[0].staves[0].measures[1].clef).toEqual({sign:'F',line:4})
  expect(serializeMidi(score)).toEqual(serializeMidi(control));expect(serializeMidi(roundtrip)).toEqual(serializeMidi(score))
  expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native);expect(score).toEqual(before)
  const output=process.env.DDIRORI_CLEF_TIE_QA_DIR
  if(output){
   const dir=join(output,`${chord?'':'single-'}${cross?'cross':'same'}`);mkdirSync(dir,{recursive:true})
   writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(native));writeFileSync(join(dir,'expected.mid'),serializeMidi(score))
   writeFileSync(join(dir,'expected.musicxml'),xml)
   writeFileSync(join(dir,'contract.json'),JSON.stringify({systems:cross?2:1,tiePaths:(cross?2:1)*(chord?2:1),heads:chord?4:2},null,2))
  }
 })
})
