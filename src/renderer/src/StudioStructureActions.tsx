import { Button, Group, IconButton, Text, Tooltip } from '@ddirori/ui'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import './studio-structure-actions.css'

interface Action {
  label: string
  disabled?: boolean
  onSelect: () => void
}

export function StudioStructureActions({ addPart, removePart, addStaff, removeStaff, moveUp, moveDown }: {
  addPart: Action
  removePart: Action
  addStaff: Action
  removeStaff: Action
  moveUp: Action
  moveDown: Action
}) {
  const labeledButton = (action: Action, remove = false) => <Button kind="secondary"
    disabled={action.disabled} onClick={action.onSelect}>
    <span className="studio-structure-actions__content">
      {remove ? <Trash2 aria-hidden="true" size={18} strokeWidth={1.75}/> : <Plus aria-hidden="true" size={18} strokeWidth={1.75}/>}
      <span>{action.label}</span>
    </span>
  </Button>
  return <section className="studio-structure-actions" aria-label="파트와 보표 구성">
    <Text as="h3" variant="itemTitle">파트와 보표 구성</Text>
    <Group label="파트 구성">
      {labeledButton(addPart)}
      <Tooltip text={moveUp.label}><IconButton label={moveUp.label} disabled={moveUp.disabled} onClick={moveUp.onSelect}>
        <ArrowUp aria-hidden="true" size={18} strokeWidth={1.75}/>
      </IconButton></Tooltip>
      <Tooltip text={moveDown.label}><IconButton label={moveDown.label} disabled={moveDown.disabled} onClick={moveDown.onSelect}>
        <ArrowDown aria-hidden="true" size={18} strokeWidth={1.75}/>
      </IconButton></Tooltip>
      {labeledButton(removePart, true)}
    </Group>
    <Group label="보표 구성">{labeledButton(addStaff)}{labeledButton(removeStaff, true)}</Group>
  </section>
}
