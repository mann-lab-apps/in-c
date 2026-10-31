# Score 공통 UI · 저장/선택 후속

## 시작과 보존

- root `feature/chromatics-expanded-v1-checkpoint-20260913`, 시작 `0bb8ca5f`. fetch 후 HEAD/origin/dev는 75/480, HEAD/origin/main은 75/575의 양쪽 고유 커밋이었다. 원격 병합이나 push는 이번 범위가 아니다.
- Score lib/test에는 시작 시 변경이 없었다. 다른 제품·브랜드·공통 패키지·native icon·iOS YAML의 기존 변경은 보존한다. YAML은 HEAD 임시 사본에 이번 변경만 적용해 선택적으로 stage한다.
- 기준은 현재 service-theme-contract/shared-baseline/specifications와 실제 ddirori_ui API다. R1~R3는 탐색 이력이며 과거 manifest/evidence를 재생성하지 않는다.
- pubspec `1.0.0+14`, Android `com.mannlab.inc`와 metadata의 출시 식별자 불일치는 기존 manual.build_selection 기록을 유지한다. 번호·식별자를 변경하지 않는다.

## 공유 파일 선택

| 계약 | 근거 | 상태 |
| --- | --- | --- |
| 역할/파일명·긴 글자·취소, 절대 경로 비노출 | 실제 악보함 3 viewport/200% light/dark widget | PASS |
| 정상 공유·실패 후 재시도·파일 원본/미열기 보존 | 실제 파일 + mock native share channel의 경로/MIME 확인 | PASS |
| 다른 라이브러리를 거쳐 돌아온 옛 선택 차단 | A→B→A 이후 선택, native 호출 없음 | PASS |
| 이전 native 성공/실패가 새 요청 안내를 덮지 않음 | 응답 gate와 새 정상 요청 | PASS |
| 단일 누락 PDF 공유 금지·안내 | 파일 없음 fixture | PASS |
| 뷰어 소비처 보존 | 실제 PDF viewer 기존 공유 회귀 | PASS |
| OS 공유창/iPad popover·VoiceOver/focus | 실제 기기 | 미검수 |

- 기존 악보함 raw picker와 뷰어 공통 picker를 앱의 `showScoreShareChoices`로 합성했다. 공통 Sheet/Stack/Banner/flat Item/Button을 재사용하고 저장소의 후보 판정·파일 경로·MIME·내보내기 이름은 변경하지 않는다. 20개 초과는 bounded lazy list이며 기기 성능 보증이 아니다.
- 라이브러리 변화·새 요청·현재 route와 현재 파일 후보를 await 뒤 확인한다. native에 이미 보낸 공유를 취소하거나 전송 성공을 보장하지 않는다. iPad 공유 위치용 origin을 전달하지만 실제 popover 검수는 pending이다.
- red `/private/tmp/score-share-red-20261031.log`는 A→B→A 이후 기존 공유가 호출된 실제 버그와 제목 부재를 기록한다. 200% 최초 fixture의 일부 실패는 lazy 행을 찾기 전 스크롤하지 않은 테스트 접근 문제였다. outer NestedScrollView를 스크롤한 최종 fixture로 해결했으며 제품 overflow 버그로 표현하지 않는다.
- focused 8 PASS `/private/tmp/score-share-native-focused-20261031.log`; 뷰어 공유 기존 회귀도 PASS. 캡처 실행 8 PASS `/private/tmp/score-share-captures-20261031.log`.
- 실제 widget 캡처 `/private/tmp/score-share-captures-20261031/share-{390x1000,840x1000,840x390}.png`: blue, 200%, AppleGothic test font/MaterialIcons, light/dark. 기기/스토어 촬영이 아니다. 긴 항목 아래로 스크롤한 장면으로 제목 일부가 화면 밖인 상태와 overflow를 구분한다. 세로·가로 PNG를 직접 확인했다.

## 후속 순서

### 세트리스트 준비

- `ScoreSetlistPicker`/`ScoreSetlistRehearsal`을 앱 presentation에 분리해 기존 공통 draft form과 Section/SettingsRow/Choices/Input/Item/Accordion/Button을 합성한다. 악보 선택은 미리 선택 후 `추가`로 확정한다. 검색 밖 선택도 명시하고 대량 목록은 bounded lazy list로 유지한다. 실제 모델/후보/저장은 controller와 화면 adapter 소유다.
- 저장은 await 뒤 닫고 pending 동안 수정·취소·Back·중복 요청을 막는다. 실패 시 선택/검색/메모를 유지하고 재시도한다. `_replaceSetlist`는 실제 store 성공 뒤 memory 목록을 publish한다. create/delete/duplicate나 전역 concurrent 쓰기·강제 종료·자동 백업과의 원자성까지 고친 것은 아니다.
- 리허설의 시작쪽/초/메모는 곡별로 펼친다. 접어도 draft를 유지하고 화면에 없는 곡 데이터·viewer override 필드를 보존한다. 기존 숫자 파싱/양수 처리·24시간 clamp는 유지한다. 기존 데이터의 전환 180초는 slider 표시 위치만 기존 UI 범위 0~120으로 제한하고, 조작하지 않으면 원래 180을 저장한다.
- red `/private/tmp/score-setlist-red-20261031.log`: 리허설 지연 성공/실패에서 기존 창이 먼저 닫힌 실제 문제. 추가의 red는 새 확정 행동/공통 Input 부재이며 기존 저장 실패를 테스트 끝까지 검증한 red로 표현하지 않는다.
- focused/capture 10 PASS (`/private/tmp/score-setlist-captures-20261031.log`): 지연 추가/리허설 저장의 성공·실패·retry·Back, 300개 lazy 목록/마지막 선택/필터 밖 선택, 사라진 후보 안전 실패와 복구 재시도, 곡별 펼침/기존 override/다른 곡 보존, 세 viewport·200%·light/dark·fake keyboard/safe-area의 취소. 초기 펼침 테스트는 공통 Accordion의 ± 접미사를 무시한 finder 오류였으며 수정했다.
- `/private/tmp/score-setlist-captures-20261031/rehearsal-{390x1000,840x1000,840x390}.png`는 실제 widget의 blue/200%·MaterialIcons, fake keyboard inset 240/100 및 viewPadding 24 캡처다. 최초 AppleGothic 시험 글꼴의 minus가 사각형으로 보여 Arial Unicode로 3 viewport를 재촬영했고 모두 PASS (`/private/tmp/score-setlist-unicode-captures-20261031.log`). 최종 세 PNG의 기호·줄바꿈·행동을 직접 확인했다. 제품 글꼴/공통 소스는 변경하지 않았다. 스크롤된 일부 화면이며 실제 OS 키보드/기기 검수가 아니다.
- 최종 format/analyze·전체 682 tests PASS, metadata check PASS (`/private/tmp/score-setlist-{rc,metadata}-20261031.log`). RC exit 1은 unrelated `experiments/piano-performance/data/README.md:63` EOF 빈 줄뿐이다. 이 파일은 보존하며 이번 staged 공백 검사와 분리한다.

현재 검증은 기존 공통 패키지 변경을 포함한 작업트리 기준이다. 깨끗한 checkout만의 독립 재현이나 릴리즈 검증을 수행했다는 뜻이 아니다. 제품/주요 공통 소비 소스 SHA-256:

| 소스 | SHA-256 |
| --- | --- |
| apps/in_c_sheet/lib/main.dart | 51da79e7732df21410e7ffde253835a29efe87999aa3a2b8a232d1d53dba0239 |
| apps/in_c_sheet/lib/presentation/score_setlist_preparation.dart | 069a0eb5ee1e96b024b0ec019f7eb02a6e7efbab728453eef421b968157234de |
| apps/in_c_sheet/lib/sheet_library_controller.dart | a983e6dc353f74ec6fe4062aaa2ffe977ecc314a534567c43145e1ab78812745 |
| packages/ddirori_ui/lib/src/components.dart | d806b3bcee0e48d2022a42c6cb03163e43901d1232433ec1dda36f801120fa3f |
| packages/ddirori_ui/lib/src/basic.dart | 9d23e01c422f29c1da5764e94a767ef6e2184963208f8198d47ab219164a4cbc |

### 현재 적용 상태

| 구역 | 현재 구현 | 미검수/남은 경계 |
| --- | --- | --- |
| 악보함 공유·뷰어 공유 선택 | 공통 Sheet/행/취소, 앱 후보/비동기 adapter | OS 공유·iPad popover·native focus |
| 전역 보기/입력 기본값 | 공통 draft form·선택·저장·retry, import 회귀 | 실제 페달·새 PDF의 기기 표시 |
| 세트리스트 악보 선택 | 공통 검색/행·명시 추가·저장·retry, lazy 목록 | 실제 터치·스크린리더 |
| 리허설 메모·공연 override | 공통 곡별 펼침/입력·draft 저장 | 실제 키보드/폰트·공연 장비 |
| draft modal host | 앱의 native modal + 공통 표시 조합 | 공통 Sheet에 dismissal API가 없어 의도적으로 앱 소유 |
| metadata 편집·복원/삭제 확인·테스트 정보 등 | 기존 native Dialog/앱 전용 UI가 남음 | 이번 지정 범위 밖의 후속 조사; 전체 디자인 이행 완료 아님 |

현재 지정된 공유/기본값/세트리스트 준비 범위만 검증한다. MobileSheets와의 전체 기능 동등성, 실제 파일 provider/오디오·codec·페달·펜·외부 PDF viewer 품질을 완료했다고 표시하지 않는다. 새 빌드·번호 변경·push/merge·스토어 업로드는 하지 않는다.

### 전역 기본값 회귀

- 기존 제품 구현을 재구현하지 않고 4개 회귀를 추가했다. 공통 Choices에서 보기/맞춤/직접 매핑을 실제 탭하고 현재 선택을 다시 눌러도 값이 비워지지 않는지, 저장/재열기와 화면에 없는 효과·렌더링·공연 옵션 및 기존 악보가 보존되는지 검사한다.
- PDF·이미지 PDF·공유 PDF는 실제 controller의 `_withActiveCollection` 경로로 새 악보에 기본값을 적용한다. store의 가져오기 결과는 fixture로 주입하고 저장/재로드를 검사한다. 실제 OS provider/이미지 변환/native 수신 성공 검수가 아니다.
- focused 9 PASS (`/private/tmp/score-defaults-followup-focused-20261031.log`). 초기 fixture의 존재하지 않는 copyWith(id:)와 잘못된 shared import 타입 import는 테스트 컴파일 오류였고 제품 결함으로 기록하지 않는다. 테스트만 변경했으므로 제품 동선·metadata는 이 slice에서 바꾸지 않는다.
- format/analyze·전체 672 tests PASS (`/private/tmp/score-defaults-followup-rc-20261031.log`). RC는 unrelated README:63 EOF 공백 한 건 때문에 exit 1이며 이번 staged 공백 검사는 PASS다.

- 공유 slice 검증: 전체 668 tests PASS (`/private/tmp/score-share-rc-20261031.log`), 최종 analyze PASS (`score-share-final-analyze-20261031.log`), metadata check PASS (`score-share-metadata-20261031.log`, 모두 `/private/tmp/`). RC 최초 analyze의 명시적 mounted guard/unused import 경고는 수정했다. RC 전체 exit 1은 초기 경고와 unrelated README:63 EOF 공백 실패로 기록하며 RC PASS라고 표시하지 않는다. 선택적 diff 공백 검사는 별도로 통과했다.

1. 완료: 전역 기본값의 저장·현재 선택 재클릭·기존 필드 보존과 import controller 적용 회귀.
2. 완료: 세트리스트 선택/리허설의 긴 목록·취소·저장 pending/실패·재시도와 기존 설정 보존.
3. 완료: 적용 상태표·metadata·QA 갱신. 다음 별도 후보는 metadata 편집·복원/삭제 확인·테스트 정보의 공통 UI 조사다. 버전/식별자 불일치와 기존 공통 패키지 변경의 통합·릴리즈 검증은 배포 작업에서 다시 확인해야 한다. 대형 엔진·cloud·새 저장 형식은 이번에 시작하지 않았다.
