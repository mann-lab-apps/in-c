// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createHarmonyKindTextFixture, harmonyKindTextCases } from '../../testing/harmony-kind-text-fixture'
import { parseMusicXml } from '../../musicxml'
import { parseHarmonyText } from '../../musicxml/harmony-text'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()

it.each(['minor', 'dominant-bass'] as const)('opens the complete imported %s chord and preserves one-command edit/native/undo', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createHarmonyKindTextFixture(kind), expected = harmonyKindTextCases.find(x => x.id === kind)!.expected
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'kind-text.musicxml', filePath: '/fixture/kind-text.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const target = await screen.findByRole('button', { name: `코드 심벌 ${expected} 속성 열기` })
  fireEvent.click(target)
  const field = screen.getByRole('textbox', { name: '선택 요약 코드' })
  expect(field).toHaveValue(expected)
  const original = structuredClone(playbackMockState.lastScore)
  expect(original).toEqual(parseMusicXml(source))
  fireEvent.change(field, { target: { value: 'Am7' } }); fireEvent.keyDown(field, { key: 'Enter', code: 'Enter' }); fireEvent.blur(field)
  const edited = structuredClone(original), mark = edited!.harmonies![0]
  Object.assign(mark, parseHarmonyText('Am7'))
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
})
