// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor , within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createWordsItalicFixture } from '../../testing/words-italic-fixture'
import { parseMusicXml } from '../../musicxml'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { createPlaybackTimeline } from './playback/timeline'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvFileTools = () => within(screen.getByRole('region', { name: '파일 및 선택 도구' }))
const hvExportTools = () => within(screen.getByRole('region', { name: '내보내기 작업' }))
const hvPreview = () => within(screen.getByTestId('notation-preview'))
const hvTempo = () => within(screen.getByRole('region', { name: '빠르기' }))
registerAppTestHooks()
it.each((['eighth', '16th'] as const).flatMap(unit => (['2:1', '3:2'] as const).map(ratio => ({ unit, ratio, label: `${unit === 'eighth' ? '8분' : '16분'} · ${ratio}` }))))(
  'sets explicit global $unit $ratio with one undo, old notation unchanged and native save/reopen', async ({ unit, ratio, label }) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let source = createWordsItalicFixture('rhythm').replace(/<direction\b[^>]*>[\s\S]*?<\/direction>/g, '')
    if (unit === '16th') source = source.replace(/<note><pitch><step>D<\/step><octave>4<\/octave><\/pitch><duration>2<\/duration><type>eighth<\/type><\/note>/g, note => note.replace('<duration>2</duration><type>eighth</type>', '<duration>1</duration><type>16th</type>').repeat(2))
    const encoded = encodeNativeProject(createNativeProject(parseMusicXml(source))), original = decodeNativeProject(encoded).score
    expect(original.rhythmFeel).toBeUndefined()
    expect(original.parts[1].staves[0].measures[1].voices[0].events).toHaveLength(unit === 'eighth' ? 8 : 16)
    const midi = serializeMidi(original), timeline = createPlaybackTimeline(original)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'visual-rhythm.chromatics', filePath: '/fixture/visual-rhythm.chromatics', contents: encoded })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(hvFileTools().getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(original))
    openStudioWorkspace('악보')
    const select = hvTempo().getByRole('combobox', { name: '전역 스윙 재생' })
    expect(select).toHaveTextContent('꺼짐')
    fireEvent.click(select); fireEvent.click(screen.getByRole('option', { name: label }))
    const changed = structuredClone(playbackMockState.lastScore!)
    expect(changed.rhythmFeel).toBeUndefined()
    expect(changed.swingPlayback).toEqual({ unit, ratio })
    expect(serializeMidi(changed)).not.toEqual(midi)
    expect(createPlaybackTimeline(changed)).not.toEqual(timeline)
    fireEvent.keyDown(select, { key: ' ', code: 'Space', isComposing: true, keyCode: 229 })
    expect(playbackMockState.play).not.toHaveBeenCalled()
    openStudioWorkspace('내보내기'); fireEvent.click(hvExportTools().getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    const copy = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    expect(copy.swingPlayback).toEqual(changed.swingPlayback)
    expect(serializeMidi(copy)).toEqual(serializeMidi(changed))
    expect(playbackMockState.lastScore).toEqual(changed)
    const first = original.parts[0].staves[0].measures[0].voices[0].events[0]
    fireEvent.click(hvPreview().getByRole('button', { name: first.id + ' 선택' }))
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ fileName: 'visual-rhythm.chromatics', filePath: '/fixture/visual-rhythm.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(hvFileTools().getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('visual-rhythm.chromatics에 저장했습니다.'))
    const saved = vi.mocked(window.inC.project.save).mock.calls[0][0]
    expect(saved.filePath).toBe('/fixture/visual-rhythm.chromatics')
    expect(decodeNativeProject(saved.contents).score).toEqual(changed)
    expect(serializeMidi(decodeNativeProject(saved.contents).score)).toEqual(serializeMidi(changed))
    openStudioWorkspace('악보'); fireEvent.click(hvTempo().getByRole('combobox', { name: '전역 스윙 재생' })); fireEvent.click(screen.getByRole('option', { name: '꺼짐 · 직선 리듬' }))
    expect(playbackMockState.lastScore?.swingPlayback).toBeUndefined()
    expect(serializeMidi(playbackMockState.lastScore!)).toEqual(midi)
    fireEvent.click(hvPreview().getByRole('button', { name: first.id + ' 선택' }))
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(changed)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ fileName: 'swing-reopened.chromatics', filePath: '/fixture/swing-reopened.chromatics', contents: saved.contents })
    openStudioWorkspace('파일'); fireEvent.click(hvFileTools().getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(document.querySelector('.studio-status__result')).toHaveTextContent('swing-reopened.chromatics을 열었습니다.'))
    expect(playbackMockState.lastScore).toEqual(changed)
    openStudioWorkspace('악보'); expect(hvTempo().getByRole('combobox', { name: '전역 스윙 재생' })).toHaveTextContent(label)
  }
)
