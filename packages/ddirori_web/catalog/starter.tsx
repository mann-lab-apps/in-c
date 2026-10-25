import { useState } from 'react';
import { Banner, Button, Input, Search, StatePanel, Text } from '@ddirori/ui';
import '@ddirori/ui/styles.css';

/** Runnable onboarding, deliberately in-memory. No product persistence. */
export function Starter() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(['평균율 클라비어곡집']);
  const [draft, setDraft] = useState('새 연습 기록');
  const [error, setError] = useState('');
  const [fail, setFail] = useState(true);
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);
  const visible = items.filter(item => item.includes(query));
  return <main className="ddirori" data-theme={dark ? 'dark' : 'light'} data-density={compact ? 'compact' : 'comfortable'} style={{maxWidth:640,margin:'auto',padding:24,minHeight:'100vh'}}>
    <Text as="h1" variant="screenTitle">도입 예제</Text>
    <p>메모리에서만 동작합니다. 첫 시도는 실패하며 새로고침하면 초기화됩니다.</p>
    <Button kind="quiet" onClick={() => setDark(!dark)}>테마 전환</Button>
    <Button kind="quiet" onClick={() => setCompact(!compact)}>밀도 전환</Button>
    <Search value={query} onChange={setQuery}/>
    {visible.length ? <ul>{visible.map((item,index) => <li key={index}>{item}</li>)}</ul> : <StatePanel title="검색 결과 없음" message="검색어를 바꿔 주세요."/>}
    <Input label="추가할 제목" value={draft} onChange={e => setDraft(e.target.value)}/>
    {error && <Banner kind="error">{error}</Banner>}
    <Button disabled={!draft.trim()} onError={() => setError('예제 오류: 입력을 유지했습니다. 다시 시도해 주세요.')} onClick={async () => {
      const value = draft.trim();
      await new Promise(resolve => setTimeout(resolve, 400));
      if (fail) { setFail(false); throw new Error('intentional demo failure'); }
      setItems(values => [...values, value]); setError('');
    }}>{error ? '다시 시도' : '예제 추가'}</Button>
  </main>;
}
