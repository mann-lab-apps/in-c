// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioRepeatTools } from './StudioRepeatTools'
import { repeatSaveDraftFixture, repeatSaveDraftKinds } from '../../testing/repeat-save-draft-fixture'

afterEach(cleanup)
const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
const modifiers = [{ ctrlKey: true }, { metaKey: true, shiftKey: true }]
it.each(repeatSaveDraftKinds.flatMap(kind => modifiers.map(modifier => ({ kind, modifier }))))('studio.repeat-save-draft $kind with $modifier keeps end activation, blank restore and legacy integer coercion', ({ kind, modifier }) => {
  const data = repeatSaveDraftFixture(kind), command = vi.fn(), save = vi.fn()
  function Host() {
    const [times, setTimes] = useState(2), [end, setEnd] = useState(false)
    return <div onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') save() }}><StudioRepeatTools start={false} end={end} times={times} enabled scope="첫 마디" onStart={() => {}} onEnd={() => {}} onVolta={() => {}}
      onTimes={value => { command(value); setTimes(Math.max(2, Math.min(8, Math.round(value)))); setEnd(true) }}/></div>
  }
  render(<Host />)
  const field = screen.getByRole('spinbutton', { name: data.label }); field.focus()
  if (kind === 'same') fireEvent.change(field, { target: { value: '3' } })
  fireEvent.change(field, { target: { value: data.draft } }); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  expect(command).not.toHaveBeenCalled(); expect(field).toHaveFocus(); expect(field).toHaveAccessibleDescription(expect.stringContaining('2–8회'))
  if (data.blocked) {
    expect(save).not.toHaveBeenCalled(); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(command).toHaveBeenCalledTimes(data.changed ? 1 : 0)
    if (data.changed) expect(command).toHaveBeenCalledWith(Number.parseInt(data.draft, 10))
    expect(field).toHaveValue(data.confirmedCount); expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
    expect(screen.getByRole('button', { name: '도돌이표 끝' })).toHaveAttribute('aria-pressed', String(data.changed))
    expect(save).not.toHaveBeenCalled(); field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  }
  expect(save).toHaveBeenCalledOnce()
})
it('studio.repeat-save-draft does not commit during IME and drops the old measure draft and notice', () => {
  const command = vi.fn(), save = vi.fn()
  const host = (id: string, times: number) => <div onKeyDown={save}><StudioRepeatTools key={id} start={false} end times={times} enabled onStart={() => {}} onEnd={() => {}} onVolta={() => {}} onTimes={command}/></div>
  const { rerender } = render(host('first', 2)), field = screen.getByRole('spinbutton')
  field.focus(); fireEvent.compositionStart(field); fireEvent.change(field, { target: { value: '7' } }); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); fireEvent.keyDown(field, { key: 'Enter', isComposing: true, keyCode: 229 }); fireEvent.blur(field)
  expect(command).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled(); expect(field).not.toHaveAccessibleDescription(expect.stringContaining(guidance))
  fireEvent.compositionEnd(field); field.focus(); fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); expect(field).toHaveAccessibleDescription(expect.stringContaining(guidance))
  rerender(host('second', 3)); fireEvent.blur(field); expect(screen.getByRole('spinbutton')).toHaveValue(3); expect(screen.getByRole('spinbutton')).not.toHaveAccessibleDescription(expect.stringContaining(guidance)); expect(command).not.toHaveBeenCalled()
})
