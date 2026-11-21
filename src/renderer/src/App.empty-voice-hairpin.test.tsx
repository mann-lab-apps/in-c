// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createVoiceMoveHairpinFixture } from '../../testing/voice-move-hairpin-fixture'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['leave-source', 'enter-target'] as const)('keeps %s hairpin music/selection/history intact and explains the unavailable move', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { score, selectedId } = createVoiceMoveHairpinFixture(kind), project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'hairpin.chromatics', filePath: '/fixture/hairpin.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: selectedId + ' 선택' }))
  fireEvent.click(within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '도구' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '선택 음표 성부 이동' }))
  const panel = within(screen.getByRole('region', { name: '선택 음표 성부 이동' }))
  expect(panel.getByText(/헤어핀 적용/)).toBeVisible()
  expect(panel.getByRole('button', { name: '선택 음표를 성부로 옮기기' })).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(project.score); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selectedId)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(window.inC.project.save).not.toHaveBeenCalled()
})
