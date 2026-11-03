// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createFullMeasureRest, createMeasure, createPart, createScore, createStaff, createVoice } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const key = (key: string, code: string, ctrlKey = false) => fireEvent.keyDown(window, { key, code, ctrlKey })

it.each([false, true])('studio.png-settings focuses configuration without executing output; unfinished input=%s', async pending => {
  const project = createNativeProject(createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [createFullMeasureRest({ id: 'target' })] })] })] })] })] }))
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/png-settings.chromatics', fileName: 'png-settings.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(within(document.querySelector('.score-canvas')!).getByRole('button', { name: 'target 선택' }))
  if (pending) { key('n', 'KeyN'); key('3', 'Digit3', true); key('c', 'KeyC') }
  const preview = structuredClone(playbackMockState.lastPreviewScore)
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  fireEvent.click(screen.getByRole('button', { name: '파일' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'PNG 출력 설정' }))
  const page = screen.getByRole('combobox', { name: 'PNG 페이지' })
  await waitFor(() => expect(page).toHaveFocus())
  expect(page).toBeEnabled()
  expect(screen.getByRole('combobox', { name: 'PNG 해상도' })).toBeEnabled()
  const output = screen.getByRole('button', { name: 'PNG 내보내기' })
  if (pending) {
    expect(output).toBeDisabled()
    expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  } else expect(output).toBeEnabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(playbackMockState.lastPreviewScore).toEqual(preview)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(window.inC.png.save).not.toHaveBeenCalled()
  expect(window.inC.project.save).not.toHaveBeenCalled()
})
