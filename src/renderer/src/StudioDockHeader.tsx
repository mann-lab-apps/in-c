import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconButton, Input, Popover, Text, Tooltip } from '@ddirori/ui'
import { X } from 'lucide-react'
import { isTextEditingTarget } from './editor/keyboard-input'
import './studio-dock-header.css'

// Workspace settings only. Width and visibility remain owned by App's preferences.
export function StudioDockHeader({name, width, onWidth, onClose, onReturn, children}: {
  name: '팔레트' | '속성'
  width: number
  onWidth: (value: number) => void
  onClose: () => void
  onReturn?: () => void
  children?: ReactNode
}) {
  const widthField=useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(String(width))
  useEffect(() => setDraft(String(width)), [width])
  const invalid = draft === '' || !Number.isInteger(Number(draft)) || Number(draft) < 200 || Number(draft) > 360
  return <div className="studio-dock-header" onKeyDown={event => {
    if(event.nativeEvent.isComposing||event.keyCode===229||event.key==='Process'){event.stopPropagation();return}
    if(event.key==='F6'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!isTextEditingTarget(event.target)&&onReturn){
      event.preventDefault();event.stopPropagation();setOpen(false);onReturn();return
    }
    if (!event.metaKey && !event.ctrlKey && !event.altKey) event.stopPropagation()
  }}>
    <Text as="h3" variant="itemTitle">{name}</Text>
    <Popover label={`${name} 도크 설정`} triggerLabel="설정" open={open} onOpenChange={value => { setDraft(String(width)); setOpen(value) }}>
      <div ref={widthField}><Input label={`${name} 도크 폭`} aria-label={`${name} 도크 폭`} type="number" min={200} max={360} step={1} value={draft}
        help="200–360px 사이의 정수를 입력해 주세요."
        error={invalid ? '200–360px 사이의 정수를 입력해 주세요.' : undefined}
        onBlur={() => setDraft(String(width))}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') return
          if (event.key === 'Enter') { event.preventDefault(); if (invalid) setDraft(String(width)) }
        }}
        onChange={event => {
          setDraft(event.currentTarget.value)
          if (event.currentTarget.validity.valid && event.currentTarget.value) onWidth(event.currentTarget.valueAsNumber)
        }} /></div>
      <Button kind="quiet" aria-label={`${name} 도크 폭을 280px로 재설정`} disabled={width===280}
        onClick={()=>{
          setDraft('280');onWidth(280)
          // The reset action becomes disabled; keep focus on the live input.
          const input=widthField.current?.querySelector('input')
          input?.focus();input?.scrollIntoView?.({block:'nearest'})
        }}>기본 폭 280px로</Button>
      {children}
    </Popover>
    <Tooltip text={`${name} 도크 닫기`}><IconButton label={`${name} 도크 닫기`} onClick={() => { setOpen(false); onClose() }}>
      <X size={18} strokeWidth={1.75} aria-hidden="true" />
    </IconButton></Tooltip>
  </div>
}
