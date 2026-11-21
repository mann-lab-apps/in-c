// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeterRestProtectionProject } from '../../testing/meter-rest-protection-fixture'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function open(bar: number) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createMeterRestProtectionProject()
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/protection.chromatics', fileName: 'protection.chromatics', contents: encodeNativeProject(source) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source.score))
  fireEvent.click(screen.getByRole('button', { name: `${bar}마디 선택` }))
  openStudioWorkspace('악보'); fireEvent.click(screen.getByRole('button', { name: '사용자 지정 박자표…' }))
  return { source, d: within(screen.getByRole('dialog', { name: '사용자 지정 박자표' })) }
}
it('keeps the custom dialog, original hairpin and clean history when shrink would remove its rest endpoint', async () => {
  const { source, d } = await open(1)
  fireEvent.change(d.getByRole('spinbutton', { name: '박자 분자' }), { target: { value: '2' } })
  fireEvent.click(d.getByRole('button', { name: '적용' }))
  expect(d.getByRole('alert')).toHaveTextContent('음표·표기가 새 박자표에 맞지 않습니다')
  expect(playbackMockState.lastScore).toEqual(source.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(d.getByRole('button', { name: '취소' }))
  expect(createNativeProject(playbackMockState.lastScore!).score).toEqual(source.score)
  expect(window.inC.project.save).not.toHaveBeenCalled()
})
it('preserves both full-rest marks through meter apply and one undo/redo', async () => {
  const { source, d } = await open(2)
  fireEvent.change(d.getByRole('spinbutton', { name: '박자 분자' }), { target: { value: '3' } })
  fireEvent.click(d.getByRole('button', { name: '적용' }))
  const changed = structuredClone(playbackMockState.lastScore!)
  expect(changed.parts[0].staves[0].measures[1].voices[0].events[0]).toMatchObject({
    id: source.score.parts[0].staves[0].measures[1].voices[0].events[0].id, fermata: true, breathMark: 'caesura'
  })
  expect(changed.hairpins).toEqual(source.score.hairpins)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(source.score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
})
