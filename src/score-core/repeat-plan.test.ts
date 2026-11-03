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
