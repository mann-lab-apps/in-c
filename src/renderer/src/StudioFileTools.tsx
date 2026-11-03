import type { KeyboardEventHandler, ReactNode } from 'react'
import { Button, Group, IconButton, Select, Tooltip } from '@ddirori/ui'
import './studio-file-tools.css'

interface Action {
  id: string
  label: string
  text?: string
  icon: ReactNode
  action: () => void
  disabled?: boolean
  busy?: boolean
  hint?: string
}
interface Filter {
  label: string
  help?: string
  value: string
  options: readonly {value: string; label: string}[]
  onChange: (value: string) => void
}
interface Props {
  theme: 'light' | 'dark'
  onNavigationKeyDown?: KeyboardEventHandler<HTMLElement>
  fileActions: readonly Action[]
  editActions: readonly Action[]
  filters: readonly Filter[]
}

function ActionButton({action}: {action: Action}) {
  return <Tooltip text={action.hint ?? action.label}>
    {action.text ? <Button kind="secondary" aria-label={action.label} title={action.hint}
      disabled={action.disabled} busy={action.busy} onClick={action.action}>
      <span className="studio-file-tools__button-content">
        <span className="studio-file-tools__button-icon">{action.icon}</span>
        <span>{action.text}</span>
      </span>
    </Button> : <IconButton label={action.label} title={action.hint} disabled={action.disabled}
      busy={action.busy} onClick={action.action}>{action.icon}</IconButton>}
  </Tooltip>
}

// Presentation only: all enablement, commands and file ownership come from App.
export function StudioFileTools(props: Props) {
  return <section className="studio-file-tools ddirori" aria-label="파일 및 선택 도구"
    data-theme={props.theme} data-density="compact"
    onKeyDownCapture={event => {
      if(event.nativeEvent.isComposing || event.keyCode === 229) event.stopPropagation()
    }}
    onKeyDown={event => {
      props.onNavigationKeyDown?.(event)
      if(!event.ctrlKey && !event.metaKey && !event.altKey &&
        ((event.target as HTMLElement).closest('[role="combobox"]') || event.key === 'Enter' || event.key === ' ')) event.stopPropagation()
    }}>
    <Group label="파일 작업">
      {props.fileActions.map(action => <ActionButton key={action.id} action={action}/>)}
    </Group>
    <Group label="선택 편집">
      {props.editActions.map(action => <ActionButton key={action.id} action={action}/>)}
    </Group>
    <div className="studio-file-tools__filters">
      {props.filters.map(filter => <div className="studio-file-tools__filter" key={filter.label}>
        <Select label={filter.label} help={filter.help} options={filter.options} value={filter.value} onChange={filter.onChange}/>
      </div>)}
    </div>
  </section>
}
