// @vitest-environment jsdom
import { expect,it,vi } from 'vitest'
import { createMeasureSelectionTarget } from './NotationPreview'

it('selects the concrete lower-staff measure rather than its primary ordinal peer',()=>{
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),select=vi.fn(),context=vi.fn(),placement={x:80,width:200,systemIndex:1}
 const primary=createMeasureSelectionTarget(svg,{measureId:'primary-bar-2',placement,selectedMeasureId:'lower-bar-2',onSelectMeasure:select,onOpenMeasureContextMenu:context})
 const lower=createMeasureSelectionTarget(svg,{measureId:'lower-bar-2',placement,selectedMeasureId:'lower-bar-2',onSelectMeasure:select,onOpenMeasureContextMenu:context})
 lower.dispatchEvent(new MouseEvent('click',{bubbles:true}));expect(select).toHaveBeenCalledExactlyOnceWith('lower-bar-2');expect(primary.classList.contains('is-selected')).toBe(false);expect(lower.classList.contains('is-selected')).toBe(true)
})
it('opens context for that same concrete measure and consumes the browser context event',()=>{
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),select=vi.fn(),context=vi.fn(),bubble=vi.fn();svg.addEventListener('contextmenu',bubble)
 const lower=createMeasureSelectionTarget(svg,{measureId:'other-part-bar-2',placement:{x:80,width:200,systemIndex:1},onSelectMeasure:select,onOpenMeasureContextMenu:context})
 const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:130,clientY:240});lower.dispatchEvent(event);expect(context).toHaveBeenCalledExactlyOnceWith('other-part-bar-2',{x:130,y:240});expect(event.defaultPrevented).toBe(true);expect(bubble).not.toHaveBeenCalled();expect(select).not.toHaveBeenCalled()
})
it('keeps late passive-staff measure targets behind actual note input while preserving target order',()=>{
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),select=vi.fn(),context=vi.fn(),placement={x:80,width:200,systemIndex:1}
 const first=createMeasureSelectionTarget(svg,{measureId:'upper',placement,onSelectMeasure:select,onOpenMeasureContextMenu:context})
 const note=document.createElementNS(svg.namespaceURI,'g');note.setAttribute('class','notation-event');svg.append(note)
 const later=createMeasureSelectionTarget(svg,{measureId:'lower',placement,onSelectMeasure:select,onOpenMeasureContextMenu:context})
 expect(svg.firstElementChild).toBe(first.parentElement)
 expect(first.parentElement).toBe(later.parentElement)
 expect([...first.parentElement!.children]).toEqual([first,later])
 expect(svg.lastElementChild).toBe(note)
 expect(note.nextElementSibling).toBeNull()
 later.dispatchEvent(new MouseEvent('click',{bubbles:true}))
 expect(select).toHaveBeenCalledExactlyOnceWith('lower')
})
