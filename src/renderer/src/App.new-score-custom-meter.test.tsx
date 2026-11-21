// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function wizard() {
  const { App } = await import('./App')
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
  return within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
}
async function custom(d: Awaited<ReturnType<typeof wizard>>) {
  fireEvent.click(d.getByRole('combobox', { name: '박자표' }))
  fireEvent.click(screen.getByRole('option', { name: '사용자 지정' }))
  return d.getByRole('spinbutton', { name: '새 악보 박자표 분자' })
}

it.each([{ beats: 5, beatType: 4 }, { beats: 7, beatType: 8 }])(
  'creates $beats/$beatType on every new staff/bar and preserves input undo and native/XML', async meter => {
    const d = await wizard()
    fireEvent.click(d.getByRole('button', { name: '피아노 grand staff 템플릿' }))
    const numerator = await custom(d)
    fireEvent.change(numerator, { target: { value: String(meter.beats) } })
    fireEvent.click(d.getByRole('combobox', { name: '새 악보 박자표 분모' }))
    fireEvent.click(screen.getByRole('option', { name: String(meter.beatType) }))
    fireEvent.submit(d.getByRole('form', { name: '새 악보 만들기' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '새 악보 만들기' })).not.toBeInTheDocument())
    const empty = structuredClone(playbackMockState.lastScore!)
    expect(empty.parts[0].staves).toHaveLength(2)
    for (const staff of empty.parts.flatMap(p => p.staves)) {
      expect(staff.measures).toHaveLength(8)
      for (const bar of staff.measures) expect(bar.timeSignature).toEqual(meter)
    }
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
    for (const staff of parseMusicXml(serializeMusicXml(entered)).parts.flatMap(p => p.staves)) {
      for (const bar of staff.measures) expect(bar.timeSignature).toEqual(meter)
    }
  }
)

it('keeps invalid meter drafts and IME local; cancel preserves the previous score', async () => {
  const d = await wizard(), before = structuredClone(playbackMockState.lastScore)
  const field = await custom(d), form = d.getByRole('form', { name: '새 악보 만들기' })
  for (const value of ['', '0', '-1', '129', '3.5']) {
    fireEvent.change(field, { target: { value } }); fireEvent.submit(form)
    expect(field).toHaveValue(value === '' ? null : Number(value))
    expect(field).toHaveAttribute('aria-invalid', 'true'); expect(field).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(before)
  }
  fireEvent.change(field, { target: { value: '7' } })
  fireEvent.compositionStart(field); fireEvent.submit(form)
  fireEvent.keyDown(field, { key: 'Escape', isComposing: true })
  expect(playbackMockState.lastScore).toEqual(before)
  expect(screen.getByRole('dialog', { name: '새 악보 만들기' })).toBeInTheDocument()
  fireEvent.compositionEnd(field)
  fireEvent.click(d.getByRole('button', { name: '취소' }))
  expect(playbackMockState.lastScore).toEqual(before)
})

it('seeds custom values from the explicit preset and revalidates pickup without shrinking it', async () => {
  const d = await wizard(), before = structuredClone(playbackMockState.lastScore)
  fireEvent.click(d.getByRole('combobox', { name: '박자표' })); fireEvent.click(screen.getByRole('option', { name: '6/8' }))
  expect(await custom(d)).toHaveValue(6)
  expect(d.getByRole('combobox', { name: '새 악보 박자표 분모' })).toHaveTextContent('8')
  fireEvent.click(d.getByRole('combobox', { name: '박자표' })); fireEvent.click(screen.getByRole('option', { name: '2/4' }))
  expect(await custom(d)).toHaveValue(2)
  expect(d.getByRole('combobox', { name: '새 악보 박자표 분모' })).toHaveTextContent('4')
  fireEvent.click(d.getByRole('checkbox', { name: '첫 마디를 못갖춘마디로 만들기' }))
  const pickup = d.getByRole('spinbutton', { name: '못갖춘마디 개수' })
  fireEvent.change(pickup, { target: { value: '4' } })
  fireEvent.submit(d.getByRole('form', { name: '새 악보 만들기' }))
  expect(pickup).toHaveAttribute('aria-invalid', 'true'); expect(pickup).toHaveValue(4)
  expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.change(d.getByRole('spinbutton', { name: '새 악보 박자표 분자' }), { target: { value: '3' } })
  fireEvent.submit(d.getByRole('form', { name: '새 악보 만들기' }))
  const bar = playbackMockState.lastScore!.parts[0].staves[0].measures[0]
  expect(bar.timeSignature).toEqual({ beats: 3, beatType: 4 })
  expect(bar.timing).toEqual({ type: 'pickup', durationTicks: 26880 })
})
