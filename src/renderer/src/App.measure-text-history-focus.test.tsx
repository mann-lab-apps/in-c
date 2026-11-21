// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { singleHarmonyFixture } from '../../testing/single-harmony-fixture'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { parseHarmonyText } from '../../musicxml/harmony-text'
import { serializeMidi } from './midi/serialize-midi'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()

it.each([true, false])('does not replay an old property-focus request after Tab reaches a note, request=%s', async requested => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = singleHarmonyFixture(), native = encodeNativeProject(createNativeProject(source))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'focus.chromatics', filePath: '/fixture/focus.chromatics', contents: native })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  const target = await screen.findByRole('button', { name: '코드 심벌 Cmaj7 속성 열기' })
  // The App harness maps dblclick to the same onEdit contract that native SVG Enter uses.
  if (requested) fireEvent.doubleClick(target)
  else fireEvent.click(target)
  const field = screen.getByRole('textbox', { name: '선택 요약 코드' })
  if (requested) expect(field).toHaveFocus()
  else field.focus()
  fireEvent.change(field, { target: { value: 'Am7' } }); fireEvent.keyDown(field, { key: 'Enter', code: 'Enter' })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  const edited = structuredClone(source)
  Object.assign(edited.harmonies![0], parseHarmonyText('Am7'))
  expect(playbackMockState.lastScore).toEqual(edited)
  const current = screen.getByRole('button', { name: '코드 심벌 Am7 속성 열기' })
  current.focus(); fireEvent.click(current)
  const note = screen.getByRole('button', { name: 'primary-bar-2-a 선택' })
  // Only this existing mock note gets its actual native renderer ownership attributes.
  // The separate strict native reproducer supplies real Tab/focus evidence.
  note.classList.add('notation-event')
  for (const [key, value] of Object.entries({ event: 'primary-bar-2-a', part: 'part-1', staff: 'staff-1', measure: 'primary-bar-2', voice: 'voice-1' })) note.setAttribute(`data-${key}-id`, value)
  note.focus()
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', '')
  expect(current).toHaveAttribute('aria-pressed', 'true')
  fireEvent.keyDown(note, { key: 'z', code: 'KeyZ', ctrlKey: true })
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  expect(note).toHaveFocus()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(screen.getByRole('button', { name: '코드 심벌 Cmaj7 속성 열기' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', '')
  fireEvent.keyDown(note, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  expect(playbackMockState.lastScore).toEqual(edited); expect(note).toHaveFocus()
  expect(serializeMidi(edited)).toEqual(serializeMidi(source))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
  expect(encodeNativeProject(createNativeProject(source))).toBe(native)
})

it('keeps Tab note focus when redo restores an older explicit field-entry request', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = singleHarmonyFixture()
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'redo-focus.chromatics', filePath: '/fixture/redo-focus.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  fireEvent.doubleClick(await screen.findByRole('button', { name: '코드 심벌 Cmaj7 속성 열기' }))
  const field = screen.getByRole('textbox', { name: '선택 요약 코드' })
  expect(field).toHaveFocus()
  fireEvent.change(field, { target: { value: 'Am7' } }); fireEvent.keyDown(field, { key: 'Enter', code: 'Enter' })
  const edited = structuredClone(source); Object.assign(edited.harmonies![0], parseHarmonyText('Am7'))
  expect(playbackMockState.lastScore).toEqual(edited)
  // Menu-origin undo preserves the old explicit focus request in redo history.
  fireEvent.click(screen.getByRole('button', { name: '편집' }))
  fireEvent.click(screen.getByRole('menuitem', { name: /실행 취소/ }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
  const target = screen.getByRole('button', { name: '코드 심벌 Cmaj7 속성 열기' })
  fireEvent.click(target)
  const note = screen.getByRole('button', { name: 'primary-bar-2-a 선택' })
  note.classList.add('notation-event')
  for (const [key, value] of Object.entries({ event: 'primary-bar-2-a', part: 'part-1', staff: 'staff-1', measure: 'primary-bar-2', voice: 'voice-1' })) note.setAttribute(`data-${key}-id`, value)
  note.focus()
  fireEvent.keyDown(note, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(edited))
  expect(note).toHaveFocus()
  expect(screen.getByRole('button', { name: '코드 심벌 Am7 속성 열기' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', '')
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(serializeMidi(edited)).toEqual(serializeMidi(source))
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
})
