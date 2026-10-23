import{readFile,writeFile,mkdir}from'node:fs/promises';import path from'node:path';import{fileURLToPath}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),repo=path.resolve(root,'../../..'),file='apps/in_c_sheet/lib/main.dart',source=await readFile(path.join(repo,file),'utf8');
const groups=[
  {
    "symbols": [
      "_SearchField"
    ],
    "role": "검색과 외부 query 동기화",
    "target": "DdiroriInput / DdiroriSearch",
    "decision": "추출",
    "boundary": "TextEditingController 수명과 선택 보존은 입력 위젯; query와 검색 결과는 앱",
    "regression": "입력·지우기·외부 query·한글 조합"
  },
  {
    "symbols": [
      "_LibraryViewBar",
      "_LibraryFacetExplorer",
      "_LibraryFacetRow"
    ],
    "role": "정렬·필터·탐색",
    "target": "DdiroriChoices / Toolbar",
    "decision": "합성",
    "boundary": "SheetLibraryViewSettings와 facet 집계는 앱",
    "regression": "즐겨찾기·태그·컬렉션·그룹·별점 조합"
  },
  {
    "symbols": [
      "_LibraryProfileBar",
      "_LibraryProfileSheet"
    ],
    "role": "작업 공간 선택",
    "target": "Choices / 시트 helper",
    "decision": "합성",
    "boundary": "profile 생성·이름·삭제와 저장은 앱",
    "regression": "선택·취소·삭제 후 현재 profile"
  },
  {
    "symbols": [
      "_ScoreGrid",
      "_ScoreTile"
    ],
    "role": "악보 목록·그리드·선택·보조 행동",
    "target": "DdiroriItem + 앱 레이아웃",
    "decision": "부분 추출",
    "boundary": "SheetScore·metadata formatting·열기·공유는 앱",
    "regression": "긴 제목·목록/그리드·favorite/pin·다중 선택"
  },
  {
    "symbols": [
      "_QuickAccessBand",
      "_QuickAccessScoreChip"
    ],
    "role": "최근·고정 악보 접근",
    "target": "Choices / Item 합성",
    "decision": "합성",
    "boundary": "최근/고정 목록·정렬은 controller",
    "regression": "항목 없음·긴 이름·실행 대상"
  },
  {
    "symbols": [
      "_EmptyLibrary",
      "_NoticeBanner"
    ],
    "role": "빈 상태와 안내",
    "target": "StatePanel / Banner",
    "decision": "추출",
    "boundary": "가져오기·다음 행동 callback은 앱",
    "regression": "안내와 오류 구분·다음 행동·글자 확대"
  },
  {
    "symbols": [
      "_ViewerLoadingBanner",
      "_ViewerProblemBanner",
      "_ViewerFileStatusBanner",
      "_ViewerErrorBanner"
    ],
    "role": "대기·오류·파일 상태·복구",
    "target": "Progress / StatePanel / Banner",
    "decision": "추출",
    "boundary": "파일 크기·경로·오류 원인 판정은 앱",
    "regression": "큰 PDF 대기·누락·손상·진단 펼치기"
  },
  {
    "symbols": [
      "_ScrollableAppBarActions",
      "_AppBarActionSlot"
    ],
    "role": "좁은 화면의 행동 묶음",
    "target": "Toolbar / IconButton",
    "decision": "합성",
    "boundary": "각 행동의 실행 조건은 viewer",
    "regression": "keyboard focus·작은 폭·overflow"
  },
  {
    "symbols": [
      "_AnnotationToolbar"
    ],
    "role": "주석 도구·색·굵기·undo/redo",
    "target": "DdiroriAnnotationTools",
    "decision": "표시 추출",
    "boundary": "annotation enum adapter·펜 좌표·저장·layer/export는 앱",
    "regression": "선택 도구·색·굵기·undo/redo enabled"
  },
  {
    "symbols": [
      "_ViewerControls",
      "_PerformanceQuickActions",
      "_PerformanceQuickActionButton"
    ],
    "role": "페이지와 공연 모드",
    "target": "PageControls / Toolbar / IconButton",
    "decision": "표시 추출",
    "boundary": "페이지·setlist·pedal·공연 실행 상태는 앱",
    "regression": "첫/끝 페이지·큰 조작·공연 모드에서 도구 숨김"
  },
  {
    "symbols": [
      "_CropSlider",
      "_NullableBoolControl"
    ],
    "role": "범위 값과 변경 없음 선택",
    "target": "Number / Segments",
    "decision": "합성",
    "boundary": "crop 적용·metadata null 의미는 앱",
    "regression": "경계·step·변경 없음 유지"
  },
  {
    "symbols": [
      "_LinkedAudioPlayerSheet",
      "_MetronomeSheet"
    ],
    "role": "오디오 조작·BPM·박자",
    "target": "Transport / Number / BeatIndicator",
    "decision": "표시 추출",
    "boundary": "SheetAudioPlayer/Metronome·ticker·preferences는 기존 엔진",
    "regression": "재생/정지·seek·BPM 경계·박자"
  },
  {
    "symbols": [
      "_TunerMeter",
      "_TunerLedStrip",
      "_TunerStringTargetPanel",
      "_TunerInputPowerBar"
    ],
    "role": "음정·신뢰도·목표·파워",
    "target": "TunerMeter + Choices / SettingsRow",
    "decision": "미터 표시 추출, 나머지 합성",
    "boundary": "SheetTunerFeedback·프로필·측정·noise floor는 앱",
    "regression": "낮음/정확/높음·신호 없음·낮은 신뢰도·목표 변경"
  }
];
const records=[];
function extractClass(name){const match=new RegExp('class '+name+'\\b').exec(source);if(!match)throw Error('Missing source '+name);let at=source.indexOf('{',match.index),end=at+1,level=1;for(;end<source.length&&level;end++){if(source[end]==='{')level++;if(source[end]==='}')level--}return{body:source.slice(at,end),line:source.slice(0,match.index).split('\n').length}}
for(const g of groups)for(const name of g.symbols){
 const direct=extractClass(name),stateName=direct.body.match(/createState\(\)\s*=>\s*(\w+)\(/)?.[1],state=stateName?extractClass(stateName):null;
 const body=direct.body+(state?.body??''),headers=[direct.body,state?.body].filter(Boolean).map(b=>b.slice(0,b.indexOf('@override')<0?b.length:b.indexOf('@override'))).join('\n');
 records.push({symbol:name,file,line:direct.line,stateSymbol:stateName,stateLine:state?.line,...g,symbols:undefined,fieldDeclarations:[...headers.matchAll(/final\s+([^;]+);/g)].map(m=>m[1].trim().replace(/\s+/g,' ')),explicitColors:[...new Set([...body.matchAll(/Color\((0x[\da-fA-F]+)\)/g)].map(m=>m[1]))],themeAccess:body.includes('Theme.of(context)'),layoutLiterals:[...new Set([...body.matchAll(/(?:spacing|runSpacing|fontSize|iconSize|height|width|radius):\s*([\d.]+)/g)].map(m=>m[0]))]});
}
await mkdir(path.join(root,'evidence'),{recursive:true});await writeFile(path.join(root,'evidence/component-inventory.json'),JSON.stringify(records,null,2)+'\n');
let md='# 악보앱 컴포넌트 조사와 공유 경계\n\n현재 main.dart에서 아래 '+records.length+'개 심벌을 찾아 필드·직접 지정 색·일부 배치 수치를 기록한다. [기계 추출 기록](evidence/component-inventory.json)은 재실행할 수 있다. private 심벌을 공통 패키지가 import하지 않고 공개 표시 API와 앱 adapter로 연결한다.\n\n| 실제 심벌과 위치 | 역할과 기존 스타일 | 공통 API와 판단 | 앱에 남길 책임 | 회귀 확인 |\n| --- | --- | --- | --- | --- |\n';
for(const g of groups){const rs=records.filter(r=>g.symbols.includes(r.symbol));md+='| '+rs.map(r=>'['+r.symbol+' : '+r.line+'](../../../'+file+')').join('<br>')+' | '+g.role+'; '+([...new Set(rs.flatMap(r=>r.explicitColors))].map(c=>c.replace(/^0xff/i,'#')).join(', ')||'Theme / 기본 Material')+' | '+g.target+' / '+g.decision+' | '+g.boundary+' | '+g.regression+' |\n'}
md+='\n## 구현에서 확인한 계약\n\n검색은 외부 query 변경을 didUpdateWidget에서 반영한다. LibraryViewBar는 Wrap과 ActionChip/FilterChip으로 상태를 나누고, ScoreGrid는 폭에 따라 목록과 그리드를 바꾼다. ViewerControls는 어두운 overlay와 별도 공연 모드 크기를 가진다. AnnotationToolbar의 색과 굵기는 문서 편집값이며 UI 테마로 대체하지 않는다.\n\n현재 앱 루트의 seed 색과 화면 바탕, 검색의 흰색·반경·윤곽, NoticeBanner의 살구 계열, viewer overlay처럼 직접 지정한 값은 테마 교체만으로 모두 바뀌지 않는다. 이행 때 각 연결 지점의 상태와 의미를 확인한다.\n\n## 다른 소비 환경\n\nChromatics의 App.tsx는 도구 분류·선택·dock을 소유한다. SpanProperties.tsx는 Score와 span endpoint/engraving 편집, NativeBackupsDialog.tsx는 Electron bridge와 복구 수명주기, NotationPreview.tsx는 VexFlow 렌더링을 담당한다. 공통 웹 패키지는 이 도메인을 import하지 않고 입력·도구·상태·modal의 문법만 제공한다.\n\nClick과 Chime은 Flutter Material 테마와 별도 controller/preferences/audio를 가진다. 플레이의 catalog·녹음·트랙 구조, 커뮤니티의 feed·광고 표기는 각 앱에 남긴다. 자세한 적용 지점은 [도입 계획](adoption.md)을 따른다.\n';
await writeFile(path.join(root,'inventory.md'),md);console.log(records.length+' implemented widget symbols audited.');
