// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { useMemo } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import recentMusicXml from '../../musicxml/fixtures/single-part-treble.musicxml?raw'
import tupletInputProgressMusicXml from '../../musicxml/fixtures/tuplet-input-progress.musicxml?raw'
import richPartExportMusicXml from '../../musicxml/fixtures/expanded-v1-part-export.musicxml?raw'
import restHairpinMusicXml from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { parseMusicXml } from '../../musicxml'
import { TICKS_PER_QUARTER } from '../../score-core'
import { listSpans, spanEndpointOptions } from './editor/span-editing'
import { unsavedScoreChangesMessage } from './editor/file-lifecycle'
import { demoScore } from './notation/demo-score'
import { partPresets, scoreStructurePresets } from './editor/new-score'
import { instrumentTranspositionPresets } from './editor/instrument-transposition'
import { createPlaybackTimeline, findPlaybackEvent } from './playback/timeline'
import { withPercussionClef, twoPartMusicXmlWithPrimaryAnnotations, playbackMockState, installPreloadStub, installLocalStorageStub, choosePageSetup, chooseNewScoreTemplate, printingPreview, focusTestBody, openStudioWorkspace, openNotationSettings, openSpanFinder, chooseSelectionFilter, openHarmonyProperties, chooseInspectorDynamic, choosePartSetup, chooseScoreView, staffTargetLabel, chooseStaffTarget, expectStaffTarget, selectedSpanReference, chooseSpanReference, chooseSpanEndpoint, expectSpanEndpoint, expandNoteDetails, installCompactDockMedia, asciiBytes, registerAppTestHooks } from './App.test-harness'

describe('App component shell', () => {
  registerAppTestHooks()

  it.each(['same', 'reordered', 'unequal'] as const)('studio.tie-toolbar-contract preserves creation and one undo for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createWholeChordTieScore, createReorderedWholeChordTieScore, createUnequalChordTieScore } = await import('../../testing/chord-tie-fixture')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const source = kind === 'same' ? createWholeChordTieScore(false) : kind === 'reordered' ? createReorderedWholeChordTieScore(false, true) : createUnequalChordTieScore('changed-member')
    for (const m of source.parts[0].staves[0].measures) for (const n of m.voices[0].events) if (n.type === 'note') delete n.ties
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/untied.chromatics', fileName: 'untied.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button', { name: 'chord-tie-1 선택' }))
    const add = screen.getByRole('button', { name: '타이 추가, 단축키 T' })
    if (kind === 'unequal') {
      expect(add).toBeDisabled(); fireEvent.click(add)
      fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
      expect(document.querySelector('.editor-status')).toHaveTextContent('같은 구성음의 화음')
      expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      expect(playbackMockState.lastScore).toEqual(source)
      expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    } else {
      expect(add).toBeEnabled(); fireEvent.click(add)
      const tied = structuredClone(source)
      const first = tied.parts[0].staves[0].measures[0].voices[0].events[0], second = tied.parts[0].staves[0].measures[1].voices[0].events[0]
      if (first.type !== 'note' || second.type !== 'note') throw Error('Fixture')
      first.ties = { start: true }; second.ties = { stop: true }
      expect(playbackMockState.lastScore).toEqual(tied)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'chord-tie-1')
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
      expect(playbackMockState.lastScore).toEqual(tied)
      fireEvent.click(screen.getByRole('button', { name: '타이 해제, 단축키 T' }))
      expect(playbackMockState.lastScore).toEqual(source)
    }
  })

  it.each(['changed-member', 'fewer-members', 'changed-alter'] as const)(
    'studio.unequal-chord-warning preserves legacy data and repairs %s with one undo', async kind => {
      window.history.replaceState({}, '', '/?fixture=demo')
      const { createUnequalChordTieScore, createWholeChordTieScore } = await import('../../testing/chord-tie-fixture')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const source = createUnequalChordTieScore(kind), native = encodeNativeProject(createNativeProject(source))
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/legacy.chromatics', fileName: 'legacy.chromatics', contents: native })
      const { App } = await import('./App'); render(<App />)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      const warning = await screen.findByRole('region', { name: '서로 다른 화음 타이 안내' })
      expect(warning).toHaveTextContent('1마디')
      expect(warning).toHaveTextContent('재생과 MusicXML 결과가 다를 수 있습니다')
      expect(playbackMockState.lastScore).toEqual(source)
      expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
      expect(within(warning).getByText(/Unequal chord ties/)).not.toBeVisible()
      const canvas = screen.getByLabelText('악보 캔버스')
      canvas.scrollIntoView = vi.fn() // jsdom has no layout/scroll API; native QA checks the real note.
      fireEvent.click(within(warning).getByRole('button', { name: /타이 음표 선택/ }))
      await waitFor(() => expect(canvas).toHaveFocus())
      expect(canvas.scrollIntoView).toHaveBeenCalledOnce()
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'chord-tie-1')
      fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
      expect(screen.queryByRole('region', { name: '서로 다른 화음 타이 안내' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '타이 추가, 단축키 T' })).toBeDisabled()
      const repaired = structuredClone(playbackMockState.lastScore!)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      expect(screen.getByRole('region', { name: '서로 다른 화음 타이 안내' })).toBeInTheDocument()
      expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
      expect(playbackMockState.lastScore).toEqual(repaired)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/legacy.chromatics', fileName: 'legacy.chromatics' })
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
      const next = createWholeChordTieScore(false)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/normal.chromatics', fileName: 'normal.chromatics', contents: encodeNativeProject(createNativeProject(next)) })
      vi.spyOn(window, 'confirm').mockReturnValue(true)
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await waitFor(() => expect(playbackMockState.lastScore).toEqual(next))
      expect(screen.queryByRole('region', { name: '서로 다른 화음 타이 안내' })).not.toBeInTheDocument()
    }
  )

  it('studio.unequal-chord-warning identifies duplicate parts and selects the exact owner', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createUnequalChordTieScore } = await import('../../testing/chord-tie-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const score = createUnequalChordTieScore('changed-member'), peer = structuredClone(score.parts[0])
    peer.id += '-b'; peer.staves[0].id += '-b'
    for (const m of peer.staves[0].measures) { m.id += '-b'; for (const n of m.voices[0].events) n.id += '-b' }
    score.parts.push(peer)
    const project = createNativeProject(score); project.view = { mode: 'part', partId: score.parts[0].id }
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/ensemble.chromatics', fileName: 'ensemble.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    const notice = await screen.findByRole('region', { name: '서로 다른 화음 타이 안내' })
    const target = within(notice).getByRole('button', { name: '2 · Tie QA · 보표 1 · 1마디 타이 음표 선택' })
    const canvas = screen.getByLabelText('악보 캔버스'); canvas.scrollIntoView = vi.fn()
    fireEvent.click(target); await waitFor(() => expect(canvas).toHaveFocus())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'chord-tie-1-b')
    expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
    expect(playbackMockState.lastScore!.parts[0]).toEqual(score.parts[0])
    expect(within(screen.getByRole('region', { name: '서로 다른 화음 타이 안내' })).getAllByRole('button', { name: /타이 음표 선택/ })).toHaveLength(1)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(score)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/ensemble.chromatics', fileName: 'ensemble.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
    expect(saved.score).toEqual(score); expect(saved.view).toEqual({ mode: 'part', partId: peer.id })
  })

  it.each(['repair-success', 'replace-success', 'replace-error'] as const)(
    'studio.legacy-tie-export-snapshot scopes the old warning through %s', async scenario => {
      window.history.replaceState({}, '', '/?fixture=demo')
      const { createUnequalChordTieScore, createWholeChordTieScore, createReorderedWholeChordTieScore } = await import('../../testing/chord-tie-fixture')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const { serializeMidi } = await import('./midi/serialize-midi')
      const source = createUnequalChordTieScore('changed-member'), next = createWholeChordTieScore(false)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/legacy.chromatics', fileName: 'legacy.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
      let finish!: (value: { fileName: string }) => void, fail!: (error: Error) => void
      vi.mocked(window.inC.midi.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
      const { App } = await import('./App'); render(<App />)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      const warning = await screen.findByRole('region', { name: '서로 다른 화음 타이 안내' })
      openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
      await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledOnce())
      const request = vi.mocked(window.inC.midi.save).mock.calls[0][0]
      expect(request.contents).toEqual(Array.from(serializeMidi(createReorderedWholeChordTieScore(false))))
      if (scenario === 'repair-success') {
        const canvas = screen.getByLabelText('악보 캔버스'); canvas.scrollIntoView = vi.fn()
        fireEvent.click(within(warning).getByRole('button', { name: /타이 음표 선택/ })); await waitFor(() => expect(canvas).toHaveFocus())
        fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
      } else {
        vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/normal.chromatics', fileName: 'normal.chromatics', contents: encodeNativeProject(createNativeProject(next)) })
        openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
        await waitFor(() => expect(playbackMockState.lastScore).toEqual(next))
      }
      const expected = structuredClone(playbackMockState.lastScore!), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      expect(screen.queryByRole('region', { name: '서로 다른 화음 타이 안내' })).not.toBeInTheDocument()
      await act(async () => { if (scenario === 'replace-error') fail(new Error('Owned old MIDI failure')); else finish({ fileName: 'queued-legacy.mid' }) })
      if (scenario === 'repair-success') {
        const report = screen.getByRole('region', { name: 'MIDI 경고 상세' })
        expect(report).toHaveTextContent('queued-legacy.mid'); expect(report).toHaveTextContent('1마디 · 서로 다른 화음')
        expect(report).toHaveTextContent('내보낸 파일에는 기존 타이가 포함')
        expect(report).not.toHaveTextContent('T로 타이를 해제')
        expect(document.querySelector('.editor-status')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
        expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      } else {
        expect(screen.queryByRole('region', { name: 'MIDI 경고 상세' })).not.toBeInTheDocument()
        expect(document.querySelector('.editor-status')).not.toHaveTextContent('queued-legacy.mid')
        expect(document.body).not.toHaveTextContent('Owned old MIDI failure')
        expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
      }
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected)
      expect(playbackMockState.lastScore).toEqual(expected)
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics' })
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
      if (scenario === 'repair-success') {
        fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
        expect(playbackMockState.lastScore).toEqual(source)
        expect(screen.getByRole('region', { name: '서로 다른 화음 타이 안내' })).toBeInTheDocument()
      }
    }
  )

  it.each(['repair-success', 'replace-success', 'replace-error'] as const)(
    'studio.legacy-tie-xml-snapshot scopes the old warning through %s', async scenario => {
      window.history.replaceState({}, '', '/?fixture=demo')
      const { createUnequalChordTieScore, createWholeChordTieScore, createReorderedWholeChordTieScore } = await import('../../testing/chord-tie-fixture')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const { serializeMusicXml } = await import('../../musicxml')
      const source = createUnequalChordTieScore('changed-member'), next = createWholeChordTieScore(false)
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/legacy.chromatics', fileName: 'legacy.chromatics', contents: encodeNativeProject(createNativeProject(source)) })
      let finish!: (value: { filePath: string; fileName: string }) => void, fail!: (error: Error) => void
      vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
      const { App } = await import('./App'); render(<App />)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      const warning = await screen.findByRole('region', { name: '서로 다른 화음 타이 안내' })
      openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
      await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
      const request = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0]
      expect(request.contents).toEqual(serializeMusicXml(source))
      if (process.env.DDIRORI_XML_TIE_LATE_QA_DIR) {
        const { mkdirSync, writeFileSync } = await import('node:fs'), { join } = await import('node:path')
        mkdirSync(process.env.DDIRORI_XML_TIE_LATE_QA_DIR, { recursive: true })
        writeFileSync(join(process.env.DDIRORI_XML_TIE_LATE_QA_DIR, 'expected.musicxml'), request.contents)
      }
      if (scenario === 'repair-success') {
        const canvas = screen.getByLabelText('악보 캔버스'); canvas.scrollIntoView = vi.fn()
        fireEvent.click(within(warning).getByRole('button', { name: /타이 음표 선택/ })); await waitFor(() => expect(canvas).toHaveFocus())
        fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
      } else {
        vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/normal.chromatics', fileName: 'normal.chromatics', contents: encodeNativeProject(createNativeProject(next)) })
        openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
        await waitFor(() => expect(playbackMockState.lastScore).toEqual(next))
      }
      const expected = structuredClone(playbackMockState.lastScore!), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      expect(screen.queryByRole('region', { name: '서로 다른 화음 타이 안내' })).not.toBeInTheDocument()
      await act(async () => { if (scenario === 'replace-error') fail(new Error('Owned old XML failure')); else finish({ filePath: '/export/queued-legacy.musicxml', fileName: 'queued-legacy.musicxml' }) })
      if (scenario === 'repair-success') {
        const report = screen.getByRole('region', { name: 'MusicXML 경고 상세' })
        expect(report).toHaveTextContent('queued-legacy.musicxml'); expect(report).toHaveTextContent('1마디 · 서로 다른 화음')
        expect(report).toHaveTextContent('내보낸 파일에는 기존 타이가 포함')
        expect(report).not.toHaveTextContent('T로 타이를 해제')
        expect(document.querySelector('.editor-status')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
        expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      } else {
        expect(screen.queryByRole('region', { name: 'MusicXML 경고 상세' })).not.toBeInTheDocument()
        expect(document.querySelector('.editor-status')).not.toHaveTextContent('queued-legacy.musicxml')
        expect(document.body).not.toHaveTextContent('Owned old XML failure')
        expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
      }
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected)
      expect(playbackMockState.lastScore).toEqual(expected)
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics' })
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
      if (scenario === 'repair-success') {
        fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
        expect(playbackMockState.lastScore).toEqual(source)
        expect(screen.getByRole('region', { name: '서로 다른 화음 타이 안내' })).toBeInTheDocument()
      }
    }
  )

  it('studio.part-structural-layout preserves two independent layouts through lower-staff deletion, history and cold reopen', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createStructuralPartLayoutFixture } = await import('../../testing/structural-part-layout-fixture')
    const { encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { project, deleted, target, retained } = createStructuralPartLayoutFixture(), original = structuredClone(project)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/structural.chromatics', fileName: 'structural.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/out/structural.chromatics', fileName: 'structural.chromatics' })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(project.score))
    fireEvent.click(screen.getByRole('button', { name: `${target.eventId} 선택` }))
    openStudioWorkspace('악보'); fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '2')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', retained.upper)
    expect(playbackMockState.lastScore?.parts.flatMap(p => p.staves.map(s => s.measures.length))).toEqual([2, 2, 2])
    let calls = 0
    const save = async () => {
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      calls += 1
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(calls))
      await waitFor(() => expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음'))
      return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[calls - 1][0].contents)
    }
    expect(await save()).toEqual(deleted)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(project.score)
    expect(await save()).toEqual(project)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(await save()).toEqual(deleted)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/out/reopened-structural.chromatics', fileName: 'reopened-structural.chromatics', contents: encodeNativeProject(deleted) })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('reopened-structural.chromatics을 열었습니다.')
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(deleted.score)
    expect(await save()).toEqual(deleted)
    expect(project).toEqual(original)
  })

  it('studio.recent-removal failure keeps the missing entry and an inspectable retry', async () => {
    const entry = { filePath: '/fixture/missing.musicxml', fileName: 'missing.musicxml', openedAt: '2026-10-29T00:00:00Z' }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([entry])
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error('최근 파일을 찾을 수 없습니다'))
    const raw = 'EACCES: owned recent removal failed /owned/recent-index.json'
    vi.mocked(window.inC.recentMusicXml.remove).mockRejectedValueOnce(new Error(raw)).mockResolvedValueOnce([])
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /missing.musicxml/ }))
    const remove = await screen.findByRole('button', { name: '목록에서 지우기' }); remove.focus(); fireEvent.click(remove)
    await screen.findByText('최근 파일 목록을 정리하지 못했습니다. 목록은 유지됩니다. 다시 시도하거나 기술 정보를 확인해 주세요.')
    expect(screen.getByRole('button', { name: /missing.musicxml/ })).toBeVisible()
    expect(screen.getByText(raw)).not.toBeVisible()
    await waitFor(() => expect(remove).toBeEnabled()); expect(remove).toHaveFocus()
    expect(window.inC.recentMusicXml.remove).toHaveBeenCalledTimes(1)
    fireEvent.click(remove)
    await waitFor(() => expect(screen.queryByRole('button', { name: /missing.musicxml/ })).not.toBeInTheDocument())
    expect(window.inC.recentMusicXml.remove).toHaveBeenCalledTimes(2)
  })

  it('studio.recent-removal does not steal focus from a new-score draft', async () => {
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([{ filePath: '/fixture/missing.musicxml', fileName: 'missing.musicxml', openedAt: '2026-10-29T00:00:00Z' }])
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error('최근 파일을 찾을 수 없습니다'))
    let fail!: (error: Error) => void
    vi.mocked(window.inC.recentMusicXml.remove).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /missing.musicxml/ }))
    const remove = await screen.findByRole('button', { name: '목록에서 지우기' }); remove.focus(); fireEvent.click(remove)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    const title = within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('textbox', { name: '제목' })
    title.focus(); fireEvent.change(title, { target: { value: '아직 확정하지 않은 제목' } })
    await act(async () => fail(Error('Owned removal failure while drafting')))
    expect(title).toHaveFocus(); expect(title).toHaveValue('아직 확정하지 않은 제목')
    expect(screen.getByRole('dialog', { name: '새 악보 만들기' })).toBeVisible()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['success', 'failure'] as const)('studio.recent-removal ignores late %s feedback after native replacement and editing', async outcome => {
    const entry = { filePath: '/fixture/missing.musicxml', fileName: 'missing.musicxml', openedAt: '2026-10-29T00:00:00Z' }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([entry])
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error('최근 파일을 찾을 수 없습니다'))
    let finish!: () => void
    vi.mocked(window.inC.recentMusicXml.remove).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = () => outcome === 'success' ? resolve([]) : reject(Error('Owned stale recent removal failure')) }))
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(createNativeProject(parseMusicXml(recentMusicXml))) })
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /missing.musicxml/ }))
    fireEvent.click(await screen.findByRole('button', { name: '목록에서 지우기' }))
    await waitFor(() => expect(window.inC.recentMusicXml.remove).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore?.title).toBe('MusicXML Sketch'))
    await act(async () => {})
    const original = structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    const edited = structuredClone(playbackMockState.lastScore), status = document.querySelector('.editor-status')?.textContent
    const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    await act(async () => finish())
    expect(document.querySelector('.editor-status')).toHaveTextContent(status!)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/out/current.chromatics', fileName: 'current.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  })

  it.each(['direct', 'recent'] as const)('studio.import-recent-update-guidance keeps the open score and edits after %s metadata failure', async entry => {
    const raw = 'EACCES: owned recent index update failed /owned/recent-index.json'
    const xml = recentMusicXml.replace('<type>quarter</type>', '<type>quarter</type><notations><technical><up-bow/></technical></notations>')
    const file = { filePath: '/fixture/imported.musicxml', fileName: 'imported.musicxml', contents: xml }
    let failRecent!: (error: Error) => void
    vi.mocked(window.inC.recentMusicXml.add).mockImplementationOnce(() => new Promise((_resolve, reject) => { failRecent = reject }))
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce(file)
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce(file)
    if (entry === 'recent') vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([{ filePath: file.filePath, fileName: file.fileName, openedAt: '2026-10-29T00:00:00Z' }])
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(entry === 'recent' ? await screen.findByRole('button', { name: /imported.musicxml/ }) : screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    await act(async () => {})
    const imported = structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    const edited = structuredClone(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    await act(async () => failRecent(new Error(raw)))
    expect(document.querySelector('.editor-status')).toHaveTextContent('악보는 열었지만 최근 악보 목록을 갱신하지 못했습니다. 열린 악보는 사용할 수 있습니다.')
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('EACCES')
    expect(screen.getByRole('region', { name: 'MusicXML 경고 상세' })).toHaveTextContent('연주 기법')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
    const details = screen.getByRole('group', { name: '최근 악보 목록 기술 정보' })
    expect(within(details).getByText(raw)).not.toBeVisible()
    fireEvent.click(within(details).getByRole('button', { name: '기술 정보' })); expect(within(details).getByText(raw)).toBeVisible()
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(imported)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    const { decodeNativeProject } = await import('../../project/schema')
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/out/current.chromatics', fileName: 'current.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  })

  it.each(['read', 'parse'] as const)('studio.import-failure-guidance preserves dirty editing and retry after %s failure', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const raw = 'EACCES: permission denied /owned/very-long-private-input.musicxml'
    const operation = vi.mocked(window.inC.musicXml.open)
    if (kind === 'read') operation.mockRejectedValueOnce(new Error(raw))
    else operation.mockResolvedValueOnce({ filePath: '/fixture/bad.musicxml', fileName: 'bad.musicxml', contents: '<not-a-score/>' })
    operation.mockResolvedValueOnce({ filePath: '/fixture/retry.musicxml', fileName: 'retry.musicxml', contents: recentMusicXml })
    const { App } = await import('./App'); render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    const edited = structuredClone(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('MusicXML을 가져오지 못했습니다. 현재 악보는 유지됩니다.'))
    expect(document.querySelector('.editor-status')).not.toHaveTextContent(kind === 'read' ? 'EACCES' : 'score-partwise')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
    const details = screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' })
    const diagnostic = kind === 'read' ? within(details).getByText(raw) : within(details).getByText(/score-partwise/)
    expect(diagnostic).not.toBeVisible()
    fireEvent.click(within(details).getByRole('button', { name: '기술 정보' })); expect(diagnostic).toBeVisible()
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).not.toEqual(edited)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await waitFor(() => expect(playbackMockState.lastScore?.title).toBe('MusicXML Sketch'))
    expect(screen.queryByRole('group', { name: 'MusicXML 가져오기 기술 정보' })).not.toBeInTheDocument()
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  })

  it('studio.import-failure-guidance distinguishes a missing recent file and preserves explicit removal', async () => {
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([{ filePath: '/fixture/missing.musicxml', fileName: 'missing.musicxml', openedAt: '2026-10-29T00:00:00Z' }])
    const raw = '최근 파일을 찾을 수 없습니다: /owned/missing.musicxml'
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error(raw))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /missing.musicxml/ }))
    await screen.findByText('최근 MusicXML 파일을 찾지 못했습니다. 원래 위치를 확인하거나 목록에서 지워 주세요.')
    expect(screen.getByRole('heading', { name: '새 악보를 만들어 볼까요?' })).toBeVisible()
    expect(screen.getByText(raw)).not.toBeVisible()
    expect(window.inC.recentMusicXml.remove).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '목록에서 지우기' }))
    await waitFor(() => expect(window.inC.recentMusicXml.remove).toHaveBeenCalledWith({ filePath: '/fixture/missing.musicxml' }))
  })

  it('studio.unattached-tie-import keeps the welcome screen and recent-file diagnosis inspectable', async () => {
    const { unattachedTieXml } = await import('../../testing/unattached-tie-fixture')
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([{ filePath: '/fixture/unattached.musicxml', fileName: 'unattached.musicxml', openedAt: '2026-10-29T00:00:00Z' }])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce({ filePath: '/fixture/unattached.musicxml', fileName: 'unattached.musicxml', contents: unattachedTieXml('first') })
    const { App } = await import('./App'); render(<App />)
    const before = structuredClone(playbackMockState.lastScore)
    fireEvent.click(await screen.findByRole('button', { name: /unattached.musicxml/ }))
    await screen.findByRole('group', { name: 'MusicXML 가져오기 기술 정보' })
    expect(screen.getByRole('heading', { name: '새 악보를 만들어 볼까요?' })).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(before)
    expect(screen.getByText(/현재 악보는 유지됩니다/)).toBeVisible()
    expect(screen.getByText(/Invalid tie start/)).not.toBeVisible()
    expect(window.inC.recentMusicXml.remove).not.toHaveBeenCalled()
  })

  it.each(['first', 'last', 'chord'] as const)('studio.unattached-tie-import preserves the edited document on unsupported %s notation', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { unattachedTieXml } = await import('../../testing/unattached-tie-fixture')
    const { App } = await import('./App'); render(<App />)
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    const edited = structuredClone(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/unattached.musicxml', fileName: 'unattached.musicxml', contents: unattachedTieXml(kind) })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('한 음표에만 연결된 타이 표기는 현재 가져오기에서 지원하지 않습니다'))
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('part[1]')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
    const details = screen.getByRole('group', { name: 'MusicXML 가져오기 기술 정보' })
    expect(within(details).getByText(/Invalid tie start/)).not.toBeVisible()
    fireEvent.click(within(details).getByRole('button', { name: '기술 정보' }))
    expect(within(details).getByText(/Invalid tie start/)).toBeVisible()
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).not.toEqual(edited)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(playbackMockState.lastScore).toEqual(edited)
  })

  it.each(['single', 'chord', 'alongside'] as const)('studio.let-ring-warning retains unsupported notation guidance for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createLetRingFixture } = await import('../../testing/let-ring-fixture')
    const { parseMusicXml } = await import('../../musicxml')
    const { decodeNativeProject } = await import('../../project/schema')
    const { xml, warnings } = createLetRingFixture(kind), expected = parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/let-ring.musicxml', fileName: 'let-ring.musicxml', contents: xml })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    expect(report).toHaveTextContent(`MusicXML 가져오기 경고 ${warnings}개`)
    expect(report).toHaveTextContent('울림 유지 타이 표기를 가져오지 못했습니다')
    expect(report).toHaveTextContent('원본 MusicXML을 보관하고 표기를 비교해 주세요')
    expect(within(report).queryByRole('button', { name: /마디별 경고 상세/ })).not.toBeInTheDocument()
    for (const raw of within(report).getAllByText('let-ring tie notation is not imported yet.')) expect(raw).not.toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('경고 상세에서 보존되지 않은 울림 유지 표기를 확인')
    expect(playbackMockState.lastScore).toEqual(expected)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/out/let-ring.chromatics', fileName: 'let-ring.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  })

  it.each(['first-pass', 'second-pass', 'all-passes'] as const)('studio.conditional-tie-warning explains unsupported repeat conditions for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createConditionalTieFixture } = await import('../../testing/conditional-tie-fixture')
    const { parseMusicXml } = await import('../../musicxml')
    const { decodeNativeProject } = await import('../../project/schema')
    const { xml } = createConditionalTieFixture(kind), expected = parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/conditional.musicxml', fileName: 'conditional.musicxml', contents: xml })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    expect(report).toHaveTextContent('반복 차수별 타이 조건은 보존하지 못했습니다')
    expect(report).toHaveTextContent('원본 MusicXML을 보관하고 반복 재생을 비교해 주세요')
    expect(within(report).queryByRole('button', { name: /마디별 경고 상세/ })).not.toBeInTheDocument()
    for (const text of within(report).getAllByText(/Pass-specific tie /)) expect(text).not.toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('경고 상세에서 반복 차수별 타이 조건을 확인')
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('time-only')
    expect(playbackMockState.lastScore).toEqual(expected)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/out/conditional.chromatics', fileName: 'conditional.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  })

  it.each(['success', 'failure'] as const)('studio.same-file-import-export preserves the new report through old %s', async outcome => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createImportWarningFixture } = await import('../../testing/import-warning-fixture')
    const { parseMusicXml, serializeMusicXml } = await import('../../musicxml')
    const { decodeNativeProject } = await import('../../project/schema')
    const { xml } = createImportWarningFixture('mixed'), original = parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({ filePath: '/fixture/same.musicxml', fileName: 'same.musicxml', contents: xml })
    let finish!: (value: { filePath: string; fileName: string } | null) => void, fail!: (error: Error) => void, settled = false
    vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await screen.findByRole('button', { name: '마디별 경고 상세 3개' })
    openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents).toBe(serializeMusicXml(original))
    try {
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
      await waitFor(() => expect(window.inC.musicXml.open).toHaveBeenCalledTimes(2))
      const report = screen.getByRole('region', { name: 'MusicXML 경고 상세' })
      expect(within(report).getByRole('button', { name: '마디별 경고 상세 3개' })).toHaveAttribute('aria-expanded', 'false')
      const eventId = original.parts[0].staves[0].measures[0].voices[0].events[0].id
      fireEvent.click(screen.getByRole('button', { name: `${eventId} 선택` })); fireEvent.keyDown(window, { key: 't', code: 'KeyT' })
      const edited = structuredClone(playbackMockState.lastScore!), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      expect(edited).not.toEqual(original)
      fireEvent.click(within(report).getByRole('button', { name: '마디별 경고 상세 3개' }))
      const technical = within(report).getAllByRole('button', { name: '기술 정보' }).at(-1)!
      act(() => technical.focus())
      await act(async () => { settled = true; if (outcome === 'failure') fail(new Error('Old same-file export failure')); else finish({ filePath: '/out/old.musicxml', fileName: 'old.musicxml' }) })
      expect(report).toBeInTheDocument(); expect(within(report).getByRole('button', { name: '마디별 경고 상세 3개' })).toHaveAttribute('aria-expanded', 'true')
      expect(technical).toHaveFocus(); expect(playbackMockState.lastScore).toEqual(edited)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected)
      expect(document.querySelector('.editor-status')).not.toHaveTextContent(/old.musicxml|Old same-file export failure/)
      expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/out/current.chromatics', fileName: 'current.chromatics' })
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
      fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
      vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValueOnce({ filePath: '/out/fresh.musicxml', fileName: 'fresh.musicxml' })
      openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
      await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('fresh.musicxml'))
      expect(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1][0].contents).toBe(serializeMusicXml(original))
      expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    } finally { if (!settled) await act(async () => { finish(null) }) }
  })

  it.each(['mixed', 'many', 'technical', 'unknown'] as const)('studio.mixed-import-warning retains every diagnostic and visible action for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createImportWarningFixture } = await import('../../testing/import-warning-fixture')
    const { xml, warningCount } = createImportWarningFixture(kind)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({ filePath: '/fixture/warning.musicxml', fileName: 'warning.musicxml', contents: xml })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    const before = structuredClone(playbackMockState.lastScore!)
    expect(report).toHaveTextContent(`MusicXML 가져오기 경고 ${warningCount}개`)
    if (kind === 'unknown') {
      expect(within(report).queryByRole('button', { name: /마디별 경고 상세/ })).not.toBeInTheDocument()
      expect(within(report).getByText(/1마디 · 일부 표기를 가져오지 못했습니다/)).toBeVisible()
    } else {
      const button = within(report).getByRole('button', { name: `마디별 경고 상세 ${warningCount}개` })
      expect(button).toHaveAttribute('aria-expanded', 'false')
      const summary = within(report).getByText(kind === 'technical'
        ? '연주 기법 표기는 가져오지 못했습니다. 원본 MusicXML을 보관하고 연주 기법을 확인해 주세요.'
        : '구성음별 타이와 연주 기법 표기를 보존하지 못했습니다. 원본 MusicXML을 보관하고 타이·재생·연주 기법을 확인해 주세요.', { exact: true })
      expect(summary).toBeVisible()
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
      const diagnostics = report.querySelectorAll('.studio-warning-technical__content')
      expect(diagnostics).toHaveLength(warningCount)
      for (const raw of diagnostics) expect(raw).not.toBeVisible()
      fireEvent.click(within(report).getAllByRole('button', { name: '기술 정보' })[warningCount - 1])
      expect(diagnostics[warningCount - 1]).toBeVisible()
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
      await waitFor(() => expect(within(screen.getByRole('region', { name: 'MusicXML 경고 상세' })).getByRole('button', { name: `마디별 경고 상세 ${warningCount}개` })).toHaveAttribute('aria-expanded', 'false'))
      const fresh = screen.getByRole('region', { name: 'MusicXML 경고 상세' })
      fireEvent.click(within(fresh).getByRole('button', { name: `마디별 경고 상세 ${warningCount}개` }))
      for (const raw of fresh.querySelectorAll('.studio-warning-technical__content')) expect(raw).not.toBeVisible()
    }
    expect(playbackMockState.lastScore).toEqual(before)
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  })

  it.each(['sound-whole-notation-root', 'notation-whole-sound-upper'] as const)('studio.import-warning-density keeps summary and resets same-file details for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createTieRepresentationFixture } = await import('../../testing/tie-representation-fixture')
    const { xml } = createTieRepresentationFixture(kind)
    const opened = { filePath: '/fixture/member-ties.musicxml', fileName: 'member-ties.musicxml', contents: xml }
    vi.mocked(window.inC.musicXml.open).mockResolvedValue(opened)
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    const expected = structuredClone(playbackMockState.lastScore!)
    const toggle = within(report).getByRole('button', { name: '마디별 경고 상세 2개' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(report).getByText('구성음별 타이는 보존되지 않았습니다. 원본 MusicXML을 보관하고 타이·재생을 확인해 주세요.', { exact: true })).toBeVisible()
    const measure = within(report).getByText(/1번째 파트 · 1마디/)
    expect(measure).not.toBeVisible()
    fireEvent.keyDown(toggle, { key: 'Enter', code: 'Enter' }); fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true'); expect(measure).toBeVisible()
    for (const raw of within(report).getAllByText(/Member-specific chord ties/)) expect(raw).not.toBeVisible()
    fireEvent.keyDown(toggle, { key: ' ', code: 'Space' }); fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(playbackMockState.play).not.toHaveBeenCalled(); expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(toggle)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'MusicXML 경고 상세' })).getByRole('button', { name: '마디별 경고 상세 2개' })).toHaveAttribute('aria-expanded', 'false'))
    expect(playbackMockState.lastScore).toEqual(expected)
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(expected)
  })

  it.each(['root-only', 'upper-only'] as const)('studio.partial-tie-import warns of member loss for %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { createPartialChordTieFixture } = await import('../../testing/partial-chord-tie-fixture')
    const { createNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { parseMusicXml } = await import('../../musicxml')
    const { xml } = createPartialChordTieFixture(kind)
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ filePath: '/fixture/partial.musicxml', fileName: 'partial.musicxml', contents: xml })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    expect(report).toHaveTextContent('구성음별 타이는 지원하지 않아 원래 연결 범위를 보존하지 못했습니다')
    expect(report).toHaveTextContent('1마디'); expect(report).toHaveTextContent('2마디')
    expect(report).toHaveTextContent('원본 MusicXML을 함께 보관')
    expect(document.querySelector('.editor-status')).toHaveTextContent('경고 상세에서 보존되지 않은 타이를 확인')
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('구성음별 타이는 지원하지 않아 원래 연결 범위를 보존하지 못했습니다')
    for (const raw of within(report).getAllByText(/Member-specific chord ties/)) expect(raw).not.toBeVisible()
    const expected = parseMusicXml(xml)
    expect(playbackMockState.lastScore).toEqual(expected)
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/partial.chromatics', fileName: 'partial.chromatics' })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(createNativeProject(expected).score)
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  })

  it('playback.viewport-clock keeps the renderer address stable when only the playback clock advances', async () => {
    window.history.replaceState({},'', '/?fixture=demo')
    playbackMockState.value={...playbackMockState.value,status:'playing',positionBeat:4,activeEventId:'note-g4',activeEvent:{eventId:'note-g4',partId:'piano',staffId:'piano-staff',measureId:'measure-2',voiceId:'voice-1'}}
    const {App}=await import('./App');const {rerender}=render(<App/>)
    const address=playbackMockState.lastPreviewAddress;expect(address).toBeDefined()
    playbackMockState.value={...playbackMockState.value,positionBeat:4.5};rerender(<App/>)
    expect(playbackMockState.lastPreviewAddress).toBe(address)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.input-playback-handoff exits N for playback and resumes only on explicit input at the selected note',async()=>{
    window.history.replaceState({},'', '/?fixture=demo')
    const {App}=await import('./App'),view=render(<App/>),source=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active','true');expect(screen.getByTestId('notation-preview').getAttribute('data-input-measure-id')).not.toBe('')
    playbackMockState.value={status:'playing',positionBeat:4,totalBeats:8,activeEventId:'note-g4',activeEvent:{eventId:'note-g4',partId:'piano',staffId:'piano-staff',measureId:'measure-2',voiceId:'voice-1'}};view.rerender(<App/>)
    expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active','false');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id','');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','note-g4');expect(playbackMockState.lastScore).toEqual(source)
    playbackMockState.value={status:'stopped',positionBeat:0,totalBeats:8,activeEvent:undefined,activeEventId:undefined};view.rerender(<App/>)
    expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active','false')
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active','true');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id','measure-2');expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('playback.cursor-selection-sync selects the active playback event with its voice address', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    playbackMockState.value = {
      activeEvent: {
        eventId: 'note-g4',
        partId: 'piano',
        staffId: 'piano-staff',
        measureId: 'measure-2',
        voiceId: 'voice-1'
      },
      activeEventId: 'note-g4',
      positionBeat: 4,
      status: 'playing',
      totalBeats: 8
    }
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-g4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        'note-g4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-address',
        'piano:piano-staff:measure-2:voice-1'
      )
    })
    expect(screen.getByRole('button', { name: '1성부' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('playback.cursor-selection-sync keeps editing selection stable after stop and jump-to-start', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    playbackMockState.value = {
      activeEvent: {
        eventId: 'note-a4',
        partId: 'piano',
        staffId: 'piano-staff',
        measureId: 'measure-2',
        voiceId: 'voice-1'
      },
      activeEventId: 'note-a4',
      positionBeat: 4.5,
      status: 'playing',
      totalBeats: 8
    }
    const { App } = await import('./App')
    const { rerender } = render(<App />)
    const toolbarTabs = screen.getByRole('navigation', {
      name: '앱 메뉴'
    })

    openStudioWorkspace('재생')
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }))

    expect(playbackMockState.jumpToStart).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-a4'
      )
    })

    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 8
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-a4'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        ''
      )
    })
  })

  it('playback.cursor-selection-sync keeps a multi-part playback selection after jump-to-start', async () => {
    const { App } = await import('./App')
    const { rerender } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('string-quartet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    playbackMockState.value = {
      activeEvent: {
        eventId: 'cello-staff-1-measure-1-full-measure-rest',
        partId: 'cello',
        staffId: 'staff-1',
        measureId: 'cello-staff-1-measure-1',
        voiceId: 'voice-1'
      },
      activeEventId: 'cello-staff-1-measure-1-full-measure-rest',
      positionBeat: 0,
      status: 'playing',
      totalBeats: 32
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'cello-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
    })

    openStudioWorkspace('재생')
    fireEvent.click(screen.getByRole('button', { name: '처음으로' }))
    expect(playbackMockState.jumpToStart).toHaveBeenCalledTimes(1)

    playbackMockState.value = {
      activeEvent: undefined,
      activeEventId: undefined,
      positionBeat: 0,
      status: 'stopped',
      totalBeats: 32
    }
    rerender(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'cello-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'cello:staff-1:cello-staff-1-measure-1:voice-1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-playback-event-id',
        ''
      )
    })
  })

  it('studio.mixer-part-identity changes only the intended duplicate-name local mixer and preserves native and MIDI',async()=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0],staff=first.staves[0],measure=staff.measures[0];score.title='Mixer identity';first.id='first-part';first.name='Piano';staff.id='first-staff';measure.id='first-bar'
    measure.voices[0].events=[createNote({id:'first-part-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const second=structuredClone(first);second.id='second-part';second.staves[0].id='second-staff';second.staves[0].measures[0].id='second-bar';second.staves[0].measures[0].voices[0].events=[createNote({id:'second-part-note',pitch:{step:'D',octave:4},duration:{value:'whole',dots:0}})];score.parts.push(second)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/mixer.chromatics',fileName:'mixer.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/mixer.chromatics',fileName:'mixer.chromatics'})
    const {App}=await import('./App');const view=render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('재생')
    const mixer=within(screen.getByLabelText('파트 믹서')),before=playbackMockState.lastPartMixer['first-part'],selectedAddress=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    const mute=mixer.getByRole('checkbox',{name:'2 · Piano 음소거'});mute.focus();fireEvent.keyDown(mute,{key:' ',code:'Space'});fireEvent.keyUp(mute,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(mute);fireEvent.click(mixer.getByRole('checkbox',{name:'2 · Piano 솔로'}));fireEvent.change(mixer.getByRole('slider',{name:/^2 · Piano 볼륨/}),{target:{value:'65'}})
    expect(playbackMockState.lastPartMixer['second-part']).toMatchObject({muted:true,solo:true,volume:.65});expect(playbackMockState.lastPartMixer['first-part']).toEqual(before)
    expect(mixer.getByRole('checkbox',{name:'1 · Piano 음소거'})).not.toBeChecked();expect(mixer.getByRole('slider',{name:/^1 · Piano 볼륨/})).toHaveValue('100')
    expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)['second-part']).toMatchObject({muted:true,solo:true,volume:.65})
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selectedAddress!)
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}));await waitFor(()=>expect(window.inC.midi.save).toHaveBeenCalledTimes(1));const {serializeMidi}=await import('./midi/serialize-midi');expect(new Uint8Array(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)).toEqual(serializeMidi(score))
    view.unmount();render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('재생')
    expect(screen.getByRole('checkbox',{name:'2 · Piano 음소거'})).toBeChecked();expect(screen.getByRole('checkbox',{name:'2 · Piano 솔로'})).toBeChecked();expect(screen.getByRole('slider',{name:/^2 · Piano 볼륨/})).toHaveValue('65');expect(playbackMockState.lastScore).toEqual(score)
  },15000)

  it('playback.part-mixer sends part mute, solo, and volume settings to playback', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('재생')
    const mixer = screen.getByLabelText('파트 믹서')
    const mute = within(mixer).getByLabelText('Melody 음소거')
    const solo = within(mixer).getByLabelText('Melody 솔로')
    const volume = within(mixer).getByRole('slider',{name:/Melody 볼륨/})

    expect(volume).toHaveValue('100')

    fireEvent.click(mute)
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: false,
      volume: 1
    })

    fireEvent.click(solo)
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 1
    })

    fireEvent.change(volume, { target: { value: '65' } })
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })
    expect(within(mixer).getByText('65%')).toBeInTheDocument()
    expect(
      JSON.parse(
        window.localStorage.getItem('chromatics.part-mixer.v1') ?? '{}'
      )['part-1']
    ).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })

    cleanup()
    playbackMockState.lastPartMixer = {}
    render(<App />)
    openStudioWorkspace('재생')

    const restoredMixer = screen.getByLabelText('파트 믹서')
    expect(within(restoredMixer).getByLabelText('Melody 음소거')).toBeChecked()
    expect(within(restoredMixer).getByLabelText('Melody 솔로')).toBeChecked()
    expect(within(restoredMixer).getByRole('slider',{name:/Melody 볼륨/})).toHaveValue('65')
    expect(playbackMockState.lastPartMixer['part-1']).toMatchObject({
      muted: true,
      solo: true,
      volume: 0.65
    })
  })

  it('playback.part-mixer keeps independent controls for a 4-part ensemble', async () => {
    const { App } = await import('./App')
    const view = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('string-quartet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    // Give the activity assertion a real sounding event, not an all-rest cursor.
    const quartet = structuredClone(playbackMockState.lastScore!)
    const celloVoice = quartet.parts.find(part => part.id === 'cello')!.staves[0].measures[0].voices[0]
    const rest = celloVoice.events[0]
    const { createNote } = await import('../../score-core')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    celloVoice.events[0] = createNote({ id: rest.id, position: rest.position, duration: rest.duration, pitch: { step: 'C', octave: 3, alter: 0 } })
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/test/mixer-quartet.chromatics', fileName: 'mixer-quartet.chromatics', contents: encodeNativeProject(createNativeProject(quartet)) })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(playbackMockState.lastScore).toEqual(quartet))
    playbackMockState.value = {
      ...playbackMockState.value,
      activeEvent: {
        eventId: 'cello-staff-1-measure-1-full-measure-rest',
        partId: 'cello',
        staffId: 'staff-1',
        measureId: 'cello-staff-1-measure-1',
        voiceId: 'voice-1'
      },
      activeEventId: 'cello-staff-1-measure-1-full-measure-rest',
      status: 'playing'
    }
    view.rerender(<App />)
    openStudioWorkspace('재생')

    const mixer = screen.getByLabelText('파트 믹서')
    const violinMute = within(mixer).getByLabelText('Violin I 음소거')
    const celloSolo = within(mixer).getByLabelText('Cello 솔로')
    const violaVolume = within(mixer).getByRole('slider',{name:/Viola 볼륨/})

    expect(within(mixer).getByText('Violin I')).toBeInTheDocument()
    expect(within(mixer).getByText('Violin II')).toBeInTheDocument()
    expect(within(mixer).getByText('Viola')).toBeInTheDocument()
    expect(within(mixer).getByText('Cello')).toBeInTheDocument()
    expect(within(mixer).getByLabelText('Cello 재생 상태')).toHaveTextContent(
      '재생 중'
    )
    expect(within(mixer).getByLabelText('Viola 재생 상태')).toHaveTextContent(
      '대기'
    )
    expect(
      within(mixer).getByLabelText('Cello 재생 상태').closest('.studio-part-mixer__row')
    ).toHaveAttribute('data-playback-active', 'true')
    expect(violaVolume).toHaveValue('100')

    fireEvent.click(violinMute)
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['violin-1']).toMatchObject({
        muted: true,
        solo: false,
        volume: 1
      })
    })

    fireEvent.click(celloSolo)
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['cello']).toMatchObject({
        muted: false,
        solo: true,
        volume: 1
      })
    })

    fireEvent.change(violaVolume, { target: { value: '45' } })
    await waitFor(() => {
      expect(playbackMockState.lastPartMixer['viola']).toMatchObject({
        muted: false,
        solo: false,
        volume: 0.45
      })
    })
    expect(playbackMockState.lastPartMixer['violin-2']).toBeUndefined()
    expect(within(mixer).getByText('45%')).toBeInTheDocument()
  })

  it('promotion.concert-posters does not render the deprecated toolbar banner', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    vi.mocked(window.inC.promotions.getConcertPosters).mockResolvedValue({
      posters: [
        {
          id: 'concert:test-poster',
          title: '테스트 공연 포스터',
          meta: '2026년 8월 테스트 · 온라인',
          description: '서버 API에서 내려온 공연 포스터입니다.',
          imageUrl: '../assets/posters/test.svg',
          imageAlt: '테스트 공연 포스터 이미지',
          targetUrl: '../concerts.html',
          theme: 'blue'
        }
      ],
      sourceUrl: 'https://in-c.mannlab.app/api/concert-posters.json'
    })

    const { App } = await import('./App')
    render(<App />)

    await waitFor(() =>
      expect(window.inC.promotions.getConcertPosters).not.toHaveBeenCalled()
    )
    expect(screen.queryByRole('group', {
      name: '공연 포스터 보기'
    })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '공연 포스터' })).not.toBeInTheDocument()
  })

  it('clef.change-selected-measure changes only the selected measure clef and reports the result', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    openStudioWorkspace('악보')
    const clefSelect = screen.getByLabelText('선택 마디 음자리표')
    const preview = screen.getByTestId('notation-preview')
    const initialClefs = preview.getAttribute('data-measure-clefs')?.split(',')

    expect(initialClefs?.length).toBeGreaterThan(1)
    expect(clefSelect).toHaveTextContent('높은음자리표')
    openNotationSettings('clef')
    fireEvent.click(clefSelect);fireEvent.click(screen.getByRole('option',{name:'낮은음자리표'}))

    await waitFor(() => {
      const changedClefs = screen
        .getByTestId('notation-preview')
        .getAttribute('data-measure-clefs')
        ?.split(',')
      const changedIndexes = changedClefs
        ?.map((clef, index) => (clef === initialClefs?.[index] ? -1 : index))
        .filter((index) => index >= 0)
      expect(changedIndexes).toHaveLength(1)
      expect(changedClefs?.[changedIndexes?.[0] ?? -1]).toBe('F4')
    })
    expect(
      screen.getByText('선택한 마디의 음자리표를 바꿨습니다.')
    ).toBeInTheDocument()
  })

  it('clef.change-current-staff changes every measure clef in the active staff', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('악보')
    const staffClefSelect = screen.getByLabelText('현재 보표 음자리표')

    expect(staffClefSelect).toHaveTextContent('높은음자리표')
    choosePartSetup('현재 보표 음자리표','alto')

    await waitFor(() => {
      expect(screen.getByRole('combobox',{name:'현재 보표 음자리표'})).toHaveTextContent('가온음자리표')
      expect(
        screen
          .getByTestId('notation-preview')
          .getAttribute('data-measure-clefs')
          ?.split(',')
      ).toEqual(['C3', 'C3'])
    })
    expect(
      screen.getByText('피아노 음자리표를 바꿨습니다.')
    ).toBeInTheDocument()
  })

  it('import-export.save-pdf sends the score title and keeps PDF separate from MusicXML', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.pdf.save).mockResolvedValue({
      fileName: 'release-test.pdf'
    })
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('파일')
    const fileActions = screen.getByLabelText('파일 작업')
    const musicXmlButton = within(fileActions).getByRole('button', {
      name: 'MusicXML로 저장'
    })
    expect(
      within(fileActions).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(
      within(fileActions).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()

    openStudioWorkspace('내보내기')
    const exportActions = screen.getByLabelText('내보내기 작업')
    const pdfButton = within(exportActions).getByRole('button', {
      name: 'PDF 변환'
    })
    const pageTarget = within(exportActions).getByLabelText('PDF 목표 장수')

    expect(pdfButton).not.toBe(musicXmlButton)
    expect(pageTarget).toHaveValue(2)
    expect(pageTarget).toHaveAttribute('min', '1')
    expect(pageTarget).toHaveAttribute('step', '1')
    fireEvent.click(pdfButton)

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: 'release-test.pdf'
      })
    })
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  })

  it.each([undefined, '', '기존 작곡가', 'in-C'] as const)('pdf.author %s keeps stored metadata and prints only actual author text', async composer => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml)); project.score.composer = composer; project.view = { mode: 'part', partId: 'P2' }
    const baseline = decodeNativeProject(encodeNativeProject(project))
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/author.chromatics', fileName: 'author.chromatics', contents: encodeNativeProject(project) })
    let finish!: (result: null) => void
    vi.mocked(window.inC.pdf.save).mockImplementation(() => new Promise(resolve => { finish = resolve }))
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export'); await act(async () => {})
    openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalledTimes(1))
    const field = document.querySelector('.studio-pdf-snapshot .score-title > .metadata-display--composer')!
    expect(field.textContent).toBe(baseline.score.composer ?? '\u00a0')
    await act(async () => { finish(null) })
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(baseline.score); expect(saved.partLayouts).toEqual(baseline.partLayouts)
  })

  it('import-export.export-midi writes a Standard MIDI File separate from MusicXML and PDF', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'release-test.mid'
    })
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('내보내기')
    const exportActions = screen.getByLabelText('내보내기 작업')
    const midiButton = within(exportActions).getByRole('button', {
      name: 'MIDI 내보내기'
    })

    openStudioWorkspace('파일')
    const fileActions = screen.getByLabelText('파일 작업')
    expect(
      within(fileActions).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()
    expect(
      within(fileActions).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(midiButton).not.toBe(
      within(fileActions).getByRole('button', { name: 'MusicXML로 저장' })
    )
    openStudioWorkspace('내보내기')
    // Workspaces compose live controls;do not dispatch to the old unmounted button.
    fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))

    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: 'release-test.mid',
        contents: expect.any(Array)
      })
    })
    const saveInput = vi.mocked(window.inC.midi.save).mock.calls[0]?.[0]

    expect(asciiBytes(saveInput?.contents ?? [], 0, 4)).toBe('MThd')
    expect(saveInput?.contents).toEqual(
      expect.arrayContaining([0xff, 0x51, 0x03])
    )
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.pdf.save).not.toHaveBeenCalled()
    expect(
      await screen.findByText('release-test.mid로 MIDI를 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it.each(['replace-success', 'replace-error', 'edit-success'] as const)(
    'export.midi-result-boundary %s preserves the current document and request bytes', async action => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const original = createNativeProject(parseMusicXml(richPartExportMusicXml)); original.view = { mode: 'part', partId: 'P2' }
      const next = structuredClone(original); next.score.title = '다음 악보'
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/original.chromatics', fileName: 'original.chromatics', contents: encodeNativeProject(original) })
      let resolve!: (value: { fileName: string }) => void, reject!: (reason: Error) => void
      vi.mocked(window.inC.midi.save).mockImplementation(() => new Promise((yes, no) => { resolve = yes; reject = no }))
      const { App } = await import('./App'); render(<App />)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export'); await act(async () => {})
      openStudioWorkspace('내보내기'); fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
      await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledTimes(1))
      const bytes = [...vi.mocked(window.inC.midi.save).mock.calls[0]![0].contents]
      const expected = structuredClone(action === 'edit-success' ? original.score : next.score)
      if (action === 'edit-success') {
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
        const event = expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
        if (event.type !== 'note') throw Error('Expected chord')
        event.pitches = [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]; event.pitch = event.pitches[0]!
      } else {
        vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/next.chromatics', fileName: 'next.chromatics', contents: encodeNativeProject(next) })
        openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
        await screen.findByText('다음 악보'); await act(async () => {})
      }
      const before = document.querySelector('.editor-status > span:last-child')!.textContent
      const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
      await act(async () => { if (action === 'replace-error') reject(new Error('Old MIDI failed')); else resolve({ fileName: 'old-request.mid' }) })
      if (action === 'edit-success') {
        expect(document.querySelector('.editor-status')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
        expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      } else expect(document.querySelector('.editor-status > span:last-child')).toHaveTextContent(before!)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection)
      expect(vi.mocked(window.inC.midi.save).mock.calls[0]![0].contents).toEqual(bytes)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(expected)
      if (action === 'edit-success') {
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true }); fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
        await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
        expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(original.score)
      }
    }
  )

  it.each(['percussion','TAB'] as const)('import-export.export-midi reports the V1 %s policy with Korean guidance and inspectable diagnostics', async clef => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/percussion.musicxml',
      fileName: 'percussion.musicxml',
      contents: withPercussionClef(recentMusicXml)
    })
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'percussion-policy.mid'
    })

    if (clef === 'TAB') {
      window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(recentMusicXml))
      project.score.parts[0]!.staves[0]!.measures[0]!.clef = { sign: 'tab', line: 5 }
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/tab.chromatics',fileName:'tab.chromatics',contents:encodeNativeProject(project)})
    }
    const { App } = await import('./App')
    render(<App />)

    if (clef === 'TAB') {
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    } else fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()

    openStudioWorkspace('내보내기')
    const exportActions = screen.getByLabelText('내보내기 작업')
    fireEvent.click(
      within(exportActions).getByRole('button', { name: 'MIDI 내보내기' })
    )

    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: 'musicxml-sketch.mid',
        contents: expect.any(Array)
      })
    })
    const report = within(await screen.findByRole('region',{name:'MIDI 경고 상세'}))
    const summary = clef === 'percussion'
      ? '타악기 표기가 있는 마디의 음은 MIDI에 포함되지 않았습니다. 원본은 프로젝트 파일로 보관해 주세요.'
      : 'TAB 표기가 있는 마디의 음은 MIDI에 포함되지 않았습니다. 원본은 프로젝트 파일로 보관해 주세요.'
    expect(report.getByText(summary)).toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('MIDI 경고 1개')
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('part[1].staff[1]')
    expect(screen.getByRole('region',{name:'MIDI 경고 상세'}).closest('.studio-chrome')).toBeNull()
    expect(report.getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','false')
    const raw = report.getByText(clef === 'percussion'
      ? 'Percussion notation is not interpreted in V1 MIDI export; notes on this staff were skipped.'
      : 'Tab notation is not interpreted in V1 MIDI export; notes on this staff were skipped.')
    expect(raw).not.toBeVisible()
    fireEvent.click(report.getByText('기술 정보'))
    expect(raw).toBeVisible()
    expect(report.getByText('part[1].staff[1].measure[1].clef')).toBeVisible()
    expect(fireEvent.keyDown(report.getByText('기술 정보'),{key:' ',code:'Space'})).toBe(true)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()

  })

  it.each(['cancel','failure','clean-success','replace-success','replace-error','edit-success'] as const)(
    'export.midi-warning-lifecycle %s keeps completed reports and current native state scoped correctly', async outcome => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { createMidiWarningScore, midiWarningRestOracle } = await import('../../testing/midi-warning-fixture')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const source = createMidiWarningScore('percussion'), expected = structuredClone(source)
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/warning.chromatics',fileName:'warning.chromatics',contents:encodeNativeProject(createNativeProject(source))})
      vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/current.chromatics',fileName:'current.chromatics'})
      vi.mocked(window.inC.midi.save).mockResolvedValueOnce({fileName:'prior.mid'})
      let finish!: (value: {fileName:string} | null) => void, fail!: (error:Error) => void
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
      await screen.findByText(source.title);await act(async () => {})
      openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
      await screen.findByRole('region',{name:'MIDI 경고 상세'})
      // The following request owns a distinct completion,not the prior successful report.
      vi.mocked(window.inC.midi.save).mockReset().mockImplementation(() => new Promise((yes,no) => {finish=yes;fail=no}))
      if (outcome === 'clean-success') {
        fireEvent.click(screen.getByRole('button',{name:'mixed-note-1 선택'}))
        openStudioWorkspace('악보')
        const clefControl = screen.getByLabelText('현재 보표 음자리표')
        expect(clefControl).toBeEnabled()
        expect(clefControl).toBeVisible()
        choosePartSetup('현재 보표 음자리표','treble')
        expect(playbackMockState.lastScore?.parts[1]?.staves[0]?.measures[0]?.clef).toEqual({sign:'G',line:2})
        expected.parts[1]!.staves[0]!.measures[0]!.clef = {sign:'G',line:2}
      }
      openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
      await waitFor(() => expect(window.inC.midi.save).toHaveBeenCalledTimes(1))
      const bytes = [...vi.mocked(window.inC.midi.save).mock.calls[0]![0].contents]
      if (outcome.startsWith('replace-')) {
        const replacement = midiWarningRestOracle(source);replacement.title='다음 MIDI 문서'
        vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/next.chromatics',fileName:'next.chromatics',contents:encodeNativeProject(createNativeProject(replacement))})
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
        await screen.findByText(replacement.title);await act(async () => {})
        Object.assign(expected,replacement)
      } else if (outcome === 'edit-success') {
        fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}))
        fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'MIDI 이후 편집'}})
        fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter'})
        expected.title='MIDI 이후 편집'
      }
      const status = document.querySelector('.editor-status > span:last-child')!.textContent
      await act(async () => { if (outcome === 'failure' || outcome === 'replace-error') fail(new Error('Expected MIDI request failure'));else finish(outcome === 'cancel' ? null : {fileName:'next.mid'}) })
      if (outcome === 'clean-success' || outcome.startsWith('replace-')) expect(screen.queryByRole('region',{name:'MIDI 경고 상세'})).not.toBeInTheDocument()
      else {
        const report = within(screen.getByRole('region',{name:'MIDI 경고 상세'}))
        expect(report.getByText(outcome === 'edit-success' ? 'next.mid' : 'prior.mid')).toBeVisible()
      }
      if (outcome === 'edit-success') {
        expect(document.querySelector('.editor-status')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.')
        expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      } else if (outcome.startsWith('replace-') || outcome === 'cancel') expect(document.querySelector('.editor-status > span:last-child')!.textContent).toBe(status)
      else if (outcome === 'failure') expect(screen.getByText('Expected MIDI request failure')).toBeInTheDocument()
      expect(vi.mocked(window.inC.midi.save).mock.calls[0]![0].contents).toEqual(bytes)
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(JSON.parse(JSON.stringify(expected)))
    }
  )

  it.each([
    'newer-success-older-success', 'newer-success-older-error',
    'newer-error-older-success', 'newer-cancel-older-success',
    'older-success-newer-error', 'older-error-newer-success'
  ] as const)('export.midi-request-order %s retains latest-request feedback and current editing state', async order => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createMidiWarningScore } = await import('../../testing/midi-warning-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const source = createMidiWarningScore('percussion')
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/order.chromatics',fileName:'order.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.midi.save).mockResolvedValueOnce({fileName:'prior.mid'})
    const { App } = await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText(source.title);await act(async () => {})
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
    await screen.findByRole('region',{name:'MIDI 경고 상세'})
    fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}))
    fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'내보내기 순서 검사'}})
    fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter'})
    const pending: {resolve:(value:{fileName:string}|null)=>void;reject:(error:Error)=>void}[] = []
    vi.mocked(window.inC.midi.save).mockReset().mockImplementation(() => new Promise((resolve,reject)=>pending.push({resolve,reject})))
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
    fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
    await waitFor(()=>expect(pending).toHaveLength(2))
    const status=()=>document.querySelector('.editor-status > span:last-child')!.textContent
    const priorStatus=status(), selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    const bytes=vi.mocked(window.inC.midi.save).mock.calls.map(call=>[...call[0].contents])
    const complete=async(index:number,outcome:string)=>act(async()=>{
      if(outcome==='error')pending[index]!.reject(new Error(index===0?'Older MIDI failed':'Newer MIDI failed'))
      else pending[index]!.resolve(outcome==='cancel'?null:{fileName:index===0?'older.mid':'newer.mid'})
    })
    const [first,firstResult,,lastResult]=order.split('-')
    if(first==='older') {
      await complete(0,firstResult!)
      expect(status()).toBe(priorStatus)
      expect(within(screen.getByRole('region',{name:'MIDI 경고 상세'})).getByText('prior.mid')).toBeVisible()
      await complete(1,lastResult!)
    } else {
      await complete(1,firstResult!)
      const latestStatus=status()
      await complete(0,lastResult!)
      expect(status()).toBe(latestStatus)
    }
    const latest=first==='newer'?firstResult:lastResult
    expect(within(screen.getByRole('region',{name:'MIDI 경고 상세'})).getByText(latest==='success'?'newer.mid':'prior.mid')).toBeVisible()
    if(latest==='error') {
      expect(status()).toBe('MIDI 내보내기를 완료하지 못했습니다. 다시 시도하거나 기술 정보를 확인해 주세요.')
      const error=within(screen.getByRole('region',{name:'MIDI 오류 상세'}))
      expect(error.getByText('Newer MIDI failed')).not.toBeVisible()
      fireEvent.click(error.getByText('기술 정보'))
      expect(error.getByText('Newer MIDI failed')).toBeVisible()
    }
    if(latest==='cancel')expect(status()).toBe(priorStatus)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection)
    expect(vi.mocked(window.inC.midi.save).mock.calls.map(call=>call[0].contents)).toEqual(bytes)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual({...source,title:'내보내기 순서 검사'})
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});fireEvent.keyDown(window,{code:'KeyS',ctrlKey:true})
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(source)
  },15_000)

  it.each(['retry','cancel','replace'] as const)('export.midi-failure-copy %s retains actionable feedback and inspectable original error', async action => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createMidiWarningScore } = await import('../../testing/midi-warning-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const source=createMidiWarningScore('percussion')
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/failure.chromatics',fileName:'failure.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const raw="EACCES: write '/owned-qa/Private-case.mid' failed"
    vi.mocked(window.inC.midi.save).mockRejectedValueOnce(new Error(raw))
    const { App } = await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText(source.title);await act(async()=>{})
    fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'오류 후 편집 유지'}});fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter'})
    const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
    await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('MIDI 내보내기를 완료하지 못했습니다. 다시 시도하거나 기술 정보를 확인해 주세요.'))
    expect(document.querySelector('.editor-status')).not.toHaveTextContent(raw)
    const report=within(screen.getByRole('region',{name:'MIDI 오류 상세'}))
    expect(report.getByText(raw)).not.toBeVisible()
    fireEvent.click(report.getByText('기술 정보'));expect(report.getByText(raw)).toBeVisible()
    expect(fireEvent.keyDown(report.getByText('기술 정보'),{key:' ',code:'Space'})).toBe(true)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    let finish!:(value:{fileName:string}|null)=>void
    vi.mocked(window.inC.midi.save).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}))
    await waitFor(()=>expect(window.inC.midi.save).toHaveBeenCalledTimes(2))
    const bytes=vi.mocked(window.inC.midi.save).mock.calls.map(x=>[...x[0].contents])
    let expected={...source,title:'오류 후 편집 유지'}
    if(action==='replace'){
      expected={...source,title:'다른 MIDI 문서'}
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/next.chromatics',fileName:'next.chromatics',contents:encodeNativeProject(createNativeProject(expected))})
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(expected.title);await act(async()=>{})
    }
    await act(async()=>finish(action==='cancel'?null:{fileName:'retry.mid'}))
    if(action==='cancel')expect(within(screen.getByRole('region',{name:'MIDI 오류 상세'})).getByText(raw)).toBeVisible()
    else expect(screen.queryByRole('region',{name:'MIDI 오류 상세'})).not.toBeInTheDocument()
    if(action==='retry')expect(within(screen.getByRole('region',{name:'MIDI 경고 상세'})).getByText('retry.mid')).toBeVisible()
    if(action!=='replace'){
      expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection)
    }
    expect(vi.mocked(window.inC.midi.save).mock.calls.map(x=>x[0].contents)).toEqual(bytes)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(expected)
    if(action!=='replace'){
      fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});fireEvent.keyDown(window,{code:'KeyS',ctrlKey:true})
      await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(2))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(source)
    }
  },15_000)

  it.each(['edit', 'replace'] as const)('pdf.snapshot keeps the requested music while the current document can %s during the native dialog', async action => {
    window.history.replaceState({}, '', '/?fixture=demo')
    let finish!: (value: { fileName: string }) => void
    vi.mocked(window.inC.pdf.save).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const { App } = await import('./App')
    render(<App />)
    const printPreview = () => screen.getAllByTestId('notation-preview').find(node => node.dataset.printLayout === 'true')!
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(finish).toBeTypeOf('function'))
    const requestedMusic = printPreview().getAttribute('data-all-event-pitches')
    if (action === 'edit') fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    else {
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
      fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    }
    expect(printPreview()).toHaveAttribute('data-all-event-pitches', requestedMusic)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const { decodeNativeProject } = await import('../../project/schema')
    const edited = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score
    expect(edited).not.toEqual(demoScore)
    await act(async () => finish({ fileName: 'requested-snapshot.pdf' }))
    if (action === 'replace') expect(screen.queryByText(/requested-snapshot/)).not.toBeInTheDocument()
    else {
      expect(await screen.findByText(/출력 시작 이후의 수정 내용은 포함되지 않았습니다/)).toBeInTheDocument()
      expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    }
  })

  it('import-export.save-pdf hides selection in the PDF while retaining the live editing selection', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'note-e4'
    )

    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(within(document.querySelector<HTMLDivElement>('.score-canvas')!).getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', 'note-e4')
    expect(document.querySelector('.studio-pdf-snapshot')).toHaveAttribute('inert')
    expect(printingPreview()).toHaveAttribute(
      'data-selected-event-id',
      ''
    )
    expect(printingPreview()).toHaveAttribute(
      'data-selected-event-ids',
      ''
    )
    expect(printingPreview()).toHaveAttribute(
      'data-selected-measure-id',
      ''
    )
    expect(printingPreview()).toHaveAttribute(
      'data-playback-event-id',
      ''
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout',
      'true'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-id',
      'comfortable'
    )

    finishPdfSave?.({ fileName: 'demo.pdf' })
    expect(await screen.findByText('demo.pdf로 PDF를 만들었습니다.')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'note-e4'
      )
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-print-layout',
      'false'
    )
  })

  it('import-export.save-pdf applies a strict target page count when possible', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('악보')
    const addMeasureButton = screen.getByRole('button', { name: '마디 추가' })

    for (let index = 0; index < 80; index += 1) {
      fireEvent.click(addMeasureButton)
    }

    openStudioWorkspace('내보내기')
    fireEvent.change(screen.getByLabelText('PDF 목표 장수'), {
      target: { value: '2' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-target',
      '2'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-overflowed',
      'false'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-pages',
      '2'
    )

    finishPdfSave?.({ fileName: 'two-page.pdf' })
    expect(
      await screen.findByText('two-page.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  }, 30000)

  it('layout.page-setup applies PDF page settings to export layout', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('내보내기')
    choosePageSetup('PDF 용지', 'Letter')
    choosePageSetup('PDF 방향', '가로')
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), {
      target: { value: '12' }
    })
    fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))
    fireEvent.change(screen.getByRole('slider', { name: /^PDF 보표 크기/ }), {
      target: { value: '90' }
    })
    fireEvent.change(screen.getByRole('slider', { name: /^PDF 시스템 간격/ }), {
      target: { value: '120' }
    })

    expect(screen.getByText('PDF 페이지 설정을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(printingPreview()).toHaveAttribute(
      'data-print-page-css-size',
      'Letter landscape'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-margin',
      '12'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-scale',
      '0.9'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-size',
      'letter'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-orientation',
      'landscape'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '12'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '120'
    )
    expect(
      Number(
        printingPreview()
          .getAttribute('data-print-layout-width')
      )
    ).toBeGreaterThan(900)

    finishPdfSave?.({ fileName: 'letter-landscape.pdf' })
    expect(
      await screen.findByText('letter-landscape.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('layout.page-setup previews page margin guides without printing them', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    const { App } = await import('./App')
    render(<App />)

    const scorePage = screen.getByLabelText('악보 페이지')

    expect(scorePage).toHaveAttribute('data-show-page-margins', 'false')

    openStudioWorkspace('내보내기')
    const marginGuideToggle = screen.getByLabelText('PDF 여백 가이드 표시')

    expect(marginGuideToggle).not.toBeChecked()

    fireEvent.click(marginGuideToggle)
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), {
      target: { value: '12' }
    })
    fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))

    expect(marginGuideToggle).toBeChecked()
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'true')
    expect(scorePage).toHaveStyle({
      '--score-page-margin-guide-inset': '12mm'
    })

    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'true')
    expect(document.querySelector('.studio-pdf-snapshot .score-page')).toHaveAttribute('data-show-page-margins', 'false')

    finishPdfSave?.({ fileName: 'margin-guide.pdf' })
    await screen.findByText('margin-guide.pdf로 PDF를 만들었습니다.')
    expect(scorePage).toHaveAttribute('data-show-page-margins', 'true')
  })

  it('ui.properties-panel summarizes the selected event and measure context', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))

    const properties = screen.getByRole('region', { name: '선택 요약' })
    expect(properties).toHaveAttribute('data-selection-kind', 'event')
    expect(within(properties).getByRole('heading', { name: '선택한 표기' })).toBeInTheDocument()
    expect(within(properties).getByText('대상')).toBeInTheDocument()
    expect(within(properties).getByText('음표')).toBeInTheDocument()
    expect(within(properties).getByText('음가')).toBeInTheDocument()
    expect(within(properties).getByText('4분음표')).toBeInTheDocument()
    expect(within(properties).getByText('성부')).toBeInTheDocument()
    expect(within(properties).getAllByText('1').length).toBeGreaterThan(0)

    fireEvent.click(within(properties).getByRole('combobox',{name:'선택 마디 셈여림'}))
    fireEvent.click(screen.getByRole('option',{name:'ff'}))

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('ff')
    expect(dynamic).toHaveAttribute('data-measure-id', 'measure-1')

    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))

    expect(properties).toHaveAttribute('data-selection-kind', 'measure')
    expect(within(properties).getAllByText('마디').length).toBeGreaterThan(0)
    expect(within(properties).getByText('음자리표')).toBeInTheDocument()
    expect(within(properties).getByText('박자')).toBeInTheDocument()
    expect(within(properties).getByText('4/4')).toBeInTheDocument()
  })

  it('ui.properties-edit applies text and harmony to the selected location, supports undo and disables range edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    const properties = screen.getByRole('region', { name: '선택 요약' })
    const edit = (label: string, value: string) => {
      const input = within(properties).getByLabelText(label)
      fireEvent.change(input, { target: { value } })
      fireEvent.blur(input)
    }
    edit('선택 요약 코드', 'C/G')
    edit('선택 요약 보표 글자', 'cantabile')
    const cancelled = within(properties).getByLabelText('선택 요약 연습표')
    cancelled.focus()
    fireEvent.change(cancelled, { target: { value: 'Cancel me' } })
    fireEvent.keyDown(cancelled, { key: 'Escape' })
    expect(cancelled).not.toHaveValue('Cancel me')
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).toHaveValue('dolce')
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).toHaveValue('cantabile')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0].contents)
    expect(reopened.harmonies).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'C/G', measureId: 'measure-1', tick: TICKS_PER_QUARTER })]))
    expect(reopened.staffTexts).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'cantabile', measureId: 'measure-1' })]))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    expect(within(properties).getByLabelText('선택 요약 보표 글자')).not.toHaveValue('cantabile')
    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }), { shiftKey: true })
    expect(properties).toHaveAttribute('data-selection-kind', 'range')
    for (const control of within(properties).getAllByRole('textbox')) expect(control).toBeDisabled()
    expect(within(properties).getByRole('combobox',{name:'선택 마디 셈여림'})).toBeDisabled()
  })

  it.each([
    {family:'harmonies',label:'선택 요약 코드',first:'C7',next:'Dm7',edited:'Am7'},
    {family:'expressionTexts',label:'선택 요약 표현 텍스트',first:'dolce first',next:'dolce next',edited:'cantabile'}
  ] as const)('studio.input-caret-properties keeps $family on the selected event when input advances to another measure', async ({family,label,first,next,edited})=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {parseHarmonyText}=await import('../../musicxml/harmony-text')
    const score=createScore(),staff=score.parts[0].staves[0],m=staff.measures[0]
    score.title='Caret versus selected '+family;m.id='caret-first';m.voices[0].events=[createNote({id:'caret-note',pitch:{step:'D',octave:4},duration:{value:'whole',dots:0}})]
    const second=structuredClone(m);second.id='caret-next';second.number=2;second.voices[0].events[0].id='caret-next-note';staff.measures.push(second)
    if(family==='harmonies')score.harmonies=[first,next].map((text,index)=>({id:`caret-harmony-${index}`,measureId:index?second.id:m.id,tick:0,...parseHarmonyText(text)!}))
    else score.expressionTexts=[first,next].map((text,index)=>({id:`caret-expression-${index}`,measureId:index?second.id:m.id,tick:0,text}))
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/caret.chromatics',fileName:'caret.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/caret.chromatics',fileName:'caret.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'caret-note 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.click(within(screen.getByRole('region',{name:'음표 입력 도구'})).getByRole('button',{name:'온음표, 단축키 7'}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    expect(document.querySelector('.editor-status')).toHaveTextContent('2마디')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','caret-note')
    const afterInput=structuredClone(playbackMockState.lastScore!)
    if(process.env.DDIRORI_INPUT_CARET_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMidi}=await import('./midi/serialize-midi')
      const dir=join(process.env.DDIRORI_INPUT_CARET_QA_DIR,family);mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'input.chromatics'),encodeNativeProject(createNativeProject(afterInput)));writeFileSync(join(dir,'source.mid'),serializeMidi(afterInput))
      writeFileSync(join(dir,'expectations.json'),JSON.stringify({family,label,text:edited,firstId:score[family]![0].id,eventId:'caret-note',replacement:family==='harmonies'?parseHarmonyText(edited):{text:edited}}))
    }
    const field=screen.getByRole('textbox',{name:label});expect(field).toHaveValue(first)
    expect(screen.getByRole('region',{name:'선택 위치의 표기'})).toHaveTextContent('1마디')
    field.focus();fireEvent.change(field,{target:{value:edited}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const after=structuredClone(playbackMockState.lastScore!)
    expect(after[family]?.[0].text).toBe(edited);expect(after[family]?.[1]).toEqual(afterInput[family]?.[1]);expect({...after,[family]:afterInput[family]}).toEqual(afterInput)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(afterInput)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(after)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(after)
  })

  it('studio.input-caret-tempo preserves the selected tempo marking when the caret advances', async()=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),staff=score.parts[0].staves[0],m=staff.measures[0]
    score.title='Caret versus selected tempo';score.tempo={bpm:120,beatUnit:'quarter',dots:0};m.id='caret-first';m.voices[0].events=[createNote({id:'caret-note',pitch:{step:'D',octave:4},duration:{value:'whole',dots:0}})]
    const second=structuredClone(m);second.id='caret-next';second.number=2;second.voices[0].events[0].id='caret-next-note';staff.measures.push(second)
    score.tempoEvents=[{id:'tempo-first',measureId:'measure-1',tick:0,bpm:88,beatUnit:'quarter',dots:0,text:'First tempo'},{id:'tempo-next',measureId:second.id,tick:0,bpm:96,beatUnit:'half',dots:1,text:'Next tempo'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/caret-tempo.chromatics',fileName:'caret-tempo.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/caret-tempo.chromatics',fileName:'caret-tempo.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'caret-note 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.click(within(screen.getByRole('region',{name:'음표 입력 도구'})).getByRole('button',{name:'온음표, 단축키 7'}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    expect(screen.getByLabelText('입력 위치')).toHaveTextContent('2마디')
    const afterInput=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace('악보');const field=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    expect(field).toHaveValue(88);expect(screen.getByRole('region',{name:'위치별 빠르기'})).toHaveTextContent('1마디')
    field.focus();fireEvent.change(field,{target:{value:'92'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const after=structuredClone(playbackMockState.lastScore!)
    expect(after.tempoEvents?.find(item=>item.id==='tempo-first')).toEqual({...score.tempoEvents[0],bpm:92})
    expect(after.tempoEvents?.find(item=>item.id==='tempo-next')).toEqual(score.tempoEvents[1]);expect({...after,tempoEvents:afterInput.tempoEvents}).toEqual(afterInput)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(afterInput)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(after)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(after)
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const reopenedXml=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    expect(reopenedXml.tempo?.bpm).toBe(120)
    expect(reopenedXml.tempoEvents?.map(({bpm,beatUnit,dots,text})=>({bpm,beatUnit,dots,text}))).toEqual([
      {bpm:92,beatUnit:'quarter',dots:0,text:'First tempo'},
      {bpm:96,beatUnit:'half',dots:1,text:'Next tempo'}
    ])
    const {serializeMidi}=await import('./midi/serialize-midi');expect(serializeMidi(reopenedXml)).toEqual(serializeMidi(after))
    if(process.env.DDIRORI_INPUT_CARET_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMidi}=await import('./midi/serialize-midi')
      const dir=join(process.env.DDIRORI_INPUT_CARET_QA_DIR,'tempoEvents');mkdirSync(dir,{recursive:true})
      for(const [name,value]of [['source',score],['input',afterInput],['edited',after]] as const)writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)))
      writeFileSync(join(dir,'edited.mid'),serializeMidi(after));writeFileSync(join(dir,'expectations.json'),JSON.stringify({family:'tempoEvents',label:'위치별 빠르기 BPM',text:'92',originalValue:'88',firstId:'tempo-first',eventId:'caret-note'}))
    }
  })

  it.each(([
    {stage:'disk',copy:false},{stage:'recovery',copy:false},{stage:'recent',copy:false},
    {stage:'disk',copy:true},{stage:'recent',copy:true}
  ] as const).flatMap(item=>(['cancel','success'] as const).map(outcome=>({...item,outcome}))))('studio.xml-save-feedback distinguishes $stage failure for copy=$copy through $outcome and retry', async ({stage,copy,outcome}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    if(copy){
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/original.chromatics',fileName:'original.chromatics'})
      fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(()=>expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('original.chromatics에 저장했습니다.'))
    }
    vi.mocked(window.inC.autosave.clear).mockClear()
    fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview'),selected=preview.getAttribute('data-selected-event-id')
    const diagnostic=`Error invoking musicxml:save: ${stage} unavailable /fixture/private.musicxml`
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({filePath:'/fixture/retry.musicxml',fileName:'retry.musicxml'})
    if(stage==='disk')vi.mocked(window.inC.musicXml.save).mockRejectedValueOnce(new Error(diagnostic))
    if(stage==='recovery')vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(new Error(diagnostic))
    if(stage==='recent')vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error(diagnostic))
    const status=screen.getByRole('status',{name:'편집 및 파일 상태'}),save=screen.getByRole('button',{name:'MusicXML로 저장'})
    const summary=stage==='disk'?'MusicXML 저장을 마무리하지 못했습니다.':stage==='recovery'?'MusicXML 파일은 저장했지만 자동저장 복구본을 정리하지 못했습니다.':'MusicXML 파일은 저장했지만 최근 악보 목록을 갱신하지 못했습니다.'
    fireEvent.click(save)
    await waitFor(()=>expect(status).toHaveTextContent(summary))
    await waitFor(()=>expect(save).toBeEnabled())
    expect(status).toHaveTextContent('다시 시도해 주세요.')
    expect(status).not.toHaveTextContent(diagnostic)
    expect(status).not.toHaveTextContent('/fixture/private.musicxml')
    expect(document.querySelector('.studio-document__state')).toHaveTextContent(stage==='recent'&&!copy?'변경 없음':'저장하지 않은 변경')
    expect(status).toHaveTextContent('1회 수정');expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected)
    const technical=screen.getByRole('group',{name:'MusicXML 저장 기술 정보'})
    expect(status).not.toContainElement(technical)
    const disclosure=within(technical).getByRole('button',{name:'기술 정보'})
    expect(disclosure).toHaveAttribute('aria-expanded','false');expect(within(technical).getByText(diagnostic)).not.toBeVisible()
    disclosure.focus();fireEvent.keyDown(disclosure,{key:'Enter',code:'Enter'});fireEvent.click(disclosure)
    expect(within(technical).getByText(diagnostic)).toBeVisible()
    fireEvent.keyDown(disclosure,{key:' ',code:'Space'});fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded','false');expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    if(outcome==='cancel'){
      vi.mocked(window.inC.musicXml.save).mockResolvedValueOnce(null)
      fireEvent.click(save);await waitFor(()=>expect(save).toBeEnabled())
      expect(status).toHaveTextContent(summary)
      expect(within(screen.getByRole('group',{name:'MusicXML 저장 기술 정보'})).getByText(diagnostic)).not.toBeVisible()
    }
    fireEvent.click(save);await waitFor(()=>expect(status).toHaveTextContent('retry.musicxml'))
    await waitFor(()=>expect(save).toBeEnabled())
    expect(status.querySelector('.is-error')).not.toBeInTheDocument()
    expect(screen.queryByRole('group',{name:'MusicXML 저장 기술 정보'})).not.toBeInTheDocument()
    expect(document.querySelector('.studio-document__state')).toHaveTextContent(copy?'저장하지 않은 변경':'변경 없음')
    expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected);expect(status).toHaveTextContent('1회 수정')
    const requests=vi.mocked(window.inC.musicXml.save).mock.calls.map(([request])=>request.contents)
    expect(requests.length).toBe(outcome==='cancel'?3:2)
    for(const contents of requests)expect(contents).toBe(requests[0])
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(status).toHaveTextContent('0회 수정')
  })

  it.each((['project','xml','xml-copy'] as const).flatMap(kind=>(['cancel','failure','success'] as const).map(outcome=>({kind,outcome}))))('studio.save-progress distinguishes the owned $kind pending state from an earlier error through $outcome', async ({kind,outcome}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    openStudioWorkspace('파일')
    if(kind==='xml-copy'){
      vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/initial.chromatics',fileName:'initial.chromatics'})
      fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(()=>expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('initial.chromatics에 저장했습니다.'))
      await waitFor(()=>expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
      vi.mocked(window.inC.autosave.clear).mockClear()
    }
    fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview')
    const selected=preview.getAttribute('data-selected-event-id')
    const operation=kind==='project'?vi.mocked(window.inC.project.save):vi.mocked(window.inC.musicXml.save)
    const diagnostic='이전 저장 검사 오류',nextDiagnostic='다음 저장 검사 오류'
    let finish!: (value:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    operation.mockRejectedValueOnce(new Error(diagnostic)).mockImplementationOnce(()=>new Promise<{filePath:string;fileName:string}|null>((resolve,reject)=>{finish=resolve;fail=reject}))
    const save=screen.getByRole('button',{name:kind==='project'?'프로젝트 저장':'MusicXML로 저장'})
    const status=screen.getByRole('status',{name:'편집 및 파일 상태'})
    fireEvent.click(save)
    const errorSummary=kind==='project'?'프로젝트 저장을 마무리하지 못했습니다.':'MusicXML 저장을 마무리하지 못했습니다.'
    await waitFor(()=>expect(status).toHaveTextContent(errorSummary))
    await waitFor(()=>expect(save).toBeEnabled())
    try{
      fireEvent.click(save)
      await waitFor(()=>expect(operation).toHaveBeenCalledTimes(2))
      const message=kind==='project'?'프로젝트를 저장하는 중입니다.':'MusicXML을 저장하는 중입니다.'
      expect(status).toHaveTextContent(message)
      expect(status).not.toHaveTextContent(errorSummary)
      expect(status.querySelector('.is-error')).not.toBeInTheDocument()
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장 중')
      expect(status).toHaveTextContent('1회 수정')
      expect(playbackMockState.lastScore).toEqual(score)
      expect(preview).toHaveAttribute('data-selected-event-id',selected)
      expect(window.inC.autosave.clear).not.toHaveBeenCalled()
      const filename=kind==='project'?'retry.chromatics':'retry.musicxml'
      await act(async()=>{settled=true;if(outcome==='failure')fail(new Error(nextDiagnostic));else finish(outcome==='cancel'?null:{filePath:'/fixture/'+filename,fileName:filename})})
      await waitFor(()=>expect(status).not.toHaveTextContent(message))
      const clean=outcome==='success'&&kind!=='xml-copy'
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(clean?'변경 없음':'저장하지 않은 변경')
      expect(playbackMockState.lastScore).toEqual(score)
      expect(preview).toHaveAttribute('data-selected-event-id',selected)
      expect(status).toHaveTextContent('1회 수정')
      if(outcome==='success')expect(status).toHaveTextContent(filename)
      else {
        expect(status).toHaveTextContent(errorSummary)
        expect(status).not.toHaveTextContent(outcome==='failure'?nextDiagnostic:diagnostic)
        const technical=screen.getByRole('group',{name:kind==='project'?'프로젝트 저장 기술 정보':'MusicXML 저장 기술 정보'})
        fireEvent.click(within(technical).getByRole('button',{name:'기술 정보'}))
        expect(within(technical).getByText(outcome==='failure'?nextDiagnostic:diagnostic)).toBeVisible()
      }
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each((['project','xml'] as const).flatMap(kind=>(['success','failure'] as const).map(outcome=>({kind,outcome}))))('studio.save-progress isolates an older $kind $outcome when a new document owns the workspace', async ({kind,outcome}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const operation=kind==='project'?vi.mocked(window.inC.project.save):vi.mocked(window.inC.musicXml.save)
    let finish!:(value:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    operation.mockImplementationOnce(()=>new Promise<{filePath:string;fileName:string}|null>((resolve,reject)=>{finish=resolve;fail=reject}))
    const {App}=await import('./App');render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:kind==='project'?'프로젝트 저장':'MusicXML로 저장'}))
    await waitFor(()=>expect(operation).toHaveBeenCalledOnce())
    try{
      fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
      const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
      fireEvent.change(wizard.getByRole('textbox',{name:'제목'}),{target:{value:'다음 문서'}})
      fireEvent.click(wizard.getByRole('button',{name:'만들기'}))
      const status=screen.getByRole('status',{name:'편집 및 파일 상태'}),score=structuredClone(playbackMockState.lastScore!)
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
      expect(status).toHaveTextContent('새 악보를 만들었습니다.')
      expect(status).not.toHaveTextContent(/저장하는 중/)
      await act(async()=>{settled=true;if(outcome==='failure')fail(new Error('이전 문서 저장 오류'));else finish({filePath:'/fixture/old-save.chromatics',fileName:'old-save.chromatics'})})
      expect(playbackMockState.lastScore).toEqual(score)
      expect(document.querySelector('.studio-document')).toHaveTextContent('다음 문서')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
      expect(status).toHaveTextContent('새 악보를 만들었습니다.')
      expect(status).not.toHaveTextContent(/old-save|이전 문서 저장 오류/)
      expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it('save.async keeps edits made while a save is pending and suppresses duplicate save requests', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.musicXml.save).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1)
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'after-save-start' } })
    fireEvent.blur(input)
    finish({ filePath: '/scores/async.musicxml', fileName: 'async.musicxml' })
    await screen.findByText(/저장 중 추가한 변경사항은 아직 저장되지 않았습니다/)
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0]).toMatchObject({ filePath: '/scores/async.musicxml', contents: expect.stringContaining('after-save-start') })
  })

  it.each(['success', 'failure'])('save.async ignores stale %s after switching documents', async (outcome) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value: { filePath: string; fileName: string }) => void
    let fail!: (reason: Error) => void
    vi.mocked(window.inC.musicXml.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    if (outcome === 'success') finish({ filePath: '/scores/old.musicxml', fileName: 'old.musicxml' })
    else fail(new Error('stale save failure'))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('stale save failure')).not.toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0]).not.toHaveProperty('filePath')
  })

  it('save.async restores recovery data for edits made during autosave cleanup', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValueOnce({ filePath: '/scores/cleanup.musicxml', fileName: 'cleanup.musicxml' })
    let finishClear!: () => void
    vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise((resolve) => { finishClear = resolve }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    const save = screen.getByRole('button', { name: 'MusicXML로 저장' })
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.autosave.clear).toHaveBeenCalledOnce())
    expect(save).toBeDisabled()
    expect(save).toHaveAttribute('aria-busy', 'true')
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'during-cleanup' } })
    fireEvent.blur(input)
    finishClear()
    await screen.findByText(/저장 중 추가한 변경사항은 아직 저장되지 않았습니다/)
    const recovery = vi.mocked(window.inC.autosave.write).mock.calls.at(-1)![0]
    expect(recovery.score).toEqual(expect.objectContaining({ staffTexts: expect.arrayContaining([expect.objectContaining({ text: 'during-cleanup' })]) }))
    expect(save).toBeEnabled()
  })

  it('studio.file-tools keeps filter navigation local and leaves score/history unchanged until an edit command', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    const root=screen.getByRole('region',{name:'파일 및 선택 도구'})
    expect(root.closest('.studio-chrome')).toBeNull()
    const original=structuredClone(playbackMockState.lastScore)
    const filter=within(root).getByRole('combobox',{name:'선택 필터'})
    filter.focus();fireEvent.keyDown(filter,{key:'Enter'});fireEvent.keyDown(filter,{key:'End'});fireEvent.keyDown(filter,{key:'Escape'})
    expect(filter).toHaveFocus()
    expect(filter).toHaveTextContent('전체')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(filter,{key:'Enter'});fireEvent.keyDown(filter,{key:'End'});fireEvent.keyDown(filter,{key:'Enter'})
    expect(filter).toHaveTextContent('쉼표만')
    expect(within(root).getByRole('button',{name:'음표 지우기'})).toBeDisabled()
    expect(playbackMockState.lastScore).toEqual(original)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(document.querySelector('.editor-status')).toHaveTextContent('정지')
    const objectFilter=within(root).getByRole('combobox',{name:'표기 필터'})
    fireEvent.click(objectFilter);fireEvent.click(screen.getByRole('option',{name:'코드'}))
    expect(objectFilter).toHaveTextContent('코드')
    expect(playbackMockState.lastScore).toEqual(original)
    expect(within(root).getByRole('button',{name:'프로젝트 저장'})).toHaveClass('dd-button')
  })

  it('save.async retains unsaved edits after failure and allows retry', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockRejectedValueOnce(new Error('disk unavailable'))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    const input = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(input, { target: { value: 'retain-on-failure' } })
    fireEvent.blur(input)
    const save = screen.getByRole('button', { name: 'MusicXML로 저장' })
    fireEvent.click(save)
    await screen.findByText(/MusicXML 저장을 마무리하지 못했습니다\./)
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).not.toHaveClass('studio-chrome')
    expect(within(status).getByText(/MusicXML 저장을 마무리하지 못했습니다\./)).toHaveClass('dd-text', 'is-error')
    expect(status).not.toHaveTextContent('disk unavailable')
    const technical = screen.getByRole('group', { name: 'MusicXML 저장 기술 정보' })
    expect(within(technical).getByText('disk unavailable')).not.toBeVisible()
    expect(within(status).getByText('1회 수정')).toHaveClass('dd-text--numeric')
    expect(input).toHaveValue('retain-on-failure')
    const failedScore = structuredClone(playbackMockState.lastScore)
    const failedSelection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(save).toBeEnabled()
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0].contents).toContain('retain-on-failure')
    expect(playbackMockState.lastScore).toEqual(failedScore)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', failedSelection)
    expect(status).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(status).toHaveTextContent('0회 수정')
    expect(playbackMockState.lastScore).not.toEqual(failedScore)
  })

  it('ui.shortcut-help exposes the V1 command reference from File mode', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '단축키 도움말' }))

    const dialog = screen.getByRole('dialog', { name: '단축키 도움말' })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog).toHaveClass('dd-dialog')
    expect(dialog.closest('.studio-chrome')).toBeNull()
    expect(within(dialog).getByRole('heading',{name:'단축키 도움말'})).toHaveClass('dd-text--section-title')

    expect(within(dialog).getByText('음표 입력')).toBeInTheDocument()
    expect(within(dialog).getByText('음가 선택')).toBeInTheDocument()
    expect(within(dialog).getByText('1-7')).toBeInTheDocument()
    expect(within(dialog).getByText('셋잇단음표')).toBeInTheDocument()
    expect(within(dialog).getByText('⌘/Ctrl+3')).toBeInTheDocument()
    expect(within(dialog).getByText('성부 직접 선택')).toBeInTheDocument()
    expect(within(dialog).getByText('Cmd/Ctrl+Alt+1-4')).toBeInTheDocument()
    expect(within(dialog).queryByText('9')).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog', { name: '단축키 도움말' })).not.toBeInTheDocument()
  })

  it('studio.shortcut-help guards editor keys and restores the real trigger on cancel', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    openStudioWorkspace('파일')
    const trigger=screen.getByRole('button',{name:'단축키 도움말'})
    trigger.focus();fireEvent.click(trigger)
    const dialog=screen.getByRole('dialog',{name:'단축키 도움말'}),before=structuredClone(playbackMockState.lastScore)
    const confirm=within(dialog).getByRole('button',{name:'확인'})
    for(const event of [{key:' ',code:'Space'},{key:'n',code:'KeyN'},{key:'c',code:'KeyC'},{key:'z',code:'KeyZ',ctrlKey:true},{key:'s',code:'KeyS',ctrlKey:true},{key:'Enter',code:'Enter',isComposing:true}]) fireEvent.keyDown(confirm,event)
    expect(playbackMockState.lastScore).toEqual(before);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled();expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    fireEvent(dialog,new Event('cancel',{cancelable:true}))
    await waitFor(()=>expect(trigger).toHaveFocus())
    expect(screen.queryByRole('dialog',{name:'단축키 도움말'})).toBeNull()
  })

  it('studio.new-score-system uses public controls without legacy dialog overrides', async () => {
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const dialog=screen.getByRole('dialog',{name:'새 악보 만들기'}), q=within(dialog)
    expect(dialog.closest('.studio-chrome')).toBeNull()
    for(const label of ['제목','작곡가','마디 수','빠르기']) expect(q.getByLabelText(label).closest('.dd-input-row')).not.toBeNull()
    for(const label of ['악보 구성','조표','박자표']) expect(q.getByRole('combobox',{name:label})).toHaveClass('dd-select')
    for(const button of q.getAllByRole('button')) expect(button).toHaveClass('dd-button')
    expect(q.getByRole('button',{name:'만들기'})).toBeEnabled()
    expect(q.getByRole('spinbutton',{name:'빠르기'})).toHaveAccessibleDescription('bpm')
    expect(q.getAllByRole('button',{name:/템플릿/})).toHaveLength(4)
  })

  it('studio.new-score-system keeps selections in draft and submits one configured score', async () => {
    const { App } = await import('./App'); render(<App />)
    const before=structuredClone(playbackMockState.lastScore)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const dialog=screen.getByRole('dialog',{name:'새 악보 만들기'}), q=within(dialog)
    fireEvent.click(q.getByRole('combobox',{name:'악보 구성'}))
    fireEvent.click(screen.getByRole('option',{name:'피아노 grand staff'}))
    expect(dialog).toBeInTheDocument(); expect(playbackMockState.lastScore).toEqual(before)
    expect(q.getByRole('button',{name:'피아노 grand staff 템플릿'})).toHaveAttribute('aria-pressed','true')
    for(const [label,option] of [['조표','사장조 (♯ 1개)'],['박자표','3/4']]) {
      fireEvent.click(q.getByRole('combobox',{name:label}));fireEvent.click(screen.getByRole('option',{name:option}))
    }
    fireEvent.change(q.getByRole('textbox',{name:'제목'}),{target:{value:'설정 보존'}})
    fireEvent.change(q.getByRole('textbox',{name:'작곡가'}),{target:{value:'작성자'}})
    fireEvent.change(q.getByRole('spinbutton',{name:'마디 수'}),{target:{value:'3'}})
    fireEvent.change(q.getByRole('spinbutton',{name:'빠르기'}),{target:{value:'88'}})
    fireEvent.submit(q.getByRole('form',{name:'새 악보 만들기'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    const created=playbackMockState.lastScore!
    expect(created.title).toBe('설정 보존');expect(created.composer).toBe('작성자')
    expect(created.parts[0]!.staves).toHaveLength(2)
    for(const staff of created.parts[0]!.staves) {
      expect(staff.measures).toHaveLength(3)
      expect(staff.measures[0]!.keySignature?.fifths).toBe(1)
      expect(staff.measures[0]!.timeSignature).toEqual({beats:3,beatType:4})
    }
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.r3 wizard keeps composition local and cancellation restores its trigger', async () => {
    const { App } = await import('./App')
    render(<App />)
    const trigger=screen.getByRole('button',{name:'새 악보 만들기'})
    trigger.focus(); fireEvent.click(trigger)
    const dialog=screen.getByRole('dialog',{name:'새 악보 만들기'})
    const title=within(dialog).getByRole('textbox',{name:'제목'})
    fireEvent.compositionStart(title)
    fireEvent.change(title,{target:{value:'한글'}})
    fireEvent.keyDown(title,{key:'Enter',code:'Enter',isComposing:true})
    fireEvent.submit(within(dialog).getByRole('form',{name:'새 악보 만들기'}))
    expect(dialog).toBeInTheDocument()
    fireEvent.compositionEnd(title)
    fireEvent.keyDown(title,{key:'s',code:'KeyS',ctrlKey:true})
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button',{name:'취소'}))
    await waitFor(()=>expect(trigger).toHaveFocus())
    expect(screen.getByRole('heading',{name:'새 악보를 만들어 볼까요?'})).toBeInTheDocument()
  })

  it('studio.r3 dirty replacement and wizard draft cancellation preserve notes and undo', async () => {
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    fireEvent.click(within(screen.getByRole('dialog',{name:'새 악보 만들기'})).getByRole('button',{name:'만들기'}))
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const preview=screen.getByTestId('notation-preview')
    const before=preview.getAttribute('data-event-durations')
    openStudioWorkspace('파일')
    vi.spyOn(window,'confirm').mockReturnValue(false)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    expect(window.confirm).toHaveBeenCalledWith(unsavedScoreChangesMessage)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(preview).toHaveAttribute('data-event-durations',before)
    vi.mocked(window.confirm).mockReturnValue(true)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const dialog=screen.getByRole('dialog',{name:'새 악보 만들기'})
    fireEvent.change(within(dialog).getByRole('textbox',{name:'제목'}),{target:{value:'discard this draft'}})
    fireEvent.click(within(dialog).getByRole('button',{name:'취소'}))
    expect(preview).toHaveAttribute('data-event-durations',before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(screen.getByRole('note',{name:'첫 입력 안내'})).toBeInTheDocument()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it('studio.r3 does not celebrate an empty project or a MusicXML copy', async () => {
    vi.mocked(window.inC.project.save).mockResolvedValue({fileName:'empty.chromatics',filePath:'/fixture/empty.chromatics'})
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    fireEvent.click(within(screen.getByRole('dialog',{name:'새 악보 만들기'})).getByRole('button',{name:'만들기'}))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.autosave.clear).toHaveBeenCalled())
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    openStudioWorkspace('파일')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({fileName:'copy.musicxml',filePath:'/fixture/copy.musicxml'})
    fireEvent.click(screen.getByRole('button',{name:'MusicXML로 저장'}))
    await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalled())
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
  })

  it.each([
    ['cancel', 'retry'], ['failure', 'retry'], ['cancel', 'moved'], ['failure', 'moved']
  ] as const)('studio.r3 keyboard retry after save %s respects %s focus', async (outcome, focusPolicy) => {
    let finish!: (value: null) => void
    let fail!: (reason: Error) => void
    vi.mocked(window.inC.project.save).mockImplementationOnce(() => new Promise((resolve, reject) => {
      finish = resolve
      fail = reject
    }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    const inputToggle = screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' })
    await waitFor(() => expect(inputToggle).toHaveFocus())
    fireEvent.click(inputToggle)
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    const preview = screen.getByTestId('notation-preview')
    const before = preview.getAttribute('data-event-pitches')
    const trigger = screen.getByRole('button', { name: '프로젝트 파일 저장' })
    expect(screen.getByRole('region', {name:'첫 프로젝트 저장'}).closest('.studio-chrome')).toBeNull()
    expect(trigger).toHaveClass('dd-button')
    trigger.focus()
    fireEvent.click(trigger)
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(trigger).toHaveAttribute('aria-busy','true')
    expect(within(screen.getByRole('region',{name:'첫 프로젝트 저장'})).queryByRole('progressbar')).toBeNull()
    expect(screen.getByRole('region',{name:'첫 프로젝트 저장'})).toHaveTextContent('프로젝트 파일 저장 중')
    const alternate = screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' })
    if (focusPolicy === 'moved') alternate.focus()
    else trigger.blur()
    await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('Keyboard retry disk failure')))
    const retry = await screen.findByRole('button', { name: '프로젝트 파일 저장' })
    await waitFor(() => expect(focusPolicy === 'retry' ? retry : alternate).toHaveFocus())
    expect(retry).toBeEnabled()
    expect(preview).toHaveAttribute('data-event-pitches', before)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/keyboard.chromatics', fileName: 'keyboard.chromatics' })
    fireEvent.click(retry)
    await screen.findByText('첫 악보를 파일로 저장했어요.')
    expect(window.inC.project.save).toHaveBeenCalledTimes(2)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(preview).toHaveAttribute('data-event-pitches', before)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(screen.getByRole('note', { name: '첫 입력 안내' })).toBeInTheDocument()
  })

  it.each(['bridge', 'invalid', 'tie-gap'] as const)('studio.project-open-feedback keeps current edits through %s failure and a successful retry', async failure => {
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    const preview = screen.getByTestId('notation-preview'), pitches = preview.getAttribute('data-event-pitches'), selected = preview.getAttribute('data-selected-event-id')
    const diagnostic = failure === 'bridge' ? 'QA read denied /fixture/private.chromatics' : failure === 'tie-gap' ? 'Invalid project ties: Invalid tie start: chord-tie-1; Invalid tie stop: chord-tie-2' : 'Invalid Chromatics project JSON. Original file was not modified.'
    if (failure === 'bridge') vi.mocked(window.inC.project.open).mockRejectedValueOnce(new Error(diagnostic))
    else if (failure === 'tie-gap') {
      const { createWholeChordTieScore } = await import('../../testing/chord-tie-fixture')
      const { createNativeProject } = await import('../../project/schema')
      const project = createNativeProject(createWholeChordTieScore(false, false))
      // Deliberately corrupt only the serialized fixture after validation.
      // Native source files are never repaired or silently stripped on open.
      project.score.parts[0].staves[0].measures[0].voices[0].events[0].duration = { value: 'quarter', dots: 0 }
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/tie-gap.chromatics', fileName: 'tie-gap.chromatics', contents: JSON.stringify(project) })
    } else vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/invalid.chromatics', fileName: 'invalid.chromatics', contents: '{broken' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
    await waitFor(() => expect(status).toHaveTextContent('프로젝트를 열지 못했습니다.'))
    expect(status).toHaveTextContent('현재 악보는 유지됩니다.')
    expect(status).not.toHaveTextContent(diagnostic)
    expect(status).toHaveTextContent('1회 수정')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(preview).toHaveAttribute('data-event-pitches', pitches)
    expect(preview).toHaveAttribute('data-selected-event-id', selected)
    const technical = screen.getByRole('group', { name: '프로젝트 열기 기술 정보' })
    expect(within(technical).getByText(diagnostic)).not.toBeVisible()
    fireEvent.click(within(technical).getByRole('button', { name: '기술 정보' }))
    expect(within(technical).getByText(diagnostic)).toBeVisible()
    expect(status).not.toContainElement(technical)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(screen.getByRole('note', { name: '첫 입력 안내' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(preview).toHaveAttribute('data-event-pitches', pitches)
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const incoming = createNativeProject({ ...demoScore, title: '다시 연 프로젝트' })
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/retry.chromatics', fileName: 'retry.chromatics', contents: encodeNativeProject(incoming) })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('다시 연 프로젝트')
    expect(screen.queryByRole('group', { name: '프로젝트 열기 기술 정보' })).not.toBeInTheDocument()
    expect(status).toHaveTextContent('0회 수정')
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(incoming.score)
  })

  it('studio.project-open-feedback distinguishes an opened document from failed recent-list bookkeeping', async () => {
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const incoming = createNativeProject({ ...demoScore, title: '열린 문서는 유지' })
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/opened.chromatics', fileName: 'opened.chromatics', contents: encodeNativeProject(incoming) })
    vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error('QA recent store denied'))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('열린 문서는 유지')
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
    await waitFor(() => expect(status).toHaveTextContent('프로젝트를 열었지만 최근 목록을 갱신하지 못했습니다.'))
    expect(status).not.toHaveTextContent('프로젝트를 열지 못했습니다.')
    expect(status).not.toHaveTextContent('QA recent store denied')
    expect(status).toHaveTextContent('0회 수정')
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    const technical = screen.getByRole('group', { name: '프로젝트 열기 기술 정보' })
    fireEvent.click(within(technical).getByRole('button', { name: '기술 정보' }))
    expect(within(technical).getByText('QA recent store denied')).toBeVisible()
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ filePath: '/fixture/opened.chromatics', fileName: 'opened.chromatics' })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(status).toHaveTextContent('opened.chromatics에 저장했습니다.'))
    const request = vi.mocked(window.inC.project.save).mock.calls[0][0]
    expect(request.filePath).toBe('/fixture/opened.chromatics')
    expect(decodeNativeProject(request.contents).score).toEqual(incoming.score)
    expect(screen.queryByRole('group', { name: '프로젝트 열기 기술 정보' })).not.toBeInTheDocument()
  })

  it('studio.project-open-feedback preserves the missing recent-project removal action', async () => {
    const recent = { filePath: '/fixture/missing.chromatics', fileName: 'missing.chromatics', format: 'native' as const, openedAt: '2026-10-27T00:00:00Z' }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recent])
    vi.mocked(window.inC.recentMusicXml.open).mockRejectedValueOnce(new Error('최근 파일을 찾을 수 없습니다. /fixture/missing.chromatics'))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /missing.chromatics/ }))
    expect(await screen.findByText(/최근 프로젝트 파일을 찾을 수 없습니다\./)).toBeVisible()
    expect(screen.getByRole('group', { name: '프로젝트 열기 기술 정보' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '목록에서 지우기' }))
    await waitFor(() => expect(window.inC.recentMusicXml.remove).toHaveBeenCalledWith({ filePath: recent.filePath }))
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['cancel', 'error'] as const)('studio.project-open-feedback isolates a late %s from a newer document', async outcome => {
    let finish!: (value: null) => void, fail!: (reason: Error) => void
    vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(window.inC.project.open).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    const before = screen.getByRole('status', { name: '편집 및 파일 상태' }).textContent
    await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('late native read failure')))
    expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).toHaveTextContent(before!)
    expect(screen.queryByRole('group', { name: '프로젝트 열기 기술 정보' })).not.toBeInTheDocument()
  })

  it.each(['write', 'recent', 'cleanup'] as const)('studio.project-save-feedback separates %s diagnostics from the live summary and preserves retry and undo', async stage => {
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    const preview = screen.getByTestId('notation-preview')
    const before = { pitches: preview.getAttribute('data-event-pitches'), selection: preview.getAttribute('data-selected-event-id') }
    const diagnostic = `Error invoking project:save: ${stage} unavailable /fixture/private.chromatics`
    const result = { filePath: '/fixture/retry.chromatics', fileName: 'retry.chromatics' }
    vi.mocked(window.inC.project.save).mockResolvedValue(result)
    if (stage === 'write') vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error(diagnostic))
    if (stage === 'recent') vi.mocked(window.inC.recentMusicXml.add).mockRejectedValueOnce(new Error(diagnostic))
    if (stage === 'cleanup') vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(new Error(diagnostic))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 파일 저장' }))
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
    await waitFor(() => expect(status).toHaveTextContent('프로젝트 저장을 마무리하지 못했습니다.'))
    expect(status).toHaveTextContent('다시 시도해 주세요.')
    expect(status).not.toHaveTextContent(diagnostic)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(status).toHaveTextContent('1회 수정')
    expect(preview).toHaveAttribute('data-event-pitches', before.pitches)
    expect(preview).toHaveAttribute('data-selected-event-id', before.selection)
    const technical = screen.getByRole('group', { name: '프로젝트 저장 기술 정보' })
    expect(status).not.toContainElement(technical)
    const disclosure = within(technical).getByRole('button', { name: '기술 정보' })
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(within(technical).getByText(diagnostic)).not.toBeVisible()
    disclosure.focus()
    fireEvent.keyDown(disclosure, { key: 'Enter', code: 'Enter' })
    fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded', 'true')
    expect(within(technical).getByText(diagnostic)).toBeVisible()
    fireEvent.keyDown(disclosure, { key: ' ', code: 'Space' })
    fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded', 'false')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(status).toHaveTextContent('1회 수정')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 파일 저장' }))
    await waitFor(() => expect(status).toHaveTextContent('retry.chromatics에 저장했습니다.'))
    expect(screen.queryByRole('group', { name: '프로젝트 저장 기술 정보' })).not.toBeInTheDocument()
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    expect(window.inC.project.save).toHaveBeenCalledTimes(2)
    const { decodeNativeProject } = await import('../../project/schema')
    const requests = vi.mocked(window.inC.project.save).mock.calls.map(call => decodeNativeProject(call[0].contents).score)
    expect(requests[1]).toEqual(requests[0])
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(screen.getByRole('note', { name: '첫 입력 안내' })).toBeInTheDocument()
    expect(status).toHaveTextContent('0회 수정')
  })

  it('studio.project-save-feedback keeps pre-save tuplet validation actionable without an IPC diagnostic', async () => {
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.keyDown(window, { key: '3', code: 'Digit3', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).toHaveTextContent('셋잇단음표 입력을 완료하거나 취소한 뒤 저장해 주세요.'))
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(screen.queryByRole('group', { name: '프로젝트 저장 기술 정보' })).not.toBeInTheDocument()
  })

  it.each(['cancel', 'error'] as const)('studio.project-save-feedback ignores a late %s after document replacement', async outcome => {
    let finish!: (value: null) => void
    let fail!: (reason: Error) => void
    vi.mocked(window.inC.project.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    await act(async () => outcome === 'cancel' ? finish(null) : fail(new Error('late private bridge error')))
    expect(screen.queryByText('late private bridge error')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '프로젝트 저장 기술 정보' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).not.toHaveTextContent('프로젝트 저장을 마무리하지 못했습니다.')
  })

  it('studio.r3 first session uses actual notes and only celebrates a current native save', async () => {
    const { App } = await import('./App')
    render(<App />)
    expect(screen.getByRole('heading', {name:'새 악보를 만들어 볼까요?'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name:/새 악보 만들기/}))
    const dialog=screen.getByRole('dialog', {name:'새 악보 만들기'})
    fireEvent.click(within(dialog).getByRole('button', {name:'만들기'}))
    expect(screen.getByRole('note', {name:'첫 입력 안내'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name:'음표 입력 전환, 단축키 N'}))
    expect(screen.getByRole('note', {name:'첫 입력 안내'})).toHaveTextContent('A–G')
    fireEvent.keyDown(window, {code:'KeyC',key:'c'})
    expect(screen.queryByRole('note', {name:'첫 입력 안내'})).not.toBeInTheDocument()
    fireEvent.keyDown(window, {code:'KeyZ',key:'z',ctrlKey:true})
    expect(screen.getByRole('note', {name:'첫 입력 안내'})).toBeInTheDocument()
    fireEvent.keyDown(window, {code:'KeyZ',key:'z',ctrlKey:true,shiftKey:true})
    openStudioWorkspace('파일')
    vi.mocked(window.inC.project.save).mockResolvedValueOnce(null)
    fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    vi.mocked(window.inC.project.save).mockRejectedValueOnce(new Error('R3 disk unavailable'))
    await waitFor(()=>expect(screen.getByRole('button', {name:'프로젝트 저장'})).toBeEnabled())
    fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
    await waitFor(() => expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).toHaveTextContent('프로젝트 저장을 마무리하지 못했습니다.'))
    const technical = screen.getByRole('group', { name: '프로젝트 저장 기술 정보' })
    fireEvent.click(within(technical).getByRole('button', { name: '기술 정보' }))
    expect(within(technical).getByText('R3 disk unavailable')).toBeVisible()
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/first.chromatics',fileName:'first.chromatics'})
    fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
    await screen.findByText('첫 악보를 파일로 저장했어요.')
    fireEvent.click(screen.getByRole('button',{name:'첫 저장 알림 닫기'}))
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(4))
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    const {decodeNativeProject}=await import('../../project/schema')
    const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls.at(-1)![0].contents)
    expect(saved.score.parts[0].staves[0].measures[0].voices[0].events.some(event=>event.type==='note')).toBe(true)
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  })

  it.each(['note','title'] as const)('studio.first-achievement dismisses on a committed %s edit, without resurfacing on undo or later saves', async change => {
    window.history.replaceState({}, '', '/')
    localStorage.removeItem('chromatics.studio-first-project.v1')
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/first.chromatics',fileName:'first.chromatics'})
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('첫 악보를 파일로 저장했어요.')
    const { decodeNativeProject } = await import('../../project/schema')
    const first = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls.at(-1)![0].contents).score
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')

    // Workspace navigation alone does not dismiss a result the user is reading.
    fireEvent.click(screen.getByRole('button', { name: '팔레트 표시' }))
    expect(screen.getByText('첫 악보를 파일로 저장했어요.')).toBeVisible()
    if (change === 'note') fireEvent.keyDown(window, { key: 'd', code: 'KeyD' })
    else {
      fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
      fireEvent.click(screen.getByRole('button', { name: '악보 제목 편집' }))
      const title = screen.getByRole('textbox', { name: '악보 제목' })
      fireEvent.change(title, { target: { value: '첫 저장 이후 제목' } })
      expect(screen.getByText('첫 악보를 파일로 저장했어요.')).toBeVisible()
      fireEvent.keyDown(title, { key: 'Enter', code: 'Enter' })
    }
    await waitFor(() => expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument())
    if (change === 'title') await waitFor(() => expect(screen.getByRole('button', { name: '악보 정보' })).toHaveFocus())
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(localStorage.getItem('chromatics.studio-first-project.v1')).toBe('saved')
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls.at(-1)![0].contents).score).toEqual(first)
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
  })

  it.each(['new-edit','new-document'] as const)('studio.r3 suppresses first achievement for a late native save after %s', async change => {
    let finish!: (value:{filePath:string;fileName:string})=>void
    vi.mocked(window.inC.project.save).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', {name:/새 악보 만들기/}))
    fireEvent.click(within(screen.getByRole('dialog', {name:'새 악보 만들기'})).getByRole('button', {name:'만들기'}))
    fireEvent.click(screen.getByRole('button', {name:'음표 입력 전환, 단축키 N'}))
    fireEvent.keyDown(window, {code:'KeyC',key:'c'})
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
    await waitFor(()=>expect(finish).toBeTypeOf('function'))
    if(change==='new-edit') fireEvent.keyDown(window, {code:'KeyD',key:'d'})
    else {
      vi.spyOn(window,'confirm').mockReturnValue(true)
      fireEvent.click(screen.getByRole('button', {name:/새 악보 만들기/}))
      fireEvent.click(within(screen.getByRole('dialog', {name:'새 악보 만들기'})).getByRole('button', {name:'만들기'}))
    }
    await act(async()=>finish({filePath:'/fixture/first.chromatics',fileName:'first.chromatics'}))
    expect(screen.queryByText('첫 악보를 파일로 저장했어요.')).not.toBeInTheDocument()
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  })

  it.each(['success','cancel'] as const)('studio.r3 reports actual lyric overlap only after PDF %s without changing music or clean state', async outcome => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.pdf.save).mockResolvedValueOnce(outcome==='success'?{fileName:'lyrics.pdf'}:null)
    const {App}=await import('./App')
    render(<App />)
    fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const preview=screen.getByTestId('notation-preview'),before=preview.getAttribute('data-event-pitches')
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
    for(const [index,x] of [10,30].entries()){
      const text=document.createElementNS(svg.namespaceURI,'text') as SVGGraphicsElement
      text.classList.add('notation-lyric');text.setAttribute('data-event-id',`word-${index}`);text.setAttribute('data-lyric-number','1')
      text.getBBox=()=>({x,y:100,width:50,height:16} as DOMRect);svg.append(text)
    }
    // Real renderer class/ink contract, supplied by the mocked SVG in this test.
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button',{name:'PDF 변환'}))
    const printed = printingPreview();printed.classList.add('notation-preview');printed.append(svg)
    await waitFor(()=>expect(window.inC.pdf.save).toHaveBeenCalledOnce())
    if(outcome==='success')expect(await screen.findByText(/PDF에 겹치는 가사가 있습니다/)).toBeInTheDocument()
    else expect(screen.queryByText(/PDF에 겹치는 가사가 있습니다/)).not.toBeInTheDocument()
    expect(preview).toHaveAttribute('data-event-pitches',before)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  })

  it('studio.r3 PDF success exposes manual Score instructions without cleaning the project', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.pdf.save).mockResolvedValueOnce({fileName:'practice.pdf'})
    const { App } = await import('./App')
    render(<App />)
    fireEvent.keyDown(window,{code:'KeyC',key:'c'})
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', {name:'PDF 변환'}))
    const guide=await screen.findByRole('button', {name:'가져오는 방법'})
    const result=screen.getByRole('region',{name:'PDF 출력 결과'})
    expect(result.closest('.studio-chrome')).toBeNull()
    expect(within(result).getByRole('heading',{name:'PDF로 연습 이어가기'})).toHaveClass('dd-text--item-title')
    expect(guide).toHaveClass('dd-button')
    playbackMockState.play.mockClear()
    fireEvent.keyDown(guide,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    fireEvent.click(guide)
    const dialog=screen.getByRole('dialog',{name:'PDF로 연습 이어가기'})
    expect(dialog.closest('.studio-chrome')).toBeNull()
    expect(dialog).toHaveTextContent('모바일 기기')
    expect(dialog).toHaveTextContent('자동으로 반영되지 않습니다')
    expect(within(dialog).queryByRole('button',{name:'Score에서 열기'})).not.toBeInTheDocument()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['failure', 'cancel'] as const)('studio.pdf-failure-guidance preserves editing and retry after %s', async outcome => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value: null) => void, fail!: (error: Error) => void
    const raw = 'EACCES: owned PDF output failure /owned/output.pdf'
    vi.mocked(window.inC.pdf.save).mockImplementationOnce(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
      .mockResolvedValueOnce({ fileName: 'retry.pdf' })
    const { App } = await import('./App'); render(<App />)
    const original = structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
    const edited = structuredClone(playbackMockState.lastScore), selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    openStudioWorkspace('내보내기')
    const pdf = screen.getByRole('button', { name: 'PDF 변환' }); pdf.focus(); fireEvent.click(pdf)
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalledOnce())
    await act(async () => outcome === 'failure' ? fail(Error(raw)) : finish(null))
    if (outcome === 'failure') {
      expect(document.querySelector('.editor-status')).toHaveTextContent('PDF 출력을 완료하지 못했습니다. 악보와 변경 사항은 유지됩니다.')
      expect(document.querySelector('.editor-status')).not.toHaveTextContent('EACCES')
      const details = screen.getByRole('group', { name: 'PDF 출력 기술 정보' })
      expect(within(details).getByText(raw)).not.toBeVisible()
      fireEvent.click(within(details).getByRole('button', { name: '기술 정보' }))
      expect(within(details).getByText(raw)).toBeVisible()
    }
    expect(screen.queryByRole('region', { name: 'PDF 출력 결과' })).not.toBeInTheDocument()
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected)
    await waitFor(() => expect(pdf).toBeEnabled())
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true }); expect(playbackMockState.lastScore).toEqual(original)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true }); expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(pdf)
    await screen.findByRole('region', { name: 'PDF 출력 결과' })
    expect(window.inC.pdf.save).toHaveBeenCalledTimes(2)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(playbackMockState.lastScore).toEqual(edited)
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['success','cancel','error'] as const)('studio.pdf-page-target publishes the requested measured layout limit only after %s', async outcome => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!:(value:{fileName:string}|null)=>void,fail!:(error:Error)=>void
    vi.mocked(window.inC.pdf.save).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    const {App}=await import('./App');render(<App />)
    fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const live=screen.getByTestId('notation-preview'),before=live.getAttribute('data-event-pitches')
    openStudioWorkspace('내보내기')
    expect(screen.getByRole('spinbutton',{name:'PDF 목표 장수'})).toHaveValue(2)
    fireEvent.click(screen.getByRole('button',{name:'PDF 변환'}))
    const printed=printingPreview();printed.classList.add('notation-preview')
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
    svg.setAttribute('viewBox','0 0 760 5000');printed.append(svg)
    await waitFor(()=>expect(window.inC.pdf.save).toHaveBeenCalledOnce())
    // A later workspace target and detached render metrics cannot rewrite this request.
    fireEvent.change(screen.getByRole('spinbutton',{name:'PDF 목표 장수'}),{target:{value:'10'}})
    svg.setAttribute('viewBox','0 0 760 100')
    await act(async()=>outcome==='error'?fail(new Error('controlled page test failure')):finish(outcome==='cancel'?null:{fileName:'pages.pdf'}))
    if(outcome==='success'){
      const result=await screen.findByRole('region',{name:'PDF 출력 결과'})
      expect(result).toHaveTextContent('목표 2장에 맞추기 어려운 배치입니다.')
      expect(result).not.toHaveTextContent('목표 10장')
      expect(within(result).getByText(/목표 2장/).closest('.dd-banner')).toHaveClass('dd-banner--warning')
    }else expect(screen.queryByRole('region',{name:'PDF 출력 결과'})).not.toBeInTheDocument()
    expect(live).toHaveAttribute('data-event-pitches',before)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['success','failure'] as const)('studio.r3 ignores late PDF %s after replacing the document', async outcome=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!: (value:{fileName:string})=>void
    let fail!: (error:Error)=>void
    vi.mocked(window.inC.pdf.save).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', {name:'PDF 변환'}))
    await waitFor(()=>expect(finish).toBeTypeOf('function'))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', {name:/새 악보 만들기/}))
    fireEvent.click(within(screen.getByRole('dialog',{name:'새 악보 만들기'})).getByRole('button',{name:'만들기'}))
    await act(async()=>outcome==='success'?finish({fileName:'old-r3.pdf'}):fail(new Error('old-r3-failure')))
    expect(screen.queryByText(/old-r3/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'가져오는 방법'})).not.toBeInTheDocument()
  })

  it.each([
    { reference: { step: 'B' as const, octave: 9 }, invalid: 'C', valid: 'B' },
    { reference: { step: 'C' as const, octave: -1 }, invalid: 'B', valid: 'C' }
  ])('studio.r3 rejects unsavable input after $reference and preserves save/caret/undo', async ({reference,invalid,valid}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createNewScore } = await import('./editor/new-score')
    const { createDuration, applyScoreCommand } = await import('../../score-core')
    const { createNoteInputState, buildSequentialInput } = await import('./editor/note-input-state')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const blank = createNewScore({ title:'Input boundary',measureCount:2,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4} })
    const part = blank.parts[0], staff = part.staves[0], measure = staff.measures[0], voice = measure.voices[0]
    const input = buildSequentialInput(blank,createNoteInputState({target:{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:voice.id},tick:0,duration:createDuration('quarter'),mode:'note',lastPitch:reference}),reference.step,kind=>`${kind}-boundary`)!
    const original = applyScoreCommand(blank,input.command).score
    const rest = original.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.type==='rest')!
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/fixture/boundary.chromatics',fileName:'boundary.chromatics',contents:encodeNativeProject(createNativeProject(original))})
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText('Input boundary')
    fireEvent.click(screen.getByRole('button',{name:`${rest.id} 선택`}))
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    const preview = screen.getByTestId('notation-preview'), before = preview.getAttribute('data-event-pitches')
    fireEvent.keyDown(window,{key:invalid.toLowerCase(),code:`Key${invalid}`})
    expect(screen.getByText(/남은 박자와 음높이 범위/)).toBeInTheDocument()
    expect(preview).toHaveAttribute('data-event-pitches',before)
    expect(preview).toHaveAttribute('data-selected-event-id',rest.id)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(original)
    fireEvent.keyDown(window,{key:valid.toLowerCase(),code:`Key${valid}`})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(preview).toHaveAttribute('data-event-pitches',before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each([
    ['title','Enter',false,229],['title','Escape',true,27],
    ['chord','Enter',false,229],['chord','Escape',true,27]
  ] as const)('studio.r3 IME draft guard preserves %s on %s composing=%s code=%s', async (field,key,isComposing,keyCode) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    if (field === 'title') fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}))
    else {
      fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}))
      openHarmonyProperties()
    }
    const input = screen.getByRole('textbox',{name:field==='title'?'악보 제목':'선택 요약 코드'})
    const value = field==='title'?'조합 중인 제목':'Dm7'
    input.focus()
    fireEvent.change(input,{target:{value}})
    fireEvent.keyDown(input,{key,code:key,isComposing,keyCode})
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
    expect(input).toHaveValue(value)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(input,{key:'F6',code:'F6'})
    expect(input).toHaveFocus()
    fireEvent.keyDown(input,{key:'Enter',code:'Enter'})
    fireEvent.blur(input)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const canvas = screen.getByLabelText('악보 캔버스')
    canvas.focus()
    fireEvent.keyDown(canvas,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['current', 'current-rest', 'current-cursor', 'manual-wheel-after-entry', 'focus-moved', 'selection-moved', 'undo', 'unmount'] as const)('studio.input-visibility reveals only the current entered event without moving focus: %s', async disposition => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const frames = new Map<number, FrameRequestCallback>()
    let frameId = 0
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++frameId, callback)
      return frameId
    })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id) })
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    try {
      const { App } = await import('./App')
      const view = render(<App />)
      const preview = screen.getByTestId('notation-preview')
      const entries = preview.getAttribute('data-all-event-pitches')!.split(',')
      const [partId, staffId, measureId, voiceId, eventId] = entries.filter(value => value.endsWith(':rest')).at(-1)!.split(':')
      fireEvent.click(screen.getByRole('button', { name: `${eventId} 선택` }))
      const target = document.createElement('button')
      target.className = 'notation-event'
      Object.assign(target.dataset, { partId, staffId, measureId, voiceId, eventId })
      target.scrollIntoView = vi.fn()
      target.getBoundingClientRect = () => new DOMRect(400, 700, 24, 24)
      preview.append(target)
      document.querySelector('.studio-status')!.getBoundingClientRect = () => new DOMRect(0, 650, 960, 100)
      const toggle = screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' })
      toggle.focus()
      fireEvent.click(toggle)
      frames.clear()
      fireEvent.keyDown(toggle, disposition === 'current-rest' ? { key: 'r', code: 'KeyR' } : { key: 'c', code: 'KeyC' })
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      let cursor: HTMLElement | undefined
      if (disposition === 'current-cursor') {
        const inputMeasure = preview.getAttribute('data-input-measure-id')!
        const owner = preview.getAttribute('data-all-event-pitches')!.split(',').find(value => value.split(':')[2] === inputMeasure)!.split(':')
        cursor = document.createElement('div')
        cursor.className = 'notation-note-input-cursor'
        Object.assign(cursor.dataset, {partId: owner[0], staffId: owner[1], measureId: inputMeasure, voiceId: owner[3], tick: preview.getAttribute('data-input-tick')})
        cursor.scrollIntoView = vi.fn()
        cursor.getBoundingClientRect = () => new DOMRect(400, 900, 8, 56)
        const otherStaff = cursor.cloneNode() as HTMLElement
        otherStaff.dataset.staffId = 'different-staff'
        otherStaff.scrollIntoView = vi.fn()
        preview.append(otherStaff, cursor)
      }
      if (disposition === 'manual-wheel-after-entry') fireEvent.wheel(screen.getByLabelText('악보 캔버스'), {deltaY:300})
      if (disposition === 'focus-moved') screen.getByRole('button', { name: '악보로 이동' }).focus()
      if (disposition === 'selection-moved') fireEvent.click(screen.getByRole('button', { name: `${entries[0].split(':')[4]} 선택` }))
      if (disposition === 'undo') fireEvent.keyDown(toggle, { key: 'z', code: 'KeyZ', ctrlKey: true })
      if (disposition === 'unmount') view.unmount()
      const queued = [...frames.values()]
      frames.clear()
      act(() => queued.forEach(callback => callback(0)))
      expect(target.scrollIntoView).toHaveBeenCalledTimes(disposition.startsWith('current') && !cursor ? 1 : 0)
      if (cursor) {
        expect(cursor.scrollIntoView).toHaveBeenCalledOnce()
        expect((cursor.previousElementSibling as HTMLElement).scrollIntoView).not.toHaveBeenCalled()
      }
      expect(scroll).toHaveBeenCalledTimes(disposition.startsWith('current') ? 1 : 0)
      if (disposition.startsWith('current')) {
        expect(toggle).toHaveFocus()
        expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
        fireEvent.keyDown(toggle, { key: 'z', code: 'KeyZ', ctrlKey: true })
        expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      }
    } finally { cleanup();request.mockRestore();cancel.mockRestore();scroll.mockRestore() }
  })

  it.each(['current','focus-moved','unmount','manual-wheel','manual-key','dock-wheel'] as const)('studio.input-resize reveals the live input position without stealing newer focus: %s', async disposition => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const frames = new Map<number, FrameRequestCallback>()
    let frameId = 0
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {frames.set(++frameId, callback);return frameId})
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {frames.delete(id)})
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    try {
      const {App} = await import('./App')
      const view = render(<App />), preview = screen.getByTestId('notation-preview')
      fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
      const measureId = preview.getAttribute('data-input-measure-id')!
      const owner = preview.getAttribute('data-all-event-pitches')!.split(',').find(value=>value.split(':')[2]===measureId)!.split(':')
      const cursor = document.createElement('div')
      cursor.className = 'notation-note-input-cursor'
      Object.assign(cursor.dataset,{partId:owner[0],staffId:owner[1],measureId,voiceId:owner[3],tick:preview.getAttribute('data-input-tick')})
      cursor.scrollIntoView = vi.fn()
      cursor.getBoundingClientRect = () => new DOMRect(400,900,8,56)
      preview.append(cursor)
      document.querySelector('.studio-status')!.getBoundingClientRect = () => new DOMRect(0,650,960,100)
      const canvas = screen.getByLabelText('악보 캔버스');canvas.focus();frames.clear()
      if(disposition==='manual-wheel')fireEvent.wheel(canvas,{deltaY:300})
      if(disposition==='manual-key')fireEvent.keyDown(canvas,{key:'PageUp'})
      if(disposition==='dock-wheel'){
        const dock=document.querySelector('.studio-palette-dock') as HTMLElement
        Object.defineProperties(dock,{clientHeight:{value:100},scrollHeight:{value:400}});dock.style.overflowY='auto'
        fireEvent.wheel(dock,{deltaY:300})
      }
      fireEvent(window,new Event('resize'))
      if(disposition==='focus-moved')screen.getByRole('button',{name:'악보로 이동'}).focus()
      if(disposition==='unmount')view.unmount()
      const queued=[...frames.values()];frames.clear();act(()=>queued.forEach(callback=>callback(0)))
      expect(cursor.scrollIntoView).toHaveBeenCalledTimes(disposition==='current'||disposition==='dock-wheel'?1:0)
      if(disposition==='current'){expect(canvas).toHaveFocus();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')}
      if(disposition==='manual-wheel'||disposition==='manual-key'){
        fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));expect(canvas).toHaveFocus();expect(cursor.scrollIntoView).toHaveBeenCalledOnce()
        frames.clear();fireEvent(window,new Event('resize'));const resumed=[...frames.values()];frames.clear();act(()=>resumed.forEach(callback=>callback(0)))
        expect(cursor.scrollIntoView).toHaveBeenCalledTimes(2);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      }
    } finally {cleanup();request.mockRestore();cancel.mockRestore();scroll.mockRestore()}
  })

  it('studio.r3 F6 anchors a pending tuplet without making preview notes editable', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const rest = preview.getAttribute('data-all-event-pitches')!.split(',').filter(value=>value.endsWith(':rest')).at(-1)!.split(':')[4]
    fireEvent.click(screen.getByRole('button',{name:`${rest} 선택`}))
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}))
    fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
    const nodes = preview.getAttribute('data-all-event-pitches')!.split(',').filter(value=>value.includes(':preview-')).map(value=>{
      const [partId,staffId,measureId,voiceId,eventId] = value.split(':')
      const node = document.createElement('div')
      node.className = 'notation-event is-preview'
      Object.assign(node.dataset,{partId,staffId,measureId,voiceId,eventId})
      node.scrollIntoView = vi.fn()
      preview.append(node)
      return node
    })
    // Three tuplet members plus the remaining rest in this half-rest fixture.
    expect(nodes).toHaveLength(4)
    screen.getByLabelText('악보 캔버스').scrollIntoView = vi.fn()
    fireEvent.keyDown(screen.getByRole('button',{name:'악보로 이동'}),{key:'F6',code:'F6'})
    expect(screen.getByLabelText('악보 캔버스')).toHaveFocus()
    expect(nodes[1].scrollIntoView).toHaveBeenCalledOnce()
    expect(nodes[1]).not.toHaveAttribute('tabindex')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  })

  it.each(['range', 'measure'] as const)('studio.r3 F6 returns to the active %s target rather than the first SVG event', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const entries = preview.getAttribute('data-all-event-pitches')!.split(',').map(value => {
      const [partId, staffId, measureId, voiceId, eventId] = value.split(':')
      return { partId, staffId, measureId, voiceId, eventId }
    })
    const first = entries[0]
    const last = kind === 'range' ? entries.filter(entry => entry.measureId === first.measureId).at(-1)! : entries.at(-1)!
    if (kind === 'range') {
      fireEvent.click(screen.getByRole('button', { name: `${first.eventId} 선택` }))
      fireEvent.click(screen.getByRole('button', { name: `${last.eventId} 선택` }), { shiftKey: true })
      expect(preview).toHaveAttribute('data-selected-event-id', last.eventId)
    } else {
      fireEvent.click(screen.getByRole('button', { name: '8마디 선택' }))
      expect(preview).toHaveAttribute('data-selected-measure-id', last.measureId)
    }
    // The mocked renderer does not draw SVG. Supply only the real renderer's focus semantics.
    const nodes = entries.map(entry => {
      const node = document.createElement('button')
      node.className = `notation-event${kind === 'range' ? ' is-selected' : ''}`
      Object.assign(node.dataset, entry)
      node.tabIndex = 0
      node.scrollIntoView = vi.fn()
      preview.append(node)
      return node
    })
    const before = preview.getAttribute('data-event-pitches')
    fireEvent.keyDown(screen.getByRole('button', { name: '악보로 이동' }), { key: 'F6', code: 'F6' })
    const expected = kind === 'range' ? nodes.find(node => node.dataset.eventId === last.eventId)! : nodes.find(node => node.dataset.measureId === last.measureId)!
    expect(expected).toHaveFocus()
    expect(expected.scrollIntoView).toHaveBeenCalledOnce()
    expect(preview).toHaveAttribute('data-event-pitches', before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(screen.getByRole('region', { name: '다음 입력' })).toHaveAttribute('data-input-active', 'false')
  })

  it.each(['score','part'] as const)('studio.span-application-scope identifies the shared edit contract in %s view without creating commands', async mode => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    chooseScoreView('악보 보기',mode)
    const source=structuredClone(playbackMockState.lastScore!)
    openSpanFinder()
    const panel=()=>screen.getByRole('region',{name:'범위 표기 속성'})
    expect(within(panel()).queryByText('총보·해당 파트보 공통')).not.toBeInTheDocument()
    const span=listSpans(source).find(span=>span.kind==='slur')!
    chooseSpanReference(`${span.kind}:${span.id}`)
    expect(within(panel()).getByText('적용 범위')).toBeVisible()
    const scope=within(panel()).getByText('총보·해당 파트보 공통')
    expect(scope).toBeVisible()
    expect(scope).toHaveClass('dd-text')
    expect(scope.closest('button,input,[role="combobox"]')).toBeNull()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it('studio.input-position describes the input anchor in musical units without editing or moving a pending tuplet', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const rest = preview.getAttribute('data-all-event-pitches')!.split(',').filter(value => value.endsWith(':rest')).at(-1)!.split(':')[4]
    const before = preview.getAttribute('data-all-event-pitches')
    const source = structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button', { name: `${rest} 선택` }))
    const status = document.querySelector('.editor-status')!
    expect(status).not.toHaveTextContent('묶음 시작')
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    expect(status).toHaveTextContent('8마디 · 3박 (4분음표 기준)')
    expect(status).not.toHaveTextContent(/틱|tick|M8/)
    fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    expect(status).toHaveTextContent('8마디 · 묶음 시작 3박 (4분음표 기준)')
    expect(status).toHaveTextContent('셋잇단음표 1/3')
    expect(status).toHaveTextContent('0회 수정')
    // The preview intentionally renders the draft; the committed score stays intact.
    expect(preview.getAttribute('data-all-event-pitches')).toContain('preview-tuplet-')
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(status).not.toHaveTextContent('묶음 시작')
    expect(preview).toHaveAttribute('data-all-event-pitches', before)
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each(['event','tuplet'] as const)('studio.file-workspace-navigation F6 returns from a file button to %s without commands, while filters and IME keep ownership', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    let target: HTMLElement
    if (kind === 'tuplet') {
      const rest = preview.getAttribute('data-all-event-pitches')!.split(',').filter(value => value.endsWith(':rest')).at(-1)!.split(':')[4]
      fireEvent.click(screen.getByRole('button', { name: `${rest} 선택` }))
      fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
      fireEvent.click(screen.getByRole('button', { name: /셋잇단음표 적용 또는 입력 준비/ }))
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
      target = screen.getByLabelText('악보 캔버스')
    } else {
      // Supply the renderer's real focus semantics in this mocked SVG test.
      target = document.createElement('button')
      target.className = 'notation-event is-selected'
      preview.append(target)
    }
    target.scrollIntoView = vi.fn()
    const before = preview.getAttribute('data-all-event-pitches')
    openStudioWorkspace('파일')
    const save = screen.getByRole('button', { name: '프로젝트 저장' })
    save.focus()
    for (const guard of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      fireEvent.keyDown(save, { key: 'F6', code: 'F6', ...guard })
      expect(save).toHaveFocus()
    }
    fireEvent.keyDown(save, { key: 'F6', code: 'F6' })
    expect(target).toHaveFocus()
    expect(preview).toHaveAttribute('data-all-event-pitches', before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    if (kind === 'tuplet') expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
    expect(window.inC.project.save).not.toHaveBeenCalled()

    const filter = screen.getByRole('combobox', { name: '선택 필터' })
    filter.focus()
    fireEvent.keyDown(filter, { key: 'F6', code: 'F6' })
    expect(filter).toHaveFocus()
    fireEvent.click(filter)
    expect(filter).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(filter, { key: 'F6', code: 'F6' })
    expect(filter).toHaveFocus()
    expect(filter).toHaveAttribute('aria-expanded', 'true')
    expect(preview).toHaveAttribute('data-all-event-pitches', before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.status-view F6 returns from lower view controls without stealing open choices or IME', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const before = preview.getAttribute('data-event-pitches')
    // Supply real renderer focus semantics only; no product compatibility controls.
    const selected = document.createElement('button')
    selected.className = 'notation-event is-selected'
    selected.scrollIntoView = vi.fn()
    preview.append(selected)
    const lower = screen.getByRole('region', {name:'악보 상태 및 보기'})
    const fixed = within(lower).getByRole('radio', {name:'고정 배율'})
    fixed.focus()
    fireEvent.keyDown(fixed, {key:'F6', code:'F6'})
    expect(selected).toHaveFocus()
    fireEvent.click(fixed)
    const zoom = within(lower).getByRole('combobox', {name:'고정 확대율'})
    zoom.focus()
    for (const guard of [{isComposing:true}, {keyCode:229}, {ctrlKey:true}, {altKey:true}, {metaKey:true}]) {
      fireEvent.keyDown(zoom, {key:'F6', code:'F6', ...guard})
      expect(zoom).toHaveFocus()
    }
    fireEvent.keyDown(zoom, {key:'F6', code:'F6'})
    expect(selected).toHaveFocus()
    zoom.focus()
    fireEvent.click(zoom)
    expect(zoom).toHaveAttribute('aria-expanded','true')
    fireEvent.keyDown(zoom, {key:'F6', code:'F6'})
    expect(zoom).toHaveFocus()
    expect(zoom).toHaveAttribute('aria-expanded','true')
    fireEvent.keyDown(zoom, {key:'Escape', code:'Escape'})
    expect(zoom).toHaveAttribute('aria-expanded','false')
    fireEvent.keyDown(zoom, {key:'F6', code:'F6'})
    expect(selected).toHaveFocus()
    expect(preview).toHaveAttribute('data-event-pitches',before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(screen.getByRole('region', {name:'다음 입력'})).toHaveAttribute('data-input-active','false')
  })

  it('studio.r3 score navigation focuses the selected object without changing input or history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const before = preview.getAttribute('data-event-durations')
    const navigation = screen.getByRole('button', { name: '악보로 이동' })
    const scrollTools = vi.fn()
    navigation.scrollIntoView = scrollTools
    playbackMockState.play.mockClear()
    fireEvent.keyDown(navigation, { key: ' ', code: 'Space' })
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    // jsdom's notation fixture supplies semantics, not browser scroll geometry.
    const event = document.createElement('button')
    event.className = 'notation-event is-selected'
    const scroll = vi.fn()
    event.scrollIntoView = scroll
    preview.append(event)
    fireEvent.click(navigation)
    expect(event).toHaveFocus()
    expect(scroll).toHaveBeenCalledTimes(1)
    expect(preview).toHaveAttribute('data-event-durations', before)
    expect(screen.getByRole('region', { name: '다음 입력' })).toHaveAttribute('data-input-active', 'false')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    const span = document.createElement('button')
    span.className = 'notation-span-target is-selected'
    span.scrollIntoView = scroll
    preview.append(span)
    fireEvent.click(screen.getByRole('button', { name: '악보로 이동' }))
    expect(span).toHaveFocus()
    expect(scroll).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(span, { key: 'F6', code: 'F6' })
    expect(navigation).toHaveFocus()
    expect(scrollTools).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(navigation, { key: 'F6', code: 'F6' })
    expect(span).toHaveFocus()
    expect(scroll).toHaveBeenCalledTimes(3)
    fireEvent.keyDown(span, { key: 'F6', code: 'F6', isComposing: true })
    expect(span).toHaveFocus()
    fireEvent.keyDown(span, { key: 'F6', code: 'F6', ctrlKey: true })
    expect(span).toHaveFocus()
    span.remove()
    event.classList.remove('is-selected')
    event.setAttribute('tabindex', '0')
    fireEvent.click(navigation)
    expect(event).toHaveFocus()
    event.remove()
    const canvas = screen.getByLabelText('악보 캔버스')
    canvas.scrollIntoView = scroll
    fireEvent.click(navigation)
    expect(canvas).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.r3 selected-properties menu replaces the retired note disclosure and reopens the existing dock without edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    localStorage.setItem('chromatics.note-details.v1','true')
    const { App } = await import('./App')
    const app=render(<App />)
    const before=structuredClone(playbackMockState.lastScore)
    expect(document.querySelector('.studio-note-details')).toBeNull()
    expect(screen.getByRole('status',{name:'입력 보표'})).toHaveTextContent('Melody')
    expect(screen.getByRole('button',{name:'8분음표, 단축키 4'})).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}))
    expect(screen.getByRole('button',{name:'속성 표시'})).toHaveAttribute('aria-pressed','false')
    openStudioWorkspace('음표')
    expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
    expect(screen.getByRole('button',{name:'속성 표시'})).toHaveAttribute('aria-pressed','true')
    await waitFor(()=>expect(screen.getByRole('button',{name:'페르마타'})).toHaveFocus())
    expect(playbackMockState.lastScore).toEqual(before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(localStorage.getItem('chromatics.note-details.v1')).toBe('true')
    app.unmount();render(<App />)
    expect(document.querySelector('.studio-note-details')).toBeNull()
    expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
  })

  it('studio.view-menu mirrors actual workspace visibility with stable checked commands', async () => {
    const media=installCompactDockMedia()
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
      const {App}=await import('./App');render(<App/>)
      const source=structuredClone(playbackMockState.lastScore),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
      const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
      const open=()=>fireEvent.click(nav.getByRole('button',{name:'보기'}))
      const item=(name:string)=>nav.getByRole('menuitemcheckbox',{name})
      open();expect(item('팔레트')).toBeChecked();expect(item('속성')).not.toBeChecked()
      expect(item('팔레트').querySelector('[data-menu-check] svg')).not.toBeNull()
      expect(item('속성').querySelector('[data-menu-check] svg')).toBeNull()
      expect(item('팔레트')).not.toHaveAttribute('aria-pressed')
      fireEvent.click(item('속성'));expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
      open();expect(item('속성')).toBeChecked();expect(item('팔레트')).not.toBeChecked()
      fireEvent.click(item('속성'));expect(screen.getByLabelText('속성 도크')).not.toBeVisible()
      fireEvent.click(screen.getByRole('button',{name:'속성 표시'}))
      open();expect(item('속성')).toBeChecked();expect(item('믹서')).not.toBeChecked()
      fireEvent.click(item('믹서'));expect(screen.getByRole('region',{name:'파트 믹서'})).toBeVisible()
      open();expect(item('믹서')).toBeChecked();expect(item('페이지 여백 가이드')).not.toBeChecked()
      fireEvent.click(item('페이지 여백 가이드'));expect(document.querySelector('.score-page')).toHaveAttribute('data-show-page-margins','true')
      open();expect(item('페이지 여백 가이드')).toBeChecked();fireEvent.keyDown(item('팔레트'),{key:'Escape'})
      expect(nav.getByRole('button',{name:'보기'})).toHaveFocus()
      expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360})
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected!)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    } finally {cleanup();media.restore()}
  })

  it('studio.view-menu includes checked items in the real menu keyboard order', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'})),trigger=nav.getByRole('button',{name:'보기'})
    trigger.focus();fireEvent.keyDown(trigger,{key:'ArrowDown'})
    const palette=nav.getByRole('menuitemcheckbox',{name:'팔레트'}),properties=nav.getByRole('menuitemcheckbox',{name:'속성'})
    expect(palette).toHaveFocus()
    const checked=palette.getAttribute('aria-checked')
    expect(fireEvent.keyDown(palette,{key:'Enter',isComposing:true})).toBe(false)
    expect(palette).toHaveFocus();expect(palette).toHaveAttribute('aria-checked',checked!)
    fireEvent.keyDown(palette,{key:'ArrowDown'});expect(properties).toHaveFocus()
    fireEvent.keyDown(properties,{key:'End'});expect(nav.getByRole('menuitem',{name:'악보로 이동'})).toHaveFocus()
    fireEvent.keyDown(document.activeElement!,{key:'Home'});expect(palette).toHaveFocus()
    fireEvent.keyDown(palette,{key:'믹'});expect(nav.getByRole('menuitemcheckbox',{name:'믹서'})).toHaveFocus()
    fireEvent.keyDown(document.activeElement!,{key:'ArrowRight'});expect(nav.getByRole('menuitem',{name:'표기 팔레트 열기'})).toHaveFocus()
    fireEvent.keyDown(document.activeElement!,{key:'ArrowLeft'});expect(palette).toHaveFocus()
    fireEvent.keyDown(palette,{key:'Escape'});expect(trigger).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.application-menu replaces category navigation with actual global commands and workspace entries', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    expect(screen.queryByRole('navigation',{name:'편집 도구 카테고리'})).not.toBeInTheDocument()
    const menu=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
    expect(menu.getByRole('button',{name:'파일'})).toHaveClass('dd-button--quiet')
    fireEvent.click(menu.getByRole('button',{name:'파일'}))
    expect(menu.getByRole('menuitem',{name:'프로젝트 저장'})).toBeEnabled()
    expect(menu.getByRole('menuitem',{name:'프로젝트 저장'})).toHaveClass('dd-button','dd-button--quiet')
    fireEvent.click(menu.getByRole('menuitem',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    fireEvent.click(menu.getByRole('button',{name:'편집'}))
    expect(menu.getByRole('menuitem',{name:'실행 취소'})).toBeDisabled()
    expect(menu.getByRole('menuitem',{name:'실행 취소'})).toHaveClass('dd-button','dd-button--quiet')
    fireEvent.keyDown(menu.getByRole('menuitem',{name:'선택 범위 복사'}),{key:'Home'})
    expect(menu.getByRole('menuitem',{name:'선택 범위 복사'})).toHaveFocus()
    fireEvent.keyDown(document.activeElement!,{key:'Escape'})
    expect(menu.getByRole('button',{name:'편집'})).toHaveFocus()
    fireEvent.click(menu.getByRole('button',{name:'추가'}))
    fireEvent.click(menu.getByRole('menuitem',{name:'표기 팔레트 열기'}))
    await waitFor(()=>expect(screen.getByRole('searchbox',{name:'표기 기호 검색'})).toHaveFocus())
    expect(document.querySelector('.studio-notation-tools')).not.toBeVisible()
    openNotationSettings('range')
    expect(screen.getByRole('region',{name:'표기 객체'})).toBeVisible()
    fireEvent.click(menu.getByRole('button',{name:'형식'}))
    fireEvent.click(menu.getByRole('menuitem',{name:'악보 설정'}))
    expect(screen.getByRole('region',{name:'악보 편집'})).toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each(['toolbar','view','tools'] as const)('studio.mixer-entry focuses the public volume from %s without changing notation or history', async entry => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const toggle=screen.getByRole('button',{name:'믹서 표시'})
    if(entry==='toolbar'){toggle.focus();fireEvent.click(toggle)}
    else {
      const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
      const menu=nav.getByRole('button',{name:entry==='view'?'보기':'도구'});menu.focus();fireEvent.click(menu)
      const command=nav.getByRole(entry==='view'?'menuitemcheckbox':'menuitem',{name:entry==='view'?'믹서':'재생 도구'})
      command.focus();fireEvent.click(command)
    }
    const volume=screen.getByRole('slider',{name:/Melody 볼륨/})
    await waitFor(()=>expect(volume).toHaveFocus())
    expect(toggle).toHaveAttribute('aria-expanded','true')
    fireEvent.change(volume,{target:{value:'75'}})
    expect(JSON.parse(localStorage.getItem('chromatics.part-mixer.v1')!)['part-1'].volume).toBe(.75)
    toggle.focus();fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded','false')
    expect(document.getElementById('studio-part-mixer')).not.toBeVisible()
    expect(toggle).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each(['checkbox-below','range-label-above'] as const)('studio.mixer-label-viewport reveals the associated public label and target: %s', async edge => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const toggle=screen.getByRole('button',{name:'믹서 표시'})
    fireEvent.click(toggle)
    const volume=screen.getByRole('slider',{name:/Melody 볼륨/})
    await waitFor(()=>expect(volume).toHaveFocus())
    toggle.focus()
    const field=(edge==='checkbox-below'?screen.getByRole('checkbox',{name:'Melody 음소거'}):volume) as HTMLInputElement
    const label=field.labels![0]
    let offset=0
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation((xOrOptions?:number|ScrollToOptions,y?:number)=>{offset+=typeof xOrOptions==='object'?(xOrOptions.top??0):(y??0)})
    const inputBounds=vi.spyOn(field,'getBoundingClientRect').mockImplementation(()=>
      edge==='checkbox-below'?new DOMRect(30,568-offset,20,20):new DOMRect(30,12-offset,220,48))
    const labelBounds=vi.spyOn(label,'getBoundingClientRect').mockImplementation(()=>
      edge==='checkbox-below'?new DOMRect(30,554-offset,120,48):new DOMRect(30,-26-offset,220,32))
    const footerBounds=vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,600,960,100))
    field.style.outline='2px solid blue';field.style.outlineOffset='2px';field.scrollIntoView=vi.fn()
    try {
      act(()=>field.focus())
      await waitFor(()=>{
        const target=field.getBoundingClientRect(),owner=label.getBoundingClientRect()
        expect(Math.min(target.top,owner.top)-4).toBeGreaterThanOrEqual(0)
        expect(Math.max(target.bottom,owner.bottom)+4).toBeLessThanOrEqual(600)
      })
      expect(field).toHaveFocus();expect(scroll).toHaveBeenCalled()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } finally {scroll.mockRestore();inputBounds.mockRestore();labelBounds.mockRestore();footerBounds.mockRestore()}
  })

  it.each(['checkbox','range'] as const)('studio.mixer-navigation uses F6 from the live %s while preserving IME, modifiers and score ownership', async type => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    // The mocked preview emits editor callbacks, but does not draw focusable
    // SVG events. Supply the existing renderer focus contract, as in R3 F6 QA.
    const preview=screen.getByTestId('notation-preview')
    const entry=preview.getAttribute('data-all-event-pitches')!.split(',').find(value=>value.split(':')[4]===selected)!
    const [partId,staffId,measureId,voiceId,eventId]=entry.split(':')
    const target=document.createElement('button')
    target.className='notation-event is-selected';target.tabIndex=0
    Object.assign(target.dataset,{partId,staffId,measureId,voiceId,eventId})
    target.scrollIntoView=vi.fn();preview.append(target)
    const navigation=screen.getByRole('button',{name:'악보로 이동'})
    navigation.scrollIntoView=vi.fn()
    fireEvent.click(screen.getByRole('button',{name:'믹서 표시'}))
    const volume=screen.getByRole('slider',{name:/Melody 볼륨/})
    await waitFor(()=>expect(volume).toHaveFocus())
    const field=(type==='checkbox'?screen.getByRole('checkbox',{name:'Melody 음소거'}):volume) as HTMLInputElement
    field.focus()
    for(const guard of [{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true},{altKey:true}]){
      fireEvent.keyDown(field,{key:'F6',code:'F6',...guard})
      expect(field).toHaveFocus()
    }
    fireEvent.keyDown(field,{key:'F6',code:'F6'})
    await waitFor(()=>expect(document.activeElement).toHaveAttribute('data-event-id',selected))
    fireEvent.keyDown(document.activeElement!,{key:'F6',code:'F6'})
    expect(navigation).toHaveFocus()
    expect(navigation.scrollIntoView).toHaveBeenCalledOnce()
    fireEvent.keyDown(navigation,{key:'F6',code:'F6'})
    await waitFor(()=>expect(document.activeElement).toHaveAttribute('data-event-id',selected))
    expect(screen.getByRole('button',{name:'믹서 표시'})).toHaveAttribute('aria-expanded','true')
    expect(volume).toHaveValue('100')
    expect(screen.getByRole('checkbox',{name:'Melody 음소거'})).not.toBeChecked()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.mixer-entry cancels a pending field focus when the mixer is immediately closed', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const toggle=screen.getByRole('button',{name:'믹서 표시'});toggle.focus()
    fireEvent.click(toggle);fireEvent.click(toggle)
    await act(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())))
    expect(toggle).toHaveFocus()
    expect(toggle).toHaveAttribute('aria-expanded','false')
    expect(document.getElementById('studio-part-mixer')).not.toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each([['파일','내보내기 설정'],['형식','PDF 페이지 설정']])('studio.pdf-entry-focus moves %s / %s to the live public preset without editing the score', async (menuName, command) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
    const trigger=nav.getByRole('button',{name:menuName});trigger.focus();fireEvent.click(trigger)
    const item=nav.getByRole('menuitem',{name:command});item.focus();fireEvent.click(item)
    const preset=screen.getByRole('combobox',{name:'PDF 설정 프리셋'})
    await waitFor(()=>expect(preset).toHaveFocus())
    expect(preset).toBeEnabled()
    fireEvent.keyDown(preset,{key:'ArrowDown',code:'ArrowDown'})
    expect(screen.getByRole('listbox',{name:'PDF 설정 프리셋'})).toBeVisible()
    fireEvent.keyDown(preset,{key:'Escape',code:'Escape'})
    expect(preset).toHaveFocus()
    expect(preset).toHaveAttribute('aria-expanded','false')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it('studio.system-toolbar disables note mutations for a selected span until note entry resumes', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('표기 객체')
    chooseSpanReference(`hairpin:${source!.hairpins![0].id}`)
    const toolbar=within(screen.getByRole('region',{name:'음표 입력 도구'}))
    const duration=toolbar.getByRole('button',{name:'8분음표, 단축키 4'})
    expect(duration).toBeDisabled()
    expect(toolbar.getByRole('button',{name:'점 추가'})).toBeDisabled()
    expect(toolbar.getByRole('button',{name:'샤프'})).toBeDisabled()
    expect(toolbar.getByRole('button',{name:'쉼표로 변환'})).toBeDisabled()
    expect(toolbar.queryByRole('combobox',{name:'입력 보표'})).toBeNull()
    expect(toolbar.getByRole('status',{name:'입력 보표'})).toHaveTextContent('Melody')
    expect(toolbar.getByRole('button',{name:'2성부'})).toBeDisabled()
    expect(toolbar.getByRole('button',{name:/셋잇단음표 적용/})).toBeDisabled()
    fireEvent.click(duration)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(toolbar.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    expect(duration).toBeEnabled()
    expect(toolbar.getAllByText('다음 입력').length).toBeGreaterThan(0)
    fireEvent.click(duration)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.input-accidentals uses one shared SMuFL group for selection commands and next-input settings', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const toolbar=screen.getByRole('region',{name:'음표 입력 도구'})
    const group=within(toolbar).getByRole('group',{name:'임시표'})
    const sharp=within(group).getByRole('button',{name:'샤프'})
    expect(sharp).toHaveClass('dd-icon-button')
    expect(sharp.querySelector('[data-music-glyph="sharp"]')).not.toBeNull()
    expect(screen.getAllByRole('button',{name:'샤프'})).toHaveLength(1)
    fireEvent.click(sharp)
    expect(sharp).toHaveAttribute('aria-pressed','true')
    expect(playbackMockState.lastScore).not.toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',metaKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(within(toolbar).getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    const flat=within(group).getByRole('button',{name:'플랫'})
    playbackMockState.play.mockClear()
    fireEvent.keyDown(flat,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(flat)
    expect(flat).toHaveAttribute('aria-pressed','true')
    expect(within(toolbar).getByLabelText('다음 입력 설정')).toHaveTextContent('플랫')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.harmony-properties opens the single live chord editor and preserves invalid draft escape undo and selection ownership', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}));openStudioWorkspace('가사')
    const entry=screen.getByRole('region',{name:'코드 심벌 속성'})
    expect(entry.closest('.studio-chrome')).toBeNull()
    expect(within(entry).queryByRole('textbox')).toBeNull()
    expect(within(entry).getByLabelText('코드 심벌 적용 위치')).not.toHaveTextContent('tick')
    fireEvent.click(within(entry).getByRole('button',{name:'코드 심벌 편집'}))
    const input=await screen.findByRole('textbox',{name:'선택 요약 코드'})
    await waitFor(()=>expect(input).toHaveFocus())
    expect(screen.getAllByRole('textbox',{name:'선택 요약 코드'})).toHaveLength(1)
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.change(input,{target:{value:'H13'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    expect(screen.getByText(/지원하는 코드 심벌 형식/)).toBeVisible();expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.change(input,{target:{value:'C7/G'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    const edited=structuredClone(playbackMockState.lastScore)
    expect(edited!.harmonies).toEqual(expect.arrayContaining([expect.objectContaining({measureId:'measure-1',tick:0,text:'C7/G'})]))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.change(input,{target:{value:'Dm7'}});fireEvent.keyDown(input,{key:'Escape'});fireEvent.blur(input);expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'Am7'}});fireEvent.keyDown(input,{key:'Enter',keyCode:229});fireEvent.blur(input)
    expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(screen.getByRole('button',{name:'m1-d4 선택'}));fireEvent.compositionEnd(input);fireEvent.blur(input)
    expect(screen.getByRole('textbox',{name:'선택 요약 코드'})).toHaveValue('')
    expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
  })

  it.each(['menu','palette','button'] as const)('studio.lyric-entry %s focuses the actual inline text without a lyric mutation', async entry => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    if(entry==='palette') {
      const header=screen.getByRole('button',{name:'텍스트'})
      if(header.getAttribute('aria-expanded')==='false') fireEvent.click(header)
      fireEvent.click(screen.getByRole('button',{name:'가사·코드 편집 열기'}))
    } else {
      openStudioWorkspace('가사')
      if(entry==='button') fireEvent.click(screen.getByRole('button',{name:'가사 글자 입력'}))
    }
    const input=await screen.findByRole('textbox',{name:'선택 음표 가사'})
    await waitFor(()=>expect(input).toHaveFocus())
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByRole('checkbox',{name:'멜리스마'})).not.toBeChecked()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.change(input,{target:{value:'가사'}});fireEvent.blur(input)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'m3-half-rest 선택'}));openStudioWorkspace('가사')
    await waitFor(()=>expect(screen.getByRole('region',{name:'가사 속성'})).toHaveFocus())
    expect(screen.queryByRole('textbox',{name:'선택 음표 가사'})).toBeNull()
    expect(screen.queryByRole('button',{name:'가사 글자 입력'})).toBeNull()
    expect(playbackMockState.lastScore).toEqual(source)
  })

  it.each([
    {lyrics:[{text:'원문 하나'},{text:'원문 둘'}]},
    {lyrics:[{number:1,text:'원문 하나'},{text:'원문 둘'}]},
    {lyrics:[{number:2,text:'원문 하나'},{number:2,text:'원문 둘'}]}
  ])('studio.lyric-ambiguity preserves duplicate verse payload and keeps safe neighboring edits undoable: %j', async ({lyrics}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const project=createNativeProject(structuredClone(demoScore));project.score.title='중복 절 가사 보호'
    const bar=project.score.parts[0].staves[0].measures[0]
    const notes=bar.voices[0].events.filter(e=>e.type==='note')
    notes[0].lyrics=lyrics;notes[1].lyrics=[{number:1,text:'이웃 원문'}]
    if(process.env.DDIRORI_AMBIGUOUS_LYRIC_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path')
      const {serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi')
      const dir=join(process.env.DDIRORI_AMBIGUOUS_LYRIC_QA_DIR,lyrics.map(l=>l.number??'none').join('-'));mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project))
      writeFileSync(join(dir,'source.musicxml'),serializeMusicXml(project.score));writeFileSync(join(dir,'source.mid'),serializeMidi(project.score))
    }
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/ambiguous.chromatics',fileName:'ambiguous.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/ambiguous.chromatics',fileName:'ambiguous.chromatics'})
    const { App }=await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText('중복 절 가사 보호')
    fireEvent.click(screen.getByRole('button',{name:`${notes[0].id} 선택`}));openStudioWorkspace('가사')
    const unsafeField=screen.queryByRole('textbox',{name:'선택 음표 가사'})
    if(unsafeField){fireEvent.change(unsafeField,{target:{value:'잘못된 교체'}});fireEvent.blur(unsafeField)}
    expect(playbackMockState.lastScore).toEqual(project.score)
    expect(screen.queryByRole('textbox',{name:'선택 음표 가사'})).toBeNull()
    const tools=screen.getByRole('region',{name:'가사 속성'})
    expect(within(tools).getByRole('status')).toHaveTextContent('절 번호가 중복된 가사는 현재 편집할 수 없습니다.')
    expect(within(tools).getByRole('button',{name:'가사 글자 입력'})).toBeDisabled()
    expect(within(tools).getByRole('combobox',{name:'가사 음절'})).toBeDisabled()
    expect(within(tools).getByRole('checkbox',{name:'멜리스마'})).toBeDisabled()
    expect(playbackMockState.lastScore).toEqual(project.score)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    await waitFor(()=>expect(tools).toHaveFocus())
    fireEvent.keyDown(tools,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:`${notes[1].id} 선택`}));openStudioWorkspace('가사')
    const field=screen.getByRole('textbox',{name:'선택 음표 가사'})
    fireEvent.change(field,{target:{value:'이웃 수정'}});fireEvent.blur(field)
    const edited=structuredClone(playbackMockState.lastScore)
    expect(edited!.parts[0].staves[0].measures[0].voices[0].events[0]).toEqual(notes[0])
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  })

  it('studio.lyric-legacy keeps a unique unnumbered first verse editable without changing its second verse', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const project=createNativeProject(structuredClone(demoScore));project.score.title='정상 절 가사'
    const note=project.score.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.type==='note')!
    note.lyrics=[{text:'첫째 원문'},{number:2,text:'둘째 원문'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/unique.chromatics',fileName:'unique.chromatics',contents:encodeNativeProject(project)})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('정상 절 가사')
    fireEvent.click(screen.getByRole('button',{name:`${note.id} 선택`}));openStudioWorkspace('가사')
    expect(within(screen.getByRole('region',{name:'가사 속성'})).queryByRole('status')).toBeNull()
    const field=screen.getByRole('textbox',{name:'선택 음표 가사'});expect(field).toHaveValue('첫째 원문')
    fireEvent.change(field,{target:{value:'첫째 수정'}});fireEvent.blur(field)
    expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({lyrics:[{number:1,text:'첫째 수정',syllabic:'single'},{number:2,text:'둘째 원문'}]})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
  })

  it('studio.lyric-tools uses public verse syllable and melisma controls with exact undo and no workspace history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('가사')
    const tools=screen.getByRole('region',{name:'가사 속성'})
    expect(tools.closest('.studio-chrome')).toBeNull()
    const verse=within(tools).getByRole('combobox',{name:'가사 절'})
    expect(verse).toHaveClass('dd-select')
    fireEvent.click(verse);fireEvent.click(screen.getByRole('option',{name:'2절'}))
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    const lyric=screen.getByRole('textbox',{name:'선택 음표 가사'})
    fireEvent.change(lyric,{target:{value:'노래'}});fireEvent.blur(lyric)
    const withText=structuredClone(playbackMockState.lastScore)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.click(within(tools).getByRole('combobox',{name:'가사 음절'}));fireEvent.click(screen.getByRole('option',{name:'첫 음절'}))
    fireEvent.click(within(tools).getByRole('checkbox',{name:'멜리스마'}))
    expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({lyrics:[{number:2,text:'노래',syllabic:'begin',extend:true}]})
    expect(document.querySelector('.editor-status')).toHaveTextContent('3회 수정')
    playbackMockState.play.mockClear()
    fireEvent.keyDown(verse,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(screen.getByRole('listbox',{name:'가사 절'})).toBeVisible();fireEvent.keyDown(verse,{key:'Escape'})
    fireEvent.keyDown(verse,{key:'z',ctrlKey:true});fireEvent.keyDown(window,{key:'z',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(withText)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(withText)
    fireEvent.click(screen.getByRole('button',{name:'m3-half-rest 선택'}));openStudioWorkspace('가사')
    expect(screen.getByText('음표를 선택하면 가사 입력 항목이 표시됩니다.')).toBeVisible()
    expect(within(screen.getByRole('region',{name:'가사 속성'})).queryByRole('combobox')).toBeNull()
    expect(playbackMockState.lastScore).toEqual(withText)
  })

  it('studio.notation-properties routes text and dynamics to the live inspector without duplicate native editors', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}));openNotationSettings('clef')
    const tools=screen.getByRole('region',{name:'마디 표기'}),source=structuredClone(playbackMockState.lastScore)
    expect(tools.closest('.studio-chrome')).toBeNull()
    expect(within(tools).queryAllByRole('textbox')).toHaveLength(0)
    fireEvent.click(within(tools).getByRole('button',{name:'텍스트 표기 편집'}))
    const field=await screen.findByRole('textbox',{name:'선택 요약 보표 글자'})
    await waitFor(()=>expect(field).toHaveFocus())
    expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.change(field,{target:{value:'cantabile'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    expect(playbackMockState.lastScore!.staffTexts!.find(text=>text.measureId==='measure-1')!.text).toBe('cantabile')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    openNotationSettings('clef');fireEvent.click(within(screen.getByRole('region',{name:'마디 표기'})).getByRole('button',{name:'셈여림 편집'}))
    await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveFocus())
    expect(playbackMockState.lastScore).toEqual(source);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each(['percussion','tab'] as const)('studio.notation-properties shows current %s honestly and converts only the selected measure', async sign => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createMidiWarningScore } = await import('../../testing/midi-warning-fixture')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const source=createMidiWarningScore(sign);source.parts.reverse()
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'measure-unsupported.chromatics',filePath:'/scores/measure-unsupported.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const { App } = await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('clef')
    const field=screen.getByRole('combobox',{name:'선택 마디 음자리표'}),label=sign==='percussion'?'타악기 표기 (현재)':'TAB 표기 (현재)'
    expect(field).toHaveTextContent(label);fireEvent.click(field)
    expect(screen.getByRole('option',{name:label})).toHaveAttribute('aria-disabled','true')
    fireEvent.click(screen.getByRole('option',{name:'높은음자리표'}))
    const expected=structuredClone(source);expected.parts[0]!.staves[0]!.measures[0]!.clef={sign:'G',line:2}
    expect(playbackMockState.lastScore).toEqual(expected)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(field,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.repeat-tools preserves measure repeat volta commands and commits count drafts once', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('repeat')
    const tools=screen.getByRole('region',{name:'반복과 볼타'}),source=structuredClone(playbackMockState.lastScore)
    expect(tools.closest('.studio-chrome')).toBeNull()
    expect(within(tools).getByRole('button',{name:'도돌이표 시작'})).toHaveClass('dd-button')
    fireEvent.click(within(tools).getByRole('button',{name:'도돌이표 시작'}))
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[0]!.repeat?.start).toBe(true)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    const count=within(tools).getByRole('spinbutton',{name:'반복 횟수'})
    expect(count.closest('.dd-input-row')).not.toBeNull();act(()=>count.focus());fireEvent.change(count,{target:{value:'4'}})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(count,{key:'Escape'});expect(count).toHaveValue(2);expect(playbackMockState.lastScore).toEqual(source)
    act(()=>count.focus());fireEvent.change(count,{target:{value:'3'}});fireEvent.keyDown(count,{key:'Enter'});fireEvent.blur(count)
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[0]!.repeat).toMatchObject({end:true,times:3})
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures.slice(1)).toEqual(source!.parts[0]!.staves[0]!.measures.slice(1))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(within(tools).getByRole('button',{name:'1번 볼타'}));expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[0]!.volta?.number).toBe(1)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })
})

describe('studio.dock-direct-resize',()=>{
 registerAppTestHooks()
 it('resizes the active shared dock, persists per-dock widths and leaves score selection and undo unchanged',async()=>{
  const previous=window.matchMedia
  Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn((media:string)=>({matches:media.includes('761px')||media.includes('1024px'),media,addEventListener:()=>{},removeEventListener:()=>{}}))})
  try{
   window.history.replaceState({},'', '/?fixture=release-test');localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:280}))
   const {App}=await import('./App');const view=render(<App/>),before=structuredClone(playbackMockState.lastScore),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
   const grip=screen.getByRole('separator',{name:'팔레트 도크 폭 조절'});expect(grip).toHaveAttribute('aria-orientation','vertical');expect(grip).toHaveAttribute('aria-controls','studio-palette');grip.focus()
   fireEvent.keyDown(grip,{key:'ArrowRight'});expect(grip).toHaveAttribute('aria-valuenow','223');fireEvent.keyDown(grip,{key:'End'});expect(grip).toHaveAttribute('aria-valuenow','360');fireEvent.keyDown(grip,{key:'Home',isComposing:true});expect(grip).toHaveAttribute('aria-valuenow','360')
   fireEvent.click(within(screen.getByRole('radiogroup',{name:'도크 보기'})).getByRole('radio',{name:'속성'}));const other=screen.getByRole('separator',{name:'속성 도크 폭 조절'});expect(other).toHaveAttribute('aria-valuenow','280');fireEvent.keyDown(other,{key:'ArrowLeft'});expect(other).toHaveAttribute('aria-valuenow','264');const canvas=screen.getByLabelText('악보 캔버스');canvas.scrollIntoView=vi.fn();/* jsdom lacks scrolling;actual Electron verifies exposure. */other.focus();fireEvent.keyDown(other,{key:'F6'});expect(canvas.contains(document.activeElement)).toBe(true);expect(canvas.scrollIntoView).toHaveBeenCalledOnce()
   expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:360,properties:264});expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection!);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
   fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
   view.unmount();render(<App/>);expect(screen.getByRole('separator',{name:'속성 도크 폭 조절'})).toHaveAttribute('aria-valuenow','264')
  }finally{cleanup();Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:previous})}
 })
})

describe('studio.dock-width-reset',()=>{
 registerAppTestHooks()
 it('resets only the named local width and invalid draft, preserving visibility, score, selection and history',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test');localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
  const {App}=await import('./App');const view=render(<App/>),before=structuredClone(playbackMockState.lastScore),selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),visibility=localStorage.getItem('chromatics.dock-visibility.v1')
  fireEvent.click(screen.getByRole('button',{name:'팔레트 도크 설정'}));const reset=screen.getByRole('button',{name:'팔레트 도크 폭을 280px로 재설정'});expect(reset).toBeEnabled();fireEvent.change(screen.getByRole('spinbutton',{name:'팔레트 도크 폭'}),{target:{value:'999'}});reset.focus();fireEvent.click(reset)
  expect(screen.getByRole('spinbutton',{name:'팔레트 도크 폭'})).toHaveFocus();expect(reset).toBeDisabled();expect(screen.getByRole('spinbutton',{name:'팔레트 도크 폭'})).toHaveValue(280);expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:280,properties:360})
  expect(localStorage.getItem('chromatics.dock-visibility.v1')).toBe(visibility);expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selection!);expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음');fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
  view.unmount();render(<App/>);expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:280,properties:360})
 })
})

describe('studio.dock-header-return',()=>{
 registerAppTestHooks()
 it('returns from a settings trigger with F6 while composing and editable fields retain their current focus/draft',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test');localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
  const {App}=await import('./App');render(<App/>);const before=structuredClone(playbackMockState.lastScore),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),canvas=screen.getByLabelText('악보 캔버스');canvas.scrollIntoView=vi.fn()
  const trigger=screen.getByRole('button',{name:'팔레트 도크 설정'});trigger.focus();fireEvent.keyDown(trigger,{key:'F6',isComposing:true});expect(trigger).toHaveFocus();fireEvent.keyDown(trigger,{key:'F6',ctrlKey:true});expect(trigger).toHaveFocus();fireEvent.keyDown(trigger,{key:'F6'});expect(canvas.contains(document.activeElement)).toBe(true);expect(canvas.scrollIntoView).toHaveBeenCalledOnce()
  fireEvent.click(trigger);const field=screen.getByRole('spinbutton',{name:'팔레트 도크 폭'});field.focus();fireEvent.change(field,{target:{value:'999'}});fireEvent.keyDown(field,{key:'F6'});expect(field).toHaveFocus();expect(field).toHaveValue(999)
  const reset=screen.getByRole('button',{name:'팔레트 도크 폭을 280px로 재설정'});reset.focus();fireEvent.keyDown(reset,{key:'F6'});expect(canvas.contains(document.activeElement)).toBe(true);expect(canvas.scrollIntoView).toHaveBeenCalledTimes(2);expect(trigger).toHaveAttribute('aria-expanded','false')
  expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360});expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected!);expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음');expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
 })
  it.each(['summary', 'technical'] as const)('studio.warning-focus keeps the %s control above the sticky status without stale scrolling', async control => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createImportWarningFixture } = await import('../../testing/import-warning-fixture')
    const { xml } = createImportWarningFixture('mixed')
    vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/scores/long-warning.musicxml',fileName:'long-warning.musicxml',contents:xml})
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
    const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'})
    const summary=within(report).getByRole('button',{name:'마디별 경고 상세 3개'})
    if(control==='technical')fireEvent.click(summary)
    const target=control==='summary'?summary:within(report).getAllByRole('button',{name:'기술 정보'}).at(-1)!
    const source=structuredClone(playbackMockState.lastScore),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const frames=new Map<number,FrameRequestCallback>();let frameId=0,offset=0
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++frameId,cb);return frameId})
    const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation((x?:number|ScrollToOptions,y?:number)=>{offset+=typeof x==='object'?(x.top??0):(y??0)})
    const bounds=vi.spyOn(target,'getBoundingClientRect').mockImplementation(()=>new DOMRect(30,728-offset,230,72))
    const footer=vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,480,960,320))
    target.style.outline='2px solid blue';target.style.outlineOffset='2px';target.scrollIntoView=vi.fn()
    const flush=()=>act(()=>{const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(0))})
    try {
      act(()=>target.focus());flush()
      expect(target).toHaveFocus();expect(target.getBoundingClientRect().bottom+4).toBeLessThanOrEqual(480)
      expect(target.getBoundingClientRect().top-4).toBeGreaterThanOrEqual(0);expect(scroll).toHaveBeenCalled()
      expect(target.getAttribute('aria-expanded')).toBe('false')
      // Returning to an already visible target does not create an extra scroll.
      const calls=scroll.mock.calls.length
      act(()=>screen.getByRole('button',{name:'악보로 이동'}).focus());flush();act(()=>target.focus());flush()
      expect(scroll.mock.calls).toHaveLength(calls)
      // A later explicit focus destination owns the view when the frame runs.
      offset=0;act(()=>{target.blur();target.focus();screen.getByRole('button',{name:'악보로 이동'}).focus()});flush()
      expect(scroll.mock.calls).toHaveLength(calls)
      expect(screen.getByRole('button',{name:'악보로 이동'})).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()
    } finally {raf.mockRestore();cancel.mockRestore();scroll.mockRestore();bounds.mockRestore();footer.mockRestore()}
  })

  it.each(['same-file','project','wizard'] as const)('studio.warning-focus-lifetime rejects the previous report frame after %s replacement', async replacement => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createImportWarningFixture } = await import('../../testing/import-warning-fixture')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const { xml }=createImportWarningFixture('mixed')
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/same.musicxml',fileName:'same.musicxml',contents:xml})
    const { App }=await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
    const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),original=structuredClone(playbackMockState.lastScore!)
    const old=within(report).getByRole('button',{name:'마디별 경고 상세 3개'})
    const frames=new Map<number,FrameRequestCallback>();let frameId=0
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++frameId,cb);return frameId})
    const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
    const bounds=vi.spyOn(old,'getBoundingClientRect').mockReturnValue(new DOMRect(30,728,230,72))
    const footer=vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,480,960,320))
    old.scrollIntoView=vi.fn()
    try {
      act(()=>old.focus());expect(frames.size).toBeGreaterThan(0)
      const pending=[...frames.values()];frames.clear()
      if(replacement==='same-file'){
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
        await waitFor(()=>expect(old.isConnected).toBe(false))
        expect(within(screen.getByRole('region',{name:'MusicXML 경고 상세'})).getByRole('button',{name:'마디별 경고 상세 3개'})).toHaveAttribute('aria-expanded','false')
        expect(playbackMockState.lastScore).toEqual(original)
      }else if(replacement==='project'){
        const next={...structuredClone(original),title:'Replacement project owns the viewport'}
        vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/replacement.chromatics',fileName:'replacement.chromatics',contents:encodeNativeProject(createNativeProject(next))})
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
        await waitFor(()=>expect(playbackMockState.lastScore).toEqual(next))
        expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
      }else{
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
        expect(screen.getByRole('dialog',{name:'새 악보 만들기'})).toBeVisible()
        // Opening the wizard has its own keyboard focus; no document is replaced until creation.
        expect(playbackMockState.lastScore).toEqual(original)
      }
      const active=document.activeElement,score=structuredClone(playbackMockState.lastScore)
      scroll.mockClear();act(()=>pending.forEach(cb=>cb(0)))
      expect(scroll).not.toHaveBeenCalled();expect(old.scrollIntoView).not.toHaveBeenCalled();expect(document.activeElement).toBe(active)
      expect(playbackMockState.lastScore).toEqual(score);expect(window.inC.project.save).not.toHaveBeenCalled()
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    }finally{raf.mockRestore();cancel.mockRestore();scroll.mockRestore();bounds.mockRestore();footer.mockRestore()}
  })

  it.each(['below','above'] as const)('studio.warning-layout-focus reveals a focused control after report resizing %s without stealing a later focus',async edge=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const originalObserver=globalThis.ResizeObserver
    const observers=new Set<{callback:ResizeObserverCallback;targets:Set<Element>}>()
    class Observer {
      readonly targets=new Set<Element>()
      constructor(readonly callback:ResizeObserverCallback){observers.add(this)}
      observe(target:Element){this.targets.add(target)}
      unobserve(target:Element){this.targets.delete(target)}
      disconnect(){this.targets.clear();observers.delete(this)}
    }
    vi.stubGlobal('ResizeObserver',Observer)
    const frames=new Map<number,FrameRequestCallback>();let frameId=0,offset=0,top=300
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{frames.set(++frameId,cb);return frameId})
    const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation((x?:number|ScrollToOptions,y?:number)=>{offset+=typeof x==='object'?(x.top??0):(y??0)})
    try{
      const {createImportWarningFixture}=await import('../../testing/import-warning-fixture'),{xml}=createImportWarningFixture('mixed')
      vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/scores/layout.musicxml',fileName:'layout.musicxml',contents:xml})
      const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
      const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),target=within(report).getByRole('button',{name:'마디별 경고 상세 3개'})
      const source=structuredClone(playbackMockState.lastScore)
      vi.spyOn(target,'getBoundingClientRect').mockImplementation(()=>new DOMRect(30,top-offset,230,72))
      vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,480,960,320))
      target.scrollIntoView=vi.fn();target.style.outline='2px solid blue';target.style.outlineOffset='2px'
      const flush=()=>act(()=>{const batch=[...frames.values()];frames.clear();batch.forEach(cb=>cb(0))})
      const resize=()=>act(()=>{for(const o of observers)if(o.targets.has(report))o.callback([],o as unknown as ResizeObserver)})
      act(()=>target.focus());flush();expect(scroll).not.toHaveBeenCalled()
      fireEvent.click(target);expect(target).toHaveAttribute('aria-expanded','true')
      top=edge==='below'?728:-20;frames.clear();resize();flush()
      expect(target.getBoundingClientRect().top-4).toBeGreaterThanOrEqual(0)
      expect(target.getBoundingClientRect().bottom+4).toBeLessThanOrEqual(480)
      expect(target).toHaveFocus();expect(scroll).toHaveBeenCalled()
      // A queued old report resize does not override a new explicit destination.
      offset=0;top=728;scroll.mockClear();resize();act(()=>screen.getByRole('button',{name:'악보로 이동'}).focus());flush()
      expect(scroll).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'악보로 이동'})).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(window.inC.project.save).not.toHaveBeenCalled()
    }finally{cleanup();raf.mockRestore();cancel.mockRestore();scroll.mockRestore();vi.stubGlobal('ResizeObserver',originalObserver)}
  })

})
