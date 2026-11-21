// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TICKS_PER_QUARTER as T } from '../../score-core'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createNewScore } from './editor/new-score'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['tempo', 'harmony'] as const)('keeps the original score and dialog when a smaller meter excludes %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNewScore({ title: '위치 표기 보호', templateId: 'solo-melody', measureCount: 2,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const bar = score.parts[0].staves[0].measures[0]; bar.number = 10
  if (kind === 'tempo') score.tempoEvents = [{ id: 'original-tempo', measureId: 'measure-10', tick: 3 * T, bpm: 80 }]
  else score.harmonies = [{ id: 'original-harmony', measureId: bar.id, tick: 3 * T, text: 'Cm' }]
  const project = createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/timed.chromatics', fileName: 'timed.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: '10마디 선택' })); openStudioWorkspace('악보')
  fireEvent.click(screen.getByRole('button', { name: '사용자 지정 박자표…' }))
  const dialog = within(screen.getByRole('dialog', { name: '사용자 지정 박자표' }))
  fireEvent.change(dialog.getByRole('spinbutton', { name: '박자 분자' }), { target: { value: '2' } })
  fireEvent.click(dialog.getByRole('button', { name: '적용' }))
  expect(playbackMockState.lastScore).toEqual(score)
  expect(dialog.getByRole('alert')).toHaveTextContent('음표·표기가 새 박자표에 맞지 않습니다')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.click(dialog.getByRole('button', { name: '취소' }))
  expect(screen.getByRole('button', { name: '10마디 선택' })).toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(score)
})
