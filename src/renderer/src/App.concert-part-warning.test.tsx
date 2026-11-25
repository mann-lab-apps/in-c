// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { parseMusicXml } from '../../musicxml'
import { concertPartFixture, concertPartSettings } from '../../testing/concert-part-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()

it('explains the written part loss without changing the loaded sounding notes', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = concertPartFixture(concertPartSettings)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({
    filePath:'/fixture/concert-part.musicxml', fileName:'concert-part.musicxml', contents:xml
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name:'MusicXML 경고 상세' }))
  expect(report.getByText(/실음 악보에 지정된 파트보의 음자리표·이조 설정/)).toBeVisible()
  expect(report.getByText('part[1].measure[1].attributes[1].for-part[1]')).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name:'기술 정보' }))
  expect(report.getByText('part[1].measure[1].attributes[1].for-part[1]')).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(concertPartFixture('')))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('uses the public concert-pitch view without sending projected data to playback or edits', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = concertPartFixture('<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>', '')
  const written = parseMusicXml(xml)
  const event = written.parts[0].staves[0].measures[0].voices[0].events[0]
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({
    filePath: '/fixture/fixed-clarinet.musicxml', fileName: 'fixed-clarinet.musicxml', contents: xml
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(written))
  const toggle = () => {
    fireEvent.click(screen.getByRole('button', { name: '보기' }))
    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: '실음 보기' }))
  }
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  toggle()
  expect(screen.getByText(/편집 중인 입력을 완료하거나 취소한 뒤 실음 보기/)).toBeVisible()
  expect(screen.queryByText('실음 보기 · 읽기 전용')).toBeNull()
  fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
  toggle()
  expect(screen.getByText('실음 보기 · 읽기 전용')).toBeVisible()
  expect(screen.queryByText(/편집 중인 입력을 완료하거나 취소한 뒤 실음 보기/)).toBeNull()
  expect(screen.queryByRole('button', { name: /음표 입력 전환/ })).toBeNull()
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', event.id)
  const display = playbackMockState.lastPreviewScore!.parts[0].staves[0].measures[0]
  expect(display.keySignature.fifths).toBe(-2)
  expect(display.voices[0].events[0]).toMatchObject({ id: event.id, pitch: { step: 'B', octave: 3, alter: -1 } })

  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  fireEvent.keyDown(window, { key: 'j', code: 'KeyJ' })
  fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
  fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
  expect(playbackMockState.lastScore).toEqual(written)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(window, { key: ' ', code: 'Space' })
  expect(playbackMockState.playFromEvent).toHaveBeenCalledWith(event.id, expect.objectContaining({ partId: 'P1' }))

  fireEvent.click(screen.getByRole('button', { name: '기보음 보기로 돌아가기' }))
  expect(screen.queryByText('실음 보기 · 읽기 전용')).toBeNull()
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', event.id)
  expect(playbackMockState.lastPreviewScore!.parts).toEqual(written.parts)
  fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp' })
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(playbackMockState.lastScore).not.toEqual(written)
})
