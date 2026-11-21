import {beatDeltaToSeconds,elapsedSecondsToBeat,type PlaybackTimeline} from './timeline'
import type {PracticeLoopRange} from './practice-loop'

export interface PracticeLoopSegment {cycle:number;fromBeat:number;endBeat:number;startSeconds:number;endSeconds:number}
export interface PracticeLoopClock {
  fromBeat:number;firstSeconds:number;periodSeconds:number
  segment:(cycle:number)=>PracticeLoopSegment
  cycleAtElapsed:(elapsed:number)=>number
  beatAtElapsed:(elapsed:number)=>number
}

/** One continuous audio origin; no wall-clock accumulation or per-lap start delay. */
export function createPracticeLoopClock(timeline:PlaybackTimeline,range:PracticeLoopRange,fromBeat:number,bpm:number):PracticeLoopClock {
  const {startBeat,endBeat}=range
  if(!Number.isFinite(startBeat)||!Number.isFinite(endBeat)||startBeat<0||endBeat<=startBeat||endBeat>timeline.totalBeats+1e-9||!Number.isFinite(bpm)||bpm<=0)throw new Error('연습 구간 또는 빠르기가 올바르지 않습니다.')
  const initial=Number.isFinite(fromBeat)&&fromBeat>=startBeat&&fromBeat<endBeat?fromBeat:startBeat
  const firstSeconds=beatDeltaToSeconds(timeline,initial,endBeat,bpm),periodSeconds=beatDeltaToSeconds(timeline,startBeat,endBeat,bpm)
  if(!Number.isFinite(firstSeconds)||!Number.isFinite(periodSeconds)||firstSeconds<=0||periodSeconds<1e-6)throw new Error('연습 구간의 재생 시간이 올바르지 않습니다.')
  // The boundary is exclusive. Floating point thirds must not project the
  // preceding lap's final beat at the same audio timestamp as the next attack.
  const cycleAtElapsed=(elapsed:number)=>elapsed<firstSeconds-1e-9?0:1+Math.floor((elapsed-firstSeconds+1e-9)/periodSeconds)
  const segment=(cycle:number):PracticeLoopSegment=>{
    const startSeconds=cycle===0?0:firstSeconds+(cycle-1)*periodSeconds
    return {cycle,fromBeat:cycle===0?initial:startBeat,endBeat,startSeconds,endSeconds:cycle===0?firstSeconds:startSeconds+periodSeconds}
  }
  return {fromBeat:initial,firstSeconds,periodSeconds,cycleAtElapsed,segment,beatAtElapsed:(elapsed:number)=>{
    if(elapsed<=0)return initial
    const current=segment(cycleAtElapsed(elapsed))
    return Math.min(endBeat,elapsedSecondsToBeat(timeline,current.fromBeat,Math.max(0,elapsed-current.startSeconds),bpm))
  }}
}

/** Bounded lookahead shared by piano and clicks. Late pumps never replay past attacks. */
export class PracticeLoopQueue<T extends {time:number}> {
  private cycle=-1
  private cursor=0
  private commands:T[]=[]
  constructor(private readonly clock:PracticeLoopClock,private readonly build:(fromBeat:number,endBeat:number)=>T[]){}
  takeDue(elapsed:number,lookahead=.75):{command:T;at:number;cycle:number;end:number}[]{
    const due:{command:T;at:number;cycle:number;end:number}[]=[],horizon=elapsed+lookahead
    const current=Math.max(0,this.clock.cycleAtElapsed(elapsed))
    if(this.cycle<current){this.cycle=current;this.cursor=0;const segment=this.clock.segment(this.cycle);this.commands=this.build(segment.fromBeat,segment.endBeat)}
    while(true){
      const segment=this.clock.segment(this.cycle)
      if(segment.startSeconds>horizon+1e-9)break
      while(this.cursor<this.commands.length){
        const command=this.commands[this.cursor],at=segment.startSeconds+command.time
        if(at>horizon+1e-9)return due
        this.cursor++
        if(at>=elapsed-1e-9)due.push({command,at,cycle:this.cycle,end:segment.endSeconds})
      }
      const next=this.clock.segment(this.cycle+1)
      if(next.startSeconds>horizon+1e-9)break
      this.cycle++;this.cursor=0;this.commands=this.build(next.fromBeat,next.endBeat)
    }
    return due
  }
}
