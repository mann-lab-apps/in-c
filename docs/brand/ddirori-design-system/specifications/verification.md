# 검증 계약과 증거 범위

이번 산출물은 구현 명세다. 공통 UI 구현·전체 앱 전환·실기기 접근성 검수를 완료했다는 뜻이 아니다. 각 C/S 문서의 Given/When/Then은 후속 구현의 수용 기준이며, 기존 테스트가 그 조건 전부를 다루는지 별도로 확인한다.

## 증거 구분

| 증거 | 이번 작업의 사용 | 보장하지 않는 것 |
| --- | --- | --- |
| [API 추출](../evidence/specifications/api.json) | 실제 소스 서명·필수 인자·기본값 대조 | 올바른 상호작용·스크린리더 지원 |
| [문서 검사](../evidence/specifications/validation.json) | 링크·심벌 coverage·토큰 표·타입 예제·원본 보존 | 화면 렌더링·앱 기능 통과 |
| [기존 basic-set](../evidence/basic-set/) | 당시 카탈로그·자동검사 이력 | 이번 실행 결과, 제품 전체 적용 |
| 각 페이지의 테스트 소스 링크 | 관련 회귀 테스트를 찾는 출발점 | 심벌이 등장한다는 이유만으로 모든 상태 검증 |
| 서비스 문서의 실제 앱 테스트 | 후속 변경의 회귀 검사 범위 | 이 명세 작성 중 앱 테스트 재실행 |

이번 검사 결과의 command/exitCode와 source hash를 함께 읽는다. 미실행 테스트를 통과로 승격하지 않는다. 수동 확인은 환경·버전·입력 장치·수행자·결과를 기록해야 완료로 바꾼다.

## 공통 상태 매트릭스

모든 컴포넌트에 모든 상태를 만들지 않는다. [공통 계약](component-rules.md)의 적용 범위와 실제 API를 따른다.

| 대상 | 자동 수용 조건 | 시각·수동 확인 |
| --- | --- | --- |
| C01~03 명령 | pending 중 중복 실행0; 완료·실패 후 복구; disabled 동작0 | focus-visible, selected+disabled, 긴 label, pointer/touch |
| C04 입력 | controlled 외부 갱신; readOnly에서 clear0; error 설명 연결; IME 조합 보존 | 한글 조합/붙여넣기, soft keyboard, 긴 오류, 자동완성 |
| C05~07 선택 | checked/mixed/onChange 인자; label 클릭; 그룹 방향키 | 체크·radio·switch의 의미를 SR이 구분 |
| C08 선택 목록 | 탐색과 확정 분리; Escape 취소; Tab 확정; disabled/빈 목록; focus 복귀 | viewport 모서리·스크롤·확대·Popover API; Flutter native 별도 |
| C09~12 숫자/범위/선택 | NaN/빈 입력 무발행; min/max; 선택 유지; group disabled | 숫자 IME·Enter/blur 중복, 터치48, slider 값 낭독 |
| C13 탭 | panel 연결; 비활성 panel focus 제거; disabled skip; manual 모드 차이 | focus와 selected 구분, 가로 overflow, Flutter 자동 선택 |
| C14~18 표시 | 제목 의미/시각 역할 분리; Avatar 실패 fallback; 상태 문구 | 글꼴 fallback·음악 기호·숫자 정렬·대비·확대 |
| C19~22 자료 | stable ID; row/open/checkbox/menu 독립; collapse 자식 제거; sort 의미 | 긴 제목/빈 table header/좁은 폭·읽기 순서 |
| C23~26 피드백 | error 이름; retry 호출; Toast focus 이동0; progress 값 유효 | live region 중복 없음; reduced motion; 반복 알림 |
| C27~30 overlay | Escape·dismiss·return focus; disabled action; Tooltip control 연결 | focus trap, backdrop, safe area, route/스크롤, nested overlay |
| C31~34 구조 | density 상속/override; actions wrap; header 확대 | 320/390/768/1440 폭, 200% text, 가로·세로 방향 |
| C35 브랜드·연계 | unavailable 탐색0; 외부 이동 설명; 제품 이름 유지 | 작은 glyph·브랜드 자산/서비스 식별, 과도한 장식 없음 |
| C36~39 음악 표시 | page 경계; seek 단위; noSignal 오래된 음정 숨김; beat 정지 | 엔진·UI 시계 분리, 펜/터치, 재생·주석 색 의미 |

각 상태를 light/dark에서 확인한다. 여섯 강조색은 토큰 대비 검사와 대표 상호작용 상태에 적용한다. 전체 조합을 무의미하게 곱하지 말고 선택+focus, disabled+selected, error+focus, busy+disabled처럼 충돌 가능성이 있는 조합을 우선한다. 콘텐츠 주석 색은 강조색 전환 전후에 같은 저장값이어야 한다.

## 접근성 실행 기준

- 웹: 키보드만으로 진입→조작→탈출→focus 복귀. 각 interactive 요소의 role/name/state/value/description 검사. 실제 Safari/VoiceOver와 지원 대상 Chromium/SR 조합은 따로 기록한다.
- Flutter: Semantics 트리와 focus traversal widget 검사는 자동화할 수 있다. iOS VoiceOver·Android TalkBack·외부 키보드·실제 TextScaler·IME는 지원 기기에서 수동 확인한다.
- 일반 텍스트 4.5:1, 큰 텍스트 3:1, 필수 경계·상태·focus 식별 3:1을 [기초 규칙](foundations.md)에 따라 확인한다. disabled 예외를 일반 안내문에 적용하지 않는다. 색 외 glyph/label/state 필수.
- 웹 200% 확대와 Flutter text scaling에서 겹침·잘림·동작 소실이 없어야 한다. 악보 지면 확대는 별도이며 문서 좌표를 변경하지 않는다.
- 터치 동작48 logical/CSS px 목표. compact 시각 크기를 터치 hit area와 혼동하지 않는다. 현행 range44 차이는 D04로 남아 있다.
- pen은 악보 엔진의 입력이다. 버튼 hover 테스트로 팜 리젝션·획 저장을 통과 처리하지 않는다.

## 서비스 회귀 매트릭스

| 서비스 | 최소 대표 흐름 | 보존해야 할 결과 |
| --- | --- | --- |
| Score | 가져오기→검색/필터→독립 선택/열기→뷰어 이동→주석→연습 | 파일 취소/실패, 기존 페이지 매핑, 문서 좌표·잉크·저장, 메트로놈/튜너 엔진 |
| Studio | 선택 없음/단일/혼합→속성 draft→commit→undo/redo→저장 | 한 번의 확정=한 transaction, IME 취소, 문서 수정 여부, focus |
| Play | 작품→녹음→악장→재생/seek→queue 변경→파일 사라짐 | 시간 단위·queue stable ID·decoder/library 경계, 복구 안내 |
| Stage | 홍보 정보 읽기→메일 문의 / prototype 검색→공연 상세 | 공개 사이트에 없는 예약·로그인 동작을 만들지 않음 |
| Talk | local feed→작성 draft→local 저장→상세/오류 | 공개 업로드로 오인시키지 않음, draft 보존·긴 콘텐츠 |
| Click/Chime | 설정 변경→시작 요청→실제 엔진 상태→중지/오류 | BPM/Hz 범위·오디오 타이밍·기존 권한, UI 애니메이션과 독립 |

## 실행 명령

이번 문서 검사(저장소 루트):

```sh
node docs/brand/ddirori-design-system/tools/snapshot-spec-api.mjs --check
node docs/brand/ddirori-design-system/tools/verify-specifications.mjs
node docs/brand/ddirori-design-system/tools/build.mjs --check
git diff --check
```

`verify-specifications`는 예제 타입 검사와 Flutter 분석을 포함하며 결과를 evidence에 기록한다. Flutter 예제는 임시 외부 폴더에 복사해 기존 package config로 분석한다. `--skip-flutter`는 웹 전용 CI 작업에서만 사용하며 Flutter 검사는 별도 작업으로 필수 수행한다. 현재 결과 기본 경로는 out/ddirori/specifications.json이고 DDIRORI_SPEC_REPORT로 변경한다. 최초 baseline 검사는 --historical-baseline으로 명시적으로 요청하며 후속 제품 변경에는 맞지 않는다. 최초 evidence를 덮어쓰지 않는다. 새 의존성을 설치하지 않는다. snapshot 갱신은 `--check` 없이 명시적으로 수행하고 API 변경을 검토한다.

후속 구현에서 변경 범위에 따라 실행:

```sh
npm --prefix packages/ddirori_web run typecheck
npm --prefix packages/ddirori_web test
# packages/ddirori_ui 에서
flutter analyze --no-pub
flutter test --no-pub
# 해당 Flutter 앱에서: 기존 테스트 중 변경 기능 + analyze
flutter analyze --no-pub
flutter test --no-pub
```

브라우저 카탈로그·Flutter 카탈로그 검증은 [기존 validation](../validation.md)의 환경과 명령을 따른다. 제품 엔진 변경이 없는 문서 작업에 전체 앱 빌드·오디오 실기기 검증을 요구하지 않는다. 후속 작업에서 발견한 실패는 기존 실패/이번 회귀/환경 차이를 나눠 기록한다.

## 완료 판정

문서 완료: 39개 계약·6개 서비스 명세·실제 API·원본 토큰 표·이행 패키지·출처·차이 기록이 연결되고 문서 검사가 통과. 미결정 대표색과 실기기 검증은 명시적으로 남긴다.

컴포넌트 완료: 해당 계약의 자동 수용 조건 + 적용 가능한 시각/수동 검사 + source snapshot·이행 영향 갱신. API만 존재하거나 데모만 보이는 상태는 완료가 아니다.

제품 이행 완료: 실제 앱 흐름 회귀 + 엔진 불변성 + 해당 iOS 메타데이터/스크린샷 계획 갱신·check. 카탈로그 화면을 제품 화면 증거로 대신하지 않는다.
