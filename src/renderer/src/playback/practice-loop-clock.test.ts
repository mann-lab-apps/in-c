import {expect,it} from 'vitest'
import {createPracticeLoopClock,PracticeLoopQueue} from './practice-loop-clock'
import type {PlaybackTimeline} from './timeline'
const timeline:PlaybackTimeline={events:[],tempoEvents:[{id:'slow',measureId:'b',startBeat:2,bpm:60,quarterBpm:60}],totalBeats:8}
const range={startBeat:1,endBeat:4,label:'구간'}
it('uses a partial first lap then restores the start tempo every lap without 30ms accumulation',()=>{
 const clock=createPracticeLoopClock(timeline,range,3,120)
 expect(clock.fromBeat).toBe(3);expect(clock.firstSeconds).toBe(1);expect(clock.periodSeconds).toBe(2.5)
 expect(clock.beatAtElapsed(.5)).toBe(3.5);expect(clock.beatAtElapsed(1)).toBe(1)
 expect(clock.beatAtElapsed(1.5)).toBe(2);expect(clock.beatAtElapsed(2)).toBe(2.5)
 expect(clock.beatAtElapsed(1+10000*2.5+.5)).toBeCloseTo(2,8)
})
it.each([0,4,7])('starts at the loop start when the retained position %s is outside or at the exclusive end',beat=>{
 expect(createPracticeLoopClock(timeline,range,beat,120).fromBeat).toBe(1)
})
it('describes absolute audio-clock lap boundaries independently of animation frames',()=>{
 const c=createPracticeLoopClock(timeline,range,3,120)
 expect(c.segment(0)).toEqual({cycle:0,fromBeat:3,endBeat:4,startSeconds:0,endSeconds:1})
 expect(c.segment(2)).toEqual({cycle:2,fromBeat:1,endBeat:4,startSeconds:3.5,endSeconds:6})
 expect(c.cycleAtElapsed(.99)).toBe(0);expect(c.cycleAtElapsed(1)).toBe(1);expect(c.cycleAtElapsed(3.5)).toBe(2)
})
it('keeps fractional-tempo lap boundaries at the next start rather than flashing the exclusive end',()=>{
 const t:PlaybackTimeline={events:[],tempoEvents:[],totalBeats:2},c=createPracticeLoopClock(t,{startBeat:0,endBeat:1,label:'한 박'},0,180)
 for(let lap=1;lap<=1000;lap++)expect(c.beatAtElapsed(lap/3)).toBeCloseTo(0,8)
})
it.each([{...range,endBeat:1},{...range,startBeat:-1},{...range,endBeat:9},{...range,endBeat:Infinity}])('rejects invalid range %j',r=>{
 expect(()=>createPracticeLoopClock(timeline,r,0,120)).toThrow()
})
it('queues multiple short laps in advance exactly once and skips stale attacks after a delayed pump',()=>{
 const t:PlaybackTimeline={events:[],tempoEvents:[],totalBeats:2},c=createPracticeLoopClock(t,{startBeat:0,endBeat:.5,label:'짧은 구간'},0,120)
 const q=new PracticeLoopQueue(c,()=>[{time:0,id:'attack'},{time:.25,id:'off'}])
 const first=q.takeDue(-.03,.75)
 expect(first.filter(x=>x.command.id==='attack').map(x=>[x.cycle,x.at])).toEqual([[0,0],[1,.25],[2,.5]])
 expect(q.takeDue(-.02,.75)).toEqual([])
 const late=q.takeDue(3.01,.4)
 expect(late.every(x=>x.at>=3.01)).toBe(true);expect(late.filter(x=>x.command.id==='attack').map(x=>x.at)).toEqual([3.25])
 expect(q.takeDue(3.02,.4)).toEqual([])
})
it('keeps off-before-next-on ordering and preserves the exclusive end context',()=>{
 const t:PlaybackTimeline={events:[],tempoEvents:[],totalBeats:1},c=createPracticeLoopClock(t,{startBeat:0,endBeat:1,label:'구간'},0,120)
 const q=new PracticeLoopQueue(c,()=>[{time:0,id:'on'},{time:.5,id:'off'}]),due=q.takeDue(0,.5)
 expect(due.map(x=>[x.command.id,x.cycle,x.at,x.end])).toEqual([['on',0,0,.5],['off',0,.5,.5],['on',1,.5,1]])
})
it('bounds empty muted laps by the current horizon rather than replaying missed history',()=>{
 const c=createPracticeLoopClock(timeline,range,1,120),q=new PracticeLoopQueue(c,()=>[])
 expect(q.takeDue(86400)).toEqual([])
})
