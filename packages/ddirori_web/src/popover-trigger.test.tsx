import React, { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Button, Menu, Popover } from './index'

const opened=new WeakSet<Element>()
const matches=Element.prototype.matches
beforeEach(()=>{
  vi.spyOn(Element.prototype,'matches').mockImplementation(function(this:Element,selector:string){
    return selector===':popover-open'?opened.has(this):matches.call(this,selector)
  })
})
// jsdom supplies no native top layer; this shim models open/close and visibility only.
// Native geometry/dismissal is verified separately in Electron.
Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){opened.add(this);this.style.display='block'}})
Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(this:HTMLElement){opened.delete(this);this.style.display='none'}})
afterEach(cleanup)

describe('public Popover trigger compatibility',()=>{
  it.each([undefined,'secondary','quiet'] as const)('keeps %s trigger semantics, first enabled focus and Escape return',kind=>{
    const command=vi.fn()
    function Example(){
      const[open,setOpen]=useState(false)
      return <div className="ddirori"><Popover label="Actions" menu open={open} onOpenChange={setOpen} triggerKind={kind}>
        <Button role="menuitem" disabled onClick={command}>Unavailable</Button>
        <Button role="menuitem" onClick={command}>Available</Button>
      </Popover></div>
    }
    render(<Example/>);
    const trigger=screen.getByRole('button',{name:'Actions'})
    expect(trigger.classList.contains(`dd-button--${kind??'secondary'}`)).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    const controls=trigger.getAttribute('aria-controls')
    fireEvent.keyDown(trigger,{key:'ArrowDown'})
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(screen.getByRole('menuitem',{name:'Available'}))
    expect(command).not.toHaveBeenCalled()
    fireEvent.keyDown(document.activeElement!,{key:'Escape'})
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute('aria-controls')).toBe(controls)
    expect(command).not.toHaveBeenCalled()
  })

  it.each(['menuitemcheckbox','menuitemradio'] as const)('focuses the first enabled %s without skipping checked menu roles',role=>{
    function Example(){
      const[open,setOpen]=useState(false)
      return <Popover label="State menu" menu open={open} onOpenChange={setOpen}>
        <Button role={role} aria-checked={false} disabled onClick={()=>{}}>Disabled state</Button>
        <Button role={role} aria-checked onClick={()=>{}}>Enabled state</Button>
        <Button role="menuitem" onClick={()=>{}}>Ordinary command</Button>
      </Popover>
    }
    render(<Example/>)
    const trigger=screen.getByRole('button',{name:'State menu'})
    fireEvent.keyDown(trigger,{key:'ArrowDown'})
    expect(document.activeElement).toBe(screen.getByRole(role,{name:'Enabled state'}))
    fireEvent.keyDown(document.activeElement!,{key:'Escape'})
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps the existing shared Menu consumer secondary without an opt-in',()=>{
    render(<div className="ddirori"><Menu label="Existing menu" items={[{id:'one',label:'One',onSelect:vi.fn()}]}/></div>)
    expect(screen.getByRole('button',{name:'Existing menu'}).classList.contains('dd-button--secondary')).toBe(true)
  })

  it.each([{isComposing:true},{keyCode:229}])('leaves composition keys to the IME: %j',composition=>{
    const localCommand=vi.fn()
    function Example(){
      const[open,setOpen]=useState(false)
      return <div className="ddirori"><Popover label="Composing menu" menu open={open} onOpenChange={setOpen} triggerKind="quiet" onKeyDown={localCommand}>
        <Button role="menuitem" onClick={()=>{}}>Action</Button>
      </Popover></div>
    }
    render(<Example/>);
    const trigger=screen.getByRole('button',{name:'Composing menu'})
    expect(fireEvent.keyDown(trigger,{key:'ArrowDown',...composition})).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.keyDown(trigger,{key:'ArrowDown'})
    const item=screen.getByRole('menuitem',{name:'Action'})
    expect(document.activeElement).toBe(item)
    expect(fireEvent.keyDown(item,{key:'Escape',...composition})).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(item)
    fireEvent.keyDown(item,{key:'ArrowDown',...composition})
    expect(localCommand).not.toHaveBeenCalled()
    fireEvent.keyDown(item,{key:'Escape'})
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })

  it.each([{isComposing:true},{keyCode:229}])('keeps an open surface and focused draft during composition Escape: %j',composition=>{
    function Example(){
      const[open,setOpen]=useState(false)
      return <Popover label="Draft settings" open={open} onOpenChange={setOpen}><input aria-label="Draft" defaultValue="unfinished"/></Popover>
    }
    render(<Example/>);
    const trigger=screen.getByRole('button',{name:'Draft settings'})
    fireEvent.click(trigger)
    const field=screen.getByRole<HTMLInputElement>('textbox',{name:'Draft'})
    expect(fireEvent.keyDown(field,{key:'Escape',...composition})).toBe(true)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('unfinished')
    fireEvent.keyDown(field,{key:'Escape'})
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
  })
})
