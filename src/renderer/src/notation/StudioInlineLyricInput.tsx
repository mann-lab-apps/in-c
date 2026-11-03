import { useLayoutEffect, useRef } from 'react'
import { Input } from '@ddirori/ui'
import type { LyricEditorAnchor, LyricEditorRestore } from './lyric-editor-state'
import '../studio-inline-lyric-input.css'

export interface InlineLyricEditor extends LyricEditorAnchor {
  syllabic: 'single' | 'begin' | 'middle' | 'end'
  extend?: boolean
  onCommit: (
    text: string,
    options?: {
      syllabic?: 'single' | 'begin' | 'middle' | 'end'
      extend?: boolean
      moveNext?: boolean
    }
  ) => void
  onMoveVerse: (direction: 1 | -1) => void
}

// React owns the public control; the existing notation renderer owns its anchor.
export function StudioInlineLyricInput({ editor, restore, foreignObject, x, y, theme }: {
  editor: InlineLyricEditor; restore: LyricEditorRestore
  foreignObject: SVGForeignObjectElement; x: number; y: number; theme: 'light' | 'dark'
}) {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const node = root.current
    if (!node) return
    const place = () => {
      const matrix = foreignObject.ownerSVGElement?.getScreenCTM?.()
      const scale = Math.max(0.01, Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0))
      // A score zoom must not shrink the public input's32/48px screen target.
      node.style.transform = `scale(${1 / scale})`
      foreignObject.setAttribute('x', String(x - 74 / scale))
      foreignObject.setAttribute('y', String(y - 22 / scale))
      foreignObject.setAttribute('width', String(148 / scale))
      foreignObject.setAttribute('height', String((node.getBoundingClientRect().height || 56) / scale))
    }
    place()
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place)
    observer?.observe(node)
    if (foreignObject.ownerSVGElement) observer?.observe(foreignObject.ownerSVGElement)
    window.addEventListener('resize', place)
    return () => { observer?.disconnect(); window.removeEventListener('resize', place) }
  }, [foreignObject, x, y])
  useLayoutEffect(() => {
    const input = root.current?.querySelector('input')
    if (!input) return
    Object.assign(input.dataset, { eventId: editor.eventId, lyricNumber: String(editor.number),
      documentKey: String(editor.documentKey ?? ''), focusRequest: String(editor.focusRequest ?? 0), sourceValue: editor.value })
    delete input.dataset.editorReplacing
    let composing = false, commitAfterComposition = false, suppressNextBlur = false
    const stop = (event: Event) => { event.stopPropagation(); event.stopImmediatePropagation() }
    const commit = (options?: Parameters<InlineLyricEditor['onCommit']>[1]) => {
      if (input.dataset.editorReplacing === 'true') return
      editor.onCommit(input.value, { syllabic: editor.syllabic, extend: editor.extend, ...options })
    }
    const listeners: [string, EventListener][] = []
    const bind = (type: string, handler: EventListener) => { input.addEventListener(type, handler); listeners.push([type, handler]) }
    bind('beforeinput', stop); bind('input', stop)
    bind('compositionstart', event => { stop(event); composing = true; input.dataset.editorComposing = 'true' })
    bind('compositionend', event => {
      stop(event); composing = false; input.dataset.editorComposing = 'false'
      if (commitAfterComposition) { commitAfterComposition = false; commit() }
    })
    bind('blur', () => {
      if (input.dataset.editorReplacing === 'true') return
      if (suppressNextBlur) { suppressNextBlur = false; return }
      if (composing) { commitAfterComposition = true; return }
      commit()
    })
    bind('keydown', event => {
      stop(event)
      const key = event as KeyboardEvent
      if (key.isComposing || composing || key.key === 'Process' || key.keyCode === 229) return
      if (key.key === 'ArrowUp' || key.key === 'ArrowDown') {
        key.preventDefault(); commit(); editor.onMoveVerse(key.key === 'ArrowDown' ? 1 : -1)
      } else if (key.key === 'Enter') { key.preventDefault(); commit({ moveNext: true }) }
      else if (key.key === '_') { key.preventDefault(); commit({ syllabic: 'single', extend: true, moveNext: true }) }
      else if (key.key === 'Escape') {
        key.preventDefault()
        const restoreScoreFocus = document.activeElement === input
        input.value = editor.value
        suppressNextBlur = restoreScoreFocus
        input.blur()
        if (restoreScoreFocus) foreignObject.closest<HTMLElement>('.score-canvas')?.focus({ preventScroll: true })
      }
    })
    if (restore.focus) {
      input.focus()
      if (restore.draft) input.setSelectionRange(restore.draft.start ?? input.value.length,
        restore.draft.end ?? input.value.length, restore.draft.direction ?? 'none')
    }
    return () => {
      input.dataset.editorReplacing = 'true'
      for (const [type, handler] of listeners) input.removeEventListener(type, handler)
    }
  }, [editor, restore, foreignObject])
  return <div className="studio-inline-lyric-editor ddirori" data-theme={theme} data-density="compact" ref={root}>
    <Input key={`${editor.documentKey}:${editor.eventId}:${editor.number}:${editor.value}`} label="선택 음표 가사" aria-label="선택 음표 가사" labelVisibility="sr-only"
      defaultValue={restore.draft?.value ?? editor.value} maxLength={48} placeholder="가사" type="text" />
  </div>
}
