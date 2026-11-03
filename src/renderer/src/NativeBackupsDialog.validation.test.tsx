// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks } from './App.test-harness'
import { NativeBackupsDialog } from './NativeBackupsDialog'

describe('invalid backup entry diagnostics',()=>{
 registerAppTestHooks()
 it('offers readable recovery guidance and keyboard-accessible raw details without restoring an invalid entry',async()=>{
  const raw='Invalid JSON /owned/backups/corrupt.chromatics',restore=vi.fn(),close=vi.fn(),globalKey=vi.fn()
  vi.mocked(window.inC.project.listBackups).mockResolvedValue([{id:'bad',fileName:'corrupt.chromatics',updatedAt:'',error:raw},{id:'good',fileName:'healthy.chromatics',title:'정상 백업',updatedAt:''}])
  window.addEventListener('keydown',globalKey)
  try{
   render(<NativeBackupsDialog theme="dark" onClose={close} onRestore={restore}/>)
   const bad=await screen.findByRole('button',{name:'corrupt.chromatics 복구'})
   expect(bad).toBeDisabled();expect(screen.getByRole('button',{name:'정상 백업 복구'})).toBeEnabled()
   const group=screen.getByRole('group',{name:'corrupt.chromatics 백업 검사'})
   expect(within(group).getByText('이 백업을 읽을 수 없습니다. 다른 백업을 선택해 주세요.')).toBeVisible()
   const toggle=within(group).getByRole('button',{name:'기술 정보'})
   expect(toggle).toHaveAttribute('aria-expanded','false');expect(within(group).getByText(raw)).not.toBeVisible()
   fireEvent.click(toggle);expect(toggle).toHaveAttribute('aria-expanded','true');expect(within(group).getByText(raw)).toBeVisible()
   fireEvent.keyDown(toggle,{key:'Enter'});fireEvent.keyDown(toggle,{key:' '})
   expect(globalKey).not.toHaveBeenCalled();expect(restore).not.toHaveBeenCalled()
   fireEvent.click(toggle);expect(within(group).getByText(raw)).not.toBeVisible()
   fireEvent.keyDown(toggle,{key:'Escape'});expect(close).toHaveBeenCalledOnce();expect(globalKey).not.toHaveBeenCalled()
  }finally{window.removeEventListener('keydown',globalKey)}
 })
 it('resets the same-id diagnostic disclosure across dialog instances and keeps the new raw error',async()=>{
  vi.mocked(window.inC.project.listBackups).mockResolvedValueOnce([{id:'same',fileName:'same.chromatics',updatedAt:'',error:'Old diagnostic'}]).mockResolvedValueOnce([{id:'same',fileName:'same.chromatics',updatedAt:'',error:'New diagnostic'}])
  const props={theme:'light' as const,onClose:vi.fn(),onRestore:vi.fn()}
  const first=render(<NativeBackupsDialog {...props}/>);fireEvent.click(await screen.findByRole('button',{name:'기술 정보'}));expect(screen.getByText('Old diagnostic')).toBeVisible();first.unmount()
  render(<NativeBackupsDialog {...props}/>);expect(await screen.findByRole('button',{name:'기술 정보'})).toHaveAttribute('aria-expanded','false')
  expect(screen.getByText('New diagnostic')).not.toBeVisible();expect(screen.queryByText('Old diagnostic')).not.toBeInTheDocument()
 })
})
