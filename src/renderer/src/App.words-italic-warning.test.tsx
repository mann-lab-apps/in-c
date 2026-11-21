// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsItalicFixture } from '../../testing/words-italic-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['staff', 'system', 'tempo', 'rhythm'] as const)('explains the %s italic override loss while preserving its meaning and keyboard/save contract', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWordsItalicFixture(kind), score = parseMusicXml(xml)
  if (kind === 'rhythm') expect(score.rhythmFeel).toBeDefined()
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName: kind + '-italic.musicxml', filePath: '/fixture/' + kind + '-italic.musicxml', contents: xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getByText(/글자의 명시적 기울임 서식은 보존하지 못했습니다/)).toBeVisible()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('글자의 기울임 서식 손실')
  const global = kind === 'system' || kind === 'tempo' || kind === 'rhythm', part = global ? 1 : 2, measure = global ? 1 : 2
  const raw = report.getByText(/^Unrepresented words font-style /), path = report.getByText(`part[${part}].measure[${measure}].direction[1].direction-type[1].words.@font-style`)
  expect(raw).not.toBeVisible(); expect(path).not.toBeVisible()
  const technical = report.getByRole('button', { name: '기술 정보' })
  fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.click(technical); expect(raw).toBeVisible(); expect(path).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
  const title = screen.getByLabelText('악보 제목')
  fireEvent.change(title, { target: { value: 'Current ' + kind + ' title' } }); fireEvent.keyDown(title, { key: 'Enter' })
  const edited = structuredClone(playbackMockState.lastScore!)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(edited)
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'reopened-' + kind + '.chromatics', filePath: '/fixture/reopened-' + kind + '.chromatics', contents })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('reopened-' + kind + '.chromatics을 열었습니다.'))
  expect(playbackMockState.lastScore).toEqual(edited)
})
