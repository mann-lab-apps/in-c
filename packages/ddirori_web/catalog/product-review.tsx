import {useState, type CSSProperties} from 'react';
import {Button, IconButton, Search, Choices, Item, Dialog, Input, Select, StatePanel, Progress, Banner, Bach, Transport} from '@ddirori/ui';
import {Music2, FileMusic, SlidersHorizontal, Pencil, ArrowLeft, Star, Plus, Undo2, Redo2} from 'lucide-react';
import palettes from '../../../docs/brand/ddirori-design-system/palette-candidates.json';
import tokens from '../../../docs/brand/ddirori-design-system/tokens.json';
import './product-review.css';

type App = 'play'|'score'|'studio';
type Theme = 'light'|'dark';
type State = 'ready'|'selection'|'empty'|'noresults'|'loading'|'error'|'disabled'|'success';
type Palette = typeof palettes.variants[number];
const shortlisted = ['violet','blue','coral'].map(key=>palettes.variants.find(p=>p.key===key)!);
const names: Record<App,string> = {play:'Play',score:'Score',studio:'Studio'};
const icons = Object.fromEntries(Object.entries(import.meta.glob('../../../docs/brand/ddirori-brand-system/icon-family-v8/generated/transparent/*.svg',{query:'?url',import:'default',eager:true})).map(([path,url])=>[path.split('/').at(-1)!.replace('.svg',''),url as string]));
const fixture = [
 {id:'bwv846',title:'평균율 — 전주곡과 푸가 다장조',detail:'J. S. Bach · BWV 846 · 6페이지',favorite:true},
 {id:'bwv772',title:'인벤션 1번',detail:'J. S. Bach · BWV 772 · 3페이지',favorite:false},
 {id:'l75',title:'달빛',detail:'C. Debussy · L. 75 · 5페이지',favorite:false},
];
const stateOptions: {value:State,label:string}[] = [
 {value:'ready',label:'기본'},{value:'selection',label:'선택'},{value:'empty',label:'처음 / 빈 목록'},
 {value:'noresults',label:'검색 없음'},{value:'loading',label:'준비 중'},
 {value:'error',label:'불러오기 실패'},{value:'disabled',label:'사용 불가'},{value:'success',label:'완료'},
];
function variables(p:Palette, theme:Theme):CSSProperties {
 const source=p as unknown as Record<string,Record<string,string>>;
 return Object.fromEntries(Object.entries(tokens.themes[theme]).map(([k,v])=>{
  const parts=v.startsWith('@')?v.slice(1).split('.'):[];
  return ['--dd-'+k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),parts.length?source[parts[0]][parts[1]]:v];
 })) as CSSProperties;
}
function AppIcon({app,size=32}:{app:App|'brand',size?:number}) {
 return <img className="pr-icon" src={icons[app]} width={size} height={size} alt=""/>;
}
function Paper({studio=false}:{studio?:boolean}) {
 return <figure className="pr-paper" aria-label="악보 배치용 정적 샘플. PDF 또는 사보 엔진이 아닙니다.">
  <figcaption>{studio?'연습곡 · 편집 배치 예제':'전주곡 다장조'}<small>정적 기보 예제 · 엔진 연결 없음</small></figcaption>
  <svg viewBox="0 0 460 240" role="img" aria-label="악보 작업 면의 간격과 대비 샘플">
   {[30,100,170].map(y=><g key={y}>{[0,10,20,30,40].map(d=><path key={d} d={`M20 ${y+d}H440`} stroke="#888" strokeWidth=".7"/>)}{[55,100,150,200,265,315,370,410].map((x,i)=><g key={x}><ellipse cx={x} cy={y+30-(i%3)*5} rx="5.5" ry="3.7" transform={`rotate(-20 ${x} ${y+30-(i%3)*5})`} fill="#202020"/><path d={`M${x+5} ${y+30-(i%3)*5}v-26`} stroke="#202020" strokeWidth="1.4"/></g>)}{[235,440].map(x=><path key={x} d={`M${x} ${y}v40`} stroke="#202020"/>)}</g>)}
  </svg><span>1 / 6</span>
 </figure>;
}
function Screen({app,palette,theme,state}:{app:App,palette:Palette,theme:Theme,state:State}) {
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all');
 const [selected,setSelected]=useState<string[]>(state==='selection'?[fixture[0].id]:[]),[selecting,setSelecting]=useState(state==='selection');
 const [favorites,setFavorites]=useState([fixture[0].id]);
 const [opened,setOpened]=useState(false),[edit,setEdit]=useState(false),[draft,setDraft]=useState('연습'),[savedGroup,setSavedGroup]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempt,setAttempt]=useState(0);
 const [playing,setPlaying]=useState(false),[position,setPosition]=useState(42);
 const [tool,setTool]=useState('read'),[height,setHeight]=useState(''),[committed,setCommitted]=useState('');
 const visible=fixture.filter(f=>(filter==='all'||favorites.includes(f.id))&&f.title.includes(query));
 const save=async()=>{
  setBusy(true);setError('');await new Promise(r=>setTimeout(r,900));setBusy(false);
  if(attempt===0){setAttempt(1);setError('저장하지 못했어요. 입력한 내용은 그대로예요. 다시 시도해주세요.');return;}
  setSavedGroup(draft);setNotice(`${selected.length}개 악보의 분류를 변경했어요. (메모리 예제)`);setEdit(false);setSelecting(false);setSelected([]);
 };
 const sampleMessage=(message:string)=>setNotice(`${message} · 기능을 연결하지 않은 시안입니다.`);
 const heading=app==='play'?'내 라이브러리':app==='score'?'내 악보':'연습곡';
 const uiState=state==='empty'||state==='noresults'||state==='loading'||state==='error';
 return <section className="ddirori pr-screen" data-app={app} data-theme={theme} data-density={app==='studio'?'compact':'comfortable'} style={variables(palette,theme)} aria-label={`${names[app]} ${palette.name} 시안`}>
  <header className="pr-appbar"><div><AppIcon app={app}/><strong>띠로리 {names[app]}</strong></div><span className="pr-muted">디자인 시안</span></header>
  <div className="pr-content">
   <div className="pr-title"><div><h2>{opened&&app==='score'?'전주곡 다장조':heading}</h2><p>{app==='play'?'내 파일에서 찾는 오늘의 연주':app==='score'?'다시 펼칠 음악을 모아두세요.':'저장됨 · 문서 상태 예제'}</p></div>{app!=='studio'&&!opened&&<IconButton label={app==='play'?'파일 가져오기':'악보 가져오기'} disabled={state==='disabled'} onClick={()=>sampleMessage('파일 선택 진입점')}><Plus size={20}/></IconButton>}</div>
   {(notice||state==='success')&&<Banner kind="success">{notice||'준비가 끝났어요. 이제 음악을 이어가세요.'}</Banner>}
   {uiState ? <div className="pr-state">{state==='loading'?<Progress label={app==='play'?'라이브러리 읽는 중':app==='score'?'악보 준비 중':'문서 여는 중'}/>:<StatePanel bachFace={state==='empty'} error={state==='error'} title={state==='empty'?(app==='studio'?'첫 음을 적어볼까요?':'첫 음악을 담아볼까요?'):state==='noresults'?'찾는 항목이 없어요':'파일을 열지 못했어요'} message={state==='empty'?'내 파일을 가져와 시작하세요.':state==='noresults'?'검색어나 필터를 바꿔보세요.':'파일이 이동했거나 읽을 수 없는 상태예요. 연결을 확인해주세요.'} action={<Button kind="secondary" onClick={()=>sampleMessage(state==='error'?'다시 연결':state==='empty'?'가져오기':'검색 초기화')}>{state==='error'?'다시 연결':state==='empty'?'가져오기':'검색 초기화'}</Button>}/>}</div>:
    app==='studio'?<>
     <div className="pr-tools"><Choices label="입력 도구" options={[{value:'read',label:'선택'},{value:'note',label:'음표'},{value:'object',label:'표기'}]} selected={[tool]} onChange={v=>v[0]&&setTool(v[0])}/><IconButton label="실행 취소" disabled><Undo2 size={18}/></IconButton><IconButton label="다시 실행" disabled><Redo2 size={18}/></IconButton></div>
     <div className="pr-editor"><Paper studio/><aside className="pr-inspector"><h3>선택 속성</h3><p className="pr-muted">크레셴도 · 1–2마디 · 예제</p><Select label="배치" value={tool==='object'?'below':'auto'} options={[{value:'auto',label:'자동'},{value:'below',label:'보표 아래'}]} onChange={v=>setTool(v==='below'?'object':'read')}/><Input label="세로 이동 (sp)" placeholder="자동" value={height} disabled={state==='disabled'} onChange={e=>setHeight(e.target.value)} onBlur={()=>setCommitted(height)} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){e.stopPropagation();setHeight(committed);}}} help="빈값은 자동 · 0은 명시적 위치"/><Button kind="quiet" disabled={state==='disabled'} onClick={()=>{setHeight('');setCommitted('');}}>자동 배치로 복원</Button><small>필드 배치 예제. 엔진·undo는 미연결.</small></aside></div>
    </>:opened&&app==='score'?<>
     <div className="pr-tools"><Button kind="quiet" onClick={()=>setOpened(false)}><ArrowLeft size={18}/> 악보함</Button><Choices label="뷰어 도구" options={[{value:'read',label:'읽기'},{value:'mark',label:'주석'}]} selected={[tool]} onChange={v=>v[0]&&setTool(v[0])}/><IconButton label="뷰어 설정" onClick={()=>sampleMessage('뷰어 설정')}><SlidersHorizontal size={18}/></IconButton></div><Paper/><p className="pr-muted">PDF·주석·페이지 넘김은 연결하지 않은 배치 시안입니다.</p>
    </>:<>
     <Search label={app==='play'?'작품 검색':'악보 검색'} value={query} onChange={setQuery}/>
     <div className="pr-filter"><Choices label="목록 필터" options={[{value:'all',label:'전체'},{value:'favorite',label:'즐겨찾기'}]} selected={[filter]} onChange={v=>v[0]&&setFilter(v[0])}/>{app==='score'?<Button kind="quiet" onClick={()=>{setSelecting(!selecting);setSelected([]);}}>{selecting?'선택 취소':'선택'}</Button>:<span className="pr-muted">작품별</span>}</div>
     {selecting&&<div className="pr-selection" role="status"><strong>{selected.length}개 선택</strong><Button disabled={!selected.length} onClick={()=>{setEdit(true);setError('');setAttempt(0);}}>일괄 편집</Button></div>}
     <div className="pr-list">{visible.map(f=><Item key={f.id} title={f.title} subtitle={app==='play'?f.detail.split(' · ').slice(0,2).join(' · ')+' · 녹음 2개':f.detail+(savedGroup?' · '+savedGroup:'')} leading={app==='play'?<Music2 size={22}/>:<FileMusic size={22}/>} selected={selected.includes(f.id)} selecting={selecting} disabled={state==='disabled'} onSelected={v=>setSelected(s=>v?[...s,f.id]:s.filter(id=>id!==f.id))} onOpen={()=>app==='score'?setOpened(true):sampleMessage('녹음 목록 진입점')} actions={app==='score'?<IconButton label={f.title+' 즐겨찾기'} selected={favorites.includes(f.id)} onClick={()=>setFavorites(s=>s.includes(f.id)?s.filter(id=>id!==f.id):[...s,f.id])}><Star size={18} fill={favorites.includes(f.id)?'currentColor':'none'}/></IconButton>:undefined}/>)}</div>
     {!visible.length&&<StatePanel title="찾는 항목이 없어요" message="검색어나 필터를 바꿔보세요." action={<Button kind="quiet" onClick={()=>{setQuery('');setFilter('all');}}>검색 초기화</Button>}/>}
     {app==='play'&&<div className="pr-player"><span className="pr-overline">현재 재생 · 표시 예제</span><h3>전주곡 다장조</h3><p>샘플 녹음 A · 피아노 · 로컬 파일</p><Transport playing={playing} position={position} duration={180} onToggle={()=>setPlaying(!playing)} onSeek={setPosition}/><small>오디오 없음 · 시간은 자동으로 흐르지 않습니다.</small></div>}
    </>}
  </div>
  <footer className="pr-screen-foot">{app==='studio'?'편집 작업 면 + 선택 속성':app==='play'?'작품 → 녹음 → 악장':'악보함 → 읽기 · 연습'}<span>R1 / {palette.name}</span></footer>
  <Dialog open={edit} title={`${selected.length}개 악보 일괄 편집`} busy={busy} onClose={()=>setEdit(false)} actions={<><Button kind="secondary" disabled={busy} onClick={()=>setEdit(false)}>취소</Button><Button busy={busy} onClick={save}>{error?'다시 저장':'저장'}</Button></>}>
   <p>검토용 메모리 저장입니다. 첫 저장은 실패하고 다음 시도는 성공합니다.</p>{error&&<Banner kind="error">{error}</Banner>}<Input label="분류" value={draft} readOnly={busy} onChange={e=>setDraft(e.target.value)}/>{busy&&<Progress label="분류 저장 중"/>}
  </Dialog>
 </section>;
}
function IconReview({palette}:{palette:Palette}) {
 const [labels,setLabels]=useState(true),[mono,setMono]=useState(false),[gray,setGray]=useState(false);
 return <section className="pr-icon-review"><h2>같은 가족, 다른 역할</h2><p>최신 v8 원본입니다. 외곽은 역할을, 내부 음형은 브랜드를 담당합니다. 16–32px에서 음가를 읽을 수 있다고 가정하지 않습니다.</p><div className="pr-tools"><Button selected={labels} kind="secondary" onClick={()=>setLabels(!labels)}>이름 {labels?'숨기기':'보기'}</Button><Button selected={mono} kind="secondary" onClick={()=>setMono(!mono)}>단색</Button><Button selected={gray} kind="secondary" onClick={()=>setGray(!gray)}>회색조</Button></div>
 {[false,true].map(dark=><div key={String(dark)} className={'pr-icon-mat '+(dark?'pr-icon-mat-dark':'')} style={{filter:gray?'grayscale(1)':undefined}}><h3>{dark?'어두운 배경':'밝은 배경'} · 홈 화면 / 앱 목록</h3><div className="pr-icon-family">{(['brand','play','studio','score'] as const).map((app,i)=><div key={app}><div className="pr-icon-sizes">{[16,24,32,48,64].map(size=><div key={size} style={{'--dd-brand':mono?'transparent':palette.brand.primary} as CSSProperties}><img src={icons[app]} className="pr-icon" alt={labels?(app==='brand'?'띠로리':names[app]):`후보 ${i+1}`} style={{filter:mono&&dark?'invert(1)':undefined}} width={size} height={size}/><small>{size}</small></div>)}</div><strong>{labels?(app==='brand'?'띠로리':names[app]):`후보 ${i+1}`}</strong></div>)}</div></div>)}
 <p>사람 대상 테스트는 아직 하지 않았습니다. 이름을 숨기고 “음악 재생 / 악보 읽기 / 악보 만들기”를 연결한 뒤, 이름을 보여주고 다시 확인하세요. 정답을 먼저 설명하지 않습니다.</p>
 </section>;
}
export function ProductReview() {
 const [mode,setMode]=useState('family'),[theme,setTheme]=useState<Theme>('light'),[key,setKey]=useState('violet'),[app,setApp]=useState<App>('score'),[state,setState]=useState<State>('ready');
 const p=shortlisted.find(x=>x.key===key)!;
 return <div className="ddirori pr-review" data-theme={theme} style={variables(p,theme)}>
  <a className="pr-skip" href="#product-content">비교 화면으로</a>
  <header className="pr-review-header"><div><span className="pr-overline">DDIRORI / PRODUCT DESIGN R1</span><h1>음악, 다음 시도로.</h1><p>Play · Score · Studio 화면 설계. 실제 공통 React 컴포넌트 + 검토용 데이터.</p></div><a href="?components">공통 컴포넌트 ↗</a></header>
  <div className="pr-settings"><Select label="비교 방식" value={mode} onChange={setMode} options={[{value:'family',label:'세 앱 나란히'},{value:'palettes',label:'같은 화면 · 세 팔레트'},{value:'flow',label:'한 앱 상세 / 상태'},{value:'icons',label:'아이콘 크기 / 용도'}]}/><Select label="팔레트" value={key} onChange={setKey} options={shortlisted.map(x=>({value:x.key,label:x.name}))}/><Select label="테마" value={theme} onChange={setTheme} options={[{value:'light',label:'밝은 화면'},{value:'dark',label:'어두운 화면'}]}/><Select label="대상 앱" value={app} onChange={setApp} options={(Object.keys(names) as App[]).map(a=>({value:a,label:names[a]}))}/><Select label="화면 상태" value={state} onChange={setState} options={stateOptions}/></div>
  <p className="pr-disclosure">디자인 시안 / 저장은 메모리 예제, 재생·파일·PDF·사보 엔진은 미연결. 팔레트와 런처는 미확정. 실제 제품 검토는 문서의 evidence를 참고하세요.</p>
  <main id="product-content" tabIndex={-1}>{mode==='icons'?<IconReview palette={p}/>:<div className={'pr-comparison '+(mode==='flow'?'pr-single':'')}>
   {mode==='family'?(Object.keys(names) as App[]).map(a=><Screen key={a+key+theme+state} app={a} palette={p} theme={theme} state={state}/>):mode==='palettes'?shortlisted.map(palette=><div key={palette.key}><div className="pr-palette-label"><Bach size={40}/><strong>{palette.name}</strong><code>{palette.brand.primary}</code></div><Screen key={app+theme+state} app={app} palette={palette} theme={theme} state={state}/></div>):<Screen key={app+key+theme+state} app={app} palette={p} theme={theme} state={state}/>}
  </div>}</main>
  <footer className="pr-review-foot"><strong>첫 구현 추천: Score 악보함 → 선택 → 일괄 편집</strong><p>선택 상태에서 일괄 편집을 열고 저장해보세요. 실패 후 입력 유지·재시도·성공을 확인할 수 있습니다. 팔레트 비교는 전환 직후 같은 데이터·상태이며 이후 조작은 각 화면에 독립적입니다.</p><p>대표색은 바이올렛 우선 비교를 제안합니다. 파랑은 친숙한 대안, 코럴은 따뜻한 대안입니다. 악보 지면과 상태색은 팔레트를 바꿔도 유지합니다.</p></footer>
 </div>;
}
