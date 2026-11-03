// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(['menu-selection', 'menu-tuplet', 'search-selection'] as const)(
  'opens the existing score/part view control without a command: %s', async mode => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App'); render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const rest = preview.getAttribute('data-all-event-pitches')!.split(',').filter(v => v.endsWith(':rest')).at(-1)!.split(':')[4]
    fireEvent.click(screen.getByRole('button', { name: `${rest} 선택` }))
    if (mode === 'menu-tuplet') {
      fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
      fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
      expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
    }
    const source = structuredClone(playbackMockState.lastScore!)
    const pitches = preview.getAttribute('data-all-event-pitches')
    const selected = preview.getAttribute('data-selected-event-id')
    const active = document.querySelector('.studio-input-context')!.getAttribute('data-input-active')
    if (mode === 'search-selection') {
      fireEvent.click(screen.getByRole('button', { name: '도구' }))
      fireEvent.click(screen.getByRole('menuitem', { name: '명령 검색' }))
      fireEvent.change(screen.getByRole('searchbox', { name: '명령 찾기' }), { target: { value: '총보·파트보 보기' } })
      fireEvent.click(screen.getByRole('button', { name: '보기 · 총보·파트보 보기' }))
    } else {
      fireEvent.click(screen.getByRole('button', { name: '보기' }))
      fireEvent.click(screen.getByRole('menuitem', { name: '총보·파트보 보기' }))
    }
    const control = await screen.findByRole('combobox', { name: '악보 보기' })
    await waitFor(() => expect(control).toHaveFocus())
    expect(control).toHaveTextContent('총보')
    expect(screen.queryByRole('textbox', { name: '현재 파트 이름' })).not.toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: /빠르기.*BPM/ })).not.toBeInTheDocument()
    expect(preview.getAttribute('data-all-event-pitches')).toBe(pitches)
    expect(preview.getAttribute('data-selected-event-id')).toBe(selected)
    expect(document.querySelector('.studio-input-context')!.getAttribute('data-input-active')).toBe(active)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    if (mode === 'menu-tuplet') expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(playbackMockState.play).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '형식' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '악보 설정' }))
    expect(await screen.findByRole('textbox', { name: '현재 파트 이름' })).toBeVisible()
    expect(screen.getAllByRole('combobox', { name: '악보 보기' })).toHaveLength(1)
    expect(playbackMockState.lastScore).toEqual(source)
  })

it.each(['closed', 'open', 'composing'] as const)('respects score-view keyboard ownership: %s', async mode => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { App } = await import('./App'); render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '보기' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '총보·파트보 보기' }))
  const control = await screen.findByRole('combobox', { name: '악보 보기' })
  await waitFor(() => expect(control).toHaveFocus())
  const source = structuredClone(playbackMockState.lastScore!)
  const canvas = screen.getByLabelText('악보 캔버스')
  canvas.scrollIntoView = vi.fn()
  if (mode === 'open') fireEvent.click(control)
  act(() => control.focus())
  fireEvent.keyDown(control, { key: 'F6', code: 'F6', isComposing: mode === 'composing' })
  if (mode === 'closed') {
    expect(canvas).toHaveFocus()
    expect(canvas.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest', behavior: 'instant' })
  } else {
    expect(control).toHaveFocus()
    expect(canvas.scrollIntoView).not.toHaveBeenCalled()
  }
  if (mode === 'open') expect(control).toHaveAttribute('aria-expanded', 'true')
  expect(playbackMockState.lastScore).toEqual(source)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(playbackMockState.play).not.toHaveBeenCalled()
})
