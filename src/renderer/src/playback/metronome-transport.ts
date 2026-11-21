import type { MetronomeClick } from './metronome'
import { beatDeltaToSeconds, type PlaybackTimeline } from './timeline'
import type {PracticeLoopRange} from './practice-loop'
import {createPracticeLoopClock,PracticeLoopQueue} from './practice-loop-clock'

/** Short, independently generated practice sound; no sample/network dependency. */
export function scheduleMetronomeClick(context: BaseAudioContext, at: number, accent: boolean, duration=.035) {
  const oscillator=context.createOscillator()
  let connectedGain: GainNode | undefined
  try {
    const gain=context.createGain();connectedGain=gain
    const length=Math.max(.003,Math.min(.035,duration))
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(accent?1760:1320,at)
    gain.gain.setValueAtTime(0,at)
    gain.gain.linearRampToValueAtTime(accent?.07:.05,at+Math.min(.001,length/4))
    gain.gain.linearRampToValueAtTime(0,at+length)
    oscillator.connect(gain);gain.connect(context.destination)
    const disconnect=()=>{oscillator.disconnect();gain.disconnect()}
    oscillator.onended=disconnect
    oscillator.start(at);oscillator.stop(at+length+.002)
    return {oscillator,disconnect}
  } catch(error) {
    // A source can fail after nodes were connected or even after start().
    // Disconnect partial work before handing ownership back to the player.
    try { oscillator.stop(context.currentTime) } catch { /* Not started/ended. */ }
    oscillator.disconnect();connectedGain?.disconnect()
    throw error
  }
}

/** Pump only queues audio-clock timestamps; it never counts beats by wall time. */
export class MetronomeTransport {
  private timer?: ReturnType<typeof setInterval>
  private cursor=0
  private commands:{at:number;accent:boolean}[]=[]
  private sources=new Set<ReturnType<typeof scheduleMetronomeClick>>()
  private loopQueue?:PracticeLoopQueue<{time:number;accent:boolean}>
  private origin=0
  constructor(readonly context: BaseAudioContext, private readonly onError?: (error: unknown) => void) {}
  start(clicks:readonly MetronomeClick[],timeline:PlaybackTimeline,fromBeat:number,bpm:number,origin:number,loop?:PracticeLoopRange){
    this.stop()
    this.origin=origin
    if(loop)this.loopQueue=new PracticeLoopQueue(createPracticeLoopClock(timeline,loop,fromBeat,bpm),(from,end)=>clicks.filter(c=>c.beat>=from-1e-9&&c.beat<end-1e-9).map(c=>({time:beatDeltaToSeconds(timeline,from,c.beat,bpm),accent:c.accent})))
    else this.commands=clicks.filter(c=>c.beat>=fromBeat-1e-9).map(c=>({at:origin+beatDeltaToSeconds(timeline,fromBeat,c.beat,bpm),accent:c.accent}))
    this.pump()
    if(this.loopQueue||this.cursor<this.commands.length)this.timer=setInterval(()=>{
      try { this.pump() } catch(error) {
        this.stop()
        if(this.onError)this.onError(error)
        else throw error
      }
    },20)
  }
  private pump(){
    if(this.loopQueue){
      const due=this.loopQueue.takeDue(this.context.currentTime-this.origin)
      for(const[index,item]of due.entries()){
        const at=this.origin+item.at,next=due[index+1]?.at??item.end
        const source=scheduleMetronomeClick(this.context,at,item.command.accent,Math.min(next-item.at,item.end-item.at)*.7)
        this.sources.add(source);source.oscillator.onended=()=>{source.disconnect();this.sources.delete(source)}
      }
      return
    }
    const now=this.context.currentTime,horizon=now+.75
    while(this.cursor<this.commands.length&&this.commands[this.cursor].at<=horizon){
      const index=this.cursor++,command=this.commands[index]
      if(command.at<now-1e-9)continue // Enabling mid-play never replays past beats.
      const next=this.commands[index+1]?.at??Infinity
      const source=scheduleMetronomeClick(this.context,command.at,command.accent,(next-command.at)*.7)
      this.sources.add(source)
      source.oscillator.onended=()=>{source.disconnect();this.sources.delete(source)}
    }
    if(this.cursor===this.commands.length&&this.timer){clearInterval(this.timer);this.timer=undefined}
  }
  stop(){
    if(this.timer)clearInterval(this.timer)
    this.timer=undefined;this.commands=[];this.cursor=0;this.loopQueue=undefined
    for(const source of this.sources){try{source.oscillator.stop(this.context.currentTime)}catch{/* Already ended. */}source.disconnect()}
    this.sources.clear()
  }
}
