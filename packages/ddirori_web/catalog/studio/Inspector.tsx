import { Button, Input, StatePanel } from '../../src';
import { RotateCcw } from 'lucide-react';
import { mixedValue, selectedIds, selectionNames, type Draft, type Duration, type Selection } from './model';

export const durations: { value: Duration; label: string }[] = [
  { value: 'w', label: '온음표' }, { value: 'h', label: '2분음표' }, { value: 'q', label: '4분음표' }, { value: '8', label: '8분음표' }, { value: '16', label: '16분음표' },
];
export function Inspector({ selection, draft, edit }: { selection: Selection; draft: Draft; edit: (patch: Partial<Draft>) => void }) {
  const ids = selectedIds(selection);
  const notes = draft.notes.filter(n => ids.includes(n.id));
  const voice = mixedValue(notes.map(n => n.voice));
  const duration = mixedValue(notes.map(n => n.duration));
  return <div className="studio-fields">
    <h3>{selectionNames[selection]}</h3>
    {selection === 'none' ? <StatePanel title="선택한 객체 없음" message="" /> : null}
    {notes.length ? <>
      <label>선택 성부<select aria-label="선택 성부" value={voice ?? ''} onChange={e => edit({ notes: draft.notes.map(n => ids.includes(n.id) ? { ...n, voice: Number(e.target.value) } : n) })}>
        {voice === 'mixed' ? <option value="mixed" disabled>여러 값</option> : null}
        {[1, 2].map(v => <option key={v} value={v}>{v}성부</option>)}
      </select></label>
      <label>선택 음가<select aria-label="선택 음가" value={duration ?? ''} onChange={e => edit({ notes: draft.notes.map(n => ids.includes(n.id) ? { ...n, duration: e.target.value as Duration } : n) })}>
        {duration === 'mixed' ? <option value="mixed" disabled>여러 값</option> : null}
        {durations.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select></label>
    </> : null}
    {selection === 'measure' ? <>
      <label>박자표<select value={draft.meter} onChange={e => edit({ meter: e.target.value })}>{['2/4', '3/4', '4/4', '6/8'].map(v => <option key={v}>{v}</option>)}</select></label>
      <label>조표<select value={draft.key} onChange={e => edit({ key: e.target.value })}>{['C', 'G', 'F'].map(v => <option key={v}>{v}</option>)}</select></label>
    </> : null}
    {selection === 'lyrics' ? <Input label="가사 음절" value={draft.lyric} onChange={e => edit({ lyric: e.target.value })} /> : null}
    {selection === 'harmony' ? <Input label="코드 심벌" value={draft.harmony} onChange={e => edit({ harmony: e.target.value })} /> : null}
    {selection === 'dynamic' ? <label>셈여림<select value={draft.dynamic} onChange={e => edit({ dynamic: e.target.value })}>{['pp', 'p', 'mp', 'mf', 'f', 'ff'].map(v => <option key={v}>{v}</option>)}</select></label> : null}
    {selection === 'span' ? <>
      <label>시작 음<select value={draft.spanStart} onChange={e => edit({ spanStart: Number(e.target.value) })}>{[1, 2, 3].map(v => <option key={v} disabled={v >= draft.spanEnd} value={v}>{v}음</option>)}</select></label>
      <label>끝 음<select value={draft.spanEnd} onChange={e => edit({ spanEnd: Number(e.target.value) })}>{[2, 3, 4].map(v => <option key={v} disabled={v <= draft.spanStart} value={v}>{v}음</option>)}</select></label>
      <output>시작 {draft.spanStart}음 → 끝 {draft.spanEnd}음</output>
    </> : null}
    {selection !== 'none' ? <>
      <label>배치<select value={draft.placement} onChange={e => edit({ placement: e.target.value })} disabled={notes.length > 0 || selection === 'measure'}><option value="auto">자동</option><option value="above">보표 위</option><option value="below">보표 아래</option></select></label>
      <Button kind="secondary" disabled={draft.placement === 'auto' || notes.length > 0 || selection === 'measure'} onClick={() => edit({ placement: 'auto' })}><RotateCcw size={16} aria-hidden="true" /> 자동 배치 복원</Button>
    </> : null}
  </div>;
}
