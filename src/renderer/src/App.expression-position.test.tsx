// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor , within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createExpressionPositionFixture } from '../../testing/expression-position-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'

// Resolve the current public surface after workspace/document remounts; never cache old fields.
const hvFileTools = () => within(screen.getByRole('region', { name: '파일 및 선택 도구' }))
registerAppTestHooks()
it.each(['implicit-mid','relative-negative','fractional','origin-control'] as const)('imports supported expression timing and retains edit/history/Native: %s', async kind => {
  window.history.replaceState({},'','/?fixture=release-test')
  const f=createExpressionPositionFixture(kind), music=parseMusicXml(f.xml.replace(/<direction\b[\s\S]*?<\/direction>/g,''))
  const score={...music,expressionTexts:[{id:'measure-7-expression-text-1',measureId:'measure-7',tick:f.tick,text:f.text}]}
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/expression.musicxml',fileName:'expression.musicxml',contents:f.xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(score))
  expect(screen.queryByRole('region',{name:'MusicXML 오류 상세'})).not.toBeInTheDocument()
  expect(screen.queryByRole('region',{name:'MusicXML 경고 상세'})).not.toBeInTheDocument()
  const selection=screen.getByTestId('notation-preview').getAttribute('data-selected-event-address')
  fireEvent.click(screen.getByRole('button',{name:'악보 제목 수정'}));fireEvent.change(screen.getByRole('textbox', { name: '악보 제목' }),{target:{value:'표현 위치 확인'}});fireEvent.keyDown(screen.getByRole('textbox', { name: '악보 제목' }),{key:'Enter'})
  const edited={...score,title:'표현 위치 확인'};expect(playbackMockState.lastScore).toEqual(edited)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(score)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true,shiftKey:true});expect(playbackMockState.lastScore).toEqual(edited)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-address',selection!)
  openStudioWorkspace('파일');fireEvent.click(hvFileTools().getByRole('button',{name:'프로젝트 저장'}));await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  expect(decodeNativeProject(vi.mocked(window.inC.project.save).mock.calls[0][0].contents).score).toEqual(edited)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
})
