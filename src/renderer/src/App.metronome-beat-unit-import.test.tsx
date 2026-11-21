// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMetronomeBeatUnitFixture } from '../../testing/metronome-beat-unit-fixture'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it('explains the changed unit and equivalent playback in Korean, preserving diagnostics and actual native save', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/breve.musicxml', fileName:'breve.musicxml', contents:createMetronomeBeatUnitFixture('breve', { text:'90', soundQuarter:720 }) })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name:'MusicXML 경고 상세' }))
  expect(report.getByText(/기준 음가.*breve.*90.*4분음표.*720.*재생 빠르기는 유지/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('기준 음가 환산')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Converted|part\[/)
  const path = report.getByText('part[1].measure[1].direction[1].direction-type[1].metronome.beat-unit')
  expect(path).not.toBeVisible(); fireEvent.click(report.getByRole('button', { name:'기술 정보' })); expect(path).toBeVisible()
  expect(report.getByText(/Converted metronome beat unit /)).toBeVisible()
  expect(playbackMockState.lastScore?.tempo).toMatchObject({ bpm:720, beatUnit:'quarter', dots:0 })
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(playbackMockState.lastScore)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('rejects an unrepresentable unit without replacing a dirty document, selection or undo, and accepts a valid retry', async () => {
  window.history.replaceState({}, '', '/?fixture=demo')
  const open = vi.mocked(window.inC.musicXml.open)
  open.mockResolvedValueOnce({ filePath:'/fixture/maxima.musicxml', fileName:'maxima.musicxml', contents:createMetronomeBeatUnitFixture('maxima', { text:'1000' }) })
  open.mockResolvedValueOnce({ filePath:'/fixture/retry.musicxml', fileName:'retry.musicxml', contents:createMetronomeBeatUnitFixture('long', { text:'90' }) })
  const { App } = await import('./App'); render(<App />)
  fireEvent.keyDown(window, { key:'ArrowUp', altKey:true, shiftKey:true })
  const edited = structuredClone(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('이 MusicXML의 빠르기를 현재 프로젝트에 정확히 표현할 수 없습니다.'))
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('현재 악보는 유지됩니다.')
  expect(playbackMockState.lastScore).toEqual(edited)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
  expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  const technical = within(screen.getByRole('group', { name:'MusicXML 가져오기 기술 정보' }))
  const cause = technical.getByText(/MusicXML 메트로놈 기준 음가를 정확히 환산할 수 없습니다:/)
  expect(cause).not.toBeVisible(); fireEvent.click(technical.getByRole('button', { name:'기술 정보' })); expect(cause).toBeVisible()
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true }); expect(playbackMockState.lastScore).not.toEqual(edited)
  fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true, shiftKey:true }); expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore?.tempo).toMatchObject({ bpm:360, beatUnit:'whole' }))
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
})
