// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace } from './App.test-harness'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'

describe('native page-setup serialization preserves source values', () => {
  registerAppTestHooks()
  it.each([
    ['native', 70], ['native', 200], ['native', 95],
    ['backup', 70], ['backup', 200], ['recovery', 70], ['recovery', 200]
  ] as const)('keeps %s source scale %s without silently clamping or adding optional fields', async (entry, staffSizePercent) => {
    window.history.replaceState({}, '', entry === 'recovery' ? '/' : '/?fixture=release-test')
    const project = createPrintHeaderFixture('short')
    project.view = { mode: 'part', partId: project.score.parts[0].id }
    project.partLayouts = [{ partId: project.score.parts[0].id, title: 'Stored source', layout: { pageSetup: { staffSizePercent } } }]
    const bytes = encodeNativeProject(project)
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/owned/source.chromatics', fileName: 'source.chromatics', contents: bytes })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/owned/saved.chromatics', fileName: 'saved.chromatics' })
    if (entry === 'backup') {
      vi.mocked(window.inC.project.listBackups).mockResolvedValue([{ id: 'owned', fileName: 'source.chromatics', title: 'Stored source', updatedAt: '2026-10-29T00:00:00Z' }])
      vi.mocked(window.inC.project.readBackup).mockResolvedValue({ contents: bytes })
    } else if (entry === 'recovery') {
      vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-10-29T00:00:00Z', version: 'test' } })
    }
    const { App } = await import('./App')
    render(<App />)
    if (entry === 'recovery') fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    else {
      openStudioWorkspace('파일')
      if (entry === 'backup') {
        fireEvent.click(screen.getByRole('button', { name: '프로젝트 백업' }))
        fireEvent.click(await within(screen.getByRole('dialog', { name: '프로젝트 백업' })).findByRole('button', { name: 'Stored source 복구' }))
      } else fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    }
    await waitFor(() => expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Stored source'))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved).toEqual(project)
  })
  it('keeps actual page edits and exact undo separate from print-only normalization', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const project = createPrintHeaderFixture('short'), partId = project.score.parts[0].id
    project.view = { mode: 'part', partId }
    project.partLayouts = [{ partId, title: 'Stored source', layout: { pageSetup: { staffSizePercent: 70 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/owned/source.chromatics', fileName: 'source.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/owned/saved.chromatics', fileName: 'saved.chromatics' })
    const { App } = await import('./App')
    render(<App />); openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Stored source'))
    openStudioWorkspace('내보내기')
    expect(screen.getByRole('slider', { name: /PDF 보표 크기/ })).toHaveValue('75')
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const edited = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(edited.score).toEqual(project.score)
    expect(edited.partLayouts[0].layout.pageSetup).toMatchObject({ staffSizePercent: 75, pageMarginMm: 17 })
    await waitFor(() => expect(screen.getByRole('button', { name: '프로젝트 저장' })).toBeEnabled())
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)).toEqual(project)
    await waitFor(() => expect(screen.getByRole('button', { name: '프로젝트 저장' })).toBeEnabled())
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents)).toEqual(edited)
  })
})
