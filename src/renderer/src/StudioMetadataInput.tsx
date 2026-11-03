import { useLayoutEffect, useRef, useState, type ComponentProps } from 'react'
import { Input } from '@ddirori/ui'
import { draftSaveGuidance, isDocumentSaveShortcut } from './editor/draft-save'
import { useDocumentDraftSaveGuard } from './editor/document-drafts'

// Composition belongs to this document/field session, not the shared Input API.
export function StudioMetadataInput({ theme, onCommit, saveGuard, ...props }: Omit<ComponentProps<typeof Input>,
  'labelVisibility' | 'onBlur' | 'onCompositionStart' | 'onCompositionEnd'> & {
  theme: 'light' | 'dark'
  onCommit: (value: string, edited: boolean) => void
  saveGuard?: { hasPendingValue: (input: HTMLInputElement) => boolean; onBlocked: () => void }
}) {
  const [saveNotice, setSaveNotice] = useState(false)
  const edited = useRef(false)
  const initialValue = useRef(String(props.value ?? ''))
  const composing = useRef(false)
  const hasPendingValue = (input: HTMLInputElement) => composing.current || ((edited.current || input.value !== initialValue.current) && !!saveGuard?.hasPendingValue(input))
  const onBlocked = () => { setSaveNotice(true); saveGuard?.onBlocked() }
  const trackInput = useDocumentDraftSaveGuard({ workspace: 'document', hasPendingValue, isComposing: () => composing.current, onBlocked })
  const pendingBlur = useRef<HTMLInputElement | undefined>(undefined)
  const request = useRef(0)
  const alive = useRef(true)
  const commit = useRef(onCommit)
  commit.current = onCommit
  // Final IME DOM input can precede the controlled change callback. Do not
  // mistake that real value change for an untouched inspection.
  const commitInput = (input: HTMLInputElement) => commit.current(input.value, edited.current || input.value !== initialValue.current)
  useLayoutEffect(() => {
    alive.current = true
    return () => { alive.current = false; request.current += 1; pendingBlur.current = undefined }
  }, [])
  return <div className="studio-metadata-editor ddirori" data-theme={theme} data-density="compact">
    <Input {...props} labelVisibility="sr-only"
      aria-description={saveNotice ? draftSaveGuidance : props['aria-description']}
      onChange={event => { edited.current = true; trackInput(event.currentTarget); setSaveNotice(false); props.onChange?.(event) }}
      onFocus={event => { request.current += 1; pendingBlur.current = undefined; props.onFocus?.(event) }}
      onCompositionStart={event => {
        event.stopPropagation(); trackInput(event.currentTarget); composing.current = true; request.current += 1; pendingBlur.current = undefined
      }}
      onCompositionEnd={event => {
        event.stopPropagation(); composing.current = false
        const input = pendingBlur.current
        pendingBlur.current = undefined
        if (!input) return
        const token = ++request.current
        // Read after the native final input/change; a new owner or Escape cancels it.
        queueMicrotask(() => {
          if (alive.current && request.current === token && input.isConnected) commitInput(input)
        })
      }}
      onBlur={event => {
        if (composing.current) pendingBlur.current = event.currentTarget
        else commitInput(event.currentTarget)
      }}
      onKeyDown={event => {
        if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || event.key === 'Process') {
          event.stopPropagation(); return
        }
        if (saveGuard && isDocumentSaveShortcut(event) && hasPendingValue(event.currentTarget)) {
          event.preventDefault(); event.stopPropagation(); onBlocked(); return
        }
        if (event.key === 'Escape') setSaveNotice(false)
        props.onKeyDown?.(event)
      }} />
  </div>
}
