import { expect, it } from 'vitest'
import { resolveHairpinInkMinimums, type AutomaticHairpinInk } from './hairpin-ink-spacing'
import { createStemExpressionHairpinFixture } from '../../../testing/stem-expression-hairpin-fixture'
import { resolveMeasureAnnotationLanes } from './annotation-lanes'
import { reserveInteriorHairpinLanes } from './hairpin-annotation-lanes'

const span: AutomaticHairpinInk = { id: 'long', x: 118.74, y: 239.1, width: 309.94, height: 21.8, staffIndex: 0, systemIndex: 0, offsetY: 178, plannedOffsetY: 126 }
const head = { x: 212.14, y: 227, width: 12, height: 10, staffIndex: 0, systemIndex: 0 }
const stem = { x: 222.52, y: 131.25, width: 1.5, height: 101.5, staffIndex: 0, systemIndex: 0 }

it('uses actual head/stem ink and full wedge stroke rather than stem centerline only', () => {
  const existing = new Map<string,number>()
  expect([...resolveHairpinInkMinimums([head,stem],[span],existing)]).toEqual([['long',183.91]])
  expect(existing.size).toBe(0)
})
it('also feeds a clear stem-derived final offset back into the expression plan', () => {
  expect([...resolveHairpinInkMinimums([],[span],new Map())]).toEqual([['long',178]])
})
it('keeps settled offsets stable and excludes other owners and nonoverlapping music', () => {
  const existing = new Map([['long',183.91]]), moved = { ...span, y: 245.01, offsetY: 183.91, plannedOffsetY: 183.91 }
  expect(resolveHairpinInkMinimums([head,stem],[moved],existing)).toBe(existing)
  const planned = { ...span, plannedOffsetY: span.offsetY }
  const unrelated = [{...head,staffIndex:1},{...head,systemIndex:1},{...head,x:1000},{...head,height:0}]
  expect(resolveHairpinInkMinimums(unrelated,[planned],existing)).toBe(existing)
})
it('aggregates crossed systems by span without overwriting existing minima or source order', () => {
  const other = {...span,systemIndex:1,id:'other'}, music=[head,{...head,systemIndex:1,y:240}], existing=new Map([['retained',200]])
  const result=resolveHairpinInkMinimums(music,[span,other],existing)
  expect(result.get('retained')).toBe(200);expect(result.get('long')).toBe(183.91);expect(result.get('other')).toBe(196.91)
  expect(existing).toEqual(new Map([['retained',200]]))
})
it('reserves measured minimums before expression baselines and system extent are calculated', () => {
  const {score}=createStemExpressionHairpinFixture(false,false),measures=score.parts[0].staves[0].measures
  const lanes=new Map(measures.map((m,i)=>[m.id,resolveMeasureAnnotationLanes({hasHairpin:true,expressionTextCount:i===1?1:0})]))
  const result=reserveInteriorHairpinLanes(score,lanes,()=>({y:-17,height:21}),new Map([[score.hairpins![0].id,183.91]]))
  const middle=result.get(measures[1].id)!
  expect(middle.hairpinYOffset).toBe(183.91)
  expect(middle.expressionTextYOffsets[0]-17-(183.91+10.9)).toBeCloseTo(8)
  expect(middle.requiredBelow).toBeGreaterThan(middle.expressionTextYOffsets[0]+17)
})
