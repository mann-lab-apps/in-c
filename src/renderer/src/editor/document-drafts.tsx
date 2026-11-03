import { createContext, useCallback, useContext, useLayoutEffect, useRef } from 'react'

interface DocumentDraftGuard {
  workspace: 'measure' | 'note' | 'notation' | 'document' | 'export' | 'span-properties'
  hasPendingValue: (input: HTMLInputElement) => boolean
  isComposing: () => boolean
  onBlocked: () => void
}
export interface PendingDocumentDraft extends DocumentDraftGuard {
  input: HTMLInputElement
}

// An App-owned UI registry, not score/project data or a global singleton.
// Each adapter retains its own normalization and Enter/blur/IME contracts.
export function createDocumentDraftRegistry() {
  const entries = new Map<symbol, { read: () => DocumentDraftGuard & { input: HTMLInputElement | null }; sequence: number }>()
  let sequence = 0
  return {
    register(key: symbol, read: () => DocumentDraftGuard & { input: HTMLInputElement | null }) {
      const entry = { read, sequence: ++sequence }
      entries.set(key, entry)
      return () => { if (entries.get(key) === entry) entries.delete(key) }
    },
    touch(key: symbol) { const entry = entries.get(key); if (entry) entry.sequence = ++sequence },
    findPending(): PendingDocumentDraft | undefined {
      let best: { pending: PendingDocumentDraft; active: boolean; sequence: number } | undefined
      for (const entry of entries.values()) {
        const guard = entry.read(), input = guard.input
        if (!input?.isConnected || input.disabled || !guard.hasPendingValue(input)) continue
        const active = input.ownerDocument.activeElement === input
        if (!best || (active && !best.active) || (active === best.active && entry.sequence > best.sequence)) {
          best = { pending: { ...guard, input }, active, sequence: entry.sequence }
        }
      }
      return best?.pending
    }
  }
}

export const DocumentDraftContext = createContext<ReturnType<typeof createDocumentDraftRegistry> | undefined>(undefined)

export function useDocumentDraftSaveGuard(guard: DocumentDraftGuard) {
  const registry = useContext(DocumentDraftContext)
  const key = useRef(Symbol('document draft'))
  const input = useRef<HTMLInputElement | null>(null)
  const committedGuard = useRef(guard)
  useLayoutEffect(() => { committedGuard.current = guard })
  useLayoutEffect(() => registry?.register(key.current, () => ({ ...committedGuard.current, input: input.current })), [registry])
  return useCallback((element: HTMLInputElement) => { input.current = element; registry?.touch(key.current) }, [registry])
}
