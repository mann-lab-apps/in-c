import { useReducer, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Undo2, Redo2, PanelLeftClose, PanelRightClose, Play, Square, Minus, Plus } from 'lucide-react';
import { VexFlow } from 'vexflow';
import { Button, IconButton, Toolbar, Choices } from '../../src';
import { historyReducer, initialDraft, selectedIds, selectionNames, resizeDock, type Duration, type Selection } from './model';
import { Inspector, durations } from './Inspector';
import { Palette, Glyph } from './Palette';
import { Score } from './Score';
import { FlowDialog, Mixer, flowNames, type Flow } from './Flows';
import './studio.css';

const durationGlyphs: Record<Duration, string> = { w: VexFlow.Glyphs.noteWhole, h: VexFlow.Glyphs.noteHalfUp, q: VexFlow.Glyphs.noteQuarterUp, '8': VexFlow.Glyphs.note8thUp, '16': VexFlow.Glyphs.note16thUp };
function Dock({ name, width, setWidth, close, children }: { name: string; width: number; setWidth: (n: number) => void; close: () => void; children: ReactNode }) {
  return <aside className="studio-dock" aria-label={name} tabIndex={-1}>
    <header><h2>{name}</h2><IconButton label={name + ' 숨기기'} onClick={close}>{name === '팔레트' ? <PanelLeftClose size={18} /> : <PanelRightClose size={18} />}</IconButton></header>
    <div className="studio-resize">
      <IconButton label={name + ' 폭 줄이기'} disabled={width <= 200} onClick={() => setWidth(resizeDock(width - 20))}><Minus size={14} /></IconButton>
      <input aria-label={name + ' 폭'} type="range" min={200} max={360} step={20} value={width} onChange={e => setWidth(Number(e.target.value))} />
      <IconButton label={name + ' 폭 늘리기'} disabled={width >= 360} onClick={() => setWidth(resizeDock(width + 20))}><Plus size={14} /></IconButton>
    </div>{children}
  </aside>;
}
export function Studio() {
  const [history, dispatch] = useReducer(historyReducer, { present: initialDraft(), past: [], future: [] });
  const [selection, setSelection] = useState<Selection>('note');
  const [mode, setMode] = useState('select');
  const [duration, setDuration] = useState<Duration>('q');
  const [voice, setVoice] = useState(1);
  const [dots, setDots] = useState(0);
  const [rest, setRest] = useState(false);
  const [accidental, setAccidental] = useState('auto');
  const [tuplet, setTuplet] = useState(false);
  const [palette, setPalette] = useState(true), [properties, setProperties] = useState(true);
  const [left, setLeft] = useState(220), [right, setRight] = useState(260);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [playing, setPlaying] = useState(false), [mixer, setMixer] = useState(false);
  const [notice, setNotice] = useState('저장 없음 · 상태 fixture');
  const paletteToggle = useRef<HTMLButtonElement>(null), propertiesToggle = useRef<HTMLButtonElement>(null);
  const ids = selectedIds(selection);
  const inputAvailable = mode === 'input';
  const editable = inputAvailable || ids.length > 0;
  const changeDuration = (value: Duration) => {
    if (inputAvailable) setDuration(value);
    else dispatch({ type: 'edit', patch: { notes: history.present.notes.map(n => ids.includes(n.id) ? { ...n, duration: value } : n) } });
  };
  return <section className="studio" aria-label="사보 상태 카탈로그">
    <header className="studio-heading"><div><h1>Chromatics</h1><span>사보 UI · 독립 디자인 카탈로그</span></div><output>파일·오디오 엔진 미연결</output></header>
    <nav className="studio-flows" aria-label="작업 흐름">{(Object.keys(flowNames) as Flow[]).map(f => <Button kind="quiet" key={f} onClick={() => setFlow(f)}>{flowNames[f]}</Button>)}</nav>
    <Toolbar label="편집 모드">
      <Choices label="작업 모드" options={[{ value: 'select', label: '선택 편집' }, { value: 'input', label: '음표 입력' }]} selected={[mode]} onChange={v => v[0] && setMode(v[0])} />
      <IconButton label="실행 취소" disabled={!history.past.length} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={18} /></IconButton>
      <IconButton label="다시 실행" disabled={!history.future.length} onClick={() => dispatch({ type: 'redo' })}><Redo2 size={18} /></IconButton>
      <IconButton label={playing ? '재생 위치 표시 정지' : '재생 위치 표시'} selected={playing} onClick={() => setPlaying(!playing)}>{playing ? <Square size={18} /> : <Play size={18} />}</IconButton>
      <label>선택 fixture<select aria-label="선택 fixture" value={selection} onChange={e => setSelection(e.target.value as Selection)}>{Object.entries(selectionNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </Toolbar>
    <Toolbar label="음표 입력 도구">
      <div role="group" aria-label="음가" className="studio-durations">{durations.map(d => <IconButton key={d.value} label={d.label} disabled={!editable} selected={inputAvailable ? duration === d.value : ids.length > 0 && history.present.notes.filter(n => ids.includes(n.id)).every(n => n.duration === d.value)} onClick={() => changeDuration(d.value)}><Glyph glyph={durationGlyphs[d.value]} /></IconButton>)}</div>
      <label>점<select aria-label="입력 점" disabled={!inputAvailable} value={dots} onChange={e => setDots(Number(e.target.value))}><option value={0}>없음</option><option value={1}>점 1개</option><option value={2}>점 2개</option></select></label>
      <label className="studio-check"><input type="checkbox" checked={rest} disabled={!inputAvailable} onChange={e => setRest(e.target.checked)} />쉼표</label>
      <label>임시표<select aria-label="임시표" disabled={!inputAvailable || rest} value={accidental} onChange={e => setAccidental(e.target.value)}><option value="auto">자동</option><option value="#">올림표</option><option value="b">내림표</option><option value="n">제자리표</option></select></label>
      <Choices label="입력 성부" disabled={!inputAvailable} options={[{ value: 1, label: '1성부' }, { value: 2, label: '2성부' }]} selected={[voice]} onChange={v => v[0] && setVoice(v[0])} />
      <label className="studio-check"><input type="checkbox" disabled={!inputAvailable} checked={tuplet} onChange={e => setTuplet(e.target.checked)} />셋잇단음표</label>
    </Toolbar>
    <div className="studio-context" role="status">{inputAvailable ? `입력 대기 · ${voice}성부 · ${durations.find(d => d.value === duration)?.label} · ${rest ? '쉼표' : '음표'} · 점 ${dots}개${tuplet ? ' · 3:2' : ''}` : `선택 편집 · ${selectionNames[selection]}`}</div>
    <div className="studio-view-controls">
      <button ref={paletteToggle} aria-pressed={palette} onClick={() => setPalette(!palette)}>팔레트</button>
      <button ref={propertiesToggle} aria-pressed={properties} onClick={() => setProperties(!properties)}>속성</button>
      <Button kind="quiet" selected={mixer} onClick={() => setMixer(!mixer)}>믹서</Button>
    </div>
    <div className="studio-workspace" style={{ '--studio-left': `${left}px`, '--studio-right': `${right}px`, gridTemplateColumns: `${palette ? 'minmax(0, var(--studio-left)) ' : ''}minmax(0, 1fr)${properties ? ' minmax(0, var(--studio-right))' : ''}` } as CSSProperties}>
      {palette ? <Dock name="팔레트" width={left} setWidth={setLeft} close={() => { setPalette(false); paletteToggle.current?.focus(); }}><Palette available={inputAvailable || selection !== 'none'} onPick={(target, symbol) => { setSelection(target); if (target === 'dynamic') dispatch({ type: 'edit', patch: { dynamic: symbol === '피아노' ? 'p' : 'f' } }); setNotice(`${symbol} · 속성 표본 선택`); }} /></Dock> : null}
      <div className="studio-canvas"><Score draft={history.present} selected={ids} playing={playing} input={inputAvailable} span={selection === 'span'} /><div className="studio-selection-summary">{selection === 'span' ? `끝점 표시 표본 · 시작 ${history.present.spanStart}음 / 끝 ${history.present.spanEnd}음 · 드래그 미연결` : selectionNames[selection]}</div></div>
      {properties ? <Dock name="속성" width={right} setWidth={setRight} close={() => { setProperties(false); propertiesToggle.current?.focus(); }}><Inspector selection={selection} draft={history.present} edit={patch => dispatch({ type: 'edit', patch })} /></Dock> : null}
    </div>
    {mixer ? <Mixer /> : null}
    <footer><output>{notice}</output><span>샘플 편집 {history.past.length}회</span></footer>
    {flow ? <FlowDialog key={flow} flow={flow} close={() => setFlow(null)} onCommand={command => { if (command === '팔레트 표시') setPalette(true); else if (command === '속성 표시') setProperties(true); else setSelection('none'); }} /> : null}
  </section>;
}
