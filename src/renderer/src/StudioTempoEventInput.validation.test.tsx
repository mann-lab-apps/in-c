// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioTempoEventInput } from './StudioTempoEventInput'
afterEach(cleanup)
it.each(['0','39','241','999','96.5'])('keeps invalid tempo %s as a draft and never emits a clamp/truncate command', draft => {
  const commit=vi.fn();render(<StudioTempoEventInput value={96} scope="1마디" onCommit={commit}/>)
  const field=screen.getByRole('spinbutton');field.focus();fireEvent.change(field,{target:{value:draft}})
  fireEvent.keyDown(field,{key:'Enter'});expect(field).toHaveFocus();fireEvent.blur(field)
  expect(commit).not.toHaveBeenCalled();expect(field).toHaveValue(Number(draft));expect(field).toHaveAttribute('aria-invalid','true')
  expect(field).toHaveAccessibleDescription(expect.stringContaining('40–240'))
  fireEvent.keyDown(field,{key:'s',code:'KeyS',ctrlKey:true})
  expect(field).toHaveAccessibleDescription(expect.stringContaining('Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'))
  fireEvent.change(field,{target:{value:'101'}});field.focus();fireEvent.keyDown(field,{key:'Enter'});expect(field).not.toHaveFocus();fireEvent.blur(field)
  expect(commit).toHaveBeenCalledExactlyOnceWith('101');expect(field).not.toHaveAttribute('aria-invalid','true')
})
it('rejects native badInput instead of deleting the existing marking and Escape restores the saved value',()=>{
 const commit=vi.fn();render(<StudioTempoEventInput value={96} scope="1마디" onCommit={commit}/>);const field=screen.getByRole('spinbutton') as HTMLInputElement
 field.focus();fireEvent.change(field,{target:{value:''}});Object.defineProperty(field,'validity',{configurable:true,value:{badInput:true,valid:false}});fireEvent.blur(field)
 expect(commit).not.toHaveBeenCalled();expect(field).toHaveAttribute('aria-invalid','true')
 fireEvent.keyDown(field,{key:'Escape'});expect(field).toHaveValue(96);expect(commit).not.toHaveBeenCalled();expect(field).not.toHaveAttribute('aria-invalid','true')
})
it('keeps imported 360 BPM unchanged on no-edit blur and resets an invalid draft when the owner changes',()=>{
 const commit=vi.fn();const {rerender}=render(<StudioTempoEventInput key="a" value={360} scope="기존 값" onCommit={commit}/>)
 const field=screen.getByRole('spinbutton');field.focus();fireEvent.blur(field);expect(commit).not.toHaveBeenCalled();expect(field).toHaveValue(360)
 fireEvent.change(field,{target:{value:'999'}});fireEvent.blur(field);expect(commit).not.toHaveBeenCalled()
 rerender(<StudioTempoEventInput key="b" value={88} scope="다음 위치" onCommit={commit}/>);fireEvent.blur(field)
 expect(screen.getByRole('spinbutton')).toHaveValue(88);expect(screen.getByRole('spinbutton')).not.toHaveAttribute('aria-invalid','true');expect(commit).not.toHaveBeenCalled()
})
