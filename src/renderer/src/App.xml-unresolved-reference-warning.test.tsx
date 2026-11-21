// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createXmlUnresolvedReferenceFixture } from '../../testing/xml-unresolved-reference-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
registerAppTestHooks()
it.each(['title', 'lyric'] as const)('explains unresolved XML %s references without changing Native or consuming technical-detail Space', async field => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createXmlUnresolvedReferenceFixture('<!ENTITY word "caf&#233;">', '&word; &amp;word;', field)
  const score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'reference.musicxml', filePath: '/fixture/reference.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/일부 XML 글자 참조를 해석하지 못해 이름이 남았습니다/)).toBeVisible()
  const path = field === 'title' ? 'score-partwise.work[1].work-title[1]'
    : 'score-partwise.part[1].measure[1].note[1].lyric[1].text[1]'
  expect(report.getByText(path)).not.toBeVisible(); expect(playbackMockState.lastScore).toEqual(score)
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: ' ', code: 'Space' }); expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(technical); expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unresolved XML text reference \(name="word", count=1\)/)).toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
