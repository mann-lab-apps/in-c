// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createAdditionalNotationFixture } from '../../testing/additional-notation-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['accidental', 'other-text', 'other-glyph'] as const)('explains %s loss without changing music, selection history, mixer or Native', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const f = createAdditionalNotationFixture(kind), expected = parseMusicXml(f.controlXml)
  const mixer = { P1: { muted: false, solo: false, volume: 0.37 }, P2: { muted: true, solo: false, volume: 0.72 } }
  localStorage.setItem('chromatics.part-mixer.v1', JSON.stringify(mixer))
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'additional.musicxml', filePath: '/fixture/additional.musicxml', contents: f.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  const path = 'part[1].measure[1].note[1].notations[1].' + (kind === 'accidental' ? 'accidental-mark' : 'other-notation') + '[1]'
  expect(report.getByText(kind === 'accidental' ? /독립 임시표는 현재 악보에 보존하지 못했습니다/ : /사용자 확장 표기는 현재 악보에 보존하지 못했습니다/)).toBeVisible()
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(within(report.getByText(path).closest('li')!).getByRole('button', { name: /^기술 정보$/ }))
  expect(report.getByText(path)).toBeVisible()
  expect(report.getByText(/Unrepresented additional notation/)).toBeVisible()
  if (kind === 'other-glyph') expect(report.getByText(/Unrepresented additional notation/)).toHaveTextContent('wiggleSawtoothWide')
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)).toEqual(mixer)
  expect(screen.getByText(/^0회 수정$/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
})
it('keeps ordinary supported music free of invented additional-mark warnings', async () => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const f = createAdditionalNotationFixture('control')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: 'control.musicxml', filePath: '/fixture/control.musicxml', contents: f.xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(f.xml)))
  expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
})
