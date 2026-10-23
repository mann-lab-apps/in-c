/* Isolated design review prototype. No app imports, persistence or network requests. */
const $ = s => document.querySelector(s);
const main = $('#main');
const params = new URLSearchParams(location.search);
const allowed = ['overview','library','reader','editor','components'];
let view = allowed.includes(params.get('view')) ? params.get('view') : 'overview';
let theme = params.get('theme') === 'dark' ? 'dark' : 'light';
let page = 1, annotation = false, practice = false, selected = params.get('state') === 'selected';
let playing = false, inputting = false, properties = true, filter = 'all', sortBy='recent';
const paths = {
  back:'M15 5 8 12l7 7', next:'m9 5 7 7-7 7', plus:'M12 5v14M5 12h14',
  more:'M5 12h.01M12 12h.01M19 12h.01', close:'m6 6 12 12M18 6 6 18',
  play:'m8 5 11 7-11 7Z', pause:'M8 5v14M16 5v14',
  pen:'m5 16 11-11 3 3L8 19l-4 1Z', undo:'M7 6 3 10l4 4M3 10h10a6 6 0 0 1 6 6',
  star:'m12 3 3 6 6 1-4.5 4.5 1 6-5.5-3-5.5 3 1-6L3 10l6-1Z',
  search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 5 5',
  menu:'M4 6h16M4 12h16M4 18h16', panel:'M3 4h18v16H3ZM15 4v16',
  check:'m5 12 4 4L19 6', book:'M4 4h16v16H4ZM8 4v16',
};
function icon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.more}"/></svg>`}
function ib(name,label,action,extra=''){return `<button class="icon quiet" aria-label="${label}" title="${label}" data-action="${action}" ${extra}>${icon(name)}</button>`}
function brand(product, original){return `<div class="app-brand"><img src="../assets/${product}-tile.svg" alt=""><span>기러기 ${product==='note'?'Note':'Studio'} <small>${original}</small></span></div>`}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('visible');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>t.classList.remove('visible'),3600)}
function applyTheme(){document.documentElement.dataset.theme=theme;$('#theme').textContent=theme==='dark'?'라이트':'다크';$('#theme').setAttribute('aria-label',theme==='dark'?'밝은 테마로 변경':'어두운 테마로 변경')}
function render(){
  document.documentElement.dataset.density=view==='editor'?'compact':'comfortable';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));
  if(view==='overview')renderOverview();if(view==='library')renderLibrary();if(view==='reader')renderReader();if(view==='editor')renderEditor();if(view==='components')renderComponents();
  applyTheme();
}
function navigate(next){view=next;params.set('view',view);params.set('theme',theme);history.replaceState(null,'','?'+params);render();main.focus({preventScroll:true})}
function restoreAction(action){if(action) document.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true})}
function renderOverview(){
  const family=[['play','Play','듣고, 새롭게 발견하기'],['note','Note','펼쳐 보고, 연습하기'],['studio','Studio','만들고, 다듬기'],['talk','Talk','듣고, 응답하기'],['stage','Stage','무대를 만나기']];
  main.innerHTML=`<article class="overview"><div class="hero"><div><div class="eyebrow">Gireogi · Together in flight</div><h1>함께,<br>다음 음악으로.</h1><p class="muted">각자의 날갯짓이, 함께 가는 방향으로.<br>서로의 시도에 응답하며 나아가는 음악의 공간.</p></div><figure class="flock-scene"><img class="flock-art" src="../assets/flock-${theme}.svg" alt="서로 간격을 두고 같은 방향으로 날아가는 일곱 기러기"><figcaption class="spread"><span class="small muted">각자의 날갯짓, 이어지는 흐름.</span><button class="quiet flight-replay" data-action="flight-replay">비행 다시 보기 ↗</button></figcaption></figure></div>
  <div class="spread"><h2>하나의 기러기, 다섯 가지 역할</h2><span class="small muted">제품명은 가칭</span></div><div class="family">${family.map(([key,name,desc])=>`<div><img src="../assets/${key}-tile.svg" alt="${name} 제안 아이콘"><h3>기러기 ${name}</h3><p class="muted">${desc}</p></div>`).join('')}</div>
  <div class="section-heading"><span class="eyebrow">Form / Focus / Response</span></div><div class="principles"><div><span class="muted">01 / 형태</span><strong>부분에서도 같은 가족.</strong><p class="muted">날개와 깃, 부리와 여백을 재구성한다. 기능마다 다른 실루엣을 가진다.</p></div><div><span class="muted">02 / 작업</span><strong>음악을 위한 자리.</strong><p class="muted">악보는 또렷하게, 도구는 필요한 만큼. 연습과 편집의 밀도를 구분한다.</p></div><div><span class="muted">03 / 반응</span><strong>상태가 말해 주는 UI.</strong><p class="muted">선택, 입력, 재생을 형태와 문구로도 구분한다. 색에만 기대지 않는다.</p></div></div>
  <h2>형태 계열 비교</h2><img class="comparison" src="../assets/icon-comparison.svg" alt="면과 여백을 사용하는 A안과 윤곽선을 사용하는 B안 비교"><div class="section-heading"><h2>크기와 색이 달라도</h2></div><img class="comparison" src="../assets/small-icons.svg" alt="32, 48, 64픽셀 단색, 역상, 원형 마스크 비교">
  <div class="section-heading"><h2>팔레트</h2></div><div class="swatches">${[['Ink','#223C3B'],['Cream','#FFF6E8'],['Apricot','#F5B878'],['Sky','#B7D0D7'],['Sage','#C1D0B4'],['Rose','#EAB6B4'],['Lilac','#CEC2DE']].map(([n,c])=>`<div class="swatch"><div class="swatch-color" style="background:${c}"></div><strong>${n}</strong><p class="small muted">${c}</p></div>`).join('')}</div><p class="readme-link muted">설계 제안 v1 · 실제 제품에 미적용 · <a href="../README.md">명세 문서</a></p></article>`;
}
const library=[
 {title:'작은 출발',composer:'기러기 디자인 예제',pages:3,tag:'연습',favorite:true},
 {title:'다음 모퉁이',composer:'기러기 디자인 예제',pages:2,tag:'합주',favorite:false},
 {title:'천천히 이어서',composer:'기러기 디자인 예제',pages:4,tag:'연습',favorite:true},
 {title:'긴 제목도 자연스럽게 이어지는 악보',composer:'기러기 디자인 예제',pages:12,tag:'초견',favorite:false}
];
function scoreRows(items){return items.map(s=>`<article class="score-row"><div class="score-thumb"><img src="../assets/practice-score.svg" alt=""></div><div><button class="score-open" data-action="open-score"><h2>${s.title}</h2><p class="muted">${s.composer}</p></button><div class="score-meta"><span>${s.pages}쪽</span><span>·</span><span>${s.tag}</span><span>·</span><span>로컬 사본</span></div></div>${ib('star',s.title+' 즐겨찾기','favorite',`aria-pressed="${s.favorite}" data-title="${s.title}"`)}</article>`).join('')}
function renderLibrary(){
  main.innerHTML=`<div class="app library-layout"><aside class="library-nav">${brand('note','Clef & Staff')}<div class="nav-items" aria-label="악보 분류"><button data-action="all" aria-pressed="${filter==='all'}">모든 악보 <span class="muted">4</span></button><button data-action="favorites" aria-pressed="${filter==='favorites'}">즐겨찾기</button><button data-action="setlists" aria-pressed="false">세트리스트</button></div><div class="library-note muted small">내 기기에 보관한 악보.<br>원본은 그대로 유지해요.</div></aside>
  <section class="library-main"><div class="library-heading spread"><div><div class="eyebrow muted">My library</div><h1>나의 악보함</h1></div><button class="primary" data-action="import">+ 가져오기</button></div><label class="search"><span class="sr-only" hidden>악보 검색</span><input id="search" type="search" aria-label="제목, 작곡가, 태그 검색" placeholder="제목, 작곡가, 태그 검색"></label><div class="filter-row"><button data-action="all" aria-pressed="${filter==='all'}">모든 악보</button><button data-action="practice-filter" aria-pressed="${filter==='practice'}">연습</button><button data-action="sort">최근 열어본 순 ↓</button></div><p id="result-count" class="small muted" style="margin-bottom:12px"></p><div id="results" class="score-list"></div><p class="small muted" style="margin-top:24px">목업용 창작 예제 4곡</p></section></div>`;
  updateResults();
  $('#search').addEventListener('input',updateResults);
}
function updateResults(){let q=($('#search')?.value||'').trim().toLowerCase();let items=library.filter(s=>(filter!=='favorites'||s.favorite)&&(filter!=='practice'||s.tag==='연습')&&`${s.title} ${s.composer} ${s.tag}`.toLowerCase().includes(q));if(sortBy==='title') items.sort((a,b)=>a.title.localeCompare(b.title,'ko'));$('#result-count').textContent=items.length+'곡';$('#results').innerHTML=items.length?scoreRows(items):`<div class="empty"><img src="../assets/parent-${theme==='dark'?'inverse':'a'}.svg" alt=""><h2>찾는 악보가 없어요</h2><p class="muted">검색어를 줄이거나 다른 분류를 살펴보세요.</p></div>`;}
function renderReader(){
  const focused=document.activeElement?.dataset.action;
  main.innerHTML=`<section class="reader ${annotation?'annotating':''}"><header class="reader-header"><div class="row">${ib('back','악보함으로 돌아가기','library')}<div><h1>작은 출발</h1><p class="muted">기러기 디자인 예제 · 로컬 사본</p></div></div><div class="row">${ib('book','북마크','bookmark')}${ib('more','악보 옵션','reader-options')}</div></header><div class="reader-mode"><div class="row"><button data-action="reading" aria-pressed="${!annotation}">보기</button><button data-action="annotation" aria-pressed="${annotation}">${annotation?'✓ ':''}주석</button><button data-action="practice" aria-expanded="${practice}" aria-controls="practice-panel">연습 도구</button></div><span class="small muted">${annotation?'주석 모드 · 원본은 유지':'한 페이지 · 원본 색상'}</span></div><div class="score-workspace"><div class="paper"><img src="../assets/practice-score.svg" alt="직접 만든 예제 작은 출발의 악보. 목업에서는 동일한 예제 페이지를 표시합니다."><svg class="ink-annotation" viewBox="0 0 400 150" aria-hidden="true"><path d="M22 89 Q110 18 202 81 M25 95 l-4 -10 12 -2 M115 132 Q155 142 190 131"/></svg></div></div>
  <section class="practice-panel ${practice?'open':''}" id="practice-panel" aria-label="연습 도구"><div class="practice-values"><div class="row"><h2>메트로놈</h2><span class="muted small">4/4 · 시각 데모</span></div><div class="row"><output id="bpm-value" for="bpm">80</output><span class="muted">BPM</span><button data-action="metronome" aria-pressed="false">시작</button></div></div><input id="bpm" type="range" min="40" max="160" value="80" aria-label="메트로놈 빠르기"><div class="spread"><div class="beat-dots" aria-hidden="true"><span></span><span></span><span></span><span></span></div><button class="quiet" data-action="tone">기준음 A4 · 440 Hz</button></div></section>
  <footer class="reader-footer"><span class="small muted">${annotation?'펜 · 황토 · 3px':'탭으로 도구 보기'}</span><div class="row"><button data-action="previous-page" ${page===1?'disabled':''}>이전</button><span class="page-count" aria-live="polite">${page} / 3</span><button data-action="next-page" ${page===3?'disabled':''}>다음</button></div><button class="quiet" data-action="${annotation?'reading':'annotation'}">${annotation?'주석 마침':'주석'}</button></footer></section>`;
  if($('#bpm')) $('#bpm').addEventListener('input',e=>$('#bpm-value').value=e.target.value);
  restoreAction(focused);
}
function renderEditor(){
  const focused=document.activeElement?.dataset.action;
  main.innerHTML=`<section class="editor ${selected?'selected':''} ${playing?'playing':''} ${inputting?'inputting':''}"><header class="editor-top">${brand('studio','Chromatics')}<div class="editor-file"><strong>작은 출발.chromatics</strong><span class="small muted">설계 예제</span><button data-action="save">저장 <kbd>⌘ S</kbd></button></div></header>
  <div class="toolbar" aria-label="악보 편집 도구"><button class="input-mode" data-action="input-mode" aria-pressed="${inputting}">${inputting?'＋ 입력 중':'음표 입력'}</button><span class="divider"></span><button data-action="duration" aria-pressed="true">4분 <kbd>5</kbd></button><button data-action="duration" aria-pressed="false">8분 <kbd>4</kbd></button><button data-action="duration" aria-pressed="false">쉼표</button><button data-action="notation">표기 객체</button><span class="divider"></span>${ib('undo','실행 취소','undo')}${ib(playing?'pause':'play',playing?'재생 정지':'재생','playback')}<span class="muted small">80 BPM</span><span style="flex:1"></span><button data-action="properties" aria-expanded="${properties}">속성 ${properties?'접기':'보기'}</button></div>
  <p class="editor-mobile-note">좁은 창 검토용 배치 · 주 작업 기준은 데스크톱입니다.</p><div class="editor-body ${properties?'':'no-properties'}"><aside class="editor-nav"><h3>악보 구성</h3><button class="part" aria-pressed="true" data-action="part">전체 악보<small>1개 악기 · 12마디</small></button><button class="part quiet" data-action="part">플루트<small>보표 1 · 성부 1</small></button><div class="property-section"><h3>보기</h3><button class="part quiet" data-action="fit">페이지에 맞춤</button><p class="muted small">음악 기호와 조판은<br>브랜드 테마와 분리합니다.</p></div></aside>
  <div class="editor-canvas"><div class="workspace-caption"><span>${inputting?'＋ 음표 입력 중':'선택 도구'} · 성부 1</span><span>100% · A4</span></div><div class="paper"><img src="../assets/practice-score.svg" alt="직접 만든 플루트 예제 악보 작은 출발"><button class="score-hit" data-action="select-score" aria-label="첫 번째 마디 선택">첫 번째 마디 선택</button><div class="range-mark" aria-hidden="true"></div><div class="play-line" aria-hidden="true"></div><div class="input-caret" aria-hidden="true"></div></div></div>
  <aside class="properties"><div class="spread"><h3>${selected?'선택 속성':'악보 속성'}</h3><span class="small muted">${selected?'1마디':'전체'}</span></div>${selected?`<div class="notice small">범위 선택<br><strong>플루트 · 1마디</strong></div><label>성부<select aria-label="성부"><option>성부 1</option><option>성부 2</option></select></label><label>선택 필터<select aria-label="선택 필터"><option>모든 표기</option><option>음표·쉼표</option></select></label><button data-action="clear-selection" style="width:100%">선택 해제 <kbd>Esc</kbd></button>`:`<p class="muted">악보에서 음표나 마디를 선택하면 해당 속성이 표시됩니다.</p><label>박자표<select aria-label="박자표"><option>4/4</option></select></label><label>조표<select aria-label="조표"><option>다장조</option></select></label>`}<div class="property-section"><h3>빠르게 작업하기</h3><p class="muted small">음가 선택 <kbd>1–7</kbd><br><br>범위 확장 <kbd>Shift + Click</kbd><br><br>실행 취소 <kbd>⌘ Z</kbd></p></div><div class="property-section"><h3>파일과 출력</h3><p class="muted small">프로젝트 저장과 교환용 내보내기를 구분합니다.</p><button data-action="export" style="margin-top:12px;width:100%">내보내기…</button></div></aside></div>
  <footer class="status-bar"><span role="status">${selected?'▣ 플루트 · 1마디 선택':inputting?'＋ 음표 입력 중 · 성부 1':'선택 도구 · 선택한 항목 없음'}</span><span class="muted">${playing?'▶ 재생 위치 표시 · 시각 데모':'프로젝트 / MusicXML / PDF'} </span></footer></section>`;
  restoreAction(focused);
}
function renderComponents(){main.innerHTML=`<article class="components"><div class="spread" style="margin-bottom:28px"><div><p class="eyebrow muted">Shared components</p><h1>작업을 또렷하게 하는 상태</h1></div><span class="muted small">Comfortable / 48px</span></div><div class="component-grid"><section class="sample"><h2>행동과 포커스</h2><div class="row"><button class="primary" data-action="example">악보 열기</button><button data-action="example">취소</button><button disabled>내보내기</button></div><p class="muted small" style="margin:20px 0 12px">키보드 포커스 · 3px / offset 3px</p><button class="focus-sample" data-action="example">가져오기</button></section><section class="sample"><h2>입력과 복구</h2><label for="sample-title">악보 제목</label><input id="sample-title" value="작은 출발"><label for="sample-error">세트리스트 이름</label><input id="sample-error" aria-invalid="true" aria-describedby="sample-message"><p id="sample-message" class="error small" style="margin-top:8px">! 이름을 입력한 뒤 다시 저장하세요.</p></section><section class="sample"><h2>색 이외의 단서</h2><div class="state-item selected">▣ 선택됨 · 연속된 1마디</div><div class="state-item input">＋ 입력 위치 · 점선 커서</div><div class="state-item playback">▶ 재생 위치 · 실선과 삼각 표식</div><p class="muted small">악보 위 상태색은 흰 악보 바탕에 맞춰 고정합니다.</p></section><section class="sample"><h2>피드백과 대화상자</h2><div class="notice">가져오지 못했어요.<br><span class="muted small">파일을 기기에 내려받은 뒤 다시 선택하세요.</span></div><div class="row" style="margin-top:20px"><button data-action="demo-toast">완료 알림</button><button data-action="demo-dialog">대화상자</button></div><p class="muted small" style="margin-top:16px">로딩: 기존 레이아웃 유지 + 진행 문구.<br>캐릭터는 빈 화면·도움말에만 제한합니다.</p></section></div></article>`}
function dialog(title,body){const previous=document.activeElement;const d=document.createElement('div');d.className='dialog';d.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${title}</h2><p>${body}</p><button class="primary" data-close>확인</button></div>`;document.body.append(d);const close=()=>{d.remove();previous?.focus()};d.querySelector('[data-close]').onclick=close;d.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close()}if(e.key==='Tab'){e.preventDefault();d.querySelector('button').focus()}});d.querySelector('button').focus()}
document.addEventListener('click',e=>{
 const v=e.target.closest('[data-view]');if(v){navigate(v.dataset.view);return}
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const a=b.dataset.action;
 if(a==='flight-replay'){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const art=$('.flock-art');art.style.animation='none';void art.offsetWidth;art.style.animation='';return}
 if(a==='library'){navigate('library');return}if(a==='open-score'){page=1;navigate('reader');return}
 if(a==='all'||a==='favorites'||a==='practice-filter'){filter=a==='practice-filter'?'practice':a;renderLibrary();return}
 if(a==='favorite'){const s=library.find(x=>x.title===b.dataset.title);s.favorite=!s.favorite;b.setAttribute('aria-pressed',String(s.favorite));return}
 if(a==='sort'){sortBy=sortBy==='recent'?'title':'recent';updateResults();b.textContent=sortBy==='title'?'제목순 ↑':'최근 열어본 순 ↓';return}
 if(a==='annotation'||a==='reading'){annotation=a==='annotation';renderReader();return}
 if(a==='practice'){practice=!practice;renderReader();return}
 if(a==='next-page'||a==='previous-page'){page=Math.max(1,Math.min(3,page+(a==='next-page'?1:-1)));renderReader();return}
 if(a==='metronome'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.textContent=on?'정지':'시작';toast(on?'시각 상태 예시 · 소리는 재생하지 않습니다.':'메트로놈 시각 데모를 멈췄어요.');return}
 if(a==='select-score'){selected=true;renderEditor();return}if(a==='clear-selection'){selected=false;renderEditor();return}
 if(a==='input-mode'){inputting=!inputting;renderEditor();return}if(a==='playback'){playing=!playing;renderEditor();return}
 if(a==='properties'){properties=!properties;renderEditor();return}
 if(a==='duration'){document.querySelectorAll('[data-action="duration"]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return}
 if(a==='demo-dialog'){dialog('악보를 가져올까요?','시스템 파일 선택기를 여는 위치의 설계 예시입니다. 목업은 파일에 접근하지 않습니다.');return}
 if(a==='demo-toast'){toast('주석을 저장했어요. · 상태 문구 예시');return}
 const messages={import:['악보 가져오기','PDF 또는 JPG/PNG 파일을 선택하는 흐름입니다. 이 독립 목업에서는 파일을 가져오지 않습니다.'],export:['내보내기','프로젝트 저장과 구분된 MusicXML·PDF 출력 진입점입니다. 실제 파일 생성은 제품 앱에서 수행합니다.'],save:['프로젝트 저장','프로젝트의 기본 저장 위치입니다. 이 목업은 파일을 기록하지 않습니다.'],setlists:['세트리스트','연주 순서대로 악보를 묶는 기능의 진입점입니다. 상세 화면은 이번 핵심 목업 범위 밖입니다.']};
 if(messages[a]){dialog(...messages[a]);return}
 toast(({bookmark:'북마크 추가 위치 예시',tone:'기준음 도구 진입 위치 · 소리는 재생하지 않습니다.',undo:'실행 취소 위치 · 편집 엔진은 연결하지 않았습니다.'})[a]||'화면 구조 확인용 컨트롤입니다. 실제 편집 엔진은 연결하지 않았습니다.');
});
$('#theme').addEventListener('click',()=>{theme=theme==='light'?'dark':'light';params.set('theme',theme);history.replaceState(null,'','?'+params);render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&view==='editor'&&!$('.dialog')){selected=false;inputting=false;renderEditor();$('.score-hit')?.focus()}});
render();
