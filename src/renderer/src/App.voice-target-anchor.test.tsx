// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createVoiceTargetAnchorFixture } from '../../testing/voice-target-anchor-fixture'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['start', 'end'] as const)('shows the target rest %s connection before a disabled voice move without changing selection or undo', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createVoiceTargetAnchorFixture(kind))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/target.chromatics', fileName: 'target.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: 'moving 선택' }))
  fireEvent.click(within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '도구' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '선택 음표 성부 이동' }))
  const panel = within(screen.getByRole('region', { name: '선택 음표 성부 이동' }))
  expect(panel.getByText(/대상 성부의 쉼표가 구간 기호의 시작·끝/)).toBeVisible()
  expect(panel.getByRole('button', { name: '선택 음표를 성부로 옮기기' })).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'moving')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(window.inC.project.save).not.toHaveBeenCalled()
})
