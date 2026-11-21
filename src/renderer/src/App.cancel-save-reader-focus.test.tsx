// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createStaffVisibilityFixture } from '../../testing/staff-visibility-fixture'
import { focusTestBody, openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
afterEach(() => document.getSelection()?.removeAllRanges())
async function setup(channel: 'project' | 'xml') {
 window.history.replaceState({}, '', '/?fixture=release-test')
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({ fileName:'reader.musicxml', filePath:'/fixture/reader.musicxml', contents:createStaffVisibilityFixture('hidden-second') })
 const { App } = await import('./App'); render(<App />); openStudioWorkspace('파일')
 fireEvent.click(screen.getByRole('button', {name:'MusicXML 가져오기'}))
 await screen.findByRole('region', {name:'MusicXML 경고 상세'})
 if (channel === 'project') {
  vi.mocked(window.inC.project.save).mockResolvedValueOnce({fileName:'reader.chromatics', filePath:'/fixture/reader.chromatics'})
  fireEvent.click(screen.getByRole('button', {name:'프로젝트 저장'}))
  await waitFor(() => expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
 }
 const original = structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window, {key:'ArrowUp', code:'ArrowUp'})
 const score = structuredClone(playbackMockState.lastScore!)
 expect(score).not.toEqual(original)
 vi.mocked(window.inC.project.open).mockRejectedValueOnce(new Error('Owned original reader failure /fixture/read.chromatics'))
 fireEvent.click(screen.getByRole('button', {name:'프로젝트 열기'}))
 const group = await screen.findByRole('group', {name:'프로젝트 열기 기술 정보'}), trigger = within(group).getByRole('button', {name:'기술 정보'})
 fireEvent.click(trigger); act(() => trigger.focus())
 const range = document.createRange(); range.selectNodeContents(within(group).getByText('Owned original reader failure /fixture/read.chromatics'))
 document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range)
 expect(trigger).toHaveFocus(); expect(document.getSelection()!.toString()).not.toBe('')
 return {original, score, trigger, selected:screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'), result:document.querySelector('.studio-status__result')!.textContent}
}
const cases = (['project','xml'] as const).flatMap(channel => (['cancel','new-field','wheel','new-open','success','failure'] as const).map(scenario => ({channel,scenario})))
it.each(cases)('keeps $channel cancelled reader focus ownership for $scenario', async ({channel,scenario}) => {
 const s = await setup(channel)
 let finish!:(result:{filePath:string;fileName:string}|null)=>void, fail!:(error:Error)=>void
 const operation = channel === 'project' ? vi.mocked(window.inC.project.save) : vi.mocked(window.inC.musicXml.save)
 const beforeCalls = operation.mock.calls.length
 operation.mockImplementationOnce(() => new Promise((resolve,reject) => {finish=resolve; fail=reject}))
 fireEvent.keyDown(s.trigger, {key:'s', code:'KeyS', ctrlKey:true})
 await waitFor(() => expect(operation).toHaveBeenCalledTimes(beforeCalls+1))
 expect(screen.queryByRole('group', {name:'프로젝트 열기 기술 정보'})).not.toBeInTheDocument()
 expect(s.trigger.isConnected).toBe(false)
 focusTestBody()
 let input:HTMLElement|undefined, endOpen:((result:null)=>void)|undefined
 if (scenario === 'new-field') {
  openStudioWorkspace('음표'); input = screen.getByRole('textbox', {name:'선택 요약 보표 글자'}); act(() => input!.focus())
  fireEvent.compositionStart(input); fireEvent.change(input, {target:{value:'조합 중인 초안'}})
 }
 if (scenario === 'wheel') fireEvent.wheel(document.documentElement, {deltaY:120})
 if (scenario === 'new-open') {
  vi.mocked(window.inC.project.open).mockImplementationOnce(() => new Promise(resolve => {endOpen=resolve}))
  openStudioWorkspace('파일'); const opener = screen.getByRole('button', {name:'프로젝트 열기'}); act(() => opener.focus()); fireEvent.click(opener)
  await waitFor(() => expect(opener).toBeDisabled()); focusTestBody()
 }
 await act(async () => { if (scenario === 'failure') fail(new Error('Owned new save failure')); else finish(scenario === 'success' ? {filePath:'/fixture/saved.'+(channel==='project'?'chromatics':'musicxml'),fileName:'saved.'+(channel==='project'?'chromatics':'musicxml')} : null) })
 await waitFor(() => expect(document.querySelector('.studio-document__state')).not.toHaveTextContent('저장 중'))
 if (scenario === 'cancel' || scenario === 'new-field' || scenario === 'wheel' || scenario === 'new-open') {
  expect(document.querySelector('.studio-status__result')!.textContent).toBe(s.result)
  const current = within(screen.getByRole('group', {name:'프로젝트 열기 기술 정보'})).getByRole('button', {name:'기술 정보'})
  expect(current).toHaveAttribute('aria-expanded','false')
  if (scenario === 'cancel') {
   await waitFor(() => expect(current).toHaveFocus())
   fireEvent.keyDown(current, {key:'ArrowUp',code:'ArrowUp'})
   expect(playbackMockState.lastScore).toEqual(s.score)
  } else if (scenario === 'new-field') {
   expect(input).toHaveFocus(); expect(input).toHaveValue('조합 중인 초안')
   fireEvent.compositionEnd(input!); fireEvent.keyDown(input!, {key:'Escape',code:'Escape'}); fireEvent.blur(input!)
  } else { expect(document.body).toHaveFocus(); expect(current).not.toHaveFocus() }
 } else {
  expect(screen.queryByRole('group', {name:'프로젝트 열기 기술 정보'})).not.toBeInTheDocument()
  expect(document.body).toHaveFocus()
 }
 expect(playbackMockState.lastScore).toEqual(s.score)
 expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',s.selected!)
 expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 expect(document.querySelector('.studio-document__state')).toHaveTextContent(scenario==='success'?'변경 없음':'저장하지 않은 변경')
 if (endOpen) await act(async()=>endOpen!(null))
 focusTestBody(); fireEvent.keyDown(window, {key:'z',code:'KeyZ',ctrlKey:true}); expect(playbackMockState.lastScore).toEqual(s.original)
})
