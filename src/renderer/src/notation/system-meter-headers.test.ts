import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { createNote, createScore, TICKS_PER_QUARTER } from '../../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../../musicxml'
import { serializeMidi } from '../midi/serialize-midi'

it.each(['stable','changed','labels','empty-labels','ensemble-labels'])('preserves the generated %s two-staff meter and manual system breaks through native/XML/MIDI', kind => {
  const score=createScore({title:'Generated system meter '+kind}),upper=score.parts[0].staves[0],base=upper.measures[0]
  upper.measures=Array.from({length:6},(_,index)=>{
    const beats=kind==='changed'&&index>=2&&index<5?3:4
    return {...structuredClone(base),id:`meter-${index+1}`,number:index+1,timeSignature:{beats,beatType:4 as const},voices:[{id:'voice-1',events:Array.from({length:beats},(_,i)=>createNote({id:`upper-${index}-${i}`,position:{tick:i*TICKS_PER_QUARTER},duration:{value:'quarter',dots:0},pitch:{step:'C',octave:5}}))}]}
  })
  const lower=structuredClone(upper);lower.id='meter-lower'
  lower.measures.forEach((m,index)=>{m.id=`meter-lower-${index+1}`;m.clef={sign:'F',line:4};m.voices[0].events.forEach((e,i)=>{e.id=`lower-${index}-${i}`;if(e.type==='note')e.pitch.octave=3})})
  score.parts[0].staves.push(lower)
  if(kind==='labels'||kind==='empty-labels'){
    score.parts[0].name='Generated grand piano'
    score.parts[0].abbreviation=kind==='labels'?'Pno.':undefined
  }else if(kind==='ensemble-labels'){
    score.parts[0].name='Generated melody';score.parts[0].abbreviation='Mel.';score.parts[0].staves=[upper]
    score.parts.push({id:'generated-bass',name:'Generated bass',abbreviation:'Bs.',staves:[lower]})
  }
  score.layout={systemBreakBeforeMeasureIds:[upper.measures[2].id,upper.measures[4].id]}
  const before=structuredClone(score),native=encodeNativeProject(createNativeProject(score)),xml=serializeMusicXml(score),midi=serializeMidi(score)
  expect(decodeNativeProject(native).score).toEqual(score)
  const parsed=parseMusicXml(xml)
  expect(parsed.parts.map(p=>[p.name,p.abbreviation,p.staves.map(s=>s.measures.map(m=>m.timeSignature))])).toEqual(score.parts.map(p=>[p.name,p.abbreviation,p.staves.map(s=>s.measures.map(m=>m.timeSignature))]))
  expect(serializeMidi(parsed)).toEqual(midi);expect(score).toEqual(before)
  const out=process.env.DDIRORI_SYSTEM_METER_QA_DIR
  if(out){const dir=join(out,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),native);writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'source.mid'),midi)}
})
