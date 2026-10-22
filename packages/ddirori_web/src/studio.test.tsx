import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Studio } from '../catalog/studio/Studio';
import { FlowDialog, Mixer } from '../catalog/studio/Flows';
import { initialDraft, historyReducer, mixedValue, resizeDock, validateSetup } from '../catalog/studio/model';

// Notation is tested in a real browser; jsdom has no font/canvas layout engine.
vi.mock('../catalog/studio/Score', () => ({ Score: () => <div>Score fixture</div> }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
afterEach(cleanup);
describe('Studio state fixtures', () => {
  it('preserves undo/redo and invalidates redo after a new edit', () => {
    const start = { present: initialDraft(), past: [], future: [] };
    const changed = historyReducer(start, { type: 'edit', patch: { lyric: '가사' } });
    const undone = historyReducer(changed, { type: 'undo' });
    expect(undone.present).toEqual(start.present);
    expect(historyReducer(undone, { type: 'redo' }).present.lyric).toBe('가사');
    expect(historyReducer(undone, { type: 'edit', patch: { lyric: '다른 가사' } }).future).toEqual([]);
    expect(historyReducer(start, { type: 'undo' })).toBe(start);
  });
  it('distinguishes mixed and empty values, clamps docks, validates pickup', () => {
    expect(mixedValue([1, 2])).toBe('mixed'); expect(mixedValue([1, 1])).toBe(1); expect(mixedValue([])).toBeUndefined();
    expect(resizeDock(999)).toBe(360); expect(resizeDock(1)).toBe(200);
    expect(validateSetup('', 4, 0)).not.toBe('');
    expect(validateSetup('연습', 4, 4)).not.toBe('');
    expect(validateSetup('연습', 4, 1.5)).not.toBe('');
    expect(validateSetup('연습', 4, 1)).toBe('');
  });
  it('edits both selected notes, restores mixed voices with undo', () => {
    render(<Studio />);
    fireEvent.change(screen.getByLabelText('선택 fixture'), { target: { value: 'multiple' } });
    expect((screen.getByLabelText('선택 성부') as HTMLSelectElement).value).toBe('mixed');
    fireEvent.change(screen.getByLabelText('선택 성부'), { target: { value: '1' } });
    expect((screen.getByLabelText('선택 성부') as HTMLSelectElement).value).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: '실행 취소' }));
    expect((screen.getByLabelText('선택 성부') as HTMLSelectElement).value).toBe('mixed');
  });
  it('keeps input settings separate from selected notes and disables unavailable controls', () => {
    render(<Studio />);
    fireEvent.change(screen.getByLabelText('선택 fixture'), { target: { value: 'none' } });
    expect((screen.getByRole('button', { name: '8분음표' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '음표 입력' }));
    fireEvent.click(screen.getByRole('button', { name: '8분음표' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '쉼표' }));
    expect((screen.getByLabelText('임시표') as HTMLSelectElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '선택 편집' }));
    fireEvent.change(screen.getByLabelText('선택 fixture'), { target: { value: 'note' } });
    expect((screen.getByLabelText('선택 음가') as HTMLSelectElement).value).toBe('q');
  });
  it('restores a hidden dock and moves focus to its toggle', () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole('button', { name: '팔레트 숨기기' }));
    expect(screen.queryByRole('complementary', { name: '팔레트' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '팔레트' }));
    fireEvent.click(screen.getByRole('button', { name: '팔레트' }));
    expect(screen.getByRole('complementary', { name: '팔레트' })).toBeTruthy();
  });
  it('resets a palette search without silently choosing a symbol', () => {
    render(<Studio />);
    fireEvent.change(screen.getByRole('searchbox', { name: '음악 기호 검색' }), { target: { value: '없는 기호' } });
    expect(screen.getByText('일치하는 기호 없음')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '검색 초기화' }));
    expect(screen.getByRole('button', { name: '포르테' }).getAttribute('aria-pressed')).toBe('false');
  });
  it('prevents reversed span endpoints', () => {
    render(<Studio />);
    fireEvent.change(screen.getByLabelText('선택 fixture'), { target: { value: 'span' } });
    fireEvent.change(screen.getByLabelText('시작 음'), { target: { value: '3' } });
    expect((within(screen.getByLabelText('끝 음')).getByRole('option', { name: '3음' }) as HTMLOptionElement).disabled).toBe(true);
  });
});
describe('Studio workflow fixtures', () => {
  it('blocks invalid setup and permits correction', () => {
    render(<FlowDialog flow="new" close={() => {}} onCommand={() => {}} />);
    fireEvent.change(screen.getByLabelText('못갖춘마디 박 수'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: '샘플 적용' }));
    expect(screen.getByRole('alert').textContent).toContain('한 마디보다');
    expect(screen.queryByText(/샘플 결과 확인/)).toBeNull();
    fireEvent.change(screen.getByLabelText('못갖춘마디 박 수'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: '샘플 적용' }));
    expect(screen.getByText(/샘플 결과 확인/)).toBeTruthy();
  });
  it.each(['recovery', 'export'] as const)('%s requires acknowledgement and supports failure/retry', flow => {
    render(<FlowDialog flow={flow} close={() => {}} onCommand={() => {}} />);
    expect((screen.getByRole('button', { name: '샘플 실행' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: flow === 'recovery' ? '현재 변경 대체 확인' : '표기 손실 가능성 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '샘플 실행' }));
    expect(screen.getByRole('alert').textContent).toContain('기존 상태 유지');
    expect(screen.queryByText(/샘플 결과 확인/)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: '실패 응답 fixture' }));
    fireEvent.click(screen.getByRole('button', { name: '샘플 실행' }));
    expect(screen.getByText(/실제 파일 변경 없음/)).toBeTruthy();
  });
  it('command keyboard selection and no-result Enter are safe', () => {
    const command = vi.fn(), close = vi.fn();
    render(<FlowDialog flow="commands" onCommand={command} close={close} />);
    const query = screen.getByRole('searchbox');
    fireEvent.keyDown(query, { key: 'ArrowDown' }); fireEvent.keyDown(query, { key: 'Enter' });
    expect(command).toHaveBeenLastCalledWith('속성 표시');
    command.mockClear();
    fireEvent.change(query, { target: { value: '없는 명령' } }); fireEvent.keyDown(query, { key: 'Enter' });
    expect(command).not.toHaveBeenCalled();
  });
  it('validates margins instead of accepting empty numbers', () => {
    render(<FlowDialog flow="page" close={() => {}} onCommand={() => {}} />);
    fireEvent.change(screen.getByLabelText('네 방향 여백 mm'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '샘플 적용' }));
    expect(screen.getByRole('alert').textContent).toContain('5~40');
  });
  it('does not coerce an empty pickup to zero', () => {
    render(<FlowDialog flow="new" close={() => {}} onCommand={() => {}} />);
    fireEvent.change(screen.getByLabelText('못갖춘마디 박 수'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '샘플 적용' }));
    expect(screen.getByRole('alert').textContent).toContain('없으면 0');
  });
  it('closes command search on Escape even when the search text is nonempty', () => {
    const close = vi.fn();
    render(<FlowDialog flow="commands" close={close} onCommand={() => {}} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '검색 중' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('solo silences peers without rewriting their mute toggles', () => {
    render(<Mixer />);
    fireEvent.click(screen.getByRole('button', { name: '바이올린 1 솔로' }));
    expect(screen.getAllByText('음소거')).toHaveLength(7);
    expect(screen.getByRole('button', { name: '비올라 2 뮤트' }).getAttribute('aria-pressed')).toBe('false');
  });
});
