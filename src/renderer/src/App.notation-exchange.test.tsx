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

  it('note-input.cycle-same-staff-voice supports V cycling and command-alt digit shortcuts', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    fireEvent.keyDown(window, { code: 'Digit3', key: '3', metaKey: true, altKey: true })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '3성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )

    fireEvent.keyDown(window, { code: 'KeyV', key: 'v' })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '4성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )

    fireEvent.keyDown(window, { code: 'KeyV', key: 'V', shiftKey: true })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '3성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    )
  })

  it('range-editing.same-staff-voice-copy-paste keeps navigation in the pasted voice', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    fireEvent.click(screen.getByRole('button', { name: 'note-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'note-f-sharp-4 선택' }), {
      shiftKey: true
    })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c', metaKey: true })
    fireEvent.click(screen.getByRole('button', { name: '2성부' }))
    fireEvent.keyDown(window, { code: 'KeyV', key: 'v', metaKey: true })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    })

    const pastedEventId = screen
      .getByTestId('notation-preview')
      .getAttribute('data-selected-event-id')
    const eventPitches = screen
      .getByTestId('notation-preview')
      .getAttribute('data-event-pitches')
    const pastedEventIds =
      eventPitches
        ?.match(/event-[^:]+:[A-G][^,]*/g)
        ?.map((entry) => entry.split(':')[0]) ?? []

    expect(pastedEventId).toMatch(/^event-/)
    expect(pastedEventIds.length).toBeGreaterThanOrEqual(2)

    fireEvent.click(
      screen.getByRole('button', { name: `${pastedEventIds[1]} 선택` }),
      { shiftKey: true }
    )

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-ids',
      pastedEventIds.slice(0, 2).join(',')
    )
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-address',
      expect.stringContaining(':voice-2')
    )

    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      pastedEventId
    )
    expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })

  it('selection-filter.copy uses the filtered event set for same-measure ranges', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    const toolbarTabs = screen.getByRole('navigation', {
      name: '앱 메뉴'
    })

    fireEvent.click(screen.getByRole('button', { name: 'note-g4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'rest-half 선택' }), {
      shiftKey: true
    })
    openStudioWorkspace('파일')
    chooseSelectionFilter('선택 필터', 'notes')
    fireEvent.click(screen.getByRole('button', { name: '선택 범위 복사' }))

    expect(
      screen.getByText('4개 필터된 이벤트를 복사했습니다.')
    ).toBeInTheDocument()
  })

  it.each([false,true])('tuplets.prepare-playing pauses before a draft starts (ordinary N first: %s)',async enterN=>{
    const file={filePath:'/scores/prepare-playing.musicxml',fileName:'prepare-playing.musicxml',openedAt:'2026-10-29T00:00:00.000Z'}
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([file]);vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({...file,contents:tupletInputProgressMusicXml.replace('implicit="yes"','').replace(/<note>[\s\S]*?<\/note>/,'<note><rest measure="yes"/><duration>16</duration><voice>1</voice><type>whole</type></note>')})
    const {App}=await import('./App'),view=render(<App/>);fireEvent.click(await screen.findByRole('button',{name:/prepare-playing\.musicxml/}));await screen.findByTestId('notation-preview');const source=structuredClone(playbackMockState.lastScore!),part=source.parts[0],staff=part.staves[0],measure=staff.measures[0],voice=measure.voices[0],event=voice.events[0]
    playbackMockState.value={status:'playing',positionBeat:0,totalBeats:4,activeEventId:event.id,activeEvent:{eventId:event.id,partId:part.id,staffId:staff.id,measureId:measure.id,voiceId:voice.id}};view.rerender(<App/>)
    if(enterN)fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}));expect(playbackMockState.pause).toHaveBeenCalledOnce()
    playbackMockState.value={...playbackMockState.value,status:'paused'};view.rerender(<App/>);fireEvent.keyDown(window,{key:'c',code:'KeyC'});expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3');expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3')
  })

  it.each([0,1,2])('tuplets.pending-playback preserves %s/3 members and does not start playback', async count=>{
    const file={filePath:'/scores/pending-playback.musicxml',fileName:'pending-playback.musicxml',openedAt:'2026-10-29T00:00:00.000Z'}
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([file]);vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({...file,contents:tupletInputProgressMusicXml.replace('implicit="yes"','').replace(/<note>[\s\S]*?<\/note>/,'<note><rest measure="yes"/><duration>16</duration><voice>1</voice><type>whole</type></note>')})
    const {App}=await import('./App');render(<App/>);fireEvent.click(await screen.findByRole('button',{name:/pending-playback\.musicxml/}))
    const preview=await screen.findByTestId('notation-preview');fireEvent.click(within(preview).getAllByRole('button').at(-1)!);fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}))
    for(const key of ['c','d'].slice(0,count))fireEvent.keyDown(window,{key,code:'Key'+key.toUpperCase()})
    const committed=structuredClone(playbackMockState.lastScore!),selected=preview.getAttribute('data-selected-event-id'),status=document.querySelector('.editor-status')!
    expect(status).toHaveTextContent('셋잇단음표 '+count+'/3')
    fireEvent.keyDown(window,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'})).toBeDisabled()
    expect(status).toHaveTextContent('셋잇단음표 '+count+'/3');expect(status).toHaveTextContent('완료하거나 취소한 뒤 재생')
    fireEvent.click(within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'}));expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(committed);expect(preview).toHaveAttribute('data-selected-event-id',selected);expect(status).toHaveTextContent('0회 수정')
    for(const key of ['c','d','e'].slice(count))fireEvent.keyDown(window,{key,code:'Key'+key.toUpperCase()})
    expect(status).toHaveTextContent('셋잇단음표 입력을 완료했습니다.');expect(status).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(committed);expect(status).toHaveTextContent('셋잇단음표 2/3');expect(status).toHaveTextContent('0회 수정')
    fireEvent.keyDown(window,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(status).toHaveTextContent('셋잇단음표 2/3')
    fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(status).not.toHaveTextContent('셋잇단음표 2/3');expect(status).toHaveTextContent('1회 수정')
    const play=within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'});expect(play).toBeEnabled();fireEvent.click(play)
    expect(playbackMockState.play.mock.calls.length+playbackMockState.playFromEvent.mock.calls.length).toBe(1)
  })

  it('tuplets.pending-playback restores Play after explicit draft cancellation without a score command',async()=>{
    const file={filePath:'/scores/pending-cancel.musicxml',fileName:'pending-cancel.musicxml',openedAt:'2026-10-29T00:00:00.000Z'}
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([file]);vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({...file,contents:tupletInputProgressMusicXml.replace('implicit="yes"','').replace(/<note>[\s\S]*?<\/note>/,'<note><rest measure="yes"/><duration>16</duration><voice>1</voice><type>whole</type></note>')})
    const {App}=await import('./App');render(<App/>);fireEvent.click(await screen.findByRole('button',{name:/pending-cancel\.musicxml/}));const preview=await screen.findByTestId('notation-preview');fireEvent.click(within(preview).getAllByRole('button').at(-1)!);fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const source=structuredClone(playbackMockState.lastScore!);expect(document.querySelector('.editor-status')).toHaveTextContent('셋잇단음표 1/3');expect(within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'})).toBeDisabled()
    fireEvent.keyDown(window,{key:'Escape'});const play=within(screen.getByLabelText('재생 컨트롤')).getByRole('button',{name:'재생'});expect(play).toBeEnabled();fireEvent.click(play);expect(playbackMockState.play.mock.calls.length+playbackMockState.playFromEvent.mock.calls.length).toBe(1);expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('tuplets.report-input-progress reports 0/3 through completion in the live status', async () => {
    const recentFile = {
      filePath: '/scores/tuplet-input-progress.musicxml',
      fileName: 'tuplet-input-progress.musicxml',
      openedAt: '2026-07-28T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recentFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...recentFile,
      contents: tupletInputProgressMusicXml
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: /tuplet-input-progress\.musicxml/
      })
    )
    const preview = await screen.findByTestId('notation-preview')
    const previewButtons = within(preview).getAllByRole('button')
    fireEvent.click(previewButtons.at(-1) as HTMLButtonElement)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )

    const liveStatus = document.querySelector('.editor-status')
    expect(liveStatus).toHaveAttribute('aria-live', 'polite')
    expect(liveStatus).toHaveTextContent('셋잇단음표 입력')
    expect(liveStatus).toHaveTextContent('셋잇단음표 0/3')
    expect(preview).toHaveAttribute('data-input-measure-id','')

    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 1/3')
    expect(preview).toHaveAttribute('data-input-measure-id','')
    expect(liveStatus).toHaveTextContent(
      '셋잇단음표 1/3개 입력됨. 2개 더 입력해 주세요.'
    )

    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 2/3')
    expect(preview).toHaveAttribute('data-input-measure-id','')
    expect(liveStatus).toHaveTextContent(
      '셋잇단음표 2/3개 입력됨. 1개 더 입력해 주세요.'
    )

    fireEvent.keyDown(window, { code: 'KeyE', key: 'e' })
    expect(liveStatus).toHaveTextContent('셋잇단음표 입력을 완료했습니다.')
    expect(liveStatus).toHaveTextContent('입력 중')
    expect(preview.getAttribute('data-input-measure-id')).not.toBe('')
    expect(liveStatus).not.toHaveTextContent('셋잇단음표 2/3')
  })

  it('tuplets.input-mixed-duration completes an eighth-plus-quarter triplet from the toolbar', async () => {
    const recentFile = {
      filePath: '/scores/tuplet-input-progress.musicxml',
      fileName: 'tuplet-input-progress.musicxml',
      openedAt: '2026-07-28T00:00:00.000Z'
    }
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([recentFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...recentFile,
      contents: tupletInputProgressMusicXml
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: /tuplet-input-progress\.musicxml/
      })
    )
    const preview = await screen.findByTestId('notation-preview')
    const previewButtons = within(preview).getAllByRole('button')
    fireEvent.click(previewButtons.at(-1) as HTMLButtonElement)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )

    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })
    const quarterButton = screen.getByRole('button', {
      name: '4분음표, 단축키 5'
    })
    expect(quarterButton).not.toBeDisabled()
    fireEvent.click(quarterButton)
    fireEvent.keyDown(window, { code: 'KeyD', key: 'd' })

    await waitFor(() => {
      expect(document.querySelector('.editor-status')).toHaveTextContent(
        '셋잇단음표 입력을 완료했습니다.'
      )
    })
  })

  it('tuplets.edit-member-duration changes a selected tuplet eighth to a quarter with Digit5', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'note-g4 선택' }))
    fireEvent.click(
      screen.getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비/
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'note-a4 선택' }))
    fireEvent.keyDown(window, {
      code: 'Digit5',
      key: '5'
    })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-durations',
        expect.stringContaining('note-a4:quarter:3:2')
      )
    })
    expect(screen.getByTestId('notation-preview')).not.toHaveAttribute(
      'data-event-durations',
      expect.stringContaining('tuplet-remainder')
    )
    expect(
      screen.queryByText('셋잇단음표 구성음의 음가는 아직 따로 바꿀 수 없습니다.')
    ).not.toBeInTheDocument()

    fireEvent.keyDown(window, {
      code: 'Digit4',
      key: '4'
    })

    await waitFor(() => {
      const durations = screen
        .getByTestId('notation-preview')
        .getAttribute('data-event-durations')

      expect(durations).toContain('note-a4:eighth:3:2')
      expect(durations).toMatch(/event-[^,]+:eighth:3:2/)
    })
    expect(
      screen.queryByText('셋잇단음표 구성음의 음가는 아직 따로 바꿀 수 없습니다.')
    ).not.toBeInTheDocument()
  })

  it('layout.rehearsal-mark adds A to the selected measure preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('음표')
    const rehearsalMarkInput = screen.getByRole('textbox', { name: '선택 요약 연습표' })
    const preview = screen.getByTestId('notation-preview')

    fireEvent.change(rehearsalMarkInput, { target: { value: '' } })
    fireEvent.blur(rehearsalMarkInput)
    expect(within(preview).queryByText('A')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: '선택 요약 연습표' }), {
      target: { value: 'A' }
    })
    fireEvent.blur(screen.getByRole('textbox', { name: '선택 요약 연습표' }))

    expect(within(preview).getByText('A')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.staff-text adds dolce without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('음표')
    const staffTextInput = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(staffTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(staffTextInput, { target: { value: 'dolce' } })
    fireEvent.blur(staffTextInput)

    expect(within(preview).getByText('dolce')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.system-text adds a system-level text without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('음표')
    const systemTextInput = screen.getByRole('textbox', { name: '선택 요약 시스템 텍스트' })
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(systemTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(systemTextInput, { target: { value: 'Chorus' } })
    fireEvent.blur(systemTextInput)

    expect(within(preview).getByText('Chorus')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('layout.expression-text adds espressivo at the selected tick without triggering a note shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    openStudioWorkspace('음표')
    const expressionTextInput = screen.getByRole('textbox', { name: '선택 요약 표현 텍스트' })
    const preview = screen.getByTestId('notation-preview')
    const initialEventCount = preview.getAttribute('data-event-count')

    fireEvent.keyDown(expressionTextInput, { key: 'c' })
    expect(preview).toHaveAttribute('data-event-count', initialEventCount)

    fireEvent.change(expressionTextInput, { target: { value: 'espressivo' } })
    fireEvent.blur(expressionTextInput)

    expect(within(preview).getByText('espressivo')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('espressivo')).toHaveAttribute(
      'data-tick',
      '0'
    )
  })

  it('keyboard.navigation-first keeps Alt vertical arrows from editing pitch', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    const preview = screen.getByTestId('notation-preview')
    const initialPitches = preview.getAttribute('data-event-pitches')

    fireEvent.keyDown(window, { key: 'ArrowUp', altKey:true })
    expect(preview).toHaveAttribute('data-event-pitches', initialPitches)
    expect(document.querySelector('.editor-status')).toHaveTextContent(
      '해당 방향에 선택할 보표가 없습니다.'
    )

    fireEvent.keyDown(window, { altKey: true, shiftKey: true, key: 'ArrowUp' })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain('m1-c4:D04')
    })
  })

  it('keyboard.navigation-first moves Alt vertical arrows between grand staff lanes', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('piano-grand-staff')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'part-1-staff-1-measure-1-full-measure-rest 선택'
      })
    )
    fireEvent.keyDown(window, { key: 'ArrowDown', altKey:true })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-2-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'part-1:staff-2:part-1-staff-2-measure-1:voice-1'
      )
    })
    expect(screen.getByText('아래 보표로 이동했습니다.')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowUp', altKey:true })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-1-measure-1-full-measure-rest'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-address',
        'part-1:staff-1:part-1-staff-1-measure-1:voice-1'
      )
    })
    expect(screen.getByText('위 보표로 이동했습니다.')).toBeInTheDocument()
  })

  it('keyboard.enharmonic-respell changes spelling without moving the selected pitch', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }))
    const preview = screen.getByTestId('notation-preview')

    expect(preview.getAttribute('data-event-pitches')).toContain(
      'm1-f-sharp-4:F14'
    )

    fireEvent.keyDown(window, { code: 'KeyJ', key: 'j' })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain(
        'm1-f-sharp-4:G-14'
      )
    })
    expect(screen.getByText('이명동음으로 바꿨습니다.')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    await waitFor(() => {
      expect(preview.getAttribute('data-event-pitches')).toContain(
        'm1-f-sharp-4:F14'
      )
    })
  })

  it('layout.dynamics adds professional dynamics to the selected measure preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('표기 객체')
    openStudioWorkspace('음표')
    const dynamics = screen.getByRole('combobox', { name: '선택 마디 셈여림' })
    fireEvent.click(dynamics)
    const options=screen.getByRole('listbox',{name:'선택 마디 셈여림'})
    for(const name of ['pp','ff','sfz'])expect(within(options).getByRole('option',{name})).toBeInTheDocument()
    fireEvent.click(within(options).getByRole('option',{name:'ff'}))

    const dynamic = within(screen.getByTestId('notation-preview')).getByText('ff')
    expect(dynamic).toHaveAttribute('data-measure-id', 'measure-1')
    expect(dynamic).not.toHaveAttribute('data-measure-id', 'measure-2')
  })

  it('palette.measure-level-notation keeps score setup structural and edits measure markings from notation objects', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    openStudioWorkspace('음표')
    expect(
      within(screen.getByRole('region', { name: '선택 요약' })).queryByLabelText(
        '셈여림'
      )
    ).not.toBeInTheDocument()

    openStudioWorkspace('악보')
    const scoreSetupPanel = screen.getByRole('region', { name: '악보 편집' })
    expect(scoreSetupPanel).toBeVisible()
    expect(within(scoreSetupPanel).queryByLabelText('셈여림')).not.toBeInTheDocument()
    expect(within(scoreSetupPanel).queryByLabelText('연습표')).not.toBeInTheDocument()
    expect(within(scoreSetupPanel).queryByLabelText('보표 글자')).not.toBeInTheDocument()

    openNotationSettings('clef')
    const notationObjects = screen.getByRole('region', { name: '표기 객체' })
    expect(notationObjects).toBeVisible()
    expect(screen.getByRole('region', { name: '마디 표기' })).toBeVisible()
    expect(screen.getByRole('region', { name: '반복과 볼타' })).toBeVisible()

    fireEvent.change(screen.getByLabelText('선택 요약 연습표'), {
      target: { value: 'B' }
    })
    fireEvent.blur(screen.getByLabelText('선택 요약 연습표'))
    chooseInspectorDynamic('sfz')

    const preview = screen.getByTestId('notation-preview')
    expect(within(preview).getByText('B')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('sfz')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
  })

  it('palette.notation-applicability disables measure text and dynamics for range selection', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }), {
      shiftKey: true
    })
    openNotationSettings('clef')

    const measureNotation = screen.getByRole('region', { name: '마디 표기' })
    expect(measureNotation).toHaveAttribute(
      'data-applicability',
      'range-disabled'
    )
    expect(screen.getByLabelText('선택 요약 연습표')).toBeDisabled()
    expect(screen.getByLabelText('선택 요약 보표 글자')).toBeDisabled()
    expect(screen.getByLabelText('선택 요약 시스템 텍스트')).toBeDisabled()
    expect(screen.getByLabelText('선택 요약 표현 텍스트')).toBeDisabled()
    expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toBeDisabled()
    expect(within(measureNotation).getByRole('button',{name:'텍스트 표기 편집'})).toBeDisabled()
    expect(within(measureNotation).getByRole('button',{name:'셈여림 편집'})).toBeDisabled()
    const dockedDynamics = screen.getByRole('region', { name: '셈여림 팔레트' })
    for (const button of within(dockedDynamics).getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('palette.lyrics-chords separates lyric and chord groups and anchors measure-selected chords at tick 0', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('음표')
    expect(screen.getByRole('button',{name:'코드 심벌 편집',hidden:true})).not.toBeVisible()

    openStudioWorkspace('표기 객체')
    expect(screen.getByRole('button',{name:'코드 심벌 편집',hidden:true})).not.toBeVisible()

    openStudioWorkspace('가사')
    expect(screen.getByRole('region', { name: '가사 속성' })).toBeVisible()
    expect(screen.getByRole('region', { name: '코드 심벌 속성' })).toBeVisible()
    expect(screen.getByLabelText('가사 절')).toBeVisible()
    expect(screen.getByRole('button',{name:'코드 심벌 편집'})).toBeVisible()

    fireEvent.change(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      ),
      { target: { value: 'Sing' } }
    )
    fireEvent.blur(
      within(screen.getByTestId('notation-preview')).getByLabelText(
        '선택 음표 가사'
      )
    )
    fireEvent.change(openHarmonyProperties(), {
      target: { value: 'C7/G' }
    })
    fireEvent.blur(screen.getByLabelText('선택 요약 코드'))

    const preview = screen.getByTestId('notation-preview')
    expect(preview).toHaveAttribute(
      'data-lyrics',
      expect.stringContaining('m1-c4:1:single:Sing')
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )
    expect(within(preview).getByText('C7/G')).toHaveAttribute('data-tick', '0')

    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    openStudioWorkspace('가사')
    expect(screen.queryByLabelText('선택 음표 가사')).not.toBeInTheDocument()
    expect(screen.getByText('음표를 선택하면 가사 입력 항목이 표시됩니다.'))
      .toBeVisible()
    expect(screen.getByLabelText('코드 심벌 적용 위치')).toHaveTextContent(
      '2마디 · 시작 위치'
    )

    fireEvent.change(openHarmonyProperties(), {
      target: { value: 'Fmaj7' }
    })
    fireEvent.blur(screen.getByLabelText('선택 요약 코드'))
    expect(within(preview).getByText('Fmaj7')).toHaveAttribute(
      'data-measure-id',
      'measure-2'
    )
    expect(within(preview).getByText('Fmaj7')).toHaveAttribute('data-tick', '0')

    openStudioWorkspace('표기 객체')
    chooseInspectorDynamic('ff')
    expect(within(preview).getByText('ff')).toHaveAttribute(
      'data-measure-id',
      'measure-2'
    )

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    openStudioWorkspace('표기 객체')
    chooseInspectorDynamic('mf')
    expect(within(preview).getByText('mf')).toHaveAttribute(
      'data-measure-id',
      'measure-1'
    )

    openStudioWorkspace('파일')
    const objectFilter = screen.getByLabelText('표기 필터')
    chooseSelectionFilter('표기 필터', 'harmonies')
    expect(objectFilter).toHaveTextContent('코드')
    fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    expect(within(preview).queryByText('Fmaj7')).not.toBeInTheDocument()
    expect(
      within(preview)
        .getAllByText('C7/G')
        .some((element) => element.getAttribute('data-measure-id') === 'measure-2')
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    openStudioWorkspace('파일')
    chooseSelectionFilter('표기 필터', 'dynamics')
    fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    fireEvent.click(screen.getByRole('button', { name: '2마디 선택' }))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    expect(within(preview).queryByText('ff')).not.toBeInTheDocument()
    expect(
      within(preview)
        .getAllByText('mf')
        .some((element) => element.getAttribute('data-measure-id') === 'measure-2')
    ).toBe(true)

    chooseSelectionFilter('표기 필터', 'harmonies')
    fireEvent.click(screen.getByLabelText('선택 마디 코드 지우기'))
    expect(
      within(preview)
        .getAllByText('C7/G')
        .every((element) => element.getAttribute('data-measure-id') !== 'measure-2')
    ).toBe(true)

    chooseSelectionFilter('표기 필터', 'dynamics')
    fireEvent.click(screen.getByLabelText('선택 마디 셈여림 지우기'))
    expect(
      within(preview)
        .getAllByText('mf')
        .every((element) => element.getAttribute('data-measure-id') !== 'measure-2')
    ).toBe(true)
  // This complete menu/input/filter/copy/delete workflow is a bulk integration
  // scenario; keep every assertion and per-step wait under one finite budget.
  },45_000)

  it('studio.live-part-labels resolves and restores duplicate names without changing the subsequent input address',async()=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote,createRest}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0],staff=first.staves[0],measure=staff.measures[0]
    score.title='Live part names';first.id='first-part';first.name='Piano';staff.id='first-staff';measure.id='first-bar'
    const second=structuredClone(first);second.id='second-part';second.staves[0].id='second-staff';second.staves[0].measures[0].id='second-bar';second.staves[0].measures[0].voices[0].events[0].id='second-rest';score.parts.push(second)
    measure.voices[0].events=[createNote({id:'keep-c',pitch:{step:'C',octave:4},duration:{value:'quarter',dots:0}}),createNote({id:'keep-d',position:{tick:13440},pitch:{step:'D',octave:4},duration:{value:'quarter',dots:0}}),createRest({id:'keep-rest',position:{tick:26880},duration:{value:'half',dots:0}})]
    score.slurs=[{id:'keep-manual',startEventId:'keep-c',endEventId:'keep-d',engraving:{offsetX:0,height:3}}]
    score.rehearsalMarks=[{id:'keep-rehearsal',measureId:'measure-1',text:'A'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/live-parts.chromatics',fileName:'live-parts.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/live-parts.chromatics',fileName:'live-parts.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    chooseScoreView('악보 보기','part');fireEvent.click(screen.getByRole('combobox',{name:'파트보 선택'}));fireEvent.click(screen.getByRole('option',{name:'2 · Piano'}))
    const address=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
    expect(address).toBe('second-part:second-staff:second-bar:voice-1')
    const field=screen.getByRole('textbox',{name:'현재 파트 이름'});field.focus();fireEvent.change(field,{target:{value:'Solo'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const renamed=structuredClone(score);renamed.parts[1].name='Solo'
    expect(playbackMockState.lastScore).toEqual(renamed);expect(createPlaybackTimeline(renamed)).toEqual(createPlaybackTimeline(score))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',address!)
    expect(screen.getByRole('combobox',{name:'입력 보표'})).toHaveTextContent('Solo');expect(screen.getByRole('combobox',{name:'파트보 선택'})).toHaveTextContent('Solo')
    expect(screen.getByText('파트보: Solo')).toBeInTheDocument();expect(screen.getByLabelText('작업과 선택 상태')).toHaveTextContent('Solo · 보표 1 · 성부 1');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('combobox',{name:'입력 보표'})).toHaveTextContent('2 · Piano')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(renamed)
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'e',code:'KeyE'})
    const edited=structuredClone(playbackMockState.lastScore!),notes=edited.parts[1].staves[0].measures[0].voices[0].events.filter(event=>event.type==='note')
    expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject({pitch:{step:'E',octave:4},position:{tick:0}})
    expect(edited.parts[0]).toEqual(score.parts[0]);expect(edited.slurs).toEqual(score.slurs);expect(edited.rehearsalMarks).toEqual(score.rehearsalMarks);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(renamed)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    chooseScoreView('악보 보기','score');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    const {serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi'),reopened=parseMusicXml(serializeMusicXml(edited))
    expect(reopened.parts.map(part=>part.name)).toEqual(['Piano','Solo']);expect(serializeMidi(reopened)).toEqual(serializeMidi(edited))
    if(process.env.DDIRORI_LIVE_PART_LABELS_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),out=process.env.DDIRORI_LIVE_PART_LABELS_QA_DIR;mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'renamed.chromatics'),encodeNativeProject(createNativeProject(renamed)));writeFileSync(join(out,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(out,'edited.mid'),serializeMidi(edited))}
  },15000)

  it.each(['same','staff-collision'] as const)('studio.input-part-identity inputs into the intended %s part and preserves exact undo and saved names',async kind=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0],staff=first.staves[0],measure=staff.measures[0]
    score.title='입력 보표 구분 '+kind;first.id='first-part';first.name='Piano';staff.id='first-staff';measure.id='first-bar';measure.voices[0].events[0].id='first-rest'
    const second=structuredClone(first);second.id='second-part';second.name=kind==='same'?'Piano':'Piano 보표 1';second.staves[0].id='second-staff';second.staves[0].measures[0].id='second-bar';second.staves[0].measures[0].voices[0].events[0].id='second-rest';score.parts.push(second)
    if(kind==='staff-collision'){const lower=structuredClone(staff);lower.id='first-lower';lower.measures[0].id='first-lower-bar';lower.measures[0].voices[0].events[0].id='first-lower-rest';first.staves.push(lower)}
    const labels=kind==='same'?['1 · Piano','2 · Piano']:['1 · Piano 보표 1','1 · Piano 보표 2','2 · Piano 보표 1']
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/input-parts.chromatics',fileName:'input-parts.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/input-parts.chromatics',fileName:'input-parts.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    const select=screen.getByRole('combobox',{name:'입력 보표'});expect(select).toHaveTextContent(labels[0]);fireEvent.click(select)
    expect(within(screen.getByRole('listbox',{name:'입력 보표'})).getAllByRole('option').map(node=>node.textContent)).toEqual(labels)
    fireEvent.keyDown(select,{key:'Escape'});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(select);fireEvent.click(screen.getByRole('option',{name:labels.at(-1)!}))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','second-rest')
    expect(document.querySelector('.editor-status')).toHaveTextContent(labels.at(-1)!+'로 전환했습니다.')
    expect(screen.getByLabelText('작업과 선택 상태')).toHaveTextContent(`${kind==='same'?'2 · Piano':'Piano 보표 1'} · 보표 1 · 성부 1`)
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'e',code:'KeyE'})
    const edited=structuredClone(playbackMockState.lastScore!),notes=edited.parts[1].staves[0].measures[0].voices[0].events.filter(event=>event.type==='note')
    expect(notes).toHaveLength(1);expect(notes[0]).toMatchObject({pitch:{step:'E',octave:4}})
    expect(edited.parts[0]).toEqual(score.parts[0]);expect(edited.parts.map(part=>part.name)).toEqual(score.parts.map(part=>part.name));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    const {serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi'),reopened=parseMusicXml(serializeMusicXml(edited))
    expect(reopened.parts.map(part=>part.name)).toEqual(score.parts.map(part=>part.name));expect(serializeMidi(reopened)).toEqual(serializeMidi(edited))
    if(process.env.DDIRORI_INPUT_PART_IDENTITY_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),out=join(process.env.DDIRORI_INPUT_PART_IDENTITY_QA_DIR,kind);mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(out,'edited.mid'),serializeMidi(edited));writeFileSync(join(out,'labels.json'),JSON.stringify(labels))}
  })

  it('studio.part-view-identity distinguishes equally named parts without changing music history or saved names',async()=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0],staff=first.staves[0],measure=staff.measures[0]
    score.title='같은 이름의 파트 보기';first.id='first-part';first.name='Piano';staff.id='first-staff';measure.id='first-bar'
    measure.voices[0].events=[createNote({id:'first-part-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const second=structuredClone(first);second.id='second-part';second.staves[0].id='second-staff';second.staves[0].measures[0].id='second-bar'
    second.staves[0].measures[0].voices[0].events=[createNote({id:'second-part-note',pitch:{step:'D',octave:4},duration:{value:'whole',dots:0}})];score.parts.push(second)
    if(process.env.DDIRORI_PART_VIEW_IDENTITY_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMidi}=await import('./midi/serialize-midi'),out=process.env.DDIRORI_PART_VIEW_IDENTITY_QA_DIR;mkdirSync(out,{recursive:true});writeFileSync(join(out,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(out,'source.mid'),serializeMidi(score))}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/parts.chromatics',fileName:'parts.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/parts.chromatics',fileName:'parts.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    openStudioWorkspace('악보');chooseScoreView('악보 보기','part')
    const select=screen.getByRole('combobox',{name:'파트보 선택'});expect(select).toHaveTextContent('1 · Piano')
    fireEvent.click(select);fireEvent.click(screen.getByRole('option',{name:'2 · Piano'}))
    expect(screen.getByText('파트보: 2 · Piano')).toBeInTheDocument()
    expect(screen.getByLabelText('작업과 선택 상태')).toHaveTextContent('2 · Piano · 보표 1 · 성부 1')
    const preview=within(screen.getByTestId('notation-preview'))
    expect(preview.getByRole('button',{name:'second-part-note 선택'})).toBeInTheDocument();expect(preview.queryByRole('button',{name:'first-part-note 선택'})).toBeNull()
    fireEvent.keyDown(select,{key:' '});fireEvent.keyDown(select,{key:'Escape'});expect(select).toHaveFocus()
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    chooseScoreView('악보 보기','score');expect(preview.getByRole('button',{name:'first-part-note 선택'})).toBeInTheDocument()
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  })

  it('studio.object-filter copies rehearsal marks through the public filter while preserving notes and exact history',async()=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),staff=score.parts[0].staves[0],first=staff.measures[0]
    score.title='연습표 필터 복사';first.id='primary-first';first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const target=structuredClone(first);target.id='target';target.number=2;target.voices[0].events[0].id='target-note';staff.measures.push(target)
    const other=structuredClone(target);other.id='other-target';other.number=3;other.voices[0].events[0].id='other-note'
    score.parts.push({...structuredClone(score.parts[0]),id:'other-part',name:'Other instrument',staves:[{...structuredClone(staff),id:'other-staff',measures:[other]}]})
    score.rehearsalMarks=[{id:'source-rehearsal',measureId:'measure-1',text:'A1'},{id:'source-rehearsal-two',measureId:first.id,text:'A2'},
      {id:'old-rehearsal',measureId:target.id,text:'B1'},{id:'old-rehearsal-alias',measureId:'measure-2',text:'B2'}]
    score.staffTexts=[{id:'keep-staff',measureId:target.id,text:'Keep staff'}]
    score.systemTexts=[{id:'keep-system',measureId:target.id,text:'Keep system'}]
    score.slurs=[{id:'keep-manual',startEventId:'first-note',endEventId:'target-note',engraving:{offsetX:0,height:3}}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('combobox',{name:'표기 필터'}));fireEvent.click(screen.getByRole('option',{name:'연습표'}))
    expect(screen.getByText(/마디의 연습표만 복사·삭제합니다/)).toHaveTextContent('총보 첫 보표')
    fireEvent.click(screen.getByLabelText('선택 범위 복사'));expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','other-part')
    fireEvent.click(screen.getByRole('button',{name:'3마디 선택'}));openStudioWorkspace('파일');expect(screen.getByLabelText('선택 범위에 붙여넣기')).toBeDisabled()
    fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
    expect(screen.getByText('선택한 마디에 연습표를 붙여넣을 수 없습니다. 현재는 총보 첫 보표의 마디만 지원합니다.')).toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('악보');chooseScoreView('악보 보기','score')
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('파일');fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    const pasted=structuredClone(playbackMockState.lastScore!)
    expect(pasted.rehearsalMarks?.filter(mark=>mark.measureId===target.id).map(mark=>mark.text)).toEqual(['A1','A2'])
    expect(pasted.rehearsalMarks?.slice(0,2)).toEqual(score.rehearsalMarks.slice(0,2))
    expect(pasted.rehearsalMarks?.slice(2).every(mark=>!score.rehearsalMarks!.some(old=>old.id===mark.id))).toBe(true)
    expect({...pasted,rehearsalMarks:score.rehearsalMarks}).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByLabelText('선택 마디 연습표 지우기'));expect(playbackMockState.lastScore!.rehearsalMarks).toEqual(score.rehearsalMarks.slice(0,2))
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'first-note 선택'}));openStudioWorkspace('파일')
    expect(screen.getByLabelText('선택 범위 복사')).toBeDisabled();expect(screen.getByLabelText('선택 범위에 붙여넣기')).toBeDisabled()
    fireEvent.keyDown(window,{key:'Delete',code:'Delete'});fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(pasted)
  }, 15000)

  it('studio.object-filter copies only system text through alias ownership and preserves neighboring families history and native', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),staff=score.parts[0].staves[0],first=staff.measures[0];score.title='시스템 텍스트 복사'
    first.id='primary-first';const target=structuredClone(first);target.id='target';target.number=2;target.voices[0].events[0].id='target-rest';staff.measures.push(target)
    score.systemTexts=[{id:'system-source',measureId:'measure-1',text:'Source system'}, {id:'system-source-two',measureId:first.id,text:'Source system second'},
      {id:'old',measureId:'target',text:'Old system'}, {id:'old-alias',measureId:'measure-2',text:'Old system alias'}]
    score.staffTexts=[{id:'keep-staff',measureId:'target',text:'Keep staff'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/system.chromatics',fileName:'system.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/system.chromatics',fileName:'system.chromatics'})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('시스템 텍스트 복사')
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openStudioWorkspace('파일');chooseSelectionFilter('표기 필터','system-texts');fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('파일');fireEvent.click(screen.getByLabelText('선택 범위에 붙여넣기'))
    const pasted=structuredClone(playbackMockState.lastScore!)
    expect(pasted.systemTexts?.filter(t=>t.measureId==='target').map(t=>t.text)).toEqual(['Source system','Source system second'])
    expect(pasted.systemTexts?.some(t=>t.measureId==='measure-2')).toBe(false)
    expect({...pasted,systemTexts:score.systemTexts}).toEqual(score)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByLabelText('선택 마디 시스템 텍스트 지우기'))
    expect(playbackMockState.lastScore!.systemTexts).toEqual(score.systemTexts.slice(0,2))
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(pasted)
  })

  it.each([
    {scope:'global',kind:'automatic'},{scope:'global',kind:'custom'},
    {scope:'position',kind:'automatic'},{scope:'position',kind:'custom'},
    {scope:'position',kind:'absent'},{scope:'position',kind:'hidden'}
  ] as const)('studio.tempo-edit-label keeps $scope $kind text ownership and hidden state through one command',async ({scope,kind})=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{formatTempoMarkingText}=await import('./editor/new-score')
    const mark={bpm:80,beatUnit:'quarter' as const,dots:1,text:kind==='automatic'?'♩. = 80':kind==='absent'?undefined:'Andante con moto',transparent:kind==='hidden'?true:undefined}
    const source=createScore({tempo:scope==='global'?mark:{bpm:120,beatUnit:'quarter',dots:0,text:'Global tempo'}}),measure=source.parts[0].staves[0].measures[0]
    source.title=`Tempo label ${scope}-${kind}`;measure.voices[0].events=[createNote({id:'tempo-label-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    if(scope==='position')source.tempoEvents=[{id:'label-event',measureId:measure.id,tick:0,...mark}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/label.chromatics',fileName:'label.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/label.chromatics',fileName:'label.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title);fireEvent.click(screen.getByRole('button',{name:'tempo-label-note 선택'}));openStudioWorkspace('악보')
    if(scope==='global')fireEvent.change(within(screen.getByRole('region',{name:'빠르기'})).getByRole('slider',{name:/^빠르기/}),{target:{value:'81'}})
    else{const input=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});input.focus();fireEvent.change(input,{target:{value:'81'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)}
    const after=structuredClone(playbackMockState.lastScore!),target=scope==='global'?after.tempo:after.tempoEvents?.[0],text=kind==='automatic'?'♩. = 81':mark.text
    const {transparent,...visibleMark}=mark
    expect(target).toMatchObject({...visibleMark,bpm:81,text});expect(target?.transparent).toBe(transparent)
    expect(scope==='global'?{...after,tempo:source.tempo}:{...after,tempoEvents:source.tempoEvents}).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(after)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(after)
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1));const imported=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents),importedMark=scope==='global'?imported.tempo:imported.tempoEvents?.[0]
    expect(importedMark).toMatchObject({bpm:81,beatUnit:'quarter',dots:1,text:text??formatTempoMarkingText({bpm:81,beatUnit:'quarter',dots:1})});expect(Boolean(importedMark?.transparent)).toBe(Boolean(mark.transparent))
    const {serializeMidi}=await import('./midi/serialize-midi');expect(serializeMidi(imported)).toEqual(serializeMidi(after))
    if(process.env.DDIRORI_TEMPO_LABEL_EDIT_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_LABEL_EDIT_QA_DIR,`${scope}-${kind}`);mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(after)));writeFileSync(join(dir,'edited.mid'),serializeMidi(after));writeFileSync(join(dir,'expectations.json'),JSON.stringify({scope,kind,text:text??formatTempoMarkingText({bpm:81,beatUnit:'quarter',dots:1}),hidden:kind==='hidden'}))
    }
  })

  it.each(['sound','offset-default','override','direct-secondary'] as const)('studio.tempo-import-warning explains %s limits in Korean and keeps diagnostics and native model',async kind=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const beat=kind==='sound'?'half':'quarter',sound=kind==='sound'?90:96,offset=kind==='offset-default'?'<offset>1</offset>':'<offset sound="yes">1</offset>'
    let xml=`<score-partwise version="4.0"><work><work-title>Tempo warning ${kind}</work-title></work><part-list><score-part id="P1"><part-name>Solo</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120"/></direction><direction><direction-type><words>Change</words></direction-type><direction-type><metronome><beat-unit>${beat}</beat-unit><per-minute>96</per-minute></metronome></direction-type>${offset}<sound tempo="${sound}">${kind==='override'?'<offset>2</offset>':''}</sound></direction><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><type>whole</type></note></measure></part></score-partwise>`
    if(kind==='direct-secondary')xml=(await import('../../testing/direct-sound-tempo-fixture')).createDirectSoundTempoFixture('secondary').xml
    const {createNativeProject,decodeNativeProject}=await import('../../project/schema'),baseline=parseMusicXml(xml)
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/tempo-warning.musicxml',fileName:'tempo-warning.musicxml',contents:xml})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/tempo-warning.chromatics',fileName:'tempo-warning.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(kind==='direct-secondary'?'Direct sound tempo secondary':'Tempo warning '+kind)
    const report=within(screen.getByRole('region',{name:'MusicXML 경고 상세'})),human=kind==='direct-secondary'?'마디에 직접 기록된 빠르기 정보는 별도로 보존하지 못했습니다.':kind==='sound'?'표시 빠르기와 별도로 지정된 재생 빠르기는 지원하지 않습니다.':'빠르기 기호와 다른 재생 위치는 지원하지 않습니다.'
    expect(report.getByText(new RegExp(human))).toBeVisible();expect(report.getByText(new RegExp(human))).toHaveTextContent(kind==='direct-secondary'?'2번째 파트 · 1마디':'1번째 파트 · 1마디')
    const raw=report.getByText(kind==='direct-secondary'?/Direct measure sound tempo/:/Independent (sound tempo|tempo offset)/);expect(raw).not.toBeVisible();fireEvent.click(report.getByText('기술 정보'));expect(raw).toBeVisible()
    expect(report.getByText(kind==='direct-secondary'?/part\[2\]\.measure\[1\]\.sound\[1\]\.tempo/:/part\[1\]\.measure\[1\]\.direction\[2\]/)).toBeVisible()
    fireEvent.keyDown(report.getByText('기술 정보'),{key:' ',code:'Space'});fireEvent.keyDown(report.getByText('기술 정보'),{key:'Enter',code:'Enter'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(baseline)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(createNativeProject(baseline).score)
  })

  it('studio.direct-tempo-effective-location edits the last hidden value once and retains earlier source entries',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createDirectSoundTempoFixture}=await import('../../testing/direct-sound-tempo-fixture')
    const xml=createDirectSoundTempoFixture('direct').xml.replace('<sound tempo="60"><offset>1</offset></sound>','<sound tempo="60"/><sound tempo="90"/>')
    const source=parseMusicXml(xml),event=source.parts[0].staves[0].measures[0].voices[0].events[0]
    expect(source.tempoEvents?.map(mark=>mark.bpm)).toEqual([60,90])
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/direct.musicxml',fileName:'direct.musicxml',contents:xml})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/direct.chromatics',fileName:'direct.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(source.title)
    expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}));openStudioWorkspace('악보')
    const field=within(screen.getByRole('region',{name:'위치별 빠르기'})).getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    expect(field).toHaveValue(90)
    act(()=>field.focus());fireEvent.change(field,{target:{value:'88'}});fireEvent.keyDown(field,{key:'Enter',code:'Enter'});fireEvent.blur(field)
    const edited=structuredClone(playbackMockState.lastScore!)
    expect(edited.tempoEvents?.map(mark=>mark.bpm)).toEqual([60,88])
    expect(edited.tempoEvents![0]).toEqual(source.tempoEvents![0])
    expect(edited.tempoEvents![1]).toEqual({...source.tempoEvents![1],bpm:88,text:'♩ = 88'})
    expect({...edited,tempoEvents:source.tempoEvents}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    const current=within(screen.getByRole('region',{name:'위치별 빠르기'})).getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    expect(screen.getByText(/같은 위치의 지정 2개 중 마지막 값/)).toBeVisible()
    act(()=>current.focus());fireEvent.change(current,{target:{value:''}});fireEvent.keyDown(current,{key:'Enter',code:'Enter'});fireEvent.blur(current)
    expect(playbackMockState.lastScore!.tempoEvents).toEqual([source.tempoEvents![0]])
    expect(screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'})).toHaveValue(60)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const {decodeNativeProject}=await import('../../project/schema')
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  })

  it('studio.direct-tempo-point-picker reaches hidden changes inside a held note without leaking a composing draft',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createDirectSoundTempoFixture}=await import('../../testing/direct-sound-tempo-fixture')
    const xml=createDirectSoundTempoFixture('direct').xml.replace('</measure>','<sound tempo="90"><offset>-2</offset></sound></measure>')
    const source=parseMusicXml(xml),event=source.parts[0].staves[0].measures[0].voices[0].events[0]
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/points.musicxml',fileName:'points.musicxml',contents:xml})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(source.title)
    fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}));openStudioWorkspace('악보')
    const choose=(pattern:RegExp)=>{fireEvent.click(screen.getByRole('combobox',{name:'편집할 빠르기 위치'}));fireEvent.click(screen.getByRole('option',{name:pattern}))}
    choose(/1마디.*2박.*60 BPM.*숨김/)
    const first=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});expect(first).toHaveValue(60)
    await waitFor(()=>expect(first).toHaveFocus())
    expect(first).toHaveAttribute('aria-description',expect.stringContaining('2박'))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',event.id)
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.compositionStart(first);fireEvent.change(first,{target:{value:'77'}})
    choose(/1마디.*3박.*90 BPM.*숨김/)
    fireEvent.compositionEnd(first);fireEvent.blur(first)
    const second=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});expect(second).toHaveValue(90)
    expect(playbackMockState.lastScore).toEqual(source)
    act(()=>second.focus());fireEvent.change(second,{target:{value:'88'}});fireEvent.keyDown(second,{key:'Enter',code:'Enter'});fireEvent.blur(second)
    const edited=structuredClone(playbackMockState.lastScore!)
    expect(edited.tempoEvents![0]).toEqual(source.tempoEvents![0])
    expect(edited.tempoEvents![1]).toEqual({...source.tempoEvents![1],bpm:88,text:'♩ = 88'})
    expect({...edited,tempoEvents:source.tempoEvents}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.tempo-point-unit describes an existing dotted-half rate and preserves its unit when edited',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createDirectSoundTempoFixture}=await import('../../testing/direct-sound-tempo-fixture')
    const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const source=parseMusicXml(createDirectSoundTempoFixture('direct').xml)
    source.tempoEvents![0]={...source.tempoEvents![0],bpm:90,beatUnit:'half',dots:1,text:'Allegro'}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/unit.chromatics',fileName:'unit.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
    const event=source.parts[0].staves[0].measures[0].voices[0].events[0];fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}));openStudioWorkspace('악보')
    fireEvent.click(screen.getByRole('combobox',{name:'편집할 빠르기 위치'}));fireEvent.click(screen.getByRole('option',{name:/점2분음표.*90 BPM/}))
    const input=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});expect(input).toHaveAttribute('aria-description',expect.stringContaining('BPM 기준: 점2분음표'))
    expect(input).toHaveValue(90);expect(playbackMockState.lastScore).toEqual(source)
    act(()=>input.focus());fireEvent.change(input,{target:{value:'88'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempoEvents).toEqual([{...source.tempoEvents![0],bpm:88}]);expect({...edited,tempoEvents:source.tempoEvents}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    if(process.env.DDIRORI_TEMPO_UNIT_OUT){
      const {serializeMidi}=await import('./midi/serialize-midi'),{serializeMusicXml}=await import('../../musicxml/serialize')
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_UNIT_OUT,'legacy-rate');mkdirSync(dir,{recursive:true})
      for(const [name,value]of [['source',source],['edited',edited]]as const){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));writeFileSync(join(dir,name+'.mid'),serializeMidi(value));writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(value))}
    }
  })

  it('studio.tempo-point-unit uses the requested measures meter after clearing and recreating a hidden change',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createDirectSoundTempoFixture}=await import('../../testing/direct-sound-tempo-fixture')
    const xml=createDirectSoundTempoFixture('direct').xml.replace('<sound tempo="60"><offset>1</offset></sound>','').replace('</part>','<measure number="2"><attributes><time><beats>6</beats><beat-type>8</beat-type></time></attributes><sound tempo="60"><offset>1</offset></sound><note><pitch><step>D</step><octave>4</octave></pitch><duration>3</duration><type>half</type><dot/></note></measure></part>')
    const source=parseMusicXml(xml),event=source.parts[0].staves[0].measures[0].voices[0].events[0],target=source.parts[0].staves[0].measures[1]
    vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/meter.musicxml',fileName:'meter.musicxml',contents:xml})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(source.title)
    fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}));openStudioWorkspace('악보');fireEvent.click(screen.getByRole('combobox',{name:'편집할 빠르기 위치'}));fireEvent.click(screen.getByRole('option',{name:/2마디.*2박.*60 BPM/}))
    let input=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});act(()=>input.focus());fireEvent.change(input,{target:{value:''}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    expect(playbackMockState.lastScore!.tempoEvents).toBeUndefined();const cleared=structuredClone(playbackMockState.lastScore!);input=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'});act(()=>input.focus());fireEvent.change(input,{target:{value:'90'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempoEvents).toHaveLength(1)
    expect(edited.tempoEvents![0]).toMatchObject({measureId:target.id,tick:TICKS_PER_QUARTER,bpm:90,beatUnit:'quarter',dots:1})
    expect({...edited,tempoEvents:source.tempoEvents}).toEqual(source);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',event.id);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore!.tempoEvents).toBeUndefined();fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    if(process.env.DDIRORI_TEMPO_UNIT_OUT){
      const {serializeMidi}=await import('./midi/serialize-midi'),{serializeMusicXml}=await import('../../musicxml/serialize')
      const {createNativeProject,encodeNativeProject}=await import('../../project/schema'),{mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_TEMPO_UNIT_OUT,'target-meter');mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.musicxml'),xml)
      for(const [name,value]of [['source',source],['cleared',cleared],['edited',edited]]as const){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));writeFileSync(join(dir,name+'.mid'),serializeMidi(value))}
      writeFileSync(join(dir,'edited.musicxml'),serializeMusicXml(edited))
    }
  })

  it.each(['count','volta','context-end','context-volta'] as const)('studio.repeat-edit-scope edits performed source for %s from another part',async action=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {secondaryRepeatFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {score}=secondaryRepeatFixture('lower',action.includes('volta')?'volta':'repeat'),before=structuredClone(score),expected=structuredClone(score),target=expected.parts[0].staves[1].measures[1]
    if(action==='count')target.repeat={end:true,times:3}
    else if(action==='context-end')target.repeat=undefined
    else target.volta=undefined
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/repeat-scope.chromatics',fileName:'repeat-scope.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','other-part')
    const selected=screen.getByRole('button',{name:'2마디 선택'});fireEvent.click(selected)
    if(action.startsWith('context')){fireEvent.contextMenu(selected,{clientX:200,clientY:150});fireEvent.click(within(screen.getByRole('menu',{name:'마디 작업'})).getByRole('menuitem',{name:action==='context-end'?'도돌이표 끝':'1번 볼타'}))}
    else{openNotationSettings('repeat');const tools=screen.getByRole('region',{name:'반복과 볼타'});if(action==='count'){const field=within(tools).getByRole('spinbutton',{name:'반복 횟수'});act(()=>field.focus());fireEvent.change(field,{target:{value:'3'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)}else fireEvent.click(within(tools).getByRole('button',{name:'1번 볼타'}))}
    expect(playbackMockState.lastScore).toEqual(expected)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(playbackMockState.lastPreviewScore!.parts[0].id).toBe('other-part')
    openNotationSettings('repeat');expect(within(screen.getByRole('region',{name:'반복과 볼타'})).getByText('총보 공통 반복 · Piano · 보표 2 · 2마디')).toBeVisible()
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
  })

  it.each(['none','unaligned'] as const)('studio.part-repeat-inheritance does not invent a shared sequence for %s source',async kind=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {secondaryRepeatFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi');const {score}=secondaryRepeatFixture('lower','repeat')
    if(kind==='none')for(const part of score.parts)for(const staff of part.staves)for(const m of staff.measures){m.repeat=undefined;m.volta=undefined}
    else{const m=score.parts[0].staves[1].measures[0];m.timeSignature={beats:3,beatType:4};m.voices[0].events[0].duration={value:'half',dots:1}}
    const before=structuredClone(score),part=score.parts[1],expected={...score,parts:[part]};vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/no-shared-repeat.chromatics',fileName:'no-shared-repeat.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',part.id)
    expect(playbackMockState.lastPreviewScore!.parts).toEqual([part]);openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}));await waitFor(()=>expect(window.inC.midi.save).toHaveBeenCalledOnce());expect(new Uint8Array(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)).toEqual(serializeMidi(expected));expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each((['repeat','volta'] as const).flatMap(kind=>(['midi','xml'] as const).map(channel=>({kind,channel}))))('studio.part-repeat-inheritance keeps $kind in $channel of another selected part',async({kind,channel})=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {secondaryRepeatFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi');const {score,staff}=secondaryRepeatFixture('lower',kind),before=structuredClone(score),part=structuredClone(score.parts[1]);for(const target of part.staves)for(const [i,m]of target.measures.entries()){m.repeat=staff.measures[i].repeat;m.volta=staff.measures[i].volta}const expected={...score,parts:[part]}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/part-repeat.chromatics',fileName:'part-repeat.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',part.id);openStudioWorkspace('내보내기')
    if(channel==='midi'){fireEvent.click(screen.getByRole('button',{name:'MIDI 내보내기'}));await waitFor(()=>expect(window.inC.midi.save).toHaveBeenCalledOnce());expect(new Uint8Array(vi.mocked(window.inC.midi.save).mock.calls[0][0].contents)).toEqual(serializeMidi(expected))}
    else{fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());expect(serializeMidi(parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents))).toEqual(serializeMidi(expected))}
    expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    if(process.env.DDIRORI_PART_REPEAT_QA_DIR&&channel==='xml'){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_PART_REPEAT_QA_DIR,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'expected-part.chromatics'),encodeNativeProject(createNativeProject(expected)));writeFileSync(join(dir,'expected-part.mid'),serializeMidi(expected));writeFileSync(join(dir,'expectations.json'),JSON.stringify({kind,partId:part.id,beats:kind==='repeat'?24:20}))}
  })

  it.each(['repeat','volta'] as const)('studio.part-repeat-inheritance shows performed $kind in another part without moving native owners',async kind=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {secondaryRepeatFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema');const {score,staff}=secondaryRepeatFixture('lower',kind),before=structuredClone(score)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/part-display.chromatics',fileName:'part-display.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[1].id)
    expect(playbackMockState.lastPreviewScore!.parts).toHaveLength(1);expect(playbackMockState.lastPreviewScore!.parts[0].staves[0].measures.map(m=>({repeat:m.repeat,volta:m.volta}))).toEqual(staff.measures.map(m=>({repeat:m.repeat,volta:m.volta})));expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['edit-part-switch','replace-document'] as const)('studio.part-copy-report-snapshot preserves the copied context through %s',async scenario=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {partRepeatProjectionFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMusicXml}=await import('../../musicxml/serialize'),{serializeMidi}=await import('./midi/serialize-midi'),{score,expected}=partRepeatProjectionFixture('repeat')
    let finish!:(result:{filePath:string;fileName:string}|null)=>void,settled=false
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/pending-part.chromatics',fileName:'pending-part.chromatics',contents:encodeNativeProject(createNativeProject(score))});vi.mocked(window.inC.musicXml.exportCopy).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[0].id);openStudioWorkspace('내보내기');const trigger=screen.getByRole('button',{name:'MusicXML 내보내기'});act(()=>trigger.focus());fireEvent.click(trigger);await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());expect(trigger).toBeDisabled();const snapshot=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents;expect(snapshot).toBe(serializeMusicXml(expected));expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
    try{
      if(scenario==='edit-part-switch'){fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));const title=screen.getByLabelText('악보 제목');fireEvent.change(title,{target:{value:'Later title after copy'}});fireEvent.keyDown(title,{key:'Enter'});openStudioWorkspace('악보');chooseScoreView('파트보 선택','other-part');act(()=>screen.getByRole('combobox',{name:'파트보 선택'}).focus())}
      else{openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}));const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'}));fireEvent.change(wizard.getByRole('textbox',{name:'제목'}),{target:{value:'Replacement without old warning'}});fireEvent.click(wizard.getByRole('button',{name:'만들기'}));openStudioWorkspace('내보내기');expect(screen.getByRole('button',{name:'MusicXML 내보내기'})).toBeDisabled();expect(document.querySelector('.editor-status')).not.toHaveTextContent('내보내는 중')}
      const current=structuredClone(playbackMockState.lastScore!),selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),clears=vi.mocked(window.inC.autosave.clear).mock.calls.length
      await act(async()=>{settled=true;finish({filePath:'/export/older-piano.musicxml',fileName:'older-piano.musicxml'})})
      expect(playbackMockState.lastScore).toEqual(current);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected);expect(window.inC.autosave.clear).toHaveBeenCalledTimes(clears);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
      if(scenario==='edit-part-switch'){expect(current.title).toBe('Later title after copy');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(document.querySelector('.editor-status')).toHaveTextContent('내보내기 시작 이후의 수정 내용은 포함되지 않았습니다.');expect(screen.getByRole('combobox',{name:'파트보 선택'})).toHaveFocus();expect(playbackMockState.lastPreviewScore!.parts[0].id).toBe('other-part');const report=screen.getByRole('region',{name:'MusicXML 경고 상세'});expect(within(report).getByText('older-piano.musicxml')).toBeVisible();expect(within(report).getByText(/Piano · 보표 2 · 2마디/)).toBeVisible()}
      else{expect(current.title).toBe('Replacement without old warning');expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument();expect(document.querySelector('.editor-status')).not.toHaveTextContent('older-piano.musicxml');expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(screen.getByRole('button',{name:'MusicXML 내보내기'})).toBeEnabled()}
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(current);expect(vi.mocked(window.inC.project.save).mock.calls[0][0].filePath).toBe(scenario==='edit-part-switch'?'/scores/pending-part.chromatics':undefined)
      if(process.env.DDIRORI_PART_COPY_SNAPSHOT_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_PART_COPY_SNAPSHOT_QA_DIR,scenario);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'expected-current.chromatics'),encodeNativeProject(createNativeProject(current)));writeFileSync(join(dir,'expected-copy.musicxml'),snapshot);writeFileSync(join(dir,'expected-copy.mid'),serializeMidi(expected));writeFileSync(join(dir,'expectations.json'),JSON.stringify({scenario,title:current.title,currentPartId:scenario==='edit-part-switch'?'other-part':current.parts[0].id}))}
    }finally{if(!settled)await act(async()=>{finish(null)})}
  })

  it.each(['repeat','volta','empty','identical'] as const)('studio.part-repeat-copy-warning describes only overwritten %s staff settings',async kind=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {partRepeatProjectionFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMusicXml}=await import('../../musicxml/serialize'),{serializeMidi}=await import('./midi/serialize-midi')
    const {score,expected}=partRepeatProjectionFixture(kind),before=structuredClone(score),goldenXml=serializeMusicXml(expected),goldenMidi=serializeMidi(expected)
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/part-copy.musicxml',fileName:'part-copy.musicxml'})
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/part-repeat-warning.chromatics',fileName:'part-repeat-warning.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[0].id);openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('part-copy.musicxml'));const xml=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents
    expect(xml).toBe(goldenXml);expect(serializeMidi(parseMusicXml(xml))).toEqual(goldenMidi);expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
    if(process.env.DDIRORI_PART_REPEAT_WARNING_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=join(process.env.DDIRORI_PART_REPEAT_WARNING_QA_DIR,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(before)));writeFileSync(join(dir,'expected-part.musicxml'),goldenXml);writeFileSync(join(dir,'expected-part.mid'),goldenMidi);writeFileSync(join(dir,'expected-part.chromatics'),encodeNativeProject(createNativeProject(expected)));writeFileSync(join(dir,'expectations.json'),JSON.stringify({kind,partId:score.parts[0].id,beats:24}))}
    if(kind==='repeat'||kind==='volta'){const report=screen.getByRole('region',{name:'MusicXML 경고 상세'});expect(within(report).getByText('MusicXML 내보내기 경고 1개')).toBeVisible();expect(within(report).getByText(/보표별로 다른 반복·볼타 설정은 사본에 포함되지 않습니다/)).toBeVisible();expect(within(report).getByText(/Piano · 보표 2 · 2마디/)).toBeVisible();const raw=within(report).getByText(/Independent staff repeat and volta/);expect(raw).not.toBeVisible();fireEvent.click(within(report).getByText('기술 정보'));expect(raw).toBeVisible()}
    else expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(before)
  })

  it('studio.part-repeat-copy-warning does not publish a successful projection warning for a cancelled copy',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {partRepeatProjectionFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{score}=partRepeatProjectionFixture('repeat')
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/part-repeat-cancel.chromatics',fileName:'part-repeat-cancel.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[0].id);openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await act(async()=>{});expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce();expect(document.querySelector('.editor-status')).not.toHaveTextContent('MusicXML\uC744 \uB0B4\uBCF4\uB0C8\uC2B5\uB2C8\uB2E4');expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  })

  it.each(['save','copy'] as const)('studio.articulation-order permits supported dirty %s without weakening the save guard',async channel=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore();score.title='Articulation order safe export';score.parts[0].staves[0].measures[0].voices[0].events=[createNote({id:'articulation-order-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0},articulations:['accent','staccato']})]
    const before=structuredClone(score),result={filePath:'/scores/articulation-order.musicxml',fileName:'articulation-order.musicxml'}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/articulation-order.chromatics',fileName:'articulation-order.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.musicXml.save).mockResolvedValue(result);vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue(result)
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'articulation-order-note 선택'}));fireEvent.keyDown(window,{code:'KeyD',key:'d'})
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited).not.toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    openStudioWorkspace(channel==='save'?'파일':'내보내기');fireEvent.click(screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'}))
    const bridge=vi.mocked(channel==='save'?window.inC.musicXml.save:window.inC.musicXml.exportCopy);await waitFor(()=>expect(bridge).toHaveBeenCalledOnce())
    const xml=bridge.mock.calls[0][0].contents,roundtrip=parseMusicXml(xml),note=roundtrip.parts[0].staves[0].measures[0].voices[0].events[0]
    expect(note).toMatchObject({type:'note',articulations:['accent','staccato']});expect(playbackMockState.lastScore).toEqual(edited);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
    expect(window.inC.project.save).not.toHaveBeenCalled();if(channel==='copy')expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    fireEvent.keyDown(window,{code:'KeyZ',key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before);fireEvent.keyDown(window,{code:'KeyZ',key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  })

  it.each(['save','copy'] as const)('studio.metadata-save-feedback keeps blocked %s editable and recovers through actual metadata commands',async channel=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore();score.title='이전 제목  ';score.composer='작곡가 원본  '
    score.parts[0].staves[0].measures[0].voices[0].events=[createNote({id:'metadata-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/metadata.chromatics',fileName:'metadata.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/metadata.chromatics',fileName:'metadata.chromatics'})
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({filePath:'/scores/metadata.musicxml',fileName:'metadata.musicxml'})
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/metadata.musicxml',fileName:'metadata.musicxml'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('metadata.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button',{name:'metadata-note 선택'}));fireEvent.keyDown(window,{key:'d',code:'KeyD'});const edited=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace(channel==='save'?'파일':'내보내기');const label=channel==='save'?'MusicXML로 저장':'MusicXML 내보내기',trigger=screen.getByRole('button',{name:label});act(()=>trigger.focus());fireEvent.click(trigger);await act(async()=>{})
    expect(document.querySelector('.editor-status')).toHaveTextContent('제목·작곡가')
    expect(document.querySelector('.editor-status')).toHaveTextContent('악보 정보')
    expect(document.querySelector('.editor-status')).toHaveTextContent('프로젝트로 저장')
    const technical=screen.getByRole('group',{name:channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보'}),raw=within(technical).getByText(/\(title, composer\)/)
    expect(raw).not.toBeVisible();fireEvent.click(within(technical).getByText('기술 정보'));expect(raw).toBeVisible()
    fireEvent.keyDown(within(technical).getByText('기술 정보'),{key:'Enter'});fireEvent.keyDown(within(technical).getByText('기술 정보'),{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(edited);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','metadata-note');expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');await waitFor(()=>expect(trigger).toHaveFocus())
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    const normalized=structuredClone(edited);normalized.title=edited.title.trim();normalized.composer=edited.composer!.trim()
    for(const [action,field]of [['악보 제목 편집','악보 제목'],['작곡가 편집','작곡가']]as const){
      fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:action}));const input=screen.getByRole('textbox',{name:field});expect(input).toHaveFocus();fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input);await act(async()=>{});expect(screen.getByRole('button',{name:'악보 정보'})).toHaveFocus()
    }
    expect(playbackMockState.lastScore).toEqual(normalized);expect(document.querySelector('.editor-status')).toHaveTextContent('3회 수정');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','metadata-note')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual({...normalized,composer:edited.composer})
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    for(let i=0;i<3;i++)fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(normalized)
    openStudioWorkspace(channel==='save'?'파일':'내보내기');const retry=screen.getByRole('button',{name:label});act(()=>retry.focus());fireEvent.click(retry);const ipc=channel==='save'?window.inC.musicXml.save:window.inC.musicXml.exportCopy;await waitFor(()=>expect(ipc).toHaveBeenCalledOnce());await waitFor(()=>expect(retry).toHaveFocus())
    const reopened=parseMusicXml(vi.mocked(ipc).mock.calls[0][0].contents);expect(reopened.title).toBe(normalized.title);expect(reopened.composer).toBe(normalized.composer);expect(serializeMidi(reopened)).toEqual(serializeMidi(edited));expect(playbackMockState.lastScore).toEqual(normalized)
    if(channel==='copy')expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(2));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1][0].contents).score).toEqual(normalized)
  },15_000)

  it.each(['save','copy'] as const)('studio.repeat-conflict-feedback explains blocked %s without losing native history',async channel=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {secondaryRepeatFixture}=await import('../../testing/secondary-repeat-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {score}=secondaryRepeatFixture('lower','repeat');score.parts[0].staves[0].measures[0].repeat={start:true};score.title='Repeat conflict feedback';const before=structuredClone(score)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/repeat-conflict.chromatics',fileName:'repeat-conflict.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);fireEvent.click(screen.getByRole('button',{name:'primary-note-0 선택'}));fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited).not.toEqual(before);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    openStudioWorkspace(channel==='save'?'파일':'내보내기');const trigger=screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'});act(()=>trigger.focus());fireEvent.click(trigger);await act(async()=>{});await waitFor(()=>expect(trigger).toHaveFocus())
    expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
    expect(screen.getByText(/보표별 반복·볼타 설정이 달라 MusicXML로 모두 보존할 수 없습니다/)).toBeVisible();expect(screen.getByText(/프로젝트로 저장해 원본을 유지해 주세요/)).toBeVisible();expect(screen.getByText(/확인할 위치: Piano · 보표 2 · 2마디/)).toBeVisible()
    const detail=screen.getByRole('group',{name:channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보'}),raw=within(detail).getByText(/\(parts\)/);expect(raw).not.toBeVisible();fireEvent.click(within(detail).getByText('기술 정보'));expect(raw).toBeVisible();expect(raw).toHaveTextContent('lower-staff');fireEvent.keyDown(within(detail).getByText('기술 정보'),{key:'Enter'});fireEvent.keyDown(within(detail).getByText('기술 정보'),{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(edited);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','primary-note-0');expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before);fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    if(process.env.DDIRORI_REPEAT_CONFLICT_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=process.env.DDIRORI_REPEAT_CONFLICT_QA_DIR;mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(before)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)))}
  })

  it.each(['primary','lower','conflict'] as const)('studio.secondary-repeat-save preserves safe part barlines and rejects %s conflict',async owner=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore();score.title='Repeat save '+owner;const primary=score.parts[0].staves[0],base=primary.measures[0];primary.measures=[0,1].map(i=>({...structuredClone(base),id:'primary-'+i,number:i+1,voices:[{id:'voice-1',events:[createNote({id:'primary-note-'+i,pitch:{step:i?'D':'C',octave:4},duration:{value:'whole',dots:0}})]}]}));const lower=structuredClone(primary);lower.id='lower-staff';for(const [i,m]of lower.measures.entries()){m.id='lower-'+i;m.voices[0].events[0].id='lower-note-'+i}score.parts[0].staves.push(lower);const marked=owner==='primary'?primary:lower;marked.measures[0].repeat={start:true};marked.measures[1].repeat={end:true,times:2};if(owner==='conflict')primary.measures[0].repeat={start:true}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/repeats.chromatics',fileName:'repeats.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title);const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    if(owner==='conflict'){await within(screen.getByRole('status',{name:'편집 및 파일 상태'})).findByText(/MusicXML 저장 검증에 실패했습니다/);expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()}
    else{await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce());const xml=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents;expect(serializeMidi(parseMusicXml(xml))).toEqual(serializeMidi(score))}
    expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  })

  it.each([false,true])('studio.tempo-save-guard rejects off-primary tempo loss for copy=%s while preserving native history', async copy=>{
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote,TICKS_PER_QUARTER}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {serializeMidi}=await import('./midi/serialize-midi'),{serializeMusicXml}=await import('../../musicxml/serialize')
    const score=createScore();score.title='Positioned tempo save guard';score.tempo={bpm:120,beatUnit:'quarter',dots:0}
    const first=score.parts[0].staves[0].measures[0];first.id='guard-primary';first.voices[0].events=[createNote({id:'guard-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const part=structuredClone(score.parts[0]);part.id='guard-neighbor';part.name='Flute';part.staves[0].id='guard-neighbor-staff';part.staves[0].measures[0].id='guard-other';part.staves[0].measures[0].voices[0].events[0].id='guard-other-note';score.parts.push(part)
    score.tempoEvents=[{id:'primary-rit',measureId:first.id,tick:TICKS_PER_QUARTER,bpm:84,beatUnit:'quarter',dots:0,text:'Primary rit'},{id:'neighbor-rit',measureId:'guard-other',tick:TICKS_PER_QUARTER*2,bpm:72,beatUnit:'half',dots:1,text:'Other rit'}]
    const raw=parseMusicXml(serializeMusicXml(score));expect(raw.tempoEvents?.map(item=>item.text)).toEqual(['Primary rit']);expect(serializeMidi(raw)).not.toEqual(serializeMidi(score))
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/guard.chromatics',fileName:'guard.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/guard.chromatics',fileName:'guard.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'guard-note 선택'}));fireEvent.keyDown(window,{key:'d',code:'KeyD'})
    const edited=structuredClone(playbackMockState.lastScore!)
    expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
    openStudioWorkspace(copy?'내보내기':'파일');fireEvent.click(screen.getByRole('button',{name:copy?'MusicXML 내보내기':'MusicXML로 저장'}));await act(async()=>{})
    expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
    expect(document.querySelector('.editor-status')).toHaveTextContent('MusicXML 저장 검증에 실패했습니다')
    expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','guard-note')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택','guard-neighbor')
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const partXml=vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents,partScore=parseMusicXml(partXml)
    expect(partScore.parts).toHaveLength(1);expect(partScore.tempoEvents?.map(({bpm,beatUnit,dots,text})=>({bpm,beatUnit,dots,text}))).toEqual([{bpm:72,beatUnit:'half',dots:1,text:'Other rit'}]);expect(playbackMockState.lastScore).toEqual(edited)
    if(process.env.DDIRORI_TEMPO_SAVE_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),dir=process.env.DDIRORI_TEMPO_SAVE_QA_DIR;mkdirSync(dir,{recursive:true})
      writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)))
      writeFileSync(join(dir,'part.musicxml'),partXml);writeFileSync(join(dir,'part.mid'),serializeMidi(partScore))
    }
  })

  it.each([{kind:'system',channel:'save'},{kind:'system',channel:'copy'},{kind:'mixed',channel:'save'},{kind:'mixed',channel:'copy'},{kind:'broad',channel:'save'},{kind:'broad',channel:'copy'}]as const)('studio.signature-save-feedback describes $kind/$channel loss without altering unsupported data',async({kind,channel})=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {musicXmlSignatureConflictFixture}=await import('../../testing/musicxml-signature-conflict-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const source=musicXmlSignatureConflictFixture(kind),before=structuredClone(source)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/signature.chromatics',fileName:'signature.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/signature.chromatics',fileName:'signature.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('signature.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button',{name:'signature-note 선택'}));fireEvent.keyDown(window,{key:'d',code:'KeyD'});const edited=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace(channel==='save'?'파일':'내보내기');const trigger=screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'});act(()=>trigger.focus());fireEvent.click(trigger);await act(async()=>{})
    const status=document.querySelector('.editor-status')!;if(kind==='broad'){expect(status).toHaveTextContent('위치별 빠르기 외 1개 항목')}else expect(status).toHaveTextContent('시스템 텍스트');expect(status).toHaveTextContent('프로젝트로 저장');expect(status).not.toHaveTextContent('systemTexts')
    if(kind!=='system'){expect(status).toHaveTextContent('제목');expect(status).toHaveTextContent('작곡가')}
    const details=screen.getByRole('group',{name:channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보'}),diagnostic=kind==='broad'?'(title, composer, 위치별 빠르기(tempoEvents), systemTexts)':kind==='mixed'?'(title, composer, systemTexts)':'(systemTexts)',raw=within(details).getByText(text=>text.includes(diagnostic))
    expect(raw).not.toBeVisible();await waitFor(()=>expect(trigger).toHaveFocus());fireEvent.click(within(details).getByText('기술 정보'));expect(raw).toBeVisible();expect(raw).toHaveTextContent(diagnostic)
    fireEvent.keyDown(within(details).getByText('기술 정보'),{key:'Enter'});fireEvent.keyDown(within(details).getByText('기술 정보'),{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','signature-note')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before);fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    expect(edited.systemTexts).toEqual(before.systemTexts);expect(edited.title).toBe(before.title);expect(edited.composer).toBe(before.composer)
  })

  it('studio.object-filter preserves legacy off-primary system text and existing export-loss rejection', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore();score.title='기존 다른 파트 시스템 텍스트'
    const part=structuredClone(score.parts[0]);part.id='other-part';part.staves[0].id='other-staff';part.staves[0].measures[0].id='other-measure';part.staves[0].measures[0].voices[0].events[0].id='other-rest';score.parts.push(part)
    score.systemTexts=[{id:'legacy-system',measureId:'other-measure',text:'Legacy other-part system'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/legacy-system.chromatics',fileName:'legacy-system.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/legacy-system.chromatics',fileName:'legacy-system.chromatics'})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('기존 다른 파트 시스템 텍스트')
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    await within(screen.getByRole('status',{name:'편집 및 파일 상태'})).findByText(/MusicXML 저장 검증에 실패했습니다/)
    expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(score)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
  })

  it('studio.object-filter refuses harmony positions outside a shorter measure without changing history or native content', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createScore, TICKS_PER_QUARTER } = await import('../../score-core')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const score=createScore(),staff=score.parts[0].staves[0],first=staff.measures[0],target=structuredClone(first)
    target.id='short-target';target.number=2;target.timeSignature={beats:2,beatType:4};target.voices[0].events[0].id='short-rest';staff.measures.push(target)
    score.harmonies=[{id:'source-chord',measureId:first.id,tick:TICKS_PER_QUARTER*3,text:'C7'},{id:'keep-chord',measureId:target.id,tick:0,text:'F'}]
    const project=createNativeProject(score)
    if(process.env.DDIRORI_HARMONY_BOUNDS_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs');const {join}=await import('node:path');mkdirSync(process.env.DDIRORI_HARMONY_BOUNDS_QA_DIR,{recursive:true});writeFileSync(join(process.env.DDIRORI_HARMONY_BOUNDS_QA_DIR,'source.chromatics'),encodeNativeProject(project))}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/bounds.chromatics',fileName:'bounds.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/bounds.chromatics',fileName:'bounds.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText('bounds.chromatics을 열었습니다.')
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openStudioWorkspace('파일');chooseSelectionFilter('표기 필터','harmonies');fireEvent.click(screen.getByLabelText('선택 범위 복사'))
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('파일')
    expect(screen.getByLabelText('선택 범위에 붙여넣기')).toBeDisabled()
    fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
    expect(screen.getByText('선택한 마디에 표기를 붙여넣을 수 없습니다. 마디 길이와 표기 위치를 확인해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(score)
  })

  it.each(['event','range'] as const)('studio.object-filter protects notes for unsupported %s selection', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    if (kind === 'range') fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), { shiftKey: true })
    openStudioWorkspace('파일')
    chooseSelectionFilter('표기 필터', 'dynamics')
    const before = structuredClone(playbackMockState.lastScore)
    expect(screen.getByRole('button', { name: kind === 'event' ? '음표 지우기' : '선택 범위 지우기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '선택 범위 복사' })).toBeDisabled()
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(before)
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it.each(['score','other-part'] as const)('studio.rehearsal-delete keeps %s notes measures and neighbors while deleting only the current property object',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const score=createScore(),staff=score.parts[0].staves[0],first=staff.measures[0];first.id='primary-first';first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const secondBar=structuredClone(first);secondBar.id='neighbor';secondBar.number=2;secondBar.voices[0].events[0].id='neighbor-note';staff.measures.push(secondBar)
    const secondPart=structuredClone(score.parts[0]);secondPart.id='second-part';secondPart.name='Violin';secondPart.staves[0].id='second-staff';for(const measure of secondPart.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}score.parts.push(secondPart)
    score.rehearsalMarks=[{id:'first-mark',measureId:'measure-1',text:'First'},{id:'second-mark',measureId:'measure-1',text:'Second'},{id:'neighbor-mark',measureId:'measure-2',text:'Neighbor'}];score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/delete.chromatics',fileName:'delete.chromatics',contents:encodeNativeProject(createNativeProject(score))});vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/delete.chromatics',fileName:'delete.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view==='other-part'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',secondPart.id)}
    const origin=view==='other-part'?'second-first-note':'first-note';fireEvent.click(screen.getByRole('button',{name:origin+' 선택'}))
    fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
    fireEvent.click(screen.getByRole('button',{name:'연습표 Second 속성 열기'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'선택 요약 연습표'}),{key:'Escape'})
    fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    const expected=structuredClone(score);expected.rehearsalMarks=expected.rehearsalMarks!.filter(mark=>mark.id!=='second-mark')
    for(const method of ['Delete','Backspace','menu'] as const){
      fireEvent.click(screen.getByRole('button',{name:'연습표 Second 속성 열기'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'선택 요약 연습표'}),{key:'Escape'})
      if(method==='menu'){const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}));fireEvent.click(nav.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'선택 연습표 지우기'}))}
      else fireEvent.keyDown(window,{key:method})
      expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',origin)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
      expect(screen.getByRole('textbox',{name:'선택 요약 연습표'})).toHaveValue('Second')
      fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
      fireEvent.click(screen.getByRole('button',{name:origin+' 선택'}))
    }
    fireEvent.click(screen.getByRole('button',{name:'연습표 First 속성 열기'}));fireEvent.click(screen.getByRole('combobox',{name:'연습표 대상'}));fireEvent.click(screen.getByRole('option',{name:'2 · Second'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'선택 요약 연습표'}),{key:'Escape'});fireEvent.keyDown(window,{key:'Delete'})
    expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'Escape'});expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',origin)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));fireEvent.keyDown(window,{key:'Delete'})
    expect(playbackMockState.lastScore!.parts.every(part=>part.staves[0].measures.length===1)).toBe(true)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
  },15000)

  it.each(['score','primary-part','other-part'] as const)('studio.rehearsal-pointer opens the exact object in %s and isolates drafts history and native anchors',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Rehearsal pointer';first.id='primary-first'
    first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events[0].id='neighbor-note';score.parts[0].staves[0].measures.push(neighbor)
    const second=structuredClone(score.parts[0]);second.id='second-part';second.name='Violin';second.staves[0].id='second-staff'
    for(const measure of second.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}
    score.parts.push(second);score.rehearsalMarks=[{id:'first-mark',measureId:'measure-1',text:'First'},{id:'second-mark',measureId:'measure-1',text:'Second'},{id:'neighbor-mark',measureId:'measure-2',text:'Neighbor'}]
    score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    const project=createNativeProject(score),targetMeasure=view==='other-part'?'second-primary-first':'primary-first'
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics'})
    if(process.env.DDIRORI_REHEARSAL_POINTER_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_REHEARSAL_POINTER_QA_DIR,view);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(view==='score'?score:{...score,parts:[view==='other-part'?second:score.parts[0]],slurs:view==='other-part'?undefined:score.slurs}));writeFileSync(join(dir,'expectations.json'),JSON.stringify({view,midiScope:view,partId:view==='other-part'?second.id:score.parts[0].id,targetMeasure}))}
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view!=='score'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',view==='other-part'?second.id:score.parts[0].id)}
    fireEvent.click(screen.getByRole('button',{name:'연습표 Second 속성 열기'}))
    const selectedMark=screen.getByRole('button',{name:'연습표 Second 속성 열기'})
    expect(selectedMark).toHaveAttribute('aria-pressed','true')
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));expect(selectedMark).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(selectedMark)
    const field=screen.getByRole('textbox',{name:'선택 요약 연습표'});expect(field).toHaveValue('Second');expect(field).toHaveFocus()
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id','')
    expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','rehearsal')
    expect(document.querySelector('.studio-selected-properties__technical output')).toHaveTextContent(targetMeasure)
    expect(screen.getByRole('combobox',{name:'연습표 대상'})).toHaveTextContent('2 · Second');expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'stale composition'}})
    fireEvent.click(screen.getByRole('button',{name:'연습표 First 속성 열기'}));fireEvent.compositionEnd(field);fireEvent.blur(field)
    expect(field.isConnected).toBe(false);expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('textbox',{name:'선택 요약 연습표'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('combobox',{name:'연습표 대상'}));fireEvent.click(screen.getByRole('option',{name:'2 · Second'}))
    fireEvent.click(screen.getByRole('button',{name:'연습표 First 속성 열기'}));expect(screen.getByRole('textbox',{name:'선택 요약 연습표'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('button',{name:'연습표 Second 속성 열기'}));const edit=screen.getByRole('textbox',{name:'선택 요약 연습표'});fireEvent.change(edit,{target:{value:'Edited'}});fireEvent.keyDown(edit,{key:'Enter'});fireEvent.blur(edit)
    const expected=structuredClone(score);expected.rehearsalMarks![1].text='Edited'
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected);expect(serializeMidi(expected)).toEqual(serializeMidi(score))
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  },15000)

  it.each(['score','primary-part','other-part'] as const)('studio.system-text-pointer opens the exact object in %s and isolates drafts history and native anchors',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='System text pointer';first.id='primary-first'
    first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events[0].id='neighbor-note';score.parts[0].staves[0].measures.push(neighbor)
    const second=structuredClone(score.parts[0]);second.id='second-part';second.name='Violin';second.staves[0].id='second-staff'
    for(const measure of second.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}
    score.parts.push(second);score.systemTexts=[{id:'first-mark',measureId:'measure-1',text:'First'},{id:'second-mark',measureId:'measure-1',text:'Second'},{id:'neighbor-mark',measureId:'measure-2',text:'Neighbor'}]
    score.rehearsalMarks=[{id:'keep-rehearsal',measureId:'measure-1',text:'Control'}]
    score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    const project=createNativeProject(score),targetMeasure=view==='other-part'?'second-primary-first':'primary-first'
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics'})
    if(process.env.DDIRORI_SYSTEM_TEXT_POINTER_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_SYSTEM_TEXT_POINTER_QA_DIR,view);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(view==='score'?score:{...score,parts:[view==='other-part'?second:score.parts[0]],slurs:view==='other-part'?undefined:score.slurs}));writeFileSync(join(dir,'expectations.json'),JSON.stringify({view,family:'systemTexts',midiScope:view,partId:view==='other-part'?second.id:score.parts[0].id,targetMeasure}))}
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view!=='score'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',view==='other-part'?second.id:score.parts[0].id)}
    fireEvent.click(screen.getByRole('button',{name:'시스템 텍스트 Second 속성 열기'}))
    const selectedMark=screen.getByRole('button',{name:'시스템 텍스트 Second 속성 열기'})
    expect(selectedMark).toHaveAttribute('aria-pressed','true')
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));expect(selectedMark).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(selectedMark)
    const field=screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'});expect(field).toHaveValue('Second');expect(field).toHaveFocus()
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id','')
    expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','system-text')
    expect(document.querySelector('.studio-selected-properties__technical output')).toHaveTextContent(targetMeasure)
    expect(screen.getByRole('combobox',{name:'시스템 텍스트 대상'})).toHaveTextContent('2 · Second');expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'stale composition'}})
    fireEvent.click(screen.getByRole('button',{name:'시스템 텍스트 First 속성 열기'}));fireEvent.compositionEnd(field);fireEvent.blur(field)
    expect(field.isConnected).toBe(false);expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('combobox',{name:'시스템 텍스트 대상'}));fireEvent.click(screen.getByRole('option',{name:'2 · Second'}))
    fireEvent.click(screen.getByRole('button',{name:'시스템 텍스트 First 속성 열기'}));expect(screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('button',{name:'시스템 텍스트 Second 속성 열기'}));const edit=screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'});fireEvent.change(edit,{target:{value:'합주 시작'}});fireEvent.keyDown(edit,{key:'Enter'});fireEvent.blur(edit)
    const expected=structuredClone(score);expected.systemTexts![1].text='합주 시작'
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected);expect(serializeMidi(expected)).toEqual(serializeMidi(score))
    fireEvent.click(screen.getByRole('button',{name:'시스템 텍스트 합주 시작 속성 열기'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'}),{key:'Escape'});fireEvent.keyDown(window,{key:'Delete'})
    const deleted=structuredClone(expected);deleted.systemTexts=deleted.systemTexts!.filter(mark=>mark.id!=='second-mark');expect(playbackMockState.lastScore).toEqual(deleted)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected);expect(screen.getByRole('textbox',{name:'선택 요약 시스템 텍스트'})).toHaveValue('합주 시작')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(deleted)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  },15000)

  it.each([
    {family:'rehearsalMarks',label:'연습표'},
    {family:'systemTexts',label:'시스템 텍스트'},
    {family:'staffTexts',label:'보표 글자'}
  ] as const)('studio.single-text-clipboard-caret keeps $family paste on the selected note when input advances',async({family,label})=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Caret clipboard '+family;first.id='copy-source'
    first.voices[0].events=[createNote({id:'source-note',pitch:{step:'D',octave:4},duration:{value:'whole',dots:0}})]
    const target=structuredClone(first);target.id='copy-target';target.number=2;target.voices[0].events[0].id='target-note';score.parts[0].staves[0].measures.push(target)
    score[family]=[{id:'copy-first',measureId:first.id,text:'First'},{id:'copy-second',measureId:first.id,text:'Second'},{id:'keep-target',measureId:target.id,text:'Keep target'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/copy.chromatics',fileName:'copy.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/copy.chromatics',fileName:'copy.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:label+' Second 속성 열기'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'선택 '+label+' 복사'}))
    fireEvent.click(screen.getByRole('button',{name:'source-note 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.click(within(screen.getByRole('region',{name:'음표 입력 도구'})).getByRole('button',{name:'온음표, 단축키 7'}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const afterInput=structuredClone(playbackMockState.lastScore!);expect(serializeMidi(afterInput)).not.toEqual(serializeMidi(score));expect(document.querySelector('.editor-status')).toHaveTextContent('2마디');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','source-note');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id',target.id);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-tick','0')
    fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
    const pasted=structuredClone(playbackMockState.lastScore!);expect(pasted[family]!.slice(0,3)).toEqual(afterInput[family]);expect(pasted[family]!.slice(3)).toEqual([{id:expect.any(String),measureId:first.id,text:'Second'}]);expect({...pasted,[family]:afterInput[family]}).toEqual(afterInput)
    expect(serializeMidi(pasted)).toEqual(serializeMidi(afterInput));expect(document.querySelector('.editor-status')).toHaveTextContent('2마디');expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','source-note');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id',target.id);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-tick','0')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(afterInput)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(pasted)
    if(process.env.DDIRORI_CARET_CLIPBOARD_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_CARET_CLIPBOARD_QA_DIR,family);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(score)));writeFileSync(join(dir,'input.chromatics'),encodeNativeProject(createNativeProject(afterInput)));writeFileSync(join(dir,'input.mid'),serializeMidi(afterInput));writeFileSync(join(dir,'expectations.json'),JSON.stringify({family,label,selectedEventId:'source-note',selectedMeasureId:first.id,caretMeasureId:target.id,copiedId:'copy-second',targetText:'Second'}))}
  })

  it.each([
    {family:'rehearsalMarks',label:'연습표'},
    {family:'systemTexts',label:'시스템 텍스트'},
    {family:'staffTexts',label:'보표 글자'}
  ] as const)('studio.single-text-clipboard copies exactly $family and appends beside existing destination text',async({family,label})=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Single text clipboard';first.id='copy-source'
    first.voices[0].events=[createNote({id:'source-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const target=structuredClone(first);target.id='copy-target';target.number=2;target.voices[0].events[0].id='target-note';score.parts[0].staves[0].measures.push(target)
    score[family]=[{id:'copy-first',measureId:first.id,text:'First'},{id:'copy-second',measureId:first.id,text:'Second'},{id:'keep-target',measureId:target.id,text:'Keep target'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/copy.chromatics',fileName:'copy.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:label+' Second 속성 열기'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));const copy=screen.getByRole('menuitem',{name:'선택 '+label+' 복사'});expect(copy).toBeEnabled();fireEvent.click(copy)
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'target-note 선택'}));fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
    const pasted=structuredClone(playbackMockState.lastScore!);expect(pasted[family]!.slice(0,3)).toEqual(score[family]);expect(pasted[family]!.slice(3)).toEqual([{id:expect.any(String),measureId:target.id,text:'Second'}])
    expect({...pasted,[family]:score[family]}).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','target-note')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
  })

  it.each([
    {family:'rehearsalMarks',label:'연습표'},
    {family:'systemTexts',label:'시스템 텍스트'},
    {family:'staffTexts',label:'보표 글자'}
  ] as const)('studio.measure-text-empty restores the original note after blanking $family and preserves one-command undo',async({family,label})=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const score=createScore(),measure=score.parts[0].staves[0].measures[0];score.title='Empty text context';measure.id='owned-measure'
    measure.voices[0].events=[createNote({id:'owned-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    score[family]=[{id:'first-text',measureId:measure.id,text:'First'},{id:'second-text',measureId:measure.id,text:'Second'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/empty.chromatics',fileName:'empty.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'owned-note 선택'}));fireEvent.click(screen.getByRole('button',{name:label+' Second 속성 열기'}))
    const field=screen.getByRole('textbox',{name:'선택 요약 '+label});fireEvent.change(field,{target:{value:''}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const expected=structuredClone(score);expected[family]=expected[family]!.filter(t=>t.id!=='second-text')
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','event')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','owned-note')
    expect(screen.getByRole('button',{name:label+' First 속성 열기'})).toHaveAttribute('aria-pressed','false')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('textbox',{name:'선택 요약 '+label})).toHaveValue('Second')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected);expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','event')
  })

  it.each(['measure','other-event','new-document'] as const)('studio.expression-clipboard destination %s preserves concrete owner and copied snapshot',async destination=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Clipboard source document';first.id='source-bar';first.voices[0].events=[createNote({id:'source-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})];const next=structuredClone(first);next.id='target-bar';next.number=2;next.voices[0].events=[createNote({id:'target-early',pitch:{step:'C',octave:4},duration:{value:'half',dots:0}}),createNote({id:'target-late',position:{tick:2*TICKS_PER_QUARTER},pitch:{step:'D',octave:4},duration:{value:'half',dots:0}})];score.parts[0].staves[0].measures.push(next)
    const other=structuredClone(score.parts[0]);other.id='other-part';other.name='Other';other.staves[0].id='other-staff';for(const m of other.staves[0].measures){m.id='other-'+m.id;for(const e of m.voices[0].events)e.id='other-'+e.id};score.parts.push(other);score.expressionTexts=[{id:'copy-expression',measureId:first.id,tick:TICKS_PER_QUARTER/2,text:'Copy snapshot'},{id:'keep-target',measureId:next.id,tick:0,text:'Keep target'},{id:'keep-other',measureId:'other-target-bar',tick:2*TICKS_PER_QUARTER,text:'Keep other'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'표현 텍스트 Copy snapshot 속성 열기'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'선택 표현 텍스트 복사'}));let target=score
    if(destination==='new-document'){
      target=structuredClone(score);target.title='Clipboard destination document';target.expressionTexts![0].text='Same ID different document'
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/destination.chromatics',fileName:'destination.chromatics',contents:encodeNativeProject(createNativeProject(target))});openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(target.title)
    }
    if(destination==='measure')fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));else fireEvent.click(screen.getByRole('button',{name:(destination==='other-event'?'other-':'')+'target-late 선택'}))
    fireEvent.click(screen.getByRole('button',{name:'편집'}));const paste=screen.getByRole('menuitem',{name:'복사한 표현 텍스트 추가'});expect(paste).toBeEnabled();fireEvent.click(paste)
    const result=structuredClone(playbackMockState.lastScore!),added=result.expressionTexts!.at(-1)!;expect(added).toEqual({id:expect.stringMatching(/^expression-text-/),measureId:destination==='other-event'?'other-target-bar':'target-bar',tick:destination==='measure'?0:2*TICKS_PER_QUARTER,text:'Copy snapshot'});expect(result.expressionTexts!.slice(0,-1)).toEqual(target.expressionTexts);expect({...result,expressionTexts:target.expressionTexts}).toEqual(target);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(target);fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(result)
  })

  it('studio.expression-clipboard pastes at selected event while the N caret has already advanced',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];first.id='copy-source';first.voices[0].events=[createNote({id:'selected-whole',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})];const next=structuredClone(first);next.id='next-input';next.number=2;next.voices[0].events[0].id='next-note';score.parts[0].staves[0].measures.push(next);score.title='Expression clipboard caret';score.expressionTexts=[{id:'source-expression',measureId:first.id,tick:TICKS_PER_QUARTER/2,text:'Copy one'},{id:'keep-next',measureId:next.id,tick:0,text:'Keep next'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/caret.chromatics',fileName:'caret.chromatics',contents:encodeNativeProject(createNativeProject(score))});const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'표현 텍스트 Copy one 속성 열기'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'선택 표현 텍스트 복사'}));fireEvent.click(screen.getByRole('button',{name:'selected-whole 선택'}));fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));fireEvent.click(screen.getByRole('button',{name:'온음표, 단축키 7'}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
    const before=structuredClone(playbackMockState.lastScore!);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id','next-input');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','selected-whole')
    fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true});const result=playbackMockState.lastScore!;expect(result.expressionTexts!.at(-1)).toEqual({id:expect.stringMatching(/^expression-text-/),measureId:'copy-source',tick:0,text:'Copy one'});expect({...result,expressionTexts:before.expressionTexts}).toEqual(before);expect(result.expressionTexts!.slice(0,-1)).toEqual(before.expressionTexts)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-input-measure-id','next-input')
  })

  it.each(['score','primary-part','lower-part','other-part'] as const)('studio.expression-clipboard copies one snapshot and appends at the selected note in %s',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Expression object pointer';first.id='primary-first'
    first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events=[createNote({id:'neighbor-note',pitch:{step:'C',octave:4},duration:{value:'half',dots:0}}),createNote({id:'neighbor-late',pitch:{step:'D',octave:4},duration:{value:'half',dots:0},position:{tick:2*TICKS_PER_QUARTER}})];score.parts[0].staves[0].measures.push(neighbor)
    const second=structuredClone(score.parts[0]);second.id='second-part';second.name='Violin';second.staves[0].id='second-staff'
    for(const measure of second.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}
    const lower=structuredClone(score.parts[0].staves[0]);lower.id='lower-staff';for(const measure of lower.measures){measure.id='lower-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='lower-'+event.id};score.parts[0].staves.push(lower);score.parts.push(second)
    const prefix=view==='lower-part'?'lower-':view==='other-part'?'second-':'',targetMeasure=prefix+'primary-first',tick=TICKS_PER_QUARTER/2
    score.expressionTexts=[{id:'first-expression',measureId:targetMeasure,tick:0,text:'First'},{id:'second-expression',measureId:targetMeasure,tick,text:'Second'},{id:'third-expression',measureId:targetMeasure,tick,text:'Third'},{id:'neighbor-expression',measureId:prefix+'neighbor',tick:0,text:'Neighbor'}]
    score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    const project=createNativeProject(score)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/expression-copy.chromatics',fileName:'expression-copy.chromatics',contents:encodeNativeProject(project)});vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/expression-copy.chromatics',fileName:'expression-copy.chromatics'})
    if(process.env.DDIRORI_EXPRESSION_CLIPBOARD_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_EXPRESSION_CLIPBOARD_QA_DIR,view);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(view==='score'?score:{...score,parts:[view==='other-part'?second:score.parts[0]],slurs:view==='other-part'?undefined:score.slurs}));writeFileSync(join(dir,'expectations.json'),JSON.stringify({view,targetMeasure,tick,partId:view==='other-part'?second.id:score.parts[0].id,destinationMeasure:prefix+'neighbor',destinationEvent:prefix+'neighbor-late',destinationTick:2*TICKS_PER_QUARTER}))}
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view!=='score'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',view==='other-part'?second.id:score.parts[0].id)}
    fireEvent.click(screen.getByRole('button',{name:'표현 텍스트 Second 속성 열기'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));const copy=screen.getByRole('menuitem',{name:'선택 표현 텍스트 복사'});expect(copy).toBeEnabled();fireEvent.click(copy)
    expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    const field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});fireEvent.change(field,{target:{value:'Edited after copy'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field);const edited=structuredClone(score);edited.expressionTexts![1].text='Edited after copy';expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(screen.getByRole('button',{name:prefix+'neighbor-late 선택'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));const paste=screen.getByRole('menuitem',{name:'복사한 표현 텍스트 추가'});expect(paste).toBeEnabled();fireEvent.click(paste)
    const result=structuredClone(playbackMockState.lastScore!),added=result.expressionTexts!.at(-1)!;expect(added).toEqual({id:expect.stringMatching(/^expression-text-/),measureId:prefix+'neighbor',tick:2*TICKS_PER_QUARTER,text:'Second'});expect(score.expressionTexts!.some(n=>n.id===added.id)).toBe(false);expect(result.expressionTexts!.slice(0,-1)).toEqual(edited.expressionTexts);expect({...result,expressionTexts:edited.expressionTexts}).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(result)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(result);expect(serializeMidi(result)).toEqual(serializeMidi(score))
  })

  it.each(['score','primary-part','lower-part','other-part'] as const)('studio.expression-object opens exact off-grid object in %s without changing neighbors or input',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Expression object pointer';first.id='primary-first'
    first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events[0].id='neighbor-note';score.parts[0].staves[0].measures.push(neighbor)
    const second=structuredClone(score.parts[0]);second.id='second-part';second.name='Violin';second.staves[0].id='second-staff'
    for(const measure of second.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}
    const lower=structuredClone(score.parts[0].staves[0]);lower.id='lower-staff';for(const measure of lower.measures){measure.id='lower-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='lower-'+event.id};score.parts[0].staves.push(lower);score.parts.push(second)
    const prefix=view==='lower-part'?'lower-':view==='other-part'?'second-':'',targetMeasure=prefix+'primary-first',tick=TICKS_PER_QUARTER/2
    score.expressionTexts=[{id:'first-expression',measureId:targetMeasure,tick:0,text:'First'},{id:'second-expression',measureId:targetMeasure,tick,text:'Second'},{id:'third-expression',measureId:targetMeasure,tick,text:'Third'},{id:'neighbor-expression',measureId:prefix+'neighbor',tick:0,text:'Neighbor'}]
    score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    const project=createNativeProject(score)
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/expression.chromatics',fileName:'expression.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/expression.chromatics',fileName:'expression.chromatics'})
    if(process.env.DDIRORI_EXPRESSION_OBJECT_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_EXPRESSION_OBJECT_QA_DIR,view);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(view==='score'?score:{...score,parts:[view==='other-part'?second:score.parts[0]],slurs:view==='other-part'?undefined:score.slurs}));writeFileSync(join(dir,'expectations.json'),JSON.stringify({view,partId:view==='other-part'?second.id:score.parts[0].id,targetMeasure,tick,eventId:prefix+'first-note'}))}
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view!=='score'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',view==='other-part'?second.id:score.parts[0].id)}
    fireEvent.click(screen.getByRole('button',{name:prefix+'first-note 선택'}))
    fireEvent.click(screen.getByRole('combobox',{name:'표현 텍스트 대상'}));fireEvent.click(screen.getByRole('option',{name:/Second.*1\.5박/}))
    expect(screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'})).toHaveValue('Second')
    expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).toHaveAccessibleDescription('위치는 4분음표 기준입니다.')
    expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).not.toHaveTextContent('4분음표')
    fireEvent.click(screen.getByRole('button',{name:'표현 텍스트 Second 속성 열기'}))
    expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','expression-text')
    let field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});expect(field).toHaveValue('Second');expect(field).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'확정 전'}})
    fireEvent.click(screen.getByRole('button',{name:'표현 텍스트 Third 속성 열기'}))
    field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});expect(field).toHaveValue('Third');expect(field).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.change(field,{target:{value:'Third edited'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const edited=structuredClone(score);edited.expressionTexts![2].text='Third edited';expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'})).toHaveValue('Third')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});fireEvent.change(field,{target:{value:''}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const removed=structuredClone(edited);removed.expressionTexts=removed.expressionTexts!.filter(item=>item.id!=='third-expression');expect(playbackMockState.lastScore).toEqual(removed)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',prefix+'first-note')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});fireEvent.change(field,{target:{value:'discard'}});fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveValue('Third edited');expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));const target=screen.getByRole('button',{name:'표현 텍스트 Third edited 속성 열기'});expect(target).toHaveFocus();fireEvent.keyDown(target,{key:'Escape'})
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',prefix+'first-note');fireEvent.click(target)
    const chord=screen.getByRole('textbox',{name:'선택 요약 코드'});fireEvent.change(chord,{target:{value:'C7'}});fireEvent.keyDown(chord,{key:'Enter'});fireEvent.blur(chord)
    const withChord=playbackMockState.lastScore!;expect(withChord.harmonies).toHaveLength(1);expect(withChord.harmonies![0]).toMatchObject({measureId:targetMeasure,tick,text:'C7'});expect({...withChord,harmonies:undefined}).toEqual(edited)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:'선택 표현 텍스트 복사'})).toBeEnabled();fireEvent.keyDown(window,{key:'Escape'})
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited);expect(serializeMidi(edited)).toEqual(serializeMidi(score))
  })

  it('studio.expression-object-browser preserves empty current-position entry beside one off-grid object',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const score=createScore(),measure=score.parts[0].staves[0].measures[0];score.title='Empty expression position';measure.id='expression-measure';measure.voices[0].events=[createNote({id:'expression-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    score.expressionTexts=[{id:'off-grid-expression',measureId:measure.id,tick:TICKS_PER_QUARTER/2,text:'Second'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/expression.chromatics',fileName:'expression.chromatics',contents:encodeNativeProject(createNativeProject(score))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'expression-note 선택'}));let field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});expect(field).toHaveValue('')
    expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).toHaveTextContent('현재 위치에 새 표기')
    expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).toHaveAccessibleDescription('위치는 4분음표 기준입니다.')
    fireEvent.change(field,{target:{value:'At start'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    expect(playbackMockState.lastScore!.expressionTexts).toEqual([score.expressionTexts[0],{id:expect.any(String),measureId:measure.id,tick:0,text:'At start'}])
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(screen.getByRole('combobox',{name:'표현 텍스트 대상'}));fireEvent.click(screen.getByRole('option',{name:/Second.*1\.5박/}));field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});expect(field).toHaveValue('Second');expect(field).toHaveFocus()
    expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).toHaveTextContent('1.5박')
    fireEvent.change(field,{target:{value:'Revised'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const expected=structuredClone(score);expected.expressionTexts![0].text='Revised';expect(playbackMockState.lastScore).toEqual(expected)
  })

  it('studio.staff-text-owner retains native rejection of duplicate concrete measure IDs',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject}=await import('../../project/schema')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Ambiguous staff text';first.id='shared-measure'
    first.voices[0].events=[createNote({id:'owned-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const second=structuredClone(score.parts[0]);second.id='second-part';second.staves[0].id='second-staff';second.staves[0].measures[0].voices[0].events[0].id='second-note';score.parts.push(second)
    score.staffTexts=[{id:'ambiguous-text',measureId:first.id,text:'Keep original'}]
    expect(()=>createNativeProject(score)).toThrow('Duplicate project ID: shared-measure')
  })

  it.each(['score','primary-part','lower-part','other-part'] as const)('studio.staff-text-pointer opens the exact object in %s and isolates drafts history and native anchors',async view=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
    const score=createScore(),first=score.parts[0].staves[0].measures[0];score.title='Staff text pointer';first.id='primary-first'
    first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events[0].id='neighbor-note';score.parts[0].staves[0].measures.push(neighbor)
    const second=structuredClone(score.parts[0]);second.id='second-part';second.name='Violin';second.staves[0].id='second-staff'
    for(const measure of second.staves[0].measures){measure.id='second-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='second-'+event.id}
    const lower=structuredClone(score.parts[0].staves[0]);lower.id='lower-staff';for(const measure of lower.measures){measure.id='lower-'+measure.id;for(const voice of measure.voices)for(const event of voice.events)event.id='lower-'+event.id};score.parts[0].staves.push(lower)
    const ownerPrefix=view==='lower-part'?'lower-':view==='other-part'?'second-':''
    score.parts.push(second);score.staffTexts=[{id:'first-mark',measureId:ownerPrefix+'primary-first',text:'First'},{id:'second-mark',measureId:ownerPrefix+'primary-first',text:'Second'},{id:'neighbor-mark',measureId:ownerPrefix+'neighbor',text:'Neighbor'}]
    score.rehearsalMarks=[{id:'keep-rehearsal',measureId:'measure-1',text:'Control'}]
    score.slurs=[{id:'manual-control',startEventId:'first-note',endEventId:'neighbor-note',engraving:{offsetX:0,height:3}}]
    const project=createNativeProject(score),targetMeasure=ownerPrefix+'primary-first'
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/rehearsal.chromatics',fileName:'rehearsal.chromatics'})
    if(process.env.DDIRORI_STAFF_TEXT_POINTER_QA_DIR){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path');const dir=join(process.env.DDIRORI_STAFF_TEXT_POINTER_QA_DIR,view);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(view==='score'?score:{...score,parts:[view==='other-part'?second:score.parts[0]],slurs:view==='other-part'?undefined:score.slurs}));writeFileSync(join(dir,'expectations.json'),JSON.stringify({view,family:'staffTexts',midiScope:view,partId:view==='other-part'?second.id:score.parts[0].id,targetMeasure}))}
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    if(view!=='score'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',view==='other-part'?second.id:score.parts[0].id)}
    fireEvent.click(screen.getByRole('button',{name:'보표 글자 Second 속성 열기'}))
    const selectedMark=screen.getByRole('button',{name:'보표 글자 Second 속성 열기'})
    expect(selectedMark).toHaveAttribute('aria-pressed','true')
    fireEvent.click(screen.getByRole('button',{name:'악보로 이동'}));expect(selectedMark).toHaveFocus();expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.click(selectedMark)
    const field=screen.getByRole('textbox',{name:'선택 요약 보표 글자'});expect(field).toHaveValue('Second');expect(field).toHaveFocus()
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-measure-id','')
    expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','staff-text')
    expect(document.querySelector('.studio-selected-properties__technical output')).toHaveTextContent(targetMeasure)
    expect(screen.getByRole('combobox',{name:'보표 글자 대상'})).toHaveTextContent('2 · Second');expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'stale composition'}})
    fireEvent.click(screen.getByRole('button',{name:'보표 글자 First 속성 열기'}));fireEvent.compositionEnd(field);fireEvent.blur(field)
    expect(field.isConnected).toBe(false);expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('textbox',{name:'선택 요약 보표 글자'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('combobox',{name:'보표 글자 대상'}));fireEvent.click(screen.getByRole('option',{name:'2 · Second'}))
    fireEvent.click(screen.getByRole('button',{name:'보표 글자 First 속성 열기'}));expect(screen.getByRole('textbox',{name:'선택 요약 보표 글자'})).toHaveValue('First')
    fireEvent.click(screen.getByRole('button',{name:'보표 글자 Second 속성 열기'}));const edit=screen.getByRole('textbox',{name:'선택 요약 보표 글자'});fireEvent.change(edit,{target:{value:'합주 시작'}});fireEvent.keyDown(edit,{key:'Enter'});fireEvent.blur(edit)
    const expected=structuredClone(score);expected.staffTexts![1].text='합주 시작'
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected);expect(serializeMidi(expected)).toEqual(serializeMidi(score))
    fireEvent.click(screen.getByRole('button',{name:'보표 글자 합주 시작 속성 열기'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'선택 요약 보표 글자'}),{key:'Escape'});fireEvent.keyDown(window,{key:'Delete'})
    const deleted=structuredClone(expected);deleted.staffTexts=deleted.staffTexts!.filter(mark=>mark.id!=='second-mark');expect(playbackMockState.lastScore).toEqual(deleted)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected);expect(screen.getByRole('textbox',{name:'선택 요약 보표 글자'})).toHaveValue('합주 시작')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(deleted)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  },15000)

  it.each(([
    {family:'systemTexts',label:'선택 요약 시스템 텍스트',text:'System edited'},
    {family:'staffTexts',label:'선택 요약 보표 글자',text:'Staff edited'},
    {family:'rehearsalMarks',label:'선택 요약 연습표',text:'Rehearsal edited'},
    {family:'expressionTexts',label:'선택 요약 표현 텍스트',text:'Expression edited'},
    {family:'harmonies',label:'선택 요약 코드',text:'Am7'}
  ] as const).flatMap(entry=>[...([0,1] as const)].map(targetIndex=>({...entry,targetIndex}))))('studio.coincident-text-properties preserves $family target $targetIndex identity order neighbors and one-command edits', async ({family,label,text,targetIndex}) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createScore,createNote}=await import('../../score-core'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {parseHarmonyText}=await import('../../musicxml/harmony-text')
    const score=createScore(),staff=score.parts[0].staves[0],first=staff.measures[0]
    score.title='Coincident '+family;first.id='primary-first';first.voices[0].events=[createNote({id:'first-note',pitch:{step:'C',octave:4},duration:{value:'whole',dots:0}})]
    const neighbor=structuredClone(first);neighbor.id='neighbor';neighbor.number=2;neighbor.voices[0].events[0].id='neighbor-note';staff.measures.push(neighbor)
    score.systemTexts=[{id:'system-first',measureId:'measure-1',text:'System first'},{id:'system-second',measureId:first.id,text:'System second'},{id:'system-neighbor',measureId:neighbor.id,text:'System neighbor'}]
    score.staffTexts=[{id:'staff-first',measureId:first.id,text:'Staff first'},{id:'staff-second',measureId:first.id,text:'Staff second'},{id:'staff-neighbor',measureId:neighbor.id,text:'Staff neighbor'}]
    if(family==='rehearsalMarks')score.rehearsalMarks=[{id:'rehearsal-first',measureId:'measure-1',text:'Rehearsal first'},{id:'rehearsal-second',measureId:first.id,text:'Rehearsal second'},{id:'rehearsal-neighbor',measureId:neighbor.id,text:'Rehearsal neighbor'}]
    score.expressionTexts=[{id:'expression-first',measureId:first.id,tick:0,text:'Expression first'},{id:'expression-second',measureId:first.id,tick:0,text:'Expression second'},{id:'expression-neighbor',measureId:neighbor.id,tick:0,text:'Expression neighbor'}]
    score.harmonies=['C7/G','G7','Dm7'].map((value,index)=>({id:['harmony-first','harmony-second','harmony-neighbor'][index],measureId:index===2?neighbor.id:first.id,tick:0,...parseHarmonyText(value)!}))
    const targetId=score[family]![targetIndex].id,project=createNativeProject(score)
    if(process.env.DDIRORI_COINCIDENT_TEXT_QA_DIR){
      const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMidi}=await import('./midi/serialize-midi')
      const dir=join(process.env.DDIRORI_COINCIDENT_TEXT_QA_DIR,family+(targetIndex?'-second':''));mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(project));writeFileSync(join(dir,'source.mid'),serializeMidi(score));writeFileSync(join(dir,'expectations.json'),JSON.stringify({family,label,text,firstId:score[family]![0].id,targetId,targetIndex,replacement:family==='harmonies'?parseHarmonyText(text):{text}}))
      if(family==='staffTexts'){
        const passive=structuredClone(score),lower=structuredClone(passive.parts[0].staves[0]),ids=new Map(lower.measures.map(m=>[m.id,'lower-'+m.id]));lower.id='lower-staff'
        for(const measure of lower.measures){measure.id=ids.get(measure.id)!;for(const voice of measure.voices)for(const event of voice.events)event.id='lower-'+event.id}
        passive.parts[0].staves.push(lower);passive.staffTexts=passive.staffTexts!.map(item=>({...item,measureId:ids.get(item.measureId)!}))
        const lowerDir=join(process.env.DDIRORI_COINCIDENT_TEXT_QA_DIR,'staffTexts-lower'+(targetIndex?'-second':''));mkdirSync(lowerDir,{recursive:true})
        writeFileSync(join(lowerDir,'source.chromatics'),encodeNativeProject(createNativeProject(passive)));writeFileSync(join(lowerDir,'source.mid'),serializeMidi(passive));writeFileSync(join(lowerDir,'expectations.json'),JSON.stringify({family,label,text,firstId:passive.staffTexts[0].id,targetId,targetIndex,eventId:'lower-first-note',replacement:{text}}))
      }
    }
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/coincident.chromatics',fileName:'coincident.chromatics',contents:encodeNativeProject(project)})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/coincident.chromatics',fileName:'coincident.chromatics'})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
    fireEvent.click(screen.getByRole('button',{name:'first-note 선택'}))
    if(targetIndex===1){
      const prior=screen.getByRole('textbox',{name:label});prior.focus();fireEvent.compositionStart(prior);fireEvent.change(prior,{target:{value:'선택 전 조합'}});fireEvent.keyDown(prior,{key:'Enter',isComposing:true,keyCode:229});fireEvent.blur(prior)
      const choice=screen.getByRole('combobox',{name:label.replace('선택 요약 ','')+' 대상'})
      expect(choice).toHaveClass('dd-select');fireEvent.keyDown(choice,{key:' ',code:'Space'});fireEvent.keyDown(choice,{key:'Escape'})
      fireEvent.click(choice);fireEvent.click(screen.getByRole('option',{name:'2 · '+score[family]![1].text+(family==='expressionTexts'||family==='harmonies'?' · 1박':'')}))
      fireEvent.compositionEnd(prior);fireEvent.blur(prior)
      expect(prior.isConnected).toBe(false)
      expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(screen.getByRole('textbox',{name:label})).toHaveValue(score[family]![1].text)
      expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
      const oldSelection=screen.getByRole('textbox',{name:label});fireEvent.change(oldSelection,{target:{value:'다른 마디로 넘기지 않음'}})
      fireEvent.click(screen.getByRole('button',{name:'neighbor-note 선택'}));fireEvent.blur(oldSelection)
      expect(playbackMockState.lastScore).toEqual(score);if(family==='expressionTexts'||family==='harmonies')expect(screen.getByRole('combobox',{name:label.replace('선택 요약 ','')+' 대상'})).toHaveTextContent('1 · '+score[family]![2].text+' · 1박');else expect(screen.queryByRole('combobox',{name:label.replace('선택 요약 ','')+' 대상'})).toBeNull()
      fireEvent.click(screen.getByRole('button',{name:'first-note 선택'}))
      const freshChoice=screen.getByRole('combobox',{name:label.replace('선택 요약 ','')+' 대상'});expect(freshChoice).toHaveTextContent('1 · '+score[family]![0].text)
      fireEvent.click(freshChoice);fireEvent.click(screen.getByRole('option',{name:'2 · '+score[family]![1].text+(family==='expressionTexts'||family==='harmonies'?' · 1박':'')}))
    }
    const field=screen.getByRole('textbox',{name:label});field.focus();fireEvent.change(field,{target:{value:text}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const edited=structuredClone(playbackMockState.lastScore!)
    expect(edited[family]?.map(item=>item.id)).toEqual(score[family]!.map(item=>item.id))
    expect(edited[family]?.filter(item=>item.id!==targetId)).toEqual(score[family]!.filter(item=>item.id!==targetId))
    expect(edited[family]?.find(item=>item.id===targetId)?.text).toBe(text)
    if(family==='harmonies')expect(edited.harmonies?.find(item=>item.id===targetId)?.bass).toBeUndefined()
    expect({...edited,[family]:score[family]}).toEqual(score)
    expect(screen.getByRole('textbox',{name:label})).toHaveValue(text)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const sameField=screen.getByRole('textbox',{name:label});sameField.focus();fireEvent.change(sameField,{target:{value:''}});fireEvent.keyDown(sameField,{key:'Enter'});fireEvent.blur(sameField)
    const cleared=structuredClone(playbackMockState.lastScore!)
    expect(cleared[family]).toEqual(score[family]!.filter(item=>item.id!==targetId))
    expect({...cleared,[family]:score[family]}).toEqual(score)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    expect(screen.getByRole('textbox',{name:label})).toHaveValue(text)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
    const imported=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    for(const type of ['systemTexts','staffTexts','expressionTexts','harmonies','rehearsalMarks'] as const)expect(imported[type]?.map(item=>item.text)).toEqual(edited[type]?.map(item=>item.text))
    const {serializeMidi}=await import('./midi/serialize-midi');expect(serializeMidi(edited)).toEqual(serializeMidi(score))
    if(targetIndex===1){
      const oldDocument=screen.getByRole('textbox',{name:label});fireEvent.compositionStart(oldDocument);fireEvent.change(oldDocument,{target:{value:'이전 문서 조합'}})
      const next=structuredClone(score);next.title='Replacement '+family
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/replacement.chromatics',fileName:'replacement.chromatics',contents:encodeNativeProject(createNativeProject(next))})
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(next.title)
      fireEvent.compositionEnd(oldDocument);fireEvent.blur(oldDocument)
      expect(playbackMockState.lastScore).toEqual(next);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(screen.getByRole('textbox',{name:label})).toHaveValue(next[family]![0].text)
      expect(screen.getByRole('combobox',{name:label.replace('선택 요약 ','')+' 대상'})).toHaveTextContent('1 · '+next[family]![0].text)
    }
  })

  it.each([
    ['systemTexts', '선택 요약 시스템 텍스트'],
    ['rehearsalMarks', '선택 요약 연습표']
  ] as const)('studio.global-measure-alias edits %s without duplicating or relocating its imported anchor', async (family, label) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { musicXmlOrderFixture } = await import('../../testing/musicxml-order-fixture')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const source = musicXmlOrderFixture('system-text')
    source.systemTexts = undefined
    source[family] = [{id:'imported-global',measureId:'measure-1',text:'Original'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/alias.chromatics',fileName:'alias.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const { App } = await import('./App'); render(<App />)
    openStudioWorkspace('파일'); fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'order-first 선택'}))
    const field=screen.getByRole('textbox',{name:label})
    expect(field).toHaveValue('Original')
    field.focus();fireEvent.change(field,{target:{value:'Edited'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const after=structuredClone(playbackMockState.lastScore!)
    expect(after[family]).toEqual([{id:'imported-global',measureId:'measure-1',text:'Edited'}])
    expect({...after,[family]:source[family]}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(after)
    expect(decodeNativeProject(encodeNativeProject(createNativeProject(after))).score).toEqual(after)
  })

  it('studio.global-measure-alias edits an imported tempo event once and preserves its original anchor', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { musicXmlOrderFixture } = await import('../../testing/musicxml-order-fixture')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const source=musicXmlOrderFixture('system-text')
    source.tempoEvents=[{id:'imported-tempo',measureId:'measure-1',tick:0,bpm:88,beatUnit:'quarter',dots:0}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/alias.chromatics',fileName:'alias.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const {App}=await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'order-first 선택'}));openStudioWorkspace('악보')
    const field=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    expect(field).toHaveValue(88)
    field.focus();fireEvent.change(field,{target:{value:'92'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const after=structuredClone(playbackMockState.lastScore!)
    expect(after.tempoEvents).toEqual([{...source.tempoEvents[0],bpm:92}])
    expect({...after,tempoEvents:source.tempoEvents}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(after)
  })

  it('studio.object-filter prevents a global Delete from clearing a note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    openStudioWorkspace('파일');chooseSelectionFilter('표기 필터', 'dynamics')
    const before = structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    expect(playbackMockState.lastScore).toEqual(before)
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it('studio.object-filter copies and deletes only selected measure staff text with exact history/native preservation', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const source = structuredClone(demoScore)
    const [first,second] = source.parts[0].staves[0].measures
    source.staffTexts = [{id:'copy-source',measureId:first.id,text:'SOURCE WORDS'},
      {id:'replace-target',measureId:second.id,text:'OLD TARGET'}]
    source.systemTexts = [{id:'system-keep',measureId:second.id,text:'SYSTEM KEEP'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/text.chromatics',fileName:'text.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/text.chromatics',fileName:'text.chromatics'})
    const { App } = await import('./App');render(<App />)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore?.staffTexts).toEqual(source.staffTexts))
    fireEvent.click(screen.getByRole('button',{name:`${first.number}마디 선택`}))
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('combobox',{name:'표기 필터'}))
    fireEvent.click(screen.getByRole('option',{name:'보표 글자'}))
    fireEvent.click(screen.getByRole('button',{name:'선택 범위 복사'}))
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:`${second.number}마디 선택`}))
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'선택 범위에 붙여넣기'}))
    const pasted = structuredClone(playbackMockState.lastScore!)
    const copied = pasted.staffTexts!.find(text=>text.measureId===second.id)!
    expect(copied).toMatchObject({measureId:second.id,text:'SOURCE WORDS'})
    expect(copied.id).not.toBe('copy-source');expect(copied.id).not.toBe('replace-target')
    expect({...pasted,staffTexts:source.staffTexts}).toEqual(source)
    expect(screen.getByText('1회 수정')).toBeInTheDocument()
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'선택 마디 보표 글자 지우기'}))
    expect(playbackMockState.lastScore!.staffTexts).toEqual([source.staffTexts[0]])
    expect(playbackMockState.lastScore!.systemTexts).toEqual(source.systemTexts)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalled())
    const payload=vi.mocked(window.inC.project.save).mock.calls.at(-1)![0]
    expect(decodeNativeProject(payload.contents).score).toEqual(pasted)
  },15000)

  it('studio.object-filter copies expression text through the actual filter and preserves positions/history/other families', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const source=structuredClone(demoScore),[first,second]=source.parts[0].staves[0].measures
    source.expressionTexts=[{id:'expression-source',measureId:first.id,tick:13440,text:'espressivo'}, {id:'expression-target',measureId:second.id,tick:0,text:'Old expression'}]
    source.staffTexts=[{id:'keep-staff',measureId:second.id,text:'Keep staff'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/expression.chromatics',fileName:'expression.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/expression.chromatics',fileName:'expression.chromatics'})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore?.expressionTexts).toEqual(source.expressionTexts))
    fireEvent.click(screen.getByRole('button',{name:`${first.number}마디 선택`}));openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('combobox',{name:'표기 필터'}));fireEvent.click(screen.getByRole('option',{name:'표현 텍스트'}))
    fireEvent.click(screen.getByRole('button',{name:'선택 범위 복사'}));fireEvent.click(screen.getByRole('button',{name:`${second.number}마디 선택`}))
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'선택 범위에 붙여넣기'}))
    const pasted=structuredClone(playbackMockState.lastScore!)
    expect(pasted.expressionTexts?.find(t=>t.measureId===second.id)).toMatchObject({text:'espressivo',tick:13440})
    expect({...pasted,expressionTexts:source.expressionTexts}).toEqual(source)
    expect(screen.getByText('1회 수정')).toBeInTheDocument()
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'선택 마디 표현 텍스트 지우기'}));expect(playbackMockState.lastScore!.expressionTexts).toEqual([source.expressionTexts[0]])
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(pasted)
  },15000)

  it('studio.object-filter exports backwards staff-text paste without mistaking array order for music loss', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const source=structuredClone(demoScore),[first,second]=source.parts[0].staves[0].measures
    source.staffTexts=[{id:'first-text',measureId:first.id,text:'First'}, {id:'second-text',measureId:second.id,text:'Second'}]
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/backwards.chromatics',fileName:'backwards.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/backwards.musicxml',fileName:'backwards.musicxml'})
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await waitFor(()=>expect(playbackMockState.lastScore?.staffTexts).toEqual(source.staffTexts))
    fireEvent.click(screen.getByRole('button',{name:`${second.number}마디 선택`}))
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('combobox',{name:'표기 필터'}));fireEvent.click(screen.getByRole('option',{name:'보표 글자'}))
    fireEvent.click(screen.getByRole('button',{name:'선택 범위 복사'}))
    fireEvent.click(screen.getByRole('button',{name:`${first.number}마디 선택`}))
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'선택 범위에 붙여넣기'}))
    const before=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))
    await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
    const parsed=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
    expect(parsed.staffTexts?.map(t=>t.text)).toEqual(['Second','Second'])
    expect(playbackMockState.lastScore).toEqual(before)
    expect(document.querySelector('.studio-document')).toHaveTextContent('저장하지 않은 변경')
  },15000)

  it.each([false,true])('studio.application-menu reveals notation families without losing workspace settings (single %s)', async single => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    localStorage.setItem('studio.palette.single-family.v1',String(single))
    localStorage.setItem('studio.palette-families.v1',JSON.stringify({'표현 기호':true,'셈여림':false,'음자리표·조표·박자표':false}))
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('표기 객체')
    const input=screen.getByRole('searchbox',{name:'표기 기호 검색'})
    fireEvent.change(input,{target:{value:'찾을 수 없는 글자'}})
    const before=structuredClone(playbackMockState.lastScore)
    const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
    fireEvent.click(nav.getByRole('button',{name:'추가'}))
    fireEvent.click(nav.getByRole('menuitem',{name:'음자리표·조표·박자표 팔레트'}))
    const palette=within(document.querySelector<HTMLElement>('.studio-notation-palette')!)
    const header=palette.getByRole('button',{name:'음자리표·조표·박자표'})
    await waitFor(()=>expect(header).toHaveFocus())
    expect(input).toHaveValue('');expect(header).toHaveAttribute('aria-expanded','true')
    expect(palette.getByRole('button',{name:'표현 기호'})).toHaveAttribute('aria-expanded',String(!single))
    expect(JSON.parse(localStorage.getItem('studio.palette.single-family.v1')!)).toBe(single)
    expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it('studio.palette-repeat discloses separate repeat/volta scopes and focuses the enabled editor after explicit measure selection', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}))
    const before=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('표기 객체');fireEvent.change(screen.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'반복'}})
    fireEvent.click(screen.getByRole('button',{name:'반복·볼타 설정 열기'}))
    const surface=screen.getByRole('region',{name:'반복과 볼타'})
    expect(within(surface).getByText('도돌이표와 반복 횟수는 마디를 선택해 편집합니다. 볼타는 현재 위치의 마디부터 적용할 수 있습니다.')).toBeInTheDocument()
    expect(within(surface).getByLabelText('반복 횟수')).toBeDisabled()
    expect(within(surface).getByRole('button',{name:'1번 볼타'})).toBeEnabled()
    expect(within(surface).getByRole('button',{name:'2번 볼타'})).toBeEnabled()
    await waitFor(()=>expect(surface).toHaveFocus())
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id','m1-c4')
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}))
    openStudioWorkspace('표기 객체');fireEvent.click(screen.getByRole('button',{name:'반복·볼타 설정 열기'}))
    await waitFor(()=>expect(screen.getByLabelText('반복 횟수')).toHaveFocus())
    expect(screen.getByLabelText('반복 횟수')).toBeEnabled()
    expect(playbackMockState.lastScore).toEqual(before);expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it('studio.command-search uses the current menu command and disabled policy without document edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    const before=structuredClone(playbackMockState.lastScore)
    fireEvent.click(within(screen.getByRole('navigation',{name:'앱 메뉴'})).getByRole('button',{name:'도구'}))
    fireEvent.click(screen.getByRole('menuitem',{name:'명령 검색'}))
    const dialog=screen.getByRole('dialog',{name:'명령 검색'}),input=within(dialog).getByRole('searchbox',{name:'명령 찾기'})
    fireEvent.change(input,{target:{value:'실행 취소'}})
    expect(within(dialog).getByRole('button',{name:'편집 · 실행 취소'})).toBeDisabled()
    expect(playbackMockState.lastScore).toEqual(before)
    fireEvent.change(input,{target:{value:'PDF 페이지'}})
    fireEvent.keyDown(input,{key:'Enter'})
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'명령 검색'})).not.toBeInTheDocument())
    await waitFor(()=>expect(document.activeElement).toBe(document.querySelector('.studio-page-setup [role="combobox"]')))
    expect(playbackMockState.lastScore).toEqual(before)
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
  })

  it('studio.command-search executes existing undo once and protects composing Escape', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    const before=structuredClone(playbackMockState.lastScore)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}))
    fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp',altKey:true,shiftKey:true})
    expect(screen.getByText('1회 수정')).toBeInTheDocument()
    const open=()=>{fireEvent.click(within(screen.getByRole('navigation',{name:'앱 메뉴'})).getByRole('button',{name:'도구'}));fireEvent.click(screen.getByRole('menuitem',{name:'명령 검색'}))}
    open();let dialog=screen.getByRole('dialog',{name:'명령 검색'}),input=within(dialog).getByRole('searchbox',{name:'명령 찾기'})
    fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'ㅎ'}})
    fireEvent.keyDown(input,{key:'Escape',isComposing:true,keyCode:229})
    expect(dialog).toBeInTheDocument();expect(input).toHaveValue('ㅎ')
    fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Escape'})
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'명령 검색'})).not.toBeInTheDocument())
    await waitFor(()=>expect(within(screen.getByRole('navigation',{name:'앱 메뉴'})).getByRole('button',{name:'도구'})).toHaveFocus())
    open();dialog=screen.getByRole('dialog',{name:'명령 검색'});input=within(dialog).getByRole('searchbox',{name:'명령 찾기'})
    fireEvent.change(input,{target:{value:'실행 취소'}});fireEvent.keyDown(input,{key:'Enter'})
    await waitFor(()=>expect(playbackMockState.lastScore).toEqual(before))
    expect(screen.getByText('0회 수정')).toBeInTheDocument()
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.command-search does not execute a queued file command after App unmount', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');const mounted=render(<App />)
    fireEvent.click(within(screen.getByRole('navigation',{name:'앱 메뉴'})).getByRole('button',{name:'도구'}));fireEvent.click(screen.getByRole('menuitem',{name:'명령 검색'}))
    const input=within(screen.getByRole('dialog',{name:'명령 검색'})).getByRole('searchbox',{name:'명령 찾기'})
    await waitFor(()=>expect(input).toHaveFocus())
    fireEvent.change(input,{target:{value:'프로젝트 저장'}})
    const frames:FrameRequestCallback[]=[]
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{frames.push(callback);return 100000+frames.length})
    fireEvent.keyDown(input,{key:'Enter'});mounted.unmount()
    act(()=>frames.forEach(frame=>frame(0)));raf.mockRestore()
    expect(window.inC.project.save).not.toHaveBeenCalled()
  })

  it('palette.range-notation keeps visible commands in notation mode as selection changes', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()
    openNotationSettings('range')
    const palette = screen.getByRole('region', { name: '범위 기호' })
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toBeDisabled()
    expect(within(palette).getByRole('button', { name: '8va' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    expect(palette).toBeVisible()
    expect(within(palette).getByRole('button', { name: /슬러 추가/ })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), { shiftKey: true })
    expect(palette).toBeVisible()
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(within(palette).getByRole('button', { name: '디미누엔도 헤어핀' }))
    expect(within(palette).getByRole('button', { name: '디미누엔도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toHaveAttribute('aria-pressed', 'true')

    openStudioWorkspace('음표')
    expect(screen.queryByRole('region', { name: '범위 기호' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '선택 요약' })).queryByLabelText('크레셴도 헤어핀')).not.toBeInTheDocument()
    openNotationSettings('range')
    expect(within(palette).getByRole('button', { name: '크레셴도 헤어핀' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '1마디 선택' }))
    expect(palette).toBeVisible()
    for (const button of within(palette).getAllByRole('button')) expect(button).toBeDisabled()
  })

  it('span properties edits rest endpoints without changing background notes and survives history and native save', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    project.score.hairpins = [{ id: 'test-hairpin', type: 'crescendo', startEventId: events[0]!.id, endEventId: events[3]!.id }]
    project.score.slurs = [{ id: 'test-slur', startEventId: events[1]!.id, endEventId: events[2]!.id }]
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/span.chromatics', fileName: 'span.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/span.chromatics', fileName: 'span.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    fireEvent.click(screen.getByRole('button', { name: `${events[1]!.id} 선택` }))
    openStudioWorkspace('표기 객체')
    chooseSpanReference('hairpin:test-hairpin')
    expectSpanEndpoint('표기 시작점',events[0]!.id)
    expectSpanEndpoint('표기 끝점',events[3]!.id)
    chooseSpanEndpoint('표기 끝점',events[2]!.id)
    expectSpanEndpoint('표기 끝점',events[2]!.id)
    chooseSpanEndpoint('표기 시작점',events[3]!.id)
    expectSpanEndpoint('표기 시작점',events[0]!.id)
    fireEvent.keyDown(window, { key: '5', code: 'Digit5' })
    fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true })
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    fireEvent.keyDown(window, { key: 'Delete', code: 'Delete' })
    expect(screen.queryByLabelText('표기 끝점')).not.toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expectSpanEndpoint('표기 끝점',events[2]!.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expectSpanEndpoint('표기 끝점',events[3]!.id)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expectSpanEndpoint('표기 끝점',events[2]!.id)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.parts).toEqual(project.score.parts)
    expect(saved.score.slurs).toEqual(project.score.slurs)
    expect(saved.score.hairpins?.[0]).toMatchObject({ endEventId: events[2]!.id })
    chooseSpanReference('slur:test-slur')
    fireEvent.click(screen.getByRole('combobox',{name:'표기 시작점'}))
    expect(screen.queryByRole('option', { name: /쉼표/ })).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('combobox',{name:'표기 시작점'}),{key:'Escape'})
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByLabelText('표기 끝점')).not.toBeInTheDocument()
  }, 15_000)

  it('studio.span-select-history keeps closed Select undo available without committing open-list or geometry drafts', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('표기 객체')
    const source = structuredClone(playbackMockState.lastScore)
    const id=source!.hairpins![0].id
    chooseSpanReference(`hairpin:${id}`)
    fireEvent.click(screen.getByText('배치 · 형상'))
    const placement=screen.getByRole('combobox',{name:'표기 배치'})
    fireEvent.click(placement)
    fireEvent.click(screen.getByRole('option',{name:'보표 위'}))
    const committed=structuredClone(playbackMockState.lastScore)
    expect(committed?.hairpins?.find(span=>span.id===id)?.engraving).toEqual({placement:'above'})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    placement.focus()
    fireEvent.keyDown(placement,{key:'Enter'})
    fireEvent.keyDown(placement,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(placement,{key:'Escape'})
    expect(placement).toHaveFocus()
    fireEvent.keyDown(placement,{key:'z',code:'KeyZ',ctrlKey:true,isComposing:true,keyCode:229})
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(placement,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(placement).toHaveTextContent('자동')
    fireEvent.keyDown(placement,{key:'z',code:'KeyZ',metaKey:true,shiftKey:true})
    expect(playbackMockState.lastScore).toEqual(committed)
    const offset=screen.getByLabelText('표기 세로 이동')
    offset.focus();fireEvent.change(offset,{target:{value:'0'}})
    fireEvent.keyDown(offset,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(offset,{key:'Escape'});fireEvent.blur(offset)
    expect(offset).toHaveValue(null)
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(placement,{key:'z',code:'KeyZ',metaKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent(id)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('span geometry commits numeric drafts, cancels invalid edits and resets through native history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { decodeNativeProject } = await import('../../project/schema')
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/geometry.chromatics', fileName: 'geometry.chromatics' })
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({ filePath: '/scores/geometry.musicxml', fileName: 'geometry.musicxml' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('표기 객체')
    const reference = `hairpin:${playbackMockState.lastScore!.hairpins![0].id}`
    chooseSpanReference(reference)
    fireEvent.click(screen.getByText('배치 · 형상'))
    fireEvent.click(screen.getByRole('combobox',{name:'표기 배치'}))
    fireEvent.click(screen.getByRole('option',{name:'보표 위'}))
    const offset = screen.getByLabelText('표기 세로 이동')
    fireEvent.change(offset, { target: { value: '-1.5' } })
    fireEvent.blur(offset)
    // A physical Enter followed by blur is exactly one undo unit.
    offset.focus()
    fireEvent.change(offset, { target: { value: '0' } })
    fireEvent.keyDown(offset, { key: 'Enter' })
    fireEvent.blur(offset)
    expect(offset).toHaveValue(0)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, keyCode: 229 })
    expect(offset).toHaveValue(0)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, isComposing: true })
    expect(offset).toHaveValue(0)
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(offset).toHaveValue(-1.5)
    fireEvent.change(offset, { target: { value: '99' } })
    fireEvent.blur(offset)
    expect(offset).toHaveValue(-1.5)
    fireEvent.change(offset, { target: { value: '2' } })
    fireEvent.keyDown(offset, { key: 'Escape' })
    expect(offset).toHaveValue(-1.5)
    fireEvent.click(screen.getByRole('button', { name: '표기 자동 배치 복원' }))
    expect(offset).toHaveValue(null)
    expect(screen.getByRole('combobox',{name:'표기 배치'})).toHaveTextContent('자동')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(offset).toHaveValue(-1.5)
    fireEvent.keyDown(window, { code: 'KeyS', ctrlKey: true })
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const native = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(native.version).toBe(2)
    expect(native.score.hairpins?.find(span => `hairpin:${span.id}` === reference)?.engraving).toEqual({ placement: 'above', offsetY: -1.5 })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    const xmlReport = within(await screen.findByRole('region', {name:'MusicXML 경고 상세'}))
    expect(xmlReport.getByText('슬러·헤어핀의 수동 배치는 프로젝트 파일에 보존됩니다. MusicXML에는 수동 배치가 포함되지 않습니다.')).toBeVisible()
    expect(xmlReport.getByText(/Manual span placement and shape/)).not.toBeVisible()
    fireEvent.click(xmlReport.getByText('기술 정보'))
    expect(xmlReport.getByText(/Manual span placement and shape/)).toBeVisible()
  })

  it('octave range authoring preserves displayed notes through undo native and standard XML save', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/octave.chromatics', fileName: 'octave.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/octave.chromatics', fileName: 'octave.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    const originalPitches = screen.getByTestId('notation-preview').getAttribute('data-event-pitches')
    fireEvent.click(screen.getByRole('button', { name: `${events[1]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${events[2]!.id} 선택` }), { shiftKey: true })
    openNotationSettings('range')
    fireEvent.click(screen.getByRole('button', { name: '8va' }))
    expect(screen.getByRole('button', { name: '8va' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score.octaveShifts ?? []).toEqual([])
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledTimes(2))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1]![0].contents).score.octaveShifts?.[0]).toMatchObject({ type: '8va', startEventId: events[1]!.id, endEventId: events[2]!.id })
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    const xml = vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents
    expect(xml).toContain('<octave-shift type="down" size="8"/>')
    const reopened = parseMusicXml(xml)
    expect(reopened.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events[1]).toMatchObject({ pitch: { step: 'C', octave: 4 } })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-event-pitches', originalPitches)
  })

  it('rest-anchored hairpin input supports undo redo native save and XML reopen', async () => {
    window.history.replaceState({}, '', '/?fixture=single-voice-mvp')
    const { createNativeProject, encodeNativeProject, decodeNativeProject } = await import('../../project/schema')
    const project = createNativeProject(parseMusicXml(restHairpinMusicXml))
    const events = project.score.parts[0]!.staves[0]!.measures[0]!.voices[1]!.events
    vi.mocked(window.inC.project.open).mockResolvedValue({ filePath: '/scores/rest.chromatics', fileName: 'rest.chromatics', contents: encodeNativeProject(project) })
    vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/rest.chromatics', fileName: 'rest.chromatics' })
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 열기' }))
    await screen.findByText('Rest Hairpin Input')
    fireEvent.click(screen.getByRole('button', { name: `${events[0]!.id} 선택` }))
    fireEvent.click(screen.getByRole('button', { name: `${events[3]!.id} 선택` }), { shiftKey: true })
    openNotationSettings('range')
    expect(screen.getByRole('button', { name: /슬러 추가/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '8va' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '크레셴도 헤어핀' }))
    const preview = screen.getByTestId('notation-preview')
    const anchors = `${events[0]!.id}–${events[3]!.id}`
    expect(within(preview).getByText(anchors)).toHaveAttribute('data-hairpin-type', 'crescendo')
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
    expect(within(preview).queryByText(anchors)).not.toBeInTheDocument()
    fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
    expect(within(preview).getByText(anchors)).toBeInTheDocument()
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents)
    expect(saved.score.hairpins?.[0]).toMatchObject({ startEventId: events[0]!.id, endEventId: events[3]!.id })
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))
    await waitFor(() => expect(window.inC.musicXml.save).toHaveBeenCalledOnce())
    const reopened = parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0]![0].contents)
    const reopenedVoice = reopened.parts[0]!.staves[0]!.measures[0]!.voices[1]!
    expect(reopened.hairpins?.[0]).toMatchObject({ startEventId: reopenedVoice.events[0]!.id, endEventId: reopenedVoice.events[3]!.id })
  })

  it('layout.hairpin-toggle adds, replaces, and removes a hairpin for the selected range', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), {
      shiftKey: true
    })

    const preview = screen.getByTestId('notation-preview')
    openNotationSettings('range')
    const crescendoButton = screen.getByRole('button', {
      name: '크레셴도 헤어핀'
    })
    const diminuendoButton = screen.getByRole('button', {
      name: '디미누엔도 헤어핀'
    })

    expect(within(preview).getByText('m1-c4–m1-f-sharp-4')).toHaveAttribute(
      'data-hairpin-type',
      'crescendo'
    )

    fireEvent.click(crescendoButton)
    expect(within(preview).queryByText('m1-c4–m1-f-sharp-4')).not.toBeInTheDocument()

    fireEvent.click(diminuendoButton)
    expect(within(preview).getByText('m1-c4–m1-f-sharp-4')).toHaveAttribute(
      'data-hairpin-type',
      'diminuendo'
    )

    fireEvent.click(diminuendoButton)
    expect(within(preview).queryByText('m1-c4–m1-f-sharp-4')).not.toBeInTheDocument()
  })

  it('layout.slur-toggle adds and removes a slur with the range command and shortcut', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-c4 선택' }))
    fireEvent.click(screen.getByRole('button', { name: 'm1-f-sharp-4 선택' }), {
      shiftKey: true
    })

    const preview = screen.getByTestId('notation-preview')
    const slurLabel = 'slur:m1-c4–m1-f-sharp-4'
    openNotationSettings('range')
    const slurButton = screen.getByRole('button', {
      name: '슬러 추가 또는 해제, 단축키 S'
    })

    expect(within(preview).getByText(slurLabel)).toHaveAttribute('data-slur', 'true')

    fireEvent.click(slurButton)
    expect(within(preview).queryByText(slurLabel)).not.toBeInTheDocument()

    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    expect(within(preview).getByText(slurLabel)).toHaveAttribute('data-slur', 'true')
  })

  it('layout.slur-keyboard-input starts a slur range and confirms it with S', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })

    expect(
      screen.getByText(
        '슬러 시작점을 선택했습니다. ←/→로 끝 음표를 고르고 S로 확정하세요.'
      )
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('notation-preview')).toHaveAttribute(
      'data-selected-event-id',
      'm1-e4'
    )

    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    expect(
      within(screen.getByTestId('notation-preview')).getByText('slur:m1-d4–m1-e4')
    ).toHaveAttribute('data-slur', 'true')
  })

  it('import-export.save-multiple-auto-numbered-slurs keeps MusicXML validation stable', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { code: 'KeyS', key: 'ㄴ' })
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)

    expect(savedScore.slurs?.map((slur) => slur.number).sort()).toEqual([
      1,
      2,
      3
    ])
    expect(
      await screen.findByText('release-test.musicxml을 MusicXML로 내보냈습니다.')
    ).toBeInTheDocument()
  })

  it('studio.property-hierarchy puts focused event controls before ancillary text and keeps a single dot command group', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const summary=screen.getByRole('region',{name:'선택 요약'})
    const marks=within(summary).getByRole('region',{name:'선택한 표기의 연주 기호'})
    const text=within(summary).getByRole('textbox',{name:'선택 요약 코드'})
    expect(marks.compareDocumentPosition(text)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expandNoteDetails()
    const details=screen.getByRole('region',{name:'선택 요약'})
    expect(within(details).queryByRole('button',{name:'+'})).not.toBeInTheDocument()
    expect(within(details).queryByRole('button',{name:'-'})).not.toBeInTheDocument()
    const source=structuredClone(playbackMockState.lastScore)
    const dots=within(screen.getByRole('region',{name:'음표 입력 도구'})).getByRole('button',{name:'점 추가'})
    expect(dots).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'8분음표, 단축키 4'}))
    const shortened=structuredClone(playbackMockState.lastScore)
    expect(dots).toBeEnabled()
    fireEvent.click(dots)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(shortened)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.click(dots)
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent('점 1')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.selected-marks keeps event marks in properties and preserves target, single undo and rest policy', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const dock = screen.getByRole('complementary', {name:'속성 도크'})
    const marks = within(dock).getByRole('region', {name:'선택한 표기의 연주 기호'})
    expect(marks.closest('.studio-chrome')).toBeNull()
    expect(marks).toHaveTextContent('다음 입력 설정을 바꾸지 않습니다.')
    const source = structuredClone(playbackMockState.lastScore)
    const staccato = within(marks).getByRole('button', {name:'스타카토'})
    expect(staccato).toHaveClass('dd-icon-button')
    expect(staccato.querySelector('[data-mark-glyph="staccato"]')).toBeInTheDocument()
    expect(staccato).toHaveAttribute('aria-pressed','true')
    fireEvent.click(staccato)
    expect(staccato).toHaveAttribute('aria-pressed','false')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const changed = structuredClone(playbackMockState.lastScore)
    expect(changed?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({id:'m1-c4',articulations:undefined})
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true})
    expect(playbackMockState.lastScore).toEqual(changed)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(within(marks).getByRole('button',{name:'페르마타'}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByLabelText('다음 입력')).toHaveAttribute('data-input-active','true')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
    fireEvent.click(screen.getByRole('button',{name:'쉼표로 변환'}))
    expect(within(marks).getByRole('button',{name:'스타카토'})).toBeDisabled()
    expect(within(marks).getByRole('button',{name:'페르마타'})).toBeEnabled()
    expect(within(marks).getByRole('button',{name:'숨표'})).toBeEnabled()
    expect(screen.getAllByRole('button',{name:'페르마타'})).toHaveLength(1)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    openStudioWorkspace('표기 객체')
    chooseSpanReference(`hairpin:${source!.hairpins![0].id}`)
    expect(screen.queryByRole('region',{name:'선택한 표기의 연주 기호'})).not.toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(source)
  })

  it('layout.fermata toggles the selected event mark in data and preview', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const fermataButton = screen.getByRole('button', { name: '페르마타' })
    const preview = screen.getByTestId('notation-preview')

    expect(fermataButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('페르마타 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )

    fireEvent.click(fermataButton)
    expect(fermataButton).toHaveAttribute('aria-pressed', 'false')
    expect(within(preview).queryByText('페르마타 표시')).not.toBeInTheDocument()

    fireEvent.click(fermataButton)
    expect(fermataButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('페르마타 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('studio.input-rest shares the real rest command with distinct selected and next-input scope', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const toolbar = screen.getByRole('region', { name: '음표 입력 도구' })
    const original = structuredClone(playbackMockState.lastScore)
    const rest = within(toolbar).getByRole('button', { name: '쉼표로 변환' })
    expect(rest).toHaveClass('dd-icon-button')
    expect(rest.querySelector('[data-music-glyph="rest"]')).toBeInTheDocument()
    fireEvent.click(rest)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(rest).toBeDisabled()
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    expect(playbackMockState.lastScore?.parts.flatMap(p=>p.staves).flatMap(s=>s.measures).flatMap(m=>m.voices).flatMap(v=>v.events).find(e=>e.id===selected)?.type).toBe('rest')
    fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true })
    expect(playbackMockState.lastScore).toEqual(original)
    expect(rest).toBeEnabled()
    fireEvent.click(within(toolbar).getByRole('button', { name:'음표 입력 전환, 단축키 N' }))
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    const insert = within(toolbar).getByRole('button', { name:'쉼표 넣기' })
    fireEvent.keyDown(insert, { key:' ', code:'Space' })
    fireEvent.click(insert)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(document.querySelector('.editor-status')).toHaveTextContent('정지')
    expect(within(toolbar).queryByRole('button', { name:'쉼표로 변환' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name:'쉼표 넣기' })).toHaveLength(1)
    fireEvent.keyDown(window, { key:'z', code:'KeyZ', ctrlKey:true })
    expect(playbackMockState.lastScore).toEqual(original)
    expect(screen.getByLabelText('다음 입력')).toHaveAttribute('data-input-active', 'true')
    expect(within(toolbar).getByRole('button', { name:'쉼표 넣기' })).toBeEnabled()
  })

  it('note-input.edit-selected-event-in-inspector note-input.apply-accidental edits duration, dots, accidental, and event type without duplicate duration controls', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const inspector = screen.getByRole('region', { name: '선택 요약' })
    const durationPalette = screen.getByLabelText('음가')
    const eighthDuration = within(durationPalette).getByRole('button', {
      name: '8분음표, 단축키 4'
    })
    const quarterDuration = within(durationPalette).getByRole('button', {
      name: '4분음표, 단축키 5'
    })

    expect(within(inspector).queryByLabelText('선택 이벤트 음가')).not.toBeInTheDocument()

    fireEvent.click(eighthDuration)
    expect(eighthDuration).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(screen.getByRole('group',{name:'점음표'})).getByRole('button', { name: '점 추가' }))
    expect(
      screen.getByLabelText('점 개수')
    ).toHaveTextContent('1')

    fireEvent.click(quarterDuration)
    expect(quarterDuration).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByLabelText('점 개수')
    ).toHaveTextContent('0')

    const sharp = within(screen.getByRole('group', { name: '임시표' })).getByRole('button', { name: '샤프' })
    fireEvent.click(sharp)
    expect(sharp).toHaveAttribute('aria-pressed', 'true')

    const convertToRest = within(screen.getByRole('region', {name:'음표 입력 도구'})).getByRole('button', {
      name: '쉼표로 변환'
    })
    fireEvent.click(convertToRest)
    expect(convertToRest).toBeDisabled()
    expect(quarterDuration).toHaveAttribute('aria-pressed', 'true')

    fireEvent.keyDown(window, { code: 'KeyZ', key: 'z', metaKey: true })
    expect(convertToRest).toBeEnabled()
  }, 15000)

  it('keyboard.duration-shortcuts use the V1 notation map and leave plain 9 unbound', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const durationPalette = screen.getByLabelText('음가')

    expect(
      within(durationPalette).getByRole('button', {
        name: '64분음표, 단축키 1'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '32분음표, 단축키 2'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '16분음표, 단축키 3'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '8분음표, 단축키 4'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '4분음표, 단축키 5'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '4분음표, 단축키 5'
      })
    ).toContainHTML('data-music-glyph="quarter"')
    expect(
      within(durationPalette).getByRole('button', {
        name: '2분음표, 단축키 6'
      })
    ).toBeInTheDocument()
    expect(
      within(durationPalette).getByRole('button', {
        name: '온음표, 단축키 7'
      })
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('group',{name:'리듬 표기'})).getByRole('button', {
        name: /셋잇단음표 적용 또는 입력 준비, 단축키 ⌘\/Ctrl\+3/
      })
    ).toBeInTheDocument()

    fireEvent.keyDown(window, { code: 'Digit9', key: '9' })

    expect(document.querySelector('.editor-status')).not.toHaveTextContent(
      '셋잇단음표 입력'
    )
    expect(
      screen.queryByRole('button', {
        name: /단축키 9/
      })
    ).not.toBeInTheDocument()
  })

  it('layout.breath-marks replaces a breath mark with a caesura on the selected event', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    const preview = screen.getByTestId('notation-preview')
    const breathButton = screen.getByRole('button', { name: '숨표' })
    const caesuraButton = screen.getByRole('button', { name: '중지표' })

    fireEvent.click(breathButton)
    expect(breathButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('숨표 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )

    fireEvent.click(caesuraButton)
    expect(breathButton).toHaveAttribute('aria-pressed', 'false')
    expect(caesuraButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).queryByText('숨표 표시')).not.toBeInTheDocument()
    expect(within(preview).getByText('중지표 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('studio.selected-pitch keeps existing pitch commands in shared properties without an extra empty top row', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const pitch=within(screen.getByRole('region',{name:'선택 음표의 화음'})).getByRole('group',{name:'선택 음높이'})
    const up=within(pitch).getByRole('button',{name:'음높이 한 칸 올리기'})
    expect(up).toHaveClass('dd-icon-button')
    expect(document.querySelector('header.toolbar')).toBeNull()
    expect(screen.getAllByRole('button',{name:'음높이 한 칸 올리기'})).toHaveLength(1)
    fireEvent.click(up)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({pitch:{step:'D',octave:4}})
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(within(pitch).getByRole('button',{name:'한 옥타브 올리기'}))
    expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({pitch:{step:'C',octave:5}})
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'쉼표로 변환'}))
    expect(screen.queryByRole('group',{name:'선택 음높이'})).not.toBeInTheDocument()
  })

  it('studio.chord-properties edits real chord members in the shared inspector without a legacy note-detail surface', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const root=within(screen.getByRole('complementary',{name:'속성 도크'})).getByRole('region',{name:'선택 음표의 화음'})
    expect(root.closest('.studio-chrome')).toBeNull()
    expect(document.querySelector('.studio-note-details')).toBeNull()
    const third=within(root).getByRole('button',{name:'3도 추가'})
    expect(third).toHaveClass('dd-button')
    fireEvent.click(third)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const chord=structuredClone(playbackMockState.lastScore)
    expect(chord?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({pitches:[{step:'C',octave:4},{step:'E',octave:4}]})
    expect(root).toHaveTextContent('화음 전체 (2음)')
    expect(root).toHaveTextContent('A–G: 단음 교체')
    expect(within(root).getByRole('button',{name:'E4 구성음 제거'})).toHaveClass('dd-icon-button')
    fireEvent.click(third)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const remove=within(root).getByRole('button',{name:'E4 구성음 제거'})
    remove.focus();fireEvent.click(remove)
    expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({id:'m1-c4',pitch:{step:'C',octave:4}})
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(chord)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'쉼표로 변환'}))
    expect(screen.queryByRole('region',{name:'선택 음표의 화음'})).not.toBeInTheDocument()
  })

  it('studio.note-decorations edits the selected note through shared controls without changing next-input defaults', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const dock=screen.getByRole('complementary',{name:'속성 도크'})
    const root=within(dock).getByRole('region',{name:'선택 음표의 장식'})
    expect(root.closest('.studio-chrome')).toBeNull()
    const source=structuredClone(playbackMockState.lastScore)
    const tremolo=within(root).getByRole('combobox',{name:'트레몰로'})
    expect(tremolo).toHaveClass('dd-select')
    tremolo.focus();fireEvent.keyDown(tremolo,{key:'Enter'});fireEvent.keyDown(tremolo,{key:'End'});fireEvent.keyDown(tremolo,{key:'Escape'})
    expect(tremolo).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(tremolo);fireEvent.click(screen.getByRole('option',{name:'3줄'}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({tremolo:{type:'single',marks:3}})
    const committed=structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(tremolo,{key:'Enter'})
    expect(tremolo).toHaveAttribute('aria-expanded','true')
    fireEvent.keyDown(tremolo,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(tremolo,{key:'Escape'})
    fireEvent.keyDown(tremolo,{key:'z',code:'KeyZ',ctrlKey:true,isComposing:true,keyCode:229})
    expect(playbackMockState.lastScore).toEqual(committed)
    fireEvent.keyDown(tremolo,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(tremolo,{key:'z',code:'KeyZ',metaKey:true,shiftKey:true})
    expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({tremolo:{marks:3}})
    fireEvent.keyDown(tremolo,{key:'z',code:'KeyZ',metaKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    const trill=within(root).getByRole('button',{name:'트릴'})
    expect(trill).toHaveClass('dd-icon-button')
    fireEvent.click(trill)
    expect(trill).toHaveAttribute('aria-pressed','true')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(screen.getByLabelText('다음 입력')).toHaveAttribute('data-input-active','true')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
    fireEvent.click(within(root).getByRole('button',{name:'부착 꾸밈음'}))
    const note=playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]
    expect(note).toMatchObject({id:'m1-c4',type:'note',graceNotes:[{slash:true}]})
    expect(note?.duration).toEqual(source?.parts[0].staves[0].measures[0].voices[0].events[0].duration)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'쉼표로 변환'}))
    expect(within(dock).queryByRole('region',{name:'선택 음표의 장식'})).not.toBeInTheDocument()
  })

  it('tremolo.apply-selected-note stores and displays three marks on the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const preview = screen.getByTestId('notation-preview')
    const tremolo = screen.getByRole('combobox', { name: '트레몰로' })

    fireEvent.click(tremolo)
    fireEvent.click(screen.getByRole('option',{name:'3줄'}))

    expect(tremolo).toHaveTextContent('3줄')
    expect(screen.getByText('트레몰로를 추가했습니다.')).toBeInTheDocument()
    expect(within(preview).getByText('트레몰로 3줄 표시')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('ornaments.add-selected-note stores and displays tr on the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: '트릴' })

    fireEvent.click(trillButton)

    expect(trillButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('tr')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('ornaments.remove-selected-note removes tr from the selected note', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: '트릴' })

    fireEvent.click(trillButton)
    fireEvent.click(trillButton)

    expect(trillButton).not.toHaveAttribute('aria-pressed')
    expect(within(preview).queryByText('tr')).not.toBeInTheDocument()
  })

  it('ornaments.keep-multiple keeps tr, mord. and turn together', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const preview = screen.getByTestId('notation-preview')
    const trillButton = screen.getByRole('button', { name: '트릴' })
    const mordentButton = screen.getByRole('button', { name: '모르덴트' })
    const turnButton = screen.getByRole('button', { name: '턴' })

    fireEvent.click(trillButton)
    fireEvent.click(mordentButton)
    fireEvent.click(turnButton)

    expect(trillButton).toHaveAttribute('aria-pressed', 'true')
    expect(mordentButton).toHaveAttribute('aria-pressed', 'true')
    expect(turnButton).toHaveAttribute('aria-pressed', 'true')
    expect(within(preview).getByText('tr mord. turn')).toHaveAttribute(
      'data-event-id',
      'm1-c4'
    )
  })

  it('runs notation extension controls through the editor command flow', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    fireEvent.click(screen.getByRole('button', { name: '3도 추가' }))
    expect(screen.getByText('화음 구성음을 추가했습니다.')).toBeInTheDocument()

    openStudioWorkspace('가사')
    const harmonyInput = openHarmonyProperties()
    fireEvent.change(harmonyInput, { target: { value: 'H13' } })
    fireEvent.blur(harmonyInput)
    expect(
      screen.getByText(/지원하는 코드 심벌 형식/)
    ).toBeInTheDocument()

    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()

    openStudioWorkspace('음표')
    fireEvent.click(screen.getByRole('button', { name: '트릴' }))
    expect(screen.getByText('장식음을 갱신했습니다.')).toBeInTheDocument()
  })
})


describe('studio.single-harmony clipboard',()=>{
 registerAppTestHooks()
 it.each(['score','part'] as const)('selects a coincident interior harmony by ID in %s, edits only it and appends the copied snapshot across owners with exact undo',async view=>{
   window.history.replaceState({},'', '/?fixture=release-test')
   const {singleHarmonyFixture}=await import('../../testing/single-harmony-fixture')
   const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
   const score=singleHarmonyFixture()
   vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/harmony.chromatics',fileName:'harmony.chromatics',contents:encodeNativeProject(createNativeProject(score))})
   vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/harmony.chromatics',fileName:'harmony.chromatics'})
   const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
   if(view==='part'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',score.parts[0].id)}
   const target=screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'});target.focus();fireEvent.click(target)
   expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','harmony')
   expect(screen.getByRole('textbox',{name:'선택 요약 코드'})).toHaveValue('G7/B')
   expect(screen.getByRole('textbox',{name:'선택 요약 코드'})).not.toHaveFocus()
   fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
   fireEvent.doubleClick(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}))
   const field=screen.getByRole('textbox',{name:'선택 요약 코드'});expect(field).toHaveFocus()
   fireEvent.change(field,{target:{value:'Dm7/A'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
   const edited=structuredClone(score);const {parseHarmonyText}=await import('../../musicxml/harmony-text');Object.assign(edited.harmonies![1],parseHarmonyText('Dm7/A'))
   expect(playbackMockState.lastScore).toEqual(edited)
   if(view==='part')chooseScoreView('파트보 선택',score.parts[1].id)
   fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
   const pasted=structuredClone(playbackMockState.lastScore!),added=pasted.harmonies!.at(-1)!
   expect(added).toEqual({...score.harmonies![1],id:expect.stringMatching(/^harmony-/),measureId:'other-bar-2',tick:2*TICKS_PER_QUARTER})
   expect(pasted.harmonies!.slice(0,-1)).toEqual(edited.harmonies);expect({...pasted,harmonies:edited.harmonies}).toEqual(edited)
   fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited)
   fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
   if(view==='part')chooseScoreView('파트보 선택',score.parts[0].id)
   fireEvent.click(screen.getByRole('button',{name:'코드 심벌 Dm7/A 속성 열기'}));fireEvent.keyDown(window,{key:'Delete',code:'Delete'})
   const deleted=structuredClone(pasted);deleted.harmonies=deleted.harmonies!.filter(mark=>mark.id!=='h-source-second');expect(playbackMockState.lastScore).toEqual(deleted)
   fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(pasted)
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
   expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(pasted)
 })
})


describe('studio.single-harmony destinations',()=>{
 registerAppTestHooks()
 it.each(['blank-measure','new-document'] as const)('preserves copied root/bass and target neighbors at %s boundary',async destination=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {singleHarmonyFixture}=await import('../../testing/single-harmony-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{parseHarmonyText}=await import('../../musicxml/harmony-text')
  const score=singleHarmonyFixture(),project=createNativeProject(score)
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(project)})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
  fireEvent.click(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}));fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
  let target=score
  if(destination==='new-document'){
   target=structuredClone(score);target.title='Destination document same IDs';Object.assign(target.harmonies![1],parseHarmonyText('Cm7/Eb'))
   vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/destination.chromatics',fileName:'destination.chromatics',contents:encodeNativeProject(createNativeProject(target))})
   openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(target.title)
  }
  if(destination==='blank-measure')fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}))
  else fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}))
  fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
  const result=structuredClone(playbackMockState.lastScore!),added=result.harmonies!.at(-1)!
  expect(added).toEqual({...score.harmonies![1],id:expect.stringMatching(/^harmony-/),measureId:destination==='blank-measure'?'primary-bar-2':'other-bar-2',tick:destination==='blank-measure'?0:2*TICKS_PER_QUARTER})
  expect(result.harmonies!.slice(0,-1)).toEqual(target.harmonies);expect({...result,harmonies:target.harmonies}).toEqual(target)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(target)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(result)
 })
})


describe('studio.single-harmony empty edit',()=>{
 registerAppTestHooks()
 it('cancels IME and Escape, then deletes only the exact symbol once and restores its identity on undo',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {singleHarmonyFixture}=await import('../../testing/single-harmony-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const score=singleHarmonyFixture()
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/harmony.chromatics',fileName:'harmony.chromatics',contents:encodeNativeProject(createNativeProject(score))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
  fireEvent.doubleClick(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}))
  let field=screen.getByRole('textbox',{name:'선택 요약 코드'});field.focus();fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:''}});fireEvent.keyDown(field,{key:'Enter',keyCode:229,isComposing:true});fireEvent.blur(field);expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.compositionEnd(field);fireEvent.keyDown(field,{key:'Escape'});fireEvent.blur(field);expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.doubleClick(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}));field=screen.getByRole('textbox',{name:'선택 요약 코드'});field.focus();fireEvent.change(field,{target:{value:''}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
  const removed=structuredClone(score);removed.harmonies=removed.harmonies!.filter(mark=>mark.id!=='h-source-second')
  expect(playbackMockState.lastScore).toEqual(removed);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'})).toHaveAttribute('aria-pressed','true')
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(removed)
  expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
 })
})

describe('studio.single-harmony structural boundary',()=>{
 registerAppTestHooks()
 it('retains a copied symbol after deleting its source measure without rebinding surviving anchors',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {singleHarmonyStructureFixture}=await import('../../testing/single-harmony-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source,removed,pasted}=singleHarmonyStructureFixture()
  if(process.env.DDIRORI_HARMONY_STRUCTURE_QA_DIR){
   const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi'),dir=process.env.DDIRORI_HARMONY_STRUCTURE_QA_DIR
   mkdirSync(dir,{recursive:true});for(const [name,value]of Object.entries({source,removed,pasted})){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(value));writeFileSync(join(dir,name+'.mid'),serializeMidi(value))}
  }
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/structure.chromatics',fileName:'structure.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  fireEvent.click(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}));fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
  fireEvent.contextMenu(screen.getByRole('button',{name:'1마디 선택'}),{clientX:160,clientY:180});fireEvent.click(within(screen.getByRole('menu',{name:'마디 작업'})).getByRole('menuitem',{name:'마디 제거'}))
  expect(playbackMockState.lastScore).toEqual(removed)
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
  const result=structuredClone(playbackMockState.lastScore!),expected=structuredClone(pasted);expected.harmonies!.at(-1)!.id=result.harmonies!.at(-1)!.id;expect(result).toEqual(expected);expect(result.slurs).toEqual(source.slurs);expect(result.layout).toEqual(source.layout)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(removed)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(removed)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(result)
 })
})


describe('studio.measure-dynamics consistency',()=>{
 registerAppTestHooks()
 it.each(['score','part'] as const)('explains first-value display/playback and keeps the existing measure replacement contract in %s',async view=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source,edited}=measureDynamicsFixture()
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/dynamics.chromatics',fileName:'dynamics.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  if(view==='part'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[0].id)}
  fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}));openStudioWorkspace('음표')
  expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveTextContent('p')
  expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveAccessibleDescription(/첫 번째 값을 표시·재생합니다/)
  expect(playbackMockState.lastScore).toEqual(source)
  chooseInspectorDynamic('mf');expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
 })
})

describe('studio.single-harmony unsupported range guidance',()=>{
 registerAppTestHooks()
 it('rejects range paste with single-location guidance rather than a false first-staff restriction',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {singleHarmonyFixture}=await import('../../testing/single-harmony-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),score=singleHarmonyFixture()
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/harmony.chromatics',fileName:'harmony.chromatics',contents:encodeNativeProject(createNativeProject(score))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(score.title)
  fireEvent.click(screen.getByRole('button',{name:'코드 심벌 G7/B 속성 열기'}));fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-a 선택'}));fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}),{shiftKey:true})
  fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:'복사한 코드 추가'})).toBeDisabled();fireEvent.keyDown(screen.getByRole('menu',{name:'편집'}),{key:'Escape'})
  fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
  expect(document.querySelector('.editor-status')).toHaveTextContent('코드 심벌을 추가할 마디 또는 음표·쉼표 하나를 선택해 주세요.')
  expect(document.querySelector('.editor-status')).not.toHaveTextContent('총보 첫 보표')
  expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 })
})


describe('studio.individual-dynamic scope',()=>{
 registerAppTestHooks()
 it.each(['score','part'] as const)('selects and edits one effective dynamic in %s and copies its measure-scoped snapshot',async view=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture(),edited=structuredClone(source);edited.dynamics![0].value='mp'
  const expected=structuredClone(edited);expected.dynamics=[...expected.dynamics!.filter(mark=>mark.measureId!=='other-bar-2'),{id:'dynamic-expected-new',measureId:'other-bar-2',value:'p'}]
  if(process.env.DDIRORI_SINGLE_DYNAMIC_QA_DIR&&view==='score'){
   const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi'),dir=process.env.DDIRORI_SINGLE_DYNAMIC_QA_DIR
   mkdirSync(dir,{recursive:true});for(const [name,value]of Object.entries({source,edited,pasted:expected})){writeFileSync(join(dir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));writeFileSync(join(dir,name+'.musicxml'),serializeMusicXml(value));writeFileSync(join(dir,name+'.mid'),serializeMidi(value))}
   const empty=structuredClone(source);empty.title='Generated dynamic empty first voice';empty.parts[0].staves[0].measures[0].voices[0].events=[];empty.parts[0].staves[1].measures[3].voices[0].events=[];writeFileSync(join(dir,'empty-voice.chromatics'),encodeNativeProject(createNativeProject(empty)))
  }
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/dynamic.chromatics',fileName:'dynamic.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/dynamic.chromatics',fileName:'dynamic.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  if(view==='part'){chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[0].id)}
  const glyph=screen.getByRole('button',{name:'셈여림 p 속성 열기'});glyph.focus();fireEvent.click(glyph)
  expect(screen.getByRole('region',{name:'선택 요약'})).toHaveAttribute('data-selection-kind','dynamic')
  expect(screen.getByRole('combobox',{name:'선택 셈여림'})).not.toHaveFocus();expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true});expect(document.querySelector('.editor-status')).toHaveTextContent('마디 전체 셈여림을 교체')
  fireEvent.doubleClick(screen.getByRole('button',{name:'셈여림 p 속성 열기'}));const field=screen.getByRole('combobox',{name:'선택 셈여림'});expect(field).toHaveFocus();expect(field).toHaveAccessibleDescription(/마디 전체/)
  fireEvent.click(field);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'mp'}));expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  if(view==='part')chooseScoreView('파트보 선택',source.parts[1].id)
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));const paste=screen.getByRole('menuitem',{name:'복사한 셈여림으로 마디 설정'});expect(paste).toBeEnabled();fireEvent.click(paste)
  const actual=structuredClone(playbackMockState.lastScore!);expected.dynamics!.at(-1)!.id=actual.dynamics!.at(-1)!.id;expect(expected.dynamics!.at(-1)!.id).toMatch(/^dynamic-/);expect(actual).toEqual(expected);expect(actual.dynamics!.at(-1)).not.toHaveProperty('tick')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(actual)
  if(view==='part')chooseScoreView('파트보 선택',source.parts[0].id)
  fireEvent.click(screen.getByRole('button',{name:'셈여림 mp 속성 열기'}))
  if(view==='part'){
   fireEvent.doubleClick(screen.getByRole('button',{name:'셈여림 mp 속성 열기'}));const empty=screen.getByRole('combobox',{name:'선택 셈여림'});fireEvent.click(empty);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'없음'}))
   expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveFocus()
   // Returning to the first part selected its first measure; the surviving
   // imported duplicate becomes effective after removing only primary-first.
   expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveTextContent('ff')
  }
  else fireEvent.keyDown(window,{key:'Delete',code:'Delete'})
  const removed=structuredClone(actual);removed.dynamics=removed.dynamics!.filter(mark=>mark.id!=='primary-first');expect(playbackMockState.lastScore).toEqual(removed)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(actual);expect(screen.getByRole('button',{name:'셈여림 mp 속성 열기'})).toHaveAttribute('aria-pressed','true')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(actual)
 })
 it('keeps the copied dynamic value across source editing and a new document with matching IDs',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture(),destination=structuredClone(source);destination.title='Dynamic destination matching IDs';destination.dynamics![0].value='f'
  const edited=structuredClone(source);edited.dynamics![0].value='mp'
  const expected=structuredClone(destination);expected.dynamics=[...expected.dynamics!.filter(mark=>mark.measureId!=='other-bar-2'),{id:'dynamic-expected-new',measureId:'other-bar-2',value:'p'}]
  const fixtureDir=process.env.DDIRORI_DYNAMIC_DOCUMENT_QA_DIR
  if(fixtureDir){
   const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMusicXml}=await import('../../musicxml'),{serializeMidi}=await import('./midi/serialize-midi')
   mkdirSync(fixtureDir,{recursive:true});for(const [name,value]of Object.entries({source,edited,destination,pasted:expected})){writeFileSync(join(fixtureDir,name+'.chromatics'),encodeNativeProject(createNativeProject(value)));writeFileSync(join(fixtureDir,name+'.musicxml'),serializeMusicXml(value));writeFileSync(join(fixtureDir,name+'.mid'),serializeMidi(value))}
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(createNativeProject(source))}).mockResolvedValueOnce({filePath:'/scores/destination.chromatics',fileName:'destination.chromatics',contents:encodeNativeProject(createNativeProject(destination))})
  vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/scores/source.chromatics',fileName:'source.chromatics'}).mockResolvedValueOnce({filePath:'/scores/destination.chromatics',fileName:'destination.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  fireEvent.click(screen.getByRole('button',{name:'셈여림 p 속성 열기'}));fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
  fireEvent.doubleClick(screen.getByRole('button',{name:'셈여림 p 속성 열기'}));fireEvent.click(screen.getByRole('combobox',{name:'선택 셈여림'}));fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'mp'}));expect(playbackMockState.lastScore).toEqual(edited)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(destination.title);expect(playbackMockState.lastScore).toEqual(destination)
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'복사한 셈여림으로 마디 설정'}))
  const actual=structuredClone(playbackMockState.lastScore!);expected.dynamics!.at(-1)!.id=actual.dynamics!.at(-1)!.id;expect(expected.dynamics!.at(-1)!.id).toMatch(/^dynamic-/);expect(actual).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(destination);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(actual)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(2));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[1][0].contents).score).toEqual(actual)
 })
})

describe('studio.empty-xml-feedback',()=>{
 registerAppTestHooks()
 it.each(['save','copy','part-copy'] as const)('explains strict empty-measure %s rejection while preserving the dirty document',async channel=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture();source.parts[channel==='part-copy'?1:0].staves[0].measures[0].voices[0].events=[]
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/empty.chromatics',fileName:'empty.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.keyDown(window,{key:'d',code:'KeyD'});const edited=structuredClone(playbackMockState.lastScore!)
  expect(edited).not.toEqual(source)
  if(channel==='part-copy'){openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[1].id)}
  openStudioWorkspace(channel==='save'?'파일':'내보내기');const trigger=screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'});trigger.focus();fireEvent.click(trigger)
  await waitFor(()=>expect(trigger).toHaveFocus())
  expect(document.querySelector('.editor-status')).toHaveTextContent('빈 마디가 있어 MusicXML로 내보낼 수 없습니다.')
  expect(document.querySelector('.editor-status')).toHaveTextContent(`${channel==='part-copy'?'Violin':'Piano'} · 보표 1 · 1마디`)
  expect(document.querySelector('.editor-status')).not.toHaveTextContent(': empty')
  expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  const detail=screen.getByRole('group',{name:channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보'}),raw=within(detail).getByText(/리듬 정합성이 올바르지 않습니다: empty/)
  expect(raw).not.toBeVisible();fireEvent.click(within(detail).getByText('기술 정보'));expect(raw).toBeVisible();expect(raw).toHaveTextContent('parts[0].staves[0].measures[0]')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
 })
})

describe('studio.empty-xml-retry',()=>{
 registerAppTestHooks()
 it.each(['score','part'] as const)('synchronizes final-bar entry in %s view and exports the full score with one undo',async view=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture()
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/append.chromatics',fileName:'append.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  vi.mocked(window.inC.musicXml.save).mockResolvedValue({filePath:'/scores/append.musicxml',fileName:'append.musicxml'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  if(view==='part'){openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[0].id)}
  fireEvent.click(screen.getByRole('button',{name:'lower-bar-4-b 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'6',code:'Digit6'});fireEvent.keyDown(window,{key:'c',code:'KeyC'});fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
  const entered=structuredClone(playbackMockState.lastScore!)
  expect(entered.parts.flatMap(p=>p.staves.map(s=>s.measures.length))).toEqual([5,5,5])
  expect(entered.slurs).toEqual(source.slurs);expect(entered.hairpins).toEqual(source.hairpins)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(entered)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML로 저장'}));await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('append.musicxml'))
  expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1)
  expect(parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0][0].contents).parts.flatMap(p=>p.staves.map(s=>s.measures.length))).toEqual([5,5,5])
  expect(playbackMockState.lastScore).toEqual(entered);expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
 })
 it('fills empty bars through existing input and retries both exports without losing history',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {serializeMidi}=await import('./midi/serialize-midi')
  const {source}=measureDynamicsFixture(),bars=source.parts[0].staves[0].measures
  bars[0].voices[0].events=[];bars[1].voices[0].events=[]
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/retry.chromatics',fileName:'retry.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/retry-copy.musicxml',fileName:'retry-copy.musicxml'})
  vi.mocked(window.inC.musicXml.save).mockResolvedValue({filePath:'/scores/retry-saved.musicxml',fileName:'retry-saved.musicxml'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  const exportXml=(channel:'save'|'copy')=>{openStudioWorkspace(channel==='save'?'파일':'내보내기');fireEvent.click(screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'}))}
  exportXml('save');expect(document.querySelector('.editor-status')).toHaveTextContent('Piano · 보표 1 · 1마디');expect(window.inC.musicXml.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'7',code:'Digit7'});fireEvent.keyDown(window,{key:'c',code:'KeyC'});fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
  const firstFilled=structuredClone(playbackMockState.lastScore!);expect(firstFilled.parts[0].staves[0].measures[0].voices[0].events).toEqual([expect.objectContaining({type:'note',duration:{value:'whole',dots:0},position:{tick:0},pitch:expect.objectContaining({step:'C'})})])
  exportXml('copy');expect(document.querySelector('.editor-status')).toHaveTextContent('Piano · 보표 1 · 2마디');expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));fireEvent.keyDown(window,{key:'n',code:'KeyN'});fireEvent.keyDown(window,{key:'7',code:'Digit7'});fireEvent.keyDown(window,{key:'0',code:'Digit0'});fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
  const filled=structuredClone(playbackMockState.lastScore!);expect(filled.parts[0].staves[0].measures[1].voices[0].events).toEqual([expect.objectContaining({type:'rest',duration:{value:'whole',dots:0},position:{tick:0}})])
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(firstFilled)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(filled)
  exportXml('copy');await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1));expect(serializeMidi(parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents))).toEqual(serializeMidi(filled))
  await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('retry-copy.musicxml'))
  expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
  expect(screen.queryByRole('group',{name:'MusicXML 내보내기 기술 정보'})).not.toBeInTheDocument()
  exportXml('save');await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1));expect(serializeMidi(parseMusicXml(vi.mocked(window.inC.musicXml.save).mock.calls[0][0].contents))).toEqual(serializeMidi(filled))
  await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('retry-saved.musicxml'))
  expect(playbackMockState.lastScore).toEqual(filled)
  expect(screen.queryByRole('group',{name:'MusicXML 저장 기술 정보'})).not.toBeInTheDocument()
 })
})

describe('studio.empty-xml-export-scope',()=>{
 registerAppTestHooks()
 it('exports a valid selected part while another part stays empty and clears only current copy feedback',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture();source.parts[0].staves[0].measures[0].voices[0].events=[]
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/scoped-empty.chromatics',fileName:'scoped-empty.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  vi.mocked(window.inC.musicXml.exportCopy).mockResolvedValue({filePath:'/scores/violin.musicxml',fileName:'violin.musicxml'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  const copy=()=>{openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}))}
  copy();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled();expect(document.querySelector('.editor-status')).toHaveTextContent('Piano · 보표 1 · 1마디')
  expect(screen.getByRole('group',{name:'MusicXML 내보내기 기술 정보'})).toBeInTheDocument()
  openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',source.parts[1].id)
  copy();await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1))
  await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('violin.musicxml'))
  const projected=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
  expect(projected.parts.map(p=>p.name)).toEqual(['Violin'])
  await waitFor(()=>expect(screen.queryByRole('group',{name:'MusicXML 내보내기 기술 정보'})).not.toBeInTheDocument())
  expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
  openStudioWorkspace('악보');chooseScoreView('악보 보기','score');copy()
  expect(window.inC.musicXml.exportCopy).toHaveBeenCalledTimes(1);expect(document.querySelector('.editor-status')).toHaveTextContent('Piano · 보표 1 · 1마디')
  expect(playbackMockState.lastScore).toEqual(source)
 })
})

describe('studio.empty-voice-feedback',()=>{
 registerAppTestHooks()
 it.each(['save','copy','part-copy'] as const)('identifies the remaining empty voice for %s without writing or changing the document',async channel=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture(),part=source.parts[channel==='part-copy'?1:0]
  part.staves[0].measures[0].voices.push({id:'voice-2',events:[]})
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/empty-voice.chromatics',fileName:'empty-voice.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  if(channel==='part-copy'){openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',part.id)}
  openStudioWorkspace(channel==='save'?'파일':'내보내기');const trigger=screen.getByRole('button',{name:channel==='save'?'MusicXML로 저장':'MusicXML 내보내기'});trigger.focus();fireEvent.click(trigger);await waitFor(()=>expect(trigger).toHaveFocus())
  expect(document.querySelector('.editor-status')).toHaveTextContent('빈 성부가 있어 MusicXML로 내보낼 수 없습니다.')
  expect(document.querySelector('.editor-status')).toHaveTextContent(`${part.name} · 보표 1 · 1마디 · 2성부`)
  expect(document.querySelector('.editor-status')).not.toHaveTextContent(': gap')
  const detail=screen.getByRole('group',{name:channel==='save'?'MusicXML 저장 기술 정보':'MusicXML 내보내기 기술 정보'}),raw=within(detail).getByText(/리듬 정합성이 올바르지 않습니다: gap/)
  expect(raw).not.toBeVisible();fireEvent.click(within(detail).getByText('기술 정보'));expect(raw).toBeVisible();expect(raw).toHaveTextContent('voices[1] (voice-2)')
  expect(window.inC.musicXml.save).not.toHaveBeenCalled();expect(window.inC.musicXml.exportCopy).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
 })
})

describe('studio.stored-dynamic',()=>{
 registerAppTestHooks()
 it('selects a stored value explicitly, edits only its ID and pastes its copied snapshot with two exact undo steps',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
  const {source}=measureDynamicsFixture(),edited=structuredClone(source);edited.dynamics![1].value='f'
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/stored.chromatics',fileName:'stored.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/stored.chromatics',fileName:'stored.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}));openStudioWorkspace('음표')
  const picker=screen.getByRole('combobox',{name:'셈여림 대상'});expect(picker).toHaveTextContent('마디 전체 설정');picker.focus()
  fireEvent.click(picker);fireEvent.click(within(screen.getByRole('listbox',{name:'셈여림 대상'})).getByRole('option',{name:'2 · ff · 원본 보관'}))
  expect(screen.getByRole('combobox',{name:'셈여림 대상'})).toHaveFocus()
  const field=screen.getByRole('combobox',{name:'선택 셈여림'});expect(field).toHaveTextContent('ff');expect(field).toHaveAccessibleDescription(/표시·재생에 사용하지/)
  expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(screen.queryByRole('button',{name:'셈여림 ff 속성 열기'})).toBeNull()
  fireEvent.keyDown(field,{key:'c',code:'KeyC',ctrlKey:true});expect(document.querySelector('.editor-status')).not.toHaveTextContent('셈여림 1개를 복사')
  fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'선택 셈여림 복사'}));expect(document.querySelector('.editor-status')).toHaveTextContent('셈여림 1개를 복사')
  fireEvent.click(field);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'f'}))
  expect(playbackMockState.lastScore).toEqual(edited);expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(source));expect(screen.getByRole('button',{name:'셈여림 p 속성 열기'})).toBeInTheDocument();expect(document.querySelector('.editor-status')).toHaveTextContent('첫 번째 값은 유지')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:'복사한 셈여림으로 마디 설정'}))
  const actual=structuredClone(playbackMockState.lastScore!),expected=structuredClone(edited);expected.dynamics=[...edited.dynamics!.filter(m=>m.measureId!=='other-bar-2'),{id:actual.dynamics!.at(-1)!.id,measureId:'other-bar-2',value:'ff'}];expect(actual).toEqual(expected);expect(actual.dynamics!.at(-1)).not.toHaveProperty('tick');expect(actual.dynamics!.at(-1)).not.toHaveProperty('voiceId')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(actual)
 })
 it('deletes only a stored value, restores it by undo and isolates a later measure selection',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi')
  const {source}=measureDynamicsFixture();vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/stored.chromatics',fileName:'stored.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title);fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}));openStudioWorkspace('음표')
  fireEvent.click(screen.getByRole('combobox',{name:'셈여림 대상'}));fireEvent.click(within(screen.getByRole('listbox',{name:'셈여림 대상'})).getByRole('option',{name:'2 · ff · 원본 보관'}))
  const field=screen.getByRole('combobox',{name:'선택 셈여림'});field.focus();fireEvent.click(field);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'없음'}))
  const deleted=structuredClone(source);deleted.dynamics=deleted.dynamics!.filter(m=>m.id!=='primary-later');expect(playbackMockState.lastScore).toEqual(deleted);expect(serializeMidi(deleted)).toEqual(serializeMidi(source));expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveFocus()
  fireEvent.keyDown(screen.getByRole('combobox',{name:'선택 마디 셈여림'}),{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveTextContent('ff');await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('combobox',{name:'선택 셈여림'}),{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(deleted);await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('combobox',{name:'선택 마디 셈여림'}),{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveFocus())
  fireEvent.click(screen.getByRole('button',{name:'other-bar-2-b 선택'}));const next=screen.getByRole('combobox',{name:'선택 마디 셈여림'});expect(next).toHaveTextContent('mf');expect(screen.queryByRole('combobox',{name:'선택 셈여림'})).toBeNull()
  fireEvent.click(next);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 마디 셈여림'})).getByRole('option',{name:'mp'}));const expected=structuredClone(source);expected.dynamics!.find(m=>m.id==='other')!.value='mp';expect(playbackMockState.lastScore).toEqual(expected)
 })
})

describe('studio.stored-dynamic document isolation',()=>{
 registerAppTestHooks()
 it('clears the old stored target on native replacement with matching IDs and edits only the newly chosen value',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture(),next=structuredClone(source);next.title='Stored dynamics destination matching IDs';next.dynamics![1].value='pp'
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(createNativeProject(source))}).mockResolvedValueOnce({filePath:'/scores/next.chromatics',fileName:'next.chromatics',contents:encodeNativeProject(createNativeProject(next))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title);fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}));openStudioWorkspace('음표')
  const chooseStored=(value:string)=>{fireEvent.click(screen.getByRole('combobox',{name:'셈여림 대상'}));fireEvent.click(within(screen.getByRole('listbox',{name:'셈여림 대상'})).getByRole('option',{name:`2 · ${value} · 원본 보관`}))}
  chooseStored('ff');expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveTextContent('ff')
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(next.title);openStudioWorkspace('음표')
  expect(screen.queryByRole('combobox',{name:'선택 셈여림'})).toBeNull();expect(screen.getByRole('combobox',{name:'셈여림 대상'})).toHaveTextContent('마디 전체 설정');expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveTextContent('p')
  chooseStored('pp');const value=screen.getByRole('combobox',{name:'선택 셈여림'});expect(value).toHaveTextContent('pp');fireEvent.click(value);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'f'}))
  const edited=structuredClone(next);edited.dynamics![1].value='f';expect(playbackMockState.lastScore).toEqual(edited);expect(source.dynamics![1].value).toBe('ff')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(next);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(next)
 })
})

describe('studio.dynamic cross-measure history focus',()=>{
 registerAppTestHooks()
 it.each([false,true])('restores the explicitly used Inspector field across measures with repeated history %s',async repeated=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture')
  const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture()
  vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/history-focus.chromatics',fileName:'history-focus.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
  fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}))
  fireEvent.click(screen.getByRole('button',{name:'셈여림 mf 속성 열기'}))
  const selected=screen.getByRole('combobox',{name:'선택 셈여림'});selected.focus()
  fireEvent.click(selected);fireEvent.click(within(screen.getByRole('listbox',{name:'선택 셈여림'})).getByRole('option',{name:'없음'}))
  const deleted=structuredClone(source);deleted.dynamics=deleted.dynamics!.filter(mark=>mark.id!=='other')
  expect(playbackMockState.lastScore).toEqual(deleted)
  const returned=screen.getByRole('combobox',{name:'선택 마디 셈여림'});expect(returned).toHaveFocus()
  fireEvent.keyDown(returned,{key:'z',code:'KeyZ',ctrlKey:true})
  expect(playbackMockState.lastScore).toEqual(source)
  if(repeated)fireEvent.keyDown(document.body,{key:'z',code:'KeyZ',ctrlKey:true})
  await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveFocus())
  fireEvent.keyDown(screen.getByRole('combobox',{name:'선택 셈여림'}),{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true})
  expect(playbackMockState.lastScore).toEqual(deleted)
  await waitFor(()=>expect(screen.getByRole('combobox',{name:'선택 마디 셈여림'})).toHaveFocus())
 })
})

describe('studio.stored-dynamic whole-measure preservation',()=>{
 registerAppTestHooks()
 it('retains explicit whole-measure replacement and announces promotion only after deleting the effective object',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {measureDynamicsFixture}=await import('../../testing/measure-dynamics-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
  const {source}=measureDynamicsFixture();vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/source.chromatics',fileName:'source.chromatics',contents:encodeNativeProject(createNativeProject(source))})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title);fireEvent.click(screen.getByRole('button',{name:'primary-bar-1-a 선택'}));openStudioWorkspace('음표')
  const choose=(label:string,text:string)=>{fireEvent.click(screen.getByRole('combobox',{name:label}));fireEvent.click(within(screen.getByRole('listbox',{name:label})).getByRole('option',{name:text}))}
  choose('셈여림 대상','2 · ff · 원본 보관');choose('셈여림 대상','마디 전체 설정');expect(screen.queryByRole('combobox',{name:'선택 셈여림'})).toBeNull()
  choose('선택 마디 셈여림','mf');const replaced=structuredClone(source);replaced.dynamics=[...source.dynamics!.filter(m=>m.measureId!=='primary-bar-1'),{id:'primary-first',measureId:'primary-bar-1',value:'mf'}];expect(playbackMockState.lastScore).toEqual(replaced)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  choose('셈여림 대상','1 · p · 표시·재생');choose('선택 셈여림','없음');const promoted=structuredClone(source);promoted.dynamics=promoted.dynamics!.filter(m=>m.id!=='primary-first');expect(playbackMockState.lastScore).toEqual(promoted);expect(document.querySelector('.editor-status')).toHaveTextContent('다음 셈여림(ff)을 표시·재생')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
 })
})


describe('studio.sound-dynamics-import-warning',()=>{
 registerAppTestHooks()
 it('explains omitted explicit playback dynamics in Korean while preserving diagnostics and the imported model',async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {createSoundDynamicsFixture}=await import('../../testing/sound-dynamics-fixture'),{parseMusicXml}=await import('../../musicxml/parse'),{decodeNativeProject}=await import('../../project/schema')
  const {title,xml}=createSoundDynamicsFixture('symbolic'),baseline=parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/sound-dynamics.musicxml',fileName:'sound-dynamics.musicxml',contents:xml})
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/sound-dynamics.chromatics',fileName:'sound-dynamics.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(title)
  const report=within(screen.getByRole('region',{name:'MusicXML 경고 상세'}));expect(report.getByText(/별도로 지정된 재생 세기는 가져오지 못했습니다/)).toBeVisible()
  const raw=report.getByText(/Explicit sound dynamics/);expect(raw).not.toBeVisible();fireEvent.click(report.getByText('기술 정보'));expect(raw).toBeVisible();expect(report.getByText('part[1].measure[1].direction[1].sound.dynamics')).toBeVisible()
  fireEvent.keyDown(report.getByText('기술 정보'),{key:' ',code:'Space'});fireEvent.keyDown(report.getByText('기술 정보'),{key:'Enter',code:'Enter'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(baseline)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(baseline)
 })
})


describe('studio.note-velocity-import-warning',()=>{
 registerAppTestHooks()
 it.each(['chord-member','secondary']as const)('explains per-note playback loss in %s without changing the imported score',async kind=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {createNoteVelocityFixture}=await import('../../testing/note-velocity-fixture'),{parseMusicXml}=await import('../../musicxml/parse'),{decodeNativeProject}=await import('../../project/schema')
  const {title,xml}=createNoteVelocityFixture(kind),baseline=parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/note-velocity.musicxml',fileName:'note-velocity.musicxml',contents:xml});vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/note-velocity.chromatics',fileName:'note-velocity.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(title)
  const report=within(screen.getByRole('region',{name:'MusicXML 경고 상세'})),human=report.getByText(/음표별로 지정된 재생 시작 세기는 가져오지 못했습니다/)
  expect(human).toBeVisible();expect(human).toHaveTextContent(kind==='secondary'?'2번째 파트 · 1마디':'1번째 파트 · 1마디')
  const raw=report.getByText(/Explicit note dynamics/);expect(raw).not.toBeVisible();fireEvent.click(report.getByText('기술 정보'));expect(raw).toBeVisible();expect(report.getByText(kind==='secondary'?'part[2].measure[1].note[1].dynamics':'part[1].measure[1].note[2].dynamics')).toBeVisible()
  fireEvent.keyDown(report.getByText('기술 정보'),{key:' ',code:'Space'});fireEvent.keyDown(report.getByText('기술 정보'),{key:'Enter',code:'Enter'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(baseline)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(baseline)
 })
})


describe('studio.playback-warning-status-summary',()=>{
 registerAppTestHooks()
 it.each(['note','sound','mixed']as const)('keeps complete warning details while summarizing only known playback loss for %s',async kind=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {createNoteVelocityFixture}=await import('../../testing/note-velocity-fixture'),{createSoundDynamicsFixture}=await import('../../testing/sound-dynamics-fixture'),{parseMusicXml}=await import('../../musicxml/parse')
  const fixture=kind==='sound'?createSoundDynamicsFixture('symbolic'):createNoteVelocityFixture('both')
  const xml=kind==='mixed'?fixture.xml.replace('</note>','<notations><technical><fingering>1</fingering></technical></notations></note>'):fixture.xml,baseline=parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/playback-loss.musicxml',fileName:'playback-loss.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(fixture.title)
  const panel=within(screen.getByRole('region',{name:'MusicXML 경고 상세'})),status=document.querySelector('.studio-status__result')!
  expect(status).toHaveTextContent('playback-loss.musicxml');expect(status).toHaveTextContent(`MusicXML 경고 ${kind==='mixed'?3:kind==='sound'?1:2}개`)
  if(kind==='mixed'){
   expect(status).toHaveTextContent('음표별로 지정된 재생 시작 세기는 가져오지 못했습니다.');expect(status).not.toHaveTextContent('경고 상세에서 보존되지 않은 재생 세기를 확인해 주세요.');expect(panel.getByText(/연주 기법 표기를 가져오지 못했습니다/)).toBeVisible()
  }else{
   expect(status).toHaveTextContent('경고 상세에서 보존되지 않은 재생 세기를 확인해 주세요.');expect(status).not.toHaveTextContent('원본 MusicXML을 보관하고')
  }
  expect(panel.getByText(kind==='sound'?/별도로 지정된 재생 세기는 가져오지 못했습니다/:/음표별로 지정된 재생 시작 세기는 가져오지 못했습니다/)).toBeVisible();expect(playbackMockState.lastScore).toEqual(baseline);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  if(process.env.DDIRORI_PLAYBACK_WARNING_SUMMARY_QA_DIR){
   const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{parseMusicXmlWithReport}=await import('../../musicxml/parse'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi');const dir=join(process.env.DDIRORI_PLAYBACK_WARNING_SUMMARY_QA_DIR,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.musicxml'),xml);writeFileSync(join(dir,'expected.chromatics'),encodeNativeProject(createNativeProject(baseline)));writeFileSync(join(dir,'expected.mid'),serializeMidi(baseline));writeFileSync(join(dir,'warnings.json'),JSON.stringify(parseMusicXmlWithReport(xml).report,null,2))
  }

 })
})


describe('studio.warning-part-ownership',()=>{
 registerAppTestHooks()
 it.each(['technical','direction']as const)('keeps both parts actionable for matching %s losses',async kind=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {createWarningPartOwnershipFixture}=await import('../../testing/warning-part-ownership-fixture'),{parseMusicXml}=await import('../../musicxml/parse'),{decodeNativeProject}=await import('../../project/schema')
  const {title,xml}=createWarningPartOwnershipFixture(kind),baseline=parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({filePath:'/scores/warning-parts.musicxml',fileName:'warning-parts.musicxml',contents:xml});vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/scores/warning-parts.chromatics',fileName:'warning-parts.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await screen.findByText(title)
  const panel=within(screen.getByRole('region',{name:'MusicXML 경고 상세'}));expect(panel.getByText('MusicXML 가져오기 경고 2개')).toBeVisible()
  const disclosure=panel.queryByRole('button',{name:'마디별 경고 상세 2개'});if(disclosure)fireEvent.click(disclosure)
  const items=panel.getAllByRole('listitem');expect(items).toHaveLength(2)
  for(const[index,item]of items.entries()){
   expect(item).toHaveTextContent(`${index+1}번째 파트 · 1마디`);const local=within(item);fireEvent.click(local.getByText('기술 정보'));expect(local.getByText(kind==='technical'?`part[${index+1}].measure[1].note[1].notations.technical`:`part[${index+1}].measure[1].direction[1].direction-type[1].coda`)).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(baseline);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce());expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(baseline)
 })
})

describe('studio.technical-warning-status-summary', () => {
 registerAppTestHooks()
 it.each(['technical', 'single', 'both'] as const)('keeps complete per-part details and summarizes only known technical losses for %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { createWarningPartOwnershipFixture } = await import('../../testing/warning-part-ownership-fixture')
  const { parseMusicXml } = await import('../../musicxml/parse')
  const { title, xml } = createWarningPartOwnershipFixture(kind)
  const baseline = parseMusicXml(xml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({ filePath: '/scores/technical-loss.musicxml', fileName: 'technical-loss.musicxml', contents: xml })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await screen.findByText(title)
  const panel = within(screen.getByRole('region', { name: 'MusicXML 경고 상세' }))
  const status = document.querySelector('.studio-status__result')!
  const count = kind === 'single' ? 1 : kind === 'both' ? 4 : 2
  expect(status).toHaveTextContent('technical-loss.musicxml')
  expect(status).toHaveTextContent(`MusicXML 경고 ${count}개`)
  if (kind === 'both') {
   expect(status).toHaveTextContent('일부 지시 기호를 가져오지 못했습니다.')
   expect(status).not.toHaveTextContent('경고 상세에서 보존되지 않은 연주 기법 표기를 확인해 주세요.')
  } else {
   expect(status).toHaveTextContent('경고 상세에서 보존되지 않은 연주 기법 표기를 확인해 주세요.')
   expect(status).not.toHaveTextContent('원본 악보와 비교해 주세요.')
  }
  const disclosure = panel.queryByRole('button', { name: `마디별 경고 상세 ${count}개` })
  if (disclosure) fireEvent.click(disclosure)
  const items = panel.getAllByRole('listitem')
  expect(items).toHaveLength(count)
  for (const item of items.filter(item => item.textContent?.includes('연주 기법 표기를 가져오지 못했습니다.'))) {
   expect(within(item).getByText(/원본 악보와 비교해 주세요/)).toBeVisible()
   fireEvent.click(within(item).getByText('기술 정보'))
   expect(within(item).getByText('technical playing instructions are not imported yet.')).toBeVisible()
  }
  expect(playbackMockState.lastScore).toEqual(baseline)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 })
})

describe('studio.midi-program-import-warning', () => {
 registerAppTestHooks()
 it.each(['initial', 'secondary', 'reordered', 'direction'] as const)('explains omitted MIDI programs at the correct source owner for %s', async kind => {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const { createMidiProgramFixture } = await import('../../testing/midi-program-fixture')
  const { parseMusicXml } = await import('../../musicxml/parse')
  const { decodeNativeProject } = await import('../../project/schema')
  const { title, xml, baselineXml } = createMidiProgramFixture(kind)
  const baseline = parseMusicXml(baselineXml)
  vi.mocked(window.inC.musicXml.open).mockResolvedValue({ filePath: '/scores/midi-program.musicxml', fileName: 'midi-program.musicxml', contents: xml })
  vi.mocked(window.inC.project.save).mockResolvedValue({ filePath: '/scores/midi-program.chromatics', fileName: 'midi-program.chromatics' })
  const { App } = await import('./App')
  render(<App />)
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: 'MusicXML 가져오기' }))
  await screen.findByText(title)
  const panel = within(screen.getByRole('region', { name: 'MusicXML 경고 상세' }))
  const human = panel.getByText(/MIDI 악기 프로그램은 별도로 보존하지 않습니다/)
  const owner = kind === 'secondary' || kind === 'direction' ? 2 : 1
  expect(human).toBeVisible()
  expect(human).toHaveTextContent(`${owner}번째 파트 · ${kind === 'direction' ? '2마디 · ' : ''}MusicXML`)
  if (kind !== 'direction') expect(human).not.toHaveTextContent('1마디')
  expect(human).toHaveTextContent('MIDI 사본의 악기는 파트 이름으로 정합니다.')
  const raw = panel.getByText(/Explicit MIDI instrument program/)
  expect(raw).not.toBeVisible()
  fireEvent.click(panel.getByText('기술 정보'))
  expect(raw).toBeVisible()
  const path = kind === 'direction' ? 'part[2].measure[2].direction[1].sound.midi-instrument[1].midi-program'
   : `part-list.score-part[${kind === 'initial' ? 1 : 2}].midi-instrument[1].midi-program`
  expect(panel.getByText(path)).toBeVisible()
  fireEvent.keyDown(panel.getByText('기술 정보'), { key: ' ', code: 'Space' })
  fireEvent.keyDown(panel.getByText('기술 정보'), { key: 'Enter', code: 'Enter' })
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(baseline)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
  await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(baseline)
 })
})
