// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWorkMovementFixture } from '../../testing/work-movement-fixture'
import { parseMusicXmlWithReport } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['all','mixed'] as const)('explains %s metadata losses in Korean at their real root paths and saves the unchanged score', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWorkMovementFixture(kind), expected = parseMusicXmlWithReport(createWorkMovementFixture(kind,true)).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/work.musicxml', fileName:'work.musicxml', contents:xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  const report = within(await screen.findByRole('region', { name:'MusicXML 경고 상세' }))
  const labels = ['작품번호','악장번호','별도 악장 제목']
  const paths = ['work.work-number','movement-number','movement-title']
  for (const [index,label] of labels.entries()) {
    const body = report.getByText(new RegExp(`원본 ${label}.*보존하지 못했습니다`))
    expect(body).toBeVisible(); expect(body).not.toHaveTextContent(/번째 파트|\d마디|\d쪽/)
    const row = within(body.closest('li')!), path = row.getByText(paths[index])
    expect(path).not.toBeVisible(); fireEvent.click(row.getByRole('button', { name:'기술 정보' })); expect(path).toBeVisible()
    expect(row.getByText(/Unrepresented work or movement metadata /)).toBeVisible()
  }
  expect(report.getAllByRole('listitem')).toHaveLength(kind === 'mixed' ? 6 : 3)
  if (kind === 'all') expect(document.querySelector('.studio-status__result')).toHaveTextContent('작품·악장 정보 손실')
  else {
    expect(report.getByText(/저작권 고지/)).toBeVisible()
    expect(report.getByText(/저자 이름·역할/)).toBeVisible()
    expect(report.getByText(/추가 글자·음악 기호/)).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.click(screen.getByRole('button', { name:'프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
})

it.each(['sameTitle','movementOnly','emptyNumbers'] as const)('does not invent a lost title or warning for the %s control', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const xml = createWorkMovementFixture(kind), expected = parseMusicXmlWithReport(xml).score
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath:'/fixture/control.musicxml', fileName:'control.musicxml', contents:xml })
  const { App } = await import('./App'); render(<App />)
  openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name:'MusicXML 가져오기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(expected))
  expect(screen.queryByRole('region', { name:'MusicXML 경고 상세' })).not.toBeInTheDocument()
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
