// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { registerAppTestHooks, playbackMockState } from './App.test-harness'

describe('native popover visibility in App workflow tests',()=>{
  registerAppTestHooks()
  it.each(['escape','native-dismiss']as const)('removes a dismissed %s menu from the accessible tree without losing the score',async mode=>{
    window.history.replaceState({},'','/?fixture=release-test')
    const {App}=await import('./App');render(<App/>);const before=structuredClone(playbackMockState.lastScore!)
    const trigger=screen.getByRole('button',{name:'파일'});fireEvent.click(trigger)
    const menu=screen.getByRole('menu',{name:'파일'});expect(menu).toBeVisible()
    if(mode==='escape')fireEvent.keyDown(menu,{key:'Escape'})
    else act(()=>menu.hidePopover()) // Actual outside-pointer light dismissal is checked in Electron.
    expect(trigger).toHaveAttribute('aria-expanded','false')
    expect(menu).not.toBeVisible()
    expect(screen.queryByRole('menu',{name:'파일'})).not.toBeInTheDocument()
    fireEvent.click(trigger);expect(screen.getByRole('menu',{name:'파일'})).toBeVisible()
    expect(playbackMockState.lastScore).toEqual(before);expect(window.inC.project.save).not.toHaveBeenCalled()
  })
})
