import { useEffect, useRef, type PropsWithChildren } from 'react'

function returnTarget(): HTMLElement | null {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  // A menu item disappears when its command opens a dialog. Restore its trigger.
  const menu = active?.closest('[role="menu"]')
  if (menu?.id) {
    const trigger = [...document.querySelectorAll<HTMLElement>('[aria-controls]')]
      .find(element => element.getAttribute('aria-controls') === menu.id)
    if (trigger) return trigger
  }
  return active
}

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') &&
      !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden')
}

export function ModalBackdrop({ children, onDismiss, restoreFocusTo }: PropsWithChildren<{
  onDismiss: () => void
  restoreFocusTo?: HTMLElement | null
}>) {
  const backdrop = useRef<HTMLDivElement>(null)
  const opener = useRef(restoreFocusTo ?? returnTarget())
  useEffect(() => {
    const root = backdrop.current!
    if (!root.contains(document.activeElement)) (focusable(root)[0] ?? root).focus()
    return () => { if (opener.current?.isConnected) opener.current.focus() }
  }, [])

  return <div className="modal-backdrop" role="presentation" tabIndex={-1} ref={backdrop}
    onKeyDownCapture={event => {
      // IME confirmation belongs to the input, not a dialog's command handler.
      if (event.nativeEvent.isComposing) event.stopPropagation()
    }}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.nativeEvent.isComposing) return
      if (event.key === 'Escape') { event.preventDefault(); onDismiss(); return }
      if (event.key !== 'Tab') return
      const root = event.currentTarget
      const controls = focusable(root)
      const index = controls.indexOf(document.activeElement as HTMLElement)
      if (controls.length === 0 || (event.shiftKey ? index <= 0 : index < 0 || index === controls.length - 1)) {
        event.preventDefault()
        const target = event.shiftKey ? controls.at(-1) : controls[0]
        ;(target ?? root).focus()
      }
    }}>
    {children}
  </div>
}
