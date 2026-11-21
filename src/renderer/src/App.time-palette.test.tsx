// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {createDuration,createNote} from '../../score-core'
import {createNewScore,timeSignaturePresets} from './editor/new-score'
import {playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
async function setup(id='3-4',whole=false){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createNewScore({title:'박자표 팔레트 검증',templateId:'duet',measureCount:3,keySignature:{fifths:0,mode:'major'},timeSignature:id==='4-4'?{beats:3,beatType:4}:{beats:4,beatType:4}})
 const target=score.parts[0].staves[0].measures[1]
 for(const part of score.parts)for(const staff of part.staves)for(const bar of staff.measures){if(bar===target)continue;bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,duration:id==='4-4'?createDuration('half',1):createDuration('whole'),pitch:{step:'C',octave:part===score.parts[0]?4:3}})]}
 if(whole)target.voices[0].events=[createNote({id:target.voices[0].events[0].id,duration:createDuration('whole'),pitch:{step:'C',octave:4}})]
 else target.voices[0].events[0].fermata=true
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/time-palette.chromatics',fileName:'time-palette.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}))
 await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 const event=target.voices[0].events[0]
 fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}))
 fireEvent.click(screen.getByRole('button',{name:'음자리표·조표·박자표'}))
 return{project,target:project.score.parts[0].staves[0].measures[1],event,palette:within(screen.getByRole('complementary',{name:'고정 팔레트'}))}
}
const label=(id:string)=>`${timeSignaturePresets.find(p=>p.id===id)!.label} · 선택 보표의 한 마디에 적용`
it.each(timeSignaturePresets)('applies existing $label preset to one bar with one undo and native preservation',async preset=>{
 const{project,target,palette}=await setup(preset.id)
 expect(palette.getByLabelText('박자표 적용 범위')).toHaveTextContent('2마디만')
 const tile=palette.getByRole('button',{name:label(preset.id)});expect(tile).toBeEnabled();fireEvent.click(tile)
 const changed=structuredClone(playbackMockState.lastScore!)
 expect(changed.parts[0].staves[0].measures[1].timeSignature).toEqual(preset.value)
 expect(changed.parts[0].staves[0].measures[1].voices).toEqual(target.voices)
 expect(changed.parts[0].staves[0].measures[0]).toEqual(project.score.parts[0].staves[0].measures[0]);expect(changed.parts[0].staves[0].measures[2]).toEqual(project.score.parts[0].staves[0].measures[2]);expect(changed.parts[1]).toEqual(project.score.parts[1])
 expect(tile).toHaveAttribute('aria-pressed','true');fireEvent.click(tile);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(document.querySelector('.studio-status')).toHaveTextContent('이미 같은 박자표')
 if(preset.id==='6-8'){expect(changed.tempo).toMatchObject({bpm:120,beatUnit:'quarter',dots:1});expect(palette.getByLabelText('박자표 적용 범위')).toHaveTextContent('기본 빠르기 음가')}
 expect(decodeNativeProject(encodeNativeProject({...project,score:changed})).score).toEqual(changed)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 const dir=process.env.STUDIO_TIME_PALETTE_QA_DIR
 if(dir&&['3-4','6-8'].includes(preset.id)){
  mkdirSync(dir,{recursive:true});for(const[name,value]of[['source',project],['expected',{...project,score:changed}]]as const)writeFileSync(join(dir,`${preset.id}-${name}.chromatics`),encodeNativeProject(value),{flag:'wx'})
  writeFileSync(join(dir,preset.id+'.json'),JSON.stringify({id:preset.id,label:preset.label,value:preset.value,targetEventId:target.voices[0].events[0].id,targetMeasureId:target.id,firstEventId:project.score.parts[0].staves[0].measures[0].voices[0].events[0].id},null,2),{flag:'wx'})
 }
})
it('rejects a shorter meter which would truncate an authored note',async()=>{
 const{project,palette}=await setup('3-4',true);fireEvent.click(palette.getByRole('button',{name:label('3-4')}))
 expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-status')).toHaveTextContent('리듬이 새 박자표에 맞지 않습니다')
})
it('keeps search and family disclosure local while preserving the settings entry',async()=>{
 const{project,palette}=await setup();fireEvent.change(palette.getByRole('searchbox',{name:'표기 기호 검색'}),{target:{value:'6/8'}})
 expect(palette.getByRole('button',{name:label('6-8')})).toBeEnabled();expect(palette.queryByRole('button',{name:label('3-4')})).not.toBeInTheDocument();expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.click(palette.getByRole('button',{name:'표기 기호 검색 지우기'}));fireEvent.click(palette.getByRole('button',{name:'음자리표·조표·박자표'}));expect(palette.queryByRole('button',{name:label('3-4')})).not.toBeInTheDocument()
 fireEvent.click(palette.getByRole('button',{name:'음자리표·조표·박자표'}));fireEvent.click(palette.getByRole('button',{name:'박자표 설정 열기'}));await waitFor(()=>expect(screen.getByRole('combobox',{name:'박자표'})).toHaveFocus());expect(playbackMockState.lastScore).toEqual(project.score)
})
it('does not apply while input, pending tuplets or range selection owns editing',async()=>{
 const{project,palette,event}=await setup();const tile=palette.getByRole('button',{name:label('3-4')})
 fireEvent.keyDown(window,{key:'n',code:'KeyN'});expect(tile).toBeDisabled();fireEvent.click(tile);expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.keyDown(window,{key:'Escape'});fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'다섯잇단음표 입력(5:4)'}));fireEvent.keyDown(window,{key:'c',code:'KeyC'})
 expect(tile).toBeDisabled();fireEvent.click(tile);expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('다섯잇단음표 1/5')
 fireEvent.keyDown(window,{key:'3',code:'Digit3',ctrlKey:true});fireEvent.click(screen.getByRole('button',{name:`${project.score.parts[0].staves[0].measures[0].voices[0].events[0].id} 선택`}));fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}),{shiftKey:true});expect(tile).toBeDisabled();expect(playbackMockState.lastScore).toEqual(project.score)
})
