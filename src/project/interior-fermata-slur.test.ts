import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateTieRelations } from '../score-core'
import { createWholeChordTieScore } from '../testing/chord-tie-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from './schema'
import { parseMusicXml, serializeMusicXml } from '../musicxml'
import { serializeMidi } from '../renderer/src/midi/serialize-midi'

describe.each([false,true])('interior fermata under long slur manual=%s',manual=>{
 describe.each([false,true])('cross-system=%s',cross=>{
  it.each([false,true])('preserves single/chord=%s ties, native geometry and XML/MIDI',chord=>{
   const score=createWholeChordTieScore(cross,chord),measures=score.parts[0].staves[0].measures,third=structuredClone(measures[1])
   third.id='chord-tie-measure-3';third.number=3;third.voices[0].events[0].id='chord-tie-3';const thirdNote=third.voices[0].events[0];if(thirdNote.type!=='note')throw Error('Owned third note');delete thirdNote.ties;measures.push(third)
   for(const [index,measure] of measures.entries()){
    const note=measure.voices[0].events[0];if(note.type!=='note')throw Error('Owned fixture note')
    note.pitch={step:'C',octave:7,alter:0};if(chord)note.pitches=[note.pitch,{step:'E',octave:7,alter:0}]
    if(index===1)note.fermata=true
   }
   score.title='Interior fermata under long slur'
   score.slurs=[{id:'owned-long-slur',startEventId:'chord-tie-1',endEventId:'chord-tie-3',...(manual?{engraving:{offsetY:0}}:{})}]
   const before=structuredClone(score),native=createNativeProject(score)
   expect(validateTieRelations(score)).toEqual([]);expect(decodeNativeProject(encodeNativeProject(native))).toEqual(native)
   expect(serializeMidi(parseMusicXml(serializeMusicXml(score)))).toEqual(serializeMidi(score));expect(score).toEqual(before)
   const output=process.env.DDIRORI_INTERIOR_FERMATA_QA_DIR
   if(output){const dir=join(output,manual?'manual':'auto',`${chord?'':'single-'}${cross?'cross':'same'}`);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(native));writeFileSync(join(dir,'expected.mid'),serializeMidi(score));writeFileSync(join(dir,'contract.json'),JSON.stringify({systems:cross?2:1,tiePaths:(cross?2:1)*(chord?2:1),heads:chord?6:3,xmlStart:chord?2:1,xmlStop:chord?2:1,slurPaths:cross?2:1},null,2))}
  })
 })
})
