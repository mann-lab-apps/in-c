// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMidiChannelFixture } from '../../testing/midi-channel-fixture'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

const state = vi.hoisted(() => ({ raster: vi.fn() }))
vi.mock('./image-export/raster', () => ({ rasterizePngPages: state.raster }))

describe('Restored print source completion', () => {
 registerAppTestHooks()
 beforeEach(() => state.raster.mockReset().mockResolvedValue({ pages: [{ pageNumber: 1, bytes: new Uint8Array([137,80,78,71]) }], totalPages: 1 }))
 for (const format of ['PDF', 'PNG'] as const) {
  it.each(['deleted', 'undo-restored'] as const)(`export.print-restored-source ${format} %s keeps current content and reports only omitted changes`, async action => {
   window.history.replaceState({}, '', '/?fixture=release-test')
   const project = createNativeProject(createMidiChannelFixture(2).score)
   vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/print-source.chromatics', fileName: 'print-source.chromatics', contents: encodeNativeProject(project) })
   let finish!: () => void
   if (format === 'PDF') vi.mocked(window.inC.pdf.save).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ fileName: 'source-copy.pdf' }) }))
   else vi.mocked(window.inC.png.save).mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({ fileName: 'source-copy.png', filePath: '/scores/source-copy.png', pageCount: 1, kind: 'file' }) }))
   const { App } = await import('./App')
   render(<App />)
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
   await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
   const source = structuredClone(playbackMockState.lastScore!)
   openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button', { name: format === 'PDF' ? 'PDF 변환' : 'PNG 내보내기' }))
   await waitFor(() => expect(format === 'PDF' ? window.inC.pdf.save : window.inC.png.save).toHaveBeenCalledOnce())
   const snapshot = document.querySelector(format === 'PDF' ? '.studio-pdf-snapshot' : '.studio-image-snapshot')!
   expect(snapshot).toBeInTheDocument()
   openStudioWorkspace('악보');fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
   await waitFor(() => expect(playbackMockState.lastScore!.parts).toHaveLength(1))
   if (action === 'undo-restored') {
    const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
    fireEvent.click(menu.getByRole('button', { name: '편집' }))
    fireEvent.click(menu.getByRole('menuitem', { name: '실행 취소' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
   }
   expect(snapshot).toBeInTheDocument()
   expect(snapshot.querySelector('.metadata-display--title')).toHaveTextContent(source.title!)
   const current = structuredClone(playbackMockState.lastScore!)
   const dirty = document.querySelector('.studio-document__state')!.textContent
   const selected = document.querySelector('.score-canvas [data-testid="notation-preview"]')!
   expect(selected).toBeInTheDocument()
   const selection = selected.getAttribute('data-selected-event-address')
   await act(async () => finish())
   const status = document.querySelector('.studio-status__result')!
   await waitFor(() => expect(status).toHaveTextContent(`source-copy.${format.toLowerCase()}`))
   const omitted = format === 'PDF' ? '출력 시작 이후의 수정 내용은 포함되지 않았습니다.' : '출력 시작 이후의 수정이나 보기 변경은 포함되지 않았습니다.'
   if (action === 'deleted') expect(status).toHaveTextContent(omitted)
   else expect(status).not.toHaveTextContent(omitted)
   expect(playbackMockState.lastScore).toEqual(current)
   expect(document.querySelector('.studio-document__state')).toHaveTextContent(dirty!)
   expect(document.querySelector('.score-canvas [data-testid="notation-preview"]')).toHaveAttribute('data-selected-event-address', selection!)
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
   await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
   expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(current)
  })
 }
})
