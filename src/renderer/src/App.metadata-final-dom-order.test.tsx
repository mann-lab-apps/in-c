// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { metadataNoEditFixture, metadataNoEditFields } from '../../testing/metadata-no-edit-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const scenarios = ['changed', 'unchanged', 'refocus-cancel'] as const

it.each(metadataNoEditFields.flatMap(field => scenarios.map(scenario => ({ field, scenario }))))(
  'studio.metadata-final-dom-order $field $scenario preserves late final input and owner cancellation',
  async ({ field, scenario }) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const data = metadataNoEditFixture(field, 'blur')
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({
      filePath: '/fixture/source.chromatics', fileName: 'source.chromatics',
      contents: encodeNativeProject(data.project)
    })
    vi.mocked(window.inC.project.save).mockResolvedValue({
      filePath: '/fixture/saved.chromatics', fileName: 'saved.chromatics'
    })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(data.project.score))
    fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
    fireEvent.click(screen.getByRole('button', {
      name: field === 'partTitle' ? '파트보 제목 편집' : `${data.label} 편집`
    }))
    const input = screen.getByRole('textbox', { name: data.label }) as HTMLInputElement
    const destination = screen.getByRole('button', { name: '악보로 이동' })
    act(() => input.focus())
    fireEvent.compositionStart(input)
    act(() => destination.focus())
    expect(destination).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')

    // Model the browser's final DOM value before React's change callback.
    // Deliberately do not dispatch input/change or update the controlled draft.
    const finalValue = scenario === 'unchanged' ? data.value : '최종 조합값'
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, finalValue)
    if (scenario === 'refocus-cancel') act(() => input.focus())
    await act(async () => { fireEvent.compositionEnd(input) })
    if (scenario === 'refocus-cancel') {
      expect(input).toHaveFocus()
      expect(input).toHaveValue(finalValue)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      fireEvent.keyDown(input, { key: 'Escape' })
    } else {
      await waitFor(() => expect(screen.queryByRole('textbox', { name: data.label })).not.toBeInTheDocument())
      expect(destination).toHaveFocus()
    }

    const expected = structuredClone(data.project)
    if (scenario === 'changed') {
      if (field === 'partTitle') expected.partLayouts[0]!.title = finalValue
      else expected.score[field] = finalValue
    }
    await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)).toEqual(expected)
    if (scenario === 'changed') {
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      await act(async () => fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(data.project)
    }
    const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
    fireEvent.click(menu.getByRole('button', { name: '편집' }))
    expect(menu.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled()
  }
)
