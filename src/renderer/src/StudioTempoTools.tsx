import { useId } from 'react'
import { Checkbox, Select, Slider, Text } from '@ddirori/ui'
import { parseAuthoredTempoBpm } from './editor/authored-tempo'
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
  swingPlayback: string
  gracePlayback: boolean
  swingUnavailableReason?: string
  swingHint?: string
  onBpm: (value: number) => void
  onBeat: (value: string) => void
  onVisible: (value: boolean) => void
  onRhythm: (value: string) => void
  onSwingPlayback: (value: string) => void
  onGracePlayback: (enabled: boolean) => void
}) {
  const hintId = useId()
  const preservedValue = parseAuthoredTempoBpm(String(props.bpm)) === undefined
  return <section className="studio-tempo-tools" aria-label="빠르기" aria-describedby={preservedValue ? hintId : undefined} onKeyDown={event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
    if (!event.metaKey && !event.ctrlKey && !event.altKey &&
      ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
  }}>
    <Text as="h3" variant="itemTitle">전역 빠르기</Text>
    <Text as="p" variant="description">악보 전체의 기본 빠르기입니다. 위치별 변경은 별도로 설정합니다.</Text>
    {preservedValue ? <Text as="p" id={hintId} variant="description">기존 {props.bpm} BPM은 수정하지 않으면 그대로 유지됩니다. 새 값은 40–240 사이의 정수로 설정합니다.</Text> : null}
    <div className="studio-tempo-tools__fields">
      <div className="studio-tempo-tools__field"><Slider label="빠르기" value={props.bpm} valueText={`${props.bpm} BPM`} min={40} max={240} step={1} onChange={props.onBpm}/></div>
      <div className="studio-tempo-tools__field"><Select label="빠르기 기준 음가" value={props.beat} options={props.beats} onChange={props.onBeat}/></div>
      <div className="studio-tempo-tools__preview"><Text variant="label">빠르기말</Text><Text as="output" variant="numeric" aria-label="빠르기말">{props.preview}</Text></div>
      <Checkbox label="악보에 빠르기말 표기" checked={props.visible} onChange={event=>props.onVisible(event.currentTarget.checked)}/>
      <div className="studio-tempo-tools__field"><Select label="리듬 해석 표기" value={props.rhythm} options={props.rhythms} onChange={props.onRhythm}/></div>
      <div className="studio-tempo-tools__field"><Select label="전역 스윙 재생" value={props.swingPlayback} help={props.swingHint} options={[
        { value: 'off', label: '꺼짐 · 직선 리듬' },
        { value: 'eighth:2:1', label: '8분 · 2:1' }, { value: 'eighth:3:2', label: '8분 · 3:2' },
        { value: '16th:2:1', label: '16분 · 2:1' }, { value: '16th:3:2', label: '16분 · 3:2' }
      ]} onChange={props.onSwingPlayback}/></div>
    </div>
    <Text as="p" variant="description">스윙 재생은 악보 전체의 발음 시점과 MIDI에 적용하며, 리듬 해석 표기와 별개입니다. 잇단음표나 더 짧은 음가가 겹친 두 음 묶음은 해당 성부에서 직선으로 유지합니다. 구간·보표별 변경은 지원하지 않습니다.</Text>
    <Checkbox label="앞꾸밈음 발음" checked={props.gracePlayback}
      onChange={event=>props.onGracePlayback(event.currentTarget.checked)}/>
    <Text as="p" variant="description">일반 단음 앞의 꾸밈음 한 개를 재생과 MIDI에서 발음합니다. 설정은 프로젝트 파일에 저장됩니다.</Text>
    {props.swingUnavailableReason ? <Text as="p" variant="description">{props.swingUnavailableReason}</Text> : null}
  </section>
}
