// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'
import { encodeNativeProject } from '../../project/schema'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const entries = [
  { fileName: 'a.musicxml', filePath: '/fixture/a.musicxml', openedAt: '2026-11-11T00:00:00Z' },
  { fileName: 'b.musicxml', filePath: '/fixture/b.musicxml', openedAt: '2026-11-11T00:00:00Z' },
  { fileName: 'native.chromatics', filePath: '/fixture/native.chromatics', openedAt: '2026-11-11T00:00:00Z', format: 'native' as const }
]
type File = { filePath: string; fileName: string; contents: string }
async function setup() {
  window.history.replaceState({}, '', '/')
  vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue(entries)
  const tasks: { resolve: (file: File) => void; reject: (error: Error) => void }[] = []
  vi.mocked(window.inC.recentMusicXml.open).mockImplementation(() => new Promise((resolve, reject) => { tasks.push({ resolve, reject }) }))
  const project = createPartSpanResetFixture()
  const file = (index: number, title = 'Incoming recent score'): File => ({ ...entries[index], contents: serializeMusicXml({ ...project.score, title }) })
  const { App } = await import('./App'); const rendered = render(<App />)
  await screen.findByRole('button', { name: entries[0].fileName })
  const original = structuredClone(playbackMockState.lastScore)
  const button = (index: number) => screen.getByRole('button', { name: entries[index].fileName })
  const row = (index: number) => within(button(index).closest('article')!)
  const pending = (index: number) => row(index).getByRole('status', { name: `${entries[index].fileName} 읽기 상태` })
  const notPending = (index: number) => expect(screen.queryByRole('status', { name: `${entries[index].fileName} 읽기 상태` })).not.toBeInTheDocument()
  const open = (index: number) => { act(() => button(index).focus()); fireEvent.click(button(index)) }
  return { project, tasks, file, rendered, original, button, pending, notPending, open }
}

it.each(['success', 'failure'] as const)('shows the current recent XML read until %s without blocking other files', async outcome => {
  const c = await setup()
  try {
    c.open(0)
    expect(c.pending(0)).toHaveTextContent('불러오는 중')
    expect(c.button(0)).toBeEnabled(); expect(c.button(1)).toBeEnabled(); c.notPending(1)
    const focus = document.activeElement
    if (outcome === 'success') {
      const file = c.file(0)
      await act(async () => c.tasks[0].resolve(file))
      expect(playbackMockState.lastScore).toEqual(parseMusicXml(file.contents))
      expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
    } else {
      await act(async () => c.tasks[0].reject(Error('Current recent read failed')))
      expect(screen.getByRole('alert')).toHaveTextContent('현재 악보는 유지됩니다.')
      expect(playbackMockState.lastScore).toEqual(c.original)
      expect(document.activeElement).toBe(focus)
    }
    c.notPending(0)
    expect(window.inC.project.save).not.toHaveBeenCalled()
  } finally { cleanup() }
})

it('keeps the newer row pending after an older success and clears it on the current failure', async () => {
  const c = await setup()
  try {
    c.open(0); c.open(1); c.notPending(0); expect(c.pending(1)).toBeVisible()
    await act(async () => c.tasks[0].resolve(c.file(0, 'Obsolete score')))
    expect(c.pending(1)).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(c.original)
    await act(async () => c.tasks[1].reject(Error('Newest recent read failure')))
    c.notPending(0); c.notPending(1)
    expect(screen.getByText('Newest recent read failure')).toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(c.original)
    expect(document.querySelector('.studio-start')).toBeVisible()
  } finally { cleanup() }
})

it('does not clear a newer read of the same path when its older response finishes', async () => {
  const c = await setup()
  try {
    c.open(0); c.open(0); expect(c.pending(0)).toBeVisible()
    await act(async () => c.tasks[0].resolve(c.file(0, 'Older same-path score')))
    expect(c.pending(0)).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(c.original)
    const newest = c.file(0, 'Newest same-path score')
    await act(async () => c.tasks[1].resolve(newest))
    c.notPending(0); expect(playbackMockState.lastScore).toEqual(parseMusicXml(newest.contents))
  } finally { cleanup() }
})

it('clears the XML read when a new-score wizard starts and does not revive it on cancel', async () => {
  const c = await setup()
  try {
    c.open(0); expect(c.pending(0)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' })); c.notPending(0)
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '취소' }))
    await act(async () => c.tasks[0].resolve(c.file(0, 'Obsolete after wizard')))
    c.notPending(0); expect(playbackMockState.lastScore).toEqual(c.original)
    expect(document.querySelector('.studio-start')).toBeVisible()
  } finally { cleanup() }
})

it('clears the XML read when a newer Native picker owns the operation, including cancel', async () => {
  const c = await setup()
  try {
    let cancelNative!: (file: null) => void
    vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise(resolve => { cancelNative = resolve }))
    c.open(0); expect(c.pending(0)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' })); c.notPending(0)
    expect(screen.getByRole('button', { name: '프로젝트 열기' })).toBeDisabled()
    await act(async () => cancelNative(null))
    await act(async () => c.tasks[0].resolve(c.file(0, 'Obsolete after Native cancel')))
    c.notPending(0); expect(playbackMockState.lastScore).toEqual(c.original)
  } finally { cleanup() }
})

it('does not apply an old recent read after unmount', async () => {
  const c = await setup()
  c.open(0); expect(c.tasks).toHaveLength(1); c.rendered.unmount()
  await act(async () => c.tasks[0].resolve(c.file(0, 'Obsolete after unmount')))
  expect(playbackMockState.lastScore).toEqual(c.original)
  expect(window.inC.project.save).not.toHaveBeenCalled()
})

it('preserves the existing Native recent busy path without showing an XML status', async () => {
  const c = await setup()
  try {
    c.open(2); c.notPending(0); c.notPending(1)
    expect(screen.getByRole('button', { name: '프로젝트 열기' })).toBeDisabled()
    await act(async () => c.tasks[0].resolve({ ...entries[2], contents: encodeNativeProject(c.project) }))
    expect(playbackMockState.lastScore).toEqual(c.project.score)
    expect(window.inC.project.save).not.toHaveBeenCalled()
  } finally { cleanup() }
})

it.each(['missing-again', 'restored'] as const)('keeps the missing-file marker and pending state distinct when the retry is %s', async outcome => {
  const c = await setup()
  try {
    c.open(0)
    await act(async () => c.tasks[0].reject(Error('최근 파일을 찾을 수 없습니다')))
    c.notPending(0)
    const row = () => within(c.button(0).closest('article')!)
    expect(row().getByText('파일을 찾을 수 없음')).toBeVisible()
    expect(screen.getByRole('button', { name: '목록에서 지우기' })).toBeEnabled()
    c.open(0)
    expect(c.pending(0)).toHaveTextContent('불러오는 중')
    expect(row().queryByText('파일을 찾을 수 없음')).not.toBeInTheDocument()
    expect(c.button(0)).toBeEnabled(); expect(c.button(1)).toBeEnabled()
    expect(screen.getByRole('button', { name: '목록에서 지우기' })).toBeEnabled()
    expect(document.activeElement).toBe(c.button(0))
    if (outcome === 'missing-again') {
      await act(async () => c.tasks[1].reject(Error('최근 파일을 찾을 수 없습니다')))
      c.notPending(0)
      expect(row().getByText('파일을 찾을 수 없음')).toBeVisible()
      expect(document.activeElement).toBe(c.button(0))
      expect(playbackMockState.lastScore).toEqual(c.original)
    } else {
      const restored = c.file(0, 'Restored recent file')
      await act(async () => c.tasks[1].resolve(restored))
      c.notPending(0)
      expect(document.querySelector('.studio-start')).not.toBeInTheDocument()
      expect(playbackMockState.lastScore).toEqual(parseMusicXml(restored.contents))
    }
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  } finally { cleanup() }
})


async function removePendingRecentRow() {
  const c = await setup()
  c.open(0)
  await act(async () => c.tasks[0].reject(Error('최근 파일을 찾을 수 없습니다')))
  c.open(0)
  expect(c.pending(0)).toBeVisible()
  vi.mocked(window.inC.recentMusicXml.remove).mockResolvedValueOnce(entries.slice(1))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '목록에서 지우기' })))
  expect(screen.queryByRole('button', { name: entries[0].fileName })).not.toBeInTheDocument()
  expect(window.inC.recentMusicXml.remove).toHaveBeenCalledWith({ filePath: entries[0].filePath })
  return c
}

it.each(['success', 'failure'] as const)('keeps a current XML read visible after its recent row is removed until %s', async outcome => {
  try {
    const c = await removePendingRecentRow()
    const status = screen.getByRole('status', { name: `${entries[0].fileName} 읽기 상태` })
    expect(status).toBeVisible()
    expect(status).toHaveTextContent(entries[0].fileName)
    expect(status).toHaveTextContent('불러오는 중')
    expect(c.button(1)).toBeEnabled()
    expect(playbackMockState.lastScore).toEqual(c.original)
    if (outcome === 'success') {
      const restored = c.file(0, 'Read survives list removal')
      await act(async () => c.tasks[1].resolve(restored))
      expect(playbackMockState.lastScore).toEqual(parseMusicXml(restored.contents))
      expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith({ filePath: restored.filePath, fileName: restored.fileName })
    } else {
      await act(async () => c.tasks[1].reject(Error('Actual retry failed after list removal')))
      expect(screen.getByText('Actual retry failed after list removal')).toBeInTheDocument()
      expect(playbackMockState.lastScore).toEqual(c.original)
    }
    c.notPending(0)
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  } finally { cleanup() }
})

it.each(['success', 'failure'] as const)('replaces removed-row progress with a newer read without reviving it after an older %s', async outcome => {
  try {
    const c = await removePendingRecentRow()
    expect(screen.getByRole('status', { name: `${entries[0].fileName} 읽기 상태` })).toBeVisible()
    c.open(1)
    c.notPending(0)
    expect(c.pending(1)).toBeVisible()
    expect(screen.getAllByRole('status', { name: / 읽기 상태$/ })).toHaveLength(1)
    await act(async () => {
      if (outcome === 'success') c.tasks[1].resolve(c.file(0, 'Obsolete removed row'))
      else c.tasks[1].reject(Error('Obsolete removed-row error'))
    })
    c.notPending(0)
    expect(c.pending(1)).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(c.original)
    await act(async () => c.tasks[2].reject(Error('Newest row failure')))
    c.notPending(0); c.notPending(1)
    expect(screen.getByText('Newest row failure')).toBeInTheDocument()
    expect(screen.queryByText('Obsolete removed-row error')).not.toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(c.original)
  } finally { cleanup() }
})
