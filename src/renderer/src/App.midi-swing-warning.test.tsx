// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createSwingPlaybackFixture } from '../../testing/swing-playback-fixture'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it('explains unapplied swing after actual export handling, keeping raw diagnostics optional and document state intact', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createSwingPlaybackFixture('eighth', '3:2'), other = structuredClone(score.parts[0])
  other.id = 'other'; other.staves[0].id = 'other-staff'
  other.staves[0].measures[0].id = 'other-bar'
  other.staves[0].measures[0].timeSignature = { beats: 8, beatType: 8 }
  for (const event of other.staves[0].measures[0].voices[0].events) event.id = 'other-' + event.id
  score.parts.push(other)
  const contents = encodeNativeProject(createNativeProject(score))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'swing.chromatics', filePath: '/fixture/swing.chromatics', contents })
  vi.mocked(window.inC.midi.save).mockResolvedValueOnce({ fileName: 'swing.mid' })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const dirty = document.querySelector('.studio-document__state')!.textContent
  openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
  const report = within(await screen.findByRole('region', { name: 'MIDI 경고 상세' }))
  expect(report.getByText('저장된 전역 스윙 설정을 현재 악보에 적용할 수 없어 MIDI는 직선 리듬으로 내보냈습니다. 보표별 박자와 마디 길이를 확인해 주세요. 설정은 프로젝트 또는 MusicXML에 보관됩니다.')).toBeVisible()
  const raw = report.getByText(/Stored global swing playback/), path = report.getByText('score.swingPlayback')
  expect(raw).not.toBeVisible(); expect(path).not.toBeVisible()
  const details = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(details, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(details, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(details); expect(raw).toBeVisible(); expect(path).toBeVisible()
  expect(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents).toEqual(Array.from(serializeMidi({ ...score, swingPlayback: undefined })))
  expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected!)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(encodeNativeProject(createNativeProject(playbackMockState.lastScore!))).toBe(contents)
})
