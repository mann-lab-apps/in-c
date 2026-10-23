import {useState} from 'react';
import {Text, Button, IconButton, Input, Choices, Dialog, Banner, Progress, Toolbar, ddiroriTokens} from '../src';
import './foundations.css';

/** Contract fixture, not an app screen or a new production feature. */
export function Foundations() {
  const [theme, setTheme] = useState('light'), [density, setDensity] = useState('comfortable');
  const [selected, setSelected] = useState(false), [open, setOpen] = useState(false);
  const [query, setQuery] = useState(''), [choice, setChoice] = useState(['score']);
  return <main className="ddirori foundations" data-theme={theme} data-density={density}>
    <header><Text as="h1" variant="screenTitle">디자인 시스템 기준</Text><a href="./">컴포넌트</a><a href="?compare">팔레트 비교</a></header>
    <div className="foundation-controls"><label>테마<select aria-label="테마" value={theme} onChange={e=>setTheme(e.target.value)}><option>light</option><option>dark</option></select></label><label>밀도<select aria-label="밀도" value={density} onChange={e=>setDensity(e.target.value)}><option>comfortable</option><option>compact</option></select></label></div>
    <Text as="p" variant="description">공통 컴포넌트 계약을 확인하는 웹 예제입니다. 실제 악보앱·플레이 캡처는 문서에서 따로 확인합니다.</Text>
    <section aria-label="타이포 위계"><Text as="h2" variant="sectionTitle">글자의 역할</Text>
      <div className="foundation-type"><Text as="h3" variant="screenTitle">평균율 클라비어곡집 제1권</Text><Text as="p" variant="description">screenTitle · 24/700 · h3 의미를 유지하는 예제</Text></div>
      <div className="foundation-type"><Text as="h3" variant="itemTitle">전주곡과 푸가 다장조 BWV 846 · J. S. Bach</Text><Text as="p" variant="description">itemTitle · 16/600 / description · 14/400</Text></div>
      <Text as="p" variant="body">작품 이름이 길어지면 자연스럽게 줄을 바꿉니다. 한글과 영문, 작품 번호가 함께 있어도 읽는 순서를 유지합니다.</Text>
      <Text as="output" variant="numeric" aria-label="연습 수치">96 BPM · 03:28 / 12:00</Text>
      <Text as="p" variant="caption">캡션 12/500 · 부차적인 정보에만 사용</Text>
    </section>
    <section aria-label="상태 계약"><Text as="h2" variant="sectionTitle">실행·선택·포커스</Text><Toolbar label="상태 검증">
      <Button onClick={()=>setOpen(true)}>설정 열기</Button><Button kind="secondary" selected={selected} onClick={()=>setSelected(!selected)}>반복 연습 {selected?'켜짐':'꺼짐'}</Button>
      <IconButton label="즐겨찾기" selected={selected} onClick={()=>setSelected(!selected)}>{selected?'★':'☆'}</IconButton>
      <Button selected disabled onClick={()=>{}}>선택했지만 사용 불가</Button>
    </Toolbar><Choices label="자료 필터" options={[{value:'score',label:'악보'},{value:'recording',label:'녹음'}]} selected={choice} onChange={setChoice} multiple/>
      <Input label="작품 이름" value={query} onChange={e=>setQuery(e.target.value)} error={!query ? '작품 이름을 입력해주세요' : undefined}/>
      <Banner>선택은 면과 기호로, 키보드 포커스는 별도 링으로 표시합니다.</Banner>
    </section>
    <section aria-label="중첩 테마 검증"><Text as="h2" variant="sectionTitle">독립된 테마 영역</Text>
      <div className="ddirori foundation-nested" data-theme={theme==='light'?'dark':'light'} data-density="comfortable"><Text variant="body">바깥이 compact여도 이 영역은 comfortable입니다.</Text><Choices label="독립 필터" options={[{value:'all',label:'전체'}]} selected={['all']} onChange={()=>{}}/></div>
    </section>
    <section><Text as="h2" variant="sectionTitle">간격과 로딩</Text><div className="foundation-spacing">{Object.entries(ddiroriTokens.spacing).map(([key,n])=><div key={key}><span aria-hidden="true" style={{width:n}}/><Text variant="caption">{n}</Text></div>)}</div><Progress label="악보 준비 중"/></section>
    <Dialog title="연습 설정" open={open} onClose={()=>setOpen(false)} actions={<Button onClick={()=>setOpen(false)}>완료</Button>}><Input label="설정 이름" placeholder="연습 A"/><Text as="p" variant="body">Escape로 닫은 뒤 실행 버튼으로 포커스가 돌아옵니다.</Text></Dialog>
  </main>;
}
