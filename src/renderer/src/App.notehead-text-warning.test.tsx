// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createNoteheadTextFixture } from '../../testing/notehead-text-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { playbackMockState, openStudioWorkspace, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each([{ owner: 'main', head: 'normal', textKind: 'letters' }, { owner: 'chord', head: 'diamond', textKind: 'mixed' }] as const)(
  'explains the separate notehead text loss without changing native notes or undo: $owner', async options => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const xml = createNoteheadTextFixture({ ...options, partCount: 2, targetPart: 2, targetMeasure: 2 }), score = parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/notehead-text.musicxml', fileName: 'notehead-text.musicxml', contents: xml })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = within(await screen.findByRole('region', { name: 'MusicXML 경고 상세' }))
    const summary = report.getByText(/^2번째 파트 · 2마디 · 원본 음표 머리 안의 글자와 임시표/)
    expect(summary).toBeVisible()
    const textRow = within(summary.closest('li')!)
    const index = options.owner === 'chord' ? 2 : 1
    const path = textRow.getByText(`part[2].measure[2].note[${index}].notehead-text`), raw = textRow.getByText(/^Unrepresented notehead text /)
    expect(path).not.toBeVisible(); expect(raw).not.toBeVisible()
    const technical = textRow.getByRole('button', { name: '기술 정보' })
    fireEvent.keyDown(technical, { key: 'Enter', code: 'Enter' }); fireEvent.keyDown(technical, { key: ' ', code: 'Space' })
    expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(technical); expect(path).toBeVisible(); expect(raw).toBeVisible()
    if (options.head === 'diamond') expect(report.getByText(/원본 음표 머리의 특수 모양/)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    const title = screen.getByLabelText('악보 제목')
    fireEvent.change(title, { target: { value: 'notehead text kept as source' } }); fireEvent.keyDown(title, { key: 'Enter' })
    const edited = structuredClone(playbackMockState.lastScore!)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const contents = vi.mocked(window.inC.project.save).mock.calls[0][0].contents
    expect(decodeNativeProject(contents).score).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection!)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'reopened-notehead-text.chromatics', filePath: '/fixture/reopened-notehead-text.chromatics', contents })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('reopened-notehead-text.chromatics을 열었습니다.'))
    expect(playbackMockState.lastScore).toEqual(edited)
  }
)
