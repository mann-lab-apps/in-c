// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsItalicFixture } from '../../testing/words-italic-fixture'
import { parseMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { createPlaybackTimeline } from './playback/timeline'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each([{ unit: 'eighth', label: '8분 셋잇단 느낌' }, { unit: '16th', label: '16분 셋잇단 느낌' }] as const)(
  'keeps the existing $unit notation selector independent of performed timing and one undo/native save', async ({ unit, label }) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const source = createWordsItalicFixture('rhythm').replace(/<direction\b[^>]*>[\s\S]*?<\/direction>/g, '')
    const encoded = encodeNativeProject(createNativeProject(parseMusicXml(source))), original = decodeNativeProject(encoded).score
    expect(original.rhythmFeel).toBeUndefined()
    expect(original.parts[1].staves[0].measures[1].voices[0].events).toHaveLength(8)
    const midi = serializeMidi(original), timeline = createPlaybackTimeline(original)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'visual-rhythm.chromatics', filePath: '/fixture/visual-rhythm.chromatics', contents: encoded })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(original))
    openStudioWorkspace('악보')
    const select = screen.getByRole('combobox', { name: '리듬 해석 표기' })
    expect(select).toHaveTextContent('없음')
    fireEvent.click(select); fireEvent.click(screen.getByRole('option', { name: label }))
    const changed = structuredClone(playbackMockState.lastScore!)
    expect(changed.rhythmFeel).toEqual({ unit })
    expect(serializeMidi(changed)).toEqual(midi)
    expect(createPlaybackTimeline(changed)).toEqual(timeline)
    expect(playbackMockState.play).not.toHaveBeenCalled()
    const first = original.parts[0].staves[0].measures[0].voices[0].events[0]
    fireEvent.click(screen.getByRole('button', { name: first.id + ' 선택' }))
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
    expect(saved.filePath).toBe('/fixture/visual-rhythm.chromatics')
    expect(decodeNativeProject(saved.contents).score).toEqual(changed)
    expect(serializeMidi(decodeNativeProject(saved.contents).score)).toEqual(midi)
  }
)
