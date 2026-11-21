// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createRelativeHarmonyFixture } from '../../testing/relative-harmony-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()

it.each(['function', 'numeral-key'] as const)('explains %s relative harmony before the existing copy refusal and keeps the native document', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createRelativeHarmonyFixture(kind), score = parseMusicXml(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'relative.musicxml', filePath: '/fixture/relative.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/로마 숫자·숫자 코드의 상대 화성 정보는 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('상대 화성 정보 손실')
  const path = `part[2].measure[2].harmony[1].${kind === 'function' ? 'function' : 'numeral'}[1]`
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' })); expect(report.getByText(path)).toBeVisible()
  fireEvent.keyDown(report.getByRole('button', { name: '기술 정보' }), { key: 'ArrowDown', code: 'ArrowDown' })
  expect(playbackMockState.lastScore).toEqual(score); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.keyDown(screen.getByTestId('notation-preview'), { key: 'ArrowUp', code: 'ArrowUp' })
  const edited = structuredClone(playbackMockState.lastScore)
  expect(edited).not.toEqual(score)
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  expect(selected).toBeTruthy()
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('화음 구조를 MusicXML로 보존할 수 없습니다'))
  expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')).toBe(selected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(JSON.parse(JSON.stringify(edited)))
})
