// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNotePerformanceFixture } from '../../testing/note-performance-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['independent', 'secondary'] as const)('explains performance source ownership while preserving music and Native for %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml, plain, owner } = createNotePerformanceFixture(kind), score = parseMusicXml(plain)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/performance.musicxml', fileName: 'performance.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(new RegExp(`^${owner}번째 파트 · 7마디 · 음표의 연주 시작 시점 조정은 보존하지 못했습니다`))).toBeVisible()
  if (kind === 'independent') expect(report.getByText(/^1번째 파트 · 7마디 · 음표의 연주 종료 시점 조정은 보존하지 못했습니다/)).toBeVisible()
  const attribute = kind === 'independent' ? 'release' : 'attack'
  const path = `part[${owner}].measure[7].note[2].@${attribute}`
  const item = report.getAllByRole('listitem').find(n => n.textContent?.includes(path))!
  expect(within(item).getByText(path)).not.toBeVisible()
  const technical = within(item).getByRole('button', { name: '기술 정보' });fireEvent.click(technical)
  expect(within(item).getByText(path)).toBeVisible();expect(within(item).getByText(new RegExp(kind === 'independent' ? 'release="-1"' : 'attack="1"'))).toBeVisible()
  fireEvent.keyDown(technical, { key: ' ', code: 'Space' });expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(score)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['explicit-zero', 'control'] as const)('keeps %s free of a semantic timing-loss notice', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { xml } = createNotePerformanceFixture(kind)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/control.musicxml', fileName: 'control.musicxml', contents: xml })
  const { App } = await import('./App');render(<App />)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
