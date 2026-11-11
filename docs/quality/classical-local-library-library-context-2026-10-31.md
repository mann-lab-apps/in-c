# Play 보관함 탐색·재생목록 UX 개선

기준일: 2026-10-31 KST. 작업 기준 `cb29d398`, 격리 브랜치
`feature/ddirori-play-library-context-20261031`. 제품 변경은 미커밋이며 배포하지 않는다.
원본 작업 트리의 사용자 변경과 내부 TestFlight 0.1.0(3)을 보존한다.

## 근거와 판정

Apple 공식 [보관함](https://support.apple.com/en-ie/guide/iphone/iph0138fb328/ios),
[재생목록](https://support.apple.com/guide/iphone/create-edit-and-delete-playlists-iph21addc265/ios)
문서를 2026-10-31 조회했다. 이 대화의 조회 결과에서 분류 편집·목록 정렬·
재생목록별 편집/정렬/삭제를 확인했다. 재조회 direct open은 HTTP 429였으며
검색 결과로 내용을 대조한다. Apple 앱을 직접 조작한 증거는 없다.
생성 후 원래 화면 유지·완료 안내·명시적 ‘보기’는 사용자 피드백에 따른
띠로리의 정책이며 Apple의 정확한 전환/애니메이션을 관찰했다고 주장하지 않는다.

| 대상 | 변경 전 | 기준·문제 | 적용 정책 | 증거 |
| --- | --- | --- | --- | --- |
| 보관함 첫 화면 | 분류·최근 추가·가져오기 | 기본 구조 존재 | 유지 | 기존 회귀 |
| 우측 메뉴 | 모든 깊이에 전역 9개 메뉴 | 대상별 행동이 구분되지 않음 | 전역 도구는 루트, 상세는 해당 대상 메뉴 | navigation widget·iOS scene PASS |
| 목록 정렬 | 곡 정렬 표시가 그룹 목록에도 노출, 그룹은 항상 이름순 | 선택과 실제 순서 불일치 | 그룹은 이름/추가일만 제공하고 실제 정렬 | group query·정렬 복원 widget PASS |
| 검색 복귀 | 보관함으로 초기화 | 원래 대상/필터/스크롤 상실 | 방문별 상태·스크롤 키 복원 | 시스템 뒤로·상세 검색 복귀 PASS |
| 새 재생목록 | 무조건 상세 이동 | 저장 결과와 위치 변화를 인지하기 어려움 | 원래 화면 유지, 새 행 표시·완료 안내·보기 | widget·native 저장/보기/복귀 PASS |
| 곡 추가 | 선택 sheet만 닫힘 | 대상·실제 추가 수가 불명확 | 대상 이름·추가/중복/누락 제외 결과 | 기존/새 목록·중복 widget PASS |
| 편집·삭제 | 상세 본문에 모든 관리 버튼 | 일상 감상과 관리 조작 혼재 | 상세 더보기와 명시적인 편집 상태 | 드래그·제거·이름·삭제 회귀 PASS |
| 저장 후 재조회 실패 | 전체 저장 실패로 처리 | 재시도 시 중복 생성 위험 | 커밋 성공과 조회 실패 분리, 마지막 저장 snapshot 반영 | write/read 실패·busy·unmount 주입 PASS |
| 재생 UI·빈 상태 | 실제 큐 기반 미니플레이어, 즉시 파일 재생 | 보존 대상 | 엔진 동작을 유지 | 전체 회귀·native 재생·OS 전환 PASS |

## 진입 경로 대응

| 기능 | 변경 전 | 변경 후 |
| --- | --- | --- |
| 가져오기 | 보관함 가져오기 / 모든 화면의 도구 | 보관함 가져오기 / 보관함 도구→가져오기·파일 상태 |
| 복구·메타데이터 | 모든 화면 도구 | 보관함 도구→음원 정보·파일 복구 |
| 백업·데이터 | 모든 화면 도구→앱 정보 및 데이터 | 보관함 도구→앱 정보 및 데이터 |
| 폴더·감상·IMSLP·발견·진단·재생 계획 | 모든 화면 도구 | 보관함 도구의 기존 항목 |
| 재생목록 편집·이름·삭제 | 상세 본문 | 재생목록 상세 더보기 |
| 새 재생목록 상세 | 생성 성공 직후 자동 진입 | 새 행 또는 완료 안내의 보기 |

## 보존 계약과 범위

파일/목록 ID·SQLite schema v15·원본/태그·재생 큐·위치·엔진을 변경하지 않는다.
백그라운드 재생, 시스템 미디어, 이전3초 정책, interruption/noisy,
진단 배타 실행 계약을 유지한다. 공통 API 복제/확장·새 의존성은 없다.
분류 편집·플레이리스트 커버·스마트 목록·협업·클라우드는 추가하지 않는다.

## 검증 기록

- 수정 전 두 widget 재현 테스트가 실패: 전역 메뉴 반복, 생성 후 목록 이탈.
- `dart format lib test integration_test`: 126개 파일, 최종 실행에서 추가 변경 없음.
- `flutter test --no-pub --reporter expanded`: **441 PASS**. 기준 418개에서 23개 증가.
  새 navigation 10개 시나리오(키보드 Escape 취소·focus 포함)+12개 viewport/theme/scale 조합, 그룹 정렬1개.
  기존 SQLite·파일 가져오기·R1/R2·시스템 미디어·lifecycle·대형 라이브러리 검사 포함.
- `flutter analyze --no-pub`: no issues. `dart run tool/generate_audio_fixtures.dart --check`: exit0.
- `bundle exec ruby -Ilib test/ios_metadata_test.rb`: **13 runs/40 assertions**, 실패0.
  새 checkout에 `deployment/output`이 없어 최초 시도는 setup 실패였고, 생성 후 재실행 통과했다.
- `bundle exec fastlane prepare_ios_metadata manifest:apps/classical-local-library/ios-metadata.yaml mode:check`:
  valid, source pending. 새 `playlist_create` scene과 곡 목록의 전역 메뉴 부재 assertion 포함.
- `git diff --check`: PASS. source pin·버전/build·스토어/내부 TestFlight 변경 없음.

### 시뮬레이터와 캡처

Xcode 26.5, iPhone 17 Pro / iOS 26.5의 전용 시뮬레이터.
고유 integration **6개 PASS**:
- local_file_library_flow 1: 선택 결과를 주입한 합성 WAV 가져오기→실제 just_audio 재생→
  현재 재생에서 재생목록 생성→같은 화면 유지→보기→뒤로→같은 곡 재생 유지,
  실제 native SQLite close/open 뒤 목록 확인. Files 제공자 자체의 UI 검증은 아니다.
- ios_system_media 1: 공개 Now Playing center 조회와 debug native 명령 주입.
- screenshot_scene_contract 2: 생성 폼을 포함한 실제 화면 경로와 R2 A 재생/B 탐색.
- ios_background_audio 2: 실제 Settings 앱 전환6초, 큐0→3→완료12, 위치 저장,
  Now Playing ‘합성 음원 3’/rate1.0와 interruption 주입 후 자동 재개 방지.

최종 UX/scene 3개는 문구·보기 색 수정 후 재실행했다. native 캡처의 ‘보기’는
처음 중립 Toast에서 대비가 낮아 실제 행동 토큰을 명시한 뒤 다시 촬영/확인했다.

Widget 캡처는 실제 Flutter 위젯+fake controller이며 320/390/1024px,
글자1x/2x, light/dark 12조합을 검사했다. 대표3조합의15개 PNG를 생성했다.
생성 폼은 입력 애니메이션이 끝난 후 촬영했다. 320px/2x 완료 문구는
여러 줄로 길어지지만 잘리지 않고 보기/닫기에 접근한다.
아래 이미지는 QA 증거이며 스토어 촬영·검수 산출물로 승격하지 않는다.

- [새 목록 저장 후 목록 유지](evidence/play-library-context-20261031/playlist-created-390-1-light.png)
- [좁은 화면·큰 글자 생성](evidence/play-library-context-20261031/playlist-create-320-2-light.png)
- [대상별 상세 메뉴](evidence/play-library-context-20261031/playlist-menu-390-1-light.png)
- [태블릿 다크 목록](evidence/play-library-context-20261031/playlist-list-1024-2-dark.png)
- [iOS 실제 엔진 재생 중 생성 완료](evidence/play-library-context-20261031/native-creation-result.png)
- [iOS 재생목록 상세](evidence/play-library-context-20261031/native-playlist-detail.png)
- [명령 결과·소스/이미지 해시](evidence/play-library-context-20261031/validation.json)

### 디자인 검사에서 보존한 기존 차이

`verify-specifications.mjs --skip-flutter`의 React 예제 타입 검사는 통과하나
`evidence/specifications/api.json`과 `palette-candidates.json`의 stale 오류2개가 있다.
관련 디자인 문서·ddirori_ui·ddirori_web는 기준 `cb29d398`와 diff가0이다.
처음에는 격리 checkout의 node_modules 부재로 실패해 기존 로컬 의존성을 연결한 뒤
재검사했다. API/팔레트 생성물을 임의 재생성하지 않았다. Play 제품 검사와 구분한다.

## 남은 차이와 사용자 점검

Apple과 기능/UX가 완전히 동일하다고 판정하지 않는다. 분류 편집, 재생목록 목록/내부의
추가 정렬 옵션, 커버 편집은 이번에 추가하지 않았다. 원래 화면 유지 정책은 제품 결정이다.
내부 보관함 단계는 기존 단일 화면 구조+방문 stack/PopScope를 사용해 AppBar·시스템
뒤로를 검증했다. 이 단계의 iOS interactive swipe 전환은 구현하지 않았다.
`보기`와 기존 상세는 실제 Navigator route지만 swipe 손동작 검수는 미수행이다.
태그 없는 합성 파일에서 추론된 관리 폴더명이 메타데이터로 표시되는 기존 동작이
native 캡처에 보인다. 후보 출처/승인 표시 개선은 후속 과제이며 이번 메뉴 변경과 구분한다.

5분 사용자 동선:
1. 보관함→앨범 상세→검색→뒤로, 원래 상세/목록 위치 확인.
2. 재생목록 목록에서 생성, 목록 유지·새 행·완료 안내·보기 확인.
3. 곡 또는 현재 재생에서 새 목록에 담기, 원래 화면 유지→보기→뒤로 확인.
4. 상세 더보기로 이름/순서 편집·삭제, 원본 음원과 현재 재생 보존 확인.
- 미검수: 물리 iPhone Xs, VoiceOver 실제 낭독, 개인 음원·Files/iCloud 제공자,
  스피커/유선/Bluetooth와 실제 전화 interruption.
