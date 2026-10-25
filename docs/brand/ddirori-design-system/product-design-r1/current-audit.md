# 현재 제품과 제안의 차이

2026-10-25 / source `6bb5f027`. 이 표는 현재 코드와 이번 실행 결과를 대조한 것이다.

| 앱 | 자주 하는 일·현재 진입 | 실제 공통 적용 | 남아 있는 차이 | R1 제안 |
| --- | --- | --- | --- | --- |
| Play | 홈에서 검색/작품 선택 → 녹음·악장 → 로컬 재생. 가져오기·스캔·정리도 홈 | `play_library_components.dart`의 Work/Recording/Movement/Queue/AudioFile 행, `play_playback_components.dart` 재생 UI, 메타데이터 편집의 Input/Button/Banner | 홈 상단 통계 6개·검색 카드·스캔·랜덤 재생이 작품 접근을 늦춤. lime는 trial | 제목/검색/필터/작품 행을 우선. 관리 기능은 삭제하지 않고 명시적 관리 진입점으로 이동. 현재 재생을 별도 영역에 유지 |
| Score | 악보함 검색·정렬·필터 → 열기/연습. 선택 → 일괄 편집 | `score_library_components.dart`의 Entry/Row/Collection/Controls/QuickAccess와 공통 Flutter UI; 실제 저장 대기/실패 보존 | 기존 메뉴·빠른 접근·NestedScrollView와 새 공통 행이 공존. 뷰어는 별도 | 현재 controller/state를 유지하고 목록의 위계·행동 정렬 개선. 선택과 즐겨찾기 구분. 뷰어 도구는 앱 전용 |
| Studio | 문서 편집 → 명령 분류 → 표기 선택 → 속성 조절 | `SpanProperties.tsx`의 Text/Input/IconButton, scoped light compact. native endpoint Select 유지 | 전체 chrome는 기존 크림색. 실제 207px dock에서 공통 input 사용 확인 | chrome 중립화, 문서명/명령/악보/속성의 위계 분리. 저장된 dock 폭·geometry와 명령 의미 보존 |

## 근거와 책임 경계

- [Play 실제 첫 화면](evidence/play-library-light.png), [작품 행](evidence/play-work-list-light.png): `InCClassicalLibraryApp` 위젯 테스트, fixture와 폰트 주입. 실제 iOS 앱 캡처·파일 권한·백그라운드 오디오 검증이 아니다.
- [Score 실제 악보함](evidence/actual-score-violet-light.png), [실제 선택](evidence/actual-score-violet-selected-light.png), [실제 오류](evidence/actual-score-bulk-error.png): 현재 `InCSheetApp` 위젯 테스트. 원 테스트의 캡처 목적지만 R1으로 바꾼 out/ 임시 harness 사용. 제품 코드는 변경하지 않았다.
- [Studio 실제 화면](evidence/actual-studio-electron.png), [실행 결과](evidence/actual-studio-electron.json): 현재 built renderer를 별도 userData의 Electron에서 실행. release-test fixture; OS 파일 bridge/오디오 엔진 연결 없이 표기 입력과 undo 확인. 기존 기보 엔진은 실제 렌더링.
- Score PDF viewer 및 Play 기기 오디오·실제 라이브러리 권한 동선은 이번에 실행하지 않았다. 해당 상세 정책은 기존 코드·서비스 명세를 따른다. 시안의 Paper/Transport로 기능 검증을 대체하지 않는다.

공통 계층은 형태·상태·키보드·접근성 의미를 제공한다. controller/repository/엔진은 앱 소유다. Play의 Work→Recording→Movement, Score ID·파일 경로·페이지·주석, Studio command/undo/sp 값은 UI 토큰으로 재해석하지 않는다.

## 기존 적용 결과 분류

- 명세대로 확인: Score 저장 중 닫기 방지·실패 후 draft·선택 유지·성공 후 변경; Studio 0 입력 후 undo로 자동(undefined) 복원.
- 플랫폼 차이: Flutter widget과 DOM 레이아웃/폰트 측정 차이, native Select. 모양만 맞추기 위해 값 확정 시점을 바꾸지 않는다.
- 제품 예외: Studio 저장 dock 폭 200–360px. 공통 기본 280을 강제하지 않는다.
- 수정할 차이: Play 홈 구조, Studio chrome의 크림색, 앱별 큰 제목/작은 보조 정보 간격. **제품 구현 대기**.
- 공통 검토 후보: 웹 Item의 flat/inline actions 조합 및 최신 v8 ProductGlyph 연결. 아직 공통 API를 확장하지 않았다. 실제 두 소비처 계약과 회귀 검토 후 별도 제안한다.

### 마무리 시 동시 작업 관찰

별도 작업에서 `Item.flat`·`Item.trailing` 및 관련 tests/API 문서가 추가됐다. 위 감사는 시작 HEAD 기준이다. 최신 공통 API에는 해당 옵션이 존재하지만 아직 이 R1이 소유하거나 승인한 변경은 아니다. R1의 기존 composition은 그대로 호환 검증했으며, 서비스 이행 시 최신 API의 실제 계약·검증 상태를 확인해 재사용한다.
