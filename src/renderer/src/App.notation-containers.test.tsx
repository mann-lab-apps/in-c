// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNotationContainerFixture } from '../../testing/notation-container-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it('keeps staccato through split-container import/save and exposes later technical loss without starting playback', async () => {
  const xml = createNotationContainerFixture()
  const supported = parseMusicXml(createNotationContainerFixture(['<articulations><staccato/></articulations>']))
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/containers.musicxml', fileName: 'containers.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/1번째 파트 · 1마디 · 연주 기법 표기를 가져오지 못했습니다/)).toBeVisible()
  const path = report.getByText('part[1].measure[1].note[1].notations[2].technical')
  expect(path).not.toBeVisible()
  const disclosure = report.getByRole('button', { name: '기술 정보' })
  fireEvent.click(disclosure)
  expect(path).toBeVisible()
  expect(report.getByText('technical playing instructions are not imported yet.')).toBeVisible()
  fireEvent.keyDown(disclosure, { key: ' ', code: 'Space' })
  fireEvent.keyDown(disclosure, { key: 'Enter', code: 'Enter' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(supported)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})
