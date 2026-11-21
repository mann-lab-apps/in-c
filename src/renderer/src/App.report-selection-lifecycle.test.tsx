// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { parseMusicXmlWithReport } from '../../musicxml'
import { createNativeProject, encodeNativeProject } from '../../project/schema'
import { createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { ownsReportTextSelection } from './editor/report-text-selection'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
afterEach(() => document.getSelection()?.removeAllRanges())
async function setup() {
 window.history.replaceState({}, '', '/?fixture=release-test')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'same.musicxml',filePath:'/fixture/same.musicxml',contents:createStaffVisibilityFixture('hidden-second')})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 const report=await screen.findByRole('region',{name:'MusicXML 경고 상세'}),technical=within(report).getByRole('button',{name:'기술 정보'})
 fireEvent.click(technical)
 const original=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'ArrowUp',code:'ArrowUp'})
 const score=structuredClone(playbackMockState.lastScore!)
 expect(score).not.toEqual(original)
 act(()=>technical.focus());select(report.querySelector('code')!)
 expect(ownsReportTextSelection(technical)).toBe(true)
 return {report,technical,original,score,selected:screen.getByTestId('notation-preview').getAttribute('data-selected-event-id')}
}
function select(node:Element) {
 const selection=document.getSelection()!,range=document.createRange();range.selectNodeContents(node)
 selection.removeAllRanges();selection.addRange(range);expect(selection.toString()).not.toBe('');return selection
}
function copy(target:Element) {
 const event=new KeyboardEvent('keydown',{key:'c',code:'KeyC',ctrlKey:true,bubbles:true,cancelable:true})
 fireEvent(target,event);return event
}
it.each(['cancel','failure'] as const)('keeps selected original diagnostics during and after an import %s',async outcome=>{
 const s=await setup();let finish!:(v:null)=>void,fail!:(e:Error)=>void
 vi.mocked(window.inC.musicXml.open).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject}))
 const selectedText=document.getSelection()!.toString()
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 expect(screen.getByRole('region',{name:'MusicXML 경고 상세'})).toBe(s.report)
 expect(copy(s.technical).defaultPrevented).toBe(false);expect(playbackMockState.lastScore).toEqual(s.score)
 await act(async()=>{if(outcome==='failure')fail(new Error('Owned replacement failed'));else finish(null)})
 await waitFor(()=>expect(screen.getByRole('button',{name:'MusicXML 가져오기'})).toBeEnabled())
 expect(screen.getByRole('region',{name:'MusicXML 경고 상세'})).toBe(s.report)
 expect(document.getSelection()!.toString()).toBe(selectedText)
 expect(copy(s.technical).defaultPrevented).toBe(false);expect(playbackMockState.lastScore).toEqual(s.score)
 expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',s.selected!)
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('저장하지 않은 변경')
 document.getSelection()!.removeAllRanges();focusTestBody()
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.original)
 fireEvent.keyDown(window,{key:'y',code:'KeyY',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(s.score)
})
it('keeps diagnostic selection when a dirty native replacement is refused before IPC',async()=>{
 const s=await setup(),selectedText=document.getSelection()!.toString();vi.mocked(window.confirm).mockReturnValue(false)
 fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
 expect(window.inC.project.open).not.toHaveBeenCalled();expect(screen.getByRole('region',{name:'MusicXML 경고 상세'})).toBe(s.report)
 expect(document.getSelection()!.toString()).toBe(selectedText);expect(copy(s.technical).defaultPrevented).toBe(false)
 expect(playbackMockState.lastScore).toEqual(s.score);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
it('restarts same-file diagnostic selection ownership after reimport',async()=>{
 const s=await setup();vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({fileName:'same.musicxml',filePath:'/fixture/same.musicxml',contents:createStaffVisibilityFixture('hidden-second')})
 fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 await waitFor(()=>expect(screen.getByRole('region',{name:'MusicXML 경고 상세'})).not.toBe(s.report))
 const fresh=screen.getByRole('region',{name:'MusicXML 경고 상세'}),technical=within(fresh).getByRole('button',{name:'기술 정보'})
 expect(s.report.isConnected).toBe(false);expect(technical).toHaveAttribute('aria-expanded','false')
 focusTestBody();expect(ownsReportTextSelection(document.body)).toBe(false)
 const score=structuredClone(playbackMockState.lastScore!);expect(copy(document.body).defaultPrevented).toBe(true)
 fireEvent.click(technical);act(()=>technical.focus());select(fresh.querySelector('code')!)
 expect(ownsReportTextSelection(technical)).toBe(true)
 expect(copy(technical).defaultPrevented).toBe(false);expect(playbackMockState.lastScore).toEqual(score)
 expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
})
it.each(['xml','native'] as const)('releases old diagnostic selection after clean %s document replacement',async format=>{
 const s=await setup(),source=createStaffVisibilityFixture('none'),parsed=parseMusicXmlWithReport(source)
 expect(parsed.report.warnings).toHaveLength(0)
 const project=createNativeProject(parsed.score)
 const file={fileName:format==='native'?'clean.chromatics':'clean.musicxml',filePath:'/fixture/clean.'+(format==='native'?'chromatics':'musicxml'),contents:format==='native'?encodeNativeProject(project):source}
 if(format==='native')vi.mocked(window.inC.project.open).mockResolvedValueOnce(file)
 else vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce(file)
 fireEvent.click(screen.getByRole('button',{name:format==='native'?'프로젝트 열기':'MusicXML 가져오기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(parsed.score))
 expect(s.report.isConnected).toBe(false);expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
 focusTestBody();expect(ownsReportTextSelection(document.body)).toBe(false);expect(copy(document.body).defaultPrevented).toBe(true)
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음')
 expect(playbackMockState.lastScore).toEqual(parsed.score)
})
