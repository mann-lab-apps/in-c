# Score: 악보함에서 다음 연습으로

첫 구현 범위. 기존 [S-SCORE](../specifications/services/score.md)와 [screen-contract](screen-contract.md)를 함께 적용한다.

## 소스와 구성

- 앱 `apps/in_c_sheet/lib/main.dart`: 실제 navigation, NestedScrollView, `_isBulkSelecting`, `_bulkSelectedScoreIds`, `_showBulkEdit`, viewer 진입 유지.
- `lib/presentation/score_library_components.dart`: `ScoreLibraryEntry`, `ScoreLibraryRow`, `ScoreLibraryCollection`, `ScoreLibraryControls`, `QuickAccess` 기존 adapter 우선.
- `sheet_library_controller.dart` / store / view settings: 데이터·비동기 저장·선택 대상·정렬/필터 유지.
- 공통 `packages/ddirori_ui`: DdiroriItem, 입력·버튼·상태·진행 컴포넌트. 정확한 생성자/지원 여부는 현재 exports와 API snapshot 대조.
- 리뷰: `?products` → 한 앱 상세 / Score. “선택” → 항목 선택 → 일괄 편집 → 저장(첫 실패) → 다시 저장. 악보명 클릭은 **정적 viewer 배치**만 연다.

| 분류 | 구성 |
| --- | --- |
| 1 현재 공통으로 가능 | 버튼, 검색/입력, 체크·선택 표시, 항목, 안내·오류·진행, 대화상자 형태 |
| 2 앱 조합/adapter | Entry DTO, 실제 metadata fields, 즐겨찾기/핀/메뉴, QuickAccess, 필터 sheet, bulk sheet, viewport별 collection |
| 3 공통 API 검토 | 여러 앱에서 flat row + inline actions 계약이 같은지. Flutter 기존 row를 먼저 사용; 웹 CSS 예제로 API 추가를 정당화하지 않음 |
| 4 목표 설계 | 전체 악보함 정리, viewer 도구 chrome와 dark/큰 글자 개선. 리뷰의 분류 1개는 상태 설명용; 실제 bulk 필드 삭제 금지 |

## 화면 구성

상단: 현재 라이브러리/화면명 → 검색 → 현재 정렬/즐겨찾기/필터 → 접힌 QuickAccess → 목록. 기존 설정·가져오기·라이브러리 전환·삭제 등은 접근 가능한 도구/overflow에 유지한다. 리뷰는 대표 영역만 그렸으므로 보이지 않는 기능을 삭제하라는 뜻이 아니다. 메뉴에 옮기면 레이블과 접근 경로를 명세·스크린샷에 추가한다.

행: 파일 아이콘 → 악보명/작곡가/파일·연습 정보 → 즐겨찾기·핀·더보기. 보조 행동은 작은 화면에서 두 번째 줄로 wrap 가능. title tap만 열기; 체크/메뉴/핀을 누르면 열리지 않음. 보조 정보를 너무 많이 쌓지 않되 기존 의미·접근 방법 유지. 긴 이름·사용자 필드·페이지 없음에 fallback을 정한다.

뷰어: 현재 악보명/돌아가기 → 읽기·주석/기존 도구군 → PDF → 페이지/연습 controls. 처음 구현에서 도구의 간격·배치만 바꾸고 PDF gesture·공연 모드·페이지 저장·주석·연습 세션은 기존 엔진 유지. viewer는 파일을 열 수 없을 때 복구 안내를 제공하고, 행에서 동기 파일검사하지 않는다.

## 첫 흐름 상태 전이

| 시점 | 표시/행동 | 저장·보존 계약 |
| --- | --- | --- |
| 기본 | 검색·정렬·필터·행 행동 | filter/search/scroll은 기존 controller/view settings |
| 선택 진입 | 체크 + 선택 수 + 일괄 편집, 0개 편집 disabled | ID set으로 소유, 정렬로 index가 바뀌어도 동일 ID |
| 필터 변경 | 표시된 행만 바뀜, 선택 수는 실제 전체 선택 | 숨은 선택을 삭제하지 않음. 필요시 “필터 밖 N개” 안내 |
| 편집 열기 | 선택 ID snapshot + 실제 필드 draft | source 모델을 입력마다 변경하지 않음. 혼합 값은 0/빈 문자열로 덮지 않음 |
| 저장 | busy/readonly, 저장 중 표시 | 중복 저장 금지, barrier/drag/Back/닫기 차단은 현행 계약 |
| 저장 실패 | dialog 안 alert + 재시도, draft 유지 | 선택·원본·scroll 유지, 성공 toast/닫기 없음 |
| 재시도 | 같은 ID snapshot과 수정한 draft 저장 | repository 실제 성공 await |
| 성공 | dialog 닫기, 결과 수 표시, 선택 종료 | 성공 모델만 반영. focus가 사라진 trigger 대신 목록 제목/유효행으로 복귀 |
| 취소 | busy가 아닐 때만 취소 | 모델 변경 없음. 기존 선택 유지. 닫기 trigger focus 복귀 |

필터·검색과 뷰어 이동 후 선택 정책은 현재 앱 동작을 우선한다. 리뷰는 초기 선택 1개/메모리 분류 필드만 사용하며 실제 bulk 규칙의 대체 구현이 아니다.

## 반응형·접근성

320px/200%에서 가변 높이 한 열; wide 두 열은 기존 설정 보존. 제목과 주된 버튼이 가려지지 않게 safe area와 keyboard inset 반영. 목록 lazy rendering 유지, 저장 시 전체 페이지 jump 금지. 체크 target48, 행 이름과 즐겨찾기 accessible name 분리. 읽기 순서 title→metadata→보조 행동. 검색 focus 중 단축키가 뷰어 명령으로 새지 않음. PDF 복귀 focus/scroll 보존. 실제 VoiceOver/TalkBack·PDF 접근성은 별도 기기 검수 항목.

## 수용 조건

1. 기존 23개 `test/adoption_pilot_test.dart` 통과, 필요한 변경 상태의 회귀만 보강. 테마별 320/390/840 및200% overflow 없음.
2. 숨은 선택/정렬/빠른 접근과 row secondary actions 회귀 없음. 저장 실패 및 재시도에서 같은 ID·draft 유지, pending 중 Back/중복 명령 차단.
3. 실제 파일 없음/가져오기 취소/가져오기 오류가 복구 가능. PDF 렌더러/주석·페이지·연습 계약은 기존 테스트와 실제 동선으로 확인, 미실행은 명시.
4. 제품 캡처를 기본/선택/빈/로딩/오류/저장중/성공 상태로 반환. 리뷰 fixture와 다른 데이터는 mapping 표 동봉.
5. iOS UI 변경은 `deployment/apps/clef/ios-metadata.yaml`에 source pending/content reviewed false, 영향받은 release notes·scenes·steps/assertions·manual pending을 갱신. 버전/commit 임의확정 없음. `cd deployment && bundle exec fastlane prepare_ios_metadata manifest:apps/clef/ios-metadata.yaml mode:check`.

범위 밖: 엔진 재작성, cloud sync, 컬렉션/필드 의미 변경, 최종색·앱명·런처 변경. 적용 결과는 [handoff-review](handoff-review.md) 형식으로 반환.
