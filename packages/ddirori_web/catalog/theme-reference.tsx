import { useState, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Choices, Input, Mark, Text } from '../src';
import { Density, Select, Stack } from '../src/basic';
import { ExcerptRowExample, PropertyGroupExample } from './theme-recipes';
import '../src/styles.css';
import './theme-reference.css';
import candidates from '../../../docs/brand/ddirori-design-system/palette-candidates.json';
import sourceTokens from '../../../docs/brand/ddirori-design-system/tokens.json';

// Candidate comparison only. Normal services inherit their existing theme root.
function candidateVariables(accent: string, theme: 'light' | 'dark'): CSSProperties {
  const candidate = candidates.variants.find(p => p.key === accent);
  if (!candidate) throw new Error(`Unknown accent candidate: ${accent}`);
  const source = candidate as unknown as Record<string, Record<string, string>>;
  return Object.fromEntries(Object.entries(sourceTokens.themes[theme]).map(([key, value]) => {
    const parts = value.startsWith('@') ? value.slice(1).split('.') : [];
    const resolved = parts.length ? source[parts[0]]?.[parts[1]] : value;
    if (!resolved) throw new Error(`Unresolved theme role: ${key}`);
    return ['--dd-' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), resolved];
  })) as CSSProperties;
}

export function ThemeReference() {
  const params = new URLSearchParams(location.search);
  const [theme, setTheme] = useState<'light' | 'dark'>(params.get('theme') === 'dark' ? 'dark' : 'light');
  const [accent, setAccent] = useState(candidates.variants.some(p => p.key === params.get('accent')) ? params.get('accent')! : 'violet');
  const [saved, setSaved] = useState(false);
  const [secondSaved, setSecondSaved] = useState(false);
  const [name, setName] = useState('연습 구간 A');
  const [mode, setMode] = useState(['bar']);
  const [stateSelection, setStateSelection] = useState(['selected']);
  const [message, setMessage] = useState('목록 열기와 저장은 서로 독립된 동작이에요.');
  const [error, setError] = useState<string>();
  return <main className="ddirori theme-reference" data-theme={theme} data-accent={accent} data-density="comfortable" style={candidateVariables(accent, theme)}>
    <div className="theme-page">
      <header className="theme-header"><div className="theme-signature"><Mark size={32}/><Text variant="itemTitle">띠로리</Text><Text variant="description" className="theme-muted">디자인 시스템</Text></div><Text variant="caption" className="theme-muted">컴포넌트 조합 기준 · 2026.10</Text></header>
      <div className="theme-intro"><Text as="h1" variant="display">화면은 자유롭게, 문법은 같게.</Text><Text as="p" variant="body" className="theme-muted">서비스는 각자의 작업에 맞게 설계해요.<br/>글자, 여백, 표면, 조작 상태는 같은 기준으로 연결합니다.</Text></div>
      <div className="theme-settings">
        <Select label="테마" options={[{value:'light',label:'라이트'},{value:'dark',label:'다크'}]} value={theme} onChange={v => setTheme(v as 'light' | 'dark')}/>
        <Select label="강조색 후보 · 대표색 미확정" options={[{value:'violet',label:'바이올렛'},{value:'blue',label:'블루'},{value:'teal',label:'틸'},{value:'coral',label:'코럴'},{value:'yellow',label:'옐로'},{value:'lime',label:'라임 · 기존 임시값'}]} value={accent} onChange={setAccent}/>
      </div>
      <section className="theme-specimen" aria-labelledby="row-heading">
        <div className="theme-explanation"><Text variant="caption" className="theme-muted">01 / 목록</Text><Text as="h2" variant="sectionTitle" id="row-heading">내용부터 읽히게</Text><Text as="p" variant="description" className="theme-muted">반복되는 항목은 평평한 행으로 묶어요. 제목은 16/600, 부가 정보는 14/400. 개별 저장은 별도 버튼으로 구분합니다.</Text><Text as="p" variant="caption" className="theme-muted">공통 Item · IconButton + 서비스의 데이터·동작</Text></div>
        <div className="theme-demo">
          <div className="theme-row-list"><ExcerptRowExample title="프렐류드 · 첫 번째 구간" detail="피아노 · 1–8마디" saved={saved} onSave={() => {setSaved(!saved);setMessage(saved ? '저장을 해제했어요.' : '저장했어요.');}} onOpen={() => setMessage('구간 열기 동작을 요청했어요. 실제 문서는 열지 않는 예제입니다.')}/>
          <ExcerptRowExample title="아주 긴 작품명과 편성, 연습 구간이 함께 표시되어도 제목은 자연스럽게 줄바꿈해요" detail="현악 사중주 · 16–32마디" saved={secondSaved} onSave={() => {setSecondSaved(!secondSaved);setMessage(secondSaved ? '두 번째 항목 저장을 해제했어요.' : '두 번째 항목을 저장했어요.');}} onOpen={() => setMessage('두 번째 구간 열기를 요청했어요.')}/>
          <ExcerptRowExample title="준비 중인 구간" detail="현재 열 수 없어요" saved={false} disabled onSave={() => {}} onOpen={() => {}}/></div>
          <Text as="p" variant="caption" role="status" className="theme-muted theme-live">{message}</Text>
        </div>
      </section>
      <section className="theme-specimen" aria-labelledby="property-heading">
        <div className="theme-explanation"><Text variant="caption" className="theme-muted">02 / 속성 그룹</Text><Text as="h2" variant="sectionTitle" id="property-heading">작업 도구도 같은 테마로</Text><Text as="p" variant="description" className="theme-muted">컴팩트는 도구 묶음에만 적용해요. 필드·선택·실행을 나누고 설명과 오류가 들어갈 공간을 남깁니다.</Text><Text as="p" variant="caption" className="theme-muted">공통 Input · Choices · Button + 로컬 그룹</Text></div>
        <div className="theme-demo"><Density density="compact"><PropertyGroupExample title="구간 속성" value={name} error={error} mode={mode} onValue={v => {setName(v);setError(undefined);}} onMode={setMode} onApply={() => setError(name.trim() ? undefined : '이름을 입력해주세요.')}/></Density><Text as="p" variant="caption" className="theme-muted">빈 이름으로 적용하면 오류 상태를 확인할 수 있어요. 터치에서는 48px 조작 영역을 유지합니다.</Text></div>
      </section>
      <section className="theme-specimen" aria-labelledby="state-heading">
        <div className="theme-explanation"><Text variant="caption" className="theme-muted">03 / 상태와 위계</Text><Text as="h2" variant="sectionTitle" id="state-heading">색만으로 구분하지 않기</Text><Text as="p" variant="description" className="theme-muted">선택에는 체크, 오류에는 문장, 포커스에는 별도 윤곽이 있어요. Tab으로 실제 포커스를 확인하세요.</Text></div>
        <Stack gap="xl"><div className="theme-actions theme-actions--start"><Button onClick={() => setMessage('주요 동작 예제')}>주요 동작</Button><Button kind="secondary" onClick={() => setMessage('보조 동작 예제')}>보조 동작</Button><Button disabled>사용 불가</Button></div><Input label="표시 이름" defaultValue="" error="표시할 이름을 입력해주세요."/><Choices label="선택과 포커스 예제" options={[{value:'selected',label:'선택한 항목'},{value:'other',label:'다른 항목'}]} selected={stateSelection} onChange={setStateSelection}/><Text variant="numeric">12:48 · 120 BPM</Text></Stack>
      </section>
      <footer className="theme-footer"><Text as="p" variant="description">이 화면은 공통 문법의 기준 예제입니다. 앱의 탐색 구조와 주요 UX는 각 서비스에서 설계합니다.</Text><Text as="p" variant="caption" className="theme-muted">중립 UI · 당근의 정보 위계 · Excalidraw의 조용한 도구 표현 · MUI의 테마 확장 원리</Text></footer>
    </div>
  </main>;
}

createRoot(document.getElementById('root')!).render(<ThemeReference/>);
