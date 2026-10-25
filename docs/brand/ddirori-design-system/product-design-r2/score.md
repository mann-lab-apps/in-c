# Score R2 · 지면 중심의 읽기·주석·연습

[기존 서비스 계약](../specifications/services/score.md), [R1](../product-design-r1/score.md) 유지. 실제 `apps/in_c_sheet/lib/main.dart`의 `SheetViewerScreen`, `_AnnotationToolbar`, `_ViewerControls`, `_MetronomeSheet`, `_LinkedAudioPlayerSheet`, `_TunerSheet`와 library controller/annotation geometry를 대상으로 한다.

## 실제 지원과 시안 경계

코드에서 확인: PDF viewer, 페이지·북마크·파트/버전·메모·setlist, 주석(펜/형광펜/화살표/사각형/스탬프/텍스트/지우개), 공연 설정/허용 quick actions, 자동 scroll·페달·crop/페이지 정리, linked audio/metronome/tuner. 이 기능을 R2 그림에 없다는 이유로 제거하지 않는다.

리뷰 지면: `test-fixtures/pdfs/short-score.pdf` 실제3페이지를 Poppler로 렌더. 원본과 hash 기록. 사진/정적 페이지 전환은 pdfrx의 zoom/gesture/page callbacks, 주석 저장, 기기 PDF 성공 검증이 아니다. 사이트 composition PDF는 설명 페이지여서 이 작업의 악보 fixture로 채택하지 않았다.

## 화면 위계·진입

헤더: 뒤로 + 제목 + 필요한 문맥. 반복 앱 로고·바흐 없음. toolbar: 읽기/주석 토글, 연습 도구, 공연, 숨김. 도구 숨김에도 다시 표시와 페이지 이동의 접근점 유지. 읽기/주석은 입력 모드, 연습 도구는 sheet/패널, 공연은 동작 제한이므로 같은 종류의 상호배타 tab으로 합치지 않는다.

주석: 현재 도구 → 관련 옵션(색·굵기·stamp/text 등) → undo/redo. 공통 색은 콘텐츠 의미색, brand primary로 저장값을 바꾸지 않음. R2의 색3개/굵기3개는 배치 비교 subset이며 기존 palette/preset/stamp 선택을 축소하지 않는다.

연습: 메트로놈/연결 음원/튜너 진입. 도구를 닫아도 실행 상태의 유지·종료는 기존 정책을 보존한다. 새 연습 session/timer 기능을 만들지 않음. 마이크 권한·무신호·신뢰도 낮음과 연주정지 상태를 구분. 시안의 BPM 값/음원 빈 상태는 무음·마이크 미사용.

공연: 진입 준비와 종료 접근. 현재 allowPerformanceAnnotations/menus/pdfLinks 등 허용 정책·quick action을 보존한다. 시안은 기본적인 이동만 남기는 사례이며 실제 허용 기능을 일괄 금지하라는 뜻이 아님. 화면 유지·페달·자동scroll·setlist 정책 그대로.

## 반응형·표시

현재 <720 compact, <1100 scrollable toolbar 정책을 출발점으로 실측 후 조정한다. 낮은 세로높이/가로화면에서는 주석 옵션을 sheet/overflow로 이동해 지면을 확보한다. 모바일은 도구 wrap에 한계가 있으면 현재 도구+옵션 열기48 버튼으로 축약. 큰 글자를 줄여 한 줄에 끼워넣지 않음. 태블릿은 지면+가벼운 옵션 영역, 데스크톱은 최소 chrome 유지.

R2 리뷰의 페이지 최대720px/정적 scroll은 설명용. 실제 PDF의 사용자 zoom/fit width/fullscreen·page scale·crop margin을 바꾸지 않는다. dark chrome에서도 원본 종이·주석 contrast 유지. 다른 페이지를 보여줄 때 현재 fit/zoom 저장정책은 기존 동작 우선.

## 상태·데이터 경계

- page는1-based. 화면 페이지순서/숨김페이지/삽입blank와 원본 PDF page mapping 보존. UI에서 page index를 단순+1하여 엔진에 직접 전달하지 않음.
- loading: actual task명, 미확정 page count를3으로 가정하지 않음. 실패는 lastPage·library 상태 보존, 재연결/다시열기는 실제 file 정책.
- annotation draft 좌표는 기존 geometry 변환 책임. 모드 전환·페이지 변경·crop·zoom·undo 시 현재 commit/cancel 규칙 유지. 시안에 새 save 버튼을 넣어 자동 저장정책을 바꾸지 않음.
- 저장 실패: overlay/banner는 지면/복구 경로를 가리지 않으며 draft·현재 page 보존, 실제 재시도 지원 범위에 맞춤.
- toolbar hide/연습 dialog 취소: document 재생성 없음, focus trigger 복귀. 도구 숨김 gesture와 펜 입력의 충돌은 기기 검사.
- library 복귀: 마지막 페이지/scroll/선택/연습 설정 보존. 새 문서 열 때 이전 document callback이 새 상태를 덮지 않음.
- disabled: 미준비 문서의 주석/페이지 관련 명령 차단+원인. 문서와 무관한 복구/뒤로까지 모두 막지 않음.

## 구성·수용 조건

1. 공통: Button/IconButton/Select/Dialog/StatePanel/Progress/PageControls/AnnotationTools 형태, 숫자·상태 표시.
2. 앱: ViewerChrome/AnnotationControls/PracticeLauncher adapter와 기존 PDF·annotation·audio engine. 문서 overlay 좌표는 앱 소유.
3. API 검토: command overflow의 pointer/keyboard 계약이 Studio와 실제로 같을 때만 제안. 새 universal music toolbar는 불필요.
4. 목표: 여기의 도구 재배치·모드 명시. 실제 PDF 성공 화면 캡처와 동작 검수가 있어야 적용 완료.

수용: 실제 fixture PDF3페이지+긴 스캔형 fixture에서 읽기→주석→연습→공연→복귀, 페이지/주석/undo/원본 보존. 390/840와 가로화면·text200%·light/dark, safe area·keyboard inset, 터치48·레이블·focus 복귀. annotation/geometry/store/viewer-input/performance 관련 기존 테스트 + 변경된 UI 상태 회귀. VoiceOver·펜/손가락·페달·물리기기 렌더는 미실행 시 명시.

iOS: `deployment/apps/clef/ios-metadata.yaml` pending/reviewed false 및 영향 scene/steps/assertions/manual/release notes. `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml mode:check`. 실제 화면 증거는 [반환 규약](shared-and-handoff.md).
