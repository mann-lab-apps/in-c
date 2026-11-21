// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {expect, it, vi} from 'vitest'
import {createNativeProject, decodeNativeProject, encodeNativeProject} from '../../project/schema'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {chooseSpanReference, playbackMockState, registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
type Scope = 'note' | 'span'
type Status = 'stopped' | 'playing' | 'paused'
const modifiers = [{ctrlKey:true}, {metaKey:true}, {altKey:true}, {shiftKey:true}]
async function setup(scope:Scope, status:Status='stopped') {
  window.history.replaceState({}, '', '/?fixture=release-test')
  const score=createPracticeLoopFixture()
  score.slurs=[{id:'space-slur', startEventId:'upper-note-0', endEventId:'upper-note-1'}]
  const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/space.chromatics', fileName:'space.chromatics', contents:encodeNativeProject(project)})
  const {App}=await import('./App')
  const view=render(<App/>)
  fireEvent.click(screen.getByRole('button', {name:'파일'}))
  fireEvent.click(screen.getByRole('menuitem', {name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(screen.getByRole('button', {name:'upper-note-0 선택'}))
  if(scope==='span') chooseSpanReference('slur:space-slur')
  playbackMockState.value.status=status
  view.rerender(<App/>)
  playbackMockState.play.mockClear(); playbackMockState.playFromEvent.mockClear(); playbackMockState.pause.mockClear()
  return {project, view, App}
}
const snapshot=()=>({
  score:structuredClone(playbackMockState.lastScore),
  selected:screen.getByTestId('notation-preview').getAttribute('data-selected-event-id'),
  span:screen.queryByLabelText('선택 표기 ID')?.textContent,
  dirty:document.querySelector('.studio-document__state')?.textContent,
  edits:document.querySelector('.editor-status')?.textContent
})
for(const scope of ['note','span'] as const) {
  it.each(['stopped','playing','paused'] as const)(`leaves modified Space unclaimed in ${scope} scope while %s`, async status=>{
    const {project}=await setup(scope,status), before=snapshot()
    for(const extra of modifiers) {
      const event=new KeyboardEvent('keydown', {key:' ',code:'Space',bubbles:true,cancelable:true,...extra})
      fireEvent(window,event)
      expect(event.defaultPrevented,JSON.stringify(extra)).toBe(false)
    }
    expect(playbackMockState.play).not.toHaveBeenCalled()
    expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
    expect(playbackMockState.pause).not.toHaveBeenCalled()
    expect(snapshot()).toEqual(before)
    fireEvent.click(screen.getByRole('button',{name:'파일'}))
    fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 저장'}))
    await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
    expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(project.score)
  })
  it.each(['stopped','playing','paused'] as const)(`keeps plain Space's existing command exactly once in ${scope} scope while %s`, async status=>{
    await setup(scope,status)
    const event=new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true})
    fireEvent(window,event); expect(event.defaultPrevented).toBe(true)
    const expected=status==='playing'?'pause':scope==='note'&&status==='stopped'?'playFromEvent':'play'
    for(const name of ['play','playFromEvent','pause'] as const) expect(playbackMockState[name]).toHaveBeenCalledTimes(name===expected?1:0)
    expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  })
}
it('keeps composition and text/button ownership out of global playback',async()=>{
  const {project}=await setup('note')
  for(const extra of [{isComposing:true},{keyCode:229},{key:'Process'}]) fireEvent.keyDown(window,{key:' ',code:'Space',...extra})
  fireEvent.click(screen.getByRole('button',{name:'악보 정보'}))
  fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}))
  fireEvent.keyDown(screen.getByRole('textbox',{name:'악보 제목'}),{key:' ',code:'Space'})
  fireEvent.keyDown(screen.getByRole('button',{name:'메트로놈'}),{key:' ',code:'Space'})
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
  expect(playbackMockState.pause).not.toHaveBeenCalled()
  expect(playbackMockState.lastScore).toEqual(project.score)
})
