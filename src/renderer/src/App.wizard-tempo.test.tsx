// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { expect, it } from 'vitest'
import { playbackMockState, registerAppTestHooks } from './App.test-harness'
registerAppTestHooks()
it('wizard tempo preserves partial/out-of-range input and creates only the validated BPM', async () => {
  const {App}=await import('./App');render(<App />)
  fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
  const form=screen.getByRole('form',{name:'새 악보 만들기'}),field=within(form).getByRole('spinbutton',{name:'빠르기'})
  const before=playbackMockState.lastScore
  for(const value of ['1','12','120','999']){
    fireEvent.change(field,{target:{value}})
    expect(field).toHaveValue(Number(value))
    expect(playbackMockState.lastScore).toBe(before)
  }
  fireEvent.blur(field)
  expect(field).toHaveValue(999)
  expect(field).toHaveAttribute('aria-invalid','true')
  expect(field).toHaveAccessibleDescription(expect.stringContaining('40–240'))
  fireEvent.submit(form)
  expect(screen.getByRole('form',{name:'새 악보 만들기'})).toBeVisible()
  expect(playbackMockState.lastScore).toBe(before)
  fireEvent.keyDown(field,{key:'Escape'})
  expect(field).toHaveValue(120)
  expect(screen.getByRole('form',{name:'새 악보 만들기'})).toBeVisible()
  fireEvent.change(field,{target:{value:'80'}});fireEvent.blur(field)
  expect(field).not.toHaveAttribute('aria-invalid','true')
  fireEvent.submit(form)
  await waitFor(()=>expect(screen.queryByRole('form',{name:'새 악보 만들기'})).not.toBeInTheDocument())
  expect(playbackMockState.lastScore?.tempo?.bpm).toBe(80)
})
it('wizard rejects empty/fractional BPM and protects composing text', async()=>{
  const {App}=await import('./App');render(<App />);fireEvent.click(screen.getByRole('button',{name:'새 악보 만들기'}))
  const form=screen.getByRole('form',{name:'새 악보 만들기'}),field=within(form).getByRole('spinbutton',{name:'빠르기'})
  const before=playbackMockState.lastScore
  for(const value of ['','39','241','80.5']){
    fireEvent.change(field,{target:{value}});fireEvent.submit(form)
    expect(field).toHaveAttribute('aria-invalid','true');expect(playbackMockState.lastScore).toBe(before)
  }
  fireEvent.compositionStart(field);fireEvent.change(field,{target:{value:'85'}});fireEvent.keyDown(field,{key:'Escape',isComposing:true});fireEvent.submit(form)
  expect(field).toHaveValue(85);expect(playbackMockState.lastScore).toBe(before)
  fireEvent.compositionEnd(field);fireEvent.submit(form)
  await waitFor(()=>expect(screen.queryByRole('form',{name:'새 악보 만들기'})).not.toBeInTheDocument())
  expect(playbackMockState.lastScore?.tempo?.bpm).toBe(85)
})
