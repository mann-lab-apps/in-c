// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {expect,it,vi} from 'vitest'
import {mkdirSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createPracticeLoopFixture} from '../../testing/practice-loop-fixture'
import {createNativeProject,decodeNativeProject,encodeNativeProject} from '../../project/schema'
import {createFullMeasureRest,createVoice} from '../../score-core'
import {parseMusicXml,serializeMusicXml} from '../../musicxml'
import {expandScoreRepeatsForMusicXml} from '../../musicxml/expand-repeats'
import {serializeMidi} from './midi/serialize-midi'
import {openStudioWorkspace,openNotationSettings,choosePartSetup,chooseStaffTarget,playbackMockState,registerAppTestHooks} from './App.test-harness'

registerAppTestHooks()
const kinds=['key','staff-clef','bar-clef','repeat','volta','voice','staff-voice'] as const
it.each(kinds.flatMap(kind=>[false,true].map(withTempo=>({kind,withTempo}))))('preserves authored numbers through $kind (tempo alias $withTempo), undo and save',async({kind,withTempo})=>{
  window.history.replaceState({},'','/?fixture=release-test')
  const score=createPracticeLoopFixture();score.title='편집과 원본 번호 '+kind
  for(const part of score.parts)for(const staff of part.staves)staff.measures.forEach((bar,index)=>{bar.number=[10,30,70][index]})
  const bars=score.parts[0].staves[0].measures,bar=bars[1],event=bar.voices[0].events[0]
  score.hairpins=[{id:'kept-manual',type:'crescendo',startEventId:bars[0].voices[0].events[0].id,endEventId:bars[2].voices[0].events[0].id,engraving:{offsetX:0,height:4}}]
  if(withTempo)score.tempoEvents=[{id:'kept-tempo',measureId:'measure-30',tick:0,bpm:80}]
  if(kind==='volta'){bars[0].repeat={start:true};bars[2].repeat={end:true,times:2}}
  if(kind==='staff-voice')bar.voices[0].id='voice-2'
  const project=createNativeProject(score),before=structuredClone(project),expected=structuredClone(score),nextBars=expected.parts[0].staves[0].measures
  if(kind==='key')nextBars.slice(1).forEach(bar=>{bar.keySignature={fifths:1,mode:'major'}})
  else if(kind==='staff-clef')nextBars.forEach(bar=>{bar.clef={sign:'F',line:4}})
  else if(kind==='bar-clef')nextBars[1].clef={sign:'F',line:4}
  else if(kind==='repeat')nextBars[1].repeat={start:true}
  else if(kind==='volta'){nextBars[1].volta={number:1,start:true};nextBars[2].volta={number:1,end:true}}
  else {
    const target=expected.parts[kind==='staff-voice'?1:0].staves[0].measures[1]
    target.voices.push(createVoice({id:'voice-2',events:[createFullMeasureRest({id:target.id+'-voice-2-full-measure-rest'})]}))
  }
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({fileName:'edit-numbers.chromatics',filePath:'/fixture/edit-numbers.chromatics',contents:encodeNativeProject(project)})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
  fireEvent.click(screen.getByRole('button',{name:event.id+' 선택'}))
  if(kind==='voice')fireEvent.click(within(screen.getByRole('group',{name:'입력 성부'})).getByRole('button',{name:'2성부'}))
  else if(kind==='staff-voice')chooseStaffTarget('lower:lower-staff')
  else {
    fireEvent.click(screen.getAllByRole('button',{name:'30마디 선택'})[0])
    if(kind==='key'){
      openStudioWorkspace('악보');fireEvent.click(screen.getByRole('combobox',{name:'조표'}));fireEvent.click(screen.getByRole('option',{name:'사장조 (♯ 1개)'}))
    }else if(kind==='staff-clef')choosePartSetup('현재 보표 음자리표','bass')
    else if(kind==='bar-clef'){
      openNotationSettings('clef');fireEvent.click(screen.getByRole('button',{name:'낮은음자리표 · 선택 마디에 적용'}))
    }else{
      openNotationSettings('repeat');fireEvent.click(within(screen.getByRole('region',{name:'반복과 볼타'})).getByRole('button',{name:kind==='repeat'?'도돌이표 시작':'1번 볼타'}))
    }
  }
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  expect(score).toEqual(before.score)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window,{key:'y',code:'KeyY',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(expected)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  const saved=decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents)
  expect(saved.score).toEqual(expected);expect(saved.partLayouts).toEqual(project.partLayouts)
  const xml=serializeMusicXml(saved.score),reopened=parseMusicXml(xml)
  expect(reopened.parts.map(part=>part.staves[0].measures.map(bar=>bar.number))).toEqual([[10,30,70],[10,30,70]])
  expect(serializeMidi(reopened)).toEqual(serializeMidi(expected))
  if(kind==='volta'){
    // The retained manual hairpin has no stop on the second, skipped ending.
    // Number preservation must not bypass the existing fail-closed copy policy.
    expect(()=>expandScoreRepeatsForMusicXml(saved.score)).toThrow('이 악보의 일부 표기는 아직 반복 펼치기로 옮길 수 없습니다.')
    expect(saved.score).toEqual(expected)
  }
  const directory=process.env.STUDIO_EDIT_NUMBER_QA_DIR
  if(directory&&withTempo){
    mkdirSync(directory,{recursive:true})
    for(const [name,value]of [['source',project],['expected',{...project,score:expected}]]as const)writeFileSync(join(directory,kind+'-'+name+'.chromatics'),encodeNativeProject(value),{flag:'wx'})
    writeFileSync(join(directory,kind+'.json'),JSON.stringify({kind,targetEventId:event.id,targetMeasureId:bar.id,numbers:[10,30,70]}),{flag:'wx'})
    writeFileSync(join(directory,kind+'.mid'),Buffer.from(serializeMidi(expected)),{flag:'wx'})
  }
})
