// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNoteLedgerVisibilityFixture, createRepeatedNoteLedgerVisibilityFixture } from '../../testing/note-ledger-visibility-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()

it('explains ledger loss in Korean while preserving technical evidence and the saved projected score', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createNoteLedgerVisibilityFixture({ partCount: 2, targetPart: 2, targetMeasure: 2 })
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/ledger.musicxml', fileName: 'ledger.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/음표의 덧줄 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('덧줄 숨김 설정 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = 'part[2].measure[2].note[1].@print-leger'
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented note ledger visibility /)).toHaveTextContent('"printLeger":"no"')
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-notehead'] as const)('keeps all ledger technical rows in a $kind report', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const repeated = createRepeatedNoteLedgerVisibilityFixture()
  const xml = kind === 'mixed-notehead' ? repeated.replace('<type>whole</type>', '<type>whole</type><notehead>none</notehead>') : repeated
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/ledgers.musicxml', fileName: 'ledgers.musicxml', contents: xml })
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
    expect(report.getByText(/특수 모양·채움·괄호 지정은 보존하지 못했습니다/)).toBeVisible()
  }
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
