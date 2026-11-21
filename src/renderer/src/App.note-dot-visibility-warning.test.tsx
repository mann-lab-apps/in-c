// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNoteDotVisibilityFixture, createRepeatedNoteDotVisibilityFixture } from '../../testing/note-dot-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['main', 'rest'] as const)('explains %s augmentation-dot display loss without changing rhythm or save payload', async owner => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createNoteDotVisibilityFixture({ owner, partCount: 2, targetPart: 2, targetMeasure: 2 })
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/dots.musicxml', fileName: 'dots.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/음가 점의 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('음가 점 숨김 설정 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = 'part[2].measure[2].note[1].@print-dot'
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented note dot visibility /)).toHaveTextContent('"printDot":"no"')
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-notehead'] as const)('retains every source diagnostic in a %s dot report', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const repeated = createRepeatedNoteDotVisibilityFixture()
  const xml = kind === 'mixed-notehead' ? repeated.replace('<type>half</type><dot/>', '<type>half</type><dot/><notehead>none</notehead>') : repeated
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/many-dots.musicxml', fileName: 'many-dots.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  if (kind === 'same-family') {
    const toggle = report.getByRole('button', { name: '마디별 경고 상세 30개' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(report.queryByRole('button', { name: '기술 정보' })).not.toBeInTheDocument()
    fireEvent.click(toggle)
    expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(30)
  } else {
    expect(report.queryByRole('button', { name: /마디별 경고 상세/ })).not.toBeInTheDocument()
    expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(31)
  }
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
