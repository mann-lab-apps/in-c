// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createNewScore } from './editor/new-score'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each([false, true])('keeps authored numbers and one undo through real meter UI and save (global tempo %s)', async withTempo => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNewScore({ title: '박자표와 원본 번호', templateId: 'solo-melody', measureCount: 3,
    keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } })
  const bars = score.parts[0].staves[0].measures
  bars.forEach((bar, index) => { bar.number = [10, 30, 70][index] })
  if (withTempo) score.tempoEvents = [{ id: 'original-tempo', measureId: 'measure-30', tick: 0, bpm: 80 }]
  const original = createNativeProject(score), expected = structuredClone(score)
  expected.parts[0].staves[0].measures[1].timeSignature = { beats: 3, beatType: 4 }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/numbers.chromatics', fileName: 'numbers.chromatics', contents: encodeNativeProject(original) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button', { name: '30마디 선택' })); openStudioWorkspace('악보')
  const apply = () => {
    fireEvent.click(screen.getByRole('button', { name: '사용자 지정 박자표…' }))
    const dialog = within(screen.getByRole('dialog', { name: '사용자 지정 박자표' }))
    fireEvent.change(dialog.getByRole('spinbutton', { name: '박자 분자' }), { target: { value: '3' } })
    fireEvent.click(dialog.getByRole('button', { name: '적용' }))
  }
  apply()
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(screen.getByRole('button', { name: '30마디 선택' })).toBeInTheDocument()
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'y', code: 'KeyY', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(expected)
  apply()
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
