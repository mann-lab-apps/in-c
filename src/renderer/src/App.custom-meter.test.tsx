// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {createNote,createDuration} from '../../score-core'
import {createNewScore} from './editor/new-score'
import {createNativeProject,encodeNativeProject,decodeNativeProject} from '../../project/schema'
import {parseMusicXml,serializeMusicXml} from '../../musicxml'
import {openStudioWorkspace,registerAppTestHooks,playbackMockState} from './App.test-harness'
registerAppTestHooks()
async function openDialog(withWholeNote=false){
 window.history.replaceState({},'', '/?fixture=release-test')
 const source=createNativeProject(createNewScore({title:'Custom meter',templateId:'string-quartet',measureCount:3,keySignature:{fifths:0},timeSignature:{beats:4,beatType:4}}))
 if(withWholeNote)source.score.parts[0].staves[0].measures[1].voices[0].events=[createNote({id:'protected-whole',pitch:{step:'C',octave:4},duration:createDuration('whole')})]
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/meter.chromatics',fileName:'meter.chromatics',contents:encodeNativeProject(source)})
 vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/meter.chromatics',fileName:'meter.chromatics'})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score))
 fireEvent.click(screen.getByRole('button',{name:'2마디 선택'}));openStudioWorkspace('악보');const opener=screen.getByRole('button',{name:'사용자 지정 박자표…'});opener.focus();fireEvent.click(opener)
 return{source,dialog:within(screen.getByRole('dialog',{name:'사용자 지정 박자표'}))}
}
it.each([{beats:5,beatType:4},{beats:7,beatType:8}])('applies custom $beats/$beatType to one bar/staff with exact undo and native/XML preservation',async meter=>{
 const{source,dialog}=await openDialog();fireEvent.change(dialog.getByRole('spinbutton',{name:'박자 분자'}),{target:{value:String(meter.beats)}})
 fireEvent.click(dialog.getByRole('combobox',{name:'박자 분모'}));fireEvent.click(screen.getByRole('option',{name:String(meter.beatType)}));fireEvent.click(dialog.getByRole('button',{name:'적용'}))
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:'사용자 지정 박자표'})).not.toBeInTheDocument())
 await waitFor(()=>expect(screen.getByRole('button',{name:'사용자 지정 박자표…'})).toHaveFocus())
 const changed=structuredClone(playbackMockState.lastScore!)
 expect(changed.parts[0].staves[0].measures[1].timeSignature).toEqual(meter)
 expect(changed.parts[0].staves[0].measures[0]).toEqual(source.score.parts[0].staves[0].measures[0]);expect(changed.parts[0].staves[0].measures[2]).toEqual(source.score.parts[0].staves[0].measures[2]);expect(changed.parts.slice(1)).toEqual(source.score.parts.slice(1))
 expect(screen.getByRole('combobox',{name:'박자표'})).toHaveTextContent(`${meter.beats}/${meter.beatType}`)
 expect(decodeNativeProject(encodeNativeProject({...source,score:changed})).score).toEqual(changed)
 expect(parseMusicXml(serializeMusicXml(changed)).parts[0].staves[0].measures[1].timeSignature).toEqual(meter)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
})
it('keeps invalid values local and protects IME, save and cancel',async()=>{
 const{source,dialog}=await openDialog();const field=dialog.getByRole('spinbutton',{name:'박자 분자'})
 for(const value of ['0','129','3.5','']){fireEvent.change(field,{target:{value}});fireEvent.click(dialog.getByRole('button',{name:'적용'}));expect(playbackMockState.lastScore).toEqual(source.score);expect(field).toHaveAttribute('aria-invalid','true')}
 fireEvent.change(field,{target:{value:'5'}});fireEvent.compositionStart(field);fireEvent.keyDown(field,{key:'Enter',isComposing:true});fireEvent.submit(dialog.getByRole('form',{name:'사용자 지정 박자표'}));fireEvent.keyDown(field,{key:'Escape',isComposing:true})
 expect(screen.getByRole('dialog',{name:'사용자 지정 박자표'})).toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.compositionEnd(field);fireEvent.keyDown(field,{key:'s',code:'KeyS',ctrlKey:true});expect(window.inC.project.save).not.toHaveBeenCalled();expect(dialog.getByRole('alert')).toHaveTextContent('적용하거나 취소')
 fireEvent.keyDown(field,{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog',{name:'사용자 지정 박자표'})).not.toBeInTheDocument());expect(playbackMockState.lastScore).toEqual(source.score)
})

it('keeps the dialog and original notes when a smaller meter would truncate music',async()=>{
 const{source,dialog}=await openDialog(true)
 fireEvent.change(dialog.getByRole('spinbutton',{name:'박자 분자'}),{target:{value:'3'}});fireEvent.click(dialog.getByRole('button',{name:'적용'}))
 expect(dialog.getByRole('alert')).toHaveTextContent('새 박자표에 맞지 않습니다');expect(playbackMockState.lastScore).toEqual(source.score)
 fireEvent.click(dialog.getByRole('button',{name:'취소'}));expect(screen.queryByRole('dialog',{name:'사용자 지정 박자표'})).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(source.score)
})
