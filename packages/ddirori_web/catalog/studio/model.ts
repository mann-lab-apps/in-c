export type Selection = 'none' | 'note' | 'multiple' | 'measure' | 'lyrics' | 'harmony' | 'dynamic' | 'span';
export type Duration = 'w' | 'h' | 'q' | '8' | '16';
export interface Note { id: string; pitch: string; duration: Duration; voice: number; dots: number }
export interface Draft {
  notes: Note[];
  lyric: string;
  harmony: string;
  dynamic: string;
  placement: string;
  spanStart: number;
  spanEnd: number;
  meter: string;
  key: string;
}
export function initialDraft(): Draft {
  return {
    notes: ['c/5', 'd/5', 'e/5', 'g/5'].map((pitch, i) => ({ id: `note-${i}`, pitch, duration: 'q', voice: i === 1 ? 2 : 1, dots: 0 })),
    lyric: '오늘도', harmony: 'C', dynamic: 'mf', placement: 'auto', spanStart: 1, spanEnd: 4, meter: '4/4', key: 'C',
  };
}
export interface History { present: Draft; past: Draft[]; future: Draft[] }
export type Edit = { type: 'edit'; patch: Partial<Draft> } | { type: 'undo' } | { type: 'redo' };
export function historyReducer(state: History, action: Edit): History {
  if (action.type === 'undo') return state.past.length ? { present: state.past.at(-1)!, past: state.past.slice(0, -1), future: [state.present, ...state.future] } : state;
  if (action.type === 'redo') return state.future.length ? { present: state.future[0], past: [...state.past, state.present], future: state.future.slice(1) } : state;
  const next = { ...state.present, ...action.patch };
  if (JSON.stringify(next) === JSON.stringify(state.present)) return state;
  return { present: next, past: [...state.past.slice(-49), state.present], future: [] };
}
export function selectedIds(selection: Selection): string[] {
  return selection === 'note' ? ['note-0'] : selection === 'multiple' ? ['note-0', 'note-1'] : [];
}
export function mixedValue<T>(values: T[]): T | 'mixed' | undefined {
  return values.length === 0 ? undefined : values.every(v => v === values[0]) ? values[0] : 'mixed';
}
export function resizeDock(value: number) { return Math.max(200, Math.min(360, value)); }
export function validateSetup(title: string, numerator: number, pickup: number) {
  if (!title.trim()) return '악보 제목을 입력해주세요.';
  if (!Number.isInteger(numerator) || numerator < 1 || numerator > 12) return '박자 분자는 1~12의 정수여야 합니다.';
  if (!Number.isInteger(pickup) || pickup < 0 || pickup >= numerator) return '못갖춘마디는 0 이상, 한 마디보다 짧아야 합니다.';
  return '';
}
export const selectionNames: Record<Selection, string> = {
  none: '선택 없음', note: '음표', multiple: '음표 2개', measure: '마디', lyrics: '가사', harmony: '코드', dynamic: '셈여림', span: '범위 표기',
};
