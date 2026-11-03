import { useRef, useState, type KeyboardEvent } from 'react'
import { Button, Popover } from '@ddirori/ui'
import { Check } from 'lucide-react'
import './studio-application-menu.css'

export interface StudioMenuCommand {
  id: string
  label: string
  disabled?: boolean
  checked?: boolean
  group?: string
  onSelect: () => void
}
export interface StudioMenuDefinition {
  id: string
  label: string
  commands: readonly StudioMenuCommand[]
}

// Service composition of the public Popover. Shared controls retain their own styling.
export function StudioApplicationMenu({ theme, menus, onFocusIntent, onNavigationKeyDown }: {
  theme: 'light' | 'dark'
  menus: readonly StudioMenuDefinition[]
  onFocusIntent?: () => void
  onNavigationKeyDown?: (event: KeyboardEvent<HTMLElement>) => void
}) {
  const [open, setOpen] = useState<string>()
  const root = useRef<HTMLElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  const triggers = () => Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[aria-haspopup="menu"]') ?? [])
  const moveMenu = (index: number, delta: number, expanded: boolean) => {
    onFocusIntent?.()
    const next = (index + delta + menus.length) % menus.length
    triggers()[next]?.focus()
    setOpen(expanded ? menus[next]?.id : undefined)
  }
  return <nav ref={root} className="studio-application-menu ddirori" data-theme={theme} data-density="compact" aria-label="앱 메뉴"
    onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      const index = triggers().indexOf(event.target as HTMLButtonElement)
      if (index >= 0 && !open) {
        onNavigationKeyDown?.(event)
        if (event.defaultPrevented) return
      }
      if (index >= 0 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();moveMenu(index, event.key === 'ArrowLeft' ? -1 : 1, Boolean(open))
      }
      // Native activation must stay local; Space is also a global playback shortcut.
      if (!event.metaKey && !event.ctrlKey && !event.altKey) event.stopPropagation()
    }}>
    {menus.map((menu, index) => <Popover key={menu.id} label={menu.label} triggerLabel={menu.label} triggerKind="quiet" menu
      open={open === menu.id} onOpenChange={value => { if (value) onFocusIntent?.();typeahead.current = { text: '', at: 0 };setOpen(value ? menu.id : undefined) }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(':is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]):not(:disabled):not([aria-disabled="true"])'))
        const current = items.indexOf(document.activeElement as HTMLButtonElement)
        let next = -1
        if (event.key === 'ArrowDown') next = (current + 1) % items.length
        else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length
        else if (event.key === 'Home') next = 0
        else if (event.key === 'End') next = items.length - 1
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault();moveMenu(index, event.key === 'ArrowLeft' ? -1 : 1, true) }
        else if (event.key === 'Tab') setOpen(undefined)
        else if (event.key.length === 1 && event.key !== ' ' && !event.metaKey && !event.ctrlKey && !event.altKey) {
          const at = Date.now();typeahead.current = { text: (at - typeahead.current.at < 600 ? typeahead.current.text : '') + event.key.toLowerCase(), at }
          next = items.findIndex(item => item.textContent?.toLowerCase().startsWith(typeahead.current.text))
        }
        if (next >= 0 && items[next]) { event.preventDefault();items[next].focus();items[next].scrollIntoView?.({ block: 'nearest' }) }
      }}>
      {menu.commands.map((command, itemIndex) => <div key={command.id} className="studio-application-menu__entry">
        {itemIndex > 0 && menu.commands[itemIndex - 1]?.group !== command.group ? <hr className="studio-application-menu__separator" /> : null}
        <Button kind="quiet" className="studio-application-menu__command" role={command.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
          aria-checked={command.checked} tabIndex={-1} disabled={command.disabled}
          onClick={() => {
            // Commands capture their origin for async focus return. A menu item
            // disappears on close; give them the persistent trigger instead.
            // Do this before dispatch so an editing command may then move focus.
            triggers()[index]?.focus()
            setOpen(undefined)
            command.onSelect()
          }}>
          <span className="studio-application-menu__content">
          <span className="studio-application-menu__check" data-menu-check aria-hidden="true">
            {command.checked ? <Check size={18} strokeWidth={1.75} /> : null}
          </span>
          <span className="studio-application-menu__label">{command.label}</span>
          </span>
        </Button>
      </div>)}
    </Popover>)}
  </nav>
}
