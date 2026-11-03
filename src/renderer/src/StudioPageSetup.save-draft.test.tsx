// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioPageSetup } from './StudioPageSetup'
import type { ScorePageSetup } from '../../score-core'

const notice = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
afterEach(cleanup)
function setup() {
  const command = vi.fn(), save = vi.fn()
  const listener = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') save() }
  window.addEventListener('keydown', listener)
  function Editor() {
    const [value, setValue] = useState<Required<ScorePageSetup>>({ pageSize: 'a4', orientation: 'portrait', pageMarginMm: 8, staffSizePercent: 100, systemSpacingPercent: 100 })
    return <StudioPageSetup theme="light" value={value} preset="" presets={[]} sizes={[]} orientations={[]}
      onPreset={() => {}} onChange={patch => { command(patch); setValue(v => ({ ...v, ...patch })) }}
      showGuides={false} onGuides={() => {}} resetDisabled onReset={() => {}} />
  }
  render(<Editor />)
  const field = screen.getByRole('spinbutton', { name: 'PDF 여백 mm' })
  field.focus()
  return { field, command, save, dispose: () => window.removeEventListener('keydown', listener) }
}
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }]
it.each(modifiers.flatMap(modifier => [17, 31].map(draft => ({ modifier, draft }))))('studio.page-margin-save-draft blocks repeated $draft save and save-as with $modifier', ({ modifier, draft }) => {
  const { field, command, save, dispose } = setup()
  try {
    fireEvent.change(field, { target: { value: String(draft) } })
    for (let n = 0; n < 2; n++) fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
    expect(save).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled()
    expect(field).toHaveValue(draft); expect(field).toHaveFocus()
    expect(field).toHaveAccessibleDescription(notice)
    if (draft === 17) expect(field).not.toHaveAttribute('aria-invalid', 'true')
  } finally { dispose() }
})
it.each(['untouched', 'returned'] as const)('studio.page-margin-save-draft keeps the existing shortcut for $s equal values', kind => {
  const { field, command, save, dispose } = setup()
  try {
    if (kind === 'returned') { fireEvent.change(field, { target: { value: '17' } }); fireEvent.change(field, { target: { value: '8' } }) }
    fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true })
    expect(save).toHaveBeenCalledOnce(); expect(command).not.toHaveBeenCalled(); expect(screen.queryByText(notice)).not.toBeInTheDocument()
  } finally { dispose() }
})
it.each(['Enter', 'Escape'] as const)('studio.page-margin-save-draft $s clears guidance without duplicate commands before retry', key => {
  const { field, command, save, dispose } = setup()
  try {
    fireEvent.change(field, { target: { value: '17' } }); fireEvent.keyDown(field, { key: 's', code: 'KeyS', metaKey: true })
    expect(field).toHaveAccessibleDescription(notice); expect(save).not.toHaveBeenCalled()
    fireEvent.keyDown(field, { key, code: key }); fireEvent.blur(field)
    expect(field).toHaveValue(key === 'Enter' ? 17 : 8)
    expect(command).toHaveBeenCalledTimes(key === 'Enter' ? 1 : 0)
    if (key === 'Enter') expect(command).toHaveBeenCalledWith({ pageMarginMm: 17 })
    expect(screen.queryByText(notice)).not.toBeInTheDocument()
    fireEvent.keyDown(field, { key: 's', code: 'KeyS', metaKey: true }); expect(save).toHaveBeenCalledOnce()
  } finally { dispose() }
})
it('studio.page-margin-save-draft does not save or show confirmation guidance during composition', () => {
  const { field, command, save, dispose } = setup()
  try {
    fireEvent.compositionStart(field); fireEvent.change(field, { target: { value: '17' } })
    fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true })
    fireEvent.keyDown(field, { key: 'Enter', code: 'Enter', isComposing: true, keyCode: 229 })
    expect(save).not.toHaveBeenCalled(); expect(command).not.toHaveBeenCalled(); expect(screen.queryByText(notice)).not.toBeInTheDocument()
    fireEvent.compositionEnd(field); fireEvent.keyDown(field, { key: 'Escape', code: 'Escape' }); fireEvent.blur(field)
    expect(field).toHaveValue(8); expect(command).not.toHaveBeenCalled()
  } finally { dispose() }
})
