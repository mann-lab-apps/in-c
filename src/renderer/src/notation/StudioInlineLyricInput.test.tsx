// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StudioInlineLyricInput, type InlineLyricEditor } from './StudioInlineLyricInput'
import type { LyricEditorRestore } from './lyric-editor-state'

afterEach(() => { cleanup(); document.body.replaceChildren() })
function setup(restore: LyricEditorRestore = { defer: false, focus: true }) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const foreignObject = document.createElementNS(svg.namespaceURI, 'foreignObject') as SVGForeignObjectElement
  const host = document.createElement('div')
  const canvas = document.createElement('div')
  canvas.className = 'score-canvas'; canvas.tabIndex = -1
  document.body.append(canvas); canvas.append(svg); svg.append(foreignObject); foreignObject.append(host)
  const editor: InlineLyricEditor = { eventId: 'note-1', number: 2, documentKey: 4, value: '기존',
    syllabic: 'single', onCommit: vi.fn(), onMoveVerse: vi.fn() }
  const props = { editor, restore, foreignObject, x: 100, y: 200, theme: 'dark' as const }
  const view = render(<StudioInlineLyricInput {...props} />, { container: host })
  const input = screen.getByRole('textbox', { name: '선택 음표 가사' }) as HTMLInputElement
  return { ...view, props, editor, input, canvas }
}
it('mounts the public Input with an associated label and existing anchor identity', () => {
  const { input } = setup()
  expect(input.closest('.dd-input-row')).not.toBeNull()
  expect(input.labels![0]!.className).toBe('dd-input-label--sr-only')
  expect(input.dataset.documentKey).toBe('4')
  expect(input.dataset.lyricNumber).toBe('2')
  expect(input.dataset.sourceValue).toBe('기존')
  expect(document.activeElement).toBe(input)
})
it.each(['Enter', '_', 'ArrowDown'] as const)('keeps %s local and forwards the existing lyric command contract', key => {
  const { editor, input } = setup(), global = vi.fn()
  window.addEventListener('keydown', global)
  try {
    fireEvent.input(input, { target: { value: '한글' } })
    fireEvent.keyDown(input, { key })
    expect(editor.onCommit).toHaveBeenCalledTimes(1)
    expect(editor.onCommit).toHaveBeenCalledWith('한글', {
      syllabic: 'single', extend: key === '_' ? true : undefined,
      ...(key === 'ArrowDown' ? {} : { moveNext: true })
    })
    expect(editor.onMoveVerse).toHaveBeenCalledTimes(key === 'ArrowDown' ? 1 : 0)
    expect(global).not.toHaveBeenCalled()
  } finally { window.removeEventListener('keydown', global) }
})
it.each([{ isComposing: true }, { keyCode: 229 }, { key: 'Process' }])('ignores a standalone composition guard %j', flags => {
  const { editor, input } = setup()
  fireEvent.input(input, { target: { value: '미확정' } })
  fireEvent.keyDown(input, { key: 'Enter', ...flags })
  expect(editor.onCommit).not.toHaveBeenCalled()
  expect(input.value).toBe('미확정')
})
it('defers a composing blur until composition ends and ignores composing command keys', () => {
  const { editor, input } = setup()
  fireEvent.compositionStart(input)
  fireEvent.input(input, { target: { value: '조합 중' } })
  for (const key of ['Enter', 'Escape', 'Process']) fireEvent.keyDown(input, { key, keyCode: 229, isComposing: true })
  fireEvent.blur(input)
  expect(editor.onCommit).not.toHaveBeenCalled()
  expect(input.dataset.editorComposing).toBe('true')
  fireEvent.compositionEnd(input)
  expect(editor.onCommit).toHaveBeenCalledTimes(1)
  expect(editor.onCommit).toHaveBeenCalledWith('조합 중', { syllabic: 'single', extend: undefined })
})
it('Escape restores the source without committing and a later edit can still commit', () => {
  const { editor, input, canvas } = setup()
  fireEvent.input(input, { target: { value: '버릴 초안' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(input.value).toBe('기존')
  expect(editor.onCommit).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(canvas)
  input.focus(); fireEvent.input(input, { target: { value: '다시 편집' } }); input.blur()
  expect(editor.onCommit).toHaveBeenCalledTimes(1)
})
it('does not steal another control focus for Escape delivered to an inactive input', () => {
  const { editor, input } = setup({ defer: false, focus: false })
  const button = document.createElement('button'); document.body.append(button); button.focus()
  fireEvent.input(input, { target: { value: '버릴 초안' } }); fireEvent.keyDown(input, { key: 'Escape' })
  expect(input.value).toBe('기존')
  expect(document.activeElement).toBe(button)
  expect(editor.onCommit).not.toHaveBeenCalled()
})
it('retains composition focus and restores the canvas only after composition has ended', () => {
  const { editor, input, canvas } = setup()
  fireEvent.compositionStart(input); fireEvent.input(input, { target: { value: '조합 중' } })
  fireEvent.keyDown(input, { key: 'Escape', isComposing: true, keyCode: 229 })
  expect(document.activeElement).toBe(input)
  expect(input.value).toBe('조합 중')
  expect(editor.onCommit).not.toHaveBeenCalled()
  fireEvent.compositionEnd(input); fireEvent.keyDown(input, { key: 'Escape' })
  expect(input.value).toBe('기존')
  expect(document.activeElement).toBe(canvas)
  expect(editor.onCommit).not.toHaveBeenCalled()
})
it('restores draft and caret and isolates an unmounted document from late native events', () => {
  const { editor, unmount } = setup({ defer: false, focus: true,
    draft: { value: '한글 초안', start: 1, end: 3, direction: 'backward' } })
  const old = screen.getByRole('textbox') as HTMLInputElement
  expect([old.value, old.selectionStart, old.selectionEnd, old.selectionDirection]).toEqual(['한글 초안', 1, 3, 'backward'])
  unmount(); fireEvent.blur(old); fireEvent.compositionEnd(old); fireEvent.keyDown(old, { key: 'Enter' })
  expect(editor.onCommit).not.toHaveBeenCalled()
  expect(old.dataset.editorReplacing).toBe('true')
})
