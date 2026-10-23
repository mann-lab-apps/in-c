import {useState, type CSSProperties} from 'react';
import {Bach, Mark, ProductGlyph, Button, IconButton, Search, Choices, Item, Dialog, Progress, ddiroriTokens} from '../src';
import candidates from '../../../docs/brand/ddirori-design-system/palette-candidates.json';
import system from '../../../docs/brand/ddirori-design-system/color-system.json';
import tokens from '../../../docs/brand/ddirori-design-system/tokens.json';
import './palette-comparison.css';

type Palette = typeof candidates.variants[number];
type Theme = 'light' | 'dark';
function variables(p: Palette, theme: Theme): CSSProperties {
  const source = p as unknown as Record<string, Record<string, string>>;
  return Object.fromEntries(Object.entries(tokens.themes[theme]).map(([key, value]) => {
    const parts = value.startsWith('@') ? value.slice(1).split('.') : [];
    const resolved = parts.length ? source[parts[0]]?.[parts[1]] : value;
    if (!resolved) throw Error('Unresolved palette token: ' + value);
    return ['--dd-' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), resolved];
  })) as CSSProperties;
}
const scores = [
  {title:'인벤션 1번 BWV 772', composer:'J. S. Bach', pages:3},
  {title:'평균율 클라비어곡집 제1권 전주곡과 푸가 다장조 BWV 846', composer:'J. S. Bach', pages:6},
  {title:'달빛', composer:'C. Debussy', pages:5},
];
export function PaletteComparison() {
  const [key, setKey] = useState(system.active), [theme, setTheme] = useState<Theme>('light');
  const [density, setDensity] = useState('comfortable'), [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'), [favorites, setFavorites] = useState([0]);
  const [selection, setSelection] = useState<number[]>([]), [opened, setOpened] = useState<number | null>(null);
  const palette = candidates.variants.find(p => p.key === key)!;
  const visible = scores.map((_, i) => i).filter(i => scores[i].title.includes(query) && (filter === 'all' || favorites.includes(i)));
  const content = ddiroriTokens.content[theme];
  return <div className="ddirori palette-review" data-theme={theme} data-density={density} style={variables(palette, theme)}>
    <header className="palette-review-head"><div><h1>띠로리 색상 작업실</h1><p>같은 화면에서 강조색만 비교합니다. 대표색은 검토 중이에요.</p></div><a href="./">공통 컴포넌트 ↗</a></header>
    <section className="palette-options" aria-label="팔레트 비교 설정">
      <div className="palette-accents" role="group" aria-label="강조색">{candidates.variants.map(p => <button key={p.key} type="button" aria-pressed={key === p.key} onClick={() => setKey(p.key)}><i style={{background:p.brand.primary}} aria-hidden="true"/>{p.name}<span aria-hidden="true">{key === p.key ? '✓' : ''}</span></button>)}</div>
      <div className="palette-modes"><label>테마 <select aria-label="테마" value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="light">밝은 화면</option><option value="dark">어두운 화면</option></select></label><label>밀도 <select aria-label="밀도" value={density} onChange={e => setDensity(e.target.value)}><option value="comfortable">기본</option><option value="compact">촘촘하게</option></select></label></div>
    </section>
    <div className="palette-workspace">
      <section className="palette-library" aria-label="악보함 비교 예제">
        <div className="palette-product"><ProductGlyph product="score" size={28}/><strong>띠로리 스코어</strong></div>
        <div className="palette-library-title"><h2>내 악보</h2><span>{scores.length}곡</span></div>
        <Search value={query} onChange={setQuery} label="악보 검색"/>
        <div className="palette-filters"><Choices label="악보 필터" options={[{value:'all',label:'전체'},{value:'favorite',label:'즐겨찾기'}]} selected={[filter]} onChange={v => v[0] && setFilter(v[0])}/><span>{selection.length ? `${selection.length}개 선택` : '최근순'}</span></div>
        <div className="palette-score-list">{visible.map(i => <Item key={i} title={scores[i].title} subtitle={`${scores[i].composer} · 피아노 · ${scores[i].pages}페이지`} selecting selected={selection.includes(i)} onSelected={v => setSelection(s => v ? [...s,i] : s.filter(n => n !== i))} onOpen={() => setOpened(i)} actions={<IconButton label={scores[i].title + ' 즐겨찾기'} selected={favorites.includes(i)} onClick={() => setFavorites(s => s.includes(i) ? s.filter(n => n !== i) : [...s,i])}>{favorites.includes(i) ? '★' : '☆'}</IconButton>}/>)}</div>
        {!visible.length && <div className="palette-empty"><Bach size={64}/><h3>찾는 악보가 없어요</h3><Button kind="secondary" onClick={() => {setQuery('');setFilter('all');}}>검색 초기화</Button></div>}
        <p className="palette-caption">공통 Search·Choices·Item을 사용한 웹 비교 예제. 실제 Flutter 악보함 캡처는 문서에 별도로 기록합니다.</p>
      </section>
      <aside className="palette-roles" aria-label="역할별 색상">
        <h2>{palette.name}</h2><p>바탕은 그대로, 필요한 곳에만 색.</p>
        <div className="palette-role-row"><span>대표색 후보</span><code>{palette.brand.primary}</code><i style={{background:palette.brand.primary}}/></div>
        <div className="palette-role-row"><span>행동</span><code>{theme === 'light' ? palette.light.primary : palette.darkProposal.primary}</code><i style={{background:'var(--dd-action)'}}/></div>
        <div className="palette-role-row"><span>선택 면</span><code>{theme === 'light' ? palette.light.tint : palette.darkProposal.tint}</code><i style={{background:'var(--dd-selection)'}}/></div>
        <div className="palette-states"><Button onClick={() => setOpened(0)}>악보 열기</Button><Button disabled>사용 불가</Button></div>
        <div className="palette-identity"><span style={{background:palette.brand.primary,color:palette.brand.onPrimary}}><Mark size={48}/></span><span style={{background:palette.brand.primary}}><Bach size={56}/></span><div><strong>음형과 바흐</strong><small>표정과 형태로 친근하게</small></div></div>
        <details><summary>로딩과 상태색</summary><Progress label="악보 준비 중"/><ul className="palette-status"><li style={{color:'var(--dd-success)'}}>✓ 가져오기 완료</li><li style={{color:'var(--dd-warning)'}}>△ 파일 연결 확인</li><li style={{color:'var(--dd-error)'}}>! 파일을 열 수 없음</li></ul></details>
      </aside>
    </div>
    <section className="palette-content" aria-labelledby="content-title"><div className="palette-section-title"><h2 id="content-title">콘텐츠의 색</h2><p>옅은 면 + 진한 선. 컬렉션 표지·일러스트에 쓰고, 앱 배경에는 펼치지 않습니다.</p></div>
      <div className="palette-content-grid">{Object.entries(system.content).map(([name,c]) => {
        const fill = content[(name+'Fill') as keyof typeof content], stroke = content[(name+'Stroke') as keyof typeof content];
        return <figure key={name}><svg viewBox="0 0 160 82" role="img" aria-label={c.name+' 면과 빗금 예시'}><defs><pattern id={'hatch-'+name} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><path d="M0 0V8" stroke={stroke} strokeWidth="1.5"/></pattern></defs><path d="M10 13 Q46 7 72 14 L70 66 Q41 72 10 65Z" fill={fill} stroke={stroke} strokeWidth="2"/><path d="M85 15 Q117 8 149 14 L148 66 L84 65Z" fill={fill} stroke={stroke} strokeWidth="2"/><path d="M87 16 L148 14 L146 64 L85 64Z" fill={'url(#hatch-'+name+')'}/></svg><figcaption>{c.name}<code>{fill} / {stroke}</code></figcaption></figure>;
      })}</div>
    </section>
    <section className="palette-rules"><h2>색의 경계</h2><p>페이지·툴바는 중립색. 선택은 색과 체크를 함께. 안내는 색과 문구를 함께. 악보 지면과 저장된 주석 색은 테마와 별도로 유지합니다.</p><div className="palette-paper"><span>악보 지면</span><code>#FFFFFF / #202020</code></div></section>
    <Dialog open={opened !== null} title={opened === null ? '악보 정보' : scores[opened].title} onClose={() => setOpened(null)} actions={<Button kind="secondary" onClick={() => setOpened(null)}>닫기</Button>}><p>{opened === null ? '' : `${scores[opened].composer} · ${scores[opened].pages}페이지`}</p><p>색상·입력 상태를 비교하는 샘플입니다. PDF 파일은 열지 않습니다.</p></Dialog>
  </div>;
}
