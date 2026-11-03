import { expect, it } from 'vitest'
import { protectedInkBlocksSlurSide } from './protected-slur-ink'

const bow = { x: 50, y: 100, width: 120, height: 20 }
const distant = { startStaff: 1, endStaff: 1, bounds: [{ x: 50, y: 300, width: 120, height: 40 }] }
it('allows a measured distant foreign manual span without rewriting its bounds', () => {
  const before = structuredClone(distant)
  expect(protectedInkBlocksSlurSide(0, [bow], [distant])).toBe(false)
  expect(distant).toEqual(before)
})
it('blocks a foreign span whose actual painted bounds enter the candidate clearance', () => {
  for (const y of [100, 120, 127.99]) expect(protectedInkBlocksSlurSide(0, [bow], [
    { ...distant, bounds: [{ ...distant.bounds[0], y }] }
  ])).toBe(true)
  expect(protectedInkBlocksSlurSide(0, [bow], [{ ...distant, bounds: [{ ...bow, y: 128 }] }])).toBe(false)
})
it('preserves conservative protection for same-staff and cross-staff manual spans', () => {
  expect(protectedInkBlocksSlurSide(1, [bow], [distant])).toBe(true)
  expect(protectedInkBlocksSlurSide(0, [bow], [{ ...distant, endStaff: 2 }])).toBe(true)
})
it('blocks missing, invalid or incomplete measurement instead of guessing noninterference', () => {
  for (const bounds of [[], [undefined], [{ ...bow, width: 0 }], [{ ...bow, y: NaN }]]) {
    expect(protectedInkBlocksSlurSide(0, [bow], [{ ...distant, bounds }])).toBe(true)
    expect(protectedInkBlocksSlurSide(0, bounds, [distant])).toBe(true)
  }
  expect(protectedInkBlocksSlurSide(undefined, [bow], [distant])).toBe(true)
  expect(protectedInkBlocksSlurSide(0, [bow], [{ ...distant, startStaff: undefined }])).toBe(true)
  expect(protectedInkBlocksSlurSide(undefined, [], [])).toBe(false)
})

it('allows distant same-staff ink only when its complete system range is separate', () => {
  for (const [candidateSystem, startSystem, endSystem] of [[0, 1, 1], [2, 0, 1]]) {
    const obstacle = { ...distant, startSystem, endSystem }
    const before = structuredClone(obstacle)
    expect(protectedInkBlocksSlurSide(1, [bow], [obstacle], candidateSystem)).toBe(false)
    expect(obstacle).toEqual(before)
  }
})

it('keeps same-system, spanning-system and unknown-system manual protection', () => {
  for (const range of [{ startSystem: 1, endSystem: 1 }, { startSystem: 0, endSystem: 2 },
    { startSystem: undefined, endSystem: 2 }, { startSystem: 2, endSystem: 1 },
    { startSystem: 1, endSystem: NaN }]) {
    expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, ...range }], 1)).toBe(true)
  }
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, startSystem: 2, endSystem: 2 }])).toBe(true)
})

it('protects actual interference and incomplete ink even across separate systems', () => {
  const obstacle = { ...distant, startSystem: 1, endSystem: 1 }
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...obstacle, bounds: [bow] }], 0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...obstacle, bounds: [undefined] }], 0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...obstacle, endStaff: 2 }], 0)).toBe(true)
})

it('allows explicitly scoped text beyond the same-system horizontal lane', () => {
  for (const bounds of [{ x: 178, y: 100, width: 20, height: 20 }, { x: 20, y: 100, width: 22, height: 20 }]) {
    expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, startSystem: 0, endSystem: 0, bounds: [bounds], horizontalTextLane: true }], 0)).toBe(false)
  }
})

it('keeps overlapping text lanes protected even when their glyphs are vertically clear', () => {
  for (const bounds of [{ x: 177.99, y: 300, width: 20, height: 20 }, { x: 20, y: 300, width: 22.01, height: 20 }]) {
    expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, startSystem: 0, endSystem: 0, bounds: [bounds], horizontalTextLane: true }], 0)).toBe(true)
  }
})

it('does not relax authored/lyric lanes or incomplete measurements as horizontal text', () => {
  const bounds = { x: 400, y: 300, width: 20, height: 20 }
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, bounds: [bounds] }], 0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, bounds: [undefined], horizontalTextLane: true }], 0)).toBe(true)
  expect(protectedInkBlocksSlurSide(undefined, [bow], [{ ...distant, bounds: [bounds], horizontalTextLane: true }], 0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1, [bow], [{ ...distant, bounds: [bounds], horizontalTextLane: true }], 0)).toBe(true)
})


it('allows a measured, strictly contained authored inner slur without releasing other manual lanes',()=>{
  const inner={...distant,startSystem:0,endSystem:0,scopedManualSlur:true}
  expect(protectedInkBlocksSlurSide(1,[bow],[inner],0)).toBe(false)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,bounds:[{...bow,y:127.99}]}],0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,scopedManualSlur:false}],0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,endSystem:1}],0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,startSystem:undefined}],0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,endStaff:2}],0)).toBe(true)
  expect(protectedInkBlocksSlurSide(1,[bow],[{...inner,bounds:[undefined]}],0)).toBe(true)
})


it('scopes measured single-system manual spans to their actual horizontal lane',()=>{
 const manual={...distant,startSystem:0,endSystem:0,manualSpan:true}
 for(const bounds of [{x:178,y:100,width:20,height:20},{x:20,y:100,width:22,height:20}])
  expect(protectedInkBlocksSlurSide(1,[bow],[{...manual,bounds:[bounds]}],0)).toBe(false)
 for(const changed of [{bounds:[{x:177.99,y:300,width:20,height:20}]},{manualSpan:false},
   {endSystem:1},{startSystem:undefined},{endStaff:2},{bounds:[undefined]}])
  expect(protectedInkBlocksSlurSide(1,[bow],[{...manual,bounds:[{x:178,y:100,width:20,height:20}],...changed}],0)).toBe(true)
})
