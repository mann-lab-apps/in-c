import { expect, it } from 'vitest'
import { secondaryRepeatFixture } from '../../../testing/secondary-repeat-fixture'
import { createSharedRepeatBarlines } from './repeat-barlines'

it.each(['primary','lower','other'] as const)('shows the performed %s source on every concrete staff without moving native owners',owner=>{
 const {score,staff}=secondaryRepeatFixture(owner,'repeat');staff.measures[1].repeat={end:true,times:3};const before=structuredClone(score),display=createSharedRepeatBarlines(score)!
 expect(display.size).toBe(12)
 for(const part of score.parts)for(const staff of part.staves){expect(display.get(staff.measures[0].id)).toEqual({start:true});expect(display.get(staff.measures[1].id)).toEqual({end:true,times:3});expect(display.has(staff.measures[2].id)).toBe(true);expect(display.get(staff.measures[2].id)).toBeUndefined()}
 expect(score).toEqual(before)
})
it.each(['none','unaligned'] as const)('keeps local drawing for %s source',kind=>{
 const {score}=secondaryRepeatFixture('lower','repeat')
 if(kind==='none')for(const part of score.parts)for(const staff of part.staves)for(const m of staff.measures)m.repeat=undefined
 else score.parts[0].staves[1].measures[0].timeSignature={beats:3,beatType:4}
 const before=structuredClone(score);expect(createSharedRepeatBarlines(score)).toBeUndefined();expect(score).toEqual(before)
})
it('retains conflicting native staff markings instead of silently hiding them',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[0].measures[0].repeat={start:true};const before=structuredClone(score);expect(createSharedRepeatBarlines(score)).toBeUndefined();expect(score).toEqual(before)
})
it('allows identical marked siblings and keeps the projection complete',()=>{
 const {score,staff}=secondaryRepeatFixture('lower','volta');for(const [i,m]of score.parts[0].staves[0].measures.entries()){m.repeat=staff.measures[i].repeat;m.volta=staff.measures[i].volta}
 const before=structuredClone(score);expect(createSharedRepeatBarlines(score)?.size).toBe(12);expect(score).toEqual(before)
})
it('rejects ambiguous concrete measure IDs rather than projecting one ordinal onto another',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat');score.parts[1].staves[0].measures[2].id='primary-bar-1';expect(createSharedRepeatBarlines(score)).toBeUndefined()
})
