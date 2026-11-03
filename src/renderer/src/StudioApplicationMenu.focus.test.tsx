// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { registerAppTestHooks } from './App.test-harness'
import { StudioApplicationMenu } from './StudioApplicationMenu'

describe('application menu command focus ownership',()=>{
 registerAppTestHooks()
 it('dispatches a file command from its persistent trigger instead of a disappearing menu item',()=>{
  let owner:Element|null=null
  const command=vi.fn(()=>{owner=document.activeElement})
  render(<StudioApplicationMenu theme="dark" menus={[{id:'file',label:'파일',commands:[{id:'save',label:'프로젝트 저장',onSelect:command}]}]}/> )
  const trigger=screen.getByRole('button',{name:'파일'});fireEvent.click(trigger)
  const item=screen.getByRole('menuitem',{name:'프로젝트 저장'});item.focus();fireEvent.click(item)
  expect(command).toHaveBeenCalledOnce();expect(owner).toBe(trigger);expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute('aria-expanded','false')
 })
 it('allows a command to focus its real editing field without closing-menu cleanup stealing it',()=>{
  let owner:Element|null=null
  render(<><input aria-label="실제 편집 필드"/><StudioApplicationMenu theme="light" menus={[{id:'format',label:'형식',commands:[{id:'title',label:'제목 편집',onSelect:()=>{owner=document.activeElement;screen.getByRole('textbox',{name:'실제 편집 필드'}).focus()}}]}]}/></>)
  const trigger=screen.getByRole('button',{name:'형식'});fireEvent.click(trigger)
  const item=screen.getByRole('menuitem',{name:'제목 편집'});item.focus();fireEvent.click(item)
  expect(owner).toBe(trigger);expect(screen.getByRole('textbox',{name:'실제 편집 필드'})).toHaveFocus()
 })
})
