// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createAccidentalAppearanceFixture, createRepeatedAccidentalAppearanceFixture } from '../../testing/accidental-appearance-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['parentheses', 'cue-size', 'mismatched-pitch'] as const)('explains %s accidental appearance loss while preserving the projected save payload', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const options = { style: kind === 'mismatched-pitch' ? 'plain' : kind, partCount: 2, targetPart: 2, targetMeasure: 2 } as const
  const source = createAccidentalAppearanceFixture(options)
  const xml = kind === 'mismatched-pitch' ? source.replace('<accidental>natural</accidental>', '<accidental>sharp</accidental>') : source
  const control = createAccidentalAppearanceFixture({ ...options, style: 'plain' })
  const expected = parseMusicXml(kind === 'mismatched-pitch' ? control.replace('<accidental>natural</accidental>', '') : control)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/accidental-style.musicxml', fileName: 'accidental-style.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  if (kind === 'mismatched-pitch') {
    expect(report.getByText(/임시표 기호와 음높이 값이 다릅니다. 음높이 값에 따라 가져왔습니다/)).toBeVisible()
  } else {
    expect(report.getByText(/임시표의 원래 기호나 괄호·크기·주의·편집 지정 일부를 보존하지 못했습니다/)).toBeVisible()
    expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  }
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('임시표 표시 지정 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = 'part[2].measure[2].note[1].accidental'
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  const diagnostic = { parentheses: '"parentheses":"yes"', 'cue-size': '"size":"cue"', 'mismatched-pitch': '"pitchAlter":null' }
  expect(report.getByText(/Unrepresented accidental appearance /)).toHaveTextContent(diagnostic[kind])
  expect(playbackMockState.lastScore).toEqual(expected)
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-notehead'] as const)('retains every technical row in a %s accidental report', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const repeated = createRepeatedAccidentalAppearanceFixture()
  const xml = kind === 'mixed-notehead' ? repeated.replace('</accidental>', '</accidental><notehead>none</notehead>') : repeated
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/accidental-styles.musicxml', fileName: 'accidental-styles.musicxml', contents: xml })
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
