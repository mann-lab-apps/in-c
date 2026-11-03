import { expect, it } from 'vitest'
import { createMeasure, createVoice, createNote } from '../../../score-core'
import { createSystemLayout } from './system-layout'
import { resolveSystemMusicMinimum, type SystemMusicFrame } from './system-music-envelope'
import type { SystemInk } from './system-ink-spacing'
const ink=(systemIndex:number,y:number,height:number):SystemInk=>({x:70,y,width:300,height,systemIndex})
const frame=(y:number,reservedHeight:number,pitchBelow=0):SystemMusicFrame=>({y,reservedHeight,pitchBelow})

it('reserves the measured last-staff note bottom plus8 without editing its ink',()=>{
 const note=ink(0,483.29,10),frames=new Map([[0,frame(72,419.29)]]),before=structuredClone(note)
 const minimum=resolveSystemMusicMinimum([note],frames,0)
 expect(minimum).toBeGreaterThanOrEqual(429.29);expect(minimum).toBeLessThanOrEqual(429.3)
 expect(72+minimum-note.y-note.height).toBeGreaterThanOrEqual(8)
 expect(resolveSystemMusicMinimum([note],new Map([[0,frame(72,minimum)]]),minimum)).toBe(minimum)
 expect(note).toEqual(before)
})
it('uses the largest actual label/line/hook footprint acrosssystems independent of absolute origin',()=>{
 const pieces=[ink(0,501.01,13.64),ink(1,910.59,11)],frames=new Map([[0,frame(72,419.29)],[1,frame(491.29,419.29)]])
 const minimum=resolveSystemMusicMinimum(pieces,frames,0)
 expect(minimum).toBeGreaterThanOrEqual(450.65);expect(minimum).toBeLessThanOrEqual(450.66)
 expect(resolveSystemMusicMinimum([...pieces].reverse(),frames,0)).toBe(minimum)
 expect(resolveSystemMusicMinimum(pieces.map(b=>({...b,y:b.y+1000})),new Map([...frames].map(([i,f])=>[i,{...f,y:f.y+1000}])),0)).toBeCloseTo(minimum,2)
})
it('retains the existing single-staff primary pitch reserve instead of adding it twice',()=>{
 const frames=new Map([[0,frame(72,247,93)]])
 expect(resolveSystemMusicMinimum([ink(0,262,10),ink(0,280.016,13.344)],frames,0)).toBe(0)
})
it('accounts for pitch space when expanding a budget currently dominated by lyrics',()=>{
 const minimum=resolveSystemMusicMinimum([ink(0,310,10)],new Map([[0,frame(0,300,20)]]),0)
 expect(minimum).toBe(308)
 expect(minimum+20-320).toBe(8)
})
it('does not shrink an already applied minimum or invent envelopes from absent/invalid metrics',()=>{
 const frames=new Map([[0,frame(0,510)]])
 expect(resolveSystemMusicMinimum([ink(0,100,10)],frames,500)).toBe(500)
 for(const b of [ink(1,600,10),{...ink(0,600,10),width:0},{...ink(0,600,10),y:NaN},{...ink(0,600,10),systemIndex:.5}])expect(resolveSystemMusicMinimum([b],frames,0)).toBe(0)
 expect(resolveSystemMusicMinimum([],frames,0)).toBe(0)
 expect(resolveSystemMusicMinimum([ink(0,600,10)],new Map([[0,frame(0,NaN)]]),0)).toBe(0)
})

it('feeds measured lower ink into page packing after a real long-title inset instead of only extending SVG',()=>{
 const measures=Array.from({length:4},(_,i)=>createMeasure({id:`music-page-${i}`,voices:[createVoice({events:[createNote({id:`note-${i}`,pitch:{step:'B',octave:4}})]})]}))
 const before=structuredClone(measures),options={firstSystemOffset:168.07,pageHeight:1086,layout:{systemBreakBeforeMeasureIds:measures.slice(1).map(m=>m.id)}}
 const oldBudget=createSystemLayout(measures,750,{...options,systemHeight:419.29})
 expect(oldBudget.placements[1].y).toBeCloseTo(659.36,2)
 // Actual360 lower footprint:old packing accepts this system although ink exceeds the page.
 expect(oldBudget.placements[1].y+442.65).toBeGreaterThan(1086)
 const first=oldBudget.placements[0].y
 const minimum=resolveSystemMusicMinimum([ink(0,first+429.01,13.64)],new Map([[0,frame(first,419.29)]]),0)
 const current=createSystemLayout(measures,750,{...options,systemHeight:minimum})
 expect(current.placements[1].y).toBe(1158)
 for(const p of current.placements)expect(p.y%1086+442.65).toBeLessThanOrEqual(1086)
 expect(current.placements.map(p=>[p.x,p.width,p.systemIndex])).toEqual(oldBudget.placements.map(p=>[p.x,p.width,p.systemIndex]))
 expect(measures).toEqual(before)
})
