// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioTempoEventInput } from './StudioTempoEventInput'
import { tempoSaveDraftFixture, tempoSaveDraftKinds } from '../../testing/tempo-save-draft-fixture'

afterEach(cleanup)
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }]
it.each(tempoSaveDraftKinds.flatMap(kind => modifiers.map(modifier => ({ kind, modifier }))))('studio.tempo-save-draft $kind with $modifier preserves local confirmation and range help', ({ kind, modifier }) => {
  const data = tempoSaveDraftFixture(kind), command = vi.fn(), save = vi.fn()
  function Host() {
    const [value, setValue] = useState(data.value)
    return <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') save() }}>
      <StudioTempoEventInput value={value} scope="첫 마디 · 0박" count={2} onCommit={text => {
        command(text)
        setValue(text === '' ? undefined : Math.min(240, Math.max(40, Number.parseInt(text, 10))))
      }}/>
    </div>
  }
  render(<Host />)
  const field = screen.getByRole('spinbutton', { name: data.label }); field.focus()
  if (kind === 'empty-control') fireEvent.change(field, { target: { value: '90' } })
  fireEvent.change(field, { target: { value: data.draft } })
  fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  expect(command).not.toHaveBeenCalled()
  expect(field).toHaveFocus()
  expect(field).toHaveAccessibleDescription(expect.stringContaining('40–240 BPM'))
  expect(field).toHaveAccessibleDescription(expect.stringContaining('같은 위치의 지정 2개'))
  if (data.blocked) {
    expect(save).not.toHaveBeenCalled(); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(command).toHaveBeenCalledTimes(data.confirm ? 1 : 0)
    if (data.confirm) expect(command).toHaveBeenCalledWith(data.draft)
    expect(field).toHaveValue(kind === 'remove' ? null : kind === 'change' ? 97 : kind === 'clamp-low' ? 40 : 96)
    expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
    expect(save).not.toHaveBeenCalled()
    field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  }
  expect(save).toHaveBeenCalledOnce()
})
it('studio.tempo-save-draft isolates composition and discards the previous location draft and guidance', () => {
  const commit = vi.fn(), save = vi.fn()
  const host = (owner: string, value: number) => <div onKeyDown={save}><StudioTempoEventInput key={owner} value={value} scope={owner} onCommit={commit}/></div>
  const { rerender } = render(host('first', 96))
  const field = screen.getByRole('spinbutton'); field.focus(); fireEvent.change(field, { target: { value: '97' } })
  fireEvent.compositionStart(field); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); fireEvent.keyDown(field, { key: 'Enter', isComposing: true, keyCode: 229 }); fireEvent.blur(field)
  expect(commit).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
  fireEvent.compositionEnd(field); field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true })
  expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
  rerender(host('second', 88)); fireEvent.blur(field)
  expect(screen.getByRole('spinbutton')).toHaveValue(88); expect(screen.getByRole('spinbutton')).not.toHaveAccessibleDescription(expect.stringContaining(guidance)); expect(commit).not.toHaveBeenCalled()
})
