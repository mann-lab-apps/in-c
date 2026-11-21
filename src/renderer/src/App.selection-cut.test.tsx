// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {applyScoreCommand,createFullMeasureRest,createRest} from '../../score-core'
import {buildFilteredDeleteCommand,type EditorSelection} from './editor/editor-state'
import {serializeMidi} from './midi/serialize-midi'
import {chooseSelectionFilter,chooseSpanReference,openStudioWorkspace,playbackMockState,registerAppTestHooks} from './App.test-harness'
registerAppTestHooks()
const label='선택 음표·쉼표 잘라내기'
async function setup(range=false,variant:'base'|'tie'|'full-rest'|'octave'|'span'|'notes-filter'|'rests-filter'|'slur-endpoint'='base'){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createPracticeLoopFixture(),first=score.parts[0].staves[0].measures[0].voices[0].events[0]
 if(first.type==='note'){first.articulations=['staccato'];first.lyrics=[{number:1,text:'검증',syllabic:'single'}]}
 const events=score.parts[0].staves[0].measures[0].voices[0].events
 if(variant==='tie'&&events[0].type==='note'&&events[1].type==='note'){events[0].ties={start:true};events[1].ties={stop:true}}
 if(variant==='full-rest')score.parts[0].staves[0].measures[0].voices[0].events=[createFullMeasureRest({id:'upper-note-0'})]
 if(variant==='octave')score.octaveShifts=[{id:'cut-octave',type:'8va',startEventId:'upper-note-0',endEventId:'upper-note-1'}]
 if(variant==='span')score.slurs=[{id:'cut-slur',startEventId:'upper-note-0',endEventId:'upper-note-1'}]
 if(variant==='notes-filter'||variant==='rests-filter')for(const index of variant==='notes-filter'?[2,3]:[0,1])events[index]=createRest({id:events[index].id,position:events[index].position,duration:events[index].duration})
 if(variant==='slur-endpoint')score.slurs=[{id:'cut-affected-slur',startEventId:'upper-note-0',endEventId:'upper-note-2',engraving:{offsetY:0,height:4}},{id:'cut-neighbor-slur',startEventId:'upper-note-2',endEventId:'upper-note-3',engraving:{offsetY:-2,height:2}}]
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/cut.chromatics',fileName:'cut.chromatics',contents:encodeNativeProject(project)})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 fireEvent.click(screen.getByRole('button',{name:'upper-note-0 선택'}));if(range)fireEvent.click(screen.getByRole('button',{name:'upper-note-1 선택'}),{shiftKey:true})
 const selection:EditorSelection=range?{type:'range',eventIds:['upper-note-0','upper-note-1'],anchorEventId:'upper-note-0',focusEventId:'upper-note-1'}:{type:'event',eventId:'upper-note-0'}
 return{project,selection}
}
for(const range of[false,true])it.each(['control','command','menu','toolbar'] as const)(`cuts ${range?'a simple range':'one note'} via %s and restores exactly with one undo`,async action=>{
 const {project,selection}=await setup(range),expected=applyScoreCommand(project.score,buildFilteredDeleteCommand(project.score,selection,{eventTypes:'notes-and-rests'})!).score
 if(action==='menu'){fireEvent.click(screen.getByRole('button',{name:'편집'}));fireEvent.click(screen.getByRole('menuitem',{name:label}))}
 else if(action==='toolbar'){openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:label}))}
 else fireEvent.keyDown(window,{key:'x',code:'KeyX',ctrlKey:action==='control',metaKey:action==='command'})
 expect(playbackMockState.lastScore).toEqual(expected);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
 // Clipboard is a snapshot of the source, not the now-cleared selection.
 fireEvent.click(screen.getByRole('button',{name:'lower-note-4 선택'}));if(range)fireEvent.click(screen.getByRole('button',{name:'lower-note-5 선택'}),{shiftKey:true})
 fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
 const pastedScore=structuredClone(playbackMockState.lastScore!)
 const pasted=playbackMockState.lastScore!.parts[1].staves[0].measures[1].voices[0].events
 const original=project.score.parts[0].staves[0].measures[0].voices[0].events
 for(let i=0;i<(range?2:1);i++){const {id,position,...contents}=pasted[i];const {id:sourceId,position:sourcePosition,...sourceContents}=original[i];expect(contents).toEqual(sourceContents);expect(id).not.toBe(sourceId);expect(position.tick).toBe(sourcePosition.tick)}
 expect(playbackMockState.lastScore!.parts[0]).toEqual(expected.parts[0]);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 const dir=process.env.STUDIO_SELECTION_CUT_QA_DIR
 if(dir&&action==='control'){
  const folder=join(dir,range?'range':'single');mkdirSync(folder,{recursive:true})
  for(const[name,value]of Object.entries({'source.chromatics':encodeNativeProject(project),'cleared.chromatics':encodeNativeProject({...project,score:expected}),'pasted-oracle.chromatics':encodeNativeProject({...project,score:pastedScore}),'source.mid':Buffer.from(serializeMidi(project.score)),'cleared.mid':Buffer.from(serializeMidi(expected)),'pasted.mid':Buffer.from(serializeMidi(pastedScore)),'meta.json':JSON.stringify({range,sourceIds:range?['upper-note-0','upper-note-1']:['upper-note-0'],targetIds:range?['lower-note-4','lower-note-5']:['lower-note-4']})}))writeFileSync(join(folder,name),value,{flag:'wx'})
 }
})
it.each(['notes-filter','rests-filter','slur-endpoint'] as const)('composes existing %s copy/clear and preserves the exact one-undo contract',async kind=>{
 const {project}=await setup(true,kind),filter=kind==='notes-filter'?'notes':kind==='rests-filter'?'rests':'notes-and-rests',sourceIds=kind==='slur-endpoint'?['upper-note-0','upper-note-1']:['upper-note-0','upper-note-1','upper-note-2','upper-note-3']
 if(sourceIds.length===4)fireEvent.click(screen.getByRole('button',{name:'upper-note-3 선택'}),{shiftKey:true})
 const selection:EditorSelection={type:'range',eventIds:sourceIds,anchorEventId:sourceIds[0],focusEventId:sourceIds.at(-1)!}
 const cleared=applyScoreCommand(project.score,buildFilteredDeleteCommand(project.score,selection,{eventTypes:filter})!).score
 openStudioWorkspace('파일');chooseSelectionFilter('선택 필터',filter)
 fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:label})).toBeEnabled();fireEvent.click(screen.getByRole('menuitem',{name:label}))
 expect(playbackMockState.lastScore).toEqual(cleared);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 if(kind==='slur-endpoint')expect(cleared.slurs).toEqual([project.score.slurs![1]])
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(cleared)
 fireEvent.click(screen.getByRole('button',{name:'lower-note-4 선택'}));fireEvent.click(screen.getByRole('button',{name:'lower-note-5 선택'}),{shiftKey:true})
 if(kind==='rests-filter'){
  fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(cleared);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  openStudioWorkspace('파일');chooseSelectionFilter('선택 필터','notes-and-rests')
 }
 fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true});const pasted=structuredClone(playbackMockState.lastScore!),target=pasted.parts[1].staves[0].measures[1].voices[0].events,original=project.score.parts[0].staves[0].measures[0].voices[0].events
 for(let i=0;i<2;i++){const{id,position,...body}=target[i],{id:sourceId,position:sourcePosition,...expected}=original[i];expect(body).toEqual(expected);expect(id).not.toBe(sourceId);expect(position).toEqual(sourcePosition)}
 expect(pasted.parts[0]).toEqual(cleared.parts[0]);expect(pasted.slurs).toEqual(cleared.slurs);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(cleared)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 const dir=process.env.STUDIO_SELECTION_CUT_FILTER_QA_DIR
 if(dir){const folder=join(dir,kind);mkdirSync(folder,{recursive:true});for(const[name,value]of Object.entries({'source.chromatics':encodeNativeProject(project),'cleared.chromatics':encodeNativeProject({...project,score:cleared}),'pasted-oracle.chromatics':encodeNativeProject({...project,score:pasted}),'pasted.mid':Buffer.from(serializeMidi(pasted)),'meta.json':JSON.stringify({kind,filter,sourceIds,targetIds:['lower-note-4','lower-note-5'],resetFilterForPaste:kind==='rests-filter'})}))writeFileSync(join(folder,name),value,{flag:'wx'})}
})
it('keeps modified, composition and textbox X out of score editing',async()=>{
 const {project}=await setup()
 for(const extra of[{ctrlKey:true,altKey:true},{metaKey:true,shiftKey:true},{ctrlKey:true,isComposing:true},{ctrlKey:true,keyCode:229},{ctrlKey:true,key:'Process'}])fireEvent.keyDown(window,{key:'x',code:'KeyX',...extra})
 fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}));fireEvent.keyDown(screen.getByRole('textbox',{name:'악보 제목'}),{key:'x',code:'KeyX',ctrlKey:true})
 expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
it.each(['tie','full-rest','octave','span','cross-measure','input','object-filter','event-filter'] as const)('keeps the prior clipboard and exact score/undo when %s cannot be cut',async kind=>{
 const {project}=await setup(false,['tie','full-rest','octave','span'].includes(kind)?kind as 'tie'|'full-rest'|'octave'|'span':'base')
 fireEvent.click(screen.getByRole('button',{name:'lower-note-0 선택'}));fireEvent.keyDown(window,{key:'c',code:'KeyC',ctrlKey:true})
 fireEvent.click(screen.getByRole('button',{name:'upper-note-0 선택'}))
 if(kind==='span')chooseSpanReference('slur:cut-slur')
 if(kind==='cross-measure')fireEvent.click(screen.getByRole('button',{name:'upper-note-4 선택'}),{shiftKey:true})
 if(kind==='input')fireEvent.keyDown(window,{key:'n',code:'KeyN'})
 if(kind==='object-filter'){openStudioWorkspace('파일');chooseSelectionFilter('표기 필터','dynamics')}
 if(kind==='event-filter'){openStudioWorkspace('파일');chooseSelectionFilter('선택 필터','rests')}
 fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:label})).toBeDisabled();fireEvent.keyDown(screen.getByRole('menuitem',{name:label}),{key:'Escape',code:'Escape'})
 fireEvent.keyDown(window,{key:'x',code:'KeyX',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 if(kind==='input')fireEvent.keyDown(window,{key:'Escape',code:'Escape'})
 if(kind==='object-filter'){openStudioWorkspace('파일');chooseSelectionFilter('표기 필터','none')}
 if(kind==='event-filter'){openStudioWorkspace('파일');chooseSelectionFilter('선택 필터','notes-and-rests')}
 fireEvent.click(screen.getByRole('button',{name:'upper-note-4 선택'}));fireEvent.keyDown(window,{key:'v',code:'KeyV',ctrlKey:true})
 const pasted=playbackMockState.lastScore!.parts[0].staves[0].measures[1].voices[0].events[0]
 expect(pasted).toMatchObject({type:'note',pitch:{step:'E',octave:4}});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 const guardPasted=structuredClone(playbackMockState.lastScore!)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
 const dir=process.env.STUDIO_SELECTION_CUT_QA_DIR
 if(dir&&(kind==='octave'||kind==='input')){
  const folder=join(dir,'guard-'+kind);mkdirSync(folder,{recursive:true});writeFileSync(join(folder,'source.chromatics'),encodeNativeProject(project),{flag:'wx'});writeFileSync(join(folder,'pasted.mid'),Buffer.from(serializeMidi(guardPasted)),{flag:'wx'})
 }
})
