# Score · 연습 도구 공통 UI 후속 적용

## 악보함 분류 선택 후속

- 태그·컬렉션·그룹·별점의 raw 행을 공통 Sheet/Banner/flat Item/Button으로 교체했다. typed app adapter는 표시/선택 intent만 담당하며 기존 controller의 저장 정책은 변경하지 않는다. 현재 선택·조건별 해제·취소와 라이브러리 identity 확인을 추가했다. 일반 설정 저장의 실패 rollback이나 A→B→A 재진입 세대 보장으로 확대해 표현하지 않는다.
- focused 6 tests PASS (`/private/tmp/score-library-filter-focused-20261030.log`): 세 viewport/200% light/dark의 긴 태그·별점 저장/복원/취소·개별 해제, 컬렉션/그룹 조합, 새 라이브러리의 오래된 선택 거부. 모든 경우 검색/자료 보존을 검사하는 것은 아니며 첫 세 viewport 시나리오가 query/favorite/IDs/미열기를 함께 검증한다.
- 300개 선택지 fixture는 lazy build와 마지막 행 선택을 확인한다. 20개 초과의 bounded 목록은 앱 adapter 전략이며 실제 기기 성능·중첩 스크롤·VoiceOver/focus는 pending이다. 이번 refactor의 자동 검증을 실제 장비 QA로 표현하지 않는다.
- format/analyze·전체 655 tests·metadata check PASS. RC exit 1은 unrelated `experiments/piano-performance/data/README.md:63`의 EOF 빈 줄에 대한 전역 `git diff --check` 실패이며 Score 검사/테스트는 통과했다. 다른 작업 파일을 수정하지 않았다. 로그: `/private/tmp/score-library-filter-{rc,metadata}-20261030.log`. 이번 선택적 staged diff의 공백 검사는 별도로 확인한다.

## 기준과 보존

- 시작 checkpoint: `01b337e5`. 기존 제품 lib/test에는 변경이 없었다.
- 현재 기준은 `service-theme-contract.md`, `shared-baseline.md`, 실제 `packages/ddirori_ui` API다. R3는 이전 탐색 이력으로 보존한다.
- 다른 앱·브랜드·공통 패키지와 기존 iOS YAML 변경을 보존한다. 이번 제품 변경은 `apps/in_c_sheet`에 한정한다.
- 현재 pubspec은 `1.0.0+14`, Android applicationId는 `com.mannlab.inc`다. YAML의 출시 식별자와 다른 사실은 기존 `manual.build_selection` 기록대로 유지하며 버전·식별자를 바꾸지 않는다.

## 자동 스크롤

- 실제 경로: fixture PDF → 연습 → 자동 스크롤.
- 공통 `showDdiroriSheet`가 제목·safe area·스크롤을 소유한다. 내부에 별도 세로 스크롤이나 중복 PageHeader를 만들지 않는다.
- 연주 시간·쪽별 속도·시작 큐·페이지 범위·pause marker·반복 구간·cue point는 `DdiroriSection`으로 구분한다. 숫자 조정은 공통 설정 행/아이콘 버튼, 선택은 Choices, 실행은 Button/AdaptiveActions를 사용한다.
- native Slider와 삭제형 InputChip은 공통 Material 테마를 소비한다. scroll 계획·timer·설정 저장은 기존 Score adapter를 재사용한다.
- acceptance: 390/840px 및 840×390 가로, 200% 글자, light/dark에서 하단 설정 접근·끝 페이지 저장/복원·닫기 뒤 PDF identity/현재 쪽 보존. 마이크·오디오·페달·VoiceOver는 자동 검증 대상에 포함하지 않는다.
- 실행 로그: `/private/tmp/score-auto-scroll-20261030.log`. 전체 검증 결과는 작업 마무리 시 아래에 기록한다.

## 메트로놈·튜너 공통 sheet

- 실제 경로: PDF → 연습 → 메트로놈/튜너. 공통 sheet가 제목·safe area·단일 scroll을 소유하고, child는 Stack/Banner/AdaptiveActions로 현재 행동을 표시한다.
- 튜너 마이크는 tooltip에만 의존하던 아이콘 대신 `마이크 켜기/끄기` 동작명이 보이는 Button이다. 음정/드론 시각화·감지 프로필·native 입력과 출력은 기존 adapter를 유지한다.
- acceptance: 390/840px·840×390 가로, 200% 글자·light/dark에서 도구 접근/닫기와 PDF identity/현재 쪽 보존. 메트로놈 BPM·박자·소리 설정을 저장하고 무음 시작/정지·실행 중 닫기/재진입을 검사한다.
- focused 로그: `/private/tmp/score-practice-sheets-20261030.log`. 실제 오디오 청감·마이크/권한·VoiceOver 검수는 별도다.
- focused 6 tests PASS. RC 첫 실행의 전체 576 tests는 PASS였지만 unused style 변수 때문에 analyze가 실패했다. 해당 변수를 제거한 최종 RC는 analyze·전체 576 tests·fixture·scan 모두 PASS, 종료 코드 0 (`/private/tmp/score-practice-rc-final-20261030.log`).
- 영향 scene에 공통 행동 위젯 assertion을 추가한 metadata check PASS (`/private/tmp/score-practice-metadata-20261030.log`).

## 악보 메모 저장 실패·재시도

- 기존 흐름은 `Navigator.pop(notes)` 뒤 parent에서 저장했다. 지연 저장과 실패를 주입한 두 red test에서 입력 창이 먼저 닫히는 문제가 재현됐다 (`/private/tmp/score-notes-red-20261030.log`).
- 기존 controller `_replace`의 저장 후 모델 갱신 순서를 유지한다. 앱의 notes adapter가 저장을 await하고, 성공 후 bool 결과로 닫는다. 실패는 공통 Banner와 `다시 시도`로 표시하며 입력과 원본 metadata를 보존한다.
- 저장 중 Input.readOnly·Button.busy·취소 비활성·PopScope를 적용한다. native host는 barrier/drag dismiss를 막고 안전 영역을 적용한다. 성공 뒤에만 완료 snackbar와 viewer focus 복귀를 요청한다.
- 공통 API 제안: `showDdiroriSheet`에는 현재 dismiss/drag 제어 API가 없다. 이번에는 저장 폼의 native modal host를 앱에 유지하며 공통 소스를 복사하거나 패키지 API를 바꾸지 않았다. 실제 두 소비처가 같은 계약을 요구할 때 별도 확장을 검토한다.
- acceptance: 지연 저장 중 미닫힘·편집/중복 요청/Back/barrier/drag 차단, 실패 draft/원본 유지·재시도 한 번, 정상 취소/저장과 PDF identity/현재 쪽 보존. 저장소와 기기 I/O 증거는 구분한다.
- focused 5 tests PASS (`/private/tmp/score-notes-green-20261030.log`), warning 없음. 200% 가로 검사에서는 입력 후 caret scroll이 안정된 뒤 취소/저장 버튼까지 이동하며 실제 hit-test로 탭한다.
- format·analyze·전체 580 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-notes-rc-20261030.log`). metadata check PASS (`/private/tmp/score-notes-metadata-20261030.log`).

## 자르기 저장·가변 높이 폼

- 기존 자르기는 draft를 pop한 뒤 저장해 지연/실패 시 값을 잃는 red test가 재현됐다 (`/private/tmp/score-crop-red-20261030.log`). 수정 후 실제 저장을 기다리고 실패 시 네 방향 값을 유지하며 재시도한다.
- 메모와 자르기가 앱 전용 `showScoreViewerDraftSheet`/`ScoreViewerDraftForm`을 재사용한다. 이 adapter는 공통 컴포넌트를 합성하고 native modal/Back 정책만 소유하며 저장 데이터·파일·viewer fit은 각 caller에 남긴다. dirty 공통 패키지 API는 수정하지 않았다.
- fixed 44px 방향·퍼센트는 SettingsRow의 가변 높이 title과 semantic value로 대체했다. 기존 normalized crop·per-instance 저장·원본 PDF·주석 geometry 엔진은 유지한다.
- 태블릿의 모든 도구에도 보기 옵션 진입을 추가했다. 휴대폰/태블릿의 동일한 named 경로를 사용하며 기존 직접 도구는 유지한다.
- acceptance: 지연/실패/재시도·설정 취소·성공 후 fit, 390/840/가로 200% light/dark에서 원본 PDF bytes와 document identity 보존. focused 로그는 `/private/tmp/score-crop-green-20261030.log`다.
- 메모와 자르기 focused 9 tests PASS. 초기 전체 584 tests는 PASS였으나 신규 arg 순서/중괄호 lint 3건이 남아 수정했다. 최종 format·analyze·전체 584 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-crop-rc-final-20261030.log`).
- crop scene의 실제 진입 경로·정상 draft assertion을 추가했고 metadata check PASS (`/private/tmp/score-crop-metadata-20261030.log`). scene 촬영과 물리기기 검수는 수행하지 않았다.

## 긴 PDF 페이지 탐색

- 기존 fixed-height modal은 실제 90쪽 PDF의 200% 글자에서 390/840/가로 모두 bottom overflow가 발생했다 (`/private/tmp/score-pages-red-20261030.log`).
- 공통 Sheet 안의 `ScorePagePicker`는 숫자/Slider 미리 선택과 확정 이동을 구분한다. 처음·현재·끝·10쪽 shortcut, 숨김/복제/순서 제외 상태를 표시하는 lazy grid, 접힌 표시 지점을 제공한다.
- bookmark·rehearsal·jump·PDF outline은 viewer가 label/page로 매핑하며 UI는 해당 페이지 선택만 반환한다. viewer는 문서 source identity를 다시 확인하고 기존 `_goToSheetPage`로 이동한다.
- 실제 PDF 회귀 범위: 세 viewport의 범위 오류·입력/Slider 미리 선택·60쪽 이동과 취소 보존, 숨김 30쪽 차단·북마크 60쪽 이동·10쪽 뒤·마지막 쪽 이동. source document와 lastPage를 대조한다. 아직 모든 외부 PDF outline/물리 기기 사례를 검사한 것은 아니다.
- focused 로그: `/private/tmp/score-pages-green-20261030.log`. 캡처는 실제 widget 렌더와 기기 실행을 구분해 기록한다.
- lazy grid를 실제 스크롤해 88쪽으로 이동하는 회귀도 PASS (`/private/tmp/score-page-grid-20261030.log`). 내부 grid는 route의 primary scroll controller를 공유하지 않는다. 최종 format·analyze·전체 588 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-pages-rc-final-20261030.log`).
- metadata check PASS (`/private/tmp/score-pages-metadata-20261030.log`). 모든 검증은 기존 공통 패키지 변경을 보존한 현재 통합 작업트리 기준이며, 별도 clean checkout 검증이나 스토어 촬영은 수행하지 않았다.
- 추가 캡처 검사 4 tests PASS (`/private/tmp/score-page-captures-20261030.log`). 실제 PDFium widget 위의 sheet를 390×1000 light, 840×1000 dark, 840×390 light에서 200% 글자로 캡처해 확인했다. 폰트는 검사 호스트의 AppleGothic, 아이콘은 앱 MaterialIcons, UI는 blue fixture다. 최초 fixture의 lime/아이콘 누락 캡처를 최종 근거로 사용하지 않는다.
- 캡처 경로: `/private/tmp/score-tool-captures-20261030.nMNI7A`. 한국어와 아이콘, 줄바꿈·스크롤 경계를 확인했으며 가로 200%는 아래쪽 컨트롤을 스크롤로 접근한다. iOS Simulator/실기기·VoiceOver·스토어 촬영을 실행한 증거는 아니다.

### 캡처 시점 소스 SHA-256

공통 토큰·디자인 문서에는 기존 사용자 변경이 포함된 현재 작업트리 해시다. 역사적 R3 manifest는 재생성하지 않았다.

```text
bded4dfc662a7142b05a540caa1154137c9c169183d409b573938028cdb81fdc  apps/in_c_sheet/lib/main.dart
4ac7c166642a482ece3d3d8903d19922cb3d60d7b8f7313b1b11f1f5bd9df9b0  apps/in_c_sheet/lib/presentation/score_viewer_components.dart
2ff4ba01a13b327100008aee733eee2dfb16b39cbca2948afc2e9e9992e8bf7f  docs/brand/ddirori-design-system/service-theme-contract.md
bee281a7541bd83b814b928442eafef6af0a4d62c7494eff18c83c432115a867  docs/brand/ddirori-design-system/shared-baseline.md
a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36  docs/brand/ddirori-design-system/product-design-r3/revision.json
f3f2c819e4947762ba3f600afc756f50873f6f1ccc933fbf04023c75e35c4efc  packages/ddirori_ui/lib/src/generated/ddirori_tokens.dart
```

## 나머지 viewer 선택 메뉴

- crop preset·페이지 템플릿·viewer 공유 대상·텍스트 주석 action은 공통 Sheet/Stack/Item/Button으로 구성한다. preset 입력은 Dialog/Input/Choices이며 저장 데이터와 적용/삭제/공유/주석 처리는 기존 경로다.
- AlertDialog 내부의 SettingsRow(LayoutBuilder)는 intrinsic 측정과 충돌해 fixture에서 실패했다. dialog scope는 공통 label+Choices로 구성해 해결했으며 공통 패키지는 변경하지 않았다.
- Choices가 선택한 항목 재탭 시 빈 집합을 전달하는 실제 계약을 확인해 preset scope와 auto-scroll cue의 비어 있지 않아야 하는 단일 선택을 보존한다. cue 0/3/3 재선택 회귀를 추가했다.
- acceptance: 390/840/가로 200%에서 preset 적용/삭제·빈 페이지 위치 기록/삭제와 PDF identity 보존, preset 입력 취소/저장, 공유 선택 취소·절대 경로 비노출, 실제 PDF 위 text hit-testing→메뉴 취소→수정/삭제→저장소와 문서 보존. 실제 공유 OS sheet는 호출하지 않았다.
- focused 로그: `/private/tmp/score-option-menus-20261030.log`, `/private/tmp/score-text-actions-20261030.log`.
- 메뉴/프리셋/cue/share 6 tests와 실제 text action 1 test PASS. 일반 악보함 공유 picker 변경은 포함하지 않았다. 최종 format·analyze·전체 595 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-option-menus-rc-final-20261030.log`); metadata check PASS (`/private/tmp/score-option-menus-metadata-20261030.log`).

## PDF 본문 검색

- 실제 fixture에서 가로·200%·키보드 inset의 fixed-height Column overflow(138px)를 재현했다 (`/private/tmp/score-search-red-20261030.log`). 공통 Sheet의 scroll과 app-owned `ScorePdfTextSearchSheet`로 Input/Action/상태/결과를 합성한다.
- viewer 소유 PdfTextSearcher를 그대로 사용하고 Listenable 알림으로 실제 상태를 갱신한다. recursive refresh timer와 route 밖에서 즉시 dispose하던 입력 controller는 제거했다. 같은 query를 재실행해 진행 중 native session을 취소하지 않으며 문서 source/검색 세대 확인 뒤 결과 UI를 처리한다.
- 2페이지 보기에서는 2쪽 match가 실제 표시되는지·selected match index와 펼침 첫 쪽 cursor/lastPage 일치를 검사한다. narrow는 실제 2쪽 이동을 확인한다. PDF/zoom 엔진과 기존 첫 결과 자동 이동 정책을 바꾸지 않았다.
- focused 7 tests PASS (`/private/tmp/score-search-green-20261030.log`): 세 viewport의 키보드 inset/200%, 결과 없음·clear/reopen, 최신 query/중복 검색, 파일 교체 시 action 거부, 90쪽 검색 중 닫기. 문서 교체 fixture는 실제 파일 I/O 완료를 기다리며 fake-clock settle 제한을 늘리지 않았다.
- 공통 API 제안: Input에 textInputAction 설정이 없어 명시적인 native Search 키 모양은 이번 공통 입력으로 설정할 수 없다. onSubmitted 동작과 이름 있는 검색 버튼은 유지하며 실제 키보드 액션/IME는 manual 항목으로 남긴다. 공통 패키지 확장은 다른 실제 소비처의 수요와 함께 별도 검토한다.
- 최종 capture+focused 7 tests PASS (`/private/tmp/score-search-captures-final-20261030.log`), keyboard done 제출도 실제 검색을 실행한다. 캡처는 `/private/tmp/score-tool-captures-20261030.nMNI7A/pdf-search-*.png`이며 같은 blue/system font/icon fixture에 240px(portrait)/100px(landscape) fake viewInsets를 적용했다. 물리 키보드 화면을 촬영한 것이 아니다. 한 줄 helper가 200%에서 잘리는 현상을 확인해 description 역할의 줄바꿈 텍스트로 옮겼다.

## 자동 스크롤 상태·시작 요청 수명

- red: 같은 sheet에서 pause 뒤 resume이 표시되지 않았다. 실제 viewer를 닫은 뒤 지연 저장 성공은 분리된 PdfViewerController 접근으로 null 예외, 실패는 처리되지 않은 FileSystemException이었다 (`score-autoscroll-lifetime-red-20261030.log`, `score-autoscroll-delayed-red-20261030.log`, 모두 `/private/tmp/`). 초기 종료 fixture는 route 퇴장 애니메이션을 완료하지 않아 viewer가 남아 있었고, 실제 종료를 기다린 두 번째 red가 요청 수명 근거다.
- 실행·pause·정지·정수 퍼센트·큐 변화만 앱 notifier로 전달해 열린 sheet도 현재 상태를 반영한다. PDF scroll 계획/좌표/타이머 간격은 유지한다. 시작은 저장·layout 대기·native 페이지 이동 후 요청 세대/파일/창 수명을 다시 검사하며, 정지·viewer 종료·문서 교체는 이전 시작을 무효화한다.
- 설정 변경은 이 sheet 안에서 저장 순서를 직렬화한다. 이전 실패가 최신 성공을 덮지 않고 최신 실패는 draft와 오류를 유지한다. 시작은 대기 쓰기 뒤 실행하며 설정 중복 조작과 중복 시작을 막고 실패 시 다시 시작으로 재시도한다. 성공으로 닫힌 시작 큐는 유지하고 새로 열린 창에서 정지할 수 있다.
- focused 16 tests PASS (`/private/tmp/score-autoscroll-focused-final-20261030.log`): 기존 3 viewport/200%와 cue 재선택, 실제 시작/pause/resume/stop, 지연 성공·실패 후 viewer 종료/새 sheet 보존, 중복 시작, 설정 저장 순서/오류/재시도, 정상 큐 유지/취소, 문서 교체 뒤 늦은 시작 실패.
- 경계: native에 이미 보낸 이동이나 저장의 취소를 보장하지 않는다. 외부에서 store를 직접 쓰고 controller.load를 지연된 _replace와 동시에 실행한 탐색 fixture는 기존 _replace의 snapshot 저장 경계를 건드리므로 이번 UI 보호의 보장 범위에서 제외했다. 최종 문서 교체 fixture는 오래된 쓰기 실패를 주입하고 새 경로 보존을 확인한다. 다른 저장 경로와의 동시 성공/자료 보존은 별도 controller 거래 설계·회귀가 필요하며 해결됐다고 표시하지 않는다.
- 실제 기기의 연주 속도·오디오/페달/펜·장시간·VoiceOver는 pending이다. running 상태 검사는 무한 프레임을 기다리는 settle 대신 bounded frame과 native PDF 준비를 사용한다.
- 최종 format/analyze·전체 614 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-autoscroll-rc-clean-20261030.log`). 앞선 RC도 614 tests는 통과했으나 중괄호 lint 한 건 때문에 exit 1이었고 이를 수정 후 재검증했다. metadata check PASS, source pending (`/private/tmp/score-autoscroll-metadata-20261030.log`).

## 자동 스크롤 재진입 저장 순서

- red: 이전 sheet에서 270초 저장을 지연하고 닫기 → 새 sheet에서 210초 저장 → 이전 저장 완료 순서에 실제 metadata가 270초로 되돌아갔다 (`/private/tmp/score-auto-reentry-red-20261030.log`). 실행 수명과 별개인 저장 순서 문제다.
- `updateAutoScrollSettings`의 요청만 controller에서 순차 실행하고 각 요청 시작 시 최신 score를 읽는다. 실패는 원래 caller에 반환하되 다음 쓰기/재시도를 막지 않는다. 대기 중 라이브러리가 reload되면 해당 대기 요청을 거부한다. 일반 `_replace`와 store 파일 형식/정책은 바꾸지 않았다.
- 실제 PDF 재진입을 포함한 auto-scroll widget 17 tests PASS (`/private/tmp/score-auto-reentry-green-20261030.log`). controller는 정상/이전 실패 뒤 최신 성공·오래된 caller의 metadata 보존·reload된 라이브러리 요청 거부를 검사한다. 첫 controller 검사의 마지막 equality는 identity 비교여서 실패했고, 저장된 내용의 toJson 비교로 수정했다.
- 이미 실행한 쓰기와 다른 종류 metadata 저장/외부 store 변경을 전역 직렬화한 것이 아니다. 라이브러리 전환 중 in-flight 저장의 rollback/취소·강제 종료 복구는 이번 완료 범위가 아니다.
- 최종 format/analyze·전체 619 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-auto-reentry-rc-20261030.log`). metadata check PASS, source pending (`/private/tmp/score-auto-reentry-metadata-20261030.log`). 테스터 체크리스트에도 변경 영향 범위만 추가했다.

## 악보함 가져오기 선택

- 기존 raw modal의 Column은 840×390/200%에서 하단 149px overflow가 재현됐다 (`/private/tmp/score-import-sheet-red-20261030.log`). 세로 조건의 red는 공통 행 부재를 확인한 것이며 overflow로 표현하지 않는다.
- 공통 Sheet/Stack/Banner/flat Item과 이름 있는 취소로 전환했다. 파일 선택·사본 생성·controller 저장 경로는 유지한다. modal 종료 뒤 화면이 이미 종료됐으면 가져오기를 새로 요청하지 않는다.
- focused 4 tests PASS (`/private/tmp/score-import-sheet-green-20261030.log`): 390/840/가로·200% light/dark의 이미지 선택 취소·명시 취소·Back, PDF 실패/취소 재시도와 악보/검색 조건/라이브러리 보존. store는 취소/실패를 주입한 fixture이며 실제 파일 provider/변환 성공 증거가 아니다.
- 최종 format/analyze·전체 623 tests·RC PASS (`/private/tmp/score-import-sheet-rc-20261030.log`). metadata check PASS, source pending (`/private/tmp/score-import-sheet-metadata-20261030.log`).

## 공연 설정 최종 저장

- 코드 조사에서 pop 뒤 parent 저장 경로를 확인했다. 첫 red fixture는 compact 화면의 공연 설정을 버튼으로 잘못 찾아 실패했으므로 버그 증거가 아니다. 실제 보기 옵션 항목 경로로 고친 뒤 기존 제품 코드에서 지연 성공/실패 모두 공연 설정 창이 먼저 닫혔다 (`/private/tmp/score-performance-save-red-actual-20261030.log`). 신규 제품 diff만 임시 역적용/재적용해 기존 코드의 red를 확인했고 다른 변경은 건드리지 않았다.
- 메모·자르기의 `showScoreViewerDraftSheet`/`ScoreViewerDraftForm`을 재사용한다. 저장 await 뒤 성공일 때만 닫기/갱신하고, pending 동안 수정·취소·Back·barrier·중복 저장을 막는다. 실패 시 draft와 오류/다시 시도를 유지한다. preset template 자체 쓰기는 별도 기존 동작이며 여기서 트랜잭션 보장을 확대하지 않았다.
- focused 6 tests PASS (`/private/tmp/score-performance-save-green-20261030.log`): 기존 공통 section 경로, 지연 성공/실패·재시도/Back/barrier 차단, 세 viewport/200%·light/dark의 취소·재진입·하단 preset 접근과 PDF identity 보존.
- 촬영 scene을 휴대폰/태블릿 공통 보기 옵션 경로로 수정했다. 실제 시스템 Back·VoiceOver·공연 화면 유지와 기기 저장 실패는 manual QA로 남긴다.
- 최종 format/analyze·전체 628 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-performance-save-rc-20261030.log`). metadata check PASS, source pending (`/private/tmp/score-performance-save-metadata-20261030.log`).

## 공연 preset 자체 저장·삭제

- red: 쓰기 실패 시 저장은 처리되지 않은 예외로 끝나고, 삭제는 저장 완료 전에 controller 목록에서 항목이 사라졌다 (`/private/tmp/score-performance-preset-red-actual-20261030.log`). 초기 테스트의 모델 import 누락을 수정한 후 실제 UI 경로에서 재현한 결과다.
- controller는 normalized 목록을 저장한 뒤에만 메모리 목록을 갱신한다. sheet는 preset 작업을 await하며 pending 동안 입력·닫기·중복 작업/최종 저장을 막는다. 실패는 preset 영역에 별도 오류를 표시해 이름·설정·기존 목록을 유지한다. 최종 공연 설정 실패와 preset 실패의 재시도 행동을 섞지 않는다.
- preset 저장 성공은 preset 목록에만 반영하며, 최종 공연 설정은 저장/취소 계약을 그대로 따른다. 기존 파일 형식·normalize/이름 중복 정책·preset 적용·공연 정책은 유지한다. 쓰기 전 실패 fixture이므로 store 내부 부분 쓰기/자동 백업 실패·강제 종료 rollback을 보장하지 않는다.
- 최종 focused 로그: `/private/tmp/score-performance-preset-final-20261030.log`. 생성 실패/이름·설정 보존·재시도, 지연 삭제/기존 항목 유지·실패/재시도, 지연 생성/입력·중복·Back 차단을 검사한다. 앞선 최종 설정/취소와 함께 실행한 8 tests도 PASS (`score-performance-preset-green-20261030.log`).
- 최종 focused 3 tests·format/analyze·전체 631 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-performance-preset-rc-20261030.log`). metadata check PASS, source pending (`/private/tmp/score-performance-preset-metadata-20261030.log`). 실제 provider/기기 검증과 통합 작업트리의 자동 검증을 구분한다.

## 공연 준비 안내·전환 알림

- 기존 안내 Column은 840×390/200%에서 115px overflow였다 (`/private/tmp/score-performance-prep-red-20261030.log`). 공통 scrollable Dialog/Stack/Banner/Button과 기존 themed Checkbox로 전환했다. 공연 허용/진입·다시 보지 않기 저장 조건과 SystemChrome 요청은 바꾸지 않았다.
- 실제 공연 시작/종료 검사는 native channel 응답을 bounded real event loop로 기다린다. fake animation settle만으로는 mode 요청 완료를 뜻하지 않았다. 가로 fixture에서는 긴 기존 snackbar가 종료 버튼을 가려 hit-test가 실패했고, 짧은 전환/자동 잠금 문구로 줄여 알림이 표시된 상태에서도 종료를 실제 탭한다. miss 경고를 숨기거나 상태 assertion을 제거하지 않았다.
- 세 viewport/200% light/dark에서 안내·하단 checkbox 접근·취소/시작·종료와 PDF identity를 검사한다. capture+focused 3 tests PASS (`/private/tmp/score-performance-prep-captures-20261030.log`); 최종 checkbox 접근 assertion 추가 후 전체 검증에서 다시 확인한다.
- 실제 headless PDF 화면 `/private/tmp/score-tool-captures-20261030.nMNI7A/performance-prep-{dialog,active}-*.png` 중 가로 Dialog/전환 알림을 눈으로 확인했다. 200%·blue·system Korean font/실제 icon font fixture이며 물리 기기의 시스템 바 숨김·VoiceOver 검수는 아니다. 다시 보지 않기 저장 실패와 화면 종료 중 native 전환 요청은 별도 수명 검토 후보다.
- checkbox hit-test까지 포함한 최종 format/analyze·전체 634 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-performance-prep-rc-clean-20261030.log`). 앞선 전체 634 tests는 PASS였으나 신규 helper의 중괄호 lint를 수정 후 재검증했다. metadata check PASS, source pending (`/private/tmp/score-performance-prep-metadata-20261030.log`).

## 공연 진입 요청 수명·오류 재시도

- red: 준비의 다시 보지 않기 저장을 지연하고 실제 뒤로 가기로 viewer 종료 후 성공을 반환하면 immersiveSticky 요청이 뒤늦게 전송됐다. 같은 상황의 저장 실패는 처리되지 않은 예외였다 (`/private/tmp/score-performance-owner-red-20261030.log`). platform channel mock은 발신 기록만 검사하며 OS 전환 품질 증거가 아니다.
- 준비 저장 뒤 native 전환 전과 응답 뒤에 mounted·요청 세대·파일 상태 수명을 확인한다. 이전 요청은 UI/알림을 덮지 않고, 현재 요청의 저장/전환 거부는 기존 모드를 유지하며 SnackbarAction으로 재시도한다. native에 이미 보낸 명령을 무조건 반대로 실행해 새 화면을 건드리지 않는다.
- focused 8 tests PASS (`/private/tmp/score-performance-owner-focused-20261030.log`): 기존 세 viewport 준비 경로, 종료 후 지연 성공/실패, 진입/종료 channel 거부와 재시도, 준비 선호 저장 실패/기존 값 유지/재시도. native 처리 순서·OS 바 실제 표시·강제 종료 rollback은 미검수다.
- 누적 출시 문구가 5,391자였다. [Apple의 버전 정보 명세](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)는 변경 사항을 4,000자로 제한하므로 중복된 개발 이력을 기능별 출시 요약으로 정리했다. 상세 근거는 이 문서와 커밋에 유지하며 기존 사용자 블루 테마 문구는 작업 파일에 보존한다. 검수/빌드 번호/출시 승인을 뜻하지 않는다.
- 추가 red: 이전 viewer를 종료하지 않고 다른 실제 PDF viewer를 위에 push한 경우에도 이전 성공은 immersive 요청을, 이전 실패는 새 화면에 오류를 보냈다 (`/private/tmp/score-performance-covered-red-actual-20261030.log`). 초기 fixture의 중간 route 애니메이션에는 두 PdfViewer가 있으므로 기존 helper를 단일 활성 viewer가 된 뒤 사용하도록 고쳤다. 이후 두 viewer가 모두 mounted인 상태에서 실패를 재현했다.
- 준비 선호 저장 전과 mode/알림 결과 전 current route도 확인한다. 최신 focused 10 tests PASS (`/private/tmp/score-performance-owner-final-focused-20261030.log`). 첫 전체는 639 tests PASS였으나 신규 테스트 helper의 중괄호 lint가 남았고 이를 수정했다. 두 route fixture·최종 소스는 이어지는 RC에서 재검증한다.
- 최종 format/analyze·전체 641 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-performance-owner-rc-clean-20261030.log`). metadata check PASS (`/private/tmp/score-performance-owner-metadata-final-20261030.log`), source pending이며 작업 파일의 release_notes는 1,121자다. 공개 문구에 내부 Device QA 미실행 경고를 넣지 않고 manual/runbook에 구분했다.

## 라이브러리 전환 메뉴

- 기존 profile의 한 줄 제목은 세 viewport/200%에서 실제 RenderParagraph.didExceedMaxLines가 true였다 (`/private/tmp/score-library-profile-red-actual-20261030.log`). 공통 Sheet/flat Item으로 전체 이름을 줄바꿈하고 현재 상태를 문자와 선택 상태로 표시한다.
- 이름 변경/비우기는 독립 공통 Menu, 새 라이브러리/취소는 Button이다. 비우기 확인도 공통 scrollable 경고 Dialog로 합성하고, 실제 controller 전환·비우기 반환값·검색 초기화·원본 파일 보존 정책은 바꾸지 않았다.
- focused 4 tests PASS (`/private/tmp/score-library-profile-final-focused-20261030.log`): 세 viewport/200% light/dark의 실제 미잘림·관리와 전환 분리, rename 취소/검색·자료 유지, 다른 라이브러리/기본 자료 복귀, sheet/create/clear 취소. 추가 테스트 등록 위치가 초기 helper 안에 들어간 오류를 수정하고 main에서 정적으로 등록해 검사했다.
- 촬영 scene은 기본 라이브러리의 메뉴 진입만 정의하고 존재하지 않는 사용자 profile이나 관리 성공을 만들지 않는다. 실제 저장 실패·여러 provider·VoiceOver/focus와 많은 profile의 성능은 별도 범위다.
- 최종 format/analyze·전체 645 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-library-profile-rc-clean-20261030.log`). 첫 RC도 645 tests는 통과했으나 문자열 보간 style 두 건을 수정한 뒤 재검증했다. metadata check PASS, source pending (`/private/tmp/score-library-profile-metadata-20261030.log`).

## 악보함 정렬 선택

- 기존 raw Column은 840×390/200%에서 하단 149px overflow가 재현됐다 (`/private/tmp/score-library-sort-red-20261030.log`). 공통 Sheet/Stack/flat Item/Button과 단일 scroll로 현재 정렬·선택·취소를 구분한다.
- 선택 후 mounted/라이브러리 ID를 확인하고 기존 `updateLibrarySortMode`를 사용한다. 정렬 enum·저장 형식·검색·즐겨찾기·악보 ID/최근 열기는 바꾸지 않는다. 저장 실패의 전역 복구 모델을 새로 보장하는 변경이 아니다.
- focused 4 tests PASS (`/private/tmp/score-library-sort-final-focused-20261030.log`): 세 viewport/200% light/dark의 하단 가져온 날짜 선택·저장/재진입·취소·검색/즐겨찾기/자료 ID/미열기 보존, 다른 라이브러리로 바뀐 뒤 이전 선택 거부.
- 촬영은 기본 최근 열기 선택 장면만 정의했다. 물리 터치/VoiceOver·포커스와 저장소 실패 검수는 별도다.
- 최종 format/analyze·전체 649 tests·RC PASS, 종료 코드 0 (`/private/tmp/score-library-sort-rc-20261030.log`). metadata check PASS, source pending (`/private/tmp/score-library-sort-metadata-20261030.log`).

## 검증과 남은 범위

- 자동 스크롤 focused PDF widget 검사: 세 viewport 조건 모두 PASS. 처음에는 재진입 테스트가 연습 패널을 다시 열지 않아 실패했고, 실제 제품 진입 순서로 수정했다. section 제목과 값의 중복을 허용하는 느슨한 assertion 대신 정확한 시간 값을 검사한다.
- `dart format lib test tool`: PASS. RC 내부 analyze·전체 572 tests·fixture·공백/tab/stale/debug 검사 PASS, 종료 코드 0 (`/private/tmp/score-rc-20261030.log`).
- `prepare_ios_metadata ... mode:check`: PASS, source pending (`/private/tmp/score-metadata-20261030.log`). 실제 화면 캡처·기기 청취·OS provider·VoiceOver 검수는 미실행이다.
- PDF 검색 최종 RC: analyze·전체 602 tests·fixture·공백/tab/stale/debug 검사 PASS (`/private/tmp/score-search-rc-final-20261030.log`의 checklist 완료). metadata check PASS, source pending (`/private/tmp/score-search-metadata-20261030.log`).
- 다음 후보: 태그/컬렉션/그룹/별점 필터 선택의 공통화와 긴 목록 접근성. 이미 발신한 SystemChrome 요청의 실제 실행/복원, 물리 키보드/IME와 검색 결과의 VoiceOver 읽기는 manual QA로 남긴다.
