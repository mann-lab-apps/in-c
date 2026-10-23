import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { Text, ServiceLink, Button, Search, NumberControl, Choices, PageControls, Progress, TunerMeter } from './index';
afterEach(cleanup);
describe('Ddirori contracts', () => {
    it('locks async action synchronously and re-enables after completion', async () => {
        let finish!: () => void;
        const action = vi.fn(() => new Promise<void>(r => finish = r));
        render(<Button onClick={action}>저장</Button>);
        const button = screen.getByRole('button');
        fireEvent.click(button);
        fireEvent.click(button);
        expect(action).toHaveBeenCalledTimes(1);
        expect(button.hasAttribute('disabled')).toBe(true);
        await act(async () => finish());
        expect(button.hasAttribute('disabled')).toBe(false);
    });
    it('syncs external query and clear delegates to parent', () => {
        const changed = vi.fn();
        const { rerender } = render(<Search value="바흐" onChange={changed}/>);
        rerender(<Search value="평균율" onChange={changed}/>);
        expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('평균율');
        fireEvent.click(screen.getByRole('button', { name: '검색 지우기' }));
        expect(changed).toHaveBeenLastCalledWith('');
    });
    it('rejects invalid numeric entry before emitting', () => {
        const changed = vi.fn();
        render(<NumberControl label="빠르기" value={96} min={40} max={240} onChange={changed}/>);
        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '999' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(changed).not.toHaveBeenCalled();
        expect(screen.getByText(/범위로 입력/)).toBeTruthy();
        fireEvent.change(input, { target: { value: '120' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(changed).toHaveBeenLastCalledWith(120);
    });
    it('multi-choice adds and removes without losing peers', () => {
        const changed = vi.fn();
        const options = [{ value: 1, label: '피아노' }, { value: 2, label: '현악' }];
        render(<Choices label="악기" options={options} selected={[1]} onChange={changed} multiple/>);
        fireEvent.click(screen.getByRole('button', { name: '현악' }));
        expect(changed).toHaveBeenLastCalledWith([1, 2]);
        fireEvent.click(screen.getByRole('button', { name: '피아노' }));
        expect(changed).toHaveBeenLastCalledWith([]);
    });
    it('page edges block navigation', () => {
        const changed = vi.fn();
        render(<PageControls page={1} count={2} onChange={changed}/>);
        expect((screen.getByRole('button', { name: '이전 페이지' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
        expect(changed).toHaveBeenLastCalledWith(2);
    });
    it('progress exposes measured value only when available', () => {
        const { rerender } = render(<Progress label="준비"/>);
        expect(screen.getByRole('progressbar').hasAttribute('aria-valuenow')).toBe(false);
        rerender(<Progress label="가져오기" value={.65}/>);
        expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('65');
    });
    it('tuner no-signal cannot expose a stale numeric pitch', () => {
        render(<TunerMeter status="noSignal" cents={12}/>);
        expect(screen.getByRole('img').getAttribute('aria-label')).toBe('A4 신호 없음');
        expect(screen.queryByText('12 cents')).toBeNull();
    });
});

it('service handoff blocks unavailable destinations and names external actions', () => {
 const open=vi.fn();const {rerender}=render(<ServiceLink product="play" name="띠로리 플레이" description="관련 연주" availability="unavailable" onOpen={open}/>);
 fireEvent.click(screen.getByRole('button'));expect(open).not.toHaveBeenCalled();
 rerender(<ServiceLink product="play" name="띠로리 플레이" description="관련 연주" availability="external" onOpen={open}/>);
 fireEvent.click(screen.getByRole('button',{name:'띠로리 플레이 · 외부 서비스로 이동'}));expect(open).toHaveBeenCalledOnce();
});

it('visual title role preserves the requested heading level', () => {
 render(<Text as="h3" variant="screenTitle">작품 목록</Text>);
 expect(screen.getByRole('heading', {level:3}).className).toContain('dd-text--screen-title');
 expect(screen.queryByRole('heading', {level:1})).toBeNull();
});
