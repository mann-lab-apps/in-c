// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createPartSpanResetFixture } from '../../testing/part-span-reset-fixture'
import { decodeNativeProject, encodeNativeProject } from '../../project/schema'
import { registerAppTestHooks, openStudioWorkspace, chooseScoreView, playbackMockState } from './App.test-harness'

registerAppTestHooks()

async function setup(){
  window.history.replaceState({},'','/?fixture=demo')
  const source=createPartSpanResetFixture()
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/page.chromatics',fileName:'page.chromatics',contents:encodeNativeProject(source)})
  vi.mocked(window.inC.project.save).mockResolvedValue({filePath:'/fixture/page.chromatics',fileName:'page.chromatics'})
  const {App}=await import('./App');render(<App />)
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(source.score))
  openStudioWorkspace('내보내기')
  return source
}
async function save(){
  const count=vi.mocked(window.inC.project.save).mock.calls.length
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledTimes(count+1))
  await waitFor(()=>expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음'))
  return decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[count][0].contents)
}

it('studio.page-margin-draft commits two typed digits with one exact part-layout undo/redo',async()=>{
  const original=await setup(),field=screen.getByRole('spinbutton',{name:'PDF 여백 mm'})
  const before=original.partLayouts.find(p=>p.partId==='P2')!.layout.pageSetup!.pageMarginMm
  field.focus();fireEvent.change(field,{target:{value:'1'}});expect(field).toHaveValue(1)
  expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
  fireEvent.change(field,{target:{value:'17'}});fireEvent.keyDown(field,{key:'Enter',code:'Enter'});fireEvent.blur(field)
  const edited=await save()
  expect(edited.score).toEqual(original.score)
  expect(edited.partLayouts.find(p=>p.partId==='P2')!.layout.pageSetup!.pageMarginMm).toBe(17)
  expect(edited.partLayouts.filter(p=>p.partId!=='P2')).toEqual(original.partLayouts.filter(p=>p.partId!=='P2'))
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
  const undo=await save();expect(undo.partLayouts).toEqual(original.partLayouts)
  expect(undo.partLayouts.find(p=>p.partId==='P2')!.layout.pageSetup!.pageMarginMm).toBe(before)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true})
  expect((await save()).partLayouts).toEqual(edited.partLayouts)
})

it.each(['escape','invalid','composition'] as const)('studio.page-margin-draft %s does not issue an early layout command',async outcome=>{
  const original=await setup(),field=screen.getByRole('spinbutton',{name:'PDF 여백 mm'})
  field.focus()
  if(outcome==='composition')fireEvent.compositionStart(field)
  fireEvent.change(field,{target:{value:outcome==='invalid'?'31':'17'}})
  if(outcome==='composition'){
    fireEvent.keyDown(field,{key:'Enter',code:'Enter',isComposing:true,keyCode:229});fireEvent.blur(field)
    expect(document.querySelector('.studio-document')).toHaveTextContent('변경 없음')
    fireEvent.compositionEnd(field)
  }
  if(outcome==='invalid'){fireEvent.blur(field);expect(field).toHaveAttribute('aria-invalid','true')}
  else fireEvent.keyDown(field,{key:'Escape',code:'Escape'})
  fireEvent.blur(field)
  expect((await save()).partLayouts).toEqual(original.partLayouts)
  expect(playbackMockState.play).not.toHaveBeenCalled()
  expect(playbackMockState.playFromEvent).not.toHaveBeenCalled()
})

it('studio.page-margin-draft commits the old owner on public blur without leaking to the new score surface',async()=>{
  const original=await setup(),field=screen.getByRole('spinbutton',{name:'PDF 여백 mm'})
  field.focus();fireEvent.change(field,{target:{value:'17'}})
  chooseScoreView('악보 보기','score')
  await act(async()=>fireEvent.blur(field))
  const actual=await save()
  expect(actual.score).toEqual(original.score)
  const expected=structuredClone(original.partLayouts)
  expected.find(p=>p.partId==='P2')!.layout.pageSetup!.pageMarginMm=17
  expect(actual.partLayouts).toEqual(expected)
  expect(actual.view).toEqual({mode:'score'})
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
  expect((await save()).partLayouts).toEqual(original.partLayouts)
})
