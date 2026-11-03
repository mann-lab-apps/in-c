// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createDuration, createFullMeasureRest, createMeasure, createNote, createPart, createScore, createStaff, createVoice } from '../../score-core'
import { createNativeProject, decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

registerAppTestHooks()
const message='셋잇단음표 입력을 완료하거나 취소한 뒤 붙여넣어 주세요.'
const shortcut=(code:'KeyC'|'KeyV')=>fireEvent.keyDown(window,{key:code==='KeyC'?'c':'v',code,ctrlKey:true})
const key=(key:string,code?:string)=>fireEvent.keyDown(window,{key,code})
const select=(id:string)=>fireEvent.click(screen.getByRole('button',{name:`${id} 선택`}))
const status=()=>document.querySelector('.editor-status')!
const pending=(count:number)=>expect(status()).toHaveTextContent(`셋잇단음표 ${count}/3`)
async function setup(count:number){
  const score=createScore({title:'Tuplet clipboard guard',composer:'Studio QA',parts:[createPart({id:'piano',staves:[createStaff({id:'staff',measures:[
    createMeasure({id:'source',number:1,voices:[createVoice({events:[createNote({id:'copy-source',pitch:{step:'C',alter:0,octave:4},duration:createDuration('whole')})]})]}),
    createMeasure({id:'target',number:2,voices:[createVoice({events:[createFullMeasureRest({id:'paste-target'})]})]})
  ]})]})]})
  const project=createNativeProject(score);window.history.replaceState({},'', '/?fixture=release-test')
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/tuplet-clipboard.chromatics',fileName:'tuplet-clipboard.chromatics',contents:encodeNativeProject(project)})
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/tuplet-saved.chromatics',fileName:'tuplet-saved.chromatics'})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
  select('copy-source');shortcut('KeyC');select('paste-target');fireEvent.click(screen.getByRole('button',{name:'음표 입력 전환, 단축키 N'}));fireEvent.click(screen.getByRole('button',{name:/셋잇단음표 적용 또는 입력 준비/}))
  for(const [i,letter]of ['c','d'].slice(0,count).entries())key(letter, i===0?'KeyC':'KeyD')
  pending(count);expect(playbackMockState.lastScore).toEqual(score);return project
}
function noUndo(){fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:'실행 취소'})).toBeDisabled();fireEvent.keyDown(screen.getByRole('menu'),{key:'Escape'})}

it.each([0,1,2])('studio.pending-tuplet-paste preserves %s members and supports explicit cancellation/retry',async count=>{
  const project=await setup(count),preview=structuredClone(playbackMockState.lastPreviewScore)
  await act(async()=>shortcut('KeyV'));pending(count);expect(playbackMockState.lastPreviewScore).toEqual(preview);expect(playbackMockState.lastScore).toEqual(project.score);expect(status()).toHaveTextContent(message);expect(window.inC.project.save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'편집'}));expect(screen.getByRole('menuitem',{name:'선택 범위에 붙여넣기'})).toBeDisabled();fireEvent.keyDown(screen.getByRole('menu'),{key:'Escape'});pending(count)
  if(count===1){shortcut('KeyC');pending(count);expect(playbackMockState.lastPreviewScore).toEqual(preview)}
  key('Escape','Escape');expect(status()).not.toHaveTextContent(`셋잇단음표 ${count}/3`);await act(async()=>shortcut('KeyV'))
  const events=playbackMockState.lastScore!.parts[0].staves[0].measures[1].voices[0].events
  expect(events).toHaveLength(1);expect(events[0]).toMatchObject({type:'note',pitch:{step:'C',alter:0,octave:4},duration:{value:'whole'}});expect(events[0].id).not.toBe('copy-source')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);noUndo()
})
it('studio.pending-tuplet-paste retains the partial notes so completion is one real command',async()=>{
  const project=await setup(1);await act(async()=>shortcut('KeyV'));pending(1);key('d','KeyD');pending(2);key('e','KeyE')
  expect(status()).toHaveTextContent('셋잇단음표 입력을 완료했습니다.')
  const completed=structuredClone(playbackMockState.lastScore!),voice=completed.parts[0].staves[0].measures[1].voices[0]
  expect(voice.tuplets).toHaveLength(1);expect(voice.events.slice(0,3).map(e=>e.type==='note'?e.pitch.step:null)).toEqual(['C','D','E']);expect(voice.events.slice(0,3).every(e=>e.duration.tuplet?.actualNotes===3&&e.duration.tuplet.normalNotes===2)).toBe(true)
  openStudioWorkspace('파일');await act(async()=>fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'})))
  expect(window.inC.project.save).toHaveBeenCalledOnce();expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0]![0].contents).score).toEqual(completed)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(project.score);noUndo()
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(completed)
})
