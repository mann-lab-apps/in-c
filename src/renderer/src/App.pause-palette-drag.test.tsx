// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor, within } from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {createRest,type BreathMark} from '../../score-core'
import {createPlaybackTimeline} from './playback/timeline'
import {serializeMidi} from './midi/serialize-midi'
import {playbackMockState,registerAppTestHooks,chooseScoreView} from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvPreview = () => within(screen.getByTestId('notation-preview'))
const hvPaletteFamily = () => within(screen.getByRole('region', { name: '정지 기호 팔레트' }))

registerAppTestHooks()
type Pause='fermata'|BreathMark
const labels={fermata:'페르마타',breath:'숨표',caesura:'중지표'} as const
function data(){
  const values:Record<string,string>={}
  return {effectAllowed:'none',dropEffect:'none',get types(){return Object.keys(values)},setData:(type:string,value:string)=>{values[type]=value},getData:(type:string)=>values[type]??''}
}
async function setup(value:Pause='fermata',rest=false,already=false){
  window.history.replaceState({},'','/?fixture=release-test')
  const score=createPracticeLoopFixture();score.title='정지 기호 끌기 '+value
  const first=score.parts[0].staves[0].measures[0].voices[0].events[0]
  const bar=score.parts[1].staves[0].measures[1],original=bar.voices[0].events[0]
  if(first.type!=='note'||original.type!=='note')throw Error('Owned note fixture')
  const target=rest?createRest({id:original.id,position:original.position,duration:original.duration}):original
  bar.voices[0].events[0]=target
  if(target.type==='note'){target.articulations=['accent'];target.ornaments=['mordent'];target.graceNotes=[{pitch:{step:'D',octave:4},slash:true}]}
  target.fermata=value==='fermata'?(already?true:undefined):true
  target.breathMark=already&&value!=='fermata'?value:value==='caesura'?'breath':'caesura'
  const project=decodeNativeProject(encodeNativeProject(createNativeProject(score)))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'pause.chromatics',filePath:'/fixture/pause.chromatics',contents:encodeNativeProject(project)})
  const {App}=await import('./App');render(<App/>);
  fireEvent.click(screen.getByRole('button',{name:'파일'}));fireEvent.click(screen.getByRole('menuitem',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(project.score))
  fireEvent.click(hvPreview().getByRole('button',{name:first.id+' 선택'}))
  fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}));fireEvent.click(screen.getByRole('button',{name:'정지 기호'}))
  const tile=hvPaletteFamily().getByRole('button',{name:labels[value]+' 적용 또는 해제'})
  const node=document.createElementNS('http://www.w3.org/2000/svg','g');node.classList.add('notation-event','vf-stavenote');node.dataset.eventId=target.id;node.dataset.measureId=bar.id
  node.getBoundingClientRect=()=>({x:100,y:200,left:100,top:200,right:120,bottom:240,width:20,height:40,toJSON(){}})
  screen.getByTestId('notation-preview').append(node)
  return {project,first,target,bar,tile,node}
}

it.each((['fermata','breath','caesura'] as const).flatMap(value=>[false,true].map(rest=>({value,rest}))))('adds $value to a dropped rest=$rest, preserving other fields and one undo',async({value,rest})=>{
  const {project,first,target,bar,tile,node}=await setup(value,rest),transfer=data()
  expect(tile.draggable).toBe(true)
  fireEvent.dragStart(tile,{dataTransfer:transfer});fireEvent.dragOver(node,{dataTransfer:transfer})
  expect(hvPaletteFamily().getByLabelText('정지 기호 끌기 안내')).toHaveTextContent('2마디')
  expect(document.querySelector('.studio-palette-drop-highlight')).toBeInTheDocument()
  expect(playbackMockState.lastScore).toEqual(project.score)
  fireEvent.drop(node,{dataTransfer:transfer})
  const expected=structuredClone(project.score),event=expected.parts[1].staves[0].measures[1].voices[0].events[0]
  if(value==='fermata')event.fermata=true;else event.breathMark=value
  const changed=structuredClone(playbackMockState.lastScore!)
  expect(changed).toEqual(expected)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
  const duplicate=data();fireEvent.dragStart(tile,{dataTransfer:duplicate});fireEvent.drop(node,{dataTransfer:duplicate})
  expect(playbackMockState.lastScore).toEqual(changed);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  if(value==='fermata')expect(createPlaybackTimeline(changed).totalBeats).toBeGreaterThan(createPlaybackTimeline(project.score).totalBeats)
  else {expect(createPlaybackTimeline(changed)).toEqual(createPlaybackTimeline(project.score));expect(serializeMidi(changed)).toEqual(serializeMidi(project.score))}
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',first.id)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(changed)
  expect(decodeNativeProject(encodeNativeProject({...project,score:changed})).score).toEqual(changed)
  const dir=process.env.STUDIO_PAUSE_DRAG_QA_DIR
  if(dir){
    mkdirSync(dir,{recursive:true});const prefix=value+(rest?'-rest':'')
    for(const [name,score] of [['source',project.score],['expected',changed]] as const)writeFileSync(join(dir,prefix+'-'+name+'.chromatics'),encodeNativeProject({...project,score}),{flag:'wx'})
    writeFileSync(join(dir,prefix+'.json'),JSON.stringify({value,label:labels[value],firstEventId:first.id,targetEventId:target.id,targetMeasureId:bar.id,rest}),{flag:'wx'})
    writeFileSync(join(dir,prefix+'.mid'),Buffer.from(serializeMidi(changed)),{flag:'wx'})
  }
})

it.each(['fermata','breath','caesura'] as const)('does not toggle an existing %s off or dirty the clean score on drop',async value=>{
  const {project,target,tile,node}=await setup(value,true,true),before=document.querySelector('.studio-document__state')?.textContent,transfer=data()
  expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:transfer});fireEvent.drop(node,{dataTransfer:transfer})
  expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-document__state')?.textContent).toBe(before)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',target.id)
})

it.each(['grace','forged','blur'] as const)('rejects %s without mutation or stale highlight',async kind=>{
  const {project,tile,node}=await setup(),transfer=data();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:transfer});let hit:Element=node
  if(kind==='grace'){const child=document.createElementNS('http://www.w3.org/2000/svg','g');child.classList.add('vf-stavenote');node.append(child);hit=child}
  if(kind==='forged')transfer.setData('application/x-ddirori-studio-pause','foreign-token')
  if(kind==='blur')fireEvent.blur(window)
  fireEvent.dragOver(hit,{dataTransfer:transfer});fireEvent.drop(hit,{dataTransfer:transfer})
  expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  expect(document.querySelector('.studio-palette-drop-highlight')).not.toBeInTheDocument()
})

it.each(['fermata','breath','caesura'] as const)('keeps the selected-event click toggle for %s',async value=>{
  const {project,first,tile}=await setup(value)
  fireEvent.click(tile);const changed=playbackMockState.lastScore!.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(changed).toMatchObject(value==='fermata'?{id:first.id,fermata:true}:{id:first.id,breathMark:value})
  fireEvent.click(tile);expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('2회 수정')
})

it('rejects hidden-part targets and invalidates a gesture when note entry starts',async()=>{
  const {project,first,tile,node}=await setup();chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',project.score.parts[0].id)
  fireEvent.click(screen.getByRole('button',{name:'추가'}));fireEvent.click(screen.getByRole('menuitem',{name:'표기 팔레트 열기'}))
  const transfer=data();expect(tile.draggable).toBe(true);fireEvent.dragStart(tile,{dataTransfer:transfer});fireEvent.drop(node,{dataTransfer:transfer});expect(playbackMockState.lastScore).toEqual(project.score)
  node.dataset.eventId=first.id;node.dataset.measureId=project.score.parts[0].staves[0].measures[0].id
  const next=data();fireEvent.dragStart(tile,{dataTransfer:next});fireEvent.keyDown(window,{key:'n',code:'KeyN'});expect(tile.draggable).toBe(false);fireEvent.drop(node,{dataTransfer:next})
  expect(playbackMockState.lastScore).toEqual(project.score);expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
})

it('permits a rest selection as the drag source context without changing the source rest',async()=>{
  const {project,first,target,tile,node}=await setup('breath',true)
  fireEvent.click(hvPreview().getByRole('button',{name:target.id+' 선택'}));expect(tile.draggable).toBe(true)
  node.dataset.eventId=first.id;node.dataset.measureId=project.score.parts[0].staves[0].measures[0].id
  const transfer=data();fireEvent.dragStart(tile,{dataTransfer:transfer});fireEvent.drop(node,{dataTransfer:transfer})
  const expected=structuredClone(project.score);expected.parts[0].staves[0].measures[0].voices[0].events[0].breathMark='breath'
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(playbackMockState.lastScore?.parts[1].staves[0].measures[1].voices[0].events[0]).toEqual(target)
})
