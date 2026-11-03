import { describe, expect, it } from 'vitest'
import { secondaryRepeatFixture } from '../../../testing/secondary-repeat-fixture'
import { resolveRepeatEditScope } from './repeat-scope'

describe('performed repeat edit scope', () => {
  it('resolves another part to the existing performed source without mutating native owners', () => {
    const {score} = secondaryRepeatFixture('lower','volta'), before=structuredClone(score)
    const scope=resolveRepeatEditScope(score,'other-bar-2')!
    expect(scope.location.address).toMatchObject({staffId:'lower-staff',measureId:'lower-bar-2'})
    expect(scope.location.measure.volta?.number).toBe(1)
    expect(scope.label).toBe('총보 공통 반복 · Piano · 보표 2 · 2마디')
    expect(score).toEqual(before)
  })
  it.each(['none','unaligned'] as const)('retains local scope for %s source',kind=>{
    const {score}=secondaryRepeatFixture('lower','repeat')
    if(kind==='none')for(const p of score.parts)for(const s of p.staves)for(const m of s.measures)m.repeat=undefined
    else score.parts[0].staves[1].measures[0].timeSignature={beats:3,beatType:4}
    const scope=resolveRepeatEditScope(score,'other-bar-2')!
    expect(scope.shared).toBe(false);expect(scope.location.measure.id).toBe('other-bar-2')
    expect(scope.label).toBe('선택 보표 반복 · Violin · 보표 1 · 2마디')
  })
  it('disambiguates duplicate names without rewriting authored names',()=>{
    const {score}=secondaryRepeatFixture('lower','repeat');score.parts[1].name='Piano'
    expect(resolveRepeatEditScope(score,'other-bar-2')?.label).toBe('총보 공통 반복 · 1 · Piano · 보표 2 · 2마디')
    expect(score.parts.map(p=>p.name)).toEqual(['Piano','Piano'])
  })
  it.each(['requested','source'] as const)('rejects an ambiguous %s measure identity',kind=>{
    const {score}=secondaryRepeatFixture('lower','repeat')
    score.parts[0].staves[0].measures[0].id=kind==='requested'?'other-bar-2':'lower-bar-2'
    expect(resolveRepeatEditScope(score,'other-bar-2')).toBeUndefined()
  })
  it('rejects missing identities',()=>{expect(resolveRepeatEditScope(secondaryRepeatFixture('lower','repeat').score,'absent')).toBeUndefined()})
})
