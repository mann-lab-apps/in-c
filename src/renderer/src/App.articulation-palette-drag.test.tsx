// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {serializeMidi} from './midi/serialize-midi'
import {playbackMockState,registerAppTestHooks,chooseSpanReference,chooseScoreView} from './App.test-harness'
import {createRest,type Articulation} from '../../score-core'
registerAppTestHooks()
const names={staccato:'스타카토',accent:'악센트',tenuto:'테누토',marcato:'마르카토'} as const
function transfer(){const values:Record<string,string>={};return{effectAllowed:'none',dropEffect:'none',get types(){return Object.keys(values)},setData:vi.fn((type:string,value:string)=>{values[type]=value}),getData:(type:string)=>values[type]??''}}
async function setup(value:Articulation='staccato',already=false,attached=false){
 window.history.replaceState({},'','/?fixture=release-test');const score=createPracticeLoopFixture();score.title='표현 기호 끌기 '+value
 const first=score.parts[0].staves[0].measures[0].voices[0].events[0],bar=score.parts[1].staves[0].measures[1],target=bar.voices[0].events[0]
 if(first.type!=='note'||target.type!=='note')throw Error('Note fixture required')
 first.articulations=['tenuto'];target.articulations=already?[value]:[value==='accent'?'tenuto':'accent']
 if(attached){target.graceNotes=[{pitch:{step:'D',octave:4},slash:true}];target.ties={start:true};const next=bar.voices[0].events[1];if(next.type!=='note')throw Error('Note');next.ties={stop:true};target.fermata=true}
 score.slurs=[{id:'drag-slur',startEventId:first.id,endEventId:score.parts[0].staves[0].measures[1].voices[0].events[0].id}]
 const voice=score.parts[0].staves[0].measures[0].voices[0],rest=voice.events[3];voice.events[3]=createRest({id:rest.id,position:rest.position,duration:rest.duration})
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'articulation.chromatics',filePath:'/fixture/articulation.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score));fireEvent.click(screen.getByRole('button',{name:first.id+' 선택'}));fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}));fireEvent.click(screen.getByRole('button',{name:'표현 기호'}))
 const tile=screen.getByRole('button',{name:names[value]+' 적용 또는 해제'}),node=document.createElementNS('http://www.w3.org/2000/svg','g');node.classList.add('notation-event','vf-stavenote');node.dataset.eventId=target.id;node.dataset.measureId=bar.id;node.getBoundingClientRect=()=>({x:100,y:200,left:100,top:200,right:120,bottom:240,width:20,height:40,toJSON(){}});screen.getByTestId('notation-preview').append(node)
 return{project,first,target,bar,tile,node,value}
}
function writeCase(value:Articulation,project:ReturnType<typeof createNativeProject>,changed:typeof project.score,meta:object){const dir=process.env.STUDIO_ARTICULATION_DRAG_QA_DIR;if(!dir)return;mkdirSync(dir,{recursive:true});for(const[id,score]of[['source',project.score],['expected',changed]]as const)writeFileSync(join(dir,value+'-'+id+'.chromatics'),encodeNativeProject({...project,score}),{flag:'wx'});writeFileSync(join(dir,value+'.json'),JSON.stringify(meta,null,2),{flag:'wx'});writeFileSync(join(dir,value+'.mid'),Buffer.from(serializeMidi(changed)),{flag:'wx'})}
it.each(['staccato','accent','tenuto','marcato']as const)('adds %s only to the dropped event and preserves source, other marks and one undo',async value=>{
 const{project,first,target,bar,tile,node}=await setup(value),data=transfer();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByLabelText('표현 기호 끌기 안내')).toHaveTextContent('2마디');expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
 fireEvent.drop(node,{dataTransfer:data});const changed=structuredClone(playbackMockState.lastScore!),expected=structuredClone(project.score),event=expected.parts[1].staves[0].measures[1].voices[0].events[0];if(event.type!=='note')throw Error('Note');event.articulations=[...event.articulations!,value];expect(changed).toEqual(expected);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정');expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument();expect(decodeNativeProject(encodeNativeProject({...project,score:changed})).score).toEqual(changed)
 const again=transfer();fireEvent.dragStart(tile,{dataTransfer:again});fireEvent.drop(node,{dataTransfer:again});expect(playbackMockState.lastScore).toEqual(changed);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id)
 writeCase(value,project,changed,{value,label:names[value],firstEventId:first.id,targetEventId:target.id,targetMeasureId:bar.id})
})
it('does not remove an existing dropped mark or create an empty undo',async()=>{
 const{project,tile,node,target}=await setup('staccato',true),data=transfer();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id)
})
it.each(['dragend','blur']as const)('cancels hover on %s and refuses a late drop',async phase=>{
 const{project,tile,node}=await setup(),data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument();if(phase==='dragend')fireEvent.dragEnd(tile);else fireEvent.blur(window);expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument();fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('rejects external/forged data and yields tooltip ownership to the stable canvas',async()=>{
 const{project,tile,node}=await setup(),data=transfer();data.setData('text/plain','staccato');fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);act(()=>tile.focus());fireEvent.mouseEnter(tile.closest('.dd-tooltip-wrap')!);expect(screen.getByRole('tooltip')).toBeVisible();fireEvent.dragStart(tile,{dataTransfer:data});expect(screen.getByLabelText('악보 캔버스')).toHaveFocus();expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();data.setData(data.types.find(t=>t!=='text/plain')!,'forged');fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('rejects a nested grace glyph and a rest without moving selection',async()=>{
 const{project,tile,node,first}=await setup(),grace=document.createElementNS('http://www.w3.org/2000/svg','g');grace.classList.add('vf-stavenote');node.append(grace)
 let data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(grace,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id)
 const bar=project.score.parts[0].staves[0].measures[0],rest=bar.voices[0].events[3];node.dataset.eventId=rest.id;node.dataset.measureId=bar.id;data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);expect(rest.type).toBe('rest');expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id)
})
it('keeps input, range and span-selection drag disabled',async()=>{
 const{project,tile,node}=await setup();fireEvent.keyDown(window,{key:'n',code:'KeyN'});expect(tile.draggable).toBe(false);let data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(data.setData).not.toHaveBeenCalled();fireEvent.keyDown(window,{key:'Escape'});chooseSpanReference('slur:drag-slur');expect(tile.draggable).toBe(false);data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(data.setData).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.click(screen.getByRole('button',{name:'upper-note-0 선택'}));fireEvent.click(screen.getByRole('button',{name:'upper-note-4 선택'}),{shiftKey:true});expect(tile.draggable).toBe(false);data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(data.setData).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(project.score)
})
it('invalidates a drag when a new document starts',async()=>{
 const{tile,node}=await setup(),data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'새 악보 만들기'}));expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument();fireEvent.submit(screen.getByRole('form',{name:'새 악보 만들기'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'새 악보 만들기'})).not.toBeInTheDocument());const fresh=structuredClone(playbackMockState.lastScore!);fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(fresh)
})
it('retains click-to-toggle on the selected source while leaving a different target untouched',async()=>{
 const{project,tile}=await setup('staccato',true);fireEvent.click(tile);const added=structuredClone(playbackMockState.lastScore!),first=added.parts[0].staves[0].measures[0].voices[0].events[0];if(first.type!=='note')throw Error('Note');expect(first.articulations).toEqual(['tenuto','staccato']);expect(added.parts[1]).toEqual(project.score.parts[1]);fireEvent.click(tile);expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(added);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})

it('preserves an attached grace group, existing tie and fermata on the dropped host through undo',async()=>{
 const{project,tile,node}=await setup('staccato',false,true),data=transfer(),expected=structuredClone(project.score),target=expected.parts[1].staves[0].measures[1].voices[0].events[0]
 if(target.type!=='note')throw Error('Note')
 target.articulations=[...target.articulations!,'staccato']
 fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data})
 expect(playbackMockState.lastScore).toEqual(expected)
 expect(decodeNativeProject(encodeNativeProject({...project,score:playbackMockState.lastScore!})).score).toEqual(expected)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(expected)
})

it('rejects a hidden neighboring part target in part view and accepts the current part host',async()=>{
 const{project,tile,node}=await setup(),source=project.score.parts[0].staves[0].measures[0].voices[0].events[0]
 chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',project.score.parts[0].id)
 fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}))
 let data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score)
 node.dataset.eventId=source.id;node.dataset.measureId=project.score.parts[0].staves[0].measures[0].id
 data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data})
 const expected=structuredClone(project.score),note=expected.parts[0].staves[0].measures[0].voices[0].events[0];if(note.type!=='note')throw Error('Note');note.articulations=['tenuto','staccato']
 expect(playbackMockState.lastScore).toEqual(expected);expect(expected.parts[1]).toEqual(project.score.parts[1])
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
