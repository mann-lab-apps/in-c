import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input, Text } from '@ddirori/ui'
import type { StudioMenuDefinition } from './StudioApplicationMenu'
import './studio-command-search.css'

// Discovery over the real menu inventory. This component owns no score commands,
// shortcut mapping or enablement rules.
export function StudioCommandSearch({ theme, menus, onClose, onRun }: {
  theme: 'light' | 'dark'
  menus: readonly StudioMenuDefinition[]
  onClose: () => void
  onRun: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null)
  const composing = useRef(false)
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const entries = menus.flatMap(menu => menu.commands.filter(command => command.id !== 'command-search').map(command => ({
    ...command, key: `${menu.id}:${command.id}`, menu: menu.label
  }))).filter(command => words.every(word => `${command.menu} ${command.label}`.toLocaleLowerCase().includes(word)))
  useEffect(() => {
    const container = root.current, origin = document.activeElement
    const frame = requestAnimationFrame(() => {
      // The first keyboard result can already own focus before this frame.
      if (container?.isConnected && (document.activeElement === origin || document.activeElement === document.body)) {
        container.querySelector<HTMLInputElement>('input')?.focus()
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  return <div ref={root} className="studio-command-search ddirori" data-theme={theme} data-density="compact"
    onCompositionStartCapture={() => { composing.current = true }}
    onCompositionEndCapture={() => { composing.current = false }}
    onKeyDownCapture={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
        if (event.key === 'Escape') event.preventDefault()
        event.stopPropagation()
      }
    }}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
      const buttons = [...list.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []]
      const current = buttons.indexOf(event.target as HTMLButtonElement)
      const input = event.target instanceof HTMLInputElement
      let next = -1
      if (event.key === 'ArrowDown') next = (current + 1) % buttons.length
      else if (event.key === 'ArrowUp') next = current <= 0 ? buttons.length - 1 : current - 1
      else if (!input && event.key === 'Home') next = 0
      else if (!input && event.key === 'End') next = buttons.length - 1
      else if (input && event.key === 'Enter') {
        event.preventDefault()
        const command = entries.find(entry => !entry.disabled)
        if (command) onRun(command.key)
      }
      if (next >= 0 && buttons[next]) { event.preventDefault(); buttons[next].focus(); buttons[next].scrollIntoView?.({block:'nearest'}) }
    }}>
    <Dialog open title="명령 검색" onClose={onClose}>
      <Input label="명령 찾기" type="search" value={query} onChange={event => setQuery(event.target.value)}
        help="메뉴나 명령 이름으로 찾습니다. 위아래 키로 이동하고 Enter로 실행합니다." />
      <Text as="p" variant="description" role="status">{entries.length ? `검색 결과 ${entries.length}개` : '일치하는 명령이 없습니다.'}</Text>
      <div ref={list} className="studio-command-search__results" role="group" aria-label="검색한 명령">
        {entries.map(command => <Button key={command.key} kind="quiet" disabled={command.disabled} selected={command.checked}
          className="studio-command-search__result" aria-label={`${command.menu} · ${command.label}`}
          onClick={() => onRun(command.key)}>
          <span>{command.label}</span><Text as="span" variant="description">{command.menu}{command.checked === undefined ? '' : command.checked ? ' · 켜짐' : ' · 꺼짐'}</Text>
        </Button>)}
      </div>
    </Dialog>
  </div>
}
