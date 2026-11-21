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
const source = () => fixture(['<articulations><staccato/></articulations>']).replace('<notations>', '<notations print-object="no">')
function repeated(count: number): string {
  const xml = source(), measure = xml.match(/<measure number="1">[\s\S]*?<\/measure>/)![0]
  return xml.replace(measure, Array.from({ length: count }, (_, index) => measure.replace('number="1"', `number="${index + 1}"`)).join(''))
}

it('explains notation visibility loss in Korean and preserves the score/native output', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = source(), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/hidden-notation.musicxml', fileName: 'hidden-notation.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App/>); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/표기 기호의 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(/원본 MusicXML을 보관하고/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('표기 기호 숨김 설정 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = 'part[1].measure[1].note[1].notations.@print-object'
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented notation visibility /)).toHaveTextContent('"printObject":"no"')
  expect(playbackMockState.lastScore).toEqual(score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it.each(['same-family', 'mixed-technical'] as const)('keeps report grouping limited to repeated notation visibility: %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const raw = repeated(30), xml = kind === 'mixed-technical' ? raw.replace('</notations>', '<technical><fingering>2</fingering></technical></notations>') : raw
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/many-hidden-notation.musicxml', fileName: 'many-hidden-notation.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App/>); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  if (kind === 'same-family') {
    const toggle = report.getByRole('button', { name: '마디별 경고 상세 30개' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(report.queryByRole('button', { name: '기술 정보' })).not.toBeInTheDocument()
    expect(report.getByText(/원본의 표기 기호 숨김 설정은 보존하지 못했습니다/)).toBeVisible()
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
