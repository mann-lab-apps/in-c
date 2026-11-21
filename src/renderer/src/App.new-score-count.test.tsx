// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function wizard() {
  const { App } = await import('./App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
  const dialog = within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
  return { dialog, field: dialog.getByRole('spinbutton', { name: '마디 수' }), form: dialog.getByRole('form', { name: '새 악보 만들기' }) }
}

it('retains empty and out-of-range count drafts without replacing the current score', async () => {
  const { field, form } = await wizard(), original = structuredClone(playbackMockState.lastScore)
  for (const value of ['', '0', '-1', '65', '2.5', '999']) {
    fireEvent.change(field, { target: { value } })
    expect(field).toHaveValue(value === '' ? null : Number(value))
    fireEvent.submit(form)
    expect(field).toHaveValue(value === '' ? null : Number(value))
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveFocus()
    expect(screen.getByRole('dialog', { name: '새 악보 만들기' })).toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(original)
  }
})

it('reports blur errors without clamping and clears them after a valid correction', async () => {
  const { field } = await wizard()
  fireEvent.change(field, { target: { value: '65' } }); fireEvent.blur(field)
  expect(field).toHaveValue(65); expect(field).toHaveAttribute('aria-invalid', 'true')
  fireEvent.change(field, { target: { value: '2' } }); fireEvent.blur(field)
  expect(field).toHaveValue(2); expect(field).not.toHaveAttribute('aria-invalid', 'true')
})

it.each([1, 2, 64])('creates exactly %i bars per new staff and preserves note undo/native', async count => {
  const { dialog, field, form } = await wizard()
  if (count === 2) fireEvent.click(dialog.getByRole('button', { name: '피아노 grand staff 템플릿' }))
  fireEvent.change(field, { target: { value: String(count) } }); fireEvent.submit(form)
  expect(screen.queryByRole('dialog', { name: '새 악보 만들기' })).not.toBeInTheDocument()
  const empty = structuredClone(playbackMockState.lastScore!)
  const staves = empty.parts.flatMap(p => p.staves)
  expect(staves).toHaveLength(count === 2 ? 2 : 1)
  for (const staff of staves) expect(staff.measures).toHaveLength(count)
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  fireEvent.keyDown(window, { key: '5', code: 'Digit5' })
  fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
  const entered = structuredClone(playbackMockState.lastScore!)
  expect(entered.parts[0].staves[0].measures[0].voices[0].events[0].type).toBe('note')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(empty)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(entered)
  expect(decodeNativeProject(encodeNativeProject(createNativeProject(entered))).score).toEqual(entered)
})

it('isolates composition, cancel and reopening from the previous document and invalid draft', async () => {
  const { dialog, field, form } = await wizard(), original = structuredClone(playbackMockState.lastScore)
  fireEvent.change(field, { target: { value: '65' } }); fireEvent.blur(field)
  fireEvent.change(field, { target: { value: '2' } }); fireEvent.compositionStart(field)
  fireEvent.submit(form); fireEvent.keyDown(field, { key: 'Escape', isComposing: true })
  expect(playbackMockState.lastScore).toEqual(original)
  expect(screen.getByRole('dialog', { name: '새 악보 만들기' })).toBeInTheDocument()
  fireEvent.compositionEnd(field); fireEvent.click(dialog.getByRole('button', { name: '취소' }))
  expect(playbackMockState.lastScore).toEqual(original)
  fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
  const reopened = within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('spinbutton', { name: '마디 수' })
  expect(reopened).toHaveValue(8); expect(reopened).not.toHaveAttribute('aria-invalid', 'true')
})
