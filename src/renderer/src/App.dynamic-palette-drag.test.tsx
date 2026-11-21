// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import{act,fireEvent,render,screen,waitFor,within}from'@testing-library/react'
import{expect,it,vi}from'vitest'
import{mkdirSync,writeFileSync}from'node:fs'
import{join}from'node:path'
import{createNativeProject,encodeNativeProject,decodeNativeProject}from'../../project/schema'
import{createNote,createDuration}from'../../score-core'
import{createNewScore}from'./editor/new-score'
import{serializeMidi}from'./midi/serialize-midi'
import{createPlaybackTimeline}from'./playback/timeline'
import{playbackMockState,registerAppTestHooks}from'./App.test-harness'
registerAppTestHooks()
function transfer(){const values:Record<string,string>={};return{effectAllowed:'none',dropEffect:'none',get types(){return Object.keys(values)},setData:vi.fn((type:string,value:string)=>{values[type]=value}),getData:(type:string)=>values[type]??''}}
async function setup(mode:'existing'|'empty'|'multiple'='existing'){
 window.history.replaceState({},'','/?fixture=release-test')
 const score=createNewScore({title:'셈여림 끌기 검증 '+mode,templateId:'duet',measureCount:3,keySignature:{fifths:0,mode:'major'},timeSignature:{beats:4,beatType:4}})
 for(const part of score.parts)for(const staff of part.staves)for(const bar of staff.measures)bar.voices[0].events=[createNote({id:bar.voices[0].events[0].id,duration:createDuration('whole'),pitch:{step:'C',octave:4}})]
 const original=score.parts[0].staves[0].measures[0],target=score.parts[1].staves[0].measures[1]
 score.dynamics=[{id:'source-first',measureId:original.id,value:'p'},{id:'source-stored',measureId:original.id,value:'ff'}]
 if(mode!=='empty')score.dynamics.push({id:'target-first',measureId:target.id,value:'mf'})
 if(mode==='multiple')score.dynamics.push({id:'target-stored',measureId:target.id,value:'pp'})
 const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
 vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/dynamic-drag.chromatics',fileName:'dynamic-drag.chromatics',contents:encodeNativeProject(project)})
 const{App}=await import('./App');render(<App/>);fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
 const firstEvent=original.voices[0].events[0],event=target.voices[0].events[0]
 fireEvent.click(screen.getByRole('button',{name:`${firstEvent.id} 선택`}));fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'셈여림 팔레트'}))
 const tile=screen.getByRole('button',{name:'f 셈여림 적용'}),node=document.createElementNS('http://www.w3.org/2000/svg','g');node.classList.add('notation-event');node.dataset.eventId=event.id;node.dataset.measureId=target.id;node.getBoundingClientRect=()=>({x:100,y:200,left:100,top:200,right:120,bottom:220,width:20,height:20,toJSON(){}});screen.getByTestId('notation-preview').append(node)
 return{project,original,target,event,firstEvent,tile,node}
}
function writeCase(id:string,project:ReturnType<typeof createNativeProject>,meta:object,changed?:typeof project.score){
 const dir=process.env.STUDIO_DYNAMIC_DRAG_QA_DIR;if(!dir)return;mkdirSync(dir,{recursive:true});writeFileSync(join(dir,id+'-source.chromatics'),encodeNativeProject(project),{flag:'wx'});if(changed)writeFileSync(join(dir,id+'-expected.chromatics'),encodeNativeProject({...project,score:changed}),{flag:'wx'});writeFileSync(join(dir,id+'.json'),JSON.stringify({id,...meta},null,2),{flag:'wx'})
}
it.each(['existing','empty']as const)('applies f to the dropped bar and preserves every source stored value in %s',async mode=>{
 const{project,target,event,firstEvent,tile,node}=await setup(mode),data=transfer();expect(tile).toHaveAttribute('draggable','true')
 fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument();expect(screen.getByLabelText('셈여림 끌기 안내')).toHaveTextContent('2마디')
 fireEvent.drop(node,{dataTransfer:data});const changed=structuredClone(playbackMockState.lastScore!),marks=changed.dynamics!.filter(m=>m.measureId===target.id);expect(marks).toHaveLength(1);expect(marks[0]).toMatchObject({measureId:target.id,value:'f'});expect(marks[0]).not.toHaveProperty('tick');expect(marks[0]).not.toHaveProperty('voiceId')
 if(mode==='existing')expect(marks[0].id).toBe('target-first');else{expect(marks[0].id).toMatch(/^dynamic-/);expect(project.score.dynamics!.some(m=>m.id===marks[0].id)).toBe(false)}
 const expected={...project.score,dynamics:[project.score.dynamics![0],project.score.dynamics![1],{id:marks[0].id,measureId:target.id,value:'f' as const}]};expect(changed).toEqual(expected);expect(serializeMidi(changed)).not.toEqual(serializeMidi(project.score))
 const events=(score:typeof changed)=>createPlaybackTimeline(score).events.filter(e=>e.measureId!==target.id);expect(events(changed)).toEqual(events(project.score));expect(decodeNativeProject(encodeNativeProject({...project,score:changed})).score).toEqual(changed)
 const again=transfer();fireEvent.dragStart(tile,{dataTransfer:again});fireEvent.drop(node,{dataTransfer:again});expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
 writeCase(mode,project,{label:'f',firstEventId:firstEvent.id,targetEventId:event.id,targetMeasureId:target.id,newId:mode==='empty'},changed)
})
it('does not discard multiple target dynamics or move selection on a refused drop',async()=>{
 const{project,target,event,firstEvent,tile,node}=await setup('multiple'),data=transfer();expect(tile).toHaveAttribute('draggable','true');fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(screen.getByLabelText('셈여림 끌기 안내')).toHaveTextContent('여러');fireEvent.drop(node,{dataTransfer:data})
 expect(playbackMockState.lastScore).toEqual(project.score);expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',firstEvent.id);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정');expect(document.querySelector('.studio-status')).toHaveTextContent('속성');expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
 writeCase('multiple',project,{label:'f',firstEventId:firstEvent.id,targetEventId:event.id,targetMeasureId:target.id})
})
it.each(['dragend','blur']as const)('cancels dynamic hover on %s without changing data',async phase=>{
 const{project,tile,node}=await setup(),data=transfer();expect(tile).toHaveAttribute('draggable','true');fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument();if(phase==='dragend')fireEvent.dragEnd(tile);else fireEvent.blur(window);expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument();fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('ignores external/forged payloads and yields tooltip/focus to the canvas',async()=>{
 const{project,tile,node}=await setup(),data=transfer();data.setData('text/plain','f');fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score);act(()=>tile.focus());fireEvent.mouseEnter(tile.closest('.dd-tooltip-wrap')!);expect(screen.getByRole('tooltip')).toBeVisible();fireEvent.dragStart(tile,{dataTransfer:data});expect(screen.getByLabelText('악보 캔버스')).toHaveFocus();expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();data.setData(data.types.find(t=>t!=='text/plain')!,'forged');fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(project.score)
})
it('keeps native drag disabled during input and range selection',async()=>{
 const{project,tile,node,firstEvent}=await setup();fireEvent.keyDown(window,{key:'n',code:'KeyN'});expect(tile).toHaveAttribute('draggable','false');const data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data});expect(data.setData).not.toHaveBeenCalled();expect(playbackMockState.lastScore).toEqual(project.score);fireEvent.keyDown(window,{key:'Escape'});fireEvent.click(screen.getByRole('button',{name:`${firstEvent.id} 선택`}));fireEvent.click(screen.getByRole('button',{name:`${project.score.parts[0].staves[0].measures[1].voices[0].events[0].id} 선택`}),{shiftKey:true});expect(tile).toHaveAttribute('draggable','false');expect(playbackMockState.lastScore).toEqual(project.score)
})
it('invalidates a dynamic drag when a new document starts',async()=>{
 const{tile,node}=await setup(),data=transfer();fireEvent.dragStart(tile,{dataTransfer:data});fireEvent.dragOver(node,{dataTransfer:data});expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'새 악보 만들기'}));expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument();fireEvent.submit(screen.getByRole('form',{name:'새 악보 만들기'}));await waitFor(()=>expect(screen.queryByRole('dialog',{name:'새 악보 만들기'})).not.toBeInTheDocument());const next=structuredClone(playbackMockState.lastScore!);fireEvent.drop(node,{dataTransfer:data});expect(playbackMockState.lastScore).toEqual(next)
})

it('keeps a previously selected stored source value intact when dragging onto another bar',async()=>{
 const{project,tile,node,target}=await setup();expect(tile).toHaveAttribute('draggable','true')
 fireEvent.doubleClick(screen.getByRole('button',{name:'셈여림 p 속성 열기'}));fireEvent.click(screen.getByRole('combobox',{name:'셈여림 대상'}));fireEvent.click(within(screen.getByRole('listbox',{name:'셈여림 대상'})).getByRole('option',{name:'2 · ff · 원본 보관'}));expect(screen.getByRole('combobox',{name:'선택 셈여림'})).toHaveTextContent('ff')
 fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'셈여림 팔레트'}));expect(screen.getByRole('button',{name:'ff 셈여림 적용'})).toHaveAttribute('aria-pressed','true');expect(screen.getByLabelText('셈여림 끌기 안내')).toHaveTextContent('원본 보관');const fresh=screen.getByRole('button',{name:'f 셈여림 적용'}),data=transfer();fireEvent.dragStart(fresh,{dataTransfer:data});fireEvent.drop(node,{dataTransfer:data})
 const changed=playbackMockState.lastScore!;expect(changed.dynamics!.filter(m=>m.measureId!==target.id)).toEqual(project.score.dynamics!.filter(m=>m.measureId!==target.id));expect(changed.dynamics!.find(m=>m.measureId===target.id)).toEqual({id:'target-first',measureId:target.id,value:'f'});expect(changed.parts).toEqual(project.score.parts)
 fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
})
