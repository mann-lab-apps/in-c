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

  it('start-recovery.show-start-screen renders the start screen with Korean entry actions', async () => {
    const { App } = await import('./App')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '새 악보를 만들어 볼까요?' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /새 악보 만들기/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /MusicXML 가져오기/ })).toBeInTheDocument()
    expect(screen.getByLabelText('최근 악보 파일')).toBeInTheDocument()
    expect(screen.getByRole('heading',{name:'새 악보를 만들어 볼까요?'}).closest('.studio-chrome')).toBeNull()
    for(const button of within(screen.getByLabelText('시작 작업')).getAllByRole('button')) expect(button).toHaveClass('dd-button')
  })

  it.each(['space', 'input-sequence', 'selected-pitch', 'pitch-arrow', 'save'] as const)(
    'start.keyboard-scope %s leaves the uncreated document and native button defaults alone', async action => {
      const { App } = await import('./App'); render(<App />)
      const button = screen.getByRole('button', { name: '새 악보 만들기' }), before = structuredClone(playbackMockState.lastScore)
      const keys = action === 'space' ? [{ key: ' ', code: 'Space' }]
        : action === 'input-sequence' ? [{ key: 'n', code: 'KeyN' }, { key: 'c', code: 'KeyC' }]
        : action === 'selected-pitch' ? [{ key: 'a', code: 'KeyA' }]
        : action === 'pitch-arrow' ? [{ key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true }]
        : [{ key: 's', code: 'KeyS', ctrlKey: true }]
      const defaults = keys.map(event => fireEvent.keyDown(button, event))
      await act(async () => {})
      expect(playbackMockState.lastScore).toEqual(before)
      expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
      expect(window.inC.musicXml.save).not.toHaveBeenCalled(); expect(window.inC.project.save).not.toHaveBeenCalled()
      expect(defaults).toEqual(keys.map(() => true))
      expect(screen.getByRole('heading', { name: '새 악보를 만들어 볼까요?' })).toBeInTheDocument()
    }
  )

  it('start.keyboard-scope existing wizard propagation keeps background score intact', async () => {
    const { App } = await import('./App'); render(<App />)
    const before = structuredClone(playbackMockState.lastScore)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    const button = within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getAllByRole('button', { name: /템플릿/ })[0]!
    for (const event of [{ key: 'n', code: 'KeyN' }, { key: 'c', code: 'KeyC' }, { key: 's', code: 'KeyS', ctrlKey: true }, { key: ' ', code: 'Space' }]) fireEvent.keyDown(button, event)
    await act(async () => {})
    expect(playbackMockState.lastScore).toEqual(before); expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(window.inC.musicXml.save).not.toHaveBeenCalled(); expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it.each([undefined, '직접 입력한 작곡가'] as const)('new-score.author default is empty and explicit author %s survives native saving', async composer => {
    const { decodeNativeProject } = await import('../../project/schema')
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    const dialog = within(screen.getByRole('dialog', { name: '새 악보 만들기' })), input = dialog.getByRole('textbox', { name: '작곡가' })
    expect(input).toHaveValue('')
    if (composer) fireEvent.change(input, { target: { value: composer } })
    fireEvent.click(dialog.getByRole('button', { name: '만들기' }))
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score.composer).toBe(composer)
  })

  it('start-recovery.no-autosave keeps primary start actions available without a recovery snapshot', async () => {
    const { App } = await import('./App')
    render(<App />)

    expect(
      screen.getByRole('button', { name: /새 악보 만들기/ })
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /MusicXML 가져오기/ })
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: /복구본 없음/ })).toBeDisabled()
  })

  it('start-recovery.new-score starts from blank measures instead of demo notes', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole(
        'button',
        { name: '만들기' }
      )
    )

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-event-count',
      '8'
    )
    expect(screen.getByTestId('notation-preview')).not.toHaveTextContent('note-c4')
  })

  it('score-setup.create-grand-staff-score creates a piano grand staff from the wizard', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('piano-grand-staff')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'part-1:Piano:2'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-staff-clefs',
      'part-1:staff-1:G2:8|part-1:staff-2:F4:8'
    )
  })

  it('layout.multi-staff-notation-object-anchoring stores staff annotations on the selected staff measure', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('piano-grand-staff')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'part-1-staff-2-measure-1-full-measure-rest 선택'
      })
    )
    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    const lowerMeasureId = 'part-1-staff-2-measure-1'
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-1:staff-2:part-1-staff-2-measure-1:voice-1:part-1-staff-2-measure-1-full-measure-rest:C04'
        )
      )
    })

    openStudioWorkspace('음표')
    fireEvent.change(screen.getByRole('textbox', { name: '선택 요약 보표 글자' }), {
      target: { value: 'dolce lower' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '선택 요약 보표 글자' }))
    fireEvent.change(screen.getByRole('textbox', { name: '선택 요약 표현 텍스트' }), {
      target: { value: 'sotto voce' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '선택 요약 표현 텍스트' }))
    chooseInspectorDynamic('mf')
    fireEvent.change(openHarmonyProperties(), {
      target: { value: 'C7/G' }
    })
    fireEvent.blur(screen.getByLabelText('선택 요약 코드'))

    const preview = screen.getByTestId('notation-preview')
    expect(within(preview).getByText('dolce lower')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('sotto voce')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('mf')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute(
      'data-measure-id',
      lowerMeasureId
    )
  })

  it('score-setup.create-ensemble-score creates a four-part ensemble from the wizard', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('string-quartet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-staff-clefs',
      'violin-1:staff-1:G2:8|violin-2:staff-1:G2:8|viola:staff-1:C3:8|cello:staff-1:F4:8'
    )
  })

  it('score-setup.built-in-template-picker creates an ensemble from the template surface', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    const templateRegion = within(dialog).getByRole('region', {
      name: '내장 템플릿'
    })

    expect(
      within(templateRegion).getByRole('button', {
        name: '솔로 멜로디 템플릿'
      })
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(
      within(templateRegion).getByRole('button', {
        name: '현악 4중주 템플릿'
      })
    )

    expect(within(dialog).getByRole('combobox',{name:'악보 구성'})).toHaveTextContent('현악 4중주')
    expect(
      within(templateRegion).getByRole('button', {
        name: '현악 4중주 템플릿'
      })
    ).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-part-structure',
      'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
    )
  })

  it('layout.live-part-view previews and exports the selected ensemble part', async () => {
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )
    vi.mocked(window.inC.midi.save).mockResolvedValue({
      fileName: 'in-c-viola.mid'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('string-quartet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    openStudioWorkspace('악보')

    chooseScoreView('악보 보기', 'part')
    chooseScoreView('파트보 선택', 'viola')
    openStudioWorkspace('내보내기')
    choosePageSetup('PDF 설정 프리셋', '컴팩트 파트보')

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'viola:Viola:1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        'viola:staff-1:C3:8'
      )
      expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Viola')
      expect(screen.getByLabelText('파트보 제목')).toHaveAttribute(
        'data-part-id',
        'viola'
      )
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-view-mode',
        'part'
      )
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-part-id',
        'viola'
      )
      expect(screen.getByText('파트보: Viola')).toBeInTheDocument()
    })

    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: '제목-없는-악보-viola.pdf'
      })
    })
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout',
      'true'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-part-structure',
      'viola:Viola:1'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('viola:staff-1:')
    )
    expect(printingPreview()).not.toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('violin-1:')
    )
    expect(printingPreview()).not.toHaveAttribute(
      'data-all-event-pitches',
      expect.stringContaining('cello:')
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-page-css-size',
      'A4 portrait'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-margin',
      '6'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-scale',
      '0.9'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-size',
      'a4'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-orientation',
      'portrait'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '6'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '90'
    )

    finishPdfSave?.({ fileName: 'in-c-viola.pdf' })
    expect(
      await screen.findByText('in-c-viola.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-print-layout',
        'false'
      )
    )

    fireEvent.click(screen.getByRole('button', { name: 'MIDI 내보내기' }))
    await waitFor(() => {
      expect(window.inC.midi.save).toHaveBeenCalledWith({
        suggestedName: '제목-없는-악보-viola.mid',
        contents: expect.any(Array)
      })
    })
  })

  it('layout.live-part-view keeps imported primary-part annotations out of other part PDFs', async () => {
    let finishPdfSave: ((value: { fileName: string }) => void) | undefined
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/imported-duo.musicxml',
      fileName: 'imported-duo.musicxml',
      contents: twoPartMusicXmlWithPrimaryAnnotations
    })
    vi.mocked(window.inC.pdf.save).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishPdfSave = resolve
        })
    )

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))

    expect(await screen.findByText('Imported Duo')).toBeInTheDocument()
    openStudioWorkspace('악보')
    chooseScoreView('악보 보기', 'part')

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'P1:Violin:1'
      )
    })
    const primaryPreview = within(screen.getByTestId('notation-preview'))
    expect(primaryPreview.getByText('Reh-One')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(primaryPreview.getByText('PrimaryOnlyText')).toHaveAttribute(
      'data-measure-id',
      'P1-staff-1-measure-1'
    )
    expect(primaryPreview.getByText('maj7')).toHaveAttribute(
      'data-measure-id',
      'P1-staff-1-measure-1'
    )
    expect(primaryPreview.getByText('mf')).toHaveAttribute(
      'data-measure-id',
      'P1-staff-1-measure-1'
    )

    chooseScoreView('파트보 선택', 'P2')

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'P2:Cello:1'
      )
      expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Cello')
      expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
        'data-part-id',
        'P2'
      )
    })

    const celloPreview = within(screen.getByTestId('notation-preview'))
    expect(celloPreview.getByText('Reh-One')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(celloPreview.queryByText('PrimaryOnlyText')).not.toBeInTheDocument()
    expect(celloPreview.queryByText('maj7')).not.toBeInTheDocument()
    expect(celloPreview.queryByText('mf')).not.toBeInTheDocument()

    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => {
      expect(window.inC.pdf.save).toHaveBeenCalledWith({
        suggestedName: 'imported-duo-cello.pdf'
      })
      expect(printingPreview()).toHaveAttribute(
        'data-print-layout',
        'true'
      )
      expect(printingPreview()).toHaveAttribute(
        'data-part-structure',
        'P2:Cello:1'
      )
    })
    const printPreview = within(printingPreview())
    expect(printPreview.getByText('Reh-One')).toBeInTheDocument()
    expect(printPreview.queryByText('PrimaryOnlyText')).not.toBeInTheDocument()
    expect(printPreview.queryByText('maj7')).not.toBeInTheDocument()
    expect(printPreview.queryByText('mf')).not.toBeInTheDocument()

    finishPdfSave?.({ fileName: 'imported-duo-cello.pdf' })
    expect(
      await screen.findByText('imported-duo-cello.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('part XML export preserves the full-score save path and dirty state, with selected-part annotations only', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/full.musicxml', fileName: 'full.musicxml',
      contents: twoPartMusicXmlWithPrimaryAnnotations
    })
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({
      filePath: '/scores/cello.musicxml', fileName: 'cello.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    await screen.findByText('Imported Duo')
    openStudioWorkspace('악보')
    chooseScoreView('악보 보기', 'part')
    chooseScoreView('파트보 선택', 'P2')
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const request = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0]
    expect(request.suggestedName).toBe('imported-duo-cello.musicxml')
    expect(request).not.toHaveProperty('filePath')
    const reopened = parseMusicXml(request.contents)
    expect(reopened.parts.map(part => part.name)).toEqual(['Cello'])
    expect(reopened.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[0]).toMatchObject({
      type: 'note', pitch: { step: 'C', octave: 3 }
    })
    expect(reopened.rehearsalMarks?.map(mark => mark.text)).toContain('Reh-One')
    expect(reopened.harmonies ?? []).toEqual([])
    expect(reopened.dynamics ?? []).toEqual([])
    expect(request.contents).not.toContain('PrimaryOnlyText')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(1)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/scores/full.musicxml' })
    ))
    expect(parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents).parts).toHaveLength(2)
  })

  it.each([0,1,2,3,4,5])('import-export.tempo-label case%s preserves visible defaults and raw native metadata', async index => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { tempoLabelFixture } = await import('../../testing/tempo-label-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { serializeMidi } = await import('./midi/serialize-midi')
    const { source, expectedText } = tempoLabelFixture(index)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/tempo.chromatics',fileName:'tempo.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/tempo.chromatics',fileName:'tempo.chromatics'})
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/tempo.musicxml',fileName:'tempo.musicxml'})
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText(source.title)
    await act(async () => {})
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const parsed = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents)
    expect(parsed.tempo?.text).toBe(expectedText)
    expect(serializeMidi(parsed)).toEqual(serializeMidi(source))
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyS',ctrlKey:true})
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(source)
  })

  it.each(['key', 'preceding'] as const)('import-export.implicit-chord %s exports resolved pitches without mutating native data', async kind => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { implicitChordFixture } = await import('../../testing/implicit-chord-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { serializeMidi } = await import('./midi/serialize-midi')
    const { source, explicit } = implicitChordFixture(kind)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/implicit.chromatics',fileName:'implicit.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/implicit.chromatics',fileName:'implicit.chromatics'})
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/implicit.musicxml',fileName:'implicit.musicxml'})
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText(source.title)
    await act(async () => {})
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const xml = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents
    expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(explicit))
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyS',ctrlKey:true})
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(source)
  })

  it.each(['native-open', 'recovery', 'switch-part', 'return-to-part'] as const)(
    'part-view.selection-scope %s edits only the visible part and preserves undo', async entry => {
      window.history.replaceState({}, '', entry === 'recovery' ? '/' : '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
      project.view = entry === 'native-open' || entry === 'recovery' ? { mode: 'part', partId: 'P2' } : { mode: 'score' }
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/visible.chromatics', fileName: 'visible.chromatics', contents: encodeNativeProject(project) })
      vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/visible.chromatics', fileName: 'visible.chromatics' })
      if (entry === 'recovery') vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-10-26T00:00:00Z', version: 'test' } })
      const { App } = await import('./App')
      render(<App />)
      if (entry === 'recovery') fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
      else {
        openStudioWorkspace('파일')
        fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      }
      await screen.findByText('Expanded Part Export')
      openStudioWorkspace('악보')
      if (entry === 'switch-part' || entry === 'return-to-part') {
        chooseScoreView('악보 보기', 'part')
        chooseScoreView('파트보 선택', 'P2')
        if (entry === 'return-to-part') {
          chooseScoreView('악보 보기', 'score')
          const hiddenEvent = project.score.parts[0]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
          fireEvent.click(screen.getByRole('button', { name: `${hiddenEvent.id} 선택` }))
          chooseScoreView('악보 보기', 'part')
        }
      }
      const piano = project.score.parts[1]!, staff = piano.staves[0]!, measure = staff.measures[0]!, voice = measure.voices[0]!
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', `${piano.id}:${staff.id}:${measure.id}:${voice.id}`)
      fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true })
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const changed = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      expect(changed.score.parts[0]).toEqual(project.score.parts[0])
      expect(changed.score.parts[1]).not.toEqual(piano)
      expect(changed.view).toEqual({ mode: 'part', partId: 'P2' })
      await screen.findByText('visible.chromatics에 저장했습니다.')
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
    }
  )

  it('part-view.selection-scope preserves visible selection/input but exits a hidden input target without an undo step', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/targets.chromatics', fileName: 'targets.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    const event = project.score.parts[0]!.staves[0]!.measures[1]!.voices[0]!.events[0]!
    fireEvent.click(screen.getByRole('button', { name: `${event.id} 선택` }))
    fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
    expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active', 'true')
    openStudioWorkspace('악보')
    chooseScoreView('악보 보기', 'part')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', event.id)
    expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active', 'true')
    chooseScoreView('파트보 선택', 'P2')
    expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active', 'false')
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:/)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(project.score)
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:/)
  })

  it('part-view.playback-scope keeps the visible part selected through ensemble play pause and stop', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/play.chromatics', fileName: 'play.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    const { rerender } = render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    const clarinet = project.score.parts[0]!, clarinetStaff = clarinet.staves[0]!, clarinetMeasure = clarinetStaff.measures[0]!
    const piano = project.score.parts[1]!, pianoStaff = piano.staves[0]!, pianoMeasure = pianoStaff.measures[0]!
    playbackMockState.value = {
      ...playbackMockState.value, status: 'playing', positionBeat: 0,
      activeEvent: { eventId: clarinetMeasure.voices[0]!.events[0]!.id, partId: clarinet.id, staffId: clarinetStaff.id, measureId: clarinetMeasure.id, voiceId: clarinetMeasure.voices[0]!.id },
      activeEventId: clarinetMeasure.voices[0]!.events[0]!.id
    }
    rerender(<App />)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', `${piano.id}:${pianoStaff.id}:${pianoMeasure.id}:${pianoMeasure.voices[0]!.id}`)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-playback-event-address', `${piano.id}:${pianoStaff.id}:${pianoMeasure.id}:${pianoMeasure.voices[0]!.id}`)
    playbackMockState.value = { ...playbackMockState.value, status: 'paused' }
    rerender(<App />)
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:/)
    playbackMockState.value = { ...playbackMockState.value, status: 'stopped', activeEvent: undefined, activeEventId: undefined }
    rerender(<App />)
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:/)
    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts[0]).toEqual(clarinet)
    expect(saved.score.parts[1]).not.toEqual(piano)
  })

  it('studio.page-interchange explains unsupported imported margins in Korean while retaining technical diagnostics', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {musicXmlOrderFixture}=await import('../../testing/musicxml-order-fixture')
    const {serializeMusicXml}=await import('../../musicxml')
    const source=musicXmlOrderFixture('system-text')
    source.layout={pageSetup:{pageSize:'letter',orientation:'landscape',pageMarginMm:12.5}}
    const xml=serializeMusicXml(source).replace(/<left-margin>[^<]+<\/left-margin>/,'<left-margin>40</left-margin>')
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/margins.musicxml',fileName:'margins.musicxml',contents:xml})
    const {App}=await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
    const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'})
    expect(within(report).getByText('서로 다르거나 지원 범위를 벗어난 여백은 가져오지 못했습니다. 출력 전에 원본과 여백을 비교해 주세요.')).toBeVisible()
    expect(playbackMockState.lastScore?.layout?.pageSetup).toEqual({pageSize:'letter',orientation:'landscape'})
    expect(within(report).getByText(/Asymmetric, incomplete/)).not.toBeVisible()
    expect(within(report).getByText(/defaults.page-layout.page-margins/)).not.toBeVisible()
  })

  it('studio.harmony-schema rejects unknown structure before file output without losing dirty selection or undo', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const source=structuredClone(demoScore)
    source.harmonies=[{id:'unknown-analysis',measureId:source.parts[0].staves[0].measures[0].id,tick:0,text:'Unspecified analysis'}]
    const eventId=source.parts[0].staves[0].measures[0].voices[0].events.find(event=>event.type==='note')!.id
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/opaque.chromatics',fileName:'opaque.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const {App}=await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:`${eventId} 선택`}));fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp',altKey:true,shiftKey:true})
    const before=structuredClone(playbackMockState.lastScore!)
    expect(before).not.toEqual(source)
    const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    await waitFor(()=>expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('코드 심벌 “Unspecified analysis”의 화음 구조를 MusicXML로 보존할 수 없습니다. 지원하는 코드 표기로 수정하거나 프로젝트 파일로 보관해 주세요.'))
    expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toBe(selection)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  it.each([
    ['title', '악보 제목 수정', '악보 제목'],
    ['composer', '작곡가 수정', '작곡가'],
    ['partTitle', '파트보 제목 수정', '파트보 제목 입력']
  ] as const)('metadata.document-scope discards a pending %s draft when another native document arrives', async (_field, action, inputLabel) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const first = createNativeProject(parseMusicXml(richPartExportMusicXml))
    first.view = { mode: 'part', partId: 'P2' }
    first.partLayouts = [{ partId: 'P2', title: 'First document piano', layout: {} }]
    const second = structuredClone(first)
    second.score.title = 'Second document'
    second.score.composer = 'Second composer'
    second.partLayouts[0]!.title = 'Second piano'
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/first.chromatics', fileName: 'first.chromatics', contents: encodeNativeProject(first) })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    let finish!: (value: Awaited<ReturnType<typeof window.inC.project.open>>) => void
    vi.mocked(window.inC.project.open).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    fireEvent.click(screen.getByRole('button', { name: action }))
    const oldInput = screen.getByRole('textbox', { name: inputLabel })
    fireEvent.compositionStart(oldInput)
    fireEvent.change(oldInput, { target: { value: '이전 문서의 미확정 초안' } })
    await act(async () => finish({ filePath: '/scores/second.chromatics', fileName: 'second.chromatics', contents: encodeNativeProject(second) }))
    await screen.findByText('second.chromatics을 열었습니다.')
    expect(screen.queryByRole('textbox', { name: inputLabel })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '악보 제목 수정' })).toHaveTextContent('Second document')
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Second piano')
    fireEvent.compositionEnd(oldInput)
    fireEvent.keyDown(oldInput, { key: 'Enter' })
    fireEvent.blur(oldInput)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(second.score)
    expect(saved.partLayouts).toEqual(second.partLayouts)
    await waitFor(() => expect(document.querySelector('.studio-document [role="status"]')).toHaveTextContent('변경 없음'))
  })

  it.each([
    ['title', '악보 제목 수정', '악보 제목'],
    ['composer', '작곡가 수정', '작곡가'],
    ['partTitle', '파트보 제목 수정', '파트보 제목 입력']
  ] as const)('metadata.commit-scope %s Enter followed by blur creates one command and one undo', async (_field, action, inputLabel) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/commit.chromatics', fileName: 'commit.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    const trigger=screen.getByRole('button',{name:action})
    trigger.focus();fireEvent.keyDown(trigger,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    for(const composition of [{isComposing:true},{keyCode:229},{key:'Process'}]) {
      expect(fireEvent.keyDown(trigger,{key:' ',code:'Space',...composition})).toBe(false)
      expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    }
    fireEvent.click(trigger)
    const input = screen.getByRole('textbox', { name: inputLabel })
    expect(input.closest('.dd-input-row')).not.toBeNull()
    expect((input as HTMLInputElement).labels![0]).toHaveClass('dd-input-label--sr-only')
    fireEvent.change(input, { target: { value: '조합 후 취소할 초안' } })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, isComposing: true })
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true })
    expect(input).toBeInTheDocument()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' })
      fireEvent.blur(input)
    })
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(screen.getByRole('button', { name: action })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: action }))
    const confirmInput = screen.getByRole('textbox', { name: inputLabel })
    fireEvent.change(confirmInput, { target: { value: '한 번만 확정할 이름' } })
    act(() => {
      fireEvent.keyDown(confirmInput, { key: 'Enter' })
      fireEvent.blur(confirmInput)
    })
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByRole('button', { name: action })).toHaveFocus()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button', { name: action }))
    const blurInput=screen.getByRole('textbox',{name:inputLabel})
    fireEvent.change(blurInput,{target:{value:'다른 도구로 이동하며 확정'}})
    const destination=screen.getByRole('button',{name:'악보로 이동'})
    act(()=>destination.focus())
    expect(destination).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts).toEqual(project.partLayouts)
  })

  it.each([
    ['title', '악보 제목 수정', '악보 제목'],
    ['composer', '작곡가 수정', '작곡가'],
    ['partTitle', '파트보 제목 수정', '파트보 제목 입력']
  ] as const)('metadata.composition-blur %s defers confirmation and preserves one undo and next focus', async (_field, action, inputLabel) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/composing.chromatics', fileName: 'composing.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: action }))
    const input = screen.getByRole('textbox', { name: inputLabel })
    fireEvent.compositionStart(input); fireEvent.change(input, { target: { value: '조합 중인 제목' } })
    fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toBeInTheDocument()
    const destination = screen.getByRole('button', { name: '악보로 이동' })
    act(() => destination.focus())
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(input).toBeInTheDocument()
    fireEvent.compositionEnd(input)
    await waitFor(() => expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정'))
    expect(destination).toHaveFocus()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(project.score); expect(saved.partLayouts).toEqual(project.partLayouts)
  })

  it.each(['add-part', 'vertical-navigation', 'explicit-staff', 'history'] as const)(
    'part-view.command-scope %s keeps displayed and editing parts aligned', async action => {
      window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
      project.view = { mode: 'part', partId: 'P2' }
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/commands.chromatics', fileName: 'commands.chromatics', contents: encodeNativeProject(project) })
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export')
      if (action === 'add-part') {
        openStudioWorkspace('악보')
        fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'violin:바이올린:1')
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^violin:/)
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'violin:바이올린:1')
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
      } else if (action === 'vertical-navigation') {
        const before = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', before)
        fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true })
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:P2-staff-1:.*:voice-2$/)
        fireEvent.keyDown(window, { key: 'ArrowDown', altKey: true })
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:P2-staff-2:/)
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true })
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:P2-staff-1:/)
      } else if (action === 'explicit-staff') {
        expandNoteDetails()
        fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
        chooseStaffTarget('P1:P1-staff-1')
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P1:Clarinet:1')
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P1:/)
        expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active', 'true')
        fireEvent.keyDown(window, { key: 'Escape' })
      } else {
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true, shiftKey: true })
        openStudioWorkspace('악보')
        chooseScoreView('파트보 선택', 'P1')
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P2:/)
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
        expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P1:Clarinet:1')
        expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toMatch(/^P1:/)
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      }
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(project.score)
    }
  )

  it.each(['diatonic', 'chromatic', 'octave', 'out-of-range'] as const)(
    'chord.pitch-movement native shortcut %s preserves the whole chord with one history command', async movement => {
      window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
      project.view = { mode: 'part', partId: 'P2' }
      const chord = project.score.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      if (chord.type !== 'note' || !chord.pitches) throw Error('Expected actual imported chord')
      if (movement === 'out-of-range') { chord.pitches[1]!.octave = 9 }
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/chord.chromatics', fileName: 'chord.chromatics', contents: encodeNativeProject(project) })
      vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/chord.chromatics', fileName: 'chord.chromatics' })
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export')
      // Flush React's native-open render/effect boundary before synthetic window keys.
      await act(async () => {})
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', chord.id)
      fireEvent.keyDown(window, { key: 'ArrowUp', altKey: movement === 'diatonic', ctrlKey: movement === 'octave' || movement === 'out-of-range', shiftKey: movement === 'diatonic' })
      expect(document.querySelector('.editor-status')).toHaveTextContent(movement === 'out-of-range' ? '0회 수정' : '1회 수정')
      if (movement === 'out-of-range') expect(screen.getByText(/화음을 이동할 수 없습니다/)).toBeInTheDocument()
      else expect(screen.getByText('선택한 화음의 모든 음을 이동했습니다.')).toBeInTheDocument()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      const expected = structuredClone(project.score)
      const moved = expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      if (moved.type !== 'note') throw Error('Expected chord')
      if (movement !== 'out-of-range') {
        moved.pitches = movement === 'diatonic'
          ? [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]
          : movement === 'chromatic'
            ? [{ step: 'C', octave: 4, alter: 1 }, { step: 'E', octave: 4, alter: 1 }]
            : [{ step: 'C', octave: 5, alter: 0 }, { step: 'E', octave: 5, alter: 0 }]
        moved.pitch = moved.pitches[0]!
      }
      expect(saved.score).toEqual(expected)
      expect(saved.partLayouts).toEqual(project.partLayouts)
      if (movement !== 'out-of-range') {
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
        expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
        fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
        await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
        expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
      }
    }
  )

  it.each(['sharp', 'natural', 'enharmonic', 'next-input'] as const)(
    'chord.spelling context %s keeps selected-vector scope separate from next input', async operation => {
      window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
      project.view = { mode: 'part', partId: 'P2' }
      const chord = project.score.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      if (chord.type !== 'note' || !chord.pitches) throw Error('Expected chord')
      chord.pitches[0]!.alter = 1; chord.pitch = chord.pitches[0]!
      if (operation === 'enharmonic') chord.pitches[1]!.alter = 1
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/spelling.chromatics', fileName: 'spelling.chromatics', contents: encodeNativeProject(project) })
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export')
      // Flush React's native-open render/effect boundary before synthetic window keys.
      await act(async () => {})
      expandNoteDetails()
      if (operation === 'next-input') fireEvent.keyDown(window, { key: 'n', code: 'KeyN' })
      const properties = within(screen.getByRole('group', { name: '임시표' }))
      if (operation !== 'enharmonic' && operation !== 'next-input') {
        for (const label of ['플랫', '샤프', '제자리표']) expect(properties.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'false')
      }
      if (operation === 'enharmonic') fireEvent.click(screen.getByRole('button', { name: '이명동음으로 바꾸기' }))
      else fireEvent.click(properties.getByRole('button', { name: operation === 'natural' ? '제자리표' : '샤프' }))
      expect(document.querySelector('.editor-status')).toHaveTextContent(operation === 'next-input' ? '0회 수정' : '1회 수정')
      if (operation !== 'next-input') expect(screen.getByLabelText('음표 편집 대상')).toHaveTextContent('화음 전체')
      else {
        expect(properties.getByRole('button', { name: '샤프' })).toHaveAttribute('aria-pressed', 'true')
        fireEvent.keyDown(window, { key: 'Escape' })
      }
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      const expected = structuredClone(project.score), changed = expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      if (changed.type !== 'note' || !changed.pitches) throw Error('Expected chord')
      if (operation !== 'next-input') {
        changed.pitches = operation === 'enharmonic' ? [{ step: 'D', octave: 4, alter: -1 }, { step: 'F', octave: 4, alter: 0 }] : changed.pitches.map(pitch => ({ ...pitch, alter: operation === 'natural' ? 0 : 1 }))
        changed.pitch = changed.pitches[0]!
      }
      expect(saved.score).toEqual(expected)
      if (operation !== 'next-input') {
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
        expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
        fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
        await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
        expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
      }
    }
  )

  it.each(['single-note', 'chord-to-single', 'rest'] as const)(
    'pitch.letter-replacement App %s preserves attachments selection and one undo', async kind => {
      window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
      project.view = { mode: 'part', partId: 'P2' }
      const voice = project.score.parts[1]!.staves[0]!.measures[0]!.voices[0]!, old = voice.events[0]!
      if (old.type !== 'note') throw Error('Expected note')
      if (kind === 'single-note') delete old.pitches
      old.fermata = true; old.breathMark = 'breath'
      if (kind === 'rest') {
        voice.events[0] = { type: 'rest', id: old.id, position: old.position, duration: old.duration, fullMeasure: true, fermata: true, breathMark: 'breath' }
        project.score.slurs = []
      }
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/letter.chromatics', fileName: 'letter.chromatics', contents: encodeNativeProject(project) })
      const { App } = await import('./App')
      render(<App />)
      openStudioWorkspace('파일')
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export'); await act(async () => {})
      if (kind === 'chord-to-single') {
        expandNoteDetails()
        expect(screen.getByLabelText('음표 편집 대상')).toHaveTextContent('A–G: 단음 교체')
      }
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD' })
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', old.id)
      if (kind === 'chord-to-single') expect(screen.getByText(/화음을 단음으로 바꿨습니다/)).toBeInTheDocument()
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      const expected = structuredClone(project.score), event = expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      const metadata = { ...event } as Record<string, unknown>; delete metadata.pitches; delete metadata.fullMeasure
      expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0] = { ...metadata, type: 'note', pitch: { step: 'D', octave: 4, alter: 0 } } as typeof old
      expect(saved.score).toEqual(expected)
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
    }
  )

  it('native project opens portable part settings and saves/resaves separately from XML', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    const breakId = project.score.parts[1]!.staves[1]!.measures[1]!.id
    const primaryBreakId = project.score.parts[1]!.staves[0]!.measures[1]!.id
    project.partLayouts = [{ partId: 'P2', title: 'Piano part', layout: { pageBreakBeforeMeasureIds: [breakId], pageSetup: { pageSize: 'letter', orientation: 'landscape' } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano part')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', primaryBreakId)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    await screen.findByText('project.chromatics에 저장했습니다.')
    const request = vi.mocked(window.inC.project.save).mock.calls[0]![0]
    expect(request.filePath).toBe('/scores/project.chromatics')
    const saved = decodeNativeProject(request.contents)
    expect(saved.score.parts).toHaveLength(2)
    expect(saved.view).toEqual({ mode: 'part', partId: 'P2' })
    expect(saved.partLayouts[0]).toMatchObject({ title: 'Piano part', layout: { pageSetup: { pageSize: 'letter', orientation: 'landscape' } } })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.project.save).mock.calls[1]![0]).not.toHaveProperty('filePath')
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: '프로젝트 저장' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    const freshRequest = vi.mocked(window.inC.project.save).mock.calls[2]![0]
    expect(freshRequest).not.toHaveProperty('filePath')
    expect(decodeNativeProject(freshRequest.contents)).toMatchObject({ view: { mode: 'score' }, partLayouts: [] })
  })

  it('independent part title supports edit undo redo reset save and reopen without renaming the score or instrument', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Original part title', layout: { systemBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Piano rehearsal edition' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Original part title')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: '' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Cancelled title' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Escape' })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const savedContents = vi.mocked(window.inC.project.save).mock.calls[0]![0].contents
    const saved = decodeNativeProject(savedContents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts).toEqual([{ ...project.partLayouts[0], title: 'Piano rehearsal edition' }])
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/reopened.chromatics', fileName: 'reopened.chromatics', contents: savedContents })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('reopened.chromatics을 열었습니다.')
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano rehearsal edition')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(vi.mocked(window.inC.pdf.save).mock.calls[0]![0].suggestedName).toContain('piano-rehearsal-edition')
  }, 15_000)

  it.each([
    ['페이지', 'pageBreakBeforeMeasureIds', 'data-page-breaks'],
    ['시스템', 'systemBreakBeforeMeasureIds', 'data-system-breaks']
  ] as const)('independent %s breaks edit from lower staff with undo redo and portable reopen', async (label, key, attribute) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Piano part', layout: {} }]
    const part = project.score.parts[1]!
    const targetMeasure = part.staves[0]!.measures[1]!
    const lowerEvent = part.staves[1]!.measures[1]!.voices[0]!.events[0]!
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: `${lowerEvent.id} 선택` }))
    openStudioWorkspace('악보')
    expect(screen.getByRole('button', { name: `${label} 나누기 추가` })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: `${label} 나누기 추가` }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    fireEvent.click(screen.getByRole('button', { name: `${label} 나누기 해제` }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    chooseScoreView('악보 보기', 'score')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, '')
    chooseScoreView('악보 보기', 'part')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const contents = vi.mocked(window.inC.project.save).mock.calls[0]![0].contents
    const saved = decodeNativeProject(contents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts[0]).toMatchObject({ partId: 'P2', title: 'Piano part', layout: { [key]: [targetMeasure.id] } })
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/reopened.chromatics', fileName: 'reopened.chromatics', contents })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('reopened.chromatics을 열었습니다.')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(attribute, targetMeasure.id)
  })

  it('part page settings and layout reset support undo redo and portable save without changing the score', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.score.layout = { pageSetup: { pageMarginMm: 12 } }
    project.view = { mode: 'part', partId: 'P2' }
    const measureId = project.score.parts[1]!.staves[0]!.measures[1]!.id
    project.partLayouts = [{ partId: 'P2', title: 'Custom piano', layout: { pageBreakBeforeMeasureIds: [measureId], pageSetup: { pageMarginMm: 6 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    openStudioWorkspace('내보내기')
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(6)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    fireEvent.click(screen.getByRole('button', { name: '파트보 조판 초기화' }))
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(12)
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Piano')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', '')
    expect(screen.getByRole('button', { name: '파트보 조판 초기화' })).toBeDisabled()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Custom piano')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', measureId)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('parts.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(project.score)
    expect(saved.partLayouts[0]).toMatchObject({ title: 'Custom piano', layout: { pageSetup: { pageMarginMm: 17 }, pageBreakBeforeMeasureIds: [measureId] } })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts).toEqual([])
  }, 15_000)

  it('native save prunes deleted part-break anchors while undo restores the original layout', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Structural layout', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const part = project.score.parts[0]!
    const measures = part.staves[0]!.measures
    const deleted = measures[1]!
    const retained = measures[2]!
    project.view = { mode: 'part', partId: part.id }
    project.partLayouts = [{ partId: part.id, title: 'Solo layout', layout: { pageBreakBeforeMeasureIds: [deleted.id, retained.id], systemBreakBeforeMeasureIds: [deleted.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/layout.chromatics', fileName: 'layout.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/layout.chromatics', fileName: 'layout.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Structural layout')
    fireEvent.click(screen.getByRole('button', { name: `${deleted.voices[0]!.events[0]!.id} 선택` }))
    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', retained.id)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    expect(document.querySelector('.editor-status .is-error')?.textContent ?? '').toBe('')
    await screen.findByText('layout.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.partLayouts[0]?.layout).toEqual({ pageBreakBeforeMeasureIds: [retained.id], systemBreakBeforeMeasureIds: [] })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-page-breaks', `${deleted.id},${retained.id}`)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts).toEqual(project.partLayouts)
  })

  it('quartet part-view measure insert delete and undo keep all parts aligned in the native file', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Aligned quartet', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const part = project.score.parts[3]!
    const staff = part.staves[0]!
    const target = staff.measures[1]!
    project.view = { mode: 'part', partId: part.id }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/quartet.chromatics', fileName: 'quartet.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/quartet.chromatics', fileName: 'quartet.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Aligned quartet')
    fireEvent.click(screen.getByRole('button', { name: `${target.voices[0]!.events[0]!.id} 선택` }))
    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '마디 추가' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '4')
    expect(screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')).toContain(`${part.id}:${staff.id}:`)
    fireEvent.click(screen.getByRole('button', { name: '마디 삭제' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '3')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-measure-count', '4')
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await screen.findByText('quartet.chromatics에 저장했습니다.')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts.map(part => part.staves[0]!.measures.length)).toEqual([4, 4, 4, 4])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score).toEqual(project.score)
  })

  it.each(['score', 'part'] as const)('studio.structure protects %s breaks when unequal staff removal cannot preserve their anchor', async scope => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const piano = project.score.parts[1]!, lower = piano.staves[1]!
    const extra = structuredClone(lower.measures[1]!)
    extra.id = 'unequal-extra'; extra.number = 3
    for (const voice of extra.voices) for (const event of voice.events) event.id += '-extra'
    lower.measures.push(extra)
    project.view = { mode: 'part', partId: piano.id }
    const layout = { pageBreakBeforeMeasureIds: [lower.measures[1]!.id], systemBreakBeforeMeasureIds: [extra.id] }
    if (scope === 'score') project.score.layout = layout
    project.partLayouts = [{ partId: piano.id, title: 'Keep independent layout', layout: scope === 'part' ? layout : {} }]
    const before = structuredClone(project)
    if (process.env.DDIRORI_UNEQUAL_STAFF_QA_DIR) {
      const { mkdirSync, writeFileSync } = await import('node:fs')
      const { join } = await import('node:path')
      const directory = join(process.env.DDIRORI_UNEQUAL_STAFF_QA_DIR, scope)
      mkdirSync(directory, { recursive: true })
      writeFileSync(join(directory, 'source.chromatics'), encodeNativeProject(project))
    }
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/unequal.chromatics', fileName: 'unequal.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/unequal.chromatics', fileName: 'unequal.chromatics' })
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: `${lower.measures[0]!.voices[0]!.events[0]!.id} 선택` }))
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    openStudioWorkspace('악보'); fireEvent.click(screen.getByRole('button', { name: '보표 삭제' }))
    const guard = screen.queryByText('저장된 줄·페이지 나누기를 다른 보표로 옮길 수 없습니다. 해당 나누기를 해제한 뒤 보표를 삭제해 주세요.')
    const afterSelection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const historyWasEmpty = Boolean(screen.queryByText('0회 수정'))
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score).toEqual(before.score); expect(saved.partLayouts).toEqual(before.partLayouts)
    expect(guard).not.toBeNull(); expect(afterSelection).toBe(selected); expect(historyWasEmpty).toBe(true)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it('removing a staff preserves independent breaks and restores their original anchors on undo', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const piano = project.score.parts[1]!
    const upper = piano.staves[0]!
    const lower = piano.staves[1]!
    project.view = { mode: 'part', partId: piano.id }
    project.score.layout = { pageBreakBeforeMeasureIds: [lower.measures[1]!.id] }
    project.partLayouts = [{ partId: piano.id, title: 'Piano rehearsal', layout: { pageBreakBeforeMeasureIds: [lower.measures[1]!.id], systemBreakBeforeMeasureIds: [lower.measures[1]!.id] } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/staff.chromatics', fileName: 'staff.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/staff.chromatics', fileName: 'staff.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: `${lower.measures[0]!.voices[0]!.events[0]!.id} 선택` }))
    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '보표 삭제' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts[1]!.staves).toHaveLength(1)
    expect(saved.partLayouts[0]!.layout).toMatchObject({ pageBreakBeforeMeasureIds: [upper.measures[1]!.id], systemBreakBeforeMeasureIds: [upper.measures[1]!.id] })
    expect(saved.score.layout?.pageBreakBeforeMeasureIds).toEqual([upper.measures[1]!.id])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const undone = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(undone.score).toEqual(project.score)
    expect(undone.partLayouts).toEqual(project.partLayouts)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents).partLayouts).toEqual(saved.partLayouts)
  })

  it('part XML export preserves the standalone title and breaks while reporting unsupported page settings', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Independent heading', layout: { pageBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id], pageSetup: { staffSizePercent: 90 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/part.chromatics', fileName: 'part.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({ filePath: '/scores/piano.musicxml', fileName: 'piano.musicxml' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    const report = await screen.findByRole('region', { name: 'MusicXML 경고 상세' })
    expect(within(report).queryByText('score.layout.pageBreakBeforeMeasureIds[0]')).not.toBeInTheDocument()
    expect(within(report).getByText('score.layout.pageSetup')).toBeInTheDocument()
    expect(within(report).queryByText('project.partLayouts[0].title')).not.toBeInTheDocument()
    const exported = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents)
    expect(exported.parts).toHaveLength(1)
    expect(exported.layout?.pageBreakBeforeMeasureIds).toEqual([exported.parts[0]!.staves[0]!.measures[1]!.id])
    expect(exported.title).toBe('Independent heading')
    expect(exported.parts[0]!.name).toBe(project.score.parts[1]!.name)
    expect(exported.composer).toBe(project.score.composer)
    expect(screen.getByText(project.score.title)).toBeInTheDocument()
    expect(window.inC.project.save).not.toHaveBeenCalled()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
  })

  it('native save response does not overwrite a newer independent part title', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Original', layout: {} }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics', contents: encodeNativeProject(project) })
    let finishSave!: (file: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.project.save).mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '파트보 제목 수정' }))
    fireEvent.change(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { target: { value: 'Edited while saving' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '파트보 제목 입력' }), { key: 'Enter' })
    await act(async () => { finishSave({ filePath: '/scores/parts.chromatics', fileName: 'parts.chromatics' }) })
    expect(screen.getByLabelText('파트보 제목')).toHaveTextContent('Edited while saving')
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).partLayouts[0]?.title).toBe('Edited while saving')
  })

  it('native open reconfirms part-page edits made while the file chooser is pending', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/scores/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    let finishOpen!: (file: { filePath: string; fileName: string; contents: string }) => void
    vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise(resolve => { finishOpen = resolve }))
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await waitFor(() => expect(window.inC.project.open).toHaveBeenCalledTimes(2))
    openStudioWorkspace('내보내기')
    fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
    fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    project.score.title = 'Incoming project'
    await act(async () => { finishOpen({ filePath: '/scores/incoming.chromatics', fileName: 'incoming.chromatics', contents: encodeNativeProject(project) }) })
    expect(confirm).toHaveBeenCalledWith('파일 선택 중 편집한 내용을 버리고 프로젝트를 열까요?')
    expect(screen.queryByText('Incoming project')).not.toBeInTheDocument()
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
    expect(screen.getByText('Expanded Part Export')).toBeInTheDocument()
  })

  it('native recent entry reopens through the native decoder and keeps the XML reader separate', async () => {
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const recent = { filePath: '/scores/recent.chromatics', fileName: 'recent.chromatics', format: 'native' as const, openedAt: '2026-09-13T00:00:00Z' }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recent])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({ ...recent, contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    expect(screen.getByRole('button', { name: '프로젝트 열기' })).toBeEnabled()
    fireEvent.click(await screen.findByRole('button', { name: /recent.chromatics/ }))
    await screen.findByText('Expanded Part Export')
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith({ filePath: recent.filePath, fileName: recent.fileName, format: 'native' })
    expect(window.inC.musicXml.open).not.toHaveBeenCalled()
    expect(window.inC.project.open).not.toHaveBeenCalled()
  })

  it.each(['recovery', 'recent'] as const)('studio.recovery-feedback keeps the %s startup diagnosis out of the primary banner', async operation => {
    const diagnostic = `QA ${operation} storage denied /fixture/private.json`
    if (operation === 'recovery') vi.mocked(window.inC.autosave.read).mockRejectedValueOnce(new Error(diagnostic))
    else vi.mocked(window.inC.recentMusicXml.list).mockRejectedValueOnce(new Error(diagnostic))
    const { App } = await import('./App'); render(<App />)
    const summary = operation === 'recovery' ? '자동저장 복구본을 읽지 못했습니다.' : '최근 악보 목록을 불러오지 못했습니다.'
    const text = await screen.findByText(new RegExp(summary.replace('.', '\\.')))
    const banner = text.closest('.dd-banner')!
    expect(banner).not.toHaveTextContent(diagnostic)
    expect(banner).toHaveTextContent('프로젝트 파일을 직접 열거나 새 악보로 시작')
    const technical = screen.getByRole('group', { name: operation === 'recovery' ? '자동저장 복구 기술 정보' : '최근 악보 목록 기술 정보' })
    expect(banner).not.toContainElement(technical)
    expect(within(technical).getByText(diagnostic)).not.toBeVisible()
    fireEvent.click(within(technical).getByRole('button', { name: '기술 정보' }))
    expect(within(technical).getByText(diagnostic)).toBeVisible()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    expect(screen.queryByText(diagnostic)).not.toBeInTheDocument()
  })

  it('studio.recovery-feedback preserves edits and one undo through background failure and manual project save', async () => {
    vi.mocked(window.inC.autosave.write).mockRejectedValueOnce(new Error('QA background write denied'))
    const { App } = await import('./App'); render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    fireEvent.click(screen.getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC' })
    const preview = screen.getByTestId('notation-preview'), pitches = preview.getAttribute('data-event-pitches'), selected = preview.getAttribute('data-selected-event-id')
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' })
    await waitFor(() => expect(status).toHaveTextContent('자동저장에 실패했습니다.'), { timeout: 3000 })
    expect(status).not.toHaveTextContent('QA background write denied')
    expect(status).toHaveTextContent('프로젝트 파일로 저장해 주세요.')
    expect(status).toHaveTextContent('1회 수정')
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
    expect(preview).toHaveAttribute('data-event-pitches', pitches)
    expect(preview).toHaveAttribute('data-selected-event-id', selected)
    const technical = screen.getByRole('group', { name: '자동저장 기술 정보' })
    expect(within(technical).getByText('QA background write denied')).not.toBeVisible()
    fireEvent.click(within(technical).getByRole('button', { name: '기술 정보' }))
    expect(within(technical).getByText('QA background write denied')).toBeVisible()
    vi.mocked(window.inC.project.save).mockResolvedValueOnce({ fileName: 'manual.chromatics', filePath: '/fixture/manual.chromatics' })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 파일 저장' }))
    await waitFor(() => expect(status).toHaveTextContent('manual.chromatics에 저장했습니다.'))
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    expect(screen.queryByRole('group', { name: '자동저장 기술 정보' })).not.toBeInTheDocument()
    expect(preview).toHaveAttribute('data-event-pitches', pitches)
    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(screen.getByRole('note', { name: '첫 입력 안내' })).toBeInTheDocument()
    expect(status).toHaveTextContent('0회 수정')
  })

  it.each(['new-score', 'native-open'] as const)('studio.recovery-feedback ignores late startup recent-list failure after %s', async replacement => {
    let fail!: (error: Error) => void
    vi.mocked(window.inC.recentMusicXml.list).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const { App } = await import('./App'); render(<App />)
    await waitFor(() => expect(window.inC.recentMusicXml.list).toHaveBeenCalledOnce())
    if (replacement === 'new-score') {
      fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
      fireEvent.click(within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole('button', { name: '만들기' }))
    } else {
      const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
      const incoming = createNativeProject({ ...demoScore, title: '최근 응답보다 새 문서' })
      vi.mocked(window.inC.project.open).mockResolvedValueOnce({ filePath: '/fixture/current.chromatics', fileName: 'current.chromatics', contents: encodeNativeProject(incoming) })
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('최근 응답보다 새 문서')
    }
    const status = screen.getByRole('status', { name: '편집 및 파일 상태' }), before = status.textContent
    const preview = screen.getByTestId('notation-preview'), selected = preview.getAttribute('data-selected-event-id')
    await act(async () => fail(new Error('QA obsolete startup list error')))
    expect(status).toHaveTextContent(before!)
    expect(screen.queryByText(/QA obsolete startup list error/)).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '최근 악보 목록 기술 정보' })).not.toBeInTheDocument()
    expect(preview).toHaveAttribute('data-selected-event-id', selected)
  })

  it.each(['success', 'failure'] as const)('ignores late startup recovery %s after opening another document', async outcome => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    let finish!: (snapshot: Awaited<ReturnType<typeof window.inC.autosave.read>>) => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.read).mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject }))
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/new.chromatics', fileName: 'new.chromatics', contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    await act(async () => {
      if (outcome === 'success') finish({ score: project.score, project, metadata: { title: 'Previous session', updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
      else fail(new Error('Stale recovery read'))
    })
    expect(screen.queryByRole('dialog', { name: '자동저장 복구' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Stale recovery read/)).not.toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(screen.getByText('Expanded Part Export')).toBeInTheDocument()
  })

  it.each(['success', 'failure'] as const)('keeps a confirmed new score after late startup recovery %s', async outcome => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.score.title = 'Previous recovery'
    let finish!: (snapshot: Awaited<ReturnType<typeof window.inC.autosave.read>>) => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.read).mockReturnValue(new Promise((resolve, reject) => { finish=resolve; fail=reject }))
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    const wizard=within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
    fireEvent.change(wizard.getByRole('textbox', { name: '제목' }), { target: { value: 'Current confirmed score' } })
    fireEvent.click(wizard.getByRole('button', { name: '만들기' }))
    const current=structuredClone(playbackMockState.lastScore)
    const address=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    await act(async () => {
      if(outcome==='success')finish({ score: project.score, project,
        metadata: { title: 'Previous recovery', updatedAt: '2026-10-27T00:00:00Z', version: 'test' } })
      else fail(new Error('Old startup recovery failure'))
    })
    expect(playbackMockState.lastScore).toEqual(current)
    expect(screen.getByRole('button', { name: '악보 제목 수정' })).toHaveTextContent('Current confirmed score')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',address!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(screen.queryByRole('dialog', { name: '자동저장 복구' })).toBeNull()
    expect(screen.queryByText(/Old startup recovery failure|Previous recovery/)).toBeNull()
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const { decodeNativeProject } = await import('../../project/schema')
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(current)
  })

  it('native recovery restores portable settings and autosaves the whole envelope', async () => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Recovery piano', layout: { pageSetup: { staffSizePercent: 90 } } }]
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await screen.findByText('프로젝트 복구본을 열었습니다. 새 파일로 저장해 주세요.')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalled(), { timeout: 3000 })
    expect(vi.mocked(window.inC.autosave.write).mock.calls.at(-1)![0].project).toMatchObject({ view: project.view, partLayouts: [{ partId: 'P2', title: 'Recovery piano' }] })
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(vi.mocked(window.inC.project.save).mock.calls[0]![0]).not.toHaveProperty('filePath')
    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  })

  it('native backup recovery preserves portable state and requires a new save path', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Recovered piano', layout: { pageSetup: { pageSize: 'letter' } } }]
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([
      { id: 'good.chromatics', fileName: 'good.chromatics', title: 'Backup piano', updatedAt: '2026-09-13T00:00:00Z' },
      { id: 'bad.chromatics', fileName: 'bad.chromatics', error: 'Invalid JSON', updatedAt: '' }
    ])
    vi.mocked(window.inC.project.readBackup).mockResolvedValue({ contents: encodeNativeProject(project) })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 백업' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 백업' })
    expect(dialog.tagName).toBe('DIALOG');expect(dialog).toHaveClass('dd-dialog')
    expect(await within(dialog).findByRole('button', { name: 'bad.chromatics 복구' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Backup piano 복구' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '프로젝트 백업' })).not.toBeInTheDocument())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'P2:Piano:2')
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const input = vi.mocked(window.inC.project.save).mock.calls[0]![0]
    expect(input).not.toHaveProperty('filePath')
    expect(decodeNativeProject(input.contents)).toMatchObject({ view: project.view, partLayouts: [{ partId: 'P2', title: 'Recovered piano' }] })
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
  })

  it.each(['empty','error'] as const)('studio.backups public loading and %s keep cancellation and focus', async state => {
    let resolve!: (entries:never[])=>void, reject!: (error:Error)=>void
    vi.mocked(window.inC.project.listBackups).mockReturnValue(new Promise((a,b)=>{resolve=a;reject=b}))
    const {App}=await import('./App');render(<App />)
    const trigger=screen.getByRole('button',{name:'프로젝트 백업'});trigger.focus();fireEvent.click(trigger)
    const dialog=screen.getByRole('dialog',{name:'프로젝트 백업'}),q=within(dialog)
    expect(q.getByRole('status')).toHaveTextContent('불러오는 중')
    await act(async()=>{if(state==='error')reject(new Error('QA unavailable'));else resolve([])})
    if(state==='error') {
      expect(q.getByRole('alert')).toHaveClass('dd-banner')
      expect(q.getByText('QA unavailable')).not.toBeVisible()
      fireEvent.click(q.getByRole('button',{name:'기술 정보'}))
      expect(q.getByText('QA unavailable')).toBeVisible()
    } else expect(q.getByText('백업 없음')).toHaveClass('dd-text')
    fireEvent.click(q.getByRole('button',{name:'닫기'}))
    await waitFor(()=>expect(trigger).toHaveFocus())
    expect(window.inC.project.readBackup).not.toHaveBeenCalled()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it('studio.r3 a queued pre-recovery keyboard handler saves the current portable snapshot', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const project=createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.view={mode:'part',partId:'P2'}
    project.partLayouts=[{partId:'P2',title:'Queued recovery piano',layout:{}}]
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([{id:'queued',fileName:'queued.chromatics',title:'Queued backup',updatedAt:''}])
    vi.mocked(window.inC.project.readBackup).mockResolvedValue({contents:encodeNativeProject(project)})
    const listeners=vi.spyOn(window,'addEventListener')
    const {App}=await import('./App')
    render(<App />)
    const queued=listeners.mock.calls.find(([type])=>type==='keydown')![1] as EventListener
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 백업'}))
    fireEvent.click(await screen.findByRole('button',{name:'Queued backup 복구'}))
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'프로젝트 백업'})).not.toBeInTheDocument())
    act(()=>queued(new KeyboardEvent('keydown',{key:'s',code:'KeyS',ctrlKey:true,cancelable:true})))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved).toMatchObject({view:project.view,partLayouts:[{partId:'P2',title:'Queued recovery piano'}]})
    expect(saved.score).toEqual(project.score)
  })

  it('closing backup selection cancels a pending restore without replacing the score', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    vi.mocked(window.inC.project.listBackups).mockResolvedValue([{ id: 'backup', fileName: 'backup.chromatics', title: 'Old backup', updatedAt: '' }])
    let finish!: (result: { contents: string }) => void
    vi.mocked(window.inC.project.readBackup).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    screen.getByRole('button', { name: '프로젝트 백업' }).focus()
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 백업' }))
    const dialog = screen.getByRole('dialog', { name: '프로젝트 백업' })
    fireEvent.click(await within(dialog).findByRole('button', { name: 'Old backup 복구' }))
    await waitFor(() => expect(window.inC.project.readBackup).toHaveBeenCalledOnce())
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await act(async () => { finish({ contents: encodeNativeProject(project) }) })
    expect(screen.queryByText('Expanded Part Export')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '프로젝트 백업' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '프로젝트 백업' })).toHaveFocus()
  })

  it('ignores a late autosave failure after a newer edit has been saved', async () => {
    window.history.replaceState({}, '', '/')
    const { createNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    vi.mocked(window.inC.autosave.read).mockResolvedValue({ score: project.score, project, metadata: { title: project.score.title, updatedAt: '2026-09-13T00:00:00Z', version: 'test' } })
    let fail!: (error: Error) => void
    vi.mocked(window.inC.autosave.write).mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: /복구본 열기/ }))
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalledTimes(1), { timeout: 3000 })
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Newer autosave' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    await waitFor(() => expect(window.inC.autosave.write).toHaveBeenCalledTimes(2), { timeout: 3000 })
    await act(async () => { fail(new Error('Old autosave failed')) })
    expect(screen.queryByText(/Old autosave failed/)).not.toBeInTheDocument()
    expect(vi.mocked(window.inC.autosave.write).mock.calls[1]![0].project?.score.title).toBe('Newer autosave')
  })

  it.each([
    ['native', false], ['native', true], ['xml', false], ['xml', true]
  ] as const)('%s cleanup preserves only dirty recovery after switching documents (dirty=%s)', async (format, dirty) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    project.partLayouts = [{ partId: 'P2', title: 'Portable piano', layout: {} }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/new.chromatics', fileName: 'new.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/old.chromatics', fileName: 'old.chromatics' })
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ filePath: '/scores/old.musicxml', fileName: 'old.musicxml' })
    let finishClear!: () => void
    vi.mocked(window.inC.autosave.clear).mockImplementationOnce(() => new Promise(resolve => { finishClear = resolve }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    const save = screen.getByRole('button', { name: format === 'native' ? '프로젝트 저장' : 'MusicXML로 저장' })
    fireEvent.click(save)
    await waitFor(() => expect(window.inC.autosave.clear).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    if (dirty) {
      fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
      fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'New document edit' } })
      fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    }
    await act(async () => { finishClear() })
    await waitFor(() => expect(save).toBeEnabled())
    if (dirty) {
      expect(vi.mocked(window.inC.autosave.write).mock.calls.at(-1)?.[0]).toMatchObject({
        score: { title: 'New document edit' },
        project: { score: { title: 'New document edit' }, partLayouts: project.partLayouts }
      })
    } else {
      expect(window.inC.autosave.write).not.toHaveBeenCalled()
    }
    expect(screen.queryByText(/old\.(chromatics|musicxml)에 저장했습니다/)).not.toBeInTheDocument()
  })

  it('native save preserves edits made while awaiting disk and prevents duplicate submissions', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    let finish!: (value: { filePath: string; fileName: string }) => void
    vi.mocked(window.inC.project.save).mockReturnValue(new Promise(resolve => { finish = resolve }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    const button = screen.getByRole('button', { name: '프로젝트 저장' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Native unsaved edit' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    finish({ filePath: '/scores/project.chromatics', fileName: 'project.chromatics' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText('Native unsaved edit')).toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).not.toContain('Native unsaved edit')
  })

  it('part XML export preserves grand staff voices, markings, ties, tuplets and score-wide repeats', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/rich.musicxml', fileName: 'rich.musicxml', contents: richPartExportMusicXml
    })
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
    await screen.findByText('Expanded Part Export')
    openStudioWorkspace('악보')
    chooseScoreView('악보 보기', 'part')
    chooseScoreView('파트보 선택', 'P2')
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => {
      expect(document.querySelector('.editor-status .is-error')?.textContent ?? '').toBe('')
      expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1)
    })
    const { contents } = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0]
    const piano = parseMusicXml(contents)
    expect(piano.parts.map(part => part.name)).toEqual(['Piano'])
    const staves = piano.parts[0]!.staves
    expect(staves).toHaveLength(2)
    expect(staves[0]!.measures[0]!.voices).toHaveLength(2)
    expect(staves[0]!.measures[0]!.voices[1]!.events[0]).toMatchObject({ type: 'rest', fullMeasure: true })
    expect(staves[0]!.measures[0]!.voices[0]!.events[0]).toMatchObject({
      type: 'note', pitches: [{ step: 'C', octave: 4 }, { step: 'E', octave: 4 }],
      articulations: ['tenuto'], lyrics: [{ text: 'Sing' }]
    })
    expect(staves[0]!.measures[1]!.voices[0]!.tuplets).toHaveLength(1)
    expect(staves[1]!.measures[0]!.voices[0]!.events[0]).toMatchObject({ ties: { start: true } })
    expect(piano.hairpins).toHaveLength(1)
    expect(piano.slurs).toHaveLength(1)
    expect(piano.harmonies).toHaveLength(1)
    expect(piano.dynamics?.map(mark => mark.value)).toEqual(['p', 'mp'])
    expect(piano.staffTexts?.find(mark => mark.text === 'Left hand')?.measureId).toBe(staves[1]!.measures[0]!.id)
    expect(piano.tempoEvents?.some(event => event.bpm === 108)).toBe(true)
    expect(contents).not.toContain('Clarinet only')
    expect(piano.rehearsalMarks?.map(mark => mark.text)).toContain('A')
    expect(staves[0]!.measures[0]!.repeat?.start).toBe(true)
    expect(staves[0]!.measures[1]!.repeat).toMatchObject({ end: true, times: 2 })
    openStudioWorkspace('악보')
    chooseScoreView('파트보 선택', 'P1')
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 내보내기' }))
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
    const clarinet = parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[1]![0].contents)
    expect(clarinet.parts[0]!.staves[0]!.measures[0]!.transposition).toMatchObject({ diatonic: -1, chromatic: -2 })
  })

  it.each((['project','xml','copy'] as const).flatMap(kind=>(['cancel','failure','success'] as const).map(outcome=>({kind,outcome}))))('studio.file-focus-return restores the owned $kind control after $outcome', async ({kind,outcome}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    const operation=kind==='project'?vi.mocked(window.inC.project.save):kind==='xml'?vi.mocked(window.inC.musicXml.save):vi.mocked(window.inC.musicXml.exportCopy)
    operation.mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    const {App}=await import('./App');render(<App />);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview'),selected=preview.getAttribute('data-selected-event-id')
    openStudioWorkspace(kind==='copy'?'내보내기':'파일')
    const button=screen.getByRole('button',{name:kind==='project'?'프로젝트 저장':kind==='xml'?'MusicXML로 저장':'MusicXML 내보내기'})
    button.focus();fireEvent.click(button);await waitFor(()=>expect(operation).toHaveBeenCalledOnce());expect(button).toBeDisabled()
    // jsdom does not perform Chromium's disabled-button blur. Model that part
    // explicitly; the production native probe supplies the independent red.
    focusTestBody();expect(document.activeElement).toBe(document.body)
    try{
      await act(async()=>{settled=true;if(outcome==='failure')fail(new Error('owned focus IO failure'));else finish(outcome==='cancel'?null:{filePath:'/fixture/focused.'+(kind==='project'?'chromatics':'musicxml'),fileName:'focused.'+(kind==='project'?'chromatics':'musicxml')})})
      await waitFor(()=>expect(button).toBeEnabled());await waitFor(()=>expect(button).toHaveFocus())
      expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected)
      expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('1회 수정')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(outcome==='success'&&kind!=='copy'?'변경 없음':'저장하지 않은 변경')
      expect(operation).toHaveBeenCalledOnce()
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['project-first','copy-first'] as const)('studio.file-focus-return keeps the newest live trigger during %s simultaneous completion', async order => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let endProject!:(result:null)=>void,endCopy!:(result:null)=>void,settled=false
    vi.mocked(window.inC.project.save).mockImplementationOnce(()=>new Promise(resolve=>{endProject=resolve}))
    vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise(resolve=>{endCopy=resolve}))
    const {App}=await import('./App');render(<App />);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!)
    const startProject=()=>{openStudioWorkspace('파일');const button=screen.getByRole('button',{name:'프로젝트 저장'});button.focus();fireEvent.click(button);focusTestBody();return button}
    const startCopy=()=>{openStudioWorkspace('내보내기');const button=screen.getByRole('button',{name:'MusicXML 내보내기'});button.focus();fireEvent.click(button);focusTestBody();return button}
    let latest:HTMLElement
    if(order==='project-first'){startProject();latest=startCopy()}else{startCopy();latest=startProject()}
    await waitFor(()=>{expect(window.inC.project.save).toHaveBeenCalledOnce();expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce()})
    try{
      // Resolve the newest control first, then the now-disconnected old one in
      // the same React batch. An invalid old request must not replace it.
      await act(async()=>{settled=true;if(order==='project-first'){endCopy(null);endProject(null)}else{endProject(null);endCopy(null)}})
      await waitFor(()=>expect(latest).toBeEnabled());await waitFor(()=>expect(latest).toHaveFocus())
      expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('1회 수정');expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    }finally{if(!settled)await act(async()=>{endProject(null);endCopy(null)})}
  })

  it.each(['project','xml','copy'] as const)('studio.file-focus-return preserves a newer composing field after %s completion', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,settled=false
    const operation=kind==='project'?vi.mocked(window.inC.project.save):kind==='xml'?vi.mocked(window.inC.musicXml.save):vi.mocked(window.inC.musicXml.exportCopy)
    operation.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const {App}=await import('./App');render(<App />);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace(kind==='copy'?'내보내기':'파일')
    const button=screen.getByRole('button',{name:kind==='project'?'프로젝트 저장':kind==='xml'?'MusicXML로 저장':'MusicXML 내보내기'})
    button.focus();fireEvent.click(button);await waitFor(()=>expect(operation).toHaveBeenCalledOnce());focusTestBody()
    try{
      openStudioWorkspace('음표');const input=screen.getByRole('textbox',{name:'선택 요약 보표 글자'}),original=(input as HTMLInputElement).value
      input.focus();fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'조합 중인 초안'}})
      await act(async()=>{settled=true;finish({filePath:'/fixture/kept.musicxml',fileName:'kept.musicxml'})})
      expect(input).toHaveFocus();expect(input).toHaveValue('조합 중인 초안');expect(playbackMockState.lastScore).toEqual(score)
      fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Escape',code:'Escape'});fireEvent.blur(input)
      expect(input).toHaveValue(original);expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('1회 수정')
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['project','xml','copy'] as const)('studio.file-focus-return rejects the old %s trigger after document replacement', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test');vi.spyOn(window,'confirm').mockReturnValue(true)
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,settled=false
    const operation=kind==='project'?vi.mocked(window.inC.project.save):kind==='xml'?vi.mocked(window.inC.musicXml.save):vi.mocked(window.inC.musicXml.exportCopy)
    operation.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const {App}=await import('./App');render(<App />);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    openStudioWorkspace(kind==='copy'?'내보내기':'파일')
    const button=screen.getByRole('button',{name:kind==='project'?'프로젝트 저장':kind==='xml'?'MusicXML로 저장':'MusicXML 내보내기'})
    button.focus();fireEvent.click(button);await waitFor(()=>expect(operation).toHaveBeenCalledOnce());focusTestBody()
    try{
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
      const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}));fireEvent.change(wizard.getByRole('textbox',{name:'제목'}),{target:{value:'새 포커스 문서'}});fireEvent.click(wizard.getByRole('button',{name:'만들기'}))
      const score=structuredClone(playbackMockState.lastScore!);focusTestBody()
      await act(async()=>{settled=true;finish({filePath:'/fixture/previous.musicxml',fileName:'previous.musicxml'})})
      expect(button).not.toHaveFocus();expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
      expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).not.toHaveTextContent('previous.musicxml')
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['cancel','failure','success'] as const)('studio.xml-copy-progress distinguishes retry from the previous result through %s', async outcome => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!),preview=screen.getByTestId('notation-preview'),selected=preview.getAttribute('data-selected-event-id')
    const raw='EACCES /owned-qa/previous-copy.musicxml',nextRaw='EIO /owned-qa/next-copy.musicxml'
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    vi.mocked(window.inC.musicXml.exportCopy).mockRejectedValueOnce(new Error(raw)).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    openStudioWorkspace('내보내기');const button=screen.getByRole('button',{name:'MusicXML 내보내기'}),status=screen.getByRole('status',{name:'편집 및 파일 상태'})
    fireEvent.click(button);await waitFor(()=>expect(status).toHaveTextContent('MusicXML 사본 내보내기를 마무리하지 못했습니다.'));await waitFor(()=>expect(button).toBeEnabled())
    try{
      fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
      expect(status).toHaveTextContent('MusicXML 사본을 내보내는 중입니다.')
      expect(status.querySelector('.is-error')).not.toBeInTheDocument();expect(screen.queryByRole('group',{name:'MusicXML 내보내기 기술 정보'})).not.toBeInTheDocument()
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(status).toHaveTextContent('1회 수정')
      expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected)
      await act(async()=>{settled=true;if(outcome==='failure')fail(new Error(nextRaw));else finish(outcome==='cancel'?null:{filePath:'/export/copied.musicxml',fileName:'copied.musicxml'})})
      await waitFor(()=>expect(button).toBeEnabled());expect(status).not.toHaveTextContent('MusicXML 사본을 내보내는 중입니다.')
      if(outcome==='success')expect(status).toHaveTextContent('copied.musicxml')
      else{expect(status).toHaveTextContent('MusicXML 사본 내보내기를 마무리하지 못했습니다.');expect(within(screen.getByRole('group',{name:'MusicXML 내보내기 기술 정보'})).getByText(outcome==='failure'?nextRaw:raw)).not.toBeVisible()}
      expect(playbackMockState.lastScore).toEqual(score);expect(preview).toHaveAttribute('data-selected-event-id',selected);expect(status).toHaveTextContent('1회 수정')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['success','failure'] as const)('studio.xml-copy-progress isolates the previous document through late %s', async outcome => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    const {App}=await import('./App');render(<App />);openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    try{
      const status=screen.getByRole('status',{name:'편집 및 파일 상태'})
      expect(status).toHaveTextContent('MusicXML 사본을 내보내는 중입니다.')
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
      const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}));fireEvent.change(wizard.getByRole('textbox',{name:'제목'}),{target:{value:'다음 사본 문서'}});fireEvent.click(wizard.getByRole('button',{name:'만들기'}))
      const score=structuredClone(playbackMockState.lastScore!)
      expect(status).toHaveTextContent('새 악보를 만들었습니다.');expect(status).not.toHaveTextContent('내보내는 중')
      await act(async()=>{settled=true;if(outcome==='failure')fail(new Error('older copy failure'));else finish({filePath:'/export/old-copy.musicxml',fileName:'old-copy.musicxml'})})
      expect(playbackMockState.lastScore).toEqual(score);expect(status).toHaveTextContent('새 악보를 만들었습니다.');expect(status).not.toHaveTextContent(/old-copy|older copy|내보내는 중/)
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each((['project-first','copy-first'] as const).flatMap(order=>(['project','copy'] as const).map(completes=>({order,completes}))))('studio.xml-copy-progress exposes newer $completes errors with $order concurrency', async ({order,completes}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let endProject!:(result:null)=>void,failProject!:(error:Error)=>void,endCopy!:(result:null)=>void,failCopy!:(error:Error)=>void,settled=false
    vi.mocked(window.inC.project.save).mockImplementationOnce(()=>new Promise((resolve,reject)=>{endProject=resolve;failProject=reject}))
    vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise((resolve,reject)=>{endCopy=resolve;failCopy=reject}))
    const {App}=await import('./App');render(<App />);fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const score=structuredClone(playbackMockState.lastScore!)
    const startProject=()=>{openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))}
    const startCopy=()=>{openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))}
    if(order==='project-first'){startProject();startCopy()}else{startCopy();startProject()}
    await waitFor(()=>{expect(window.inC.project.save).toHaveBeenCalledOnce();expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce()})
    try{
      const status=screen.getByRole('status',{name:'편집 및 파일 상태'})
      expect(status).toHaveTextContent('프로젝트를 저장하는 중입니다.');expect(status).toHaveTextContent('MusicXML 사본을 내보내는 중입니다.')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장 중')
      await act(async()=>{if(completes==='project')failProject(new Error('current project error'));else failCopy(new Error('current copy error'))})
      const summary=completes==='project'?'프로젝트 저장을 마무리하지 못했습니다.':'MusicXML 사본 내보내기를 마무리하지 못했습니다.'
      expect(status).toHaveTextContent(summary);expect(status).not.toHaveTextContent('내보내는 중');expect(status).not.toHaveTextContent('저장하는 중')
      expect(document.querySelector('.studio-document__state')).toHaveTextContent(completes==='project'?'저장하지 않은 변경':'저장 중')
      await act(async()=>{settled=true;if(completes==='project')endCopy(null);else endProject(null)})
      expect(status).toHaveTextContent(summary);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
      expect(playbackMockState.lastScore).toEqual(score);expect(status).toHaveTextContent('1회 수정');expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    }finally{if(!settled)await act(async()=>{endProject(null);endCopy(null)})}
  })

  it.each((['score','part'] as const).flatMap(view=>(['retry','cancel','replace-success','replace-failure'] as const).map(action=>({view,action}))))('studio.xml-copy-feedback preserves the $view source through $action', async ({view,action}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const initial=parseMusicXml(twoPartMusicXmlWithPrimaryAnnotations)
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(createNativeProject(initial))})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(initial.title)
    fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}))
    fireEvent.change(screen.getByLabelText('악보 제목'),{target:{value:'원본 편집 유지'}});fireEvent.keyDown(screen.getByLabelText('악보 제목'),{key:'Enter',code:'Enter'})
    if(view==='part'){openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','P2')}
    const score=structuredClone(playbackMockState.lastScore!),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    vi.mocked(window.inC.autosave.clear).mockClear();vi.mocked(window.inC.recentMusicXml.add).mockClear()
    const raw="Error invoking musicxml:export: EACCES /owned-qa/Private-copy.musicxml",summary='MusicXML 사본 내보내기를 마무리하지 못했습니다.'
    vi.mocked(window.inC.musicXml.exportCopy).mockRejectedValueOnce(new Error(raw))
    openStudioWorkspace('내보내기');const button=screen.getByRole('button',{name:'MusicXML 내보내기'}),status=screen.getByRole('status',{name:'편집 및 파일 상태'})
    fireEvent.click(button);await waitFor(()=>expect(status).toHaveTextContent(summary));await waitFor(()=>expect(button).toBeEnabled())
    expect(status).toHaveTextContent('원본 악보와 변경 사항은 유지됩니다.');expect(status).not.toHaveTextContent(raw)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(status).toHaveTextContent('1회 수정')
    const technical=screen.getByRole('group',{name:'MusicXML 내보내기 기술 정보'});expect(status).not.toContainElement(technical)
    const disclosure=within(technical).getByRole('button',{name:'기술 정보'})
    expect(within(technical).getByText(raw)).not.toBeVisible();fireEvent.keyDown(disclosure,{key:'Enter',code:'Enter'});fireEvent.click(disclosure)
    expect(within(technical).getByText(raw)).toBeVisible();fireEvent.keyDown(disclosure,{key:' ',code:'Space'});fireEvent.click(disclosure)
    expect(disclosure).toHaveAttribute('aria-expanded','false');expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    let finish!:(value:{filePath:string;fileName:string}|null)=>void,fail!:(error:Error)=>void,settled=false
    vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    fireEvent.click(button);fireEvent.click(button);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(2))
    expect(button).toBeDisabled()
    let expected=score,expectedPath='/scores/source.chromatics'
    try{
      if(action.startsWith('replace')){
        expected={...initial,title:'다른 사본 문서'};expectedPath='/scores/new.chromatics'
        vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:expectedPath,fileName:'new.chromatics',contents:encodeNativeProject(createNativeProject(expected))})
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(expected.title);await act(async()=>{})
      }
      const clears=vi.mocked(window.inC.autosave.clear).mock.calls.length,recents=vi.mocked(window.inC.recentMusicXml.add).mock.calls.length
      await act(async()=>{settled=true;if(action==='replace-failure')fail(new Error('older XML export failure'));else finish(action==='cancel'?null:{filePath:'/export/copy.musicxml',fileName:'copy.musicxml'})})
      expect(playbackMockState.lastScore).toEqual(expected)
      expect(window.inC.autosave.clear).toHaveBeenCalledTimes(clears);expect(window.inC.recentMusicXml.add).toHaveBeenCalledTimes(recents)
      if(action.startsWith('replace')){expect(status).not.toHaveTextContent(/copy.musicxml|older XML export failure/);expect(screen.queryByRole('group',{name:'MusicXML 내보내기 기술 정보'})).not.toBeInTheDocument()}
      else{
        expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(status).toHaveTextContent('1회 수정');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selected)
        if(action==='cancel'){expect(status).toHaveTextContent(summary);expect(within(screen.getByRole('group',{name:'MusicXML 내보내기 기술 정보'})).getByText(raw)).not.toBeVisible()}
        else{expect(status).toHaveTextContent('copy.musicxml');expect(screen.queryByRole('group',{name:'MusicXML 내보내기 기술 정보'})).not.toBeInTheDocument()}
      }
      const requests=vi.mocked(window.inC.musicXml.exportCopy).mock.calls.map(([request])=>request)
      expect(requests[0]).not.toHaveProperty('filePath');expect(requests[1].contents).toBe(requests[0].contents)
      const exported=parseMusicXml(requests[0].contents);expect(exported.parts.map(part=>part.name)).toEqual(view==='part'?['Cello']:['Violin','Cello'])
      openStudioWorkspace('파일');vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:expectedPath,fileName:'saved.chromatics'})
      fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalled())
      const native=vi.mocked(window.inC.project.save).mock.calls.at(-1)![0];expect(native.filePath).toBe(expectedPath);expect(decodeNativeProject(native.contents).score).toEqual(expected)
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['success', 'cancel', 'failure'] as const)('part XML export preserves edits while pending (%s)', async outcome => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    let finish!: (result: { filePath: string; fileName: string } | null) => void
    let fail!: (error: Error) => void
    vi.mocked(window.inC.musicXml.exportCopy).mockReturnValue(new Promise((resolve, reject) => {
      finish = resolve
      fail = reject
    }))
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('내보내기')
    const button = screen.getByRole('button', { name: 'MusicXML 내보내기' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    expect(button).toBeDisabled()
    const snapshot = vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0]![0].contents
    fireEvent.click(screen.getByRole('button', { name: '악보 제목 수정' }))
    fireEvent.change(screen.getByLabelText('악보 제목'), { target: { value: 'Edited during export' } })
    fireEvent.keyDown(screen.getByLabelText('악보 제목'), { key: 'Enter' })
    expect(snapshot).not.toContain('Edited during export')
    if (outcome === 'failure') fail(new Error('export disk failure'))
    else finish(outcome === 'cancel' ? null : { filePath: '/export/part.xml', fileName: 'part.xml' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText('Edited during export')).toBeInTheDocument()
    expect(window.inC.autosave.clear).not.toHaveBeenCalled()
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
    if (outcome === 'failure') {
      expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).toHaveTextContent('MusicXML 사본 내보내기를 마무리하지 못했습니다.')
      expect(screen.getByRole('status',{name:'편집 및 파일 상태'})).not.toHaveTextContent('export disk failure')
      expect(within(screen.getByRole('group',{name:'MusicXML 내보내기 기술 정보'})).getByText('export disk failure')).not.toBeVisible()
    }
    if (outcome === 'success') expect(screen.getByText(/내보내기 시작 이후의 수정 내용은 포함되지 않았습니다/)).toBeInTheDocument()
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const primary = vi.mocked(window.inC.musicXml.save).mock.calls[0]![0]
    expect(primary).not.toHaveProperty('filePath')
    expect(primary.contents).toContain('Edited during export')
  })

  it('layout.live-part-view restores the saved MusicXML part view preference on reopen', async () => {
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/quartet.musicxml',
      fileName: 'quartet.musicxml',
      openedAt: '2026-09-02T00:00:00.000Z'
    }
    vi.mocked(window.inC.musicXml.save).mockImplementation(async (input) => {
      savedContents = input.contents

      return {
        filePath: savedFile.filePath,
        fileName: savedFile.fileName
      }
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([savedFile])

    const { App } = await import('./App')
    const { unmount } = render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('string-quartet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    openStudioWorkspace('악보')
    chooseScoreView('악보 보기', 'part')
    chooseScoreView('파트보 선택', 'cello')

    await waitFor(() =>
      expect(screen.getByText('파트보: Cello')).toBeInTheDocument()
    )

    openStudioWorkspace('내보내기')
    choosePageSetup('PDF 설정 프리셋', '컴팩트 파트보')
    expect(
      screen.getByText('Cello 파트보 PDF 페이지 설정을 갱신했습니다.')
    ).toBeInTheDocument()

    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalled()
      expect(savedContents).toContain('<score-partwise')
    })
    expect(
      window.localStorage.getItem('chromatics.musicxml-view-state.v1')
    ).toContain('"partId":"cello"')
    expect(
      window.localStorage.getItem('chromatics.part-page-setup.v1')
    ).toContain('"cello":{"pageSize":"a4","orientation":"portrait","pageMarginMm":6')

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      filePath: savedFile.filePath,
      fileName: savedFile.fileName,
      contents: savedContents
    })

    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: /quartet\.musicxml/ })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'cello:Cello:1'
      )
      expect(screen.getByText('파트보: Cello')).toBeInTheDocument()
    })

    openStudioWorkspace('내보내기')
    expect(screen.getByLabelText('PDF 설정 프리셋')).toHaveTextContent('컴팩트 파트보')
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-page-margin-mm',
      '6'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '90'
    )
  })

  it('score-setup.edit-active-part-label updates the selected part metadata', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('duet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))
    openStudioWorkspace('악보')

    const partName = screen.getByLabelText('현재 파트 이름')
    fireEvent.change(partName, { target: { value: 'Lead' } })
    fireEvent.blur(partName)

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'part-1:Lead:1|part-2:Part 2:1'
      )
    })
  })

  it('score-setup.edit-score-structure adds and removes parts and staves', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:1'
      )
      expectStaffTarget('violin:staff-1')
    })

    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '보표 추가' }))

    await waitFor(() => {
      expectStaffTarget('violin:staff-2')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:2'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('violin:staff-2:F4:2')
      )
    })

    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '보표 삭제' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|violin:바이올린:1'
      )
    })

    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1'
      )
      expectStaffTarget('piano:piano-staff')
    })
  })

  it('score-setup.add-instrument-library-part creates preset staves and clefs', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('악보')
    choosePartSetup('추가할 악기', 'cello')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|cello:첼로:1'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('cello:staff-1:F4:2')
      )
      expectStaffTarget('cello:staff-1')
      expect(
        screen.getByText('첼로 파트를 악기 라이브러리에서 추가했습니다.')
      ).toBeInTheDocument()
    })

    openStudioWorkspace('악보')
    choosePartSetup('추가할 악기', 'piano')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'piano:피아노:1|cello:첼로:1|piano-2:피아노 2:2'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('piano-2:staff-1:G2:2')
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-staff-clefs',
        expect.stringContaining('piano-2:staff-2:F4:2')
      )
      expectStaffTarget('piano-2:staff-1')
    })
  })

  it.each([
    ['reorder', 'ordinal'], ['remove', 'ordinal'], ['reorder', 'concrete'], ['remove', 'concrete']
  ] as const)('native independent part layout and global directions survive %s with %s anchors', async (action, reference) => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(richPartExportMusicXml))
    if (reference === 'concrete') {
      project.score.tempoEvents = project.score.tempoEvents?.map(mark => ({ ...mark, measureId: project.score.parts[0]!.staves[0]!.measures[1]!.id }))
      project.score.rehearsalMarks = project.score.rehearsalMarks?.map(mark => ({ ...mark, measureId: project.score.parts[0]!.staves[0]!.measures[0]!.id }))
    }
    project.view = { mode: 'part', partId: 'P2' }
    project.partLayouts = [{ partId: 'P2', title: 'Piano rehearsal', layout: { pageBreakBeforeMeasureIds: [project.score.parts[1]!.staves[0]!.measures[1]!.id], pageSetup: { pageMarginMm: 17 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/linked.chromatics', fileName: 'linked.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/linked.chromatics', fileName: 'linked.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Expanded Part Export')
    openStudioWorkspace('악보')
    chooseStaffTarget(action === 'reorder' ? 'P2:P2-staff-1' : 'P1:P1-staff-1')
    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: action === 'reorder' ? '파트 위로 이동' : '파트 삭제' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts.map(part => part.id)).toEqual(action === 'reorder' ? ['P2', 'P1'] : ['P2'])
    expect(saved.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
    expect(saved.score.tempoEvents).toEqual(project.score.tempoEvents?.map(mark => ({ ...mark, measureId: action === 'remove' && reference === 'concrete' ? 'measure-2' : mark.measureId })))
    expect(saved.score.rehearsalMarks).toEqual(project.score.rehearsalMarks?.map(mark => ({ ...mark, measureId: action === 'remove' && reference === 'concrete' ? 'measure-1' : mark.measureId })))
    const { createPlaybackTimeline } = await import('./playback/timeline')
    expect(createPlaybackTimeline(saved.score).totalBeats).toBe(createPlaybackTimeline(project.score).totalBeats)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const restored = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(restored.score).toEqual(project.score)
    expect(restored.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
  })

  it('score-setup.part-order reorders without losing part identity, notes or undo', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('악보')
    expect(screen.getByRole('button', { name: '파트 위로 이동' })).toBeDisabled()
    choosePartSetup('추가할 악기', 'clarinet')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    openStudioWorkspace('악보')
    expect(screen.getByRole('button', { name: '파트 아래로 이동' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '파트 위로 이동' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'clarinet:클라리넷:1|piano:피아노:1')
    expect(screen.getByRole('combobox',{name:'현재 파트 이조'})).toHaveTextContent('B♭ (장2도 아래)')
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure', 'piano:피아노:1|clarinet:클라리넷:1')
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }))
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0].contents)
    expect(reopened.parts.map((part) => part.name)).toEqual(['클라리넷', '피아노'])
    expect(reopened.parts[1].staves[0].measures[0].voices[0].events.map((event) => event.type)).toEqual(demoScore.parts[0].staves[0].measures[0].voices[0].events.map((event) => event.type))
  })

  it('adding the same instrument after removal does not inherit the deleted part layout', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const { createNewScore } = await import('./editor/new-score')
    const project = createNativeProject(createNewScore({ title: 'Part identity', templateId: 'string-quartet', measureCount: 3, keySignature: { fifths: 0 }, timeSignature: { beats: 4, beatType: 4 } }))
    const cello = project.score.parts[3]!
    project.view = { mode: 'part', partId: cello.id }
    project.partLayouts = [{ partId: cello.id, title: 'Deleted cello layout', layout: { pageSetup: { pageMarginMm: 17 } } }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/identity.chromatics', fileName: 'identity.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/identity.chromatics', fileName: 'identity.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Part identity')
    openStudioWorkspace('악보')
    chooseStaffTarget(`${cello.id}:${cello.staves[0]!.id}`)
    openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('button', { name: '파트 삭제' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).partLayouts).toEqual([])
    openStudioWorkspace('악보')
    choosePartSetup('추가할 악기', 'cello')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    const added = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
    expect(added.score.parts.at(-1)?.id).not.toBe(cello.id)
    expect(added.partLayouts).toEqual([])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(3))
    const undone = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[2]![0].contents)
    expect(undone.score).toEqual(project.score)
    expect(undone.partLayouts[0]).toMatchObject(project.partLayouts[0]!)
  })

  it('score-setup.transposing-instrument preserves written notes and saves selected part transposition', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('악보')
    choosePartSetup('추가할 악기', 'clarinet')
    fireEvent.click(screen.getByRole('button', { name: '파트 추가' }))
    openStudioWorkspace('악보')
    expect(screen.getByRole('combobox',{name:'현재 파트 이조'})).toHaveTextContent('B♭ (장2도 아래)')
    choosePartSetup('현재 파트 이조', 'f')
    expect(screen.getByRole('combobox',{name:'현재 파트 이조'})).toHaveTextContent('F (완전5도 아래)')
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalled())
    const args = vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0]
    const reopened = parseMusicXml(args.contents)
    expect(reopened.parts[0].staves[0].measures[0].transposition).toBeUndefined()
    expect(reopened.parts[1].staves[0].measures.every((measure) => measure.transposition?.chromatic === -7)).toBe(true)
  })

  it('start-recovery.open-autosave restores the saved score metadata and events', async () => {
    const recoveredScore = {
      ...demoScore,
      title: '복구한 연습곡',
      parts: demoScore.parts.map((part, partIndex) =>
        partIndex === 0
          ? {
              ...part,
              staves: part.staves.map((staff, staffIndex) =>
                staffIndex === 0
                  ? {
                      ...staff,
                      measures: staff.measures.map((measure, measureIndex) =>
                        measureIndex === 0
                          ? {
                              ...measure,
                              keySignature: { fifths: 1, mode: 'major' as const },
                              timeSignature: { beats: 3, beatType: 4 }
                            }
                          : measure
                      )
                    }
                  : staff
              )
            }
          : part
      )
    }
    vi.mocked(window.inC.autosave.read).mockResolvedValue({
      score: recoveredScore,
      metadata: {
        title: recoveredScore.title,
        updatedAt: '2026-07-21T00:00:00.000Z',
        version: '1'
      }
    })

    const { App } = await import('./App')
    render(<App />)

    const recoveryButton = await screen.findByRole('button', {
      name: /복구본 열기/
    })
    fireEvent.click(recoveryButton)

    expect(screen.getByText('복구한 연습곡')).toBeInTheDocument()
    openStudioWorkspace('악보')
    expect(screen.getByRole('combobox',{name:'조표'})).toHaveTextContent('사장조 (♯ 1개)')
    expect(screen.getByRole('combobox',{name:'박자표'})).toHaveTextContent('3/4')
    expect(screen.getByTestId('notation-preview')).toHaveTextContent('note-c4')
  })

  it.each(['replace-success', 'replace-error', 'edit-cancel', 'edit-accept', 'layout-cancel', 'recent-error'] as const)(
    'import.picker-boundary %s preserves the current editing contract', async action => {
      window.history.replaceState({}, '', '/?fixture=release-test')
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const project = createNativeProject(parseMusicXml(richPartExportMusicXml)); project.view = { mode: 'part', partId: 'P2' }
      const next = structuredClone(project); next.score.title = '다음 가져오기 악보'
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/initial.chromatics', fileName: 'initial.chromatics', contents: encodeNativeProject(project) })
      const { App } = await import('./App'); render(<App />)
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('Expanded Part Export'); await act(async () => {})
      type Opened = NonNullable<Awaited<ReturnType<typeof window.inC.musicXml.open>>>
      let finish!: (file: Opened) => void, fail!: (error: Error) => void, failRecent!: (error: Error) => void
      const incoming = { filePath: '/scores/incoming.musicxml', fileName: 'incoming.musicxml', contents: recentMusicXml }
      if (action === 'recent-error') {
        vi.mocked(window.inC.musicXml.open).mockResolvedValue(incoming)
        vi.mocked(window.inC.recentMusicXml.add).mockImplementationOnce(() => new Promise((_resolve, reject) => { failRecent = reject }))
      } else vi.mocked(window.inC.musicXml.open).mockImplementation(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
      fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))
      await waitFor(() => expect(window.inC.musicXml.open).toHaveBeenCalledTimes(1))
      if (action === 'recent-error') await screen.findByText('MusicXML Sketch')
      const expected = structuredClone(project.score)
      if (action.startsWith('replace') || action === 'recent-error') {
        vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/next.chromatics', fileName: 'next.chromatics', contents: encodeNativeProject(next) })
        openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
        await screen.findByText('다음 가져오기 악보'); await act(async () => {})
      } else if (action === 'layout-cancel') {
        openStudioWorkspace('내보내기')
        fireEvent.change(screen.getByLabelText('PDF 여백 mm'), { target: { value: '17' } })
        fireEvent.blur(screen.getByLabelText('PDF 여백 mm'))
      } else {
        fireEvent.keyDown(window, { key: 'ArrowUp', altKey: true, shiftKey: true })
        const event = expected.parts[1]!.staves[0]!.measures[0]!.voices[0]!.events[0]!
        if (event.type !== 'note') throw Error('Expected chord')
        event.pitches = [{ step: 'D', octave: 4, alter: 0 }, { step: 'F', octave: 4, alter: 0 }]; event.pitch = event.pitches[0]!
      }
      window.confirm = vi.fn(() => action === 'edit-accept')
      const status = document.querySelector('.editor-status > span:last-child')!.textContent
      await act(async () => {
        if (action === 'recent-error') failRecent(new Error('Old recent list failed'))
        else if (action === 'replace-error') fail(new Error('Old import failed'))
        else finish(incoming)
      })
      if (action === 'edit-cancel' || action === 'edit-accept' || action === 'layout-cancel') {
        expect(window.confirm).toHaveBeenCalledWith('파일 선택 중 편집한 내용을 버리고 MusicXML을 가져올까요?')
        if (action !== 'edit-accept') expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
      } else expect(document.querySelector('.editor-status > span:last-child')).toHaveTextContent(status!)
      if (action === 'layout-cancel') expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(17)
      if (action !== 'edit-accept') expect(screen.queryByText('MusicXML Sketch')).not.toBeInTheDocument()
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      expect(saved.score).toEqual(action.startsWith('replace') || action === 'recent-error' ? next.score : action === 'edit-accept' ? parseMusicXml(recentMusicXml) : expected)
      if (action === 'layout-cancel') expect(saved.partLayouts.find(part => part.partId === 'P2')?.layout.pageSetup?.pageMarginMm).toBe(17)
      if (action === 'layout-cancel' || action === 'edit-cancel') {
        fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true }); fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
        await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
        const undone = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents)
        expect(undone.score).toEqual(project.score); expect(undone.partLayouts).toEqual(project.partLayouts)
      }
    }
  )

  it.each(['file-success', 'file-error', 'recent-error'] as const)(
    'import.recent-boundary %s from actual welcome entry preserves a newer native document', async action => {
      const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
      const next = createNativeProject(parseMusicXml(richPartExportMusicXml)); next.score.title = '최근 응답 이후 문서'; next.view = { mode: 'part', partId: 'P2' }
      const entry = { filePath: '/scores/recent.musicxml', fileName: 'recent.musicxml', openedAt: '2026-10-26T00:00:00Z' }
      vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([entry])
      vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/next.chromatics', fileName: 'next.chromatics', contents: encodeNativeProject(next) })
      type Opened = Awaited<ReturnType<typeof window.inC.recentMusicXml.open>>
      let finish!: (file: Opened) => void, fail!: (error: Error) => void, failRecent!: (error: Error) => void
      const incoming = { ...entry, contents: recentMusicXml }
      if (action === 'recent-error') {
        vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue(incoming)
        vi.mocked(window.inC.recentMusicXml.add).mockImplementationOnce(() => new Promise((_resolve, reject) => { failRecent = reject }))
      } else vi.mocked(window.inC.recentMusicXml.open).mockImplementation(() => new Promise((resolve, reject) => { finish = resolve; fail = reject }))
      const { App } = await import('./App'); render(<App />)
      fireEvent.click(await screen.findByRole('button', { name: /recent\.musicxml/ }))
      await waitFor(() => expect(window.inC.recentMusicXml.open).toHaveBeenCalledWith({ filePath: entry.filePath }))
      if (action === 'recent-error') { await screen.findByText('MusicXML Sketch'); openStudioWorkspace('파일') }
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
      await screen.findByText('최근 응답 이후 문서'); await act(async () => {})
      const status = document.querySelector('.editor-status > span:last-child')!.textContent, selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
      await act(async () => { if (action === 'recent-error') failRecent(new Error('Old recent add failed')); else if (action === 'file-error') fail(new Error('최근 파일을 찾을 수 없습니다')); else finish(incoming) })
      expect(document.querySelector('.editor-status > span:last-child')).toHaveTextContent(status!)
      expect(document.querySelector('.studio-document')).toHaveTextContent('최근 응답 이후 문서')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selected)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(screen.queryByText('MusicXML Sketch')).not.toBeInTheDocument()
      openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
      await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
      const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
      expect(saved.score).toEqual(next.score); expect(saved.view).toEqual(next.view); expect(saved.partLayouts).toEqual(next.partLayouts)
    }
  )

  it('start-recovery.reopen-recent-musicxml opens the score and requests recent-order refresh', async () => {
    const firstFile = {
      filePath: '/scores/first.musicxml',
      fileName: 'first.musicxml',
      openedAt: '2026-07-20T00:00:00.000Z'
    }
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([
      firstFile,
      selectedFile
    ])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([
      { ...selectedFile, openedAt: '2026-07-21T00:00:00.000Z' },
      firstFile
    ])

    const { App } = await import('./App')
    render(<App />)

    const recent=await screen.findByRole('button', { name: /sketch\.musicxml/ })
    expect(recent.closest('.dd-item--flat')).not.toBeNull()
    expect(recent).toHaveClass('dd-item-title')
    fireEvent.click(recent)

    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    await waitFor(() => {
      expect(window.inC.recentMusicXml.add).toHaveBeenCalledWith({
        filePath: selectedFile.filePath,
        fileName: selectedFile.fileName
      })
    })
  })

  it('import-export.unsupported-musicxml-report shows actionable warnings after import', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/external.musicxml',
      fileName: 'external.musicxml',
      contents: recentMusicXml.replace(
        '<type>quarter</type>',
        `<type>quarter</type>
        <notations>
          <technical>
            <up-bow/>
          </technical>
        </notations>`
      )
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /MusicXML 가져오기/ }))

    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    expect(
      await screen.findByText(
        /external\.musicxml을 가져왔습니다\. MusicXML 경고 1개: 경고 상세에서 보존되지 않은 연주 기법 표기를 확인해 주세요\./
      )
    ).toBeInTheDocument()
    const report = await screen.findByRole('region', {
      name: 'MusicXML 경고 상세'
    })
    expect(
      within(report).getByText('MusicXML 가져오기 경고 1개')
    ).toBeInTheDocument()
    expect(within(report).getByText('external.musicxml')).toBeInTheDocument()
    expect(within(report).getByText('1번째 파트 · 1마디 · 연주 기법 표기를 가져오지 못했습니다. 원본 악보와 비교해 주세요.')).toBeVisible()
    expect(report.closest('.studio-chrome')).toBeNull()
    expect(report.querySelector('.dd-banner--warning')).not.toBeNull()
    expect(within(report).getByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','false')
    const raw = within(report).getByText('technical playing instructions are not imported yet.')
    expect(raw).not.toBeVisible()
    fireEvent.click(within(report).getByText('기술 정보'))
    expect(raw).toBeVisible()
    expect(fireEvent.keyDown(within(report).getByText('기술 정보'),{key:' ',code:'Space'})).toBe(true)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(
      within(report).getByText('unsupported-notation · M1 · event 1')
    ).toBeInTheDocument()
    expect(
      within(report).getByText('part[1].measure[1].note[1].notations.technical')
    ).toBeInTheDocument()
    expect(
      within(report).getByText(
        'technical playing instructions are not imported yet.'
      )
    ).toBeInTheDocument()
  })

  it('import-export.unsupported-musicxml-report keeps unfamiliar ornament diagnostics inspectable', async () => {
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/ornament.musicxml',fileName:'ornament.musicxml',contents:recentMusicXml.replace('<type>quarter</type>','<type>quarter</type><notations><ornaments><inverted-turn/></ornaments></notations>')})
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button',{name:/MusicXML 가져오기/}))
    const report = within(await screen.findByRole('region',{name:'MusicXML 경고 상세'}))
    expect(report.getByText('1번째 파트 · 1마디 · 일부 표기를 가져오지 못했습니다. 원본 악보와 비교해 주세요.')).toBeVisible()
    const raw = report.getByText('inverted-turn ornament is not imported yet.')
    expect(raw).not.toBeVisible()
    expect(document.querySelector('.editor-status')).not.toHaveTextContent('notations.ornaments')
    fireEvent.click(report.getByText('기술 정보'))
    expect(raw).toBeVisible()
    expect(report.getByText('part[1].measure[1].note[1].notations.ornaments.inverted-turn')).toBeVisible()
    fireEvent.click(report.getByText('기술 정보'))
    expect(raw).not.toBeVisible()
  })

  it.each(['create','cancel','reject-dirty'] as const)('import-export.report-document-lifetime %s scopes imported diagnostics to their document', async action => {
    window.history.replaceState({}, '', '/')
    window.confirm=vi.fn(()=>true)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/warned.musicxml',fileName:'warned.musicxml',contents:recentMusicXml.replace('<type>quarter</type>','<type>quarter</type><notations><technical><up-bow/></technical></notations>')})
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:/MusicXML 가져오기/}))
    const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'})
    expect(within(report).getByText('warned.musicxml')).toBeVisible()
    const shortcutDefault = fireEvent.keyDown(window,{key:'ArrowUp',altKey:true,shiftKey:true})
    const editDiagnostic = JSON.stringify({
      action, shortcutDefault,
      eventId: screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),
      address: screen.getByTestId('notation-preview').getAttribute('data-selected-event-address'),
      status: document.querySelector('.editor-status')?.textContent,
      activeElement: document.activeElement?.outerHTML.slice(0,400),
      title: playbackMockState.lastScore?.title
    })
    expect(document.querySelector('.studio-document'), editDiagnostic).toHaveTextContent('저장하지 않은 변경')
    const before=structuredClone(playbackMockState.lastScore)
    const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    if(action==='reject-dirty')window.confirm=vi.fn(()=>false)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    if(action==='reject-dirty')expect(screen.queryByRole('dialog',{name:'새 악보 만들기'})).not.toBeInTheDocument()
    else {
      const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}))
      fireEvent.change(wizard.getByLabelText('제목'),{target:{value:'경고 없는 새 문서'}})
      fireEvent.click(wizard.getByRole('button',{name:action==='create'?'만들기':'취소'}))
    }
    if(action==='create') {
      expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
      expect(playbackMockState.lastScore?.title).toBe('경고 없는 새 문서')
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } else {
      expect(within(screen.getByRole('region',{name:'MusicXML 경고 상세'})).getByText('warned.musicxml')).toBeVisible()
      expect(playbackMockState.lastScore).toEqual(before)
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection)
    }
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const { decodeNativeProject } = await import('../../project/schema')
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(playbackMockState.lastScore)
  })

  it('file-lifecycle.cancelled-unsaved-import keeps the current score open', async () => {
    window.confirm = vi.fn(() => false)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({
      filePath: '/scores/imported.musicxml',
      fileName: 'imported.musicxml',
      contents: recentMusicXml
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '새 악보 만들기' })).getByRole(
        'button',
        { name: '만들기' }
      )
    )
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))

    expect(window.confirm).toHaveBeenCalledWith(unsavedScoreChangesMessage)
    expect(window.inC.musicXml.open).not.toHaveBeenCalled()
    expect(screen.getByText('제목 없는 악보')).toBeInTheDocument()
  })

  it('file-lifecycle.opened-recent-score-is-clean-until-edited', async () => {
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([selectedFile])

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /sketch\.musicxml/ })
    )
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()

    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))

    expect(window.confirm).not.toHaveBeenCalled()
    expect(
      screen.getByRole('dialog', { name: '새 악보 만들기' })
    ).toBeInTheDocument()
  })

  it('import-export.save-existing-musicxml overwrites the opened recent file path', async () => {
    const selectedFile = {
      filePath: '/scores/sketch.musicxml',
      fileName: 'sketch.musicxml',
      openedAt: '2026-07-19T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...selectedFile,
      contents: recentMusicXml
    })
    vi.mocked(window.inC.recentMusicXml.add).mockResolvedValue([selectedFile])
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: selectedFile.filePath,
      fileName: selectedFile.fileName
    })

    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', { name: /sketch\.musicxml/ })
    )
    expect(await screen.findByText('MusicXML Sketch')).toBeInTheDocument()
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: selectedFile.filePath,
          suggestedName: 'musicxml-sketch.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    expect(window.inC.recentMusicXml.add).toHaveBeenLastCalledWith({
      filePath: selectedFile.filePath,
      fileName: selectedFile.fileName
    })
    expect(
      await screen.findByText('sketch.musicxml을 MusicXML로 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it('navigation.arrow-right-at-last-event appends a full-measure rest measure instead of showing an input cursor', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    expect(preview).toHaveAttribute('data-event-count', '9')
    expect(preview).toHaveAttribute('data-selected-event-id', 'note-e4')

    Array.from({ length: 7 }).forEach(() => {
      fireEvent.keyDown(window, { key: 'ArrowRight' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-count',
        '10'
      )
    })
    expect(screen.getByText('새 온쉼표 마디를 추가했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('입력 중')).not.toBeInTheDocument()
  })

  it('studio.measure-context skips disabled remove and cancels composing activation without a command', async () => {
    const { StudioMeasureContextMenu } = await import('./StudioMeasureContextMenu')
    const onSelect = vi.fn(), onClose = vi.fn()
    render(<StudioMeasureContextMenu theme="dark" x={20} y={20} canRemove={false} onSelect={onSelect} onClose={onClose} />)
    const menu = screen.getByRole('menu', { name: '마디 작업' })
    const items = within(menu).getAllByRole('menuitem')
    expect(within(menu).getByRole('menuitem', {name:'마디 제거'})).toBeDisabled()
    fireEvent.keyDown(items[0], { key: 'End' })
    expect(within(menu).getByRole('menuitem', {name:'박자표 변경…'})).toHaveFocus()
    expect(fireEvent.keyDown(within(menu).getByRole('menuitem', {name:'박자표 변경…'}), { key: 'Enter', isComposing: true })).toBe(false)
    expect(fireEvent.keyDown(within(menu).getByRole('menuitem', {name:'박자표 변경…'}), { key: 'Escape', isComposing: true })).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(within(menu).getByRole('menuitem', {name:'박자표 변경…'}), { key: 'Tab' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('studio.measure-context uses public controls and guards keyboard command focus and undo', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    const preview = screen.getByTestId('notation-preview')
    const originalCount = preview.getAttribute('data-measure-count')
    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 1000, clientY: 700 })
    let menu = screen.getByRole('menu', { name: '마디 작업' })
    expect(menu.querySelector('.dd-card')).not.toBeNull()
    const items = within(menu).getAllByRole('menuitem')
    expect(items).toHaveLength(8)
    items.forEach(item => expect(item).toHaveClass('dd-button'))
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(items[0], { key: 'End' })
    expect(items[7]).toHaveFocus()
    fireEvent.keyDown(items[7], { key: 'ArrowDown' })
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(items[0], { key: 'Home' })
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(items[0], { key: 'Enter', isComposing: true })
    expect(preview).toHaveAttribute('data-measure-count', originalCount)
    expect(items[0]).toHaveFocus()
    fireEvent.keyDown(items[0], { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: '마디 작업' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('악보 캔버스')).toHaveFocus()
    expect(preview).toHaveAttribute('data-selected-measure-id', 'measure-2')
    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), { clientX: 100, clientY: 100 })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '앞에 마디 추가' }))
    expect(preview).toHaveAttribute('data-measure-count', String(Number(originalCount) + 1))
    expect(screen.queryByRole('menu', { name: '마디 작업' })).not.toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(preview).toHaveAttribute('data-measure-count', originalCount)
  })

  it('measure.context-menu inserts measures before and after, then removes the target measure', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const initialMeasureCount = Number(
      screen.getByTestId('notation-preview').getAttribute('data-measure-count')
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })

    let menu = screen.getByRole('menu', { name: '마디 작업' })
    expect(
      within(menu).getByRole('menuitem', { name: '앞에 마디 추가' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '뒤에 마디 추가' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '도돌이표 시작' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '도돌이표 끝' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '1번 볼타' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '2번 볼타' })
    ).toBeInTheDocument()
    expect(
      within(menu).getByRole('menuitem', { name: '마디 제거' })
    ).toBeInTheDocument()

    fireEvent.click(within(menu).getByRole('menuitem', { name: '도돌이표 시작' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:S::')
    )
    expect(screen.getByText('도돌이표 시작을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '도돌이표 끝' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:SE:2:')
    )
    expect(screen.getByText('도돌이표 끝을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '1마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '1번 볼타' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('1:::1:S')
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('2:SE:2:1:E')
    )
    expect(screen.getByText('1번 볼타 괄호를 갱신했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '뒤에 마디 추가' }))
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount + 1)
      )
    })
    expect(
      screen.getByText('선택한 마디 뒤에 새 마디를 추가했습니다.')
    ).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '3마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '2번 볼타' }))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-measure-marks',
      expect.stringContaining('3:::2:S')
    )
    expect(
      screen.getByText('2번 볼타 괄호를 갱신했습니다.')
    ).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '3마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    fireEvent.click(
      within(screen.getByRole('menu', { name: '마디 작업' })).getByRole(
        'menuitem',
        { name: '마디 제거' }
      )
    )
    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount)
      )
    })
    expect(screen.getByText('마디를 삭제했습니다.')).toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: '2마디 선택' }), {
      clientX: 160,
      clientY: 180
    })
    menu = screen.getByRole('menu', { name: '마디 작업' })
    fireEvent.click(within(menu).getByRole('menuitem', { name: '앞에 마디 추가' }))

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-measure-count',
        String(initialMeasureCount + 1)
      )
    })
    expect(
      screen.getByText('선택한 마디 앞에 새 마디를 추가했습니다.')
    ).toBeInTheDocument()
  })

  it('playback.global-tempo lyrics.edit-selected-note lyrics.block-note-shortcuts edits lyrics without triggering note input in fixture mode', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const workspace = screen.getByRole('region', { name: '악보 편집기' })
    const toolbarTabs = screen.getByRole('navigation', {
      name: '앱 메뉴'
    })
    const dockedPalette = within(workspace).getByRole('complementary', {
      name: '고정 팔레트'
    })
    const propertiesDock = within(workspace).getByRole('complementary', {
      name: '속성 도크'
    })
    expect(
      within(toolbarTabs).queryByRole('link', { name: 'Columns 출발 읽기' })
    ).not.toBeInTheDocument()
    expect(
      within(workspace).queryByLabelText('Columns 추천')
    ).not.toBeInTheDocument()
    expect(
      within(toolbarTabs)
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('aria-haspopup'))
        .map((button) => button.textContent)
    ).toEqual(['파일', '편집', '보기', '추가', '형식', '도구', '도움말'])
    expect(within(dockedPalette).getByRole('searchbox',{name:'표기 기호 검색'})).toBeVisible()
    expect(within(dockedPalette).queryByRole('button',{name:'파일 팔레트 열기'})).not.toBeInTheDocument()
    expect(
      within(propertiesDock).getByRole('region', { name: '선택 요약' })
    ).toBeInTheDocument()
    const contextStrip = screen.getByRole('region', {
      name: '악보 상태 및 보기'
    })
    expect(within(contextStrip).getByText('작업')).toBeInTheDocument()
    expect(within(contextStrip).getByText('입력')).toBeInTheDocument()
    expect(within(contextStrip).getByText('대상')).toBeInTheDocument()
    expect(within(contextStrip).queryByText('음가')).not.toBeInTheDocument()
    expect(within(contextStrip).queryByText('재생')).not.toBeInTheDocument()
    expect(within(contextStrip).getByText('음표')).toBeInTheDocument()
    expect(within(contextStrip).getByText('선택')).toBeInTheDocument()
    expect(within(contextStrip).getByText(/보표 1 · 성부 1/)).toBeInTheDocument()
    expect(within(contextStrip).getByText('4분음표')).toBeInTheDocument()
    expect(within(contextStrip).getByText('정지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '파일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '추가' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '선택 요약' })).toBeVisible()
    expect(screen.getByRole('button',{name:'재생'})).toBeVisible()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())
    expect(
      within(toolbarTabs).queryByRole('button', { name: '선택' })
    ).not.toBeInTheDocument()
    fireEvent.click(within(toolbarTabs).getByRole('button',{name:'추가'}))
    expect(within(toolbarTabs).getByRole('menuitem', { name: '가사 및 코드' })).toBeVisible()
    fireEvent.keyDown(within(toolbarTabs).getByRole('menuitem',{name:'가사 및 코드'}),{key:'Escape'})
    expect(screen.getByRole('button',{name:'코드 심벌 편집',hidden:true})).not.toBeVisible()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()

    openStudioWorkspace('가사')
    expect(within(contextStrip).getByText('가사')).toBeInTheDocument()
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    const preview = screen.getByLabelText('악보 미리보기 테스트 더블')
    const lyricInput = within(preview).getByLabelText('선택 음표 가사')
    const initialEventCount = preview.getAttribute('data-event-count')
    expect(lyricInput).toBeVisible()
    expect(screen.getByLabelText('가사 음절')).toBeVisible()
    expect(screen.getByText('멜리스마')).toBeVisible()
    fireEvent.click(screen.getByRole('combobox',{name:'가사 절'}))
    expect(
      within(screen.getByRole('listbox',{name:'가사 절'})).getAllByRole('option').map(
        (option) => option.textContent
      )
    ).toEqual(['1절', '2절', '3절', '4절'])
    fireEvent.keyDown(screen.getByRole('combobox',{name:'가사 절'}),{key:'Escape'})
    expect(screen.getByRole('region', { name: '코드 심벌 속성' })).toBeVisible()
    expect(screen.getByRole('button',{name:'코드 심벌 편집'})).toBeVisible()
    expect(screen.getByLabelText('코드 심벌 적용 위치')).toHaveTextContent(
      '1마디 · 1성부 · 1번째 표기'
    )
    fireEvent.keyDown(lyricInput, { key: 'ArrowDown' })
    expect(screen.getByRole('combobox',{name:'가사 절'})).toHaveTextContent('2절')
    expect(
      screen.getByText('2절 가사 입력으로 전환했습니다.')
    ).toBeInTheDocument()
    fireEvent.keyDown(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      ),
      { key: 'ArrowUp' }
    )
    expect(screen.getByRole('combobox',{name:'가사 절'})).toHaveTextContent('1절')
    const firstVerseInput = within(
      screen.getByTestId('notation-preview')
    ).getByLabelText('선택 음표 가사')
    expect(fireEvent.keyDown(firstVerseInput, { key: 'q' })).toBe(true)
    expect(fireEvent.keyDown(firstVerseInput, { key: ' ' })).toBe(true)
    expect(fireEvent.keyDown(firstVerseInput, { key: '-' })).toBe(true)
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)
    fireEvent.change(firstVerseInput, { target: { value: 'hello world' } })
    expect(fireEvent.keyDown(firstVerseInput, { key: 'Enter' })).toBe(false)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()
    const eventCountAfterLyricAdvance =
      screen.getByTestId('notation-preview').getAttribute('data-event-count')
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-event-count',
      eventCountAfterLyricAdvance
    )

    fireEvent.click(screen.getByRole('button', { name: 'm3-half-rest 선택' }))
    expect(screen.getByRole('region', { name: '선택 요약' })).toBeVisible()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    openStudioWorkspace('가사')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'm4-f-natural-1'
    )
    expect(within(preview).getByLabelText('선택 음표 가사')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    expect(screen.getByRole('region', { name: '선택 요약' })).toBeVisible()
    openStudioWorkspace('가사')
    fireEvent.click(screen.getByRole('combobox',{name:'가사 절'}));fireEvent.click(screen.getByRole('option',{name:'4절'}))
    const fourthVerseInput = within(preview).getByLabelText('선택 음표 가사')
    fireEvent.change(fourthVerseInput, { target: { value: '한-글 두음절' } })
    fireEvent.blur(fourthVerseInput)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-lyrics',
      expect.stringContaining('m1-c4:4:single:한-글 두음절')
    )
    const editCountAfterLyricCommit = document.querySelector('.editor-status')
      ?.textContent
    fireEvent.blur(fourthVerseInput)
    expect(document.querySelector('.editor-status')?.textContent).toBe(
      editCountAfterLyricCommit
    )
    openStudioWorkspace('악보')
    fireEvent.click(
      screen.getByRole('button', { name: 'm1-c4 4절 가사 선택' })
    )
    expect(screen.getByRole('region', { name: '가사 편집' })).toBeVisible()
    expect(screen.getByRole('combobox',{name:'가사 절'})).toHaveTextContent('4절')
    expect(within(preview).getByLabelText('선택 음표 가사')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    expect(screen.getByRole('region', { name: '선택 요약' })).toBeVisible()

    openStudioWorkspace('악보')
    expect(within(contextStrip).getByText('악보')).toBeInTheDocument()
    expect(screen.getByLabelText('조표')).toBeVisible()
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).toBeVisible()
    expect(screen.queryByLabelText('PDF 설정 프리셋')).not.toBeInTheDocument()
    const tempoInput = screen.getByRole('slider', { name: /^빠르기/ })
    const tempoBeatUnit = screen.getByLabelText('빠르기 기준 음가')
    const tempoText = screen.getByLabelText('빠르기말')
    const rhythmFeelSelect = screen.getByLabelText('리듬 해석 표기')
    expect(tempoInput).toHaveValue('75')
    expect(tempoBeatUnit).toHaveTextContent('4분음표')
    expect(tempoText).toHaveTextContent('♩ = 75')
    fireEvent.change(tempoInput, { target: { value: '90' } })
    expect(tempoText).toHaveTextContent('♩ = 90')
    expect(preview).toHaveAttribute('data-global-tempo', '90')
    fireEvent.click(tempoBeatUnit);fireEvent.click(screen.getByRole('option',{name:'8분음표'}))
    expect(tempoText).toHaveTextContent('♪ = 90')
    expect(rhythmFeelSelect).toHaveTextContent('없음')
    fireEvent.click(rhythmFeelSelect);fireEvent.click(screen.getByRole('option',{name:'8분 셋잇단 느낌'}))
    expect(rhythmFeelSelect).toHaveTextContent('8분 셋잇단 느낌')
    expect(preview).toHaveAttribute('data-rhythm-feel', 'eighth')
    const tempoVisibilityToggle = screen.getByLabelText('악보에 빠르기말 표기')
    expect(tempoVisibilityToggle).toBeChecked()
    fireEvent.click(tempoVisibilityToggle)
    expect(tempoVisibilityToggle).not.toBeChecked()

    openNotationSettings('clef')
    expect(within(contextStrip).getByText('표기 객체')).toBeInTheDocument()
    const notationObjects = screen.getByRole('region', { name: '표기 객체' })
    expect(screen.getByLabelText('선택 요약 연습표')).toBeVisible()
    expect(screen.getByLabelText('선택 요약 보표 글자')).toBeVisible()
    expect(screen.getByLabelText('선택 요약 표현 텍스트')).toBeVisible()
    const dockedDynamics = within(dockedPalette).getByRole('region', {
      name: '셈여림 팔레트'
    })
    fireEvent.click(
      within(dockedDynamics).getByRole('button', { name: 'mf 셈여림 적용' })
    )
    expect(screen.getByRole('combobox',{name:/^(선택|입력) 마디 셈여림$/})).toHaveTextContent('mf')
    expect(within(preview).getByText('mf')).toBeInTheDocument()
    expect(
      within(notationObjects).getByLabelText('선택 마디 음자리표')
    ).toBeVisible()

    openStudioWorkspace('파일')
    expect(within(contextStrip).getByText('파일')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('새 악보 만들기')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('MusicXML 가져오기')).toBeInTheDocument()
    const selectionFilter = within(workspace).getByLabelText('선택 필터')
    expect(selectionFilter).toBeVisible()
    expect(selectionFilter).toHaveTextContent('전체')
    chooseSelectionFilter('선택 필터', 'rests')
    expect(within(contextStrip).getByText('쉼표만')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('음표 지우기')).toBeDisabled()
    chooseSelectionFilter('선택 필터', 'notes')
    expect(within(contextStrip).getByText('음표만')).toBeInTheDocument()
    expect(within(workspace).getByLabelText('음표 지우기')).not.toBeDisabled()
    expect(
      within(workspace).queryByRole('button', { name: 'PDF 변환' })
    ).not.toBeInTheDocument()
    expect(
      within(workspace).queryByRole('button', { name: 'MIDI 내보내기' })
    ).not.toBeInTheDocument()

    fireEvent.click(within(workspace).getByLabelText('새 악보 만들기'))
    const newScoreDialog = screen.getByRole('dialog', {
      name: '새 악보 만들기'
    })
    expect(newScoreDialog).toBeInTheDocument()
    expect(window.confirm).not.toHaveBeenCalled()
    fireEvent.click(within(newScoreDialog).getByRole('button', { name: '취소' }))

    openStudioWorkspace('내보내기')
    expect(within(contextStrip).getByText('내보내기')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'PDF 페이지 설정' })).toBeVisible()
    expect(within(workspace).getByLabelText('PDF 변환')).toBeVisible()
    expect(within(workspace).getByLabelText('MIDI 내보내기')).toBeVisible()
    expect(within(workspace).getByLabelText('PDF 목표 장수')).toBeVisible()
    expect(screen.getByLabelText('PDF 설정 프리셋')).toBeVisible()

    openStudioWorkspace('재생')
    expect(screen.getByRole('region', { name: '재생 컨트롤' })).toBeVisible()
    expect(within(contextStrip).getByText('정지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재생' })).toBeVisible()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())

    openStudioWorkspace('음표')
    expect(within(contextStrip).getByText('음표')).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'재생'})).toBeVisible()
    screen
      .getAllByLabelText('빠르기')
      .forEach((element) => expect(element).not.toBeVisible())
    expect(screen.getByLabelText('선택 마디 음자리표')).not.toBeVisible()
    expect(screen.getByRole('button',{name:'코드 심벌 편집',hidden:true})).not.toBeVisible()
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByLabelText('위치별 빠르기 BPM')).not.toBeVisible()
  }, 30000)

  it.each(['button','space'] as const)('playback.start-from-selection starts a selected rest through %s without editing', async entry => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    fireEvent.click(screen.getByRole('button',{name:'m8-half-rest 선택'}))
    const source=structuredClone(playbackMockState.lastScore!),part=source.parts[0],staff=part.staves[0],measure=staff.measures.at(-1)!
    if(entry==='button')fireEvent.click(within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'}))
    else fireEvent.keyDown(window,{key:' ',code:'Space'})
    expect(playbackMockState.playFromEvent).toHaveBeenCalledExactlyOnceWith('m8-half-rest',{partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:measure.voices[0].id})
    expect(playbackMockState.play).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('playback.start-from-selection preserves resume and explicit rewind before a new selection', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    playbackMockState.value={...playbackMockState.value,positionBeat:8,status:'paused'}
    const {App}=await import('./App');const {rerender}=render(<App/>)
    const play=()=>fireEvent.click(within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'}))
    fireEvent.click(screen.getByRole('button',{name:'m8-half-rest 선택'}));play()
    expect(playbackMockState.play).toHaveBeenCalledOnce();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    playbackMockState.value={...playbackMockState.value,status:'stopped'};rerender(<App/>)
    fireEvent.click(screen.getByRole('button',{name:'처음으로'}));play()
    expect(playbackMockState.play).toHaveBeenCalledTimes(2);expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'처음으로'}))
    fireEvent.click(screen.getByRole('button',{name:'m8-half-rest 선택'}));play()
    expect(playbackMockState.playFromEvent).toHaveBeenCalledOnce()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('playback.start-from-selection lets rewind override a noninitial selection even at beat zero', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    const transport=within(screen.getByLabelText('재생 컨트롤'))
    expect(transport.getByRole('button',{name:'처음으로'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'m8-half-rest 선택'}))
    expect(transport.getByRole('button',{name:'처음으로'})).toBeEnabled()
    fireEvent.click(transport.getByRole('button',{name:'처음으로'}))
    expect(transport.getByRole('button',{name:'처음으로'})).toBeDisabled()
    fireEvent.click(transport.getByRole('button',{name:'재생'}))
    expect(playbackMockState.play).toHaveBeenCalledOnce();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })
})
