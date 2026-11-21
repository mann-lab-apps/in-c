// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMeasureStyleFixture, measureStyleCases } from '../../testing/measure-style-fixture'
import { parseMusicXml } from '../../musicxml'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function openXml(xml: string) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/measure-style.musicxml', fileName: 'measure-style.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  return within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
}

it.each(measureStyleCases)('explains style loss in Korean and exposes original facts on demand: $id', async spec => {
  const xml = createMeasureStyleFixture(spec), supported = parseMusicXml(xml), report = await openXml(xml)
  const subject = spec.kind === 'beat-repeat' ? '박 반복 기호' : '박·리듬 슬래시 표기'
  expect(report.getAllByText(new RegExp(`원본의 ${subject}는 보존하지 못했습니다`))).toHaveLength(2)
  expect(report.getAllByText(/원본 MusicXML을 보관하고/)[0]).toBeVisible()
  const path = `part[1].measure[2].attributes[1].measure-style[1].${spec.kind}[1]`
  expect(report.getByText(path)).not.toBeVisible()
  const footer = document.querySelector('.editor-status')
  expect(footer).toHaveTextContent(spec.kind === 'beat-repeat'
    ? '경고 상세에서 박 반복 기호 손실을 확인해 주세요.' : '경고 상세에서 슬래시 표기 손실을 확인해 주세요.')
  expect(footer).not.toHaveTextContent('Unrepresented')
  fireEvent.click(report.getAllByRole('button', { name: '기술 정보' })[0])
  expect(report.getByText(path)).toBeVisible()
  expect(report.getAllByText(/Unrepresented (beat repeat|slash notation)/)[0]).toBeVisible()
  expect(playbackMockState.lastScore).toEqual(supported)
  expect(footer).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(supported)
})

it('keeps mixed beat/slash primary summaries Korean and technical paths undisclosed', async () => {
  const xml = createMeasureStyleFixture().replace('</measure-style>', '</measure-style><measure-style><slash type="start" use-stems="yes"/></measure-style>')
  const report = await openXml(xml), footer = document.querySelector('.editor-status')
  expect(report.getAllByRole('listitem')).toHaveLength(3)
  expect(footer).toHaveTextContent('원본의 박 반복 기호는 보존하지 못했습니다.')
  expect(footer).toHaveTextContent('원본의 박·리듬 슬래시 표기는 보존하지 못했습니다.')
  expect(footer).not.toHaveTextContent('Unrepresented')
  for (const path of report.getAllByText(/^part\[1\]\.measure\[/)) expect(path).not.toBeVisible()
})
