// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createSoundPedalFixture as fixture, type SoundPedalSource } from '../../testing/sound-pedal-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['direction', 'measure'] as SoundPedalSource[])('explains unrepresented %s sound pedals while preserving supported damper data and document edits', async source => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = fixture({ 'soft-pedal': 'yes', 'sostenuto-pedal': '37.5', 'damper-pedal': '75' }, source), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/sound-pedals.musicxml', fileName: 'sound-pedals.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getAllByText(/소프트·소스테누토 페달 재생 지시는 보존하지 못했습니다/)).toHaveLength(2)
  expect(report.getAllByText(/지원하는 댐퍼 페달 재생은 유지됩니다/)[0]).toBeVisible()
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = `part[2].measure[7].${source === 'measure' ? 'sound[1]' : 'direction[1].sound'}.@soft-pedal`
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getAllByRole('button', { name: '기술 정보' })[0]);expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented sound pedal soft-pedal "yes"/)).toBeVisible()
  const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  expect(playbackMockState.lastScore).toEqual(score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }));fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: '페달 지시 확인' } });fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
  const changed = { ...score, title: '페달 지시 확인' }
  expect(playbackMockState.lastScore).toEqual(changed);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
  fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true });expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true });expect(playbackMockState.lastScore).toEqual(changed)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(changed)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it.each(['direction', 'measure'] as SoundPedalSource[])('does not invent a new pedal warning for supported damper-only %s', async source => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = fixture({ 'damper-pedal': '75' }, source)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/damper.musicxml', fileName: 'damper.musicxml', contents: xml })
  const { App } = await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
