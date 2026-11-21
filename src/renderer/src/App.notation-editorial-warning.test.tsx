// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNotationContainerFixture as fixture } from '../../testing/notation-container-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['footnote', 'reference'] as const)('explains lost notation editorial %s in Korean and keeps technical source and Native unchanged', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = fixture([(kind === 'reference' ? '<level reference="yes">Reference only</level>' : '<footnote font-style="italic">편집자 주석</footnote>') + '<fermata/>'])
  const score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/editorial.musicxml', fileName: 'editorial.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App/>); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(kind === 'reference' ? /참고용 편집층 지정은 보존하지 못했습니다/ : /편집자 주석·편집층 정보를 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent(kind === 'reference' ? '참고용 편집층 지정 손실' : '편집자 주석·편집층 정보 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = `part[1].measure[1].note[1].notations.${kind === 'reference' ? 'level' : 'footnote'}`
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented notation editorial /)).toHaveTextContent(kind === 'reference' ? '"@_reference":"yes"' : '"@_font-style":"italic"')
  expect(playbackMockState.lastScore).toEqual(score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-technical'] as const)('groups repeated editorial losses without hiding a different warning family: %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const source = fixture(['<footnote>편집자 주석</footnote><fermata/>']), measure = source.match(/<measure number="1">[\s\S]*?<\/measure>/)![0]
  const repeated = source.replace(measure, Array.from({ length: 30 }, (_, i) => measure.replace('number="1"', `number="${i + 1}"`)).join(''))
  const xml = kind === 'mixed-technical' ? repeated.replace('</notations>', '<technical><fingering>2</fingering></technical></notations>') : repeated
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/editorials.musicxml', fileName: 'editorials.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App/>); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  if (kind === 'same-family') {
    const toggle = report.getByRole('button', { name: '마디별 경고 상세 30개' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(report.queryByRole('button', { name: '기술 정보' })).not.toBeInTheDocument()
    expect(report.getByText(/원본의 편집자 주석·편집층 정보는 보존하지 못했습니다/)).toBeVisible()
    fireEvent.click(toggle)
    expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(30)
  } else {
    expect(report.queryByRole('button', { name: /마디별 경고 상세/ })).not.toBeInTheDocument()
    expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(31)
    expect(report.getByText(/연주 기법 표기를 가져오지 못했습니다/)).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(parseMusicXml(xml))
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
