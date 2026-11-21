// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { XMLParser } from 'fast-xml-parser'
import { createNativePartIdFixture } from '../../testing/native-part-id-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['MusicXML로 저장', 'MusicXML 내보내기', '반복 펼치기 MusicXML 내보내기'].flatMap(label => ['part', 'score'].map(view => ({ label, view }))))('maps only output IDs through $view / $label', async ({ label, view }) => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score = createNativePartIdFixture(['Piano One', 'P1']), project = createNativeProject(score)
  project.view = view === 'part' ? { mode: 'part', partId: 'Piano One' } : { mode: 'score' }
  const contents = encodeNativeProject(project)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'ids.chromatics', filePath: '/fixture/ids.chromatics', contents })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(score))
  const before = JSON.stringify(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  const bridge = label === 'MusicXML로 저장' ? window.inC.musicXml.save : window.inC.musicXml.exportCopy
  vi.mocked(bridge).mockResolvedValueOnce({ fileName: 'ids.musicxml', filePath: '/fixture/ids.musicxml' })
  openStudioWorkspace(label === 'MusicXML로 저장' ? '파일' : '내보내기'); await act(async () => fireEvent.click(screen.getByRole('button', { name: label })))
  await waitFor(() => expect(bridge).toHaveBeenCalledOnce())
  const xml = vi.mocked(bridge).mock.calls[0][0].contents
  const root = new XMLParser({ ignoreAttributes: false }).parse(xml)['score-partwise']
  const partCopy = view === 'part' && label !== 'MusicXML로 저장'
  const nodes = (value: Record<string, string> | Record<string, string>[]) => (Array.isArray(value) ? value : [value]).map(part => part['@_id'])
  expect(nodes(root['part-list']['score-part'])).toEqual(partCopy ? ['P1'] : ['P2', 'P1'])
  expect(nodes(root.part)).toEqual(partCopy ? ['P1'] : ['P2', 'P1'])
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/MusicXML 출력용 파트 식별자를 변환했습니다/)).toBeVisible()
  expect(report.getByText('part[1].id')).not.toBeVisible()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(report.getByText('part[1].id')).toBeVisible()
  expect(report.getByText(new RegExp(`Converted part identifier.*Piano One.*output="${partCopy ? 'P1' : 'P2'}"`))).toBeVisible()
  expect(JSON.stringify(playbackMockState.lastScore)).toBe(before)
  expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(score)
  expect(saved.view).toEqual(project.view)
})
