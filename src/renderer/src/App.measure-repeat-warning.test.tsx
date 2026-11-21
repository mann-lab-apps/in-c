// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasureRepeatFixture, measureRepeatCases } from '../../testing/measure-repeat-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
it.each(measureRepeatCases)('explains lost measure-repeat notation in Korean with technical details on demand: $id', async spec => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createMeasureRepeatFixture(spec), supported = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/measure-repeat.musicxml', fileName: 'measure-repeat.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
  expect(report.getAllByText(/원본의 마디 반복 기호는 보존하지 못했습니다/)).toHaveLength(spec.stop === undefined ? 1 : 2)
  expect(report.getAllByText(/원본 MusicXML을 보관하고/)[0]).toBeVisible()
  const path = `part[1].measure[${spec.start}].attributes[1].measure-style[1].measure-repeat[1]`
  expect(report.getByText(path)).not.toBeVisible()
  expect(document.querySelector('.editor-status')).toHaveTextContent('경고 상세에서 마디 반복 기호 손실을 확인해 주세요.')
  expect(document.querySelector('.editor-status')).not.toHaveTextContent('Unrepresented')
  fireEvent.click(report.getAllByRole('button', { name: '기술 정보' })[0])
  expect(report.getByText(path)).toBeVisible()
  expect(report.getAllByText(/Unrepresented measure repeat/)[0]).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(supported)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})
