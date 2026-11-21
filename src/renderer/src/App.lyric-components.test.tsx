// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { createLyricComponentsFixture, lyricComponentCases } from '../../testing/lyric-components-fixture'
import { parseMusicXml } from '../../musicxml'
import { decodeNativeProject } from '../../project/schema'
import { serializeMidi } from './midi/serialize-midi'
import { openStudioWorkspace, playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()

it.each(['korean','double-space'] as const)('imports %s as one editable lyric and preserves a single undo/save/reopen',async id=>{
  const example=lyricComponentCases.find(row=>row.id===id)!
  const xml=createLyricComponentsFixture(example),control=parseMusicXml(createLyricComponentsFixture(example,true))
  const event=control.parts[1].staves[0].measures[1].voices[0].events[0]
  if(event.type!=='note')throw Error('Expected ordinary target note')
  window.history.replaceState({},'', '/?fixture=release-test')
  vi.mocked(window.inC.musicXml.open).mockResolvedValueOnce({filePath:'/fixture/lyric-components.musicxml',fileName:'lyric-components.musicxml',contents:xml})
  const {App}=await import('./App');render(<App/>);openStudioWorkspace('파일')
  fireEvent.click(screen.getByRole('button',{name:'MusicXML 가져오기'}))
  await waitFor(()=>expect(playbackMockState.lastScore).toEqual(control))
  fireEvent.click(screen.getByRole('button',{name:`${event.id} 선택`}))
  openStudioWorkspace('가사')
  const input=screen.getByLabelText('선택 음표 가사')
  expect(input).toHaveValue(example.expected)
  const expected=structuredClone(control),changed=expected.parts[1].staves[0].measures[1].voices[0].events[0]
  if(changed.type!=='note'||!changed.lyrics)throw Error('Expected retained target verses')
  changed.lyrics[0].text=example.expected+' 고침'
  fireEvent.change(input,{target:{value:changed.lyrics[0].text}});fireEvent.blur(input)
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.blur(input);expect(document.querySelector('.editor-status')).toHaveTextContent('1회 수정')
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true})
  expect(playbackMockState.lastScore).toEqual(control)
  expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정')
  fireEvent.keyDown(window,{key:'Z',code:'KeyZ',ctrlKey:true,shiftKey:true})
  expect(playbackMockState.lastScore).toEqual(expected)
  expect(screen.getByTestId('notation-preview')).toHaveAttribute('data-selected-event-id',event.id)
  expect(serializeMidi(expected)).toEqual(serializeMidi(control))
  vi.mocked(window.inC.project.save).mockResolvedValueOnce({filePath:'/fixture/saved.chromatics',fileName:'saved.chromatics'})
  openStudioWorkspace('파일');fireEvent.click(screen.getByRole('button',{name:'프로젝트 저장'}))
  await waitFor(()=>expect(window.inC.project.save).toHaveBeenCalledOnce())
  const contents=vi.mocked(window.inC.project.save).mock.calls[0][0].contents
  expect(decodeNativeProject(contents).score).toEqual(expected)
  await waitFor(()=>expect(document.querySelector('.studio-document__state')).toHaveTextContent('변경 없음'))
  vi.mocked(window.inC.project.open).mockResolvedValueOnce({filePath:'/fixture/saved.chromatics',fileName:'saved.chromatics',contents})
  fireEvent.click(screen.getByRole('button',{name:'프로젝트 열기'}))
  await waitFor(()=>expect(window.inC.project.open).toHaveBeenCalledOnce())
  await waitFor(()=>expect(document.querySelector('.editor-status')).toHaveTextContent('0회 수정'))
  expect(playbackMockState.lastScore).toEqual(expected)
})
