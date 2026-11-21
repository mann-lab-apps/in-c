// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { decodeNativeProject } from '../../project/schema'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
import { useStudioPaletteWorkspace } from './StudioNotationPalette'

registerAppTestHooks()
beforeEach(() => { Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() }) })
const defaults = ['음자리표·조표·박자표', '셈여림', '표현 기호', '장식음', '정지 기호', '범위 기호', '텍스트', '반복·볼타']
const orderKey = 'studio.palette.order.v1'

it.each(['not-json', '{}', 'null', '42'])('uses all eight families for malformed saved order %s', value => {
  localStorage.setItem(orderKey, value)
  const hook = renderHook(() => useStudioPaletteWorkspace())
  expect(hook.result.current.order).toEqual(defaults)
  expect(JSON.parse(localStorage.getItem(orderKey)!)).toEqual(defaults)
})

it('normalizes duplicates/unknown names and preserves order/open/single across remount and reset', () => {
  localStorage.setItem(orderKey, JSON.stringify(['장식음', 'unknown', '장식음', 12]))
  localStorage.setItem('studio.palette-families.v1', JSON.stringify({ '장식음': true, '셈여림': true }))
  localStorage.setItem('studio.palette.single-family.v1', 'true')
  let hook = renderHook(() => useStudioPaletteWorkspace())
  expect(hook.result.current.order).toEqual(['장식음', ...defaults.filter(x => x !== '장식음')])
  expect(hook.result.current.open['장식음']).toBe(true)
  expect(Object.values(hook.result.current.open).filter(Boolean)).toHaveLength(1)
  const opened = { ...hook.result.current.open }
  act(() => hook.result.current.moveFamily('장식음', -1))
  expect(hook.result.current.order[0]).toBe('장식음')
  act(() => hook.result.current.moveFamily('장식음', 1))
  const saved = [...hook.result.current.order]
  expect(saved[1]).toBe('장식음'); expect(hook.result.current.open).toEqual(opened)
  hook.unmount(); hook = renderHook(() => useStudioPaletteWorkspace())
  expect(hook.result.current.order).toEqual(saved); expect(hook.result.current.single).toBe(true)
  act(() => hook.result.current.reset())
  expect(hook.result.current.order).toEqual(defaults); expect(hook.result.current.single).toBe(false)
  expect(hook.result.current.open['셈여림']).toBe(true)
})

it('retains session ordering when local storage cannot read or write', () => {
  const storage = window.localStorage, owner = Object.getPrototypeOf(storage) === Storage.prototype ? Storage.prototype : storage
  const read = vi.spyOn(owner, 'getItem').mockImplementation(() => { throw Error('unavailable') })
  const write = vi.spyOn(owner, 'setItem').mockImplementation(() => { throw Error('unavailable') })
  try {
    const hook = renderHook(() => useStudioPaletteWorkspace())
    expect(hook.result.current.order).toEqual(defaults)
    act(() => hook.result.current.moveFamily('셈여림', -1))
    expect(hook.result.current.order[0]).toBe('셈여림')
    expect(hook.result.current.open['셈여림']).toBe(true)
    hook.unmount()
  } finally { read.mockRestore(); write.mockRestore() }
})

async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  localStorage.setItem('chromatics.dock-widths.v1', JSON.stringify({ palette: 207, properties: 360 }))
  const { App } = await import('./App'); render(<App />)
  const source = structuredClone(playbackMockState.lastScore!)
  fireEvent.click(screen.getByRole('button', { name: `${source.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택` }))
  const palette = within(screen.getByRole('complementary', { name: '고정 팔레트' }))
  fireEvent.click(palette.getByRole('button', { name: '팔레트 도크 설정' }))
  return { source, palette, settings: within(screen.getByRole('dialog', { name: '팔레트 도크 설정' })) }
}
const headers = () => [...document.querySelectorAll<HTMLButtonElement>('.studio-notation-palette .dd-accordion > button[aria-expanded]')]

it('moves families in the public settings, preserves search/keyboard/native and resets without changing dock widths', async () => {
  const { source, palette, settings } = await setup()
  const picker = settings.getByRole('combobox', { name: '순서를 바꿀 팔레트' })
  fireEvent.click(picker); fireEvent.click(screen.getByRole('option', { name: '셈여림' }))
  fireEvent.click(settings.getByRole('button', { name: '선택 팔레트 위로 이동' }))
  expect(headers().map(n => n.textContent)).toEqual(['셈여림', ...defaults.filter(x => x !== '셈여림')])
  expect(settings.getByRole('button', { name: '선택 팔레트 위로 이동' })).toBeDisabled()
  expect(picker).toHaveFocus()
  fireEvent.click(picker); fireEvent.click(screen.getByRole('option', { name: '범위 기호' }))
  fireEvent.click(settings.getByRole('button', { name: '선택 팔레트 위로 이동' }))
  fireEvent.keyDown(picker, { key: 'Escape' })
  const search = palette.getByRole('searchbox', { name: '표기 기호 검색' })
  fireEvent.change(search, { target: { value: '기호' } })
  expect(headers().map(n => n.textContent)).toEqual(['표현 기호', '범위 기호', '정지 기호'])
  fireEvent.click(palette.getByRole('button', { name: '표기 기호 검색 지우기' }))
  headers()[0].focus(); fireEvent.keyDown(headers()[0], { key: 'ArrowDown' }); expect(headers()[1]).toHaveFocus()
  fireEvent.click(palette.getByRole('button', { name: '팔레트 도크 설정' }))
  fireEvent.click(screen.getByRole('button', { name: '팔레트 표시 기본값' }))
  expect(headers().map(n => n.textContent)).toEqual(defaults)
  expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({ palette: 207, properties: 360 })
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(screen.getByRole('button', { name: '팔레트 표시 기본값' }), { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: '파일' })); fireEvent.click(screen.getByRole('menuitem', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
})

it('keeps an open order choice local and returns from the closed picker with native F6 semantics', async () => {
  const { settings, source } = await setup(), picker = settings.getByRole('combobox', { name: '순서를 바꿀 팔레트' })
  fireEvent.click(picker); fireEvent.keyDown(picker, { key: 'F6' })
  expect(screen.getByRole('listbox', { name: '순서를 바꿀 팔레트' })).toBeInTheDocument()
  fireEvent.keyDown(picker, { key: 'Escape' }); expect(picker).toHaveAttribute('aria-expanded', 'false')
  fireEvent.keyDown(picker, { key: 'F6' })
  expect(document.activeElement?.closest('.score-canvas')).not.toBeNull()
  expect(screen.queryByRole('dialog', { name: '팔레트 도크 설정' })).not.toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(source)
})

it('preserves an existing note redo across a palette order change', async () => {
  const { source, palette, settings } = await setup()
  fireEvent.keyDown(settings.getByRole('spinbutton', { name: '팔레트 도크 폭' }), { key: 'Escape' })
  const note = screen.getByRole('button', { name: `${source.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택` })
  note.focus(); fireEvent.keyDown(note, { key: 'ArrowUp', code: 'ArrowUp' })
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed).not.toEqual(source)
  fireEvent.keyDown(note, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.click(palette.getByRole('button', { name: '팔레트 도크 설정' }))
  const q = within(screen.getByRole('dialog', { name: '팔레트 도크 설정' })), picker = q.getByRole('combobox', { name: '순서를 바꿀 팔레트' })
  fireEvent.click(picker); fireEvent.click(screen.getByRole('option', { name: '셈여림' }))
  fireEvent.click(q.getByRole('button', { name: '선택 팔레트 위로 이동' })); fireEvent.keyDown(picker, { key: 'F6' })
  fireEvent.keyDown(document.activeElement!, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(headers()[0]).toHaveTextContent('셈여림')
})
