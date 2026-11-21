// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createVoiceMoveFixture } from '../../testing/voice-move-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { serializeMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
async function setup() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const project = createNativeProject(createVoiceMoveFixture(true))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'voices.chromatics', filePath: '/fixture/voices.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', { name: 'moving 선택' }))
  return project
}
it('offers a separate move through Tools, keeps the note ID/address and one exact undo/redo plus native save', async () => {
  const project = await setup()
  fireEvent.click(within(screen.getByRole('navigation', { name: '앱 메뉴' })).getByRole('button', { name: '도구' }))
  fireEvent.click(screen.getByRole('menuitem', { name: '선택 음표 성부 이동' }))
  const region = within(screen.getByRole('region', { name: '선택 음표 성부 이동' }))
  expect(region.getByRole('combobox', { name: '옮길 성부' })).toHaveTextContent('2성부')
  fireEvent.click(region.getByRole('button', { name: '선택 음표를 성부로 옮기기' }))
  const changed = structuredClone(playbackMockState.lastScore!), source = changed.parts[0].staves[0].measures[0]
  expect(source.voices[0].events[1].type).toBe('rest'); expect(source.voices[1].events.some(e => e.id === 'moving')).toBe(true)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'moving')
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain('voice-2')
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정'); expect(serializeMidi(changed)).toEqual(serializeMidi(project.score))
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(project.score)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain('voice-1')
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain('voice-2')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]; expect(saved.filePath).toBe('/fixture/voices.chromatics'); expect(decodeNativeProject(saved.contents).score).toEqual(changed)
  if (process.env.STUDIO_EMPTY_VOICE_QA_DIR) {
    const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
    const dir = process.env.STUDIO_EMPTY_VOICE_QA_DIR; mkdirSync(dir, { recursive: true })
    for (const [name, value] of Object.entries({ 'source.chromatics': encodeNativeProject(project), 'moved.chromatics': saved.contents, 'source.musicxml': serializeMusicXml(project.score), 'moved.musicxml': serializeMusicXml(changed), 'expected.mid': Buffer.from(serializeMidi(changed)) })) writeFileSync(join(dir, name), value, { flag: 'wx' })
  }
})
it('keeps the existing voice buttons as navigation without moving or editing a selected note', async () => {
  const project = await setup(); const voices = within(screen.getByRole('group', { name: '입력 성부' }))
  fireEvent.click(voices.getByRole('button', { name: '2성부' }))
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'empty-target')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('blocks a still-unconfirmed text draft before moving and permits explicit cancellation then one move', async () => {
  const project = await setup(); openStudioWorkspace('음표')
  const field = screen.getByRole('textbox', { name: '선택 요약 코드' })
  field.focus(); fireEvent.change(field, { target: { value: 'C7' } })
  fireEvent.click(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' }))
  expect(playbackMockState.lastScore).toEqual(project.score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('미확정 입력을 확정하거나 취소')
  fireEvent.keyDown(field, { key: 'Escape' }); fireEvent.blur(field)
  fireEvent.click(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' }))
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('does not turn a note-input target change into a selected-note move', async () => {
  const project = await setup(); fireEvent.keyDown(window, { key: 'n', code: 'KeyN' }); openStudioWorkspace('음표')
  expect(screen.getByRole('button', { name: '선택 음표를 성부로 옮기기' })).toBeDisabled()
  expect(playbackMockState.lastScore).toEqual(project.score)
})
