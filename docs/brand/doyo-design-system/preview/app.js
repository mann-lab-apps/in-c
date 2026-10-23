/* Isolated interaction examples. No product controllers, files, audio or storage. */
const body = document.body;
const content = document.querySelector('#content');
const tokens = window.DoyoTokens;
const bird = window.DoyoLoaderMarkup;
const fixture = '../assets/practice-score.svg';
let operationTimer;
let readerPage = 1;
let readerMode = '보기';
let selected = false;
let editorMode = '선택';
let playback = false;

function loader(label = '불러오는 중', size = 'default') {
  return `<span class="doyo-loader" data-size="${size}">${bird}<span>${label}</span></span>`;
}
function button(text, extra = '') { return `<button type="button" class="doyo-button" ${extra}>${text}</button>`; }
function score(extra = '') { return `<div class="doyo-score-paper ${extra}"><img src="${fixture}" alt="직접 만든 단선율 12마디 예제 악보. 실제 사용자 문서가 아님"></div>`; }
function modes(labels, active, group) {
  return `<div class="doyo-modes" data-modes="${group}" role="group" aria-label="${group}">${labels.map(label => `<button class="doyo-mode" aria-pressed="${label === active}">${label}</button>`).join('')}</div>`;
}
const samples = [
  ['연습곡 1', '목관 · 3쪽 · 예제'], ['처음 만난 선율', '피아노 · 3쪽 · 예제'],
  ['함께 연주할 곡', '실내악 · 3쪽 · 예제'],
];

function overview() {
  const colors = [['ink','코코아'],['bluegray','블루그레이'],['paper','종이색'],['sand','모래색'],['surface','구획'],['action','행동색']];
  return `<div class="hero"><div><p class="muted">도요 디자인 시스템 · 0.1</p><h1>움직임은 가볍게.<br>음악 앞에서는 또렷하게.</h1><p>앞으로 편 부리와 배선, 수직으로 받치는 뒷다리. 도요의 리듬을 공통 컴포넌트와 두 가지 작업 밀도에 연결한다.</p><p class="view-note">공통 문법과 적용 예시를 검토하는 목업이다. 출시 이름이나 앱 아이콘 패키지를 변경한 결과는 아니다.</p></div><div>${loader('둠칫둠칫, 준비하는 중', 'large')}</div></div>
  <img class="hero-banner" src="../../doyo-visuals/palettes/a-rhythmic-banner.png" alt="선택한 코코아·블루그레이 도요 브랜드 배너">
  <section class="section"><h2>선택한 여섯 색</h2><div class="swatches">${colors.map(([key,label])=>`<div><div class="swatch" style="background:${tokens.brand[key]}"></div><strong>${label}</strong><code>${tokens.brand[key]}</code></div>`).join('')}</div></section>
  <section class="section grid"><article class="doyo-card"><h2>공통 문법</h2><p>8px 조작부, 16px 카드, 48px 터치 영역. 선택 상태는 채움과 윤곽, 상태 문구를 함께 사용한다.</p><p>새는 로고·로딩·빈 화면에 두고, 편집 도구의 의미는 기능 아이콘과 이름으로 표현한다.</p></article><article class="doyo-card"><h2>두 가지 작업 밀도</h2><p><strong>열람:</strong> 큰 글자·넉넉한 조작·읽던 위치 유지.</p><p><strong>사보:</strong> 촘촘한 명령·정확한 선택·키보드 동선.</p><p>모양의 원칙은 공유하되 악보 공간을 같은 비율로 나누지 않는다.</p></article></section>`;
}

function components() {
  return `<h1>공통 컴포넌트</h1><p class="view-note">호버·키보드 포커스는 직접 조작해 확인한다. 미리보기의 로딩 작업은 1.4초짜리 상태 예시다.</p>
  <div class="grid"><section class="doyo-card"><h2>버튼</h2><div class="row">${button('주 행동')}${button('보조 행동','data-variant="secondary"')}${button('가벼운 행동','data-variant="ghost"')}${button('삭제','data-variant="danger"')}${button('사용 불가','disabled')}</div><p class="sample-label section">Compact — 마우스 중심의 사보 도구</p><div class="doyo dense-demo" data-density="compact"><div class="row">${button('실행 취소','data-variant="secondary"')}${button('다시 실행','data-variant="secondary"')}${button('음가','data-variant="secondary"')}</div></div></section>
  <section class="doyo-card"><h2>입력</h2><div class="stack"><label class="doyo-field">악보 제목<input placeholder="제목을 입력하세요"></label><label class="doyo-field">오류 예시<input aria-invalid="true" aria-describedby="title-error" value=""><span class="doyo-help" data-error id="title-error">제목을 입력해 주세요.</span></label><label class="doyo-field">읽기 전용<input readonly value="원본 파일은 변경하지 않음"></label></div></section>
  <section class="doyo-card"><h2>모드와 상태</h2>${modes(['보기','주석','연습'],'보기','컴포넌트 모드')}<div class="row section"><span class="doyo-chip" data-state="success">✓ 가져오기 완료</span><span class="doyo-chip" data-state="warning">! 원본 확인 필요</span><span class="doyo-chip" data-state="error">× 가져오기 실패</span></div><label class="doyo-checkbox"><input type="checkbox">즐겨찾기만 보기</label><p>상태는 색뿐 아니라 이름·기호·선택 윤곽으로도 읽힌다.</p></section>
  <section class="doyo-card"><h2>둠칫둠칫 로딩</h2><div class="loader-demo">${loader('불러오는 중','inline')}${loader()}${loader('준비하는 중','large')}</div><label class="doyo-checkbox"><input type="checkbox" id="reduce-motion">움직임 줄이기 예시</label><div class="row">${button('로딩 예시 실행','id="loading-trigger"')}${button('취소','id="loading-cancel" data-variant="secondary" hidden')}</div><div class="operation-panel section" id="operation" aria-busy="false"><p>아래 버튼으로 로딩 상태를 확인한다.</p></div><p id="operation-status" role="status" aria-live="polite"></p></section>
  <section class="doyo-card"><h2>목록</h2><ul class="doyo-list">${samples.map(([title,meta])=>`<li><button class="item" data-open-reader><span class="score-thumb" aria-hidden="true">악보</span><span><strong>${title}</strong><small>${meta}</small></span></button></li>`).join('')}</ul></section>
  <section class="doyo-card"><h2>빈 화면과 실패</h2><div class="doyo-empty"><h3>아직 등록한 악보가 없어요</h3><p>파일을 가져오면 여기에서 이어볼 수 있어요.</p>${button('가져오기 흐름 보기','data-import-info')}</div><div class="doyo-alert section"><strong>가져오지 못했어요</strong><p>원본 파일과 접근 권한을 확인한 뒤 다시 시도해 주세요.</p>${button('다시 시도 예시','data-import-info data-variant="secondary"')}</div></section></div>`;
}

function reader() {
  return `<div class="library-title"><div><p class="muted">Clef & Staff → 도요 Note 적용 예시</p><h1>악보 열람</h1></div>${button('악보함으로','data-view="components" data-variant="secondary"')}</div>
  <p class="view-note">페이지는 같은 예제 SVG를 반복 사용한다. 주석·연습은 배치와 상태만 보여 주며 PDF·필압·오디오를 구현하지 않는다.</p>
  <div class="workspace"><aside class="rail doyo-card"><h2>나의 악보함</h2>${button('모든 악보','data-variant="secondary"')}${button('즐겨찾기','data-variant="ghost"')}${button('세트리스트','data-variant="ghost"')}<label class="doyo-field">악보 검색<input placeholder="제목 · 작곡가"></label><ul class="doyo-list">${samples.map(([title])=>`<li><button class="item" data-open-reader>${title}</button></li>`).join('')}</ul></aside>
  <section class="viewer"><div class="reader-tools">${modes(['보기','주석'],'보기','열람 모드')}${button('연습 도구','data-practice aria-expanded="false" data-variant="secondary"')}</div><p id="reader-mode-status" role="status">현재 모드: ${readerMode}</p>
  <div class="doyo-toolbar" id="annotation-tools" hidden><strong>주석 도구 예시</strong>${button('펜','data-variant="secondary"')}${button('형광펜','data-variant="secondary"')}<span class="doyo-help">실제 획 입력은 연결하지 않음</span></div>
  ${score('viewer-paper')}<div class="page-controls">${button('이전 쪽','data-page="-1" data-variant="secondary"')}<span class="doyo-number" id="page-count" aria-live="polite">${readerPage} / 3</span>${button('다음 쪽','data-page="1" data-variant="secondary"')}</div>
  <section class="practice-panel" id="practice-panel" hidden><h2>연습 도구</h2><label class="doyo-field" for="bpm">템포 <output id="bpm-value" class="doyo-number">72 BPM</output></label><input class="doyo-slider" id="bpm" type="range" min="40" max="160" value="72"><p>오디오·메트로놈은 실행하지 않는 레이아웃 예시다.</p></section></section></div>`;
}

function studio() {
  return `<p class="muted">Chromatics → 도요 Studio 적용 예시</p><h1>사보 작업 공간</h1><p class="view-note">명령의 배치와 선택·입력·재생 표시를 비교한다. 실제 음표·저장·오디오는 변경하지 않는다.</p>
  <div class="doyo" data-density="compact"><div class="doyo-toolbar">${modes(['선택','음표 입력'],editorMode,'사보 모드')}${button('저장 흐름 보기','data-save-info data-variant="secondary"')}${button('재생 표시','data-playback data-variant="secondary" aria-pressed="false"')}<span class="doyo-chip">예제 문서 · 변경 없음</span></div>
  <div class="editor section"><aside class="rail doyo-card"><h2>구성</h2>${button('전체 악보','data-variant="secondary"')}${button('플루트','data-variant="ghost"')}</aside><section class="editor-canvas"><div class="doyo-score-paper editor-paper"><img src="${fixture}" alt="단선율 12마디 창작 악보 예제"><button class="score-hit" aria-label="예제 첫 마디 선택"></button><div class="doyo-score-overlay" id="selection-overlay" hidden></div><div class="doyo-score-overlay" data-state="input" id="input-overlay" hidden></div><div class="doyo-score-overlay" data-state="playback" id="playback-overlay" hidden></div></div></section><aside class="inspector doyo-card"><h2 id="inspector-title">문서 속성</h2><div id="inspector-body"><p>전체 악보 · 플루트</p><p>마디를 선택하면 해당 대상의 속성을 표시한다.</p></div>${button('선택 해제','data-clear-selection data-variant="secondary" hidden')}</aside></div><p class="editor-status" id="editor-status" role="status">선택 모드 · 선택 없음 · 예제 문서</p></div>`;
}

function adoption() {
  return `<h1>작은 단위로 적용하기</h1><p>공통 토큰과 기본 컴포넌트를 먼저 가져오고, 악보 렌더러·저장·입력 동선은 각 제품 계약으로 검증한다.</p>
  <article class="adoption-step"><h2>1. 악보함 한 화면</h2><p>Clef & Staff의 SheetLibraryScreen을 첫 적용 대상으로 추천한다. ThemeData와 검색·버튼·목록을 옮기고, 기존 가져오기·세트리스트·주석 데이터는 유지한다.</p></article>
  <article class="adoption-step"><h2>2. 악보 보기와 연습 패널</h2><p>문서 색과 브랜드 색을 분리한다. 모드·포커스·로딩에 공통 문법을 쓰고, 페이지 위치·회전·파일 입출력·하드웨어는 제품에서 검증한다.</p></article>
  <article class="adoption-step"><h2>3. 사보 도구와 속성</h2><p>Chromatics의 기존 --inc-* 역할을 --doyo-*에 대응한다. 선택·입력·재생은 별도 오버레이로 표시하고, MusicXML·PDF 출력에서는 제거한다.</p></article>
  <article class="adoption-step"><h2>4. 감상·커뮤니티·공연</h2><p>같은 버튼과 피드백을 쓰되 음악 메타데이터와 콘텐츠의 위계에 맞춰 목록을 조합한다. 예제의 Note·Studio는 이름 확정이나 패키지 변경을 의미하지 않는다.</p></article>
  <div class="doyo-card"><h2>가져갈 파일</h2><p><a href="../tokens.json">기준 JSON</a> · <a href="../generated/tokens.css">CSS 토큰</a> · <a href="../generated/tokens.ts">TypeScript 토큰</a> · <a href="../generated/doyo_tokens.dart">Dart 토큰</a></p><p><a href="../adapters/web/components.css">웹 컴포넌트</a> · <a href="../adapters/flutter/doyo_theme.dart">Flutter 테마</a> · <a href="../adapters/flutter/doyo_loader.dart">Flutter 도요 로딩</a></p><p><a href="../adoption.md">제품별 이행 명세</a> · <a href="../components.md">컴포넌트 계약</a></p></div>`;
}

const views = {overview, components, reader, studio, adoption};
function show(view) {
  clearTimeout(operationTimer);
  body.removeAttribute('data-reduced-motion');
  content.innerHTML = (views[view] || overview)();
  document.querySelectorAll('.dense-demo').forEach(n => n.dataset.theme = body.dataset.theme);
  document.querySelectorAll('.review-nav [data-view]').forEach(n => n.setAttribute('aria-pressed', String(n.dataset.view === view)));
  const url = new URL(location.href); url.searchParams.set('view', view);
  history.replaceState(null, '', url);
  if (view === 'studio') updateEditor();
}
function updateEditor() {
  document.querySelector('#selection-overlay').hidden = !selected;
  document.querySelector('#input-overlay').hidden = editorMode !== '음표 입력';
  document.querySelector('#playback-overlay').hidden = !playback;
  document.querySelector('#inspector-title').textContent = selected ? '선택한 마디' : '문서 속성';
  document.querySelector('#inspector-body').innerHTML = selected ? '<p>1마디 · 플루트 · 예제 선택</p><p>속성 값 변경은 실제 편집기에 연결할 때 구현한다.</p>' : '<p>전체 악보 · 플루트</p><p>마디를 선택하면 해당 대상의 속성을 표시한다.</p>';
  document.querySelector('[data-clear-selection]').hidden = !selected;
  document.querySelector('#editor-status').textContent = `${editorMode} 모드 · ${selected ? '1마디 선택' : '선택 없음'}${playback ? ' · 재생 위치 표시' : ''} · 예제 문서`;
}
document.addEventListener('click', event => {
  const target = event.target.closest('button'); if (!target) return;
  if (target.dataset.view) show(target.dataset.view);
  if (target.id === 'theme-toggle') {
    const dark = body.dataset.theme !== 'dark'; body.dataset.theme = dark ? 'dark' : 'light';
    target.setAttribute('aria-pressed',String(dark)); target.textContent = dark ? '라이트 모드' : '다크 모드';
    document.querySelectorAll('.dense-demo').forEach(n => n.dataset.theme = body.dataset.theme);
  }
  if (target.closest('[data-modes]')) {
    const group = target.closest('[data-modes]');
    group.querySelectorAll('button').forEach(n => n.setAttribute('aria-pressed',String(n === target)));
    if (group.dataset.modes === '열람 모드') {
      readerMode = target.textContent; document.querySelector('#annotation-tools').hidden = readerMode !== '주석';
      document.querySelector('#reader-mode-status').textContent = `현재 모드: ${readerMode}`;
    }
    if (group.dataset.modes === '사보 모드') { editorMode = target.textContent; updateEditor(); }
  }
  if (target.hasAttribute('data-open-reader')) { readerPage = 1; readerMode = '보기'; show('reader'); }
  if (target.hasAttribute('data-page')) {
    readerPage = Math.max(1,Math.min(3,readerPage + Number(target.dataset.page)));
    document.querySelector('#page-count').textContent = `${readerPage} / 3`;
  }
  if (target.hasAttribute('data-practice')) {
    const panel = document.querySelector('#practice-panel'); panel.hidden = !panel.hidden; target.setAttribute('aria-expanded',String(!panel.hidden));
  }
  if (target.classList.contains('score-hit')) { selected = true; updateEditor(); }
  if (target.hasAttribute('data-clear-selection')) { selected = false; updateEditor(); document.querySelector('.score-hit').focus(); }
  if (target.hasAttribute('data-playback')) { playback = !playback; target.setAttribute('aria-pressed',String(playback)); updateEditor(); }
  if (target.hasAttribute('data-save-info') || target.hasAttribute('data-import-info')) {
    const dialog = document.querySelector('#explain-dialog');
    dialog.querySelector('h2').textContent = target.hasAttribute('data-import-info') ? '파일 가져오기 예시' : '프로젝트 저장과 내보내기';
    dialog.querySelector('p').textContent = target.hasAttribute('data-import-info') ? '실제 앱의 파일 선택기·접근 권한·실패 처리는 각 플랫폼에서 연결한다. 이 목업은 사용자 파일을 열지 않는다.' : '.chromatics 프로젝트 저장, MusicXML 교환, PDF 출력은 별도 행동이다. 이 목업은 파일을 만들지 않는다.';
    dialog.showModal();
  }
  if (target.id === 'loading-trigger') startOperation();
  if (target.id === 'loading-cancel') finishOperation('로딩 예시를 취소했어요.');
});
document.addEventListener('change', event => {
  if (event.target.id === 'reduce-motion') body.dataset.reducedMotion = String(event.target.checked);
});
document.addEventListener('input', event => {
  if (event.target.id === 'bpm') document.querySelector('#bpm-value').textContent = `${event.target.value} BPM`;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('#editor-status')) { selected = false; updateEditor(); }
});
function startOperation() {
  const trigger = document.querySelector('#loading-trigger');
  if (trigger.disabled) return;
  trigger.disabled = true; trigger.setAttribute('aria-busy','true'); trigger.innerHTML = loader('불러오는 중','inline');
  document.querySelector('#operation').setAttribute('aria-busy','true');
  document.querySelector('#operation').innerHTML = loader();
  document.querySelector('#loading-cancel').hidden = false;
  document.querySelector('#operation-status').textContent = '로딩 예시를 시작했어요.';
  operationTimer = setTimeout(() => finishOperation('로딩 예시가 끝났어요. 실제 파일은 열지 않았어요.'), 1400);
}
function finishOperation(message) {
  clearTimeout(operationTimer);
  const trigger = document.querySelector('#loading-trigger');
  trigger.disabled = false; trigger.removeAttribute('aria-busy'); trigger.textContent = '로딩 예시 실행';
  document.querySelector('#loading-cancel').hidden = true;
  document.querySelector('#operation').setAttribute('aria-busy','false');
  document.querySelector('#operation').innerHTML = '<p>다시 실행할 수 있어요.</p>';
  document.querySelector('#operation-status').textContent = message;
}
const initial = new URLSearchParams(location.search);
if (initial.get('theme') === 'dark') document.querySelector('#theme-toggle').click();
show(initial.get('view') || 'overview');
