// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createCueNoteFixture, createRepeatedCueNoteFixture } from '../../testing/cue-note-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['main', 'chord'] as const)('explains %s cue-kind loss without claiming a mute feature or changing save payload', async owner => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createCueNoteFixture({ owner, size: owner === 'main' ? 'full' : undefined, partCount: 2, targetPart: 2, targetMeasure: 2 })
  const expected = parseMusicXml(xml.replaceAll('<cue/>', ''))
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/cue.musicxml', fileName: 'cue.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/큐 표기 구분은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('큐 표기 구분 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = `part[2].measure[2].note[${owner === 'chord' ? 2 : 1}].cue`
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  const diagnostic = report.getByText(/Unrepresented cue note kind /)
  expect(diagnostic).toHaveTextContent('"cue":true')
  if (owner === 'main') expect(diagnostic).toHaveTextContent('"typeSize":"full"')
  else expect(diagnostic).toHaveTextContent('"chord":true')
  expect(playbackMockState.lastScore).toEqual(expected)
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-notehead'] as const)('retains every technical row in a %s cue report', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const repeated = createRepeatedCueNoteFixture()
  const xml = kind === 'mixed-notehead' ? repeated.replace('<type>half</type>', '<type>half</type><notehead>none</notehead>') : repeated
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/many-cues.musicxml', fileName: 'many-cues.musicxml', contents: xml })
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
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml.replaceAll('<cue/>', '')))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
