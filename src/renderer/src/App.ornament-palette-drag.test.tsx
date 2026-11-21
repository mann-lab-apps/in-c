// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {createRest,type Ornament} from '../../score-core'
import {serializeMidi} from './midi/serialize-midi'
import {playbackMockState,registerAppTestHooks,chooseScoreView} from './App.test-harness'
registerAppTestHooks()
const labels={trill:'트릴',mordent:'모르덴트','inverted-mordent':'프랄트릴러',turn:'턴'}as const
function data(){const values:Record<string,string>={};return{effectAllowed:'none',dropEffect:'none',get types(){return Object.keys(values)},setData:(t:string,v:string)=>{values[t]=v},getData:(t:string)=>values[t]??''}}
async function setup(value:Ornament='trill',already=false){
 window.history.replaceState({},'','/?fixture=release-test');const score=createPracticeLoopFixture();score.title='장식음 끌기 '+value
 const first=score.parts[0].staves[0].measures[0].voices[0].events[0],bar=score.parts[1].staves[0].measures[1],target=bar.voices[0].events[0],next=bar.voices[0].events[1]
 if(first.type!=='note'||target.type!=='note'||next.type!=='note')throw Error('Owned note fixture')
 first.ornaments=['mordent'];target.ornaments=already?[value]:[value==='turn'?'trill':'turn'];target.articulations=['accent'];target.graceNotes=[{pitch:{step:'D',octave:4},slash:true}];target.fermata=true;target.ties={start:true};next.ties={stop:true}
 const rest=score.parts[0].staves[0].measures[0].voices[0].events[3];score.parts[0].staves[0].measures[0].voices[0].events[3]=createRest({id:rest.id,position:rest.position,duration:rest.duration})
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)));vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'ornament.chromatics',filePath:'/fixture/ornament.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(screen.getByRole('button',{name:first.id+' 선택'}));fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}));fireEvent.click(screen.getByRole('button',{name:'장식음'}))
 const tile=screen.getByRole('button',{name:labels[value]+' 적용 또는 해제'}),node=document.createElementNS('http://www.w3.org/2000/svg','g');node.classList.add('notation-event','vf-stavenote');node.dataset.eventId=target.id;node.dataset.measureId=bar.id;node.getBoundingClientRect=()=>({x:100,y:200,left:100,top:200,right:120,bottom:240,width:20,height:40,toJSON(){}});screen.getByTestId('notation-preview').append(node)
 return{project,first,target,bar,tile,node,rest}
}
it.each(['trill','mordent','inverted-mordent','turn']as const)('adds %s to the dropped event without replacing other marks, and has one undo',async value=>{
 const{project,first,target,bar,tile,node}=await setup(value),transfer=data();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:transfer});fireEvent.dragOver(node,{dataTransfer:transfer});expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument();expect(screen.getByLabelText('장식음 끌기 안내')).toHaveTextContent('2마디');expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.drop(node,{dataTransfer:transfer});const changed=structuredClone(playbackMockState.lastScore!),expected=structuredClone(project.score),note=expected.parts[1].staves[0].measures[1].voices[0].events[0];if(note.type!=='note')throw Error('Note');note.ornaments=[...note.ornaments!,value];expect(changed).toEqual(expected);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
 const duplicate=data();fireEvent.dragStart(tile,{dataTransfer:duplicate});fireEvent.drop(node,{dataTransfer:duplicate});expect(playbackMockState.lastScore).toEqual(changed);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed);expect(decodeNativeProject(encodeNativeProject({...project,score:changed})).score).toEqual(changed)
 const dir=process.env.STUDIO_ORNAMENT_DRAG_QA_DIR;if(dir){mkdirSync(dir,{recursive:true});for(const[name,score]of[['source',project.score],['expected',changed]]as const)writeFileSync(join(dir,value+'-'+name+'.chromatics'),encodeNativeProject({...project,score}),{flag:'wx'});writeFileSync(join(dir,value+'.mid'),Buffer.from(serializeMidi(changed)),{flag:'wx'});writeFileSync(join(dir,value+'.json'),JSON.stringify({value,label:labels[value],firstEventId:first.id,targetEventId:target.id,targetMeasureId:bar.id}),{flag:'wx'})}
})
it('keeps a clean score and an empty undo history on an already present ornament',async()=>{
 const{project,target,tile,node}=await setup('trill',true),before=document.querySelector('.studio-document__state')?.textContent,t=data();fireEvent.dragStart(tile,{dataTransfer:t});fireEvent.drop(node,{dataTransfer:t});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-document__state')?.textContent).toBe(before);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id)
})
it.each(['rest','grace','forged']as const)('rejects %s drops without changing the score',async kind=>{
 const{project,rest,tile,node}=await setup(),t=data();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:t});let hit:Element=node
 if(kind==='rest'){node.dataset.eventId=rest.id;node.dataset.measureId=project.score.parts[0].staves[0].measures[0].id}
 if(kind==='grace'){const child=document.createElementNS('http://www.w3.org/2000/svg','g');child.classList.add('vf-stavenote');node.append(child);hit=child}
 if(kind==='forged')t.setData('application/x-ddirori-studio-ornament','foreign-token')
 fireEvent.dragOver(hit,{dataTransfer:t});fireEvent.drop(hit,{dataTransfer:t});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
})
it('cancels owned ornament drag on native blur',async()=>{const{project,tile,node}=await setup(),t=data();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:t});fireEvent.blur(window);fireEvent.drop(node,{dataTransfer:t});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')})
it('preserves the existing selected-note click toggle path',async()=>{const{project,first,tile}=await setup();fireEvent.click(tile);expect(playbackMockState.lastScore?.parts[0].staves[0].measures[0].voices[0].events[0]).toMatchObject({id:first.id,ornaments:['mordent','trill']});fireEvent.click(tile);expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')})

it('rejects the hidden neighbor in part view and still accepts the visible host',async()=>{
 const{project,tile,node,first}=await setup();chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',project.score.parts[0].id)
 fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}))
 let t=data();fireEvent.dragStart(tile,{dataTransfer:t});fireEvent.drop(node,{dataTransfer:t});expect(playbackMockState.lastScore).toEqual(project.score)
 node.dataset.eventId=first.id;node.dataset.measureId=project.score.parts[0].staves[0].measures[0].id;t=data();fireEvent.dragStart(tile,{dataTransfer:t});fireEvent.drop(node,{dataTransfer:t});const expected=structuredClone(project.score),n=expected.parts[0].staves[0].measures[0].voices[0].events[0];if(n.type!=='note')throw Error('Note');n.ornaments=['mordent','trill'];expect(playbackMockState.lastScore).toEqual(expected);expect(expected.parts[1]).toEqual(project.score.parts[1]);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('invalidates the gesture when note entry begins',async()=>{
 const{project,tile,node}=await setup(),t=data();fireEvent.dragStart(tile,{dataTransfer:t});fireEvent.keyDown(window,{key:'n',code:'KeyN'});expect(tile.draggable).toBe(false);fireEvent.drop(node,{dataTransfer:t});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})
