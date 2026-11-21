// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import {beforeEach,expect,it,vi} from 'vitest'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {createNewScore} from './editor/new-score'
import {openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
beforeEach(()=>Object.defineProperty(Element.prototype,'scrollIntoView',{configurable:true,value:vi.fn()}))
const setting='studio.metronome.v1'
async function setup(stored?:string){window.history.replaceState({},'','/?fixture=release-test');if(stored!==undefined)localStorage.setItem(setting,stored);const {App}=await import('./App');return render(<App/>)}
it('defaults off, saves only local preference, retains selection/score/undo/native and restores after remount',async()=>{
 const view=await setup(),score=structuredClone(playbackMockState.lastScore!),toggle=screen.getByRole('button',{name:'메트로놈'})
 expect(toggle).toHaveAttribute('aria-pressed','false');fireEvent.click(toggle);expect(toggle).toHaveAttribute('aria-pressed','true');expect(localStorage.getItem(setting)).toBe('true')
 fireEvent.keyDown(toggle,{key:' ',code:'Space'});expect(playbackMockState.play).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
 view.unmount();await setup();expect(screen.getByRole('button',{name:'메트로놈'})).toHaveAttribute('aria-pressed','true')
})
it('retains the preference but explains and disables the click for unequal staff meter without blocking playback',async()=>{
 await setup('true');const score=createNewScore({title:'Mixed meter',templateId:'duet',measureCount:2,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}});score.parts[1].staves[0].measures[0].timeSignature={beats:8,beatType:8}
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/mixed.chromatics',fileName:'mixed.chromatics',contents:encodeNativeProject(createNativeProject(score))})
 fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore?.id).toBe(score.id))
 expect(screen.getByRole('button',{name:'메트로놈'})).toBeDisabled();expect(screen.getByRole('button',{name:'메트로놈'})).toHaveAttribute('aria-pressed','false');expect(screen.getByText(/보표별 박자표 또는 마디 길이가 달라/)).toBeInTheDocument();expect(localStorage.getItem(setting)).toBe('true');expect(screen.getByRole('button',{name:'재생'})).toBeEnabled()
})
