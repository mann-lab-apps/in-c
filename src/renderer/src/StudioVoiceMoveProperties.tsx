import { useRef, useState } from 'react'
import { Button, Select, Text } from '@ddirori/ui'
import './studio-voice-move.css'

interface Props {
  identity: string
  sourceVoice: string
  plans: readonly { value: string; label: string; reason?: string }[]
  onMove: (voiceId: string) => void
}
export function StudioVoiceMoveProperties({ identity, sourceVoice, plans, onMove }: Props) {
  const options = plans.filter(plan => plan.value !== sourceVoice)
  const [draft, setDraft] = useState({ identity, value: options[0]?.value ?? '' })
  const value = draft.identity === identity ? draft.value : options[0]?.value ?? ''
  const reason = options.find(plan => plan.value === value)?.reason
  const composing = useRef(false)
  const owner = useRef(identity)
  if (owner.current !== identity) { owner.current = identity; composing.current = false }
  return <section className="studio-voice-move" aria-label="선택 음표 성부 이동"
    onCompositionStartCapture={() => { composing.current = true }}
    onCompositionEndCapture={() => { composing.current = false }}
    onKeyDownCapture={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        event.preventDefault(); event.stopPropagation()
      }
    }} onKeyDown={event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Enter' || event.key === ' ' || (event.target as HTMLElement).closest('[role="combobox"]')) event.stopPropagation()
    }}>
    <Text as="h3" variant="itemTitle">선택 음표 성부 이동</Text>
    <Text as="p" variant="caption">선택한 일반 단음만 같은 마디의 빈 성부로 옮깁니다. 원래 자리는 쉼표로 남습니다. 상단 성부 버튼은 입력 위치만 전환합니다.</Text>
    <Select key={identity} label="옮길 성부" options={options} value={value} onChange={value => setDraft({ identity, value })} />
    {reason ? <Text as="p" variant="description">{reason}</Text> : null}
    <Button kind="secondary" disabled={!value || Boolean(reason)} onClick={() => { if (!composing.current) onMove(value) }}>선택 음표를 성부로 옮기기</Button>
  </section>
}
