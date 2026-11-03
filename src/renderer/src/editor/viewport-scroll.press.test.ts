// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {observeDocumentScrollbarIntent} from './viewport-scroll'

describe('approved native scrollbar press ownership',()=>{
 beforeEach(()=>{
  vi.spyOn(document.documentElement,'clientWidth','get').mockReturnValue(1024)
  vi.spyOn(document.documentElement,'clientHeight','get').mockReturnValue(768)
  vi.spyOn(document.documentElement,'scrollWidth','get').mockReturnValue(1024)
  vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(1200)
  vi.spyOn(document.body,'getBoundingClientRect').mockReturnValue(new DOMRect(0,-100,1024,1200))
 })
 afterEach(()=>{vi.restoreAllMocks()})
 it.each([
  {kind:'overlay track press',target:'root',x:1021,y:400,button:0,expected:1},
  {kind:'stationary overlay thumb press',target:'root',x:1021,y:260,button:0,expected:1},
  {kind:'classic gutter',target:'root',x:1026,y:260,button:0,expected:1},
  {kind:'body content',target:'body',x:1021,y:400,button:0,expected:0},
  {kind:'content button',target:'button',x:1021,y:400,button:0,expected:0},
  {kind:'internal dock',target:'dock',x:200,y:400,button:0,expected:0},
  {kind:'document target',target:'document',x:1021,y:400,button:0,expected:0},
  {kind:'secondary button',target:'root',x:1021,y:400,button:2,expected:0},
  {kind:'middle button',target:'root',x:1021,y:400,button:1,expected:0},
  {kind:'outside body paint box',target:'root',x:900,y:600,button:0,box:[0,0,300,300],expected:0},
  {kind:'empty body paint box',target:'root',x:1021,y:400,button:0,box:[0,0,0,0],expected:0},
  {kind:'no scroll range',target:'root',x:1021,y:400,button:0,height:768,expected:0},
  {kind:'horizontal range',target:'root',x:1021,y:400,button:0,height:768,width:1200,expected:1},
  {kind:'classic gutter retains existing press policy without a range',target:'root',x:1026,y:400,button:0,height:768,expected:1}
 ])('$kind',value=>{
  if(value.box)vi.mocked(document.body.getBoundingClientRect).mockReturnValue(new DOMRect(...value.box as [number,number,number,number]))
  if(value.height!==undefined)vi.spyOn(document.documentElement,'scrollHeight','get').mockReturnValue(value.height)
  if(value.width!==undefined)vi.spyOn(document.documentElement,'scrollWidth','get').mockReturnValue(value.width)
  const content=document.createElement(value.target==='button'?'button':'div');document.body.append(content)
  const target=value.target==='root'?document.documentElement:value.target==='body'?document.body:value.target==='document'?document:content
  const intent=vi.fn(),dispose=observeDocumentScrollbarIntent(intent)
  try{
   target.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:value.x,clientY:value.y,button:value.button}))
   expect(intent).toHaveBeenCalledTimes(value.expected)
   target.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:value.x,clientY:value.y,button:value.button}))
   document.dispatchEvent(new Event('scroll'));document.body.dispatchEvent(new FocusEvent('focusin',{bubbles:true}))
   expect(intent).toHaveBeenCalledTimes(value.expected)
  }finally{dispose();content.remove()}
 })
 it('disposes one observer without losing a separate viewport owner',()=>{
  const first=vi.fn(),second=vi.fn(),a=observeDocumentScrollbarIntent(first),b=observeDocumentScrollbarIntent(second)
  const press=()=>document.documentElement.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:1021,clientY:400,button:0}))
  try{a();press();expect(first).not.toHaveBeenCalled();expect(second).toHaveBeenCalledOnce();b();press();expect(second).toHaveBeenCalledOnce()}finally{a();b()}
 })
})
