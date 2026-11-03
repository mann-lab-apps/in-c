// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('visible grace action and Alt+G reuse one command without consuming duration or firing inside IME/text', async()=>{
  window.history.replaceState({},'', '/?fixture=release-test')
  const {App}=await import('./App');render(<App />)
  const before=playbackMockState.lastScore
  const action=screen.getByRole('button',{name:'꾸밈음 추가, 단축키 Alt+G'})
  expect(action).toBeVisible();expect(action).toHaveAttribute('aria-keyshortcuts','Alt+G')
  fireEvent.click(action)
  const added=playbackMockState.lastScore
  const note=added?.parts[0].staves[0].measures[0].voices[0].events[0]
  expect(note).toMatchObject({type:'note',graceNotes:[{slash:true}]})
  expect(note?.duration).toEqual(before?.parts[0].staves[0].measures[0].voices[0].events[0].duration)
  fireEvent.keyDown(window,{key:'z',code:'KeyZ',ctrlKey:true});expect(playbackMockState.lastScore).toEqual(before)
  fireEvent.keyDown(window,{key:'g',code:'KeyG',altKey:true});expect(playbackMockState.lastScore).toEqual(added)
  fireEvent.keyDown(window,{key:'g',code:'KeyG',altKey:true,isComposing:true});expect(playbackMockState.lastScore).toEqual(added)
  fireEvent.click(screen.getByRole('button',{name:'악보 정보'}));fireEvent.click(screen.getByRole('button',{name:'악보 제목 편집'}))
  fireEvent.keyDown(screen.getByRole('textbox',{name:'악보 제목'}),{key:'g',code:'KeyG',altKey:true});expect(playbackMockState.lastScore).toEqual(added)
})
