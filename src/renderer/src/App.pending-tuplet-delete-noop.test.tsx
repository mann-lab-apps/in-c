// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createFullMeasureRest, createMeasure, createPart, createScore, createStaff, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each([0, 1, 2])('studio.pending-tuplet-delete-noop keeps %s members and no history when Native content would be identical', async members => {
  const project = createNativeProject(createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events: [createFullMeasureRest({ id: 'target' })] })] })] })] })] }))
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/noop-rest.chromatics', fileName: 'noop-rest.chromatics', contents: encodeNativeProject(project) })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/fixture/unchanged.chromatics', fileName: 'unchanged.chromatics' })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: 'target 선택' })); fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' })); fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
  for (const [i, letter] of ['c', 'd'].slice(0, members).entries()) fireEvent.keyDown(window, { key: letter, code: i === 0 ? 'KeyC' : 'KeyD' })
  const preview = structuredClone(playbackMockState.lastPreviewScore)
  fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
  expect(playbackMockState.lastScore).toEqual(project.score); expect(playbackMockState.lastPreviewScore).toEqual(preview)
  expect(document.querySelector('.editor-status')).toHaveTextContent(`셋잇단음표 ${members}/3`); expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(screen.getByRole('button', { name: '편집' })); expect(screen.getByRole('menuitem', { name: '실행 취소' })).toBeDisabled(); fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  openStudioWorkspace('파일'); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))); expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' }); await act(async () => fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' })))
  expect(window.inC.project.save).toHaveBeenCalledOnce(); expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(project.score)
})
