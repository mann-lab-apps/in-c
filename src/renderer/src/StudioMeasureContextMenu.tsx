import { useId, useLayoutEffect, useRef, useState } from 'react'
import { Button, Card, Text } from '@ddirori/ui'
import { Plus, Repeat2, Trash2 } from 'lucide-react'
import './studio-measure-context-menu.css'

export type MeasureMenuAction = 'insert-before' | 'insert-after' | 'remove'
  | 'toggle-repeat-start' | 'toggle-repeat-end' | 'toggle-volta-1' | 'toggle-volta-2'
const commands: readonly { id: MeasureMenuAction; label: string }[] = [
  { id: 'insert-before', label: '앞에 마디 추가' },
  { id: 'insert-after', label: '뒤에 마디 추가' },
  { id: 'toggle-repeat-start', label: '도돌이표 시작' },
  { id: 'toggle-repeat-end', label: '도돌이표 끝' },
  { id: 'toggle-volta-1', label: '1번 볼타' },
  { id: 'toggle-volta-2', label: '2번 볼타' },
  { id: 'remove', label: '마디 제거' }
]

// Public Menu has a fixed trigger, not a pointer anchor. This service composition
// owns positioning/navigation; Card/Button retain public theme/density styling.
export function StudioMeasureContextMenu({ theme, x, y, scope, canRemove, onClose, onSelect }: {
  scope?: string
  theme: 'light' | 'dark'; x: number; y: number; canRemove: boolean
  onClose: () => void; onSelect: (action: MeasureMenuAction) => void
}) {
  const scopeId = useId()
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })
  useLayoutEffect(() => {
    const element = menu.current
    if (!element) return
    let frame = 0
    const place = () => {
      const focused = document.activeElement
      const bounds = element.getBoundingClientRect()
      const left = Math.max(16, Math.min(x, window.innerWidth - bounds.width - 16))
      const top = Math.max(16, Math.min(y, window.innerHeight - bounds.height - 16))
      setPosition(current => current.left === left && current.top === top ? current : { left, top })
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        if (element.isConnected && focused instanceof HTMLElement &&
          element.contains(focused) && document.activeElement === focused)
          focused.scrollIntoView?.({ block: 'nearest' })
      })
    }
    place()
    element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true })
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place)
    observer?.observe(element)
    window.addEventListener('resize', place)
    return () => { observer?.disconnect(); window.cancelAnimationFrame(frame); window.removeEventListener('resize', place) }
  }, [x, y])
  const restoreCanvas = () => document.querySelector<HTMLElement>('.score-canvas')?.focus({ preventScroll: true })
  const close = () => { onClose(); restoreCanvas() }
  return <div className="studio-measure-context-layer ddirori" data-theme={theme} data-density="compact"
    role="presentation" onClick={close} onContextMenu={event => event.preventDefault()}>
    <div ref={menu} className="studio-measure-context-menu" style={position} role="menu" aria-label="마디 작업" aria-describedby={scope ? scopeId : undefined}
      onClick={event => event.stopPropagation()}
      onPointerDownCapture={event => {
        // A disabled command cannot activate, but its native pointer default can
        // still blur the current enabled item and bypass this menu's Escape.
        if ((event.target as Element).closest<HTMLButtonElement>('button[role="menuitem"]')?.disabled) event.preventDefault()
      }}
      onKeyDown={event => {
        event.stopPropagation()
        if (event.nativeEvent.isComposing || event.keyCode === 229) {
          if (['Enter', ' ', 'Escape'].includes(event.key)) event.preventDefault()
          return
        }
        if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); close(); return }
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'))
        const current = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'ArrowDown' ? (current + 1) % items.length
          : event.key === 'ArrowUp' ? (current - 1 + items.length) % items.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1
        if (next >= 0) { event.preventDefault(); items[next]?.focus({ preventScroll: true }); items[next]?.scrollIntoView?.({ block: 'nearest' }) }
      }}>
      <Card>{scope ? <Text id={scopeId} as="p" variant="description">반복·볼타: {scope}</Text> : null}<div className="studio-measure-context-actions">
        {commands.map(command => {
          const Icon = command.id === 'remove' ? Trash2 : command.id.startsWith('insert') ? Plus : Repeat2
          return <Button key={command.id} role="menuitem" tabIndex={-1}
            kind={command.id === 'remove' ? 'danger' : 'quiet'}
            disabled={command.id === 'remove' && !canRemove}
            onClick={() => { onSelect(command.id); restoreCanvas() }}>
            <span className="studio-measure-context-action"><Icon size={18} strokeWidth={1.75} aria-hidden="true" /><span>{command.label}</span></span>
          </Button>
        })}
      </div></Card>
    </div>
  </div>
}
