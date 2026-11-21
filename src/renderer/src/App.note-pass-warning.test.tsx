// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNotePassFixture, type NotePassCase } from '../../testing/note-pass-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const summary = '음표를 연주할 반복 회차 조건은 보존하지 못했습니다.'
it.each(['secondary', 'tie-and-note'] as NotePassCase[])('explains general note conditions separately from ties for %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml, plain, owner, eventIndex } = createNotePassFixture(kind), original = xml, score = parseMusicXml(plain)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/note-passes.musicxml', fileName: 'note-passes.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(new RegExp(`^${owner}번째 파트 · 7마디 · ${summary}`))).toBeVisible()
  expect(report.getByText(/현재 재생과 사본에는 해당 조건이 적용되지 않습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/Pass-specific|part\[/)
  const path = `part[${owner}].measure[7].note[${eventIndex}].@time-only`
  const item = report.getAllByRole('listitem').find(node => node.textContent?.includes(path))!
  expect(item).toBeTruthy(); expect(within(item).getByText(path)).not.toBeVisible()
  const technical = within(item).getByRole('button', { name: '기술 정보' })
  fireEvent.click(technical)
  expect(within(item).getByText(path)).toBeVisible()
  expect(within(item).getByText(/Pass-specific note time-only="2"/)).toBeVisible()
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  if (kind === 'tie-and-note') expect(report.getAllByText(/반복 차수별 타이 조건은 보존하지 못했습니다/)).toHaveLength(2)
  expect(playbackMockState.lastScore).toEqual(score)
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' })); fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: '조건 확인 후 편집' } }); fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
  const changed = { ...score, title: '조건 확인 후 편집' }
  expect(playbackMockState.lastScore).toEqual(changed)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정'); expect(xml).toBe(original)
})
it('does not invent a conditional-note notice for an ordinary repeated score', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml } = createNotePassFixture('control')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/ordinary-repeat.musicxml', fileName: 'ordinary-repeat.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
