import { useState } from 'react';
import { Button, Dialog, Input, Banner, Search } from '../../src';
import { validateSetup } from './model';

export type Flow = 'new' | 'page' | 'commands' | 'recovery' | 'export';
export const flowNames: Record<Flow, string> = { new: '새 악보', page: '페이지 설정', commands: '명령 검색', recovery: '백업 복구', export: 'MusicXML 내보내기' };
export function FlowDialog({ flow, close, onCommand }: { flow: Flow; close: () => void; onCommand: (command: string) => void }) {
  const [title, setTitle] = useState('현악 합주를 위한 아주 긴 한국어 제목의 연습곡');
  const [instrument, setInstrument] = useState('피아노');
  const [staves, setStaves] = useState('2');
  const [key, setKey] = useState('C');
  const [beats, setBeats] = useState('4');
  const [pickup, setPickup] = useState('0');
  const [error, setError] = useState('');
  const [scope, setScope] = useState('총보');
  const [paper, setPaper] = useState('A4');
  const [margin, setMargin] = useState('15');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [fail, setFail] = useState(true);
  const [state, setState] = useState<'idle' | 'error' | 'success'>('idle');
  const commands = ['팔레트 표시', '속성 표시', '선택 해제'].filter(c => c.includes(query.trim()));
  const action = () => {
    if (flow === 'new') {
      const message = pickup.trim() === '' ? '못갖춘마디 박 수를 입력해주세요. 없으면 0입니다.' : validateSetup(title, Number(beats), Number(pickup));
      setError(message);
      if (!message) setState('success');
    } else if (flow === 'page') {
      if (margin.trim() === '' || !Number.isFinite(Number(margin)) || Number(margin) < 5 || Number(margin) > 40) { setError('여백은 5~40 mm로 입력해주세요.'); return; }
      setError(''); setState('success');
    } else setState(fail ? 'error' : 'success');
  };
  return <Dialog open title={flowNames[flow]} onClose={close} actions={<>
    <Button kind="secondary" onClick={close}>닫기</Button>
    {flow !== 'commands' ? <Button disabled={(flow === 'recovery' || flow === 'export') && !confirm} onClick={action}>{state === 'error' ? '샘플 재시도' : flow === 'new' || flow === 'page' ? '샘플 적용' : '샘플 실행'}</Button> : null}
  </>}>
    <div className="studio-fields">
      {flow === 'new' ? <>
        <Input label="악보 제목" value={title} onChange={e => { setTitle(e.target.value); setState('idle'); }} />
        <label>악기<select value={instrument} onChange={e => setInstrument(e.target.value)}>{['피아노', '바이올린', '플루트'].map(v => <option key={v}>{v}</option>)}</select></label>
        <label>보표 수<select value={staves} onChange={e => setStaves(e.target.value)}><option>1</option><option>2</option></select></label>
        <label>조표<select value={key} onChange={e => setKey(e.target.value)}>{['C', 'G', 'F'].map(v => <option key={v}>{v}</option>)}</select></label>
        <Input label="박자 분자 (분모 4)" inputMode="numeric" value={beats} onChange={e => { setBeats(e.target.value); setState('idle'); }} />
        <Input label="못갖춘마디 박 수" inputMode="numeric" value={pickup} onChange={e => { setPickup(e.target.value); setState('idle'); }} />
        <output>{instrument} · {staves}보표 · {key} · {beats}/4</output>
      </> : null}
      {flow === 'page' ? <>
        <label>적용 대상<select value={scope} onChange={e => setScope(e.target.value)}><option>총보</option><option>바이올린 파트보</option></select></label>
        <label>용지<select value={paper} onChange={e => setPaper(e.target.value)}><option>A4</option><option>Letter</option></select></label>
        <Input label="네 방향 여백 mm" inputMode="decimal" value={margin} onChange={e => { setMargin(e.target.value); setState('idle'); }} />
        <div className="studio-page-preview" style={{ padding: `${Math.max(5, Math.min(40, Number(margin) || 5))}px` }}><div>{scope}<hr />{paper}<hr /><hr /></div></div>
      </> : null}
      {flow === 'commands' ? <div onKeyDown={e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(i => commands.length ? (i + (e.key === 'ArrowDown' ? 1 : commands.length - 1)) % commands.length : 0); }
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement && commands[active]) { e.preventDefault(); onCommand(commands[active]); close(); }
      }}>
        <Search label="명령 검색어" value={query} onChange={v => { setQuery(v); setActive(0); }} />
        <div className="studio-command-results" aria-label="명령 결과">{commands.map((command, i) => <Button key={command} kind="secondary" selected={i === active} onClick={() => { onCommand(command); close(); }}>{command}</Button>)}</div>
        <output aria-live="polite">{commands.length ? commands[active] : '검색 결과 없음'}</output>
      </div> : null}
      {flow === 'recovery' || flow === 'export' ? <>
        <Banner kind="warning">{flow === 'recovery' ? '선택한 백업: 연습곡 · 2026-10-22 10:30. 현재 미저장 변경을 대체하는 작업입니다.' : '범위 표기의 수동 배치가 MusicXML에서 달라질 수 있습니다. 원본 프로젝트는 유지됩니다.'}</Banner>
        <label className="studio-check"><input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} />{flow === 'recovery' ? '현재 변경 대체 확인' : '표기 손실 가능성 확인'}</label>
        <label className="studio-check"><input type="checkbox" checked={fail} onChange={e => { setFail(e.target.checked); setState('idle'); }} />실패 응답 fixture</label>
      </> : null}
      {error ? <Banner kind="error">{error}</Banner> : null}
      {state === 'error' ? <Banner kind="error">샘플 작업 실패 · 기존 상태 유지</Banner> : null}
      {state === 'success' ? <Banner kind="success">샘플 결과 확인 · 실제 파일 변경 없음</Banner> : null}
    </div>
  </Dialog>;
}

export function Mixer() {
  const [parts, setParts] = useState(Array.from({ length: 8 }, (_, i) => ({ name: `${['바이올린', '비올라', '첼로', '콘트라베이스'][i % 4]} ${i + 1}`, volume: 75, mute: false, solo: false })));
  const anySolo = parts.some(p => p.solo);
  return <section className="studio-mixer" aria-label="파트 믹서"><h2>파트 믹서</h2><div className="studio-mixer-list">{parts.map((part, index) => {
    const update = (patch: Partial<typeof part>) => setParts(v => v.map((p, i) => i === index ? { ...p, ...patch } : p));
    return <div className="studio-mixer-row" key={part.name}>
      <strong>{part.name}</strong>
      <label>{part.volume}%<input type="range" aria-label={part.name + ' 음량'} value={part.volume} min={0} max={100} onChange={e => update({ volume: Number(e.target.value) })} /></label>
      <Button kind="secondary" selected={part.mute} aria-label={part.name + ' 뮤트'} onClick={() => update({ mute: !part.mute })}>M</Button>
      <Button kind="secondary" selected={part.solo} aria-label={part.name + ' 솔로'} onClick={() => update({ solo: !part.solo })}>S</Button>
      <output>{part.mute || (anySolo && !part.solo) ? '음소거' : '활성'}</output>
    </div>;
  })}</div></section>;
}
