import React from 'react';
import {afterEach, beforeAll, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {ConfirmDialog, Item, NumberControl} from './index';
afterEach(cleanup);
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});
it('numeric edits commit once across Enter and blur and ignore unchanged focus', () => {
  const change=vi.fn();render(<NumberControl label="빠르기" value={96} min={30} max={240} onChange={change}/>);
  const input=screen.getByRole('textbox');fireEvent.blur(input);expect(change).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'120'}});fireEvent.keyDown(input,{key:'Enter'});fireEvent.blur(input);
  expect(change.mock.calls).toEqual([[120]]);
  fireEvent.change(input,{target:{value:'121'}});fireEvent.blur(input);expect(change.mock.calls).toEqual([[120],[121]]);
});
it('composition Enter does not commit; Escape and external values reset draft', () => {
  const change=vi.fn();const {rerender}=render(<NumberControl label="빠르기" value={96} min={30} max={240} onChange={change}/>);
  const input=screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.compositionStart(input);fireEvent.change(input,{target:{value:'120'}});fireEvent.keyDown(input,{key:'Enter'});expect(change).not.toHaveBeenCalled();
  fireEvent.compositionEnd(input);fireEvent.keyDown(input,{key:'Enter'});expect(change).toHaveBeenCalledTimes(1);
  fireEvent.change(input,{target:{value:'150'}});fireEvent.keyDown(input,{key:'Escape'});expect(input.value).toBe('96');fireEvent.blur(input);expect(change).toHaveBeenCalledTimes(1);
  fireEvent.change(input,{target:{value:'200'}});rerender(<NumberControl label="빠르기" value={80} min={30} max={240} onChange={change}/>);
  expect(input.value).toBe('80');fireEvent.blur(input);expect(change).toHaveBeenCalledTimes(1);
});
it('invalid and disabled numeric drafts never emit', () => {
 const change=vi.fn();const {rerender}=render(<NumberControl label="값" value={10} min={0} max={20} onChange={change}/>);
 const input=screen.getByRole('textbox');for(const value of ['', 'NaN', '21']){fireEvent.change(input,{target:{value}});fireEvent.blur(input);}expect(change).not.toHaveBeenCalled();
 fireEvent.change(input,{target:{value:'15'}});rerender(<NumberControl label="값" value={10} min={0} max={20} disabled onChange={change}/>);fireEvent.blur(input);expect(change).not.toHaveBeenCalled();
});
it('confirmation blocks dismiss while pending, exposes failure and permits retry', async () => {
 let reject!: (error:Error)=>void;const close=vi.fn();const confirm=vi.fn(()=>new Promise<void>((_,r)=>reject=r));
 render(<ConfirmDialog open title="삭제" onClose={close} onConfirm={confirm}>선택 자료</ConfirmDialog>);
 const submit=screen.getByRole('button',{name:'삭제'});fireEvent.click(submit);fireEvent.click(submit);
 fireEvent.click(screen.getByRole('button',{name:'취소'}));fireEvent.click(screen.getByRole('button',{name:'닫기'}));fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}));
 expect(close).not.toHaveBeenCalled();expect(confirm).toHaveBeenCalledTimes(1);
 await act(async()=>reject(new Error('private path')));expect(screen.getByRole('alert').textContent).toContain('다시 시도');expect(screen.queryByText('private path')).toBeNull();
 confirm.mockImplementation(()=>Promise.resolve());fireEvent.click(screen.getByRole('button',{name:'삭제'}));await act(async()=>{});expect(confirm).toHaveBeenCalledTimes(2);expect(screen.queryByRole('alert')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'취소'}));expect(close).toHaveBeenCalledTimes(1);
});
it('an old confirmation failure does not overwrite a reopened dialog', async () => {
 let reject!: (error:Error)=>void;const confirm=()=>new Promise<void>((_,r)=>reject=r);const close=()=>{};
 const {rerender}=render(<ConfirmDialog open title="저장" onClose={close} onConfirm={confirm}>내용</ConfirmDialog>);
 fireEvent.click(screen.getByRole('button',{name:'저장'}));rerender(<ConfirmDialog open={false} title="저장" onClose={close} onConfirm={confirm}>내용</ConfirmDialog>);
 rerender(<ConfirmDialog open title="저장" onClose={close} onConfirm={confirm}>새 내용</ConfirmDialog>);
 await act(async()=>reject(new Error('old')));expect(screen.queryByRole('alert')).toBeNull();
});
it('disabled item makes leading and trailing actions inert', () => {
 render(<Item title="악보" disabled leading={<button>별도 행동</button>} actions={<button>메뉴</button>}/>);
 expect(screen.getByRole('button',{name:'별도 행동'}).closest('[inert]')).not.toBeNull();
 expect(screen.getByRole('button',{name:'메뉴'}).closest('[inert]')).not.toBeNull();
});

it('reopened confirmation can finish a newer action before the old failure', async () => {
 let rejectOld!: (e:Error)=>void;let finishNew!:()=>void;const close=()=>{};
 const confirm=vi.fn().mockImplementationOnce(()=>new Promise<void>((_,r)=>rejectOld=r)).mockImplementationOnce(()=>new Promise<void>(r=>finishNew=r));
 const {rerender}=render(<ConfirmDialog open title="저장" onClose={close} onConfirm={confirm}>첫 자료</ConfirmDialog>);
 fireEvent.click(screen.getByRole('button',{name:'저장'}));
 rerender(<ConfirmDialog open={false} title="저장" onClose={close} onConfirm={confirm}>첫 자료</ConfirmDialog>);
 rerender(<ConfirmDialog open title="저장" onClose={close} onConfirm={confirm}>새 자료</ConfirmDialog>);
 fireEvent.click(screen.getByRole('button',{name:'저장'}));expect(confirm).toHaveBeenCalledTimes(2);
 await act(async()=>finishNew());await act(async()=>rejectOld(new Error('old')));
 expect(screen.queryByRole('alert')).toBeNull();expect((screen.getByRole('button',{name:'저장'}) as HTMLButtonElement).disabled).toBe(false);
});
