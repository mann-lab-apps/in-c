// @vitest-environment jsdom
import {describe,expect,it} from 'vitest'
import {BarlineType,Stave} from 'vexflow'
import {createNote,createScore,TICKS_PER_QUARTER} from '../../../score-core'
import {createStaveNote} from './NotationPreview'
import {minimumTextScoreWidths} from './use-lyric-layout'
import {createSystemLayout,leadingNotationPadding} from './system-layout'
import {formatSharedRhythm} from './shared-rhythm-layout'
import {toVexFlowKeySignature} from './vexflow-adapter'

const fixture=()=>{
 const score=createScore(),part=score.parts[0],staff=part.staves[0],base=staff.measures[0]
 staff.measures=Array.from({length:6},(_,i)=>({...structuredClone(base),id:`bar-${i}`,number:i+1,voices:[{id:'voice-1',events:Array.from({length:4},(_,j)=>createNote({id:`note-${i}-${j}`,position:{tick:j*TICKS_PER_QUARTER},duration:{value:'quarter',dots:0},pitch:{step:'C',octave:4}}))}]}))
 const lower=structuredClone(part);lower.id='lower-part';lower.staves[0].id='lower-staff';for(const m of lower.staves[0].measures){m.id='lower-'+m.id;for(const e of m.voices[0].events)e.id='lower-'+e.id}score.parts.push(lower)
 return score
}

describe('repeat-start column width without text',()=>{
 it.each(['primary','secondary']as const)('keeps four quarter heads inside the %s-owned repeat column',owner=>{
  const score=fixture(),staff=score.parts[owner==='primary'?0:1].staves[0];staff.measures[0].repeat={start:true};staff.measures[3].repeat={end:true,times:2};const source=structuredClone(score)
  const widths=minimumTextScoreWidths(score,new Map()),first=score.parts[0].staves[0].measures[0]
  expect(widths.has(first.id)).toBe(true)
  const placement=createSystemLayout(score.parts[0].staves[0].measures,750,{minimumMeasureWidths:widths}).placements[0]
  const groups=score.parts.map((part,index)=>{
   const measure=part.staves[0].measures[0],stave=new Stave(placement.x,index*130,placement.width).setBegBarType(BarlineType.REPEAT_BEGIN).addClef('treble').addTimeSignature('4/4')
   stave.setNoteStartX(stave.getNoteStartX()+leadingNotationPadding(measure,{showsClef:true,showsKeySignature:true,showsTimeSignature:true}))
   return{stave,measure,voices:measure.voices.map(voice=>({events:voice.events,notes:voice.events.map(e=>createStaveNote(e,measure,voice,new Set<string>()))}))}
  })
  formatSharedRhythm(groups)
  for(const group of groups){const heads=group.voices[0].notes;expect(heads.at(-1)!.getNoteHeadEndX()).toBeLessThanOrEqual(group.stave.getNoteEndX());expect(heads[0].getNoteHeadBeginX()).toBeGreaterThan(group.stave.getX())}
  expect(score).toEqual(source)
 })
 it('leaves a text-free score without a repeat start on its existing width policy',()=>{
  expect(minimumTextScoreWidths(fixture(),new Map()).size).toBe(0)
 })
})

it.each(['primary','secondary']as const)('reserves a text-free changed key/meter header on the %s staff',owner=>{
 const score=fixture(),staff=score.parts[owner==='primary'?0:1].staves[0]
 for(const measure of staff.measures.slice(1)){measure.timeSignature={beats:3,beatType:4};measure.keySignature={fifths:4};measure.voices[0].events.pop()}
 const source=structuredClone(score),first=score.parts[0].staves[0].measures[1]
 const widths=minimumTextScoreWidths(score,new Map())
 expect(widths.has(first.id)).toBe(true)
 const placement=createSystemLayout(score.parts[0].staves[0].measures,750,{minimumMeasureWidths:widths}).placements[1]
 const groups=score.parts.map((part,index)=>{
  const measure=part.staves[0].measures[1],stave=new Stave(placement.x,index*130,placement.width).addClef('treble')
   .addKeySignature(toVexFlowKeySignature(measure.keySignature)).addTimeSignature(`${measure.timeSignature.beats}/4`)
  stave.setNoteStartX(stave.getNoteStartX()+leadingNotationPadding(measure,{showsClef:true,showsKeySignature:true,showsTimeSignature:true}))
  return{stave,measure,voices:measure.voices.map(voice=>({events:voice.events,notes:voice.events.map(e=>createStaveNote(e,measure,voice,new Set<string>()))}))}
 })
 formatSharedRhythm(groups)
 for(const group of groups)expect(group.voices[0].notes.at(-1)!.getNoteHeadEndX()).toBeLessThanOrEqual(group.stave.getNoteEndX())
 expect(score).toEqual(source)
})
