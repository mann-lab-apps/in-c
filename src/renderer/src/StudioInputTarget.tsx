import { Group, IconButton, Select, Text, Tooltip } from '@ddirori/ui'
import './studio-input-target.css'

interface Props {
  staffOptions: readonly { value: string; label: string }[]
  staff: string
  voice: number
  enabled: boolean
  inputActive: boolean
  onStaff: (value: string) => void
  onVoice: (value: 1 | 2 | 3 | 4) => void
}

// Existing target navigation, not a command to move selected notes between voices.
export function StudioInputTarget(props: Props) {
  const soleStaff = props.staffOptions.length === 1 ? props.staffOptions[0] : undefined
  return <section className={`studio-input-target${props.staffOptions.length > 1 ? ' studio-input-target--multiple' : ''}`} aria-label="보표·성부 탐색"
    onKeyDownCapture={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) event.stopPropagation()
    }}
    onKeyDown={event => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey &&
        ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <div className={`studio-input-target__staff${soleStaff ? ' studio-input-target__staff--single' : ''}`}>
      {soleStaff ? <>
        <Text variant="label">입력 보표</Text>
        <Text as="output" variant="description" aria-label="입력 보표">{soleStaff.label}</Text>
      </> : <Select label="입력 보표" options={props.staffOptions} value={props.staff}
        disabled={!props.enabled || props.staffOptions.length <= 1} onChange={props.onStaff}/>}
    </div>
    <div className="studio-input-target__voices" onKeyDown={event => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const index = buttons.indexOf(event.target as HTMLButtonElement)
      if (index < 0 || !buttons.length) return
      event.preventDefault(); event.stopPropagation()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }}>
      <Text variant="label">입력 성부</Text>
      <Group label="입력 성부">
        {([1, 2, 3, 4] as const).map(voice => <Tooltip key={voice} text={`${voice}성부로 이동 · Cmd/Ctrl+Alt+${voice} · ${props.inputActive ? '다음 음표를 넣을 위치입니다.' : '입력 위치를 이동합니다. 선택한 음표는 옮기지 않습니다.'}`}>
          <IconButton label={`${voice}성부`} selected={props.voice === voice} disabled={!props.enabled}
            onClick={() => props.onVoice(voice)}>{voice}</IconButton>
        </Tooltip>)}
      </Group>
    </div>

  </section>
}
