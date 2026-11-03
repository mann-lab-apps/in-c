// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {useState} from 'react'
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {StudioDockResizeHandle} from './StudioDockResizeHandle'
let available=true,change:()=>void
beforeEach(()=>{
 available=true
 vi.stubGlobal('matchMedia',(media:string)=>({get matches(){return available},media,addEventListener:(_n:string,fn:()=>void)=>{change=fn},removeEventListener:()=>{}}))
 class TestPointerEvent extends MouseEvent{pointerId:number;pointerType:string;constructor(type:string,init:PointerEventInit){super(type,init);this.pointerId=init.pointerId??1;this.pointerType=init.pointerType??'mouse'}}
 vi.stubGlobal('PointerEvent',TestPointerEvent)
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
function Harness({changeWidth}:{changeWidth:(width:number)=>void}){const [width,setWidth]=useState(280);return <StudioDockResizeHandle name="palette" width={width} theme="light" onWidth={width=>{setWidth(width);changeWidth(width)}}/>}
const grip=()=>screen.getByRole('separator',{name:'팔레트 도크 폭 조절'})
describe('private dock resize session',()=>{
 it('clamps a captured pointer and cancels to the original width, without responding to other pointers',()=>{
  const onWidth=vi.fn();render(<Harness changeWidth={onWidth}/>);const n=grip()
  fireEvent.pointerDown(n,{pointerId:7,clientX:100,button:0});fireEvent.pointerMove(n,{pointerId:8,clientX:500});expect(onWidth).not.toHaveBeenCalled()
  fireEvent.pointerMove(n,{pointerId:7,clientX:140});expect(n).toHaveAttribute('aria-valuenow','320');fireEvent.pointerMove(n,{pointerId:7,clientX:900});expect(n).toHaveAttribute('aria-valuenow','360')
  fireEvent.keyDown(n,{key:'Escape'});expect(n).toHaveAttribute('aria-valuenow','280');fireEvent.pointerMove(n,{pointerId:7,clientX:200});expect(n).toHaveAttribute('aria-valuenow','280')
  fireEvent.pointerDown(n,{pointerId:9,clientX:100,button:0});fireEvent.pointerMove(n,{pointerId:9,clientX:-200});expect(n).toHaveAttribute('aria-valuenow','200');fireEvent.pointerUp(n,{pointerId:9});fireEvent.lostPointerCapture(n,{pointerId:9});expect(n).toHaveAttribute('aria-valuenow','200')
 })
 it('restores the original owner on cancellation, media change and unmount; ignores touch and alternate buttons',()=>{
  const onWidth=vi.fn(),view=render(<Harness changeWidth={onWidth}/>);const n=grip()
  fireEvent.pointerDown(n,{pointerId:1,clientX:100,button:2});fireEvent.pointerMove(n,{pointerId:1,clientX:200});fireEvent.pointerDown(n,{pointerId:1,clientX:100,button:0,pointerType:'touch'});fireEvent.pointerMove(n,{pointerId:1,clientX:200});expect(onWidth).not.toHaveBeenCalled()
  fireEvent.pointerDown(n,{pointerId:2,clientX:100,button:0});fireEvent.pointerMove(n,{pointerId:2,clientX:120});fireEvent.pointerCancel(n,{pointerId:2});expect(n).toHaveAttribute('aria-valuenow','280')
  fireEvent.pointerDown(n,{pointerId:3,clientX:100,button:0});fireEvent.pointerMove(n,{pointerId:3,clientX:130});act(()=>{available=false;change()});expect(screen.queryByRole('separator')).toBeNull();expect(onWidth).toHaveBeenLastCalledWith(280)
  act(()=>{available=true;change()});fireEvent.pointerDown(grip(),{pointerId:4,clientX:100,button:0});fireEvent.pointerMove(grip(),{pointerId:4,clientX:140});view.unmount();expect(onWidth).toHaveBeenLastCalledWith(280)
 })
 it('uses exact keyboard bounds and suppresses composing or modified changes',()=>{
  const onWidth=vi.fn();render(<Harness changeWidth={onWidth}/>);const n=grip();n.focus()
  fireEvent.keyDown(n,{key:'ArrowLeft'});expect(n).toHaveAttribute('aria-valuenow','264');fireEvent.keyDown(n,{key:'End',isComposing:true});fireEvent.keyDown(n,{key:'Home',ctrlKey:true});expect(n).toHaveAttribute('aria-valuenow','264')
  fireEvent.keyDown(n,{key:'Home'});fireEvent.keyDown(n,{key:'ArrowLeft'});expect(n).toHaveAttribute('aria-valuenow','200');fireEvent.keyDown(n,{key:'End'});fireEvent.keyDown(n,{key:'ArrowRight'});expect(n).toHaveAttribute('aria-valuenow','360');expect(n).toHaveFocus()
 })
})
