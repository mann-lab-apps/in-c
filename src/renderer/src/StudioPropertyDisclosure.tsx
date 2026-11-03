import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Accordion } from '@ddirori/ui'

const RevealPropertyDisclosure = createContext<(() => void) | undefined>(undefined)

// Private owner adapter; the public Accordion still controls its own DOM.
export const useRevealPropertyDisclosure = () => useContext(RevealPropertyDisclosure)

/** Local composition: the public accordion owns its appearance and activation. */
export function StudioPropertyDisclosure({ title, className, children }: {
  title: string
  className: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const reveal = useCallback(() => setOpen(true), [])
  return <div className={className} onKeyDown={event => {
    if (event.nativeEvent.isComposing || event.keyCode === 229) {
      event.stopPropagation()
      if ((event.target as HTMLElement).tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) event.preventDefault()
      return
    }
    // Keep the button's native Enter/Space activation, but not global playback.
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
  }}>
    <RevealPropertyDisclosure.Provider value={reveal}>
    <Accordion title={title} open={open} onOpenChange={setOpen}>{children}</Accordion>
    </RevealPropertyDisclosure.Provider>
  </div>
}
