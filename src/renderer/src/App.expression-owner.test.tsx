// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent,render,screen,waitFor } from '@testing-library/react'
import { expect,it,vi } from 'vitest'
import { createExpressionOwnerFixture } from '../../testing/expression-owner-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { chooseScoreView,openStudioWorkspace,playbackMockState,registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it.each(['grand-staff','ensemble'] as const)('edits only the source lower-staff expression in %s score and linked part',async kind=>{
 window.history.replaceState({},'','/?fixture=release-test')
 const {xml,pianoId}=createExpressionOwnerFixture(kind),score=parseMusicXml(xml),part=score.parts.find(p=>p.id===pianoId)!,measure=part.staves[1].measures[0],target=score.expressionTexts!.find(t=>t.measureId===measure.id)!
 expect(target.tick).toBe(33600)
 vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/owners.musicxml',fileName:'owners.musicxml',contents:xml})
 const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}));await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
 for(const view of ['score','part'] as const){
  if(view==='part'){openStudioWorkspace('악보');chooseScoreView('악보 보기','part');chooseScoreView('파트보 선택',pianoId)}
  const targetButton=[...document.querySelectorAll<HTMLButtonElement>('.notation-expression-text-target')].find(n=>n.dataset.expressionTextId===target.id)!
  expect(targetButton).toBeEnabled();fireEvent.click(targetButton)
  const field=screen.getByRole('textbox',{name:'선택 요약 표현 텍스트'});expect(field).toHaveValue('dolce')
  expect(screen.getByRole('combobox',{name:'표현 텍스트 대상'})).toHaveTextContent('3.5박')
  fireEvent.change(field,{target:{value:'lower only'}});fireEvent.keyDown(field,{key:'Enter'});fireEvent.blur(field)
  const edited={...score,expressionTexts:score.expressionTexts!.map(t=>t.id===target.id?{...t,text:'lower only'}:t)}
  expect(playbackMockState.lastScore).toEqual(edited);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
 }
 openStudioWorkspace('내보내기');fireEvent.click(screen.getByRole('button',{name:'MusicXML 내보내기'}));await waitFor(()=>expect(window.inC.musicXml.exportCopy).toHaveBeenCalledOnce())
 const copy=parseMusicXml(vi.mocked(window.inC.musicXml.exportCopy).mock.calls[0][0].contents)
 expect(copy.parts.map(p=>p.id)).toEqual([pianoId]);expect(copy.expressionTexts).toHaveLength(2)
 expect(copy.expressionTexts?.map(t=>t.tick).sort((a,b)=>a-b)).toEqual([0,33600])
 expect(playbackMockState.lastScore).toEqual(score)
 openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
 expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(score)
})
