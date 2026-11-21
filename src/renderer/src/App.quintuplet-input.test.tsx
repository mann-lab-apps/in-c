// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,within,waitFor} from '@testing-library/react'
import {it,expect,vi} from 'vitest'
import {createScore,createPart,createStaff,createMeasure,createVoice,createFullMeasureRest,validateMeasureRhythm} from '../../score-core'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {serializeMusicXml,parseMusicXml} from '../../musicxml'
import {serializeMidi} from './midi/serialize-midi'
import {registerAppTestHooks,playbackMockState,openStudioWorkspace} from './App.test-harness'
registerAppTestHooks()
async function setup(){
 window.history.replaceState({},'', '/?fixture=release-test')
 const project=createNativeProject(createScore({parts:[createPart({staves:[createStaff({measures:[createMeasure({voices:[createVoice({events:[createFullMeasureRest({id:'five-target'})]})]})]})]})]}))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/five.chromatics',fileName:'five.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 fireEvent.click(screen.getByRole('button',{name:'five-target 선택'}));return project
}
function start(){fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'다섯잇단음표 입력(5:4)'}))}
function key(key:string,code?:string,ctrlKey=false,shiftKey=false){fireEvent.keyDown(window,{key,code,ctrlKey,shiftKey})}
it('starts five sixteenths from the real Add menu, preserves pending score, cancels, then commits once with native/XML/MIDI',async()=>{
 const p=await setup();start();expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 0/5');expect(playbackMockState.lastScore).toEqual(p.score)
 key('c','KeyC');key('d','KeyD');expect(playbackMockState.lastScore).toEqual(p.score);expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 2/5')
 key('Escape','Escape');expect(playbackMockState.lastScore).toEqual(p.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 start();for(const letter of ['c','d','e','f','g'])key(letter,'Key'+letter.toUpperCase())
 const changed=structuredClone(playbackMockState.lastScore!),bar=changed.parts[0].staves[0].measures[0]
 expect(bar.voices[0].tuplets?.[0]).toMatchObject({actualNotes:5,normalNotes:4});expect(bar.voices[0].events.filter(e=>e.duration.tuplet)).toHaveLength(5);expect(validateMeasureRhythm(bar).isExact).toBe(true)
 expect(decodeNativeProject(encodeNativeProject({...p,score:changed})).score).toEqual(changed)
 expect(serializeMidi(parseMusicXml(serializeMusicXml(changed)))).toEqual(serializeMidi(changed))
 key('Escape','Escape');expect(screen.getByRole('button',{name:'다섯잇단음표 해제, 단축키 ⌘/Ctrl+3'})).toBeInTheDocument()
 key('3','Digit3',true);expect(playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].tuplets??[]).toEqual([])
 key('z','KeyZ',true);expect(playbackMockState.lastScore).toEqual(changed)
 key('z','KeyZ',true);expect(playbackMockState.lastScore).toEqual(p.score);expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 4/5');key('Escape','Escape');key('z','KeyZ',true,true);expect(playbackMockState.lastScore).toEqual(changed)
})
it.each(['pdf','midi'] as const)('keeps the initial five-input copy notice after Escape during %s disk save',async format=>{
 const p=await setup();start();key('c','KeyC')
 let finish!:(value:{filePath:string;fileName:string})=>void
 const callback=()=>new Promise<{filePath:string;fileName:string}>(resolve=>{finish=resolve})
 if(format==='pdf')vi.mocked(window.inC.pdf.save).mockImplementationOnce(callback);else vi.mocked(window.inC.midi.save).mockImplementationOnce(callback)
 openStudioWorkspace('내보내기');const b=screen.getByRole('button',{name:format==='pdf'?'PDF 변환':'MIDI 내보내기'});await waitFor(()=>expect(b).toBeEnabled());fireEvent.click(b)
 await waitFor(()=>expect(format==='pdf'?window.inC.pdf.save:window.inC.midi.save).toHaveBeenCalledOnce());key('Escape','Escape')
 await act(async()=>finish({filePath:'/fixture/five-copy.'+format,fileName:'five-copy.'+format}))
 await waitFor(()=>expect(document.querySelector('.studio-status__result')).toHaveTextContent('미완성 다섯잇단음표 입력은 포함되지 않았습니다.'))
 expect(document.querySelector('.studio-status__result')).not.toHaveTextContent('미완성 셋잇단음표');expect(playbackMockState.lastScore).toEqual(p.score)
})
it('blocks project save while five-input is pending without calling the bridge',async()=>{
 const p=await setup();start();key('c','KeyC');key('s','KeyS',true)
 await waitFor(()=>expect(document.querySelector('.studio-status__result')).toHaveTextContent('다섯잇단음표 입력을 완료하거나 취소'))
 expect(window.inC.project.save).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(p.score)
})
it('keeps Ctrl/Cmd+3 as cancellation of pending input and prevents nested five input',async()=>{
 const p=await setup();start();key('c','KeyC')
 fireEvent.click(screen.getByRole('button',{name:'추가'}));expect(screen.getByRole('menuitem',{name:'다섯잇단음표 입력(5:4)'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'추가'}))
 key('3','Digit3',true);expect(playbackMockState.lastScore).toEqual(p.score);expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 입력을 취소했습니다.')
})
it('returns native keyboard input from the Add menu to the actual score surface',async()=>{
 const p=await setup();start()
 expect(document.activeElement?.closest('.score-canvas')).not.toBeNull()
 fireEvent.keyDown(document.activeElement!,{key:'c',code:'KeyC'})
 expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 1/5');expect(playbackMockState.lastScore).toEqual(p.score)
})
