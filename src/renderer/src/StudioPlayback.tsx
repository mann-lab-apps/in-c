import { Checkbox, IconButton, Slider, Text, Tooltip } from '@ddirori/ui'
import { LocateFixed, Metronome, Pause, Play, Repeat2, SkipBack, SlidersHorizontal, Square } from 'lucide-react'
import { createPartOptionLabels } from './editor/part-option-labels'
import './studio-playback.css'

interface TransportProps {
  theme:'light'|'dark'
  status:'stopped'|'paused'|'playing'
  position:number
  total:number
  mixerOpen:boolean
  onStart:()=>void
  onPlay:()=>void
  onPause:()=>void
  onStop:()=>void
  onMixer:()=>void
  playDisabledReason?:string
  loading?:boolean
  rewindAvailable?:boolean
  following?:boolean
  onFollow?:()=>void
  metronomeEnabled?:boolean
  metronomeReason?:string
  onMetronome?:()=>void
  practiceLoopLabel?:string
  practiceLoopReason?:string
  onPracticeLoop?:()=>void
}
export function StudioPlayback(props:TransportProps) {
  return <section className="studio-playback ddirori" data-theme={props.theme} data-density="compact" aria-label="재생 컨트롤"
    onKeyDown={event=>{if(event.key==='Enter'||event.key===' ')event.stopPropagation()}}>
    <div className="studio-playback__commands">
      <Tooltip text="처음으로"><IconButton label="처음으로" disabled={props.status==='stopped'&&props.position===0&&!props.rewindAvailable} onClick={props.onStart}><SkipBack size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>
      <Tooltip text={props.playDisabledReason ?? "재생 · Space"}><IconButton label="재생" disabled={props.status==='playing'||Boolean(props.playDisabledReason)} onClick={props.onPlay}><Play size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>
      <Tooltip text="일시정지 · Space"><IconButton label="일시정지" disabled={props.status!=='playing'} onClick={props.onPause}><Pause size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>
      <Tooltip text="정지"><IconButton label="정지" disabled={props.status==='stopped'&&!props.loading} onClick={props.onStop}><Square size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>
      <Tooltip text="믹서 표시/숨기기"><IconButton label="믹서 표시" selected={props.mixerOpen} aria-expanded={props.mixerOpen} aria-controls="studio-part-mixer" onClick={props.onMixer}><SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>
      {props.onMetronome ? <Tooltip text={props.metronomeReason ?? '메트로놈 · 파트 음소거와 독립적인 연습 클릭 · 파일 출력에는 포함되지 않습니다'}><IconButton label="메트로놈" selected={Boolean(props.metronomeEnabled&&!props.metronomeReason)} disabled={Boolean(props.metronomeReason)} aria-describedby={props.metronomeReason?'studio-metronome-reason':undefined} onClick={props.onMetronome}><Metronome size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip> : null}
      {props.onPracticeLoop?<Tooltip text={props.practiceLoopReason??'연습 루프 · 선택한 음표·쉼표 또는 연속 구간을 총보로 반복 · 파일에는 저장하지 않습니다'}><IconButton label="연습 루프" selected={Boolean(props.practiceLoopLabel)} disabled={Boolean(props.practiceLoopReason)} aria-describedby={props.practiceLoopReason?'studio-practice-loop-reason':props.practiceLoopLabel?'studio-practice-loop-range':undefined} onClick={props.onPracticeLoop}><Repeat2 size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip>:null}
      {props.onFollow ? <Tooltip text="재생 위치 따라가기 · 수동 스크롤 후 다시 켤 수 있습니다"><IconButton label="재생 위치 따라가기" selected={props.following} onClick={props.onFollow}><LocateFixed size={18} strokeWidth={1.75} aria-hidden="true"/></IconButton></Tooltip> : null}
    </div>
    {props.metronomeReason ? <Text id="studio-metronome-reason" variant="caption" role="status">{props.metronomeReason}</Text> : null}
    {props.practiceLoopReason?<Text id="studio-practice-loop-reason" aria-label="연습 루프 적용 안내" variant="caption" role="status">{props.practiceLoopReason}</Text>:null}
    {props.practiceLoopLabel?<Text id="studio-practice-loop-range" aria-label="연습 구간" variant="caption" role="status">{props.practiceLoopLabel} · 세션 전용 · 악보 수정/보기 변경 시 해제</Text>:null}
    <Text as="output" variant="caption" aria-label="재생 위치">{props.position.toFixed(1)} / {props.total.toFixed(1)}박</Text>
  </section>
}

interface MixerPart {id:string;name:string;muted:boolean;solo:boolean;volume:number;active:boolean}
export function StudioPartMixer({theme,open,parts,onMute,onSolo,onVolume}:{
  theme:'light'|'dark';open:boolean;parts:readonly MixerPart[]
  onMute:(partId:string)=>void;onSolo:(partId:string)=>void;onVolume:(partId:string,value:number)=>void
}) {
  const labels=createPartOptionLabels(parts)
  return <section id="studio-part-mixer" className="studio-part-mixer ddirori" data-theme={theme} data-density="compact" aria-label="파트 믹서" hidden={!open}>
    <Text as="h3" variant="itemTitle">믹서</Text>
    {parts.map((part,index)=>{const label=labels[index]!;return <div key={part.id} className="studio-part-mixer__row" data-playback-active={part.active}>
      <Text as="strong" variant="label">{label}</Text>
      <Text variant="caption" aria-label={`${label} 재생 상태`} className="studio-part-mixer__activity">{part.active?'재생 중':'대기'}</Text>
      <Checkbox label="뮤트" aria-label={`${label} 음소거`} checked={part.muted} onChange={()=>onMute(part.id)}/>
      <Checkbox label="솔로" aria-label={`${label} 솔로`} checked={part.solo} onChange={()=>onSolo(part.id)}/>
      <div className="studio-part-mixer__volume"><Slider label={`${label} 볼륨`} min={0} max={150} step={5} value={part.volume} valueText={`${part.volume}%`} onChange={value=>onVolume(part.id,value)}/></div>
    </div>})}
  </section>
}
