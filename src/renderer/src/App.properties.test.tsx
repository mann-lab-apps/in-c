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

  it('studio.repeat-tools isolates composed and cancelled count drafts from a newly selected measure', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('repeat')
    const source=structuredClone(playbackMockState.lastScore),count=screen.getByRole('spinbutton',{name:'반복 횟수'})
    act(()=>count.focus());fireEvent.compositionStart(count);fireEvent.change(count,{target:{value:'7'}})
    fireEvent.keyDown(count,{key:'Enter',keyCode:229,isComposing:true});act(()=>count.blur());fireEvent.compositionEnd(count)
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openNotationSettings('repeat');fireEvent.blur(count)
    expect(screen.getByRole('spinbutton',{name:'반복 횟수'})).toHaveValue(2);expect(playbackMockState.lastScore).toEqual(source)
    const next=screen.getByRole('spinbutton',{name:'반복 횟수'});act(()=>next.focus());fireEvent.change(next,{target:{value:''}});act(()=>next.blur())
    expect(next).toHaveValue(2);expect(playbackMockState.lastScore).toEqual(source)
    act(()=>next.focus());fireEvent.change(next,{target:{value:'12'}});fireEvent.keyDown(next,{key:'Enter'})
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[1]!.repeat).toMatchObject({end:true,times:8})
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[0]).toEqual(source!.parts[0]!.staves[0]!.measures[0])
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.repeat-tools retains measure-only repeat editing and event-anchored volta availability', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));openNotationSettings('repeat')
    const tools=screen.getByRole('region',{name:'반복과 볼타'}),source=structuredClone(playbackMockState.lastScore)
    expect(within(tools).getByRole('button',{name:'도돌이표 시작'})).toBeDisabled()
    expect(within(tools).getByRole('spinbutton',{name:'반복 횟수'})).toBeDisabled()
    expect(within(tools).getByRole('button',{name:'1번 볼타'})).toBeEnabled()
    fireEvent.click(within(tools).getByRole('button',{name:'1번 볼타'}))
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures[0]!.volta?.number).toBe(1)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.repeat-tools discards a composed draft when a pending native open replaces the document at the same measure ID', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let resolveOpen!: (value: Awaited<ReturnType<typeof window.inC.project.open>>) => void
    vi.mocked(window.inC.project.open).mockImplementationOnce(()=>new Promise(resolve=>{resolveOpen=resolve}))
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('repeat')
    const field=screen.getByRole('spinbutton',{name:'반복 횟수'})
    act(()=>field.focus());fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'7'}});act(()=>field.blur());fireEvent.compositionEnd(field)
    const replacement={...source,title:'repeat-replacement'}
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    await act(async()=>resolveOpen({filePath:'/scores/repeat-replacement.chromatics',fileName:'repeat-replacement.chromatics',contents:encodeNativeProject(createNativeProject(replacement))}))
    await screen.findByText('repeat-replacement')
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('repeat')
    expect(screen.getByRole('spinbutton',{name:'반복 횟수'})).toHaveValue(2)
    fireEvent.blur(field);expect(playbackMockState.lastScore).toEqual(replacement)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.range-tools keeps existing range selection slur octave and hairpin commands with exact undo', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />);openNotationSettings('range')
    const tools=screen.getByRole('region',{name:'범위 기호'})
    expect(within(tools).getByRole('button',{name:'크레셴도 헤어핀'})).toHaveClass('dd-button')
    expect(tools.closest('.studio-chrome')).toBeNull()
    const source=structuredClone(playbackMockState.lastScore)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}),{shiftKey:true})
    fireEvent.click(within(tools).getByRole('button',{name:'디미누엔도 헤어핀'}))
    expect(playbackMockState.lastScore!.hairpins!.find(span=>span.id==='release-hairpin')!.type).toBe('diminuendo')
    expect(playbackMockState.lastScore!.parts).toEqual(source!.parts)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(within(tools).getByRole('button',{name:'8va'}))
    expect(playbackMockState.lastScore!.octaveShifts).toHaveLength(1)
    expect(playbackMockState.lastScore!.octaveShifts![0]).toMatchObject({type:'8va',startEventId:'m1-c4',endEventId:'m1-f-sharp-4'})
    expect(playbackMockState.lastScore!.parts).toEqual(source!.parts)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(within(tools).getByRole('button',{name:/슬러 추가/}))
    expect(playbackMockState.lastScore!.slurs!.some(span=>span.id==='release-slur')).toBe(false)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}))
    for(const button of within(tools).getAllByRole('button'))expect(button).toBeDisabled()
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each(['percussion','tab'] as const)('studio.part-setup represents current %s honestly and allows explicit supported conversion with undo', async sign => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { createMidiWarningScore } = await import('../../testing/midi-warning-fixture')
    const { createNativeProject, encodeNativeProject } = await import('../../project/schema')
    const source=createMidiWarningScore(sign)
    vi.mocked(window.inC.project.open).mockResolvedValue({fileName:'unsupported.chromatics',filePath:'/scores/unsupported.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const { App } = await import('./App');render(<App />);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
    await screen.findByText(source.title)
    fireEvent.click(screen.getByRole('button',{name:'mixed-note-1 선택'}));openStudioWorkspace('악보')
    const field=screen.getByRole('combobox',{name:'현재 보표 음자리표'}),label=sign==='tab'?'TAB 표기 (현재)':'타악기 표기 (현재)'
    expect(field).toHaveTextContent(label)
    fireEvent.click(field);expect(within(screen.getByRole('listbox',{name:'현재 보표 음자리표'})).getByRole('option',{name:label})).toHaveAttribute('aria-disabled','true')
    fireEvent.click(within(screen.getByRole('listbox',{name:'현재 보표 음자리표'})).getByRole('option',{name:'높은음자리표'}))
    expect(playbackMockState.lastScore!.parts[1]!.staves[0]!.measures.every(measure=>measure.clef.sign==='G'&&measure.clef.line===2)).toBe(true)
    expect(playbackMockState.lastScore!.parts[1]!.staves[0]!.measures.map(measure=>measure.voices)).toEqual(source.parts[1]!.staves[0]!.measures.map(measure=>measure.voices))
    expect(playbackMockState.lastScore!.parts[0]).toEqual(source.parts[0])
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(field,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(field).toHaveTextContent(label)
  })

  it('studio.part-setup separates next instrument from whole staff clef and whole part transposition commands', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App');render(<App />);openStudioWorkspace('악보')
    const source=structuredClone(playbackMockState.lastScore)
    const clef=screen.getByRole('combobox',{name:'현재 보표 음자리표'})
    expect(clef).toHaveClass('dd-select');expect(clef.closest('.studio-chrome')).toBeNull()
    fireEvent.keyDown(clef,{key:'Enter'});fireEvent.keyDown(clef,{key:'ArrowDown'});fireEvent.keyDown(clef,{key:'Escape'})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('combobox',{name:'추가할 악기'}));fireEvent.click(within(screen.getByRole('listbox',{name:'추가할 악기'})).getByRole('option',{name:'첼로'}))
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'파트 추가'}));expect(playbackMockState.lastScore!.parts[1]!.id).toBe('cello')
    expect(playbackMockState.lastScore!.parts[1]!.staves[0]!.measures[0]!.clef).toEqual({sign:'F',line:4})
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    openStudioWorkspace('악보');fireEvent.click(clef);fireEvent.click(within(screen.getByRole('listbox',{name:'현재 보표 음자리표'})).getByRole('option',{name:'가온음자리표'}))
    expect(playbackMockState.lastScore!.parts[0]!.staves[0]!.measures.every(measure=>measure.clef.sign==='C'&&measure.clef.line===3)).toBe(true)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(clef,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('combobox',{name:'현재 파트 이조'}));fireEvent.click(within(screen.getByRole('listbox',{name:'현재 파트 이조'})).getByRole('option',{name:'B♭ (장2도 아래)'}))
    const measures=playbackMockState.lastScore!.parts[0]!.staves[0]!.measures
    expect(measures.every(measure=>measure.transposition?.diatonic===-1&&measure.transposition?.chromatic===-2)).toBe(true)
    expect(measures.map(measure=>measure.voices)).toEqual(source!.parts[0]!.staves[0]!.measures.map(measure=>measure.voices))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(screen.getByRole('combobox',{name:'현재 파트 이조'}),{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.score-view uses public view selectors without changing score or history', async () => {
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:/새 악보 만들기/}))
    const wizard=screen.getByRole('dialog',{name:'새 악보 만들기'})
    chooseNewScoreTemplate('duet')
    fireEvent.click(within(wizard).getByRole('button',{name:'만들기'}));openStudioWorkspace('악보')
    const source=structuredClone(playbackMockState.lastScore)
    const mode=screen.getByRole('combobox',{name:'악보 보기'})
    expect(mode).toHaveClass('dd-select');expect(mode.closest('.studio-chrome')).toBeNull()
    expect(screen.getByRole('combobox',{name:'파트보 선택'})).toBeDisabled()
    fireEvent.keyDown(mode,{key:'Enter'});fireEvent.keyDown(mode,{key:'ArrowDown'});fireEvent.keyDown(mode,{key:'Escape'})
    expect(mode).toHaveTextContent('총보');expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(mode);fireEvent.click(within(screen.getByRole('listbox',{name:'악보 보기'})).getByRole('option',{name:'파트보'}))
    const part=screen.getByRole('combobox',{name:'파트보 선택'});expect(part).toBeEnabled()
    fireEvent.click(part);fireEvent.click(within(screen.getByRole('listbox',{name:'파트보 선택'})).getByRole('option',{name:'Part 2'}))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure','part-2:Part 2:1')
    expectStaffTarget('part-2:staff-1')
    openStudioWorkspace('악보');fireEvent.click(mode);fireEvent.click(within(screen.getByRole('listbox',{name:'악보 보기'})).getByRole('option',{name:'총보'}))
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-part-structure','part-1:Part 1:1|part-2:Part 2:1')
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.structure-actions keeps part staff enablement ordering and exact undo through shared commands', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App');render(<App />);openStudioWorkspace('악보')
    const source=structuredClone(playbackMockState.lastScore)
    const button=(name:string)=>screen.getByRole('button',{name})
    expect(button('파트 추가')).toHaveClass('dd-button')
    expect(button('파트 추가').closest('.studio-chrome')).toBeNull()
    for(const name of ['파트 위로 이동','파트 아래로 이동','파트 삭제','보표 삭제'])expect(button(name)).toBeDisabled()
    fireEvent.click(button('파트 삭제'));expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(button('파트 추가'));const added=structuredClone(playbackMockState.lastScore)
    expect(added!.parts.map(part=>part.id)).toEqual(['piano','violin'])
    expect(added!.parts[0]).toEqual(source!.parts[0])
    openStudioWorkspace('악보');expect(button('파트 위로 이동')).toBeEnabled();expect(button('파트 아래로 이동')).toBeDisabled()
    fireEvent.click(button('파트 위로 이동'))
    expect(playbackMockState.lastScore!.parts.map(part=>part.id)).toEqual(['violin','piano'])
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(added)
    openStudioWorkspace('악보');fireEvent.click(button('보표 추가'))
    expect(playbackMockState.lastScore!.parts[1]!.staves).toHaveLength(2)
    expect(playbackMockState.lastScore!.parts[0]).toEqual(source!.parts[0])
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(added)
    openStudioWorkspace('악보');fireEvent.click(button('보표 추가'));openStudioWorkspace('악보');fireEvent.click(button('보표 삭제'))
    expect(playbackMockState.lastScore).toEqual(added)
    openStudioWorkspace('악보');fireEvent.click(button('파트 삭제'));expect(playbackMockState.lastScore!.parts).toEqual(source!.parts)
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(added)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.part-labels preserves cancellation single commit composition and part-owned drafts', async () => {
    const { App } = await import('./App');render(<App />)
    fireEvent.click(screen.getByRole('button',{name:/새 악보 만들기/}))
    const wizard=screen.getByRole('dialog',{name:'새 악보 만들기'})
    chooseNewScoreTemplate('duet')
    fireEvent.click(within(wizard).getByRole('button',{name:'만들기'}))
    openStudioWorkspace('악보')
    const source=structuredClone(playbackMockState.lastScore)
    const name=()=>screen.getByRole('textbox',{name:'현재 파트 이름'})
    name().focus();fireEvent.change(name(),{target:{value:'취소할 이름'}});fireEvent.keyDown(name(),{key:'Escape'});fireEvent.blur(name())
    expect(name()).toHaveValue(source!.parts[0]!.name)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(name().closest('.dd-field')).not.toBeNull()
    expect(name().closest('.studio-chrome')).toBeNull()
    name().focus();fireEvent.change(name(),{target:{value:'  Lead  '}});fireEvent.keyDown(name(),{key:'Enter'});fireEvent.blur(name())
    expect(playbackMockState.lastScore!.parts[0]!.name).toBe('Lead')
    expect(playbackMockState.lastScore!.parts[1]).toEqual(source!.parts[1])
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    const abbr=screen.getByRole('textbox',{name:'현재 파트 약어'})
    abbr.focus();fireEvent.change(abbr,{target:{value:'Ld.'}});fireEvent.keyDown(abbr,{key:'Enter'});fireEvent.blur(abbr)
    expect(playbackMockState.lastScore!.parts[0]!.abbreviation).toBe('Ld.')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    name().focus();fireEvent.change(name(),{target:{value:'조합 중'}});fireEvent.compositionStart(name());fireEvent.keyDown(name(),{key:'Enter',keyCode:229,isComposing:true});act(()=>name().blur())
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.compositionEnd(name());const stale=name()
    chooseStaffTarget('part-2:staff-1');openStudioWorkspace('악보');fireEvent.blur(stale)
    expect(name()).toHaveValue(source!.parts[1]!.name)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.tempo-event isolates draft cancellation composition and stale selection while committing once', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('악보')
    const field=()=>screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    field().focus();fireEvent.change(field(),{target:{value:'97'}});fireEvent.keyDown(field(),{key:'Escape'})
    expect(field()).toHaveValue(null)
    expect(field().closest('.dd-field')).not.toBeNull()
    fireEvent.blur(field());expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    field().focus();fireEvent.change(field(),{target:{value:'96'}});fireEvent.keyDown(field(),{key:'Enter'});fireEvent.blur(field())
    expect(playbackMockState.lastScore!.tempoEvents?.[0]?.bpm).toBe(96)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    field().focus();fireEvent.change(field(),{target:{value:'0'}});fireEvent.keyDown(field(),{key:'Enter'});fireEvent.blur(field())
    expect(playbackMockState.lastScore!.tempoEvents?.[0]?.bpm).toBe(40)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    field().focus();fireEvent.change(field(),{target:{value:'110'}});fireEvent.compositionStart(field());fireEvent.keyDown(field(),{key:'Enter',isComposing:true,keyCode:229});fireEvent.blur(field())
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.compositionEnd(field());const stale=field()
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));fireEvent.blur(stale)
    expect(field()).toHaveValue(null);expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.tempo-tools preserves global tempo commands and local keyboard ownership through shared controls', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('악보')
    const tools=screen.getByRole('region',{name:'빠르기'})
    expect(tools.closest('.studio-chrome')).toBeNull()
    const bpm=within(tools).getByRole('slider',{name:/^빠르기/})
    const beat=within(tools).getByRole('combobox',{name:'빠르기 기준 음가'})
    expect(beat).toHaveClass('dd-select')
    expect(bpm).toHaveAttribute('min','40');expect(bpm).toHaveAttribute('max','240')
    fireEvent.keyDown(bpm,{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.change(bpm,{target:{value:'90'}})
    expect(within(tools).getByLabelText('빠르기말')).toHaveTextContent('♩ = 90')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(beat,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(beat);fireEvent.click(screen.getByRole('option',{name:'8분음표'}))
    expect(within(tools).getByLabelText('빠르기말')).toHaveTextContent('♪ = 75')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(beat,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    const visible=within(tools).getByRole('checkbox',{name:'악보에 빠르기말 표기'})
    fireEvent.click(visible);expect(visible).not.toBeChecked()
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(beat,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  async function openImplicitTempo(kind:import('../../testing/implicit-tempo-unit-fixture').ImplicitTempoUnitCase){
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createImplicitTempoUnitFixture}=await import('../../testing/implicit-tempo-unit-fixture'),{createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const source=createImplicitTempoUnitFixture(kind)
    if(process.env.DDIRORI_IMPLICIT_TEMPO_OUT){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{serializeMidi}=await import('./midi/serialize-midi'),dir=join(process.env.DDIRORI_IMPLICIT_TEMPO_OUT,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'source.chromatics'),encodeNativeProject(createNativeProject(source)));writeFileSync(join(dir,'source.mid'),serializeMidi(source))}
    vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/implicit.chromatics',fileName:'implicit.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
    const measures=source.parts[0].staves[0].measures
    const select=(index:number)=>{fireEvent.click(screen.getByRole('button',{name:`${measures[index].voices[0].events[0].id} 선택`}));openStudioWorkspace('악보')}
    select(0)
    return{source,select,tools:()=>screen.getByRole('region',{name:'빠르기'})}
  }

  it.each(['missing','global-implicit','global-half']as const)('studio.implicit-tempo-unit keeps global unit stable across selected meters: %s',async kind=>{
    const {source,select,tools}=await openImplicitTempo(kind)
    expect(within(tools()).getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent(kind==='global-half'?/^2분음표$/:/^4분음표$/)
    select(1)
    expect(within(tools()).getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent(kind==='global-half'?/^2분음표$/:/^4분음표$/)
    expect(within(tools()).getByLabelText('빠르기말')).toHaveTextContent(`${kind==='global-half'?'𝅗𝅥':'♩'} = ${source.tempo?.bpm??120}`)
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['missing','global-implicit','global-half']as const)('studio.implicit-tempo-unit preserves quarter rate when editing the global BPM: %s',async kind=>{
    const {source,select,tools}=await openImplicitTempo(kind);select(1)
    const bpm=(source.tempo?.bpm??120)+1
    fireEvent.change(within(tools()).getByRole('slider',{name:/^빠르기/}),{target:{value:String(bpm)}})
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempo).toMatchObject({bpm,beatUnit:kind==='global-half'?'half':'quarter',dots:0});expect({...edited,tempo:source.tempo}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    if(process.env.DDIRORI_IMPLICIT_TEMPO_OUT){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi'),dir=join(process.env.DDIRORI_IMPLICIT_TEMPO_OUT,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'edited.mid'),serializeMidi(edited))}
  })

  it.each((['point-implicit','point-half']as const).flatMap(kind=>(['display','edit']as const).map(action=>({kind,action}))))('studio.implicit-tempo-unit retains a legacy point unit in compound meter: $kind/$action',async({kind,action})=>{
    const {source,select}=await openImplicitTempo(kind);select(1)
    fireEvent.click(screen.getByRole('combobox',{name:'편집할 빠르기 위치'}));fireEvent.click(screen.getByRole('option',{name:new RegExp(`2마디.*2박.*${kind==='point-half'?'2':'4'}분음표.*60 BPM`)}))
    const field=screen.getByRole('spinbutton',{name:'위치별 빠르기 BPM'})
    if(action==='display'){expect(field).toHaveAttribute('aria-description',expect.stringContaining(`BPM 기준: ${kind==='point-half'?'2':'4'}분음표`));expect(playbackMockState.lastScore).toEqual(source);return}
    act(()=>field.focus());fireEvent.change(field,{target:{value:'88'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempoEvents).toEqual([{...source.tempoEvents![0],bpm:88,beatUnit:kind==='point-half'?'half':'quarter',dots:0}]);expect({...edited,tempoEvents:source.tempoEvents}).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    if(process.env.DDIRORI_IMPLICIT_TEMPO_OUT){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),{serializeMidi}=await import('./midi/serialize-midi'),dir=join(process.env.DDIRORI_IMPLICIT_TEMPO_OUT,kind);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'edited.mid'),serializeMidi(edited))}
  })

  it('studio.implicit-tempo-unit reflects absent print markup and enables it without changing playback',async()=>{
    const {source,select,tools}=await openImplicitTempo('missing');select(1)
    const visible=within(tools()).getByRole('checkbox',{name:'악보에 빠르기말 표기'});expect(visible).not.toBeChecked();expect(source.tempo).toBeUndefined()
    fireEvent.click(visible);expect(visible).toBeChecked()
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempo).toMatchObject({bpm:120,beatUnit:'quarter',dots:0,transparent:false});expect({...edited,tempo:undefined}).toEqual(source)
    const {serializeMidi}=await import('./midi/serialize-midi');expect(serializeMidi(edited)).toEqual(serializeMidi(source));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    if(process.env.DDIRORI_IMPLICIT_TEMPO_OUT){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),dir=join(process.env.DDIRORI_IMPLICIT_TEMPO_OUT,'missing');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'visible.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'visible.mid'),serializeMidi(edited))}
  })

  it('studio.implicit-tempo-unit preserves an explicit dotted global rate and custom words',async()=>{
    const {source,select,tools}=await openImplicitTempo('explicit-dotted');select(1)
    expect(within(tools()).getByRole('combobox',{name:'빠르기 기준 음가'})).toHaveTextContent(/^점4분음표$/)
    const visible=within(tools()).getByRole('checkbox',{name:'악보에 빠르기말 표기'});expect(visible).toBeChecked()
    fireEvent.change(within(tools()).getByRole('slider',{name:/^빠르기/}),{target:{value:'97'}})
    const edited=structuredClone(playbackMockState.lastScore!);expect(edited.tempo).toEqual({...source.tempo,bpm:97});expect({...edited,tempo:source.tempo}).toEqual(source)
    const {serializeMidi}=await import('./midi/serialize-midi');fireEvent.click(visible);expect(serializeMidi(playbackMockState.lastScore!)).toEqual(serializeMidi(edited))
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(edited);fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    if(process.env.DDIRORI_IMPLICIT_TEMPO_OUT){const {mkdirSync,writeFileSync}=await import('node:fs'),{join}=await import('node:path'),{createNativeProject,encodeNativeProject}=await import('../../project/schema'),dir=join(process.env.DDIRORI_IMPLICIT_TEMPO_OUT,'explicit-dotted');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'edited.chromatics'),encodeNativeProject(createNativeProject(edited)));writeFileSync(join(dir,'edited.mid'),serializeMidi(edited))}
  })

  it.each([
    ['e-major','마장조 (♯ 4개)',4,'major'],
    ['c-sharp-minor','올림다단조 (♯ 4개)',4,'minor'],
    ['c-sharp-major','올림다장조 (♯ 7개)',7,'major'],
    ['ab-minor','내림가단조 (♭ 7개)',-7,'minor']
  ] as const)('studio.key-signature-inventory creates %s through the real wizard without mutating its source draft',async (_id,label,fifths,mode)=>{
    const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const q=within(screen.getByRole('dialog',{name:'새 악보 만들기'})),field=q.getByRole('combobox',{name:'조표'})
    fireEvent.click(field);expect(screen.getAllByRole('option')).toHaveLength(30)
    fireEvent.click(screen.getByRole('option',{name:label}));expect(field).toHaveTextContent(label)
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.submit(q.getByRole('form',{name:'새 악보 만들기'}))
    expect(screen.queryByRole('dialog')).toBeNull()
    for(const part of playbackMockState.lastScore!.parts)for(const staff of part.staves)for(const measure of staff.measures)expect(measure.keySignature).toEqual({fifths,mode})
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each([
    ['마장조 (♯ 4개)',4,'major'],['올림다단조 (♯ 4개)',4,'minor'],
    ['올림다장조 (♯ 7개)',7,'major'],['내림가단조 (♭ 7개)',-7,'minor']
  ] as const)('studio.key-signature-inventory preserves imported %s labels and measure-onward pitch/undo contracts',async(label,fifths,mode)=>{
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {resolveNotePitch}=await import('../../score-core')
    const pitches=(score:NonNullable<typeof playbackMockState.lastScore>)=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events.filter(e=>e.type==='note').map(e=>resolveNotePitch(m,v,e))))))
    const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    for(const measure of source.parts[0].staves[0].measures)measure.keySignature={fifths,mode}
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'key.chromatics',filePath:'/scores/key.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('악보')
    const field=screen.getByRole('combobox',{name:'조표'});expect(field).toHaveTextContent(label)
    fireEvent.click(field);fireEvent.click(screen.getByRole('option',{name:label}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(field);fireEvent.click(screen.getByRole('option',{name:'다장조 (조표 없음)'}))
    const edited=structuredClone(playbackMockState.lastScore!);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(edited.parts[0].staves[0].measures[0]).toEqual(source.parts[0].staves[0].measures[0])
    for(const measure of edited.parts[0].staves[0].measures.slice(1))expect(measure.keySignature).toEqual({fifths:0,mode:'major'})
    expect(pitches(edited)).toEqual(pitches(source));expect(edited.parts.slice(1)).toEqual(source.parts.slice(1))
    expect(edited.parts[0].staves.slice(1)).toEqual(source.parts[0].staves.slice(1))
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it.each([[-7,'내림다장조 (♭ 7개)','플랫 7개'],[0,'다장조 (조표 없음)','조표 없음'],[4,'마장조 (♯ 4개)','샤프 4개']] as const)('studio.key-mode-state preserves omitted mode for fifths=%s until explicit selection',async(fifths,target,label)=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>)
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {serializeMusicXml,parseMusicXml}=await import('../../musicxml')
    const {serializeMidi}=await import('./midi/serialize-midi')
    const source=structuredClone(playbackMockState.lastScore!)
    for(const measure of source.parts[0].staves[0].measures)measure.keySignature={fifths}
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'mode-omitted.chromatics',filePath:'/scores/mode-omitted.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('악보');let field=screen.getByRole('combobox',{name:'조표'})
    expect(field).toHaveTextContent(`${label} · 장·단조 미지정 (현재)`)
    field.focus();fireEvent.click(field);const current=screen.getByRole('option',{name:`${label} · 장·단조 미지정 (현재)`});expect(current).toHaveAttribute('aria-selected','true');expect(current).toHaveAttribute('aria-disabled','true');fireEvent.click(current)
    fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveFocus();expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
    const xml=serializeMusicXml(source);expect(xml).not.toContain('<mode>');for(const measure of parseMusicXml(xml).parts[0].staves[0].measures)expect(measure.keySignature.mode).toBeUndefined()
    openStudioWorkspace('악보');field=screen.getByRole('combobox',{name:'조표'});field.focus();fireEvent.click(field);fireEvent.click(screen.getByRole('option',{name:target}));const edited=structuredClone(playbackMockState.lastScore!)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(edited.parts[0].staves[0].measures[0]).toEqual(source.parts[0].staves[0].measures[0]);for(const measure of edited.parts[0].staves[0].measures.slice(1))expect(measure.keySignature).toEqual({fifths,mode:'major'})
    expect(serializeMidi(edited)).toEqual(serializeMidi(source))
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);expect(field).toHaveTextContent('장·단조 미지정 (현재)')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.measure-tools uses shared measure commands and signatures with exact undo and cancelled lists', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    openStudioWorkspace('악보')
    const tools=screen.getByRole('region',{name:'마디 구조와 조표·박자표'})
    expect(tools.closest('.studio-chrome')).toBeNull()
    expect(within(tools).getByRole('button',{name:'마디 추가'})).toHaveClass('dd-icon-button')
    const signature=within(tools).getByRole('combobox',{name:'조표'})
    expect(signature).toHaveClass('dd-select')
    expect(tools).toHaveTextContent('선택한 마디부터 적용')
    signature.focus();fireEvent.keyDown(signature,{key:'Enter'});fireEvent.keyDown(signature,{key:'Home'});fireEvent.keyDown(signature,{key:'Escape'})
    expect(signature).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(signature);fireEvent.click(screen.getByRole('option',{name:'다장조 (조표 없음)'}))
    expect(signature).toHaveTextContent('다장조 (조표 없음)')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(signature,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'3마디 선택'}))
    const time=within(tools).getByRole('combobox',{name:'박자표'})
    fireEvent.click(time);fireEvent.click(screen.getByRole('option',{name:'3/4'}))
    expect(time).toHaveTextContent('3/4')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(time,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}))
    fireEvent.click(within(tools).getByRole('button',{name:'시스템 나누기 추가'}))
    expect(within(tools).getByRole('button',{name:'시스템 나누기 해제'})).toHaveAttribute('aria-pressed','true')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',metaKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.input-target keeps scope help keyboard accessible without changing playback or history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const toolbar=screen.getByRole('region',{name:'음표 입력 도구'})
    const target=within(toolbar).getByRole('region',{name:'보표·성부 탐색'})
    const help=within(target).getByRole('button',{name:'1성부'})
    expect(help).toHaveClass('dd-icon-button')
    help.focus();fireEvent.focus(help)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('입력 위치를 이동합니다. 선택한 음표는 옮기지 않습니다.')
    fireEvent.keyDown(help,{key:' ',code:'Space'});fireEvent.click(help)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.keyDown(help,{key:'Escape'})
    expect(help).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(within(toolbar).getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    fireEvent.blur(help);help.focus();fireEvent.focus(help)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('다음 음표를 넣을 위치입니다.')
    expect(within(toolbar).getByLabelText('다음 입력 설정')).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.input-target exposes shared staff and voice navigation without editing on focus movement', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const toolbar=screen.getByRole('region',{name:'음표 입력 도구'})
    const target=within(toolbar).getByRole('region',{name:'보표·성부 탐색'})
    expect(target.closest('.studio-chrome')).toBeNull()
    expect(within(target).queryByRole('combobox',{name:'입력 보표'})).toBeNull()
    expect(within(target).getByRole('status',{name:'입력 보표'})).toHaveTextContent('Melody')
    const voices=within(target).getByRole('group',{name:'입력 성부'})
    const one=within(voices).getByRole('button',{name:'1성부'})
    const two=within(voices).getByRole('button',{name:'2성부'})
    expect(two).toHaveClass('dd-icon-button')
    one.focus();fireEvent.keyDown(one,{key:'ArrowRight',code:'ArrowRight'})
    expect(two).toHaveFocus()
    expect(one).toHaveAttribute('aria-pressed','true')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(two)
    expect(two).toHaveAttribute('aria-pressed','true')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',metaKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.selected-properties uses human clef and written pitch labels without rewriting score data', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const properties=screen.getByRole('region',{name:'선택 요약'})
    fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}))
    expect(within(properties).getByText('F#4',{selector:'dd'})).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}))
    expect(within(properties).getByText('높은음자리표')).toBeVisible()
    expect(within(properties).queryByText('G2',{exact:true})).not.toBeInTheDocument()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.selected-properties uses shared fields and cancels IME and stale selection drafts', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const properties=screen.getByRole('region',{name:'선택 요약'})
    expect(properties).not.toHaveClass('studio-chrome')
    expect(within(properties).queryByText('틱',{exact:true})).not.toBeInTheDocument()
    const dynamics=within(properties).getByRole('combobox',{name:'선택 마디 셈여림'})
    expect(dynamics).toHaveClass('dd-select')
    fireEvent.click(dynamics);fireEvent.click(screen.getByRole('option',{name:'ff'}))
    const input=within(properties).getByRole('textbox',{name:'선택 요약 보표 글자'})
    expect(input.closest('.dd-field')).not.toBeNull()
    input.focus();fireEvent.change(input,{target:{value:'취소할 조합'}})
    fireEvent.compositionStart(input)
    fireEvent.keyDown(input,{key:'Enter',isComposing:true,keyCode:229})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Escape'})
    expect(input).toHaveValue('dolce')
    input.focus();fireEvent.change(input,{target:{value:'cantabile'}})
    fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input)
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.change(input,{target:{value:'stale-new-measure'}})
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));fireEvent.blur(input)
    expect(playbackMockState.lastScore!.staffTexts?.some(mark=>mark.text==='stale-new-measure')).toBe(false)
    expect(within(properties).getByRole('textbox',{name:'선택 요약 보표 글자'})).not.toHaveValue('stale-new-measure')
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.input-summary distinguishes command target from next input with public text roles', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const toolbar = screen.getByRole('region', { name: '음표 입력 도구' })
    const target = within(toolbar).getByLabelText('도구 적용 대상')
    const next = within(toolbar).getByRole('region', { name: '다음 입력' })
    expect(target).toHaveTextContent('도구 대상선택한 표기')
    expect(target).not.toContainElement(next)
    expect(within(next).getByRole('heading', { name: '다음 입력' })).toHaveClass('dd-text--label')
    expect(within(next).getByLabelText('다음 입력 설정')).toHaveClass('dd-text--description')
    expect(within(next).getByText('대기')).toHaveClass('dd-text--description')
    fireEvent.click(within(toolbar).getByRole('button', { name: '음표 입력 전환, 단축키 N' }))
    expect(target).toHaveTextContent('도구 대상다음 입력')
    expect(next).toHaveAttribute('data-input-active', 'true')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['title', 'composer'] as const)('studio.metadata-actions edits %s through common controls and returns to its workspace trigger', async field => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App'); render(<App />)
    const source = structuredClone(playbackMockState.lastScore!)
    const selected = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const trigger = screen.getByRole('button', { name: '악보 정보' })
    fireEvent.click(trigger)
    const panel = screen.getByRole('dialog', { name: '악보 정보' })
    expect(panel.querySelector('[data-density="comfortable"]')).toBeInTheDocument()
    const action = within(panel).getByRole('button', { name: field === 'title' ? '악보 제목 편집' : '작곡가 편집' })
    expect(action).toHaveClass('dd-button')
    expect(within(panel).getByRole('button', { name: '파트보 제목 편집' })).toBeDisabled()
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(action)
    const input = screen.getByRole('textbox', { name: field === 'title' ? '악보 제목' : '작곡가' })
    expect(input).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.change(input, { target: { value: '  새 정보  ' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    fireEvent.blur(input)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(playbackMockState.lastScore).toEqual({ ...source, [field]: '새 정보' })
    expect(trigger).toHaveFocus()
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selected)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.keyDown(trigger, { key: 'z', code: 'KeyZ', ctrlKey: true })
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.metadata-actions offers the current part title without changing score or neighbour layouts', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App'); render(<App />)
    const source = structuredClone(playbackMockState.lastScore!)
    chooseScoreView('악보 보기', 'part')
    fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
    const panel = screen.getByRole('dialog', { name: '악보 정보' })
    const action = within(panel).getByRole('button', { name: '파트보 제목 편집' })
    expect(action).toBeEnabled(); fireEvent.click(action)
    const input = screen.getByRole('textbox', { name: '파트보 제목 입력' })
    fireEvent.change(input, { target: { value: '별도 파트 표제' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    expect(screen.getByRole('button', { name: '악보 정보' })).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    expect(playbackMockState.lastScore).toEqual(source)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    const { decodeNativeProject } = await import('../../project/schema')
    const saved = decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
    expect(saved.score).toEqual(source)
    expect(saved.partLayouts).toEqual([{ partId: source.parts[0].id, title: '별도 파트 표제', layout: {} }])
  })

  it('studio.metadata-actions opens from Format and cancels only the metadata draft', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source = structuredClone(playbackMockState.lastScore!)
    const menu = within(screen.getByRole('navigation', { name: '앱 메뉴' }))
    fireEvent.click(menu.getByRole('button', { name: '형식' }))
    fireEvent.click(menu.getByRole('menuitem', { name: '악보 정보 편집' }))
    const panel = screen.getByRole('dialog', { name: '악보 정보' })
    fireEvent.click(within(panel).getByRole('button', { name: '악보 제목 편집' }))
    const input = screen.getByRole('textbox', { name: '악보 제목' })
    fireEvent.change(input, { target: { value: '취소할 값' } })
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })
    expect(screen.getByRole('button', { name: '악보 정보' })).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    const anchor = document.createElement('button')
    anchor.className = 'notation-event is-selected'; anchor.tabIndex = 0
    anchor.dataset.eventId = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id') ?? ''
    anchor.scrollIntoView = vi.fn()
    screen.getByTestId('notation-preview').append(anchor)
    fireEvent.click(screen.getByRole('button', { name: '악보 정보' }))
    fireEvent.keyDown(within(panel).getByRole('button', { name: '악보 제목 편집' }), { key: 'F6', code: 'F6' })
    expect(anchor).toHaveFocus()
    expect(screen.getByRole('button', { name: '악보 정보' })).toHaveAttribute('aria-expanded', 'false')
    expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.workspace-hierarchy keeps dock actions in the document header and context readouts in the lower status area', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const header = screen.getByRole('region', { name: '문서 상태' })
    const actions = screen.getByRole('region', { name: '작업 영역 도구' })
    const lower = screen.getByRole('region', { name: '악보 상태 및 보기' })
    expect(header).toContainElement(actions)
    for (const label of ['작업', '입력', '대상', '필터']) {
      expect(within(actions).queryByText(label)).not.toBeInTheDocument()
      expect(within(lower).getByText(label)).toBeVisible()
    }
    expect(within(lower).getByText(/보표 1 · 성부 1/)).toBeVisible()
    expect(within(actions).getByRole('button', { name: '악보로 이동' })).toHaveAttribute('aria-keyshortcuts', 'F6')
    const properties = within(actions).getByRole('button', { name: '속성 표시' })
    fireEvent.click(screen.getByRole('button', { name: '속성 도크 닫기' }))
    expect(properties).toHaveFocus()
    expect(properties).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(properties)
    expect(screen.getByRole('complementary', { name: '속성 도크' })).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.status-view places view controls after the score outside the live status without document edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const footer = screen.getByRole('region', { name: '악보 상태 및 보기' })
    const header = screen.getByRole('region', { name: '문서 상태' })
    const group = within(footer).getByRole('radiogroup', { name: '악보 보기 방식' })
    expect(header).not.toContainElement(group)
    expect(screen.getByRole('status', { name: '편집 및 파일 상태' })).not.toContainElement(group)
    expect(document.querySelector('.studio-docks')!.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(fireEvent.keyDown(within(group).getByRole('radio', { name: '고정 배율' }), { key: ' ', code: 'Space' })).toBe(true)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(within(group).getByRole('radio', { name: '고정 배율' }))
    fireEvent.click(within(footer).getByRole('combobox', { name: '고정 확대율' }))
    fireEvent.click(screen.getByRole('option', { name: '150%' }))
    fireEvent.click(within(group).getByRole('radio', { name: '폭 맞춤' }))
    fireEvent.click(within(group).getByRole('radio', { name: '고정 배율' }))
    expect(within(footer).getByRole('combobox', { name: '고정 확대율' })).toHaveTextContent('150%')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.document-header shows automatic fit status and restores the saved fixed zoom without editing score', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const preview = screen.getByTestId('notation-preview')
    const selected = preview.getAttribute('data-selected-event-id')
    expect(screen.getByLabelText('확대율 상태')).toHaveTextContent('폭에 맞춰 자동 조절')
    expect(screen.queryByRole('combobox', { name: '고정 확대율' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '고정 배율' }))
    fireEvent.click(screen.getByRole('combobox', { name: '고정 확대율' }))
    fireEvent.click(screen.getByRole('option', { name: '150%' }))
    expect(screen.queryByLabelText('확대율 상태')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '폭 맞춤' }))
    expect(screen.getByLabelText('확대율 상태')).toHaveTextContent('폭에 맞춰 자동 조절')
    expect(screen.queryByRole('combobox', { name: '고정 확대율' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: '고정 배율' }))
    expect(screen.getByRole('combobox', { name: '고정 확대율' })).toHaveTextContent('150%')
    expect(preview).toHaveAttribute('data-selected-event-id', selected)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.document-header uses the shared single-choice view control without touching score history', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const header=screen.getByRole('region',{name:'문서 상태'})
    expect(header).not.toHaveClass('studio-chrome')
    expect(within(header).getByRole('heading',{level:1})).toHaveClass('dd-text--item-title')
    const modes=within(screen.getByRole('region',{name:'악보 상태 및 보기'})).getByRole('radiogroup',{name:'악보 보기 방식'})
    const fit=within(modes).getByRole('radio',{name:'폭 맞춤'})
    fit.focus();fireEvent.keyDown(fit,{key:'ArrowRight'})
    expect(within(modes).getByRole('radio',{name:'고정 배율'})).toHaveAttribute('aria-checked','true')
    expect(screen.getByRole('combobox',{name:'고정 확대율'})).toBeEnabled()
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
    fireEvent.keyDown(within(modes).getByRole('radio',{name:'고정 배율'}),{key:' ',code:'Space'})
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.playback-workspace keeps transport visible and mixer independent of notation tools', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const transport=within(screen.getByRole('region',{name:'재생 컨트롤'}))
    const source=structuredClone(playbackMockState.lastScore)
    expect(transport.getByRole('button',{name:'재생'})).toBeVisible()
    expect(transport.getByRole('button',{name:'재생'})).toHaveClass('dd-icon-button')
    expect(transport.getByRole('button',{name:'일시정지'})).toBeDisabled()
    fireEvent.click(transport.getByRole('button',{name:'재생'}))
    expect(playbackMockState.playFromEvent).toHaveBeenCalledTimes(1)
    expect(playbackMockState.play).not.toHaveBeenCalled()
    openNotationSettings('range')
    fireEvent.click(transport.getByRole('button',{name:'믹서 표시'}))
    const mixer=screen.getByRole('region',{name:'파트 믹서'})
    expect(mixer).toBeVisible()
    expect(screen.getByRole('region',{name:'표기 객체'})).toBeVisible()
    expect(document.querySelector('.score-canvas')!.compareDocumentPosition(mixer)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.change(within(mixer).getByRole('slider',{name:/Melody 볼륨/}),{target:{value:'65'}})
    expect(playbackMockState.lastPartMixer['part-1'].volume).toBe(.65)
    fireEvent.click(transport.getByRole('button',{name:'믹서 표시'}))
    expect(mixer).not.toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.properties technical accordion keeps native activation local without playback or score edits', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const root = screen.getByRole('region', { name: '선택 요약' })
    const trigger = within(root).getByRole('button', { name: '기술 정보' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(fireEvent.keyDown(trigger, { key: ' ', code: 'Space' })).toBe(true)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(root.querySelector('.studio-selected-properties__technical output')).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.workspace-tools uses shared dock actions without legacy chip or button styling', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const root=screen.getByRole('region',{name:'작업 영역 도구'})
    expect(root).not.toHaveClass('studio-chrome')
    expect(root).not.toHaveClass('editor-context-strip')
    const properties=within(root).getByRole('button',{name:'속성 표시'})
    expect(properties).toHaveClass('dd-icon-button')
    expect(properties.querySelector('svg')?.getAttribute('stroke-width')).toBe('1.75')
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}))
    expect(properties).toHaveFocus()
    expect(properties).toHaveAttribute('aria-pressed','false')
    fireEvent.click(properties)
    expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['duration','voice','palette-tile','palette-family','selected-mark','menu'] as const)('studio.command-composition keeps native button activation local to non-composing keys: %s', async surface => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    let button:HTMLElement
    if(surface==='duration')button=within(screen.getByRole('region',{name:'음표 입력 도구'})).getByRole('button',{name:'8분음표, 단축키 4'})
    else if(surface==='voice')button=screen.getByRole('button',{name:'2성부'})
    else if(surface==='palette-tile'||surface==='palette-family') {
      openStudioWorkspace('표기 객체')
      const family=screen.getByRole('button',{name:'정지 기호'})
      if(surface==='palette-family')button=family
      else {if(family.getAttribute('aria-expanded')!=='true')fireEvent.click(family);button=screen.getByRole('button',{name:'페르마타 적용 또는 해제'})}
    } else if(surface==='selected-mark') {
      fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));expandNoteDetails()
      button=within(screen.getByRole('group',{name:'선택 표기의 정지 기호'})).getByRole('button',{name:'페르마타'})
    } else button=within(screen.getByRole('navigation',{name:'앱 메뉴'})).getByRole('button',{name:'추가'})
    const source=structuredClone(playbackMockState.lastScore),next=screen.getByLabelText('다음 입력 설정').textContent
    button.focus()
    const globals=vi.fn();window.addEventListener('keydown',globals)
    try {
      for(const variant of [{isComposing:true},{keyCode:229}])for(const key of ['Enter',' ']) {
        const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...variant})
        fireEvent(button,event)
        expect(event.defaultPrevented).toBe(true)
        expect(button).toHaveFocus()
      }
      for(const variant of [{isComposing:true},{keyCode:229},{key:'Process'}]) {
        fireEvent.keyDown(button,{key:surface==='palette-family'?'ArrowDown':'ArrowRight',...variant})
        expect(button).toHaveFocus()
      }
      expect(globals).not.toHaveBeenCalled()
    } finally {window.removeEventListener('keydown',globals)}
    expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent(next??'')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.command-composition leaves the separate performance experiment adapter unchanged', async () => {
    window.history.replaceState({},'', '/?fixture=release-test&performanceLab=1')
    const {App}=await import('./App');render(<App/>)
    const lab=screen.getByRole('region',{name:'연주 모델 실험'})
    const button=within(lab).getByRole('button',{name:'연주 예측 불러오기'})
    const event=new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})
    fireEvent(button,event)
    expect(event.defaultPrevented).toBe(false)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.command-composition leaves candidate confirmation inside the real search input', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    openStudioWorkspace('표기 객체')
    const input=screen.getByRole('searchbox',{name:'표기 기호 검색'});input.focus()
    fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'셈여림'}})
    const event=new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})
    fireEvent(input,event)
    expect(event.defaultPrevented).toBe(false);expect(input).toHaveFocus();expect(input).toHaveValue('셈여림')
    fireEvent.compositionEnd(input)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['event','span','other-voice','other-span','connected','unchanged'] as const)('studio.workspace-focus distinguishes redrawn score identity from a newer target: %s', async kind => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App />)
    const canvas=document.querySelector('.score-canvas')!
    const origin=document.createElement('button');origin.className=kind.includes('span')?'notation-span-target':'notation-event'
    Object.assign(origin.dataset,kind.includes('span')?{spanKind:'slur',spanId:'manual-one'}:{eventId:'note-one',partId:'p',staffId:'s',measureId:'m',voiceId:'v1'})
    canvas.append(origin);origin.focus()
    const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}));fireEvent.click(nav.getByRole('button',{name:'추가'}))
    let frame:FrameRequestCallback|undefined
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementationOnce(callback=>{frame=callback;return 1_000_001})
    try{fireEvent.click(nav.getByRole('menuitem',{name:'표기 팔레트 열기'}))}finally{raf.mockRestore()}
    expect(frame).toBeDefined()
    const replacement=kind==='unchanged'?origin:origin.cloneNode() as HTMLButtonElement
    if(kind!=='connected'&&kind!=='unchanged')origin.remove()
    if(kind==='other-voice')replacement.dataset.voiceId='v2'
    if(kind==='other-span')replacement.dataset.spanId='manual-two'
    canvas.append(replacement);replacement.focus();act(()=>frame!(0))
    if(kind==='event'||kind==='span'||kind==='unchanged')expect(screen.getByRole('searchbox',{name:'표기 기호 검색'})).toHaveFocus()
    else expect(replacement).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.palette-entry opens search without unrelated toolbars and preserves input and workspace preferences', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
    const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window,{key:'n',code:'KeyN'})
    const input=screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'})
    expect(input).toHaveAttribute('aria-pressed','true')
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    fireEvent.click(screen.getByRole('button',{name:'팔레트 도크 닫기'}))
    openStudioWorkspace('표기 객체')
    await waitFor(()=>expect(screen.getByRole('searchbox',{name:'표기 기호 검색'})).toHaveFocus())
    expect(screen.getByRole('complementary',{name:'고정 팔레트'})).toBeVisible()
    expect(document.querySelector('.studio-notation-tools')).not.toBeVisible()
    expect(input).toHaveAttribute('aria-pressed','true')
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected)
    expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['document','workspace','focus'] as const)('studio.palette-entry isolates a deferred focus request after a newer %s', async replacement => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore!)
    const nav=within(screen.getByRole('navigation',{name:'앱 메뉴'}))
    fireEvent.click(nav.getByRole('button',{name:'추가'}))
    let lateFrame:FrameRequestCallback|undefined
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementationOnce(callback=>{lateFrame=callback;return 1_000_000})
    try { fireEvent.click(nav.getByRole('menuitem',{name:'표기 팔레트 열기'})) } finally { raf.mockRestore() }
    expect(lateFrame).toBeDefined()
    let destination:HTMLElement
    if(replacement==='document') {
      const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
      const next={...source,title:'New palette document'}
      vi.mocked(window.inC.project.open).mockResolvedValue({filePath:'/scores/new.chromatics',fileName:'new.chromatics',contents:encodeNativeProject(createNativeProject(next))})
      fireEvent.click(nav.getByRole('button',{name:'파일'}));fireEvent.click(nav.getByRole('menuitem',{name:'프로젝트 열기'}))
      await waitFor(()=>expect(playbackMockState.lastScore?.title).toBe(next.title))
      destination=screen.getByRole('button',{name:'악보로 이동'});destination.focus()
    } else if(replacement==='workspace') {
      openStudioWorkspace('가사')
      destination=screen.getByRole('textbox',{name:'선택 음표 가사'})
      await waitFor(()=>expect(destination).toHaveFocus())
    } else {
      destination=screen.getByRole('button',{name:'악보로 이동'});destination.focus()
    }
    act(()=>lateFrame!(0))
    expect(destination).toHaveFocus()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    if(replacement==='workspace')expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.notation-palette separates symbol discovery from workspace categories and keeps real commands', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    expect(palette.queryByRole('button',{name:'파일 팔레트 열기'})).not.toBeInTheDocument()
    const firstFamily=palette.getByRole('button',{name:'음자리표·조표·박자표'})
    firstFamily.focus();fireEvent.keyDown(firstFamily,{key:'ArrowDown',code:'ArrowDown'})
    expect(palette.getByRole('button',{name:'셈여림'})).toHaveFocus()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    const search=palette.getByRole('searchbox',{name:'표기 기호 검색'})
    fireEvent.change(search,{target:{value:'셈여림'}})
    const ff=palette.getByRole('button',{name:'ff 셈여림 적용'})
    expect(ff.querySelector('[data-dynamic-glyph]')).toBeInTheDocument()
    fireEvent.click(ff)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.change(search,{target:{value:'박자표'}})
    fireEvent.click(palette.getByRole('button',{name:'박자표 설정 열기'}))
    await waitFor(()=>expect(screen.getByLabelText('박자표')).toHaveFocus())
    expect(screen.getByLabelText('박자표')).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['셈여림', '일치하지않는표기'])('studio.notation-palette returns focus to search after clearing %s', async query => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    const search=palette.getByRole('searchbox',{name:'표기 기호 검색'})
    search.focus();fireEvent.change(search,{target:{value:query}})
    const clear=palette.getByRole('button',{name:'표기 기호 검색 지우기'})
    clear.focus();fireEvent.click(clear)
    expect(clear).not.toBeInTheDocument()
    expect(search).toHaveFocus()
    expect(search).toHaveValue('')
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.change(search,{target:{value:'ff'}})
    fireEvent.click(palette.getByRole('button',{name:'ff 셈여림 적용'}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each([
    ['모든 팔레트 접기',0],['모든 팔레트 펼치기',8],['팔레트 표시 기본값',1]
  ] as const)('studio.palette-search-actions %s clears transient search and keeps focus selection and undo',async(label,count)=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!),palette=within(screen.getByRole('complementary',{name:'고정 팔레트'})),search=palette.getByRole('searchbox',{name:'표기 기호 검색'})
    search.focus();fireEvent.change(search,{target:{value:'기호'}});expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(3)
    fireEvent.click(palette.getByRole('button',{name:'팔레트 도크 설정'}));const q=within(screen.getByRole('dialog',{name:'팔레트 도크 설정'}))
    if(label==='팔레트 표시 기본값'){
      fireEvent.click(q.getByRole('checkbox',{name:'한 팔레트씩 열기'}));expect(search).toHaveValue('기호');expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(3)
    }
    const action=q.getByRole('button',{name:label});action.focus();fireEvent.click(action)
    expect(search).toHaveValue('');expect(palette.queryByRole('button',{name:'표기 기호 검색 지우기'})).toBeNull();expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(count)
    expect(action).toHaveFocus();expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(action,{key:'Escape'});expect(palette.getByRole('button',{name:'팔레트 도크 설정'})).toHaveFocus()
    search.focus();fireEvent.change(search,{target:{value:'trill'}});fireEvent.click(palette.getByRole('button',{name:'트릴 적용 또는 해제'}));expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.palette-workspace keeps one family open, preserves search state and persists without score commands',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');const {unmount}=render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    const palette=()=>within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    const settings=()=>{fireEvent.click(palette().getByRole('button',{name:'팔레트 도크 설정'}));return within(screen.getByRole('dialog',{name:'팔레트 도크 설정'}))}
    const opened=()=>palette().getAllByRole('button').filter(n=>n.closest('.dd-accordion')&&n.getAttribute('aria-expanded')==='true').map(n=>n.textContent)
    fireEvent.click(palette().getByRole('button',{name:'장식음'}));expect(opened()).toEqual(['셈여림','장식음'])
    let q=settings();const single=q.getByRole('checkbox',{name:'한 팔레트씩 열기'});expect(single.closest('.dd-check')).not.toBeNull();expect(single).not.toBeChecked();fireEvent.click(single)
    expect(opened()).toEqual(['장식음']);expect(q.getByRole('button',{name:'모든 팔레트 펼치기'})).toBeDisabled()
    fireEvent.keyDown(single,{key:'Escape'});fireEvent.click(palette().getByRole('button',{name:'음자리표·조표·박자표'}));expect(opened()).toEqual(['음자리표·조표·박자표'])
    const saved=localStorage.getItem('studio.palette-families.v1')
    fireEvent.change(palette().getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'기호'}});expect(opened()).toEqual(['표현 기호','정지 기호','범위 기호']);expect(localStorage.getItem('studio.palette-families.v1')).toBe(saved)
    fireEvent.click(palette().getByRole('button',{name:'표기 기호 검색 지우기'}));expect(opened()).toEqual(['음자리표·조표·박자표'])
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    unmount();render(<App/>);expect(opened()).toEqual(['음자리표·조표·박자표']);q=settings();expect(q.getByRole('checkbox',{name:'한 팔레트씩 열기'})).toBeChecked();expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.palette-workspace collapse expand and reset preserve dock widths and native score',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}));fireEvent.click(palette.getByRole('button',{name:'팔레트 도크 설정'}));const q=within(screen.getByRole('dialog',{name:'팔레트 도크 설정'})),width=q.getByRole('spinbutton',{name:'팔레트 도크 폭'})
    fireEvent.change(width,{target:{value:'207'}});const widths=localStorage.getItem('chromatics.dock-widths.v1')
    fireEvent.click(q.getByRole('button',{name:'모든 팔레트 펼치기'}));expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(8)
    fireEvent.click(q.getByRole('button',{name:'모든 팔레트 접기'}));expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(0)
    fireEvent.click(q.getByRole('checkbox',{name:'한 팔레트씩 열기'}));expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(0)
    fireEvent.click(q.getByRole('button',{name:'팔레트 표시 기본값'}));expect(q.getByRole('checkbox',{name:'한 팔레트씩 열기'})).not.toBeChecked();expect(document.querySelectorAll('.studio-notation-palette .dd-accordion >button[aria-expanded="true"]')).toHaveLength(1);expect(palette.getByRole('button',{name:'셈여림'})).toHaveAttribute('aria-expanded','true')
    expect(localStorage.getItem('chromatics.dock-widths.v1')).toBe(widths);expect(width).toHaveValue(207)
    fireEvent.keyDown(width,{key:'Escape'});openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const {decodeNativeProject}=await import('../../project/schema');expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.palette-workspace tolerates malformed preferences and protects checkbox composition',async()=>{
    localStorage.setItem('studio.palette-families.v1','not-json');localStorage.setItem('studio.palette.single-family.v1','not-json')
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}));expect(palette.getByRole('button',{name:'셈여림'})).toHaveAttribute('aria-expanded','true')
    fireEvent.click(palette.getByRole('button',{name:'팔레트 도크 설정'}));const q=within(screen.getByRole('dialog',{name:'팔레트 도크 설정'})),single=q.getByRole('checkbox',{name:'한 팔레트씩 열기'})
    for(const variant of [{isComposing:true},{keyCode:229},{key:'Process'}]){
      const event=new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true,...variant});single.dispatchEvent(event);expect(event.defaultPrevented).toBe(true);expect(single).not.toBeChecked()
    }
    expect(playbackMockState.lastScore).toEqual(source);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled();expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.palette-workspace reads legacy multiple-open state and stays usable when local storage is unavailable',async()=>{
    const {renderHook}=await import('@testing-library/react'),{useStudioPaletteWorkspace}=await import('./StudioNotationPalette')
    localStorage.setItem('studio.palette-families.v1',JSON.stringify({'셈여림':true,'장식음':true}))
    let hook=renderHook(()=>useStudioPaletteWorkspace());expect(hook.result.current.single).toBe(false);expect(hook.result.current.open['셈여림']).toBe(true);expect(hook.result.current.open['장식음']).toBe(true);hook.unmount()
    localStorage.setItem('studio.palette.single-family.v1','true');hook=renderHook(()=>useStudioPaletteWorkspace());expect(Object.values(hook.result.current.open).filter(Boolean)).toHaveLength(1)
    act(()=>hook.result.current.onFamilyOpen('장식음',true));expect(hook.result.current.open['장식음']).toBe(true);hook.unmount()
    // The harness may supply a memory API when the runtime has no usable DOM
    // Storage. Inject the outage into the methods the hook actually calls.
    const storage=window.localStorage
    const owner=Object.getPrototypeOf(storage)===Storage.prototype?Storage.prototype:storage
    const read=vi.spyOn(owner,'getItem').mockImplementation(()=>{throw Error('Storage unavailable')}),write=vi.spyOn(owner,'setItem').mockImplementation(()=>{throw Error('Storage unavailable')})
    try{
      expect(()=>localStorage.getItem('outage-probe')).toThrow('Storage unavailable')
      hook=renderHook(()=>useStudioPaletteWorkspace());expect(hook.result.current.single).toBe(false);expect(hook.result.current.open['셈여림']).toBe(true)
      act(()=>hook.result.current.onSingle(true));act(()=>hook.result.current.onFamilyOpen('장식음',true));expect(Object.values(hook.result.current.open).filter(Boolean)).toHaveLength(1);expect(hook.result.current.open['장식음']).toBe(true)
      act(()=>hook.result.current.collapse());expect(Object.values(hook.result.current.open).filter(Boolean)).toHaveLength(0);hook.unmount()
    }finally{read.mockRestore();write.mockRestore()}
  })

  it('studio.ornament-palette reuses the four glyph commands with exact toggle undo and unchanged input context',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore!),find=(score:typeof source)=>score.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.id==='m1-c4')!
    fireEvent.keyDown(window,{key:'n',code:'KeyN'});const next=screen.getByLabelText('다음 입력 설정').textContent,mode=document.querySelector('.studio-input-context')?.getAttribute('data-input-active')
    openStudioWorkspace('표기 객체');const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'})),header=palette.getByRole('button',{name:'장식음'})
    expect(header).toHaveAttribute('aria-expanded','false');fireEvent.click(header)
    const tools=within(screen.getByRole('region',{name:'장식음 팔레트'}))
    for(const [value,label] of [['trill','트릴'],['mordent','모르덴트'],['inverted-mordent','프랄트릴러'],['turn','턴']] as const){
      const tile=tools.getByRole('button',{name:`${label} 적용 또는 해제`});expect(tile).toHaveClass('dd-icon-button');expect(tile.querySelector(`[data-decoration-glyph="${value}"]`)).not.toBeNull()
      expect(tile).toHaveAttribute('aria-pressed','false');fireEvent.click(tile);const edited=structuredClone(source),note=find(edited);if(note.type!=='note')throw Error('Expected real note');note.ornaments=[value]
      expect(playbackMockState.lastScore).toEqual(edited);expect(tile).toHaveAttribute('aria-pressed','true');expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    }
    fireEvent.click(tools.getByRole('button',{name:'트릴 적용 또는 해제'}));fireEvent.click(tools.getByRole('button',{name:'턴 적용 또는 해제'}));fireEvent.click(tools.getByRole('button',{name:'트릴 적용 또는 해제'}))
    const layered=find(playbackMockState.lastScore!);expect(layered.type==='note'&&layered.ornaments).toEqual(['turn'])
    for(let index=0;index<3;index++)fireEvent.keyDown(window,{key:'z',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source);expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent(next??'');expect(document.querySelector('.studio-input-context')).toHaveAttribute('data-input-active',mode!);expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    fireEvent.change(palette.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'mordent'}})
    expect(tools.getByRole('button',{name:'모르덴트 적용 또는 해제'})).toBeVisible();expect(tools.queryByRole('button',{name:'트릴 적용 또는 해제'})).toBeNull()
    fireEvent.click(palette.getByRole('button',{name:'표기 기호 검색 지우기'}));expect(header).toHaveAttribute('aria-expanded','true');expect(JSON.parse(localStorage.getItem('studio.palette-families.v1')!)).toMatchObject({'장식음':true,'셈여림':true})
  })

  it('studio.ornament-palette keeps a chord event and neighbouring ornaments intact through native save and toggles',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>)
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const source=structuredClone(playbackMockState.lastScore!),events=source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))),note=events.find(e=>e.id==='m1-c4')!,neighbour=events.find(e=>e.id==='m1-f-sharp-4')!
    if(note.type!=='note'||neighbour.type!=='note')throw Error('Expected real notes')
    note.pitches=[structuredClone(note.pitch),{step:'E',octave:4}];note.ornaments=['trill'];neighbour.ornaments=['turn']
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'ornament-chord.chromatics',filePath:'/scores/ornament-chord.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));openStudioWorkspace('표기 객체');fireEvent.click(screen.getByRole('button',{name:'장식음'}))
    const tools=within(screen.getByRole('region',{name:'장식음 팔레트'}));expect(tools.getByRole('button',{name:'트릴 적용 또는 해제'})).toHaveAttribute('aria-pressed','true')
    fireEvent.click(tools.getByRole('button',{name:'모르덴트 적용 또는 해제'}));fireEvent.click(tools.getByRole('button',{name:'트릴 적용 또는 해제'}))
    const expected=structuredClone(source),changed=expected.parts[0].staves[0].measures[0].voices[0].events.find(e=>e.id==='m1-c4')!;if(changed.type!=='note')throw Error('Expected note');changed.ornaments=['mordent']
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1));expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(expected)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  })

  it('studio.ornament-palette disables rest measure range and span while preserving its event base',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    openStudioWorkspace('표기 객체');const header=screen.getByRole('button',{name:'장식음'});fireEvent.click(header)
    const tiles=()=>within(screen.getByRole('region',{name:'장식음 팔레트'})).getAllByRole('button')
    const disabled=()=>{expect(tiles()).toHaveLength(4);for(const tile of tiles()){expect(tile).toBeDisabled();fireEvent.click(tile)}expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')}
    const rest=source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='rest')!
    fireEvent.click(screen.getByRole('button',{name:`${rest.id} 선택`}));disabled()
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));disabled()
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}),{shiftKey:true});disabled()
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));chooseSpanReference(`hairpin:${source.hairpins![0].id}`);openStudioWorkspace('표기 객체');disabled()
  })

  it('studio.palette-selection-scope disables existing articulation and pause tiles for a selected span with a note base',async()=>{
    window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App/>);const source=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));chooseSpanReference(`hairpin:${source.hairpins![0].id}`);openStudioWorkspace('표기 객체')
    for(const [family,label] of [['표현 기호','스타카토 적용 또는 해제'],['정지 기호','페르마타 적용 또는 해제']]){
      const header=screen.getByRole('button',{name:family});if(header.getAttribute('aria-expanded')!=='true')fireEvent.click(header)
      const tile=screen.getByRole('button',{name:label});expect(tile).toBeDisabled();fireEvent.click(tile)
    }
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.clef-palette applies four real glyph presets to one measure with exact undo and same-value no-op', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore!)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openStudioWorkspace('표기 객체')
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    const header=palette.getByRole('button',{name:'음자리표·조표·박자표'});if(header.getAttribute('aria-expanded')!=='true')fireEvent.click(header)
    const clefs=within(screen.getByRole('region',{name:'음자리표 팔레트'}))
    const tile=(label:string)=>clefs.getByRole('button',{name:`${label} · 선택 마디에 적용`})
    const selected=screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),next=screen.getByLabelText('다음 입력 설정').textContent
    const treble=tile('높은음자리표');expect(treble).toHaveClass('dd-icon-button');expect(treble.querySelector('[data-clef-glyph="G"]')).not.toBeNull()
    expect(treble).toHaveAttribute('aria-pressed','true');fireEvent.click(treble)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    for(const [label,sign,line] of [['낮은음자리표','F',4],['가온음자리표','C',3],['테너음자리표','C',4]] as const){
      fireEvent.click(tile(label));const expected=structuredClone(source);expected.parts[0].staves[0].measures[0].clef={sign,line}
      expect(playbackMockState.lastScore).toEqual(expected);expect(tile(label)).toHaveAttribute('aria-pressed','true')
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    }
    fireEvent.click(tile('낮은음자리표'));fireEvent.click(treble)
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].clef).toEqual({sign:'F',line:4})
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',selected!)
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent(next??'')
    fireEvent.change(palette.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'tenor'}})
    expect(palette.getByRole('button',{name:'테너음자리표 · 선택 마디에 적용'})).toBeVisible()
    expect(palette.queryByRole('button',{name:'높은음자리표 · 선택 마디에 적용'})).toBeNull()
    fireEvent.click(palette.getByRole('button',{name:'표기 기호 검색 지우기'}))
    expect(header).toHaveAttribute('aria-expanded','true');expect(palette.getByRole('button',{name:'조표 설정 열기'})).toBeVisible();expect(palette.getByRole('button',{name:'박자표 설정 열기'})).toBeVisible()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.clef-palette disables event rest range and span targets including a measure base selection', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore!);openNotationSettings('clef')
    const tile=()=>screen.getByRole('button',{name:'낮은음자리표 · 선택 마디에 적용'})
    expect(tile()).toBeDisabled();expect(screen.getByRole('region',{name:'음자리표 팔레트'})).toHaveTextContent('마디를 선택')
    const rest=source.parts.flatMap(p=>p.staves.flatMap(s=>s.measures.flatMap(m=>m.voices.flatMap(v=>v.events)))).find(e=>e.type==='rest')!
    fireEvent.click(screen.getByRole('button',{name:`${rest.id} 선택`}));expect(tile()).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}),{shiftKey:true});expect(tile()).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));expect(tile()).toBeEnabled()
    chooseSpanReference(`hairpin:${source.hairpins![0].id}`);openNotationSettings('clef')
    expect(tile()).toBeDisabled();expect(screen.getByRole('combobox',{name:'선택 마디 음자리표'})).toBeDisabled()
    fireEvent.click(tile());expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('studio.clef-palette keeps the detailed clef command disabled for a selected span with a measure base', async () => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {App}=await import('./App');render(<App/>)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}))
    chooseSpanReference(`hairpin:${playbackMockState.lastScore!.hairpins![0].id}`);openNotationSettings('clef')
    expect(screen.getByRole('combobox',{name:'선택 마디 음자리표'})).toBeDisabled()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each([-1,0,1])('studio.clef-palette distinguishes octaveChange=%s from an ordinary preset without rewriting it', async octaveChange => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createNativeProject,encodeNativeProject,decodeNativeProject}=await import('../../project/schema')
    const {App}=await import('./App');render(<App/>)
    const source=structuredClone(playbackMockState.lastScore!);source.parts[0].staves[0].measures[0].clef={sign:'G',line:2,octaveChange}
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'octave-clef.chromatics',filePath:'/scores/octave-clef.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source))
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('clef')
    const tile=()=>screen.getByRole('button',{name:'높은음자리표 · 선택 마디에 적용'})
    expect(tile()).toHaveAttribute('aria-pressed',octaveChange===0?'true':'false')
    if(octaveChange!==0){
      expect(screen.getByRole('region',{name:'음자리표 팔레트'})).toHaveTextContent(`옥타브 ${octaveChange>0?'+':''}${octaveChange}`)
      expect(screen.getByRole('combobox',{name:'선택 마디 음자리표'})).toHaveTextContent(`옥타브 ${octaveChange>0?'+':''}${octaveChange}`)
      openStudioWorkspace('악보')
      expect(screen.getByRole('combobox',{name:'현재 보표 음자리표'})).toHaveTextContent(`옥타브 ${octaveChange>0?'+':''}${octaveChange}`)
    }
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(source)
    openNotationSettings('clef');fireEvent.click(tile())
    if(octaveChange===0){expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')}
    else{
      const expected=structuredClone(source);expected.parts[0].staves[0].measures[0].clef={sign:'G',line:2}
      expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    }
  })

  it.each(['percussion','tab'] as const)('studio.clef-palette retains the unsupported %s state until one explicit measure conversion', async sign => {
    window.history.replaceState({},'', '/?fixture=release-test')
    const {createMidiWarningScore}=await import('../../testing/midi-warning-fixture')
    const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
    const source=createMidiWarningScore(sign);source.parts.reverse()
    vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'clef-palette.chromatics',filePath:'/scores/clef-palette.chromatics',contents:encodeNativeProject(createNativeProject(source))})
    const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await screen.findByText(source.title)
    fireEvent.click(screen.getByRole('button',{name:'1마디 선택'}));openNotationSettings('clef')
    const palette=within(screen.getByRole('region',{name:'음자리표 팔레트'}))
    expect(palette.getAllByRole('button')).toHaveLength(4)
    expect(palette.getAllByRole('button').every(button=>button.getAttribute('aria-pressed')==='false')).toBe(true)
    expect(palette.getByText(new RegExp(sign==='percussion'?'타악기 보표':'태브 보표'))).toBeVisible()
    fireEvent.click(palette.getByRole('button',{name:'높은음자리표 · 선택 마디에 적용'}))
    const expected=structuredClone(source);expected.parts[0].staves[0].measures[0].clef={sign:'G',line:2}
    expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
  })

  it('studio.notation-palette applies actual articulation tiles with selection scope and exact undo', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    fireEvent.click(palette.getByRole('button',{name:'표현 기호'}))
    expect(JSON.parse(localStorage.getItem('studio.palette-families.v1')??'{}')['표현 기호']).toBe(true)
    const nextInput=screen.getByLabelText('다음 입력 설정').textContent
    const tile=()=>palette.getByRole('button',{name:'악센트 적용 또는 해제'})
    expect(tile()).toHaveClass('dd-icon-button')
    expect(tile().querySelector('[data-mark-glyph="accent"]')).toBeInTheDocument()
    expect(tile()).toHaveAttribute('aria-pressed','false')
    fireEvent.click(tile())
    expect(tile()).toHaveAttribute('aria-pressed','true')
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    const updated=playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events.find(event=>event.id==='m1-c4')
    expect(updated?.type==='note'?updated.articulations:undefined).toContain('accent')
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent(nextInput??'')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    expect(tile()).toHaveAttribute('aria-pressed','false')
    fireEvent.change(palette.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'마르카토'}})
    expect(palette.getByRole('button',{name:'마르카토 적용 또는 해제'})).toBeVisible()
    expect(palette.queryByRole('button',{name:'악센트 적용 또는 해제'})).not.toBeInTheDocument()
    fireEvent.click(palette.getByRole('button',{name:'표기 기호 검색 지우기'}))
    const rest=source?.parts.flatMap(part=>part.staves.flatMap(staff=>staff.measures.flatMap(measure=>measure.voices.flatMap(voice=>voice.events)))).find(event=>event.type==='rest')
    expect(rest).toBeDefined()
    fireEvent.click(screen.getByRole('button',{name:`${rest!.id} 선택`}))
    expect(tile()).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}))
    expect(tile()).toBeDisabled()
    fireEvent.click(tile());expect(playbackMockState.lastScore).toEqual(source)
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}))
    fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}),{shiftKey:true})
    expect(tile()).toBeDisabled()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['note','rest'] as const)('studio.notation-palette applies pause tiles to a single %s with replacement and exact undo', async type => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore!)
    const events=source.parts.flatMap(part=>part.staves.flatMap(staff=>staff.measures.flatMap(measure=>measure.voices.flatMap(voice=>voice.events))))
    const event=events.find(event=>event.type===type)!
    fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}))
    const palette=within(screen.getByRole('complementary',{name:'고정 팔레트'}))
    fireEvent.click(palette.getByRole('button',{name:'정지 기호'}))
    const nextInput=screen.getByLabelText('다음 입력 설정').textContent
    const fermata=()=>palette.getByRole('button',{name:'페르마타 적용 또는 해제'})
    expect(fermata()).toHaveClass('dd-icon-button')
    expect(fermata().querySelector('[data-mark-glyph="fermata"]')).toBeInTheDocument()
    expect(fermata()).toHaveAttribute('aria-pressed',String(Boolean(event.fermata)))
    fireEvent.click(fermata())
    expect(fermata()).toHaveAttribute('aria-pressed',String(!event.fermata))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    const breath=()=>palette.getByRole('button',{name:'숨표 적용 또는 해제'})
    const caesura=()=>palette.getByRole('button',{name:'중지표 적용 또는 해제'})
    fireEvent.click(breath());expect(breath()).toHaveAttribute('aria-pressed','true')
    fireEvent.click(caesura());expect(caesura()).toHaveAttribute('aria-pressed','true');expect(breath()).toHaveAttribute('aria-pressed','false')
    expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(breath()).toHaveAttribute('aria-pressed','true')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent(nextInput??'')
    fireEvent.change(palette.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'fermata'}})
    expect(fermata()).toBeVisible();expect(palette.queryByRole('button',{name:'숨표 적용 또는 해제'})).not.toBeInTheDocument()
    fireEvent.click(palette.getByRole('button',{name:'표기 기호 검색 지우기'}))
    fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));expect(fermata()).toBeDisabled();expect(breath()).toBeDisabled();expect(caesura()).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'m1-c4 선택'}));fireEvent.click(screen.getByRole('button',{name:'m1-f-sharp-4 선택'}),{shiftKey:true})
    expect(fermata()).toBeDisabled();expect(breath()).toBeDisabled();expect(caesura()).toBeDisabled()
    expect(playbackMockState.lastScore).toEqual(source);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['current','other-focus','replaced','document','background'] as const)('studio.validation-reveal exposes a new sp error without commands or stale scrolling: %s', async disposition => {
    const media=installCompactDockMedia(),frames=new Map<number,FrameRequestCallback>()
    let frameId=0,offset=0
    const raf=vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{frames.set(++frameId,callback);return frameId})
    const cancel=vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{frames.delete(id)})
    const foreground=vi.spyOn(document,'hasFocus').mockReturnValue(true)
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation((xOrOptions?:number|ScrollToOptions,y?:number)=>{offset+=typeof xOrOptions==='object'?(xOrOptions.top??0):(y??0)})
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      const {App}=await import('./App');render(<App/>)
      const source=structuredClone(playbackMockState.lastScore!)
      let expected=source
      const reference=listSpans(source).find(reference=>reference.kind==='hairpin')!
      chooseSpanReference(`${reference.kind}:${reference.id}`)
      fireEvent.click(screen.getByRole('button',{name:'배치 · 형상'}))
      const input=screen.getByLabelText('표기 세로 이동') as HTMLInputElement
      input.scrollIntoView=vi.fn()
      vi.spyOn(input,'getBoundingClientRect').mockImplementation(()=>new DOMRect(25,550-offset,231,32))
      for(const label of input.labels??[])vi.spyOn(label,'getBoundingClientRect').mockImplementation(()=>new DOMRect(25,525-offset,231,18))
      vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,600,960,50))
      input.focus();fireEvent.change(input,{target:{value:'99'}});frames.clear()
      act(()=>input.blur())
      expect(input).toHaveValue(null)
      expect(input).toHaveAttribute('aria-invalid','true')
      const error=document.getElementById(input.getAttribute('aria-describedby')!)!
      vi.spyOn(error,'getBoundingClientRect').mockImplementation(()=>new DOMRect(25,598-offset,231,25))
      if(disposition==='other-focus')screen.getByRole('button',{name:'악보로 이동'}).focus()
      if(disposition==='replaced'){
        const next=listSpans(source).find(candidate=>candidate.id!==reference.id)!
        chooseSpanReference(`${next.kind}:${next.id}`)
        expect(input.isConnected).toBe(false)
      }
      if(disposition==='document'){
        const {createNativeProject,encodeNativeProject}=await import('../../project/schema')
        expected={...source,title:'Replacement while revealing validation'}
        vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/scores/replacement.chromatics',fileName:'replacement.chromatics',contents:encodeNativeProject(createNativeProject(expected))})
        openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
        await waitFor(()=>expect(playbackMockState.lastScore).toEqual(expected))
      }
      if(disposition==='background')foreground.mockReturnValue(false)
      const active=document.activeElement
      act(()=>{const queued=[...frames.values()];frames.clear();queued.forEach(frame=>frame(0))})
      if(disposition==='current'){
        expect(error.getBoundingClientRect().bottom).toBeLessThanOrEqual(600)
        expect(input.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
        expect(scroll).toHaveBeenCalled()
      }else expect(scroll).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(active)
      expect(playbackMockState.lastScore).toEqual(expected)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      expect(window.inC.project.save).not.toHaveBeenCalled()
    }finally{cleanup();media.restore();raf.mockRestore();cancel.mockRestore();foreground.mockRestore();scroll.mockRestore()}
  })

  it.each(['above','below'] as const)('studio.dock-focus contains the focused field and ring in its own scrollport: %s', async edge => {
    const media=installCompactDockMedia()
    const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      localStorage.setItem('chromatics.dock-active.v1',JSON.stringify('properties'))
      const {App}=await import('./App');render(<App/>)
      const source=structuredClone(playbackMockState.lastScore)
      const dock=screen.getByRole('complementary',{name:'속성 도크'})
      const field=screen.getByRole('textbox',{name:'선택 요약 보표 글자'})
      dock.style.overflowY='auto';dock.scrollTop=300
      Object.defineProperties(dock,{clientHeight:{configurable:true,value:160},scrollHeight:{configurable:true,value:1000}})
      vi.spyOn(dock,'getBoundingClientRect').mockImplementation(()=>new DOMRect(0,436,280,160))
      vi.spyOn(field,'getBoundingClientRect').mockImplementation(()=>new DOMRect(25,(edge==='below'?561:421)-(dock.scrollTop-300),231,74))
      vi.spyOn(document.querySelector('main > .studio-status')!,'getBoundingClientRect').mockReturnValue(new DOMRect(0,700,960,50))
      field.style.outline='2px solid blue';field.style.outlineOffset='2px';field.scrollIntoView=vi.fn()
      field.focus()
      await waitFor(()=>{
        const r=field.getBoundingClientRect()
        expect(r.top-4).toBeGreaterThanOrEqual(436)
        expect(r.bottom+4).toBeLessThanOrEqual(596)
      })
      expect(field).toHaveFocus()
      expect(playbackMockState.lastScore).toEqual(source)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } finally {cleanup();media.restore();scroll.mockRestore()}
  })

  it('studio.shared-desktop-dock restores available panes and widths with one live desktop inspector', async () => {
    const previous=window.matchMedia
    Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn(query=>({matches:query==='(min-width: 761px)',media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()}))})
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
      localStorage.setItem('chromatics.dock-active.v1',JSON.stringify('properties'))
      const {App}=await import('./App');render(<App/>)
      const source=structuredClone(playbackMockState.lastScore)
      expect(screen.getAllByRole('complementary')).toHaveLength(1)
      expect(screen.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
      expect(screen.getByLabelText('고정 팔레트')).not.toBeVisible()
      const field=screen.getByRole('textbox',{name:'선택 요약 보표 글자'})
      fireEvent.change(field,{target:{value:'취소할 초안'}});fireEvent.keyDown(field,{key:'Escape',code:'Escape'})
      fireEvent.click(screen.getByRole('radio',{name:'팔레트'}))
      expect(screen.getByLabelText('속성 도크')).not.toBeVisible();expect(field.isConnected).toBe(true)
      fireEvent.click(screen.getByRole('button',{name:'속성 표시'}))
      expect(screen.getByRole('textbox',{name:'선택 요약 보표 글자'})).toBe(field)
      fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}))
      expect(screen.getByLabelText('고정 팔레트')).toBeVisible()
      fireEvent.click(screen.getByRole('button',{name:'팔레트 도크 닫기'}))
      expect(screen.queryByRole('radiogroup',{name:'도크 보기'})).not.toBeInTheDocument()
      expect(screen.queryAllByRole('complementary')).toHaveLength(0)
      fireEvent.click(screen.getByRole('button',{name:'속성 표시'}))
      expect(screen.getByRole('radio',{name:'팔레트'})).toBeDisabled()
      expect(screen.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
      expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360})
      expect(playbackMockState.lastScore).toEqual(source)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } finally {cleanup();Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:previous})}
  })

  it.each(['light','dark'] as const)('studio.workspace-surface uses the public %s surface without wrapping notation typography', async theme => {
    const previous=window.matchMedia
    Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:vi.fn(query=>({matches:query.includes('prefers-color-scheme')&&theme==='dark',media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()}))})
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      const {App}=await import('./App');render(<App/>)
      const {ddiroriTokens}=await import('@ddirori/ui')
      expect(document.querySelector('.studio-docks')).toHaveStyle({backgroundColor:ddiroriTokens.themes[theme].surface})
      expect(document.querySelector('.score-canvas')!.closest('.ddirori')).toBeNull()
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } finally {cleanup();Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:previous})}
  })

  it('studio.compact-shared-dock preserves width visibility drafts and focus across pane and viewport changes', async () => {
    const media=installCompactDockMedia()
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      localStorage.setItem('chromatics.dock-widths.v1',JSON.stringify({palette:207,properties:360}))
      localStorage.setItem('chromatics.dock-active.v1',JSON.stringify('properties'))
      const {App}=await import('./App');const view=render(<App/>)
      const source=structuredClone(playbackMockState.lastScore)
      const switcher=within(screen.getByRole('radiogroup',{name:'도크 보기'}))
      expect(switcher.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
      expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
      expect(screen.getByLabelText('고정 팔레트')).not.toBeVisible()
      const draft=screen.getByRole('textbox',{name:'선택 요약 보표 글자'})
      fireEvent.change(draft,{target:{value:'도크 초안'}})
      media.resize(false);expect(draft).toBeVisible();expect(draft).toHaveValue('도크 초안')
      expect(screen.getByRole('complementary',{name:'고정 팔레트'})).toBeVisible()
      act(()=>draft.focus())
      media.resize(true);expect(screen.getByRole('textbox',{name:'선택 요약 보표 글자'})).toBe(draft);expect(draft).toHaveFocus()
      fireEvent.keyDown(draft,{key:'Escape',code:'Escape'})
      fireEvent.click(switcher.getByRole('radio',{name:'팔레트'}))
      expect(draft.isConnected).toBe(true);expect(draft).not.toBeVisible()
      const search=screen.getByRole('searchbox',{name:'표기 기호 검색'})
      fireEvent.change(search,{target:{value:'셈여림'}})
      const paletteRadio=switcher.getByRole('radio',{name:'팔레트'});paletteRadio.focus()
      fireEvent.keyDown(paletteRadio,{key:'ArrowRight',code:'ArrowRight'})
      expect(switcher.getByRole('radio',{name:'속성'})).toHaveFocus()
      expect(switcher.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
      fireEvent.click(screen.getByRole('button',{name:'속성 도크 닫기'}))
      expect(screen.getByRole('button',{name:'속성 표시'})).toHaveFocus()
      expect(screen.getByRole('searchbox',{name:'표기 기호 검색'})).toBe(search)
      expect(search).toHaveValue('셈여림')
      fireEvent.click(screen.getByRole('button',{name:'속성 표시'}))
      expect(screen.getByRole('complementary',{name:'속성 도크'})).toBeVisible()
      expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360})
      expect(JSON.parse(localStorage.getItem('chromatics.dock-visibility.v1')!)).toEqual({palette:true,properties:true})
      expect(playbackMockState.lastScore).toEqual(source)
      expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
      view.unmount();render(<App/>);
      expect(screen.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
    } finally {cleanup();media.restore()}
  })

  it('studio.compact-shared-dock exposes the actual span finder and preserves explicit zero undo and native data', async () => {
    const media=installCompactDockMedia()
    try {
      window.history.replaceState({},'', '/?fixture=release-test')
      const {App}=await import('./App');render(<App/>)
      const source=structuredClone(playbackMockState.lastScore)
      fireEvent.click(screen.getByRole('button',{name:'도구'}))
      fireEvent.click(screen.getByRole('menuitem',{name:'범위 표기 찾기'}))
      await waitFor(()=>expect(screen.getByRole('combobox',{name:'표기 객체 선택'})).toHaveFocus())
      const reference=`hairpin:${source!.hairpins![0].id}`;chooseSpanReference(reference)
      expect(screen.getByRole('radio',{name:'속성'})).toHaveAttribute('aria-checked','true')
      fireEvent.click(screen.getByRole('button',{name:'배치 · 형상'}))
      const offset=screen.getByRole('spinbutton',{name:'표기 세로 이동'})
      fireEvent.change(offset,{target:{value:'0'}});fireEvent.keyDown(offset,{key:'Enter',code:'Enter'});fireEvent.blur(offset)
      expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
      fireEvent.click(screen.getByRole('radio',{name:'팔레트'}));fireEvent.click(screen.getByRole('button',{name:'속성 표시'}))
      expect(screen.getByRole('spinbutton',{name:'표기 세로 이동'})).toBe(offset);expect(offset).toHaveValue(0)
      fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source)
      openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
      await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
      const {decodeNativeProject}=await import('../../project/schema')
      expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(source)
    } finally {cleanup();media.restore()}
  })

  it('studio.system-toolbar keeps rhythm commands visible across workspaces and preserves input and selection transactions', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const preview=screen.getByTestId('notation-preview'),before=preview.getAttribute('data-event-durations')
    const toolbar=within(screen.getByRole('region',{name:'음표 입력 도구'}))
    const eighth=toolbar.getByRole('button',{name:'8분음표, 단축키 4'})
    expect(eighth).toBeVisible();expect(eighth).toHaveClass('dd-icon-button')
    expect(eighth.querySelector('[data-music-glyph]')).toBeInTheDocument()
    expect(toolbar.getByText('선택한 표기')).toBeVisible()
    fireEvent.click(eighth)
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(preview).toHaveAttribute('data-event-durations',before)
    openStudioWorkspace('표기 객체')
    expect(eighth).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}))
    expect(toolbar.getAllByText('다음 입력').length).toBeGreaterThan(0)
    fireEvent.click(eighth);fireEvent.click(toolbar.getByRole('button',{name:'점 추가'}))
    expect(preview).toHaveAttribute('data-event-durations',before)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    expect(screen.getByLabelText('다음 입력 설정')).toHaveTextContent('8분음표 · 점 1')
    fireEvent.keyDown(window,{key:'C',code:'KeyC'})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(source)
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(1))
    const {decodeNativeProject}=await import('../../project/schema')
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(source)
  })

  it('studio.r2 separates next input from selected event edits without adding undo commands', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()
    const preview = screen.getByTestId('notation-preview')
    const original = preview.getAttribute('data-event-durations')
    fireEvent.click(screen.getByRole('button', {name:'음표 입력 전환, 단축키 N'}))
    const next = screen.getByRole('region', {name:'다음 입력'})
    expect(next).toHaveAttribute('data-input-active','true')
    fireEvent.click(screen.getByRole('button', {name:'8분음표, 단축키 4'}))
    fireEvent.click(screen.getByRole('button', {name:'점 추가'}))
    expect(screen.getByLabelText('점 개수')).toHaveTextContent('1')
    expect(next).toHaveTextContent('8분음표')
    expect(preview).toHaveAttribute('data-event-durations', original)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button', {name:'음표 입력 전환, 단축키 N'}))
    expect(next).toHaveAttribute('data-input-active','false')
    expect(screen.getByLabelText('음표 편집 대상')).toHaveTextContent('선택한 음표')
    fireEvent.click(screen.getByRole('button', {name:'8분음표, 단축키 4'}))
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{code:'KeyZ',ctrlKey:true})
    expect(preview).toHaveAttribute('data-event-durations',original)
  })

  it('studio.r2 endpoint keyboard navigation stays local and preserves span selection', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('표기 객체')
    const reference = `hairpin:${playbackMockState.lastScore!.hairpins![0].id}`
    chooseSpanReference(reference)
    const end=screen.getByLabelText('표기 끝점')
    end.focus()
    const event=new KeyboardEvent('keydown',{key:'ArrowDown',code:'ArrowDown',bubbles:true,cancelable:true})
    fireEvent(end,event)
    expect(event.defaultPrevented).toBe(true)
    fireEvent.keyDown(end,{key:'Escape',bubbles:true})
    expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent(reference.split(':')[1])
    expect(screen.getByRole('region',{name:'범위 표기 속성'})).toHaveTextContent('선택한 표기')
    expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent(reference.split(':')[1])
  })

  it('studio.r2 stores fit/fixed view independently of score history and exported XML', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const app=render(<App />)
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:'MusicXML로 저장'}))
    await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1))
    const before=vi.mocked(window.inC.musicXml.save).mock.calls[0][0].contents
    fireEvent.click(screen.getByRole('radio',{name:'고정 배율'}))
    const zoom=screen.getByRole('combobox',{name:'고정 확대율'})
    fireEvent.click(zoom)
    fireEvent.click(screen.getByRole('option',{name:'150%'}))
    expect(screen.getByLabelText('악보 캔버스')).toHaveAttribute('data-notation-sizing','fixed')
    expect(screen.getByLabelText('악보 캔버스')).toHaveStyle({'--studio-notation-zoom':'1.5'})
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.click(screen.getByRole('button',{name:'MusicXML로 저장'}))
    await waitFor(()=>expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2))
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1][0].contents).toBe(before)
    app.unmount(); render(<App />)
    expect(screen.getByLabelText('악보 캔버스')).toHaveAttribute('data-notation-sizing','fixed')
    expect(screen.getByRole('combobox',{name:'고정 확대율'})).toHaveTextContent('150%')
  })

  it.each(['팔레트','속성'] as const)('studio.dock-settings keeps %s width secondary without changing score or visibility', async name => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    localStorage.setItem('chromatics.dock-widths.v1', JSON.stringify({palette:207, properties:360}))
    const { App } = await import('./App')
    render(<App />)
    const source = structuredClone(playbackMockState.lastScore)
    const preview = screen.getByTestId('notation-preview')
    const selection = preview.getAttribute('data-selected-event-id')
    const settings = screen.getByRole('button', {name:`${name} 도크 설정`})
    expect(settings).toHaveClass('dd-button--secondary')
    expect(settings).toHaveAttribute('aria-expanded','false')
    fireEvent.click(settings)
    expect(settings).toHaveAttribute('aria-expanded','true')
    const dialog = screen.getByRole('dialog', {name:`${name} 도크 설정`})
    const width = within(dialog).getByRole('spinbutton', {name:`${name} 도크 폭`})
    expect(width).toHaveFocus()
    expect(width).toHaveValue(name==='팔레트'?207:360)
    fireEvent.change(width,{target:{value:''}})
    expect(width).toHaveValue(null)
    fireEvent.change(width,{target:{value:'2'}})
    expect(width).toHaveValue(2)
    expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette:207,properties:360})
    fireEvent.blur(width)
    expect(width).toHaveValue(name==='팔레트'?207:360)
    fireEvent.change(width,{target:{value:'280'}})
    expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual(name==='팔레트'?{palette:280,properties:360}:{palette:207,properties:280})
    fireEvent.keyDown(width,{key:'Escape',code:'Escape'})
    expect(settings).toHaveAttribute('aria-expanded','false')
    expect(settings).toHaveFocus()
    expect(screen.getByRole('button',{name:`${name} 표시`})).toHaveAttribute('aria-pressed','true')
    expect(preview).toHaveAttribute('data-selected-event-id',selection)
    expect(playbackMockState.lastScore).toEqual(source)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each(['팔레트','속성'] as const)('studio.dock-settings preserves %s invalid draft and focus during composition Enter/Escape', async name => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const preview=screen.getByTestId('notation-preview'),selection=preview.getAttribute('data-selected-event-id')
    const settings=screen.getByRole('button',{name:`${name} 도크 설정`})
    fireEvent.click(settings)
    const field=screen.getByRole('spinbutton',{name:`${name} 도크 폭`})
    const persisted=localStorage.getItem('chromatics.dock-widths.v1')
    fireEvent.change(field,{target:{value:''}})
    for(const composition of [{isComposing:true},{keyCode:229}]){
      fireEvent.compositionStart(field)
      fireEvent.keyDown(field,{key:'Enter',...composition})
      expect(field).toHaveValue(null)
      fireEvent.keyDown(field,{key:'Escape',...composition})
      expect(settings).toHaveAttribute('aria-expanded','true')
      expect(field).toHaveFocus()
      expect(field).toHaveValue(null)
      fireEvent.compositionEnd(field)
    }
    expect(localStorage.getItem('chromatics.dock-widths.v1')).toBe(persisted)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(preview).toHaveAttribute('data-selected-event-id',selection)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(field,{key:'Enter'})
    expect(field).toHaveValue(280)
    fireEvent.keyDown(field,{key:'Escape'})
    expect(settings).toHaveAttribute('aria-expanded','false')
    expect(settings).toHaveFocus()
  })

  it.each([{isComposing:true},{keyCode:229}])('studio.score-view preserves pending view selection during composition: %j', async composition => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore)
    const preview=screen.getByTestId('notation-preview'),selection=preview.getAttribute('data-selected-event-id')
    openStudioWorkspace('악보')
    const view=screen.getByRole('combobox',{name:'악보 보기'})
    view.focus();fireEvent.click(view);fireEvent.keyDown(view,{key:'End'})
    const pending=view.getAttribute('aria-activedescendant')
    for(const key of ['Home','Enter','Escape']){
      fireEvent.keyDown(view,{key,...composition})
      expect(view).toHaveAttribute('aria-expanded','true')
      expect(view).toHaveAttribute('aria-activedescendant',pending)
      expect(view).toHaveFocus()
      expect(document.querySelector('.score-page')).toHaveAttribute('data-view-mode','score')
    }
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(preview).toHaveAttribute('data-selected-event-id',selection)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(view,{key:'Enter'})
    expect(view).toHaveAttribute('aria-expanded','false')
    expect(document.querySelector('.score-page')).toHaveAttribute('data-view-mode','part')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it.each([{isComposing:true},{keyCode:229}])('studio.status-view keeps fit/fixed settings and dock focus during composition: %j', async composition => {
    const media=installCompactDockMedia()
    try {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App');render(<App />)
    const source=structuredClone(playbackMockState.lastScore),preview=screen.getByTestId('notation-preview')
    const selection=preview.getAttribute('data-selected-event-id')
    const fixed=screen.getByRole('radio',{name:'고정 배율'}),fit=screen.getByRole('radio',{name:'폭 맞춤'})
    fireEvent.click(fixed)
    fireEvent.click(screen.getByRole('combobox',{name:'고정 확대율'}))
    fireEvent.click(screen.getByRole('option',{name:'150%'}))
    fixed.focus()
    for(const key of ['ArrowLeft','Home']){
      fireEvent.keyDown(fixed,{key,...composition})
      expect(fixed).toHaveAttribute('aria-checked','true')
      expect(fixed).toHaveFocus()
      expect(screen.getByLabelText('악보 캔버스')).toHaveAttribute('data-notation-sizing','fixed')
      expect(screen.getByRole('combobox',{name:'고정 확대율'})).toHaveTextContent('150%')
    }
    const docks=within(screen.getByRole('radiogroup',{name:'도크 보기'}))
    const palette=docks.getByRole('radio',{name:'팔레트'})
    palette.focus();fireEvent.keyDown(palette,{key:'ArrowRight',...composition})
    expect(palette).toHaveAttribute('aria-checked','true')
    expect(palette).toHaveFocus()
    expect(screen.getByRole('complementary',{name:'고정 팔레트'})).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(source)
    expect(preview).toHaveAttribute('data-selected-event-id',selection)
    expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fixed.focus();fireEvent.keyDown(fixed,{key:'ArrowLeft'})
    expect(fit).toHaveFocus()
    expect(screen.getByLabelText('악보 캔버스')).toHaveAttribute('data-notation-sizing','fit-width')
    fireEvent.keyDown(fit,{key:'ArrowRight'})
    expect(fixed).toHaveFocus()
    expect(screen.getByRole('combobox',{name:'고정 확대율'})).toHaveTextContent('150%')
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    } finally { cleanup();media.restore() }
  })

  it('studio.r1 exposes document state and preserves stored dock widths and focus', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    localStorage.setItem('chromatics.dock-widths.v1', JSON.stringify({palette: 207, properties: 360}))
    const { App } = await import('./App')
    const app = render(<App />)
    const documentHeader = screen.getByRole('region', {name: '문서 상태'})
    expect(documentHeader).toHaveTextContent('변경 없음')
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 설정'}))
    const width = screen.getByRole('spinbutton', {name: '속성 도크 폭'})
    expect(width).toHaveValue(360)
    fireEvent.change(width, {target: {value: '280'}})
    expect(JSON.parse(localStorage.getItem('chromatics.dock-widths.v1')!)).toEqual({palette: 207, properties: 280})
    fireEvent.click(screen.getByRole('button', {name: '속성 도크 닫기'}))
    expect(screen.getByRole('button', {name: '속성 표시'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button', {name: '속성 표시'}))
    expect(screen.getByRole('button',{name:'속성 도크 설정'})).toHaveAttribute('aria-expanded','false')
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 설정'}))
    expect(screen.getByRole('spinbutton', {name: '속성 도크 폭'})).toHaveValue(280)
    openStudioWorkspace('파일')
    expect(screen.getByRole('button', {name: '프로젝트 저장'})).toHaveClass('dd-button')
    expect(screen.getByRole('button', {name: 'MusicXML로 저장'})).toHaveClass('dd-button')
    app.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button',{name:'속성 도크 설정'}))
    expect(screen.getByRole('spinbutton', {name: '속성 도크 폭'})).toHaveValue(280)
    fireEvent.keyDown(screen.getByRole('spinbutton',{name:'속성 도크 폭'}),{key:'Escape',code:'Escape'})
    fireEvent.click(screen.getByRole('button',{name:'팔레트 도크 설정'}))
    expect(screen.getByRole('spinbutton', {name: '팔레트 도크 폭'})).toHaveValue(207)
    fireEvent.keyDown(screen.getByRole('spinbutton',{name:'팔레트 도크 폭'}),{key:'Escape',code:'Escape'})
    openStudioWorkspace('표기 객체')
    const reference = `hairpin:${playbackMockState.lastScore!.hairpins![0].id}`
    chooseSpanReference(reference)
    openStudioWorkspace('파일')
    expect(screen.getByLabelText('선택 표기 ID')).toHaveTextContent(reference.split(':')[1])
    expect(screen.getByLabelText('표기 끝점')).toBeVisible()
  })

  it('ui.dock-visibility persists independent panels without changing the selected score', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const app = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'm1-d4 선택' }))
    const property = screen.getByRole('textbox', { name: '선택 요약 보표 글자' })
    fireEvent.change(property, { target: { value: 'dock-edit' } })
    fireEvent.blur(property)
    fireEvent.click(screen.getByRole('button', { name: '팔레트 표시' }))
    expect(screen.queryByRole('complementary', { name: '고정 팔레트' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: '속성 도크' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '속성 표시' }))
    expect(screen.queryByRole('complementary', { name: '속성 도크' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '속성 표시' }))
    expect(screen.getByRole('textbox', { name: '선택 요약 보표 글자' })).toHaveValue('dock-edit')
    expect(screen.getByRole('region', { name: '선택 요약' })).toHaveAttribute('data-selection-kind', 'event')
    app.unmount()
    render(<App />)
    expect(screen.getByRole('button', { name: '팔레트 표시' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '속성 표시' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('studio.page-setup cancels focus-only preset navigation and commits one undo while guides stay local', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)
    openStudioWorkspace('내보내기')
    const root = screen.getByRole('region', { name: 'PDF 페이지 설정' })
    expect(root.closest('.studio-chrome')).toBeNull()
    const original = structuredClone(playbackMockState.lastScore)
    const preset = within(root).getByRole('combobox', { name: 'PDF 설정 프리셋' })
    preset.focus();fireEvent.keyDown(preset,{key:'Enter'});fireEvent.keyDown(preset,{key:'End'});fireEvent.keyDown(preset,{key:'Escape'})
    expect(preset).toHaveFocus()
    expect(preset).toHaveTextContent('기본 A4')
    expect(playbackMockState.lastScore).toEqual(original)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
    fireEvent.keyDown(preset,{key:'Enter'});fireEvent.keyDown(preset,{key:'End'});fireEvent.keyDown(preset,{key:'Enter'})
    expect(preset).toHaveTextContent('컴팩트 파트보')
    expect(playbackMockState.lastScore?.layout?.pageSetup).toMatchObject({pageMarginMm:6,staffSizePercent:90,systemSpacingPercent:90})
    expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
    fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
    expect(playbackMockState.lastScore).toEqual(original)
    expect(preset).toHaveTextContent('기본 A4')
    fireEvent.click(within(root).getByRole('checkbox',{name:'PDF 여백 가이드 표시'}))
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute('data-show-page-margins','true')
    expect(playbackMockState.lastScore).toEqual(original)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('layout.page-setup applies V1 PDF presets to the export layout', async () => {
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
    const presetSelect = screen.getByLabelText('PDF 설정 프리셋')

    expect(presetSelect).toHaveTextContent('기본 A4')
    choosePageSetup('PDF 설정 프리셋', '출판 A4')

    expect(screen.getByLabelText('PDF 용지')).toHaveTextContent('A4')
    expect(screen.getByLabelText('PDF 방향')).toHaveTextContent('세로')
    expect(screen.getByLabelText('PDF 여백 mm')).toHaveValue(12)
    expect(screen.getByRole('slider', { name: /^PDF 보표 크기/ })).toHaveValue('95')
    expect(screen.getByRole('slider', { name: /^PDF 시스템 간격/ })).toHaveValue('125')
    expect(presetSelect).toHaveTextContent('출판 A4')
    expect(screen.getByText('PDF 페이지 설정을 갱신했습니다.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))

    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(printingPreview()).toHaveAttribute(
      'data-print-page-css-size',
      'A4 portrait'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-margin',
      '12'
    )
    expect(printingPreview()).toHaveAttribute(
      'data-print-layout-scale',
      '0.95'
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
      '12'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-staff-size-percent',
      '95'
    )
    expect(screen.getByLabelText('악보 페이지')).toHaveAttribute(
      'data-pdf-system-spacing-percent',
      '125'
    )

    finishPdfSave?.({ fileName: 'publication.pdf' })
    expect(
      await screen.findByText('publication.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()
  })

  it('import-export.export-unsupported-musicxml-report distinguishes preserved physical paper from unsupported staff scaling', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('내보내기')
    choosePageSetup('PDF 용지', 'Letter')
    fireEvent.change(screen.getByRole('slider',{name:/^PDF 보표 크기/}),{target:{value:'90'}})
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
    expect(
      await screen.findByText(
        /release-test\.musicxml을 MusicXML로 내보냈습니다\. MusicXML 내보내기 경고 1개: 보표 크기와 악보단 간격 비율은 MusicXML에 포함되지 않습니다/
      )
    ).toBeInTheDocument()
    const report = await screen.findByRole('region', {
      name: 'MusicXML 경고 상세'
    })
    expect(
      within(report).getByText('MusicXML 내보내기 경고 1개')
    ).toBeInTheDocument()
    expect(within(report).getByText('release-test.musicxml')).toBeInTheDocument()
    expect(within(report).getByText('보표 크기와 악보단 간격 비율은 MusicXML에 포함되지 않습니다. 프로젝트 파일을 함께 보관해 주세요.')).toBeVisible()
    const savedXml=vi.mocked(window.inC.musicXml.save).mock.calls.at(-1)![0].contents
    expect(parseMusicXml(savedXml).layout?.pageSetup?.pageSize).toBe('letter')
    expect(parseMusicXml(savedXml).layout?.pageSetup?.staffSizePercent).toBeUndefined()
    expect(within(report).getByText('score.layout.pageSetup')).not.toBeVisible()
    fireEvent.click(within(report).getByText('기술 정보'))
    expect(within(report).getByText('score.layout.pageSetup')).toBeVisible()
    expect(within(report).getByText('unsupported-layout')).toBeInTheDocument()
    expect(within(report).getByText('score.layout.pageSetup')).toBeInTheDocument()
  })

  it('import-export.save-pdf disables PDF export when the target page count is zero', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    openStudioWorkspace('내보내기')
    const exportTools = screen.getByRole('region', { name: '내보내기 작업' })
    expect(exportTools.closest('.studio-chrome')).toBeNull()
    const pageTarget = within(exportTools).getByLabelText('PDF 목표 장수')
    const pdfButton = within(exportTools).getByRole('button', { name: 'PDF 변환' })
    const original = structuredClone(playbackMockState.lastScore)
    const selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')

    fireEvent.change(pageTarget, { target: { value: '0' } })
    expect(pageTarget).toHaveAttribute('aria-invalid', 'true')

    expect(pageTarget).toHaveAccessibleDescription(
      'PDF 장수는 1 이상이어야 합니다.'
    )
    expect(pdfButton).toBeDisabled()
    expect(pdfButton).toHaveAccessibleDescription(
      'PDF 장수는 1 이상이어야 합니다.'
    )
    fireEvent.click(pdfButton)
    expect(window.inC.pdf.save).not.toHaveBeenCalled()
    fireEvent.change(pageTarget, { target: { value: '' } })
    expect(pdfButton).toBeDisabled()
    fireEvent.change(pageTarget, { target: { value: '3' } })
    expect(pageTarget).toHaveAttribute('aria-invalid', 'false')
    expect(pdfButton).toBeEnabled()
    expect(playbackMockState.lastScore).toEqual(original)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address', selection)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })

  it('import-export.distinguish-musicxml-save-from-autosave keeps file save separate from import and recovery', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const editor = render(<App />)

    openStudioWorkspace('파일')
    const fileActions = screen.getByLabelText('파일 작업')
    const importButton = within(fileActions).getByRole('button', {
      name: 'MusicXML 가져오기'
    })
    const saveButton = within(fileActions).getByRole('button', {
      name: 'MusicXML로 저장'
    })

    expect(importButton).not.toBe(saveButton)
    expect(saveButton).toHaveAttribute(
      'title',
      '현재 악보를 MusicXML 파일로 저장'
    )

    editor.unmount()
    window.history.replaceState({}, '', '/')
    render(<App />)

    const startActions = screen.getByLabelText('시작 작업')
    const recoveryButton = within(startActions).getByRole('button', {
      name: /복구본 없음/
    })

    expect(recoveryButton).not.toBe(importButton)
    expect(recoveryButton).not.toBe(saveButton)
    expect(recoveryButton).toHaveTextContent(
      '자동저장된 작업이 있으면 여기에 표시됩니다.'
    )
  })

  it('import-export.keyboard-save uses Ctrl+S without a current file path', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      ctrlKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: 'release-test.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })
    expect(
      vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
    ).not.toHaveProperty('filePath')
  })

  it('import-export.blocks-save-while-tuplet-input-preview-is-active', async () => {
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
    expect(preview.getAttribute('data-event-durations')).toContain('preview-')

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    expect(window.inC.musicXml.save).not.toHaveBeenCalled()
    expect(document.querySelector('.editor-status')).toHaveTextContent(
      '셋잇단음표 입력을 완료하거나 취소한 뒤 MusicXML로 저장해 주세요.'
    )
  })

  it('import-export.new-score-save suggests a Korean title filename and valid MusicXML', async () => {
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/제목-없는-악보.musicxml',
      fileName: '제목-없는-악보.musicxml'
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
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: '제목-없는-악보.musicxml'
        })
      )
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)

    expect(savedScore.title).toBe('제목 없는 악보')
    expect(
      savedScore.parts[0].staves[0].measures[0].voices[0].events
    ).toHaveLength(1)
  })

  it('import-export.saved-musicxml-preserves-note-pitches-after-reopen', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)
    const beforePitches = screen
      .getByTestId('notation-preview')
      .getAttribute('data-event-pitches')
      ?.split(',')
      .map((value) => value.replace(/^[^:]+:/, ''))

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalled()
    })
    const contents = vi.mocked(window.inC.musicXml.save).mock.calls[0]?.[0]
      .contents
    const savedScore = parseMusicXml(contents!)
    const savedPitches = savedScore.parts[0].staves[0].measures
      .flatMap((measure) => measure.voices[0].events)
      .map((event) =>
        event.type === 'note'
          ? `${event.pitch.step}${event.pitch.alter ?? ''}${event.pitch.octave}`
          : 'rest'
      )

    expect(savedPitches).toEqual(beforePitches)
  })

  it('import-export.ensemble-part-input-save-reopen preserves part-addressed notes through MusicXML', async () => {
    window.history.replaceState({}, '', '/')
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/string-quartet-parts.musicxml',
      fileName: 'string-quartet-parts.musicxml',
      openedAt: '2026-09-03T00:00:00.000Z'
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

    const entries = [
      { target: 'violin-1:staff-1', code: 'KeyE', key: 'e', step: 'E' },
      { target: 'violin-2:staff-1', code: 'KeyD', key: 'd', step: 'D' },
      { target: 'viola:staff-1', code: 'KeyC', key: 'c', step: 'C' },
      { target: 'cello:staff-1', code: 'KeyG', key: 'g', step: 'G' }
    ]

    for (const entry of entries) {
      chooseStaffTarget(entry.target)

      await waitFor(() => {
        expectStaffTarget(entry.target)
      })

      fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
      fireEvent.keyDown(window, { code: entry.code, key: entry.key })
      fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    }

    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: 'MusicXML로 저장' }))

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledWith(
        expect.objectContaining({
          suggestedName: '제목-없는-악보.musicxml',
          contents: expect.stringContaining('<score-partwise')
        })
      )
    })

    const savedScore = parseMusicXml(savedContents)
    expect(savedScore.parts.map((part) => part.id)).toEqual([
      'violin-1',
      'violin-2',
      'viola',
      'cello'
    ])
    for (const entry of entries) {
      const [partId] = entry.target.split(':')
      const savedPart = savedScore.parts.find((part) => part.id === partId)
      const firstEvent = savedPart?.staves[0]?.measures[0]?.voices[0]?.events[0]

      expect(firstEvent).toMatchObject({
        type: 'note',
        pitch: expect.objectContaining({ step: entry.step })
      })
    }

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...savedFile,
      contents: savedContents
    })

    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', {
        name: /string-quartet-parts\.musicxml/
      })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-part-structure',
        'violin-1:Violin I:1|violin-2:Violin II:1|viola:Viola:1|cello:Cello:1'
      )
      const pitchData =
        screen.getByTestId('notation-preview').getAttribute('data-all-event-pitches') ??
        ''

      for (const entry of entries) {
        const [partId] = entry.target.split(':')

        expect(
          pitchData.split(',').some(
            (pitchEntry) =>
              pitchEntry.startsWith(`${partId}:`) &&
              pitchEntry.includes(':voice-1:') &&
              new RegExp(`:${entry.step}[-#b]?[0-9]+$`).test(pitchEntry)
          )
        ).toBe(true)
      }
    })
  })

  it('lyrics.chords.save-reopen preserves edited lyrics and chord symbols through MusicXML', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    let savedContents = ''
    const savedFile = {
      filePath: '/scores/lyrics-chords.musicxml',
      fileName: 'lyrics-chords.musicxml',
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

    openStudioWorkspace('가사')
    const harmonyInput = openHarmonyProperties()
    fireEvent.change(harmonyInput, { target: { value: 'C7/G' } })
    fireEvent.blur(harmonyInput)
    expect(screen.getByText('코드 심벌을 갱신했습니다.')).toBeInTheDocument()
    openStudioWorkspace('가사')

    const lyricInput = within(
      screen.getByTestId('notation-preview')
    ).getByLabelText('선택 음표 가사')
    fireEvent.change(lyricInput, { target: { value: 'Sing' } })
    fireEvent.blur(lyricInput)
    expect(screen.getByText('가사를 갱신했습니다.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox',{name:'가사 음절'}));fireEvent.click(screen.getByRole('option',{name:'첫 음절'}))
    fireEvent.click(screen.getByText('멜리스마'))

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

    const savedScore = parseMusicXml(savedContents)
    const savedNote = savedScore.parts[0].staves[0].measures[0].voices[0]
      .events[0]

    expect(savedNote).toMatchObject({
      type: 'note',
      lyrics: [
        {
          number: 1,
          syllabic: 'begin',
          text: 'Sing',
          extend: true
        }
      ]
    })
    expect(savedScore.harmonies).toEqual([
      expect.objectContaining({
        measureId: 'measure-1',
        tick: 0,
        text: 'C7/G'
      })
    ])

    unmount()
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValue([savedFile])
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValue({
      ...savedFile,
      contents: savedContents
    })

    window.history.replaceState({}, '', '/')
    render(<App />)
    fireEvent.click(
      await screen.findByRole('button', { name: /lyrics-chords\.musicxml/ })
    )

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-lyrics',
        expect.stringContaining('event-1:1:begin:Sing')
      )
      expect(screen.getByTestId('notation-preview')).toHaveTextContent('C7/G')
    })
  })

  it('import-export.second-save-after-save-as reuses the first saved file path', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })
    await screen.findByText(
      'release-test.musicxml을 MusicXML로 내보냈습니다.'
    )

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2)
    })
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        filePath: '/scores/release-test.musicxml',
        suggestedName: 'release-test.musicxml',
        contents: expect.stringContaining('<score-partwise')
      })
    )
  })

  it('import-export.remembers-the-saved-path-even-if-autosave-cleanup-fails', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    vi.mocked(window.inC.musicXml.save).mockResolvedValue({
      filePath: '/scores/release-test.musicxml',
      fileName: 'release-test.musicxml'
    })
    vi.mocked(window.inC.autosave.clear).mockRejectedValueOnce(
      new Error('autosave cleanup failed')
    )
    const { App } = await import('./App')
    render(<App />)

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })
    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(1)
    })

    fireEvent.keyDown(window, {
      code: 'KeyS',
      metaKey: true,
      key: 's'
    })

    await waitFor(() => {
      expect(window.inC.musicXml.save).toHaveBeenCalledTimes(2)
    })
    expect(vi.mocked(window.inC.musicXml.save).mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        filePath: '/scores/release-test.musicxml'
      })
    )
  })

  it('import-export.report-pdf-result shows success and failure but not cancellation', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    const { unmount } = render(<App />)

    openStudioWorkspace('내보내기')
    vi.mocked(window.inC.pdf.save).mockResolvedValue({
      fileName: 'review.pdf'
    })
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    expect(
      await screen.findByText('review.pdf로 PDF를 만들었습니다.')
    ).toBeInTheDocument()

    unmount()
    installPreloadStub()
    vi.mocked(window.inC.pdf.save).mockResolvedValue(null)
    render(<App />)
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    await waitFor(() => expect(window.inC.pdf.save).toHaveBeenCalled())
    expect(screen.queryByText(/PDF를 만들었습니다/)).not.toBeInTheDocument()

    cleanup()
    installPreloadStub()
    vi.mocked(window.inC.pdf.save).mockRejectedValue(
      new Error('PDF 저장에 실패했습니다.')
    )
    render(<App />)
    openStudioWorkspace('내보내기')
    fireEvent.click(screen.getByRole('button', { name: 'PDF 변환' }))
    expect(
      await screen.findByText('PDF 저장에 실패했습니다.')
    ).toBeInTheDocument()
  }, 15000)

  it('shows status terms and the notation preview mount point', async () => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const { App } = await import('./App')
    render(<App />)

    expect(screen.getAllByText('4분음표').length).toBeGreaterThan(0)
    expect(screen.getAllByText('정지').length).toBeGreaterThan(0)
    expect(screen.queryByText(/A-G로 선택한/)).not.toBeInTheDocument()
    expect(screen.getByTestId('notation-preview')).toBeInTheDocument()
  })

  it('note-input.switch-same-staff-voice creates a same-staff voice and keeps note input targeted there', async () => {
    window.history.replaceState({}, '', '/?fixture=demo')
    const { App } = await import('./App')
    render(<App />)
    expandNoteDetails()

    const voiceOne = screen.getByRole('button', { name: '1성부' })
    const voiceTwo = screen.getByRole('button', { name: '2성부' })

    expect(voiceOne).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(voiceTwo)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2성부' })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-voice-ids',
        expect.stringContaining('measure-1:voice-1/voice-2')
      )
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'measure-1-voice-2-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-event-pitches',
        expect.stringContaining('measure-1-voice-2-full-measure-rest:C')
      )
    })
  })

  it('note-input.switch-staff-target moves note input to the selected grand staff staff', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('piano-grand-staff')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expectStaffTarget('part-1:staff-1')

    chooseStaffTarget('part-1:staff-2')

    await waitFor(() => {
      expectStaffTarget('part-1:staff-2')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-1-staff-2-measure-1-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-1:staff-2:part-1-staff-2-measure-1:voice-1:part-1-staff-2-measure-1-full-measure-rest:C04'
        )
      )
    })
  })

  it('note-input.switch-part-target moves note input to the selected ensemble part', async () => {
    const { App } = await import('./App')
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /새 악보 만들기/ }))
    const dialog = screen.getByRole('dialog', { name: '새 악보 만들기' })
    chooseNewScoreTemplate('duet')
    fireEvent.click(within(dialog).getByRole('button', { name: '만들기' }))

    expectStaffTarget('part-1:staff-1')

    chooseStaffTarget('part-2:staff-1')

    await waitFor(() => {
      expectStaffTarget('part-2:staff-1')
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-selected-event-id',
        'part-2-staff-1-measure-1-full-measure-rest'
      )
    })

    fireEvent.keyDown(window, { code: 'KeyN', key: 'n' })
    fireEvent.keyDown(window, { code: 'KeyC', key: 'c' })

    await waitFor(() => {
      expect(screen.getByTestId('notation-preview')).toHaveAttribute(
        'data-all-event-pitches',
        expect.stringContaining(
          'part-2:staff-1:part-2-staff-1-measure-1:voice-1:part-2-staff-1-measure-1-full-measure-rest:C04'
        )
      )
    })
  })
})
