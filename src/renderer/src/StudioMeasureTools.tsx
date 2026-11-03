import type { ReactNode } from 'react'
import { Group, IconButton, Select, Text, Tooltip } from '@ddirori/ui'
import './studio-measure-tools.css'

interface Action {
  label: string
  selected?: boolean
  disabled: boolean
  icon: ReactNode
  onSelect: () => void
}
interface Signature {
  label: string
  value: string
  options: readonly { value: string; label: string; disabled?: boolean }[]
  onChange: (value: string) => void
}

// App retains measure targeting, command enablement and exact undo semantics.
export function StudioMeasureTools({theme, actions, signatures, enabled}: {
  theme: 'light' | 'dark'
  actions: readonly Action[]
  signatures: readonly Signature[]
  enabled: boolean
}) {
  return <section className="studio-measure-tools ddirori" data-theme={theme} data-density="compact" aria-label="마디 구조와 조표·박자표"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return }
      if (!event.metaKey && !event.ctrlKey && !event.altKey &&
        ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <Group label="마디 구조">{actions.map(action => <Tooltip key={action.label} text={action.label}>
      <IconButton label={action.label} selected={action.selected} disabled={action.disabled} onClick={action.onSelect}>{action.icon}</IconButton>
    </Tooltip>)}</Group>
    <div className="studio-measure-tools__signatures">
      {signatures.map(signature => <div key={signature.label} className="studio-measure-tools__signature" data-signature={signature.label}>
        <Select label={signature.label} value={signature.value} options={signature.options} onChange={signature.onChange} disabled={!enabled}/>
      </div>)}
      <Text variant="description">조표: 선택한 마디부터 적용 · 박자표: 선택한 마디에 적용</Text>
    </div>
  </section>
}
