// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createMixedWarningReportFixture } from '../../testing/mixed-warning-report-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
async function setup(){
 window.history.replaceState({},'', '/?fixture=release-test')
 const xml=createMixedWarningReportFixture(),score=parseMusicXml(xml)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/mixed.musicxml',fileName:'mixed.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
 const event=score.parts[0].staves[0].measures[0].voices[0].events[0]
 fireEvent.click(screen.getByRole('button',{name:event.id+' 선택'}))
 return{score,eventId:event.id,reader:screen.getByRole('group',{name:'MusicXML 경고 상세 목록 읽기'})}
}
it('keeps reading navigation away from the selected note and playback',async()=>{
 const{score,eventId,reader}=await setup();act(()=>reader.focus());expect(reader).toHaveFocus()
 for(const key of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Enter',' '])expect(fireEvent.keyDown(reader,{key,code:key})).toBe(true)
 expect(playbackMockState.lastScore).toEqual(score);expect(playbackMockState.play).not.toHaveBeenCalled()
 expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',eventId)
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it('retains the explicit reader focus after an older native-save response',async()=>{
 const{score,eventId,reader}=await setup();let finish!:(value:{filePath:string;fileName:string})=>void
 vi.mocked(window.inC.project.save).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}))
 openStudioWorkspace('파일');const trigger=screen.getByRole('button',{name:'프로젝트 저장'})
 act(()=>trigger.focus());fireEvent.click(trigger);await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 act(()=>reader.focus());expect(reader).toHaveFocus();expect(trigger).toBeDisabled()
 await act(async()=>finish({filePath:'/fixture/owned.chromatics',fileName:'owned.chromatics'}))
 await waitFor(()=>expect(trigger).toBeEnabled());expect(reader.isConnected).toBe(true);expect(reader).toHaveFocus()
 expect(playbackMockState.lastScore).toEqual(score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',eventId)
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
 expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
