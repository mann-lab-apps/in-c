// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPedalAppearanceFixture as fixture } from '../../testing/pedal-appearance-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['sign', 'default'] as const)('explains missing pedal signs without calling supported damper playback unsupported: %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = fixture(kind), score = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/pedal.musicxml', fileName: 'pedal.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App/>); openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getAllByText(/페달 기호는 화면·PDF에 표시되지 않습니다/)).toHaveLength(2)
  expect(report.getAllByText(/지원하는 댐퍼 페달 재생 정보만 가져옵니다/)[0]).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('페달 기호 손실')
  expect(document.querySelector('.studio-status__result')).not.toHaveTextContent(/part\[|Unrepresented/)
  const path = 'part[1].measure[1].direction[1].pedal[1]'
  expect(report.getByText(path)).not.toBeVisible()
  fireEvent.click(report.getAllByRole('button', { name: '기술 정보' })[0])
  expect(report.getByText(path)).toBeVisible()
  expect(report.getAllByText(/Unrepresented pedal sign /)[0]).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(score)
  expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(score))
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
