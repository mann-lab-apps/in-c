import React from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {Item, List} from './index';

afterEach(cleanup);

it('flat rows keep open, selection, trailing and footer actions independent', () => {
  const open = vi.fn(), select = vi.fn(), info = vi.fn(), share = vi.fn();
  const {container} = render(<List label="악보">
    <Item title="연습곡" subtitle="작곡가" flat selecting selected onOpen={open} onSelected={select}
      trailing={<button onClick={info}>정보</button>}
      actions={<button onClick={share}>공유</button>} />
  </List>);
  expect(container.querySelector('.dd-item--flat')).not.toBeNull();
  expect(container.querySelector('.dd-item-trailing button')?.textContent).toBe('정보');
  fireEvent.click(screen.getByRole('button', {name: '정보'}));
  fireEvent.click(screen.getByRole('button', {name: '공유'}));
  expect(info).toHaveBeenCalledTimes(1);
  expect(share).toHaveBeenCalledTimes(1);
  expect(open).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('checkbox', {name: '연습곡 선택'}));
  expect(select.mock.calls).toEqual([[false]]);
  fireEvent.click(screen.getByRole('button', {name: '연습곡'}));
  expect(open).toHaveBeenCalledTimes(1);
  expect(container.querySelector('button button')).toBeNull();
});

it('disabled rows isolate all interactive slots and can become enabled again', () => {
  const open = vi.fn();
  const item = (disabled: boolean) => <Item title="녹음" disabled={disabled} onOpen={open}
    leading={<button>재생</button>} trailing={<button>메뉴</button>} actions={<button>내보내기</button>}/>;
  const {rerender} = render(item(true));
  for (const name of ['재생', '메뉴', '내보내기']) {
    expect(screen.getByRole('button', {name}).closest('[inert]')).not.toBeNull();
  }
  expect(screen.queryByRole('button', {name: '녹음'})).toBeNull();
  rerender(item(false));
  for (const name of ['재생', '메뉴', '내보내기']) {
    expect(screen.getByRole('button', {name}).closest('[inert]')).toBeNull();
  }
  fireEvent.click(screen.getByRole('button', {name: '녹음'}));
  expect(open).toHaveBeenCalledTimes(1);
});

it('existing card calls retain their defaults without empty trailing slots', () => {
  const {container} = render(<Item title="기존 카드" actions={<button>정보</button>}/>);
  expect(container.querySelector('.dd-item--flat')).toBeNull();
  expect(container.querySelector('.dd-item-trailing')).toBeNull();
  expect(container.querySelector('.dd-item-actions button')).not.toBeNull();
});
