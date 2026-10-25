# 실제 구현 검토와 수정 backlog

착수 HEAD는 `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`, 최종 확인 HEAD는 `827ad18203e673b1e923d00cbcf0fd7f3af755d7`이다. 진행 중 다른 서비스 작업이 Score `c1ced312`, Studio `d126a8d6`, Play `623a091c`로 커밋됐다. 공통 패키지의 미커밋 의존성은 별도 해시로 기록한다. 제품 의미와 실제 화면을 우선했다. 변경 중인 소스와 캡처 시점은 [validation](validation.md)에 구분한다. 이번 R2 작업은 제품 코드를 수정하지 않았다.

## 상태 판정

| 서비스 | 현재 확인 | 판정·한계 |
| --- | --- | --- |
| Play | 홈을 라이브러리/현재 재생/관리/감상으로 분리, 공통 평평한 행·현재 재생 adapter. 새 R1 test19개 통과 | R1 해당 범위 검토 가능·합성 위젯 검증 완료. 이번 R2 직접 실행은 실제 I/O/기기 오디오 미검증. 최종 재촬영 입력 해시 안정 확인. 별도 서비스 반환의 iOS 시뮬레이터 결과는 직접 재실행과 구분 |
| Score | 악보함 controller/행·선택/bulk 상태. 새 R1 test28개 통과 | 악보함 범위 검토 가능·합성 위젯 검증 완료. PDF 뷰어의 성공 경로는 이번 실제 앱 실행 증거가 없으며 코드와 실제 fixture PDF로 설계 |
| Studio | 문서 상태 header·neutral chrome·dark·dock·속성 필드. 새 별도 renderer build + 최종 Electron 검사 통과, 중간 반복 실패 별도 기록 | 해당 범위 검토 가능. 실제 renderer/기보 출력 사용, 파일 bridge는 합성. OS dialog/실기기 IME/스크린리더 미검증 |

R1 README의 ‘인계 대기’는 과거 설계 시점이다. 현재 구현이 없는 것으로 해석하지 않는다. 서비스 자체의 완료 보고/커밋 확정은 각 작업이 소유한다. [Play 반환](../product-design-r1/returns/play-r1-2026-10-25/README.md), [Score 반환](../product-design-r1/returns/score-20261025/README.md), [Studio 반환](../product-design-r1/returns/studio-r1-2026-10-25/handoff.md)을 함께 확인했다. 반환 자료의 전체 테스트 수를 이번 직접 실행 결과에 합산하지 않는다.

## 관찰과 우선순위

### P01 · Play 라이브러리의 첫 행동 — P2

- 근거: [현재 목록390](evidence/play/library-390-1-light.png), `presentation/library_home_components.dart`.
- 기대/실제: 큰 통계·스캔 카드 대신 목록 우선 배치가 적용됐다. 작품까지의 동선은 개선됨. 상단 파일 가져오기 disabled는 테스트 adapter의 파일 기능 제한이라 제품 결함으로 단정하지 않음.
- 분류/계층: 명세대로 구현 + fixture 제약 / 앱 composition.
- 영향: 기존 R1의 과도한 홈 요약 문제를 다시 고치라고 요청할 필요 없음.
- 후속/수용: 관리·감상 경로 보존을 확인하면서 현재 구조 유지. 실제 권한 환경의 가져오기 가능/불가 문구는 기기 검사.

### P02 · Play 재생 맥락의 반복 — P1, 첫 수정 추천

- 근거: [현재 재생390](evidence/play/playback-top-390-1-light.png), `_QueuePanel`, `PlayNowPlayingControls`, `PlayQueueRow`.
- 기대: 작품/녹음은 상위 맥락, 큐는 순서/악장/현재 표시 중심. 실제: heading·재생 설명·큐 row에 긴 작품/녹음/출처 반복, 이어서 랜덤 재생까지 같은 화면에 이어짐.
- 영향: 첫 화면에서 악장 순서와 주 조작의 관계를 읽는 비용이 큼. 데이터 삭제가 필요한 것은 아님.
- 분류/계층: 수정 필요 / 앱 composition.
- 제안: 현재 작품·녹음 요약을 하나로 모으고 큐에서는 악장/필요한 출처만. 서로 다른 작품 큐에서는 작품 구분을 생략하지 않는다. 상세 metadata는 펼침/기존 상세로 접근 유지.
- 수용: 긴 한영 작품명·녹음 미상·다른 작품 섞인 큐·320×200%에서 현재 항목/다음/정지가 발견됨. 큐 ID/순서/누락 정책 불변.

### P03 · Play 탐색과 현재 재생의 관계 — P1

- 근거: 홈 navigation·실제 재생 adapter 코드. 현재 현재재생 보기로 이동해야 전체 조작에 접근. 탭 state 보존은 R1 테스트 대상.
- 기대: 다른 녹음을 살펴봐도 현재 재생이 무엇인지 알 수 있고 조작에 접근. R2에서는 ‘탐색 중 녹음’과 ‘현재 재생 녹음’을 별도 모델로 표시.
- 분류/계층: 목표 설계 / 앱 composition + engine adapter.
- 제안: 넓은 화면 별도 now-playing 영역, 좁은 화면 축약 요약+필수 조작과 상세 펼침. 리뷰는 공간 검토용 상단 재생 블록이며 전역 mini-player 완성 코드가 아님.
- 수용: 녹음B 탐색 중 A 재생 유지; 검색/테마/큐 보기로 위치 초기화 없음. seek drag 도중 engine update가 draft를 덮지 않음.

### S01 · Score 악보함 상단 밀도 — P2

- 근거: [실제 목록390](evidence/score/default-390-1-light.png). 제목·라이브러리 선택·검색·정렬/필터·빠른 접근이 첫 행 앞에 위치.
- 기대: 검색/현재 필터와 악보가 가까이 배치. 실제: 긴 수직 도구 영역과 icon-only top actions가 첫 악보까지의 거리를 늘림. 큰 글자에서는 줄바꿈을 위해 더 필요할 수 있음.
- 영향: 기본390에서 읽을 목록이 늦게 시작. 접근 가능한 기존 도구의 제거는 금지.
- 분류/계층: 수정 필요 / 앱 composition.
- 제안: library selector/title 관계 정리, 정렬/필터의 낮은 높이 wrap, 빠른 접근을 실제 내용이 있을 때만 현행 정책에 맞춰 배치. top actions는 빈도·레이블 점검.
- 수용: 실제390/320×200% 비교, 검색·가져오기·현재 library·필터 상태가 숨지 않음. 고정 header 높이를 줄여 clipping을 만드는 방식 금지.

### S02 · Score 선택/저장 상태 — 보존

- 근거: [실제 실패390](evidence/score/failure-390.png), [pending](evidence/score/pending-390.png), 새R1 28tests.
- 기대/실제: 저장 중 취소 제어, 실패 후 draft와 선택 유지, retry/성공 동작이 검증됨.
- 분류/계층: 명세대로 구현 / 앱 async adapter.
- 후속: viewer 디자인을 적용하면서 library controller 재생성·선택/scroll reset 회귀 금지. 현재 검사와 실제 I/O 검증을 구분.

### S03 · Score viewer 도구군 — P1, 코드 기반 설계

- 근거: `main.dart:SheetViewerScreen`, `isCompactViewer(<720)`, `usesScrollableViewerToolbar(<1100)`, `_AnnotationToolbar`, `_ViewerControls`.
- 기대: 지면·현재 페이지·사용 모드가 우선, 관련 도구만 근처. 실제 코드: bookmark/part/notes/setlist·보기 옵션·공연·annotation toolbar·페이지 controls를 조건별 조합.
- 영향: 기능별 진입과 모드 조합의 인지 부담 가능성. 실제 성공 viewer UI의 문제로 확정한 관찰은 아님.
- 분류/계층: 목표 설계 + 실기기 검증 필요 / viewer chrome adapter.
- 제안: 읽기/주석 토글, 별도 연습 도구 진입, 공연 잠금·허용 quick action 보존. PDF fixture 3장을 실제 렌더한 [시안](preview/catalog/product-r2.html)으로 배치 확인.
- 수용: page/annotation 좌표·crop·gesture·페달·자동 스크롤·링크 차단·공연 설정 불변. 실제 PDF에서 추가 검증해야 제품 완료.

### T01 · Studio neutral chrome 적용 — 보존

- 근거: [실제 속성280 light](evidence/studio/span-light-280.png), [dark](evidence/studio/span-dark-280.png), isolated renderer build.
- 기대/실제: 이전 cream 작업창에서 neutral chrome·scope·dark 적용이 진전됨. PDF/기보 지면은 별도 원본 유지.
- 분류/계층: 명세대로 구현 + 제품 예외 / 앱 adapter.
- 후속: 이전의 ‘전체 cream 제거’ 항목을 그대로 재발행하지 않음. 실제 기보 종이 색은 chrome와 분리.
- 수용:207/280/360 dock·출력 score/MusicXML 불변 검사 유지.

### T02 · Studio 입력과 선택 속성의 맥락 — P1

- 근거: `App.tsx` toolbarCategories/input/selection, `SpanProperties.tsx`, [실제 속성](evidence/studio/studio-electron.png).
- 기대: 다음 입력 음가/성부와 이미 선택된 표기의 속성이 구분됨. 실제: 분류/입력 맥락/팔레트/속성의 여러 영역이 함께 존재.
- 영향: 어느 대상에 값이 적용되는지 처음 사용자가 혼동할 가능성. 사용자 테스트 결과가 아니라 설계 검토.
- 분류/계층: 목표 설계 / 앱 command adapter.
- 제안: 입력 설정은 ‘다음 입력’, inspector는 ‘선택한 표기’와 대상/범위 표기. 같은 설정을 양쪽에 무분별하게 복제하지 않음.
- 수용: 선택 없음에서 input mode는 유지, 선택 종류에 유효한 필드만 활성. undefined/0/sp·IME·Enter/blur1회·undo1회 보존.

### T03 · Studio 반응형 지면과 검증 기준 — P1

- 근거: [서비스 반환](../product-design-r1/returns/studio-r1-2026-10-25/handoff.md)의960px snapshot 차이. dock을 쌓는 배치로 기보 가용 폭이644→880이 되어 시스템 줄바꿈이 바뀜.1400px metrics와 fixed-canvas 검사는 일치한다고 보고됨.
- 분류/계층: 제품 예외 + 검토 필요 / workspace composition와 responsive notation 경계. 이번에 fixed-canvas 검사를 다시 실행한 것은 아님.
- 영향: 작업창 배치 변경과 악보 엔진 회귀를 구분하지 않으면 의도한 줄바꿈까지 오류 처리하거나 실제 회귀를 숨길 수 있음.
- 제안/수용: 좁은 창에서 fit-width 재배치와 사용자 고정 zoom 정책을 명시하고 동일 입력 canvas 회귀와 실제 viewport 화면 검사를 분리한다. 원본 baseline을 통과시키려고 덮어쓰지 않는다. 선택·caret·scroll anchoring을 보존한다.
- 별도 저장소 과제: 반환의 root `npm test`는7files/12tests 실패다. package DOM 환경과 node:test 수집 문제로 보고됐으며 분할 실행 통과가 root 통과를 의미하지 않는다. 공통 테스트 실행기 통합은 앱 UI 변경과 분리해 추적한다.

### T04 · Studio 합성 IME 후 오류 표시 검증의 간헐 실패 — P1, 원인 미확정

- 근거: [실패 로그](evidence/studio-capture-synthetic-failure.log), [최종 실행 로그](evidence/studio-capture.log), [최종 audit](evidence/studio/r2-audit.json).
- 재현: 합성 compositionstart → 조합 중 Enter → compositionend → Escape → 99 입력 → blur. 일부 실행에서 DOM 값99/validity=false인데 aria-invalid=false. 최종 동일 assertion은 통과했다.
- 분류/계층: 검증 보강 필요 / 앱 draft adapter 또는 합성 이벤트 harness. 사용자 입력 결함으로 확정하지 않음. 최종 통과로 앞선 실패를 삭제하지 않음.
- 영향: 조합 취소 뒤 숫자 오류 안내/이전 확정값 복원이 항상 유지되는지 현재 증거만으로 확언하기 어려움.
- 제안/수용: 실제 키보드 이벤트와 물리 한글 IME를 구분해 최소 재현. React 업데이트 경계·focus/blur·value tracker를 확인. 실제 command0회·확정값 보존·오류 연결을 검증하고 제품 수정이 필요한지 판정. assertion 완화나 무작정 sleep 증가로 해결 처리하지 않음.

### C01 · 공통화 범위 — P2

- 근거: 새 Item.flat/trailing과 기존 Tabs/Select/Dialog API, Flutter 대응.
- 분류: 공통 개선 후보. 현재 R2에 새 공통 API가 반드시 필요한 막힘은 없음.
- 제안: 익명 음악용 거대 toolbar 대신 각 앱의 command adapter 조합. 정확히 같은 async 필드 계약이 두 소비처에 나타날 때만 별도 제안.
- 수용: 모든 공통 변경 제안에 두 소비처·현재 API로 못 표현하는 의미·변경 영향·검사 포함. 세 엔진을 공통 UI에 종속시키지 않음.
