// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsComponentsFixture } from '../../testing/words-components-fixture'
import { parseMusicXml } from '../../musicxml'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

async function openDiagnostic() {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = createWordsComponentsFixture('multiple'), score = parseMusicXml(source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'reading.musicxml', filePath: '/fixture/reading.musicxml', contents: source })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const middle = score.parts[0].staves[0].measures[1].voices[0].events[0]
  fireEvent.click(screen.getByRole('button', { name: middle.id + ' 선택' }))
  const technical = within(report).getAllByRole('button', { name: '기술 정보' }).at(-1)!
  fireEvent.click(technical); technical.focus()
  expect(technical).toHaveFocus()
  return { score, technical }
}

it.each([
  { key: 'ArrowUp' }, { key: 'ArrowDown' }, { key: 'ArrowLeft' }, { key: 'ArrowRight' },
  { key: 'ArrowUp', ctrlKey: true }, { key: 'ArrowDown', metaKey: true }, { key: 'ArrowDown', altKey: true }
])('keeps score, selection and undo unchanged when reading diagnostics with $key $ctrlKey $metaKey $altKey', async stroke => {
  const { score, technical } = await openDiagnostic()
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const dirty = document.querySelector('.studio-document__state')?.textContent
  expect(fireEvent.keyDown(technical, { ...stroke, code: stroke.key })).toBe(true)
  expect(playbackMockState.lastScore).toEqual(score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.studio-document__state')?.textContent).toBe(dirty)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(playbackMockState.play).not.toHaveBeenCalled()
})

it('still edits the selected score with its normal arrow key and restores it with one undo', async () => {
  const { score } = await openDiagnostic()
  fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown' })
  expect(playbackMockState.lastScore).not.toEqual(score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
  expect(playbackMockState.lastScore).toEqual(score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
