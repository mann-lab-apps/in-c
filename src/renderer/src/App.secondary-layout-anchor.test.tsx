// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createSecondaryLayoutAnchorFixture} from '../../testing/secondary-layout-anchor-fixture'
import {encodeNativeProject} from '../../project/schema'
import {focusTestBody,openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
it('shows and removes the aligned break without rewriting other stored addresses; one undo restores the original',async()=>{
 window.history.replaceState({},'','/?fixture=demo')
 const{project,primary}=createSecondaryLayoutAnchorFixture()
 project.score.layout!.systemBreakBeforeMeasureIds!.push('lower-bar-2')
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/layout.chromatics',fileName:'layout.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 fireEvent.click(screen.getByRole('button',{name:primary[1].voices[0].events[0].id+' 선택'}));openStudioWorkspace('악보')
 const remove=screen.getByRole('button',{name:'시스템 나누기 해제'});expect(remove).toHaveAttribute('aria-pressed','true');fireEvent.click(remove)
 expect(playbackMockState.lastScore!.layout?.systemBreakBeforeMeasureIds).toEqual(['lower-bar-2']);expect(playbackMockState.lastScore!.layout?.pageBreakBeforeMeasureIds).toEqual(['lower-bar-2']);expect(playbackMockState.lastScore!.parts).toEqual(project.score.parts);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 focusTestBody();fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('retains the existing direct primary-ID control when another part has fewer measures',async()=>{
 window.history.replaceState({},'','/?fixture=demo')
 const{project,primary}=createSecondaryLayoutAnchorFixture();project.score.parts[1].staves[0].measures.pop();project.score.layout={pageBreakBeforeMeasureIds:[primary[2].id]}
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/unequal-layout.chromatics',fileName:'unequal-layout.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 fireEvent.click(screen.getByRole('button',{name:primary[2].voices[0].events[0].id+' 선택'}));openStudioWorkspace('악보')
 expect(screen.getByRole('button',{name:'페이지 나누기 해제'})).toHaveAttribute('aria-pressed','true');expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
