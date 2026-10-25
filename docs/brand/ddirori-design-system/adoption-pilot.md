# 공통 컴포넌트와 실제 악보함 적용

2026-10-24 · 띠로리 / Ddirori. [화면·6색 비교](adoption-pilot.html) · [검사 실행 기록](evidence/adoption-pilot/checks.json) · [현재 명세](specifications/README.md).

악보앱의 검색·정렬·필터·선택·일괄 편집·뷰어 진입을 실제 공통 UI에 연결했다. React/Flutter 입력과 비동기 행동의 재현된 문제를 보완했다. 제품 대표색은 미확정이며 기존 임시 라임과 6색 후보를 유지한다. 전체 제품군 이행·실기기 접근성 승인·출시 완료를 의미하지 않는다.

## 기준과 구현 경계

시작점은 [baseline.json](evidence/adoption-pilot/baseline.json)의 HEAD·브랜치·미커밋 목록·1,932개 파일 해시다. 이전 작업의 미커밋 문서·패키지·preview를 포함한 상태를 기준으로 삼았다. 이전 명세의 baseline/validation과 화면 증거는 재작성하지 않았다. API snapshot은 실제 계약 변경을 반영했고 이전본은 [api-before.json](evidence/adoption-pilot/api-before.json)에 보존했다. [범위 보존 검사](evidence/adoption-pilot/preservation.json)는 이번 기준점과 비교한다.

- **실제 제품:** `apps/in_c_sheet/lib/main.dart` → `presentation/score_library_components.dart` → `ddirori_ui`. 기존 controller/model/store를 계속 사용한다.
- **Flutter 카탈로그:** `packages/ddirori_ui/example`. 공통 구성 검증이며 제품 라우트가 아니다.
- **React 카탈로그:** `packages/ddirori_web/catalog`. 전문 도구 비교는 실제 공통 컴포넌트의 조합 예제다. Chromatics Electron 화면으로 표시하지 않는다.
- **Play:** 실제 공유 패키지 소비 영향만 검사했다. 별도 화면 재작성 없음.
- PDF 좌표·주석 저장·사보/재생 엔진·파일 접근·동기화·인증·데이터 형식은 변경하지 않았다. 다른 워크트리는 수정하지 않았다.

## 재현과 처리

세부 계약은 [decisions](specifications/decisions.md)와 각 C 문서에 연결되어 있다.

| 문제 ID | 시작 시 상태·영향 | 처리와 판정 |
| --- | --- | --- |
| D03 / C04·C09 | React 숫자 Enter→blur 중복, 조합 중 Enter; Flutter 동일 submit 반복·조합 중 제출 재현 | dirty 편집 한 번만 확정, 조합/disabled 차단. 잘못된 값은 제출하지 않음. 외부 값 변경 시 draft 초기화. React Escape 취소. Flutter submit-only 유지 |
| D04 / C10 | 웹 range 최소 영역44, 목표48과 불일치 | touch-target 토큰48 적용. 6색×2테마 실제 브라우저 치수 확인. Input padding12/14는 플랫폼 차이 유지 |
| D05 / C21·C27 | React async confirm 중 dismiss·실패·재진입 보호 부족 | 내부 pending/중복 차단, 실패 안내/재시도, open 세대별 오래된 완료 무시. 다시 열린 창의 새 작업은 이전 promise와 독립 |
| D05 / Score | Flutter bool 확인 helper는 비동기 저장 폼이 아님 | helper 계약 유지. 실제 bulk sheet가 busy/PopScope/입력 보존/재시도를 소유. pending 중 뒤로·닫기 차단 |
| D13 / C19 | disabled React Item의 leading 제어가 살아 있음 | leading/actions inert. Flutter checkbox 제목 기반 의미 이름. 실제 행 열기·선택·favorite·pin 분리 |
| D14 / C08 | Select selected+hover에서 선택 면이 사라짐 | 선택 면 유지, 탐색/포커스 윤곽 공존. Escape 취소·trigger focus 복귀 검사 |
| D12 / C01 | 실제 악보함의 모든 quiet/secondary 버튼이 강조색 | 보조 행동 중립 foreground, disabled/selected 의미 유지. Accordion 시작 정렬 |
| D06~11 | Transport 확정 시점, Tabs, Toolbar group, Select API, required/padding/상수 차이 | 현행 API 유지·문서화. 소비 요구 없는 범용 API 추가 안 함 |

초기 실패 재현 후 통과한 검사는 `packages/ddirori_web/src/adoption.test.tsx`, `packages/ddirori_ui/test/adoption_test.dart`다. React Confirm은 성공 시 **host가 open을 변경**하는 계약이다. Button의 promise pending은 버튼 실행 보호이며 host의 전체 폼 busy를 대체하지 않는다. Flutter required 표시는 자동 검증이 아니므로 host가 오류를 전달해야 한다.

Select는 기존 커스텀 목록을 유지한다. 빈/disabled 옵션, 값 소실, 키 탐색·확정·취소는 기존 공통 및 브라우저 테스트를 다시 실행했다. Toolbar를 roving keyboard toolbar로 임의 변경하지 않았다. WAI-ARIA의 [select-only combobox 예제](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)에서 탐색·확정·취소 분리를 참고했다(2026-10-24). Ddirori의 외부 클릭 취소는 명시한 제품 계약이며 예제 전체의 복제가 아니다. 자동검사만으로 실제 보조기술 호환을 보증하지 않는다.

## 악보함 적용과 읽기 흐름

| 구성 | 실제 적용 |
| --- | --- |
| 검색·정렬·필터 | 검색은 기존 controller, 정렬/즐겨찾기는 직접 조작, 나머지는 공통 sheet 안에 묶음. 적용된 필터 개수 표시. 원래 필터 picker와 정책 유지 |
| 목록·그리드 | `ScoreLibraryEntry` 표시 adapter와 `ScoreLibraryRow`/`Collection`. ListView lazy 구성, 넓은 화면은 2열, 큰 글자는 1열. 고정 높이 대신 제목·보조 정보 줄바꿈 |
| 행 행동 | 일반 제목→기존 viewer, 선택 모드 제목/checkbox→ID 선택. favorite/pin/menu는 열기와 분리 |
| 빠른 접근 | 기본 접힌 Accordion. 고정/최근 목록을 필요할 때 펼쳐 첫 화면의 자료 공간 확보 |
| 선택 상태 | count와 닫기를 우선한 AppBar. 검색으로 숨겨져도 선택 ID 보존. 일괄 편집은 공통 primary 버튼, 선택0이면 disabled |
| 일괄 편집 | 저장 중 입력/취소/뒤로 차단, 실패하면 draft·안내 유지 후 재시도. 성공 때만 sheet 닫기 |
| 브랜드 | 중립 작업 면과 평면 행, 음형 로딩/제품 표식. 보조 버튼 중립. 기존 바흐는 빈 상태·도움에서 보조 역할 |

기존 controller의 저장/오류 정책은 바꾸지 않았다. bulk 실패 테스트는 UI draft·재시도·중복 차단을 검증하며 **저장소 트랜잭션 rollback을 새로 보장하지 않는다**.

현재 모델에는 썸네일 공급자가 없다. 기존 문서 glyph fallback을 유지했고 새 thumbnail 성공/실패 파이프라인을 만들지 않았다. 파일 상태는 기존 viewer inspect가 판단한다. 실제 행에서 viewer로 진입해 missing-file 안내와 뒤로 복귀, 열람 이력 및 자료 보존을 검사했다. 존재하는 PDF의 native 렌더링·파일 공급자 권한은 기기 검수 범위다.

검사 상태: 초기 자료 없음 / 결과 없음 / 긴 한·영 제목 / fallback / 파일 없음 / loading / 오류·재시도 / 선택·bulk 실패 / import 취소·실패 / 320px·200% / 1024px. 기존 주석·연습·페이지/저장 동작은 Score 전체 테스트로 회귀 확인했으나 뷰어 전체 디자인은 재설계하지 않았다.

## 대표색 비교와 권고

[동일 구성 비교 화면](adoption-pilot.html)에서 light/dark, 기본/선택, 추천3/전체6을 바꿀 수 있다. 위쪽은 실제 InCSheetApp 위젯 렌더링, 아래는 React 공통 전문 패널이다. 색 토큰·저장 주석색·제품 default는 변경하지 않았다.

| 후보 | 장점·의미 해석 | 약점 | action 대비 light / dark | 선택면의 본문 대비 light / dark |
| --- | --- | --- | --- | --- |
| **바이올렛 · 우선 검토** | 중립 악보함과 도구 면에서 주 행동이 분명하다. 창작·시도라는 성격을 부여하기 좋다 | 넓게 깔면 장식적. 밝은 선택면과 어두운 action 역할 분리 필요 | 6.30 / 9.76 | 14.52 / 12.83 |
| **블루** | 정보 밀도가 높은 도구에서 편안한 위계. 현재 음형·바흐와 연결하기 쉬움 | 서비스 고유성은 형태·타이포·행동에서 더 확보해야 함 | 5.02 / 10.76 | 14.67 / 11.83 |
| **틸** | 밝고 어두운 작업 면에서 부드러운 강조. 듣기와 창작을 함께 묶는 차분한 인상 | success 초록과 의미가 겹치지 않게 아이콘/문구 필수 | 5.00 / 12.40 | 15.21 / 11.25 |

의미는 디자인 제안이며 색의 보편적 심리 효과나 상표 고유성 주장으로 쓰지 않는다. 라임/옐로/코럴도 비교에서 제거하지 않았다. 전체 300개 역할 대비와 중립/선택/음악색 불변 조건12개 통과([대비 결과](evidence/adoption-pilot/contrasts.json)).

사용 규칙: primary는 주요 저장·가져오기 등 한 단계의 주 행동, selected는 체크와 옅은 면, focus는 별도 윤곽. 오류는 error 문구/아이콘. 로딩은 음형을 작게 사용하고 reduced motion을 따른다. 바흐는 빈 상태·도움·완료 반응에서 제한적으로 사용하며 악보 지면·툴바·모든 행·모든 버튼에 넣지 않는다. 기존 승인 자산을 재사용하며 신규 캐릭터/심벌을 생성하지 않는다.

대표색 확정 전에 같은 자료로 목록 탐색, 선택, 실패 복구를 직접 비교하는 사용자 검토가 필요하다. **추천은 바이올렛, 확정은 보류**다.

## 실행 결과와 재현

상세 명령·시간·exit code는 [checks.json](evidence/adoption-pilot/checks.json). 환경은 macOS, Node22.22, Flutter3.47.2. widget 캡처는 고정 자료·Pretendard/MaterialIcons·정해진 프레임을 사용했다. screenshot 생성과 사람이 검토한 범위는 [캡처 기록](evidence/adoption-pilot/captures.json)에서 구분한다.

| 검사 | 결과 / 범위 |
| --- | --- |
| React | typecheck·52 tests·catalog build |
| Flutter 공통 / 카탈로그 | analyze·33 / 54 tests |
| Score | analyze·전체507 tests; 그중 실제 적용23 tests |
| Play | analyze·공통 소비15 tests |
| 브라우저 | [기본셋145 checks](evidence/adoption-pilot/web/browser.json) + [추가38 checks](evidence/adoption-pilot/browser-pilot.json) |
| 토큰·명세 | 생성 일치, API63 React/60 Flutter, 39계약·6서비스, 링크·타입 예제·194토큰 행, 대비 검사 |
| iOS metadata | Clef/Play 모두 prepare_ios_metadata mode:check 통과 |

```sh
# 기본 검증 전체. 특정 작업 이름을 뒤에 주면 해당 검사만 재실행한다.
node docs/brand/ddirori-design-system/tools/verify-adoption-pilot.mjs
# 검토 후 API snapshot 재생성 → 위 명세 검사로 재확인
node docs/brand/ddirori-design-system/tools/snapshot-spec-api.mjs
# 현재 증거로 비교 페이지 만들기
node docs/brand/ddirori-design-system/tools/build-adoption-gallery.mjs
```

브라우저 자동화는 개발 카탈로그 URL이 필요하다. `DDIRORI_CATALOG_URL`, `DDIRORI_QA_PACKAGE`(Playwright가 설치된 package.json 경로), `DDIRORI_BROWSER_PATH`로 실행 환경을 지정한다. 기존 로컬 QA 환경을 사용했고 제품 의존성을 추가하지 않았다. 기본셋은 `DDIRORI_EVIDENCE_DIR`을 새 폴더로 지정해 과거 증거 덮어쓰기를 피한다. 이번 캡처의 정확한 명령·폰트 경로는 captures.json을 참고한다.

[CI 설정](../../../.github/workflows/design-system.yml)은 web/Flutter를 분리하고 계약·생성물·관련 제품 회귀를 실행한다. Flutter 버전은 로컬 검증 버전으로 명시했다([flutter-action 공식 사용법](https://github.com/subosito/flutter-action), 2026-10-24). CI 설정의 YAML과 로컬 검사만 확인했으며 **원격 CI 실행은 미확인**이다. 브라우저 시각 검사와 실기기는 별도 QA다. GitHub에 커밋/푸시하지 않았다.

## 수동 검수 인계 · 아직 미검증

담당자는 제품 QA/각 플랫폼 담당자가 배정한다. 아래 항목은 완료 표시하지 않는다.

| 환경 | 절차 | 기대 결과 |
| --- | --- | --- |
| iOS VoiceOver / Android TalkBack | 악보함 검색→필터→선택→bulk 실패/재시도, 행 보조 버튼 탐색 | title·선택상태·버튼이 구별되고 중복 낭독/초점 함정 없음, 오류·pending 인지 가능 |
| 실제 한글 IME | 숫자/텍스트 편집 중 조합 Enter→확정 Enter→다른 필드 이동 | 조합 Enter로 저장 안 됨, 실제 편집 저장1회. native keyboard Done 경로 포함 |
| 외부 키보드 | Select 화살표·Enter·Escape, modal Tab/Shift+Tab, Score 목록/toolbar | 탐색과 확정 분리, 닫힌 뒤 trigger 복귀, disabled 미실행 |
| iOS/Android native overlay | 큰 글자·가상 키보드에서 filter/sort/bulk 열기, 회전·화면 끝 | 메뉴가 잘리지 않고 선택/취소 가능, 입력·저장 버튼 접근 가능 |
| 지원 브라우저별 | Chromium 외 Safari/Firefox에서 위 키보드·focus·overlay 흐름 | 같은 계약 유지. 이번 Chrome 자동검사를 다른 브라우저 통과로 간주하지 않음 |
| 실제 PDF/권한/기기 | 기기 자료 가져오기→열기→주석/연습→복귀, 파일 공급자 취소/권한 거절 | 원래 엔진 동작 유지, 권한/파일 오류 안내, 데이터 손실 없음 |
| 장시간·대형 자료 | 실제 많은 자료에서 연속 검색/정렬/스크롤, palette 비교 | 지연·피로도 측정. lazy 구조 보존만으로 성능 수치 통과 주장 금지 |

## 메타데이터·후속·되돌림

`deployment/apps/clef/ios-metadata.yaml`과 `deployment/apps/classical-local-library/ios-metadata.yaml`의 source.path로 소비 앱을 확인했다. source.state pending/content.reviewed false, 실제 출시 문구·심사 경로·scene/steps/assertions와 영향 manual을 갱신했다. 제품 commit/version/build는 임의로 올리지 않았다. widget 캡처는 스토어 촬영/검수 산출물이 아니며 pipeline에서 새로 촬영해야 한다.

다음 작은 작업은 **Play의 라이브러리→메타데이터 편집 한 흐름**이다. 공통 입력·async 실패·복귀를 adapter에 연결하고 플레이백 엔진은 유지한다. 이후 **Chromatics inspector의 선택 속성 패널 하나**에서 숫자 편집·단축키·undo 경계를 검증한다. 실제 Electron 소비 전 카탈로그를 제품 적용으로 집계하지 않는다. S-SCORE-04~06 전체 이행은 별도 작업이다.

되돌림은 이번 diff의 common behavior와 Score adapter/host 연결 단위로 수행한다. API에 새 필수 인자는 없다(Dialog busy는 선택 인자). 저장 형식 변경이 없어 데이터 역변환은 필요 없다. shared quiet 버튼의 중립색 영향은 소비 앱별로 확인한다. 시작 시 미커밋 변경이 있으므로 파일 전체를 HEAD로 checkout하거나 다른 워크트리를 삭제하면 안 된다. baseline 및 이번 변경 목록을 사용해 해당 hunk만 되돌린다.
