// @vitest-environment jsdom
import {expect,it,vi} from 'vitest'
import {isRestoringNotationFocus,restoreNotationFocus} from './focus-viewport'

it.each([false,true,undefined])('restores SVG keyboard ownership with viewport permission %s',permission=>{
 const canvas=document.createElement('div'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),target=document.createElementNS(svg.namespaceURI,'g')as SVGGElement
 target.setAttribute('tabindex','0');svg.append(target);canvas.append(svg);document.body.append(canvas);canvas.scrollLeft=100
 const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{}),during:boolean[]=[]
 vi.spyOn(target,'getBoundingClientRect').mockReturnValue(new DOMRect(110,500,20,40))
 vi.spyOn(canvas,'getBoundingClientRect').mockReturnValue(new DOMRect(0,0,800,800))
 target.addEventListener('focusin',()=>during.push(isRestoringNotationFocus(document.activeElement)))
 try{
  restoreNotationFocus(target,target,new DOMRect(50,60,20,40),canvas,permission)
  expect(document.activeElement).toBe(target);expect(during).toEqual([true]);expect(isRestoringNotationFocus(target)).toBe(false)
  if(permission===false){expect(scroll).not.toHaveBeenCalled();expect(canvas.scrollLeft).toBe(100)}
  else{expect(scroll).toHaveBeenCalledExactlyOnceWith(0,440);expect(canvas.scrollLeft).toBe(160)}
 }finally{canvas.remove();vi.restoreAllMocks()}
})
it('publishes an explicit selection or edit focus as a new intent rather than a passive redraw',()=>{
 const target=document.createElement('button');document.body.append(target);const observed:boolean[]=[]
 const scroll=vi.spyOn(window,'scrollBy').mockImplementation(()=>{})
 target.addEventListener('focusin',()=>observed.push(isRestoringNotationFocus(document.activeElement)))
 try{
  restoreNotationFocus(target,target,new DOMRect(0,0,0,0),null,true,false)
  expect(document.activeElement).toBe(target);expect(observed).toEqual([false]);expect(isRestoringNotationFocus(target)).toBe(false)
 }finally{target.remove();scroll.mockRestore()}
})
