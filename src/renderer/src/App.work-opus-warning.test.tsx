// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWorkOpusFixture } from '../../testing/work-opus-fixture'
import { parseMusicXmlWithReport } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['relative','attributes','empty','mixed'] as const)('explains the %s collection-link loss without following its URI or changing score/history', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWorkOpusFixture(kind), expected = parseMusicXmlWithReport(createWorkOpusFixture(kind,true)).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/opus.musicxml', fileName:'opus.musicxml', contents:xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  const report = within(await screen.findByRole('region', { name:'MusicXML 경고 상세' }))
  const body = report.getByText(/원본의 작품 모음 연결 정보는.*보존하지 못했습니다/)
  expect(body).toBeVisible(); expect(body).not.toHaveTextContent(/번째 파트|\d마디|\d쪽/)
  const row = within(body.closest('li')!), path = row.getByText('work.opus')
  expect(path).not.toBeVisible(); const toggle = row.getByRole('button', { name:'기술 정보' })
  fireEvent.keyDown(toggle, { key:' ', code:'Space' }); fireEvent.click(toggle)
  expect(path).toBeVisible(); expect(row.getByText(/Unrepresented work or movement metadata /)).toBeVisible()
  expect(row.queryByRole('link', { name:/collection\.opus/ })).not.toBeInTheDocument()
  expect(report.getAllByRole('listitem')).toHaveLength(kind==='mixed'?7:1)
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(expected); expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(expected))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
it('does not show a collection-link loss when the source has no opus element', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWorkOpusFixture('absent'), expected = parseMusicXmlWithReport(xml).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/control.musicxml', fileName:'control.musicxml', contents:xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  expect(screen.queryByRole('region', { name:'MusicXML 경고 상세' })).not.toBeInTheDocument()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
