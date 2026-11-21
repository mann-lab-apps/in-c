// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createCreatorMetadataFixture, type CreatorMetadataKind } from '../../testing/creator-metadata-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
async function importFixture(kind: CreatorMetadataKind) {
  window.history.replaceState({}, '', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({
    filePath: '/fixture/creators.musicxml', fileName: 'creators.musicxml', contents: createCreatorMetadataFixture(kind)
  })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  return within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
}

it('explains partial author metadata loss without inventing a page/part/measure or changing the saved score', async () => {
  const report = await importFixture('mixed')
  expect(report.getByText(/^원본의 일부 저자 이름·역할은 현재 악보에 보존하지 못했습니다/)).toBeVisible()
  expect(report.queryByText(/번째 파트|[0-9]마디|[0-9]쪽/)).not.toBeInTheDocument()
  expect(document.querySelector('.studio-status__result')).toHaveTextContent('저자 정보 손실')
  const raw = report.getByText(/Unrepresented creator metadata /)
  expect(raw).not.toBeVisible()
  fireEvent.keyDown(report.getByRole('button', { name: '기술 정보' }), { key: ' ', code: 'Space' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  fireEvent.click(report.getByRole('button', { name: '기술 정보' }))
  expect(raw).toBeVisible()
  expect(report.getByText('identification.creator[2]')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(JSON.parse(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(playbackMockState.lastScore)
  expect(playbackMockState.lastScore?.composer).toBe('검증 작곡가')
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('groups repeated creator metadata using author labels while retaining every raw entry', async () => {
  const report = await importFixture('many')
  const toggle = report.getByRole('button', { name: '저자별 경고 상세 30개' })
  expect(report.queryByRole('button', { name: /페이지별|마디별/ })).not.toBeInTheDocument()
  expect(report.getAllByText(/Unrepresented creator metadata /)).toHaveLength(30)
  fireEvent.click(toggle)
  expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(30)
  expect(report.getByText('identification.creator[30]')).not.toBeVisible()
})

it('retains mixed rights and creator rows instead of hiding unrelated warnings behind an author summary', async () => {
  const report = await importFixture('manyRights')
  expect(report.queryByRole('button', { name: /저자별 경고 상세/ })).not.toBeInTheDocument()
  expect(report.getAllByRole('button', { name: '기술 정보' })).toHaveLength(31)
  expect(report.getByText(/원본 저작권 고지/)).toBeVisible()
})
