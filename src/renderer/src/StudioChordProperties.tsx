import { Button, Group, IconButton, Text, Tooltip } from '@ddirori/ui'
import { ArrowDown, ArrowUp, ChevronsDown, ChevronsUp, RotateCw, Trash2 } from 'lucide-react'
import './studio-chord-properties.css'

interface Props {
  theme:'light'|'dark'
  pitches:readonly string[]
  pitchEnabled:boolean
  onMove:(kind:'diatonic'|'octave',direction:-1|1)=>void
  onRespell:()=>void
  onAdd:(steps:2|4)=>void
  onRemove:(pitch:string)=>void
}

// Event-level chord commands stay in App;these controls never edit a pitch draft.
export function StudioChordProperties({theme,pitches,pitchEnabled,onMove,onRespell,onAdd,onRemove}:Props) {
  return <section className="studio-chord-properties ddirori" aria-label="선택 음표의 화음" data-theme={theme} data-density="compact"
    onKeyDown={event=>{
      if(event.nativeEvent.isComposing||event.keyCode===229||event.key==='Enter'||event.key===' ')event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">화음 구성음</Text>
    <Text as="p" variant="caption" aria-label="음표 편집 대상">선택한 음표에 적용 · {pitches.length>1?`화음 전체 (${pitches.length}음)`:'단음'} · A–G: 단음 교체 · Shift+A–G: 구성음 추가</Text>
    <Group label="선택 음높이">
      {([
        ['음높이 한 칸 내리기',ArrowDown,'diatonic',-1,'Alt/Option+↓'],
        ['음높이 한 칸 올리기',ArrowUp,'diatonic',1,'Alt/Option+↑'],
        ['한 옥타브 내리기',ChevronsDown,'octave',-1,'Cmd/Ctrl+Alt/Option+↓'],
        ['한 옥타브 올리기',ChevronsUp,'octave',1,'Cmd/Ctrl+Alt/Option+↑']
      ] as const).map(([label,Icon,kind,direction,shortcut])=><Tooltip key={label} text={`${label} · ${shortcut}`}><IconButton label={label} disabled={!pitchEnabled} onClick={()=>onMove(kind,direction)}><Icon aria-hidden="true" size={18} strokeWidth={1.75}/></IconButton></Tooltip>)}
      <Tooltip text="이명동음으로 바꾸기 · J"><IconButton label="이명동음으로 바꾸기" disabled={!pitchEnabled} onClick={onRespell}><RotateCw aria-hidden="true" size={18} strokeWidth={1.75}/></IconButton></Tooltip>
    </Group>
    <Group label="화음 구성음 추가">
      <Button kind="secondary" onClick={()=>onAdd(2)}>3도 추가</Button>
      <Button kind="secondary" onClick={()=>onAdd(4)}>5도 추가</Button>
    </Group>
    <div className="studio-chord-properties__members">
      {pitches.map((pitch,index)=><div className="studio-chord-properties__member" key={pitch}>
        <Text as="span" variant="numeric">{pitch}</Text>
        {index>0?<Tooltip text={`${pitch} 구성음 제거`}><IconButton label={`${pitch} 구성음 제거`} onClick={()=>onRemove(pitch)}><Trash2 aria-hidden="true" size={18} strokeWidth={1.75}/></IconButton></Tooltip>:<Text as="span" variant="caption">기준음</Text>}
      </div>)}
    </div>
  </section>
}
