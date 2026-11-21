// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { encodeNativeProject } from '../../project/schema'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

const entry = { fileName: 'pending.musicxml', filePath: '/fixture/pending.musicxml', openedAt: '2026-11-08T00:00:00Z' }

it('keeps editor commands unavailable while a recent XML read still owns the welcome screen', async () => {
  window.history.replaceState({}, '', '/')
  const incoming = { ...createPartSpanResetFixture().score, title: 'Pending recent replacement' }
  const contents = serializeMusicXml(incoming)
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
  let finish!: (file: { fileName: string; filePath: string; contents: string }) => void
  vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const { App } = await import('./App'); render(<App />)
  const before = structuredClone(playbackMockState.lastScore)
  fireEvent.click(await screen.findByRole('button', { name: /pending\.musicxml/ }))
  expect(finish).toBeTypeOf('function')
  expect(document.querySelector('.studio-start')).toBeVisible()
  expect(screen.queryByRole('button', { name: '악보 정보' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '악보 제목 수정' })).not.toBeInTheDocument()
  const keys = [
    { key: 'n', code: 'KeyN' }, { key: 'c', code: 'KeyC' },
    { key: 'ArrowUp', code: 'ArrowUp' }, { key: '5', code: 'Digit5' },
    { key: 'z', code: 'KeyZ', ctrlKey: true }, { key: 's', code: 'KeyS', ctrlKey: true },
    { key: 's', code: 'KeyS', metaKey: true }
  ]
  for (const key of keys) fireEvent.keyDown(window, key)
  expect(playbackMockState.lastScore).toEqual(before)
  expect(window.inC.project.save).not.toHaveBeenCalled()
  expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  const confirm = vi.mocked(window.confirm); confirm.mockClear()
  await act(async () => finish({ ...entry, contents }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(parseMusicXml(contents)))
  expect(confirm).not.toHaveBeenCalled()
  expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '악보 정보' })).toBeVisible()
  openStudioWorkspace('파일')
  expect(screen.queryByRole('button', { name: /pending\.musicxml/ })).not.toBeInTheDocument()
})

it('does not expose recent-file actions after a Native document has opened', async () => {
  window.history.replaceState({}, '', '/')
  const project = createPartSpanResetFixture()
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
  vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([entry])
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'current.chromatics', filePath: '/fixture/current.chromatics', contents: encodeNativeProject(project) })
  const { App } = await import('./App'); render(<App />)
  await screen.findByRole('button', { name: /pending\.musicxml/ })
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
  await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
  openStudioWorkspace('파일')
  expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /pending\.musicxml/ })).not.toBeInTheDocument()
  expect(window.inC.recentMusicXml.open).not.toHaveBeenCalled()
})
