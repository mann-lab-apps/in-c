import { useState } from 'react';
import { VexFlow } from 'vexflow';
import { Search, Button, StatePanel } from '../../src';
import type { Selection } from './model';

const symbols = [
  { name: '피아노', category: '셈여림', glyph: VexFlow.Glyphs.dynamicPiano, target: 'dynamic' },
  { name: '포르테', category: '셈여림', glyph: VexFlow.Glyphs.dynamicForte, target: 'dynamic' },
  { name: '스타카토', category: '아티큘레이션', glyph: VexFlow.Glyphs.articStaccatoAbove, target: 'note' },
  { name: '악센트', category: '아티큘레이션', glyph: VexFlow.Glyphs.articAccentAbove, target: 'note' },
  { name: '높은음자리표', category: '마디', glyph: VexFlow.Glyphs.gClef, target: 'measure' },
] as const;
export function Glyph({ glyph }: { glyph: string }) {
  return <svg className="studio-glyph" viewBox="0 0 56 64" aria-hidden="true"><text x="28" y="43" textAnchor="middle" fontFamily={VexFlow.getFonts().join(', ')} fontSize="30" fill="currentColor">{glyph}</text></svg>;
}
export function Palette({ available, onPick }: { available: boolean; onPick: (target: Selection, symbol: string) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [chosen, setChosen] = useState('');
  const items = symbols.filter(s => (category === '전체' || s.category === category) && s.name.includes(query.trim()));
  return <div className="studio-fields">
    <Search label="음악 기호 검색" value={query} onChange={setQuery} />
    <label>기호 분류<select value={category} onChange={e => setCategory(e.target.value)}>{['전체', '셈여림', '아티큘레이션', '마디'].map(v => <option key={v}>{v}</option>)}</select></label>
    <div className="studio-symbols">{items.map(s => <Button key={s.name} kind="secondary" selected={chosen === s.name} disabled={!available} title={s.name} onClick={() => { setChosen(s.name); onPick(s.target, s.name); }}><Glyph glyph={s.glyph} /><span>{s.name}</span></Button>)}</div>
    {!items.length ? <StatePanel title="일치하는 기호 없음" message="" action={<Button kind="secondary" onClick={() => { setQuery(''); setCategory('전체'); }}>검색 초기화</Button>} /> : null}
  </div>;
}
