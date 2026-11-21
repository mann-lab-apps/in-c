import { createScoreRepeatPlaybackPlan, measureDurationTicks, TICKS_PER_QUARTER, type Score } from '../../../score-core'
import { createPerformedBeatMapper, resolveQuarterBpmAtBeat, type PlaybackTimeline } from './timeline'

export interface MetronomeClick { beat: number; accent: boolean; measureIndex: number }
export interface MetronomePlan { clicks: MetronomeClick[]; unavailableReason?: string }

export function metronomeUnavailableReason(score: Score): string | undefined {
  const staves=score.parts.flatMap(part=>part.staves),reference=staves[0]?.measures
  if(!reference?.length)return '메트로놈을 사용할 마디가 없습니다.'
  if(staves.some(staff=>staff.measures.length!==reference.length||staff.measures.some((bar,index)=>{
    const other=reference[index]
    return bar.timeSignature.beats!==other.timeSignature.beats||bar.timeSignature.beatType!==other.timeSignature.beatType||measureDurationTicks(bar)!==measureDurationTicks(other)
  })))return '보표별 박자표 또는 마디 길이가 달라 메트로놈을 사용할 수 없습니다. 악보 재생은 계속 사용할 수 있습니다.'
  return undefined
}

/** A practice grid on the existing performed clock. Never stored in the score. */
export function createMetronomePlan(score: Score, timeline: PlaybackTimeline, fallbackBpm: number): MetronomePlan {
  const unavailableReason=metronomeUnavailableReason(score)
  if(unavailableReason)return {clicks:[],unavailableReason}
  const bars=score.parts[0].staves[0].measures,repeat=createScoreRepeatPlaybackPlan(score)
  let cursor=0
  const entries=repeat?.entries??bars.map((bar,measureIndex)=>{const outputBeat=cursor;cursor+=measureDurationTicks(bar)/TICKS_PER_QUARTER;return {measureIndex,outputBeat}})
  const performedBeat=createPerformedBeatMapper(score,repeat),clicks:MetronomeClick[]=[]
  for(const entry of entries){
    const bar=bars[entry.measureIndex],{beats,beatType}=bar.timeSignature,unit=4/beatType
    const compound=beats>3&&beats%3===0
    const bpm=resolveQuarterBpmAtBeat(timeline,performedBeat(entry.outputBeat),fallbackBpm)
    const step=unit*(compound&&bpm/(unit*3)>=60?3:1)
    const length=measureDurationTicks(bar)/TICKS_PER_QUARTER,nominalLength=beats*unit
    // Align the incomplete bar to the end of its nominal meter. A pickup
    // shorter than a click step can contain no click at all.
    const offset=bar.timing.type==='pickup'?length%step:0
    for(let local=offset;local<length-1e-9;local+=step){
      const nominal=local+nominalLength-length
      clicks.push({beat:performedBeat(entry.outputBeat+local),accent:Math.abs(nominal)<1e-9,measureIndex:entry.measureIndex})
    }
  }
  return {clicks}
}
