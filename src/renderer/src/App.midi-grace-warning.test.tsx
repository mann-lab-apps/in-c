// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { createGraceMidiFixture } from '../../testing/grace-midi-fixture'
import { serializeMidi } from './midi/serialize-midi'
import { chooseScoreView, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each([1, 2] as const)('explains %i grace MIDI omissions and keeps snapshot/report ownership on part export', async count => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const encoded = encodeNativeProject(createNativeProject(createGraceMidiFixture(count)))
  const original = decodeNativeProject(encoded).score
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({
    filePath: '/fixture/grace.chromatics', fileName: 'grace.chromatics', contents: encoded
  })
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'grace.mid' }).mockResolvedValueOnce({ fileName: 'lower.mid' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(original))
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const dirty = document.querySelector('.studio-document__state')!.textContent
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  const report = within(await screen.findByRole('region', { name: 'MIDI 경고 상세' }))
  expect(report.getByText(/꾸밈음의 별도 발음은 MIDI에 포함되지 않았습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('경고 상세에서 꾸밈음 발음 누락을 확인')
  const raw = report.getByText(/Grace notes \(/), path = report.getByText('part[1].staff[1].measure[1].voice[1].event[1].graceNotes')
  expect(raw).not.toBeVisible(); expect(path).not.toBeVisible()
  const button = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
  fireEvent.keyDown(button, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(button); expect(raw).toBeVisible(); expect(path).toBeVisible()
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi(original)))
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  chooseScoreView('악보 보기', 'part'); chooseScoreView('파트보 선택', 'lower')
  expect(report.getByText('grace.mid')).toBeVisible()
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'MIDI 경고 상세' })).not.toBeInTheDocument())
  expect(vi.mocked(window.inC.midi.save).mock.calls[1][0].contents).toEqual(Array.from(serializeMidi({ ...original, parts: [original.parts[1]] })))
  expect(playbackMockState.lastScore).toEqual(original)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(original)
})
