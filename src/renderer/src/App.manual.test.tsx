// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect,it } from 'vitest'
import { registerAppTestHooks,playbackMockState } from './App.test-harness'
registerAppTestHooks()
it('help explains actual octave, mode, grace and save mappings without triggering playback',async()=>{
 window.history.replaceState({},'', '/?fixture=release-test');const {App}=await import('./App');render(<App />)
 fireEvent.click(screen.getByRole('button',{name:'도움말'}));fireEvent.click(screen.getByRole('menuitem',{name:'단축키 도움말'}))
 const dialog=screen.getByRole('dialog',{name:'단축키 도움말'})
 expect(within(dialog).getByText('한 옥타브 올리기/내리기')).toBeVisible()
 expect(within(dialog).getByText('Mac: ⌘+↑/↓ · Windows/Linux: Ctrl+↑/↓')).toBeVisible()
 expect(within(dialog).getByText('기존 음표를 꾸밈음으로 변환')).toBeInTheDocument()
 expect(within(dialog).getByText('현재 형식으로 저장')).toBeInTheDocument()
 fireEvent.keyDown(dialog,{key:' '});expect(playbackMockState.play).not.toHaveBeenCalled()
 fireEvent.click(within(dialog).getByRole('button',{name:'확인'}));expect(screen.queryByRole('dialog',{name:'단축키 도움말'})).not.toBeInTheDocument()
})
