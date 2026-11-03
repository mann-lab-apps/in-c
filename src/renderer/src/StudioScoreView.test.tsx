// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { StudioScoreView } from './StudioScoreView'

afterEach(cleanup)
beforeEach(()=>{
  Object.defineProperty(HTMLElement.prototype,'showPopover',{configurable:true,value(this:HTMLElement){this.style.display='block'}})
  Object.defineProperty(HTMLElement.prototype,'hidePopover',{configurable:true,value(){}})
})

const parts=[{id:'p1',name:'Piano'},{id:'p2',name:'Piano'},{id:'p3',name:'1 · Piano'}]
it('distinguishes duplicate part names without changing names or the selected part IDs',()=>{
  const before=structuredClone(parts),onPart=vi.fn()
  render(<StudioScoreView mode="part" partId="p1" parts={parts} target="Piano" onMode={vi.fn()} onPart={onPart}/> )
  const select=screen.getByRole('combobox',{name:'파트보 선택'})
  expect(select).toHaveTextContent('1 · Piano');fireEvent.click(select)
  const list=within(screen.getByRole('listbox',{name:'파트보 선택'}))
  expect(list.getAllByRole('option').map(node=>node.textContent)).toEqual(['1 · Piano','2 · Piano','3 · 1 · Piano'])
  fireEvent.click(list.getByRole('option',{name:'2 · Piano'}))
  expect(onPart).toHaveBeenCalledExactlyOnceWith('p2');expect(parts).toEqual(before)
})

it('keeps duplicate-name keyboard cancellation and exact destination identity',()=>{
  const onPart=vi.fn(),global=vi.fn()
  render(<div onKeyDown={global}><StudioScoreView mode="part" partId="p1" parts={parts} target="Piano" onMode={vi.fn()} onPart={onPart}/></div>)
  const select=screen.getByRole('combobox',{name:'파트보 선택'});select.focus()
  fireEvent.keyDown(select,{key:' '});fireEvent.keyDown(select,{key:'End'});fireEvent.keyDown(select,{key:'Escape'})
  expect(select).toHaveFocus();expect(onPart).not.toHaveBeenCalled();expect(global).not.toHaveBeenCalled()
  fireEvent.click(select);fireEvent.click(screen.getByRole('option',{name:'3 · 1 · Piano'}))
  expect(onPart).toHaveBeenCalledExactlyOnceWith('p3')
})

it('retains unique names and disables part navigation in full-score mode',()=>{
  const onPart=vi.fn(),options=[{id:'p1',name:'Piano'},{id:'p2',name:'Cello'}]
  const view=render(<StudioScoreView mode="part" partId="p1" parts={options} target="Piano" onMode={vi.fn()} onPart={onPart}/> )
  const select=screen.getByRole('combobox',{name:'파트보 선택'});fireEvent.click(select)
  expect(screen.getByRole('option',{name:'Piano'})).toBeInTheDocument();expect(screen.getByRole('option',{name:'Cello'})).toBeInTheDocument()
  fireEvent.keyDown(select,{key:'Escape'});view.rerender(<StudioScoreView mode="score" partId="p1" parts={options} target="Piano" onMode={vi.fn()} onPart={onPart}/> )
  expect(select).toBeDisabled();expect(onPart).not.toHaveBeenCalled()
})
