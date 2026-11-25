import {expect,it} from 'vitest'
import {createMeasure,createRepeatPlaybackPlan,createScoreRepeatPlaybackPlan,TICKS_PER_QUARTER,type Measure} from './index'
import {secondaryRepeatFixture} from '../testing/secondary-repeat-fixture'

type Entry=[number,number,number]
const bar=(id:string,input:Parameters<typeof createMeasure>[0]={})=>createMeasure({...input,id})
const cases:{name:string;measures:Measure[];entries:Entry[];total:number}[]=[
 {name:'empty',measures:[],entries:[],total:0},
 {name:'continuous mixed meter',measures:[bar('a'),bar('b',{timeSignature:{beats:3,beatType:4}})],entries:[[0,0,1],[1,4,1]],total:7},
 {name:'same-bar three passes',measures:[bar('a',{repeat:{start:true,end:true,times:3}}),bar('b')],entries:[[0,0,1],[0,4,2],[0,8,3],[1,12,3]],total:16},
 {name:'implicit start',measures:[bar('a'),bar('b',{repeat:{end:true}}),bar('c')],entries:[[0,0,1],[1,4,1],[0,8,2],[1,12,2],[2,16,2]],total:20},
 {name:'intro before explicit start',measures:[bar('intro'),bar('a',{repeat:{start:true}}),bar('b',{repeat:{end:true}}),bar('c')],entries:[[0,0,1],[1,4,1],[2,8,1],[1,12,2],[2,16,2],[3,20,2]],total:24},
 {name:'adjacent repeats reset pass',measures:[bar('a',{repeat:{start:true,end:true}}),bar('b',{repeat:{start:true,end:true}})],entries:[[0,0,1],[0,4,2],[1,8,1],[1,12,2]],total:16},
 {name:'first ending range then second',measures:[bar('a',{repeat:{start:true}}),bar('b',{volta:{number:1,start:true}}),bar('c',{volta:{number:1,end:true},repeat:{end:true}}),bar('d',{volta:{number:2,start:true,end:true}})],entries:[[0,0,1],[1,4,1],[2,8,1],[0,12,2],[3,16,2]],total:20},
 {name:'unclosed ending is a singleton',measures:[bar('a',{repeat:{start:true}}),bar('b',{volta:{number:1,start:true},repeat:{end:true}}),bar('c')],entries:[[0,0,1],[1,4,1],[0,8,2],[2,12,2]],total:16},
 {name:'pickup and changed meter',measures:[bar('a',{timing:{type:'pickup',durationTicks:TICKS_PER_QUARTER},repeat:{start:true}}),bar('b',{timeSignature:{beats:3,beatType:4},repeat:{end:true}})],entries:[[0,0,1],[1,1,1],[0,4,2],[1,5,2]],total:8},
 {name:'existing minimum two passes',measures:[bar('a',{repeat:{start:true,end:true,times:1}})],entries:[[0,0,1],[0,4,2]],total:8}
]

it.each(cases)('shares the existing literal traversal: $name',({measures,entries,total})=>{
 const before=structuredClone(measures)
 expect(createRepeatPlaybackPlan(measures)).toEqual({entries:entries.map(([measureIndex,outputBeat,pass])=>({measureIndex,outputBeat,pass})),totalBeats:total})
 expect(measures).toEqual(before)
})

it.each(['primary','lower','other'] as const)('uses existing aligned %s repeat ownership without mutating source',owner=>{
 const {score,staff}=secondaryRepeatFixture(owner,'volta'),before=structuredClone(score)
 expect(createScoreRepeatPlaybackPlan(score)).toEqual(createRepeatPlaybackPlan(staff.measures))
 expect(createScoreRepeatPlaybackPlan(score)?.entries.map(e=>e.measureIndex)).toEqual([0,1,0,2,3])
 expect(score).toEqual(before)
})
it('does not invent a shared plan for absent or misaligned marks',()=>{
 const {score}=secondaryRepeatFixture('lower','repeat')
 score.parts[0].staves[1].measures.pop()
 expect(createScoreRepeatPlaybackPlan(score)).toBeUndefined()
 const {input}=secondaryRepeatFixture('primary','repeat')
 expect(createScoreRepeatPlaybackPlan(input)).toBeUndefined()
})

it('restarts a closed inner repeat on every explicit outer pass without changing the written measures', () => {
  const measures = [
    bar('outer-start', { repeat: { start: true } }),
    bar('inner-start', { repeat: { start: true }, timeSignature: { beats: 3, beatType: 4 } }),
    bar('inner-end', { repeat: { end: true, times: 3 } }),
    bar('outer-end', { repeat: { end: true } }),
    bar('after')
  ]
  const before = structuredClone(measures)
  const plan = createRepeatPlaybackPlan(measures)
  const expected = [0, 1, 2, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 1, 2, 3, 4]
  expect(plan.entries.map(entry => entry.measureIndex)).toEqual(expected)
  expect(plan.entries.map(entry => entry.outputBeat)).toEqual([0, 4, 7, 11, 14, 18, 21, 25, 29, 33, 36, 40, 43, 47, 50, 54, 58])
  expect(plan.totalBeats).toBe(62)
  expect(measures).toEqual(before)
})

it('keeps prior traversal for nested expansions beyond the linear bound and for an unclosed outer mark', () => {
  const measures = [
    bar('outer-start', { repeat: { start: true } }),
    bar('inner-start', { repeat: { start: true } }),
    bar('inner-end', { repeat: { end: true, times: 100 } }),
    bar('outer-end', { repeat: { end: true, times: 100 } })
  ]
  expect(createRepeatPlaybackPlan(measures).entries).toHaveLength(301)
  measures[2].repeat = { end: true }
  measures[3].repeat = undefined
  expect(createRepeatPlaybackPlan(measures).entries.map(entry => entry.measureIndex)).toEqual([0, 1, 2, 1, 2, 3])
})

it.each(['before', 'after'] as const)('plays closed nested repeats with a separate volta section %s them', position => {
  const nested = [
    bar('outer-start', { repeat: { start: true } }),
    bar('inner-start', { repeat: { start: true } }),
    bar('inner-end', { repeat: { end: true } }),
    bar('outer-end', { repeat: { end: true } })
  ]
  const endings = [
    bar('ending-start', { repeat: { start: true } }),
    bar('first-ending', { volta: { number: 1, start: true, end: true }, repeat: { end: true } }),
    bar('second-ending', { volta: { number: 2, start: true, end: true } })
  ]
  const measures = position === 'before' ? [...endings, ...nested] : [...nested, ...endings]
  const before = structuredClone(measures)
  const expectedNested = [0, 1, 2, 1, 2, 3, 0, 1, 2, 1, 2, 3]
  const expectedEndings = [0, 1, 0, 2]
  const indices = position === 'before'
    ? [...expectedEndings, ...expectedNested.map(index => index + endings.length)]
    : [...expectedNested, ...expectedEndings.map(index => index + nested.length)]

  expect(createRepeatPlaybackPlan(measures)).toEqual({
    entries: indices.map((measureIndex, occurrence) => ({
      measureIndex,
      outputBeat: occurrence * 4,
      pass: (position === 'before'
        ? [1, 1, 2, 2, 1, 1, 1, 2, 2, 1, 2, 1, 1, 2, 2, 2]
        : [1, 1, 1, 2, 2, 1, 2, 1, 1, 2, 2, 2, 1, 1, 2, 2])[occurrence]
    })),
    totalBeats: 64
  })
  expect(measures).toEqual(before)
})

it('keeps the legacy traversal when an ending spans a nested repeat', () => {
  const measures = [
    bar('volta-start', { volta: { number: 1, start: true } }),
    bar('outer-start', { repeat: { start: true } }),
    bar('inner-start', { repeat: { start: true } }),
    bar('inner-end', { repeat: { end: true } }),
    bar('outer-end', { repeat: { end: true } }),
    bar('volta-end', { volta: { number: 1, end: true } }),
    bar('after')
  ]

  const plan = createRepeatPlaybackPlan(measures)
  expect(plan.entries.map(entry => entry.measureIndex)).toEqual([0, 1, 2, 3, 6])
  expect(plan.totalBeats).toBe(20)
})
