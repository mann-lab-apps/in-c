import { Checkbox, Select, Slider, Text } from '@ddirori/ui'
import './studio-tempo-tools.css'

interface Choice {
  value: string
  label: string
}

export function StudioTempoTools(props: {
  bpm: number
  beat: string
  beats: readonly Choice[]
  preview: string
  visible: boolean
  rhythm: string
  rhythms: readonly Choice[]
  onBpm: (value: number) => void
  onBeat: (value: string) => void
  onVisible: (value: boolean) => void
  onRhythm: (value: string) => void
}) {
  return <section className="studio-tempo-tools" aria-label="빠르기" onKeyDown={event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
    if (!event.metaKey && !event.ctrlKey && !event.altKey &&
      ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
  }}>
    <Text as="h3" variant="itemTitle">전역 빠르기</Text>
    <Text as="p" variant="description">악보 전체의 기본 빠르기입니다. 위치별 변경은 별도로 설정합니다.</Text>
    <div className="studio-tempo-tools__fields">
      <div className="studio-tempo-tools__field"><Slider label="빠르기" value={props.bpm} valueText={`${props.bpm} BPM`} min={40} max={240} step={1} onChange={props.onBpm}/></div>
      <div className="studio-tempo-tools__field"><Select label="빠르기 기준 음가" value={props.beat} options={props.beats} onChange={props.onBeat}/></div>
      <div className="studio-tempo-tools__preview"><Text variant="label">빠르기말</Text><Text as="output" variant="numeric" aria-label="빠르기말">{props.preview}</Text></div>
      <Checkbox label="악보에 빠르기말 표기" checked={props.visible} onChange={event=>props.onVisible(event.currentTarget.checked)}/>
      <div className="studio-tempo-tools__field"><Select label="리듬 해석 표기" value={props.rhythm} options={props.rhythms} onChange={props.onRhythm}/></div>
    </div>
  </section>
}
