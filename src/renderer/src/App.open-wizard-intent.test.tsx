// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks, openStudioWorkspace, playbackMockState } from './App.test-harness'
import { createPrintHeaderFixture } from '../../testing/print-header-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { parseMusicXml, serializeMusicXml } from '../../musicxml'

describe('newer wizard intent owns pending document opening', () => {
  registerAppTestHooks()
  it.each([
    ['native', 'success', 'open'], ['native', 'failure', 'open'],
    ['native', 'success', 'cancel'], ['native', 'success', 'created'],
    ['xml', 'success', 'open'], ['xml', 'failure', 'cancel']
  ] as const)('isolates %s %s after wizard %s and permits an explicit fresh retry', async (entry, outcome, phase) => {
    window.history.replaceState({}, '', '/?fixture=release-test')
    const project = createPrintHeaderFixture('short'); project.score.title = 'Late file score'
    const xml = serializeMusicXml(project.score), native = entry === 'native'
    const file = { filePath: '/owned/late.' + (native ? 'chromatics' : 'musicxml'), fileName: 'late.' + (native ? 'chromatics' : 'musicxml'), contents: native ? encodeNativeProject(project) : xml }
    let finish!: (value: typeof file) => void, fail!: (reason: Error) => void
    const pending = new Promise<typeof file>((resolve, reject) => { finish = resolve; fail = reject })
    const bridge = native ? vi.mocked(window.inC.project.open) : vi.mocked(window.inC.musicXml.open)
    bridge.mockImplementationOnce(() => pending)
    const { App } = await import('./App'); render(<App />)
    const original = structuredClone(playbackMockState.lastScore)
    fireEvent.keyDown(window, { code: 'ArrowUp', key: 'ArrowUp', altKey: true })
    const editedBeforeOpen = structuredClone(playbackMockState.lastScore)
    expect(editedBeforeOpen).not.toEqual(original)
    openStudioWorkspace('파일')
    const startOpen = async () => {
      fireEvent.click(screen.getByRole('button', { name: native ? '프로젝트 열기' : 'MusicXML 가져오기' }))
    }
    await startOpen(); expect(bridge).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '새 악보 만들기' }))
    const wizard = within(screen.getByRole('dialog', { name: '새 악보 만들기' }))
    const title = wizard.getByRole('textbox', { name: '제목' })
    fireEvent.change(title, { target: { value: 'Later wizard draft' } }); title.focus()
    if (phase === 'cancel') fireEvent.click(wizard.getByRole('button', { name: '취소' }))
    if (phase === 'created') fireEvent.click(wizard.getByRole('button', { name: '만들기' }))
    const before = structuredClone(playbackMockState.lastScore), selection = screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')
    const status = document.querySelector('.editor-status')!.textContent
    const dirty = document.querySelector('.studio-document')!.textContent
    await act(async () => { if (outcome === 'success') finish(file); else fail(new Error('Owned stale open failure')) })
    expect(playbackMockState.lastScore).toEqual(before)
    expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id', selection)
    expect(document.querySelector('.editor-status')!.textContent).toBe(status)
    expect(document.querySelector('.studio-document')!.textContent).toBe(dirty)
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
    if (phase === 'open') {
      expect(title).toHaveValue('Later wizard draft'); expect(title).toHaveFocus()
      fireEvent.click(wizard.getByRole('button', { name: '취소' }))
    }
    if (phase !== 'created') {
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true })
      expect(playbackMockState.lastScore).toEqual(original)
      fireEvent.keyDown(window, { code: 'KeyZ', ctrlKey: true, shiftKey: true })
      expect(playbackMockState.lastScore).toEqual(editedBeforeOpen)
    }
    openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 저장' }))
    await waitFor(() => expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(before)
    bridge.mockResolvedValueOnce(file)
    await startOpen()
    await waitFor(() => expect(playbackMockState.lastScore?.title).toBe('Late file score'))
    expect(playbackMockState.lastScore).toEqual(native ? project.score : parseMusicXml(xml))
  })
  it.each([['xml', 'success'], ['native', 'failure']] as const)('isolates recent %s %s from a later startup wizard and permits retry', async (format, outcome) => {
    window.history.replaceState({}, '', '/')
    const project = createPrintHeaderFixture('short'); project.score.title = 'Late recent score'
    const xml = serializeMusicXml(project.score),file={filePath:'/owned/recent.'+format,fileName:'recent.'+format,contents:format==='native'?encodeNativeProject(project):xml}
    let finish!:(value:typeof file)=>void,fail!:(error:Error)=>void
    vi.mocked(window.inC.recentMusicXml.open).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
    vi.mocked(window.inC.recentMusicXml.list).mockResolvedValueOnce([{filePath:file.filePath,fileName:file.fileName,openedAt:'2026-10-30T00:00:00Z',...(format==='native'?{format:'native' as const}:{})}])
    const {App}=await import('./App');render(<App />)
    fireEvent.click(await screen.findByRole('button',{name:new RegExp(file.fileName.replaceAll('.','\\.'))}))
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const wizard=within(screen.getByRole('dialog',{name:'새 악보 만들기'})),title=wizard.getByRole('textbox',{name:'제목'})
    fireEvent.change(title,{target:{value:'Later startup draft'}});title.focus()
    if(outcome==='failure')fireEvent.click(wizard.getByRole('button',{name:'취소'}))
    const before=structuredClone(playbackMockState.lastScore),status=document.querySelector('.editor-status')?.textContent??null,startBefore=document.querySelector('.studio-start')?.textContent
    await act(async()=>{if(outcome==='success')finish(file);else fail(new Error('Owned stale recent failure'))})
    expect(playbackMockState.lastScore).toEqual(before)
    expect(document.querySelector('.editor-status')?.textContent??null).toBe(status)
    expect(document.querySelector('.studio-start')?.textContent).toBe(startBefore)
    expect(window.inC.recentMusicXml.add).not.toHaveBeenCalled()
    if(outcome==='success'){
      expect(title).toHaveValue('Later startup draft');expect(title).toHaveFocus()
      fireEvent.click(wizard.getByRole('button',{name:'취소'}))
    }
    vi.mocked(window.inC.recentMusicXml.open).mockResolvedValueOnce(file)
    fireEvent.click(screen.getByRole('button',{name:new RegExp(file.fileName.replaceAll('.','\\.'))}))
    await waitFor(()=>expect(playbackMockState.lastScore?.title).toBe('Late recent score'))
    openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(format==='native'?project.score:parseMusicXml(xml))
  })
  it.each(['native','xml'] as const)('keeps an already opened %s document when its recent-index failure arrives during a later wizard',async format=>{
    window.history.replaceState({},'','/?fixture=release-test')
    const project=createPrintHeaderFixture('short'),file={filePath:'/owned/opened',fileName:'opened',contents:format==='native'?encodeNativeProject(project):serializeMusicXml(project.score)}
    let fail!:(error:Error)=>void
    vi.mocked(window.inC.recentMusicXml.add).mockImplementationOnce(()=>new Promise((_resolve,reject)=>{fail=reject}))
    if(format==='native')vi.mocked(window.inC.project.open).mockResolvedValueOnce(file)
    else vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce(file)
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'}))
    await waitFor(()=>expect(playbackMockState.lastScore?.title).toBe('Header'))
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    const title=within(screen.getByRole('dialog',{name:'새 악보 만들기'})).getByRole('textbox',{name:'제목'})
    fireEvent.change(title,{target:{value:'Newer metadata draft'}});title.focus()
    const before=structuredClone(playbackMockState.lastScore),status=document.querySelector('.editor-status')!.textContent
    await act(async()=>fail(new Error('Owned old index failure')))
    expect(playbackMockState.lastScore).toEqual(before);expect(document.querySelector('.editor-status')!.textContent).toBe(status)
    expect(title).toHaveValue('Newer metadata draft');expect(title).toHaveFocus()
  })
  it.each([['native','success'],['native','failure'],['xml','success'],['xml','failure']] as const)('permits a fresh %s open before stale %s arrives without unlocking the new in-flight request',async (entry,outcome)=>{
    window.history.replaceState({},'','/?fixture=release-test')
    const old=createPrintHeaderFixture('short'),fresh=structuredClone(old);old.score.title='Stale ignored';fresh.score.title='Newest explicit open'
    const file=(project:typeof old)=>({filePath:'/owned/'+project.score.title,fileName:project.score.title,contents:entry==='native'?encodeNativeProject(project):serializeMusicXml(project.score)})
    let finishA!:(value:ReturnType<typeof file>)=>void,failA!:(reason:Error)=>void,finishB!:(value:ReturnType<typeof file>)=>void
    const bridge=entry==='native'?vi.mocked(window.inC.project.open):vi.mocked(window.inC.musicXml.open),label=entry==='native'?'프로젝트 열기':'MusicXML 가져오기'
    bridge.mockImplementationOnce(()=>new Promise((resolve,reject)=>{finishA=resolve;failA=reject})).mockImplementationOnce(()=>new Promise(resolve=>{finishB=resolve}))
    const {App}=await import('./App');render(<App />);openStudioWorkspace('파일')
    fireEvent.click(screen.getByRole('button',{name:label}))
    fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
    fireEvent.click(within(screen.getByRole('dialog',{name:'새 악보 만들기'})).getByRole('button',{name:'취소'}))
    fireEvent.click(screen.getByRole('button',{name:label}))
    expect(bridge).toHaveBeenCalledTimes(2)
    const baseline=structuredClone(playbackMockState.lastScore),status=document.querySelector('.editor-status')!.textContent
    await act(async()=>{if(outcome==='success')finishA(file(old));else failA(new Error('Owned stale A failure'))})
    expect(playbackMockState.lastScore).toEqual(baseline);expect(document.querySelector('.editor-status')!.textContent).toBe(status)
    fireEvent.click(screen.getByRole('button',{name:label}))
    expect(bridge).toHaveBeenCalledTimes(2)
    await act(async()=>finishB(file(fresh)))
    expect(playbackMockState.lastScore).toEqual(entry==='native'?fresh.score:parseMusicXml(file(fresh).contents))
    expect(window.inC.recentMusicXml.add).toHaveBeenCalledOnce()
  })
})
