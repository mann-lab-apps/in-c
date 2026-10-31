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

### 전역 기본값 회귀

- 기존 제품 구현을 재구현하지 않고 4개 회귀를 추가했다. 공통 Choices에서 보기/맞춤/직접 매핑을 실제 탭하고 현재 선택을 다시 눌러도 값이 비워지지 않는지, 저장/재열기와 화면에 없는 효과·렌더링·공연 옵션 및 기존 악보가 보존되는지 검사한다.
- PDF·이미지 PDF·공유 PDF는 실제 controller의 `_withActiveCollection` 경로로 새 악보에 기본값을 적용한다. store의 가져오기 결과는 fixture로 주입하고 저장/재로드를 검사한다. 실제 OS provider/이미지 변환/native 수신 성공 검수가 아니다.
- focused 9 PASS (`/private/tmp/score-defaults-followup-focused-20261031.log`). 초기 fixture의 존재하지 않는 copyWith(id:)와 잘못된 shared import 타입 import는 테스트 컴파일 오류였고 제품 결함으로 기록하지 않는다. 테스트만 변경했으므로 제품 동선·metadata는 이 slice에서 바꾸지 않는다.
- format/analyze·전체 672 tests PASS (`/private/tmp/score-defaults-followup-rc-20261031.log`). RC는 unrelated README:63 EOF 공백 한 건 때문에 exit 1이며 이번 staged 공백 검사는 PASS다.

- 공유 slice 검증: 전체 668 tests PASS (`/private/tmp/score-share-rc-20261031.log`), 최종 analyze PASS (`score-share-final-analyze-20261031.log`), metadata check PASS (`score-share-metadata-20261031.log`, 모두 `/private/tmp/`). RC 최초 analyze의 명시적 mounted guard/unused import 경고는 수정했다. RC 전체 exit 1은 초기 경고와 unrelated README:63 EOF 공백 실패로 기록하며 RC PASS라고 표시하지 않는다. 선택적 diff 공백 검사는 별도로 통과했다.

1. 전역 기본값의 보기/맞춤/직접 입력 매핑 저장·현재 선택 재클릭·기존 필드 보존 회귀와 실제 import controller 경로 적용 범위를 확인한다.
2. 세트리스트 악보 선택/공연 메모의 긴 목록·취소·저장 pending/오류를 조사해 실제 gap만 처리한다.
3. 적용 상태표와 metadata/QA를 최신화한다. 대형 엔진·cloud·새 저장 형식은 시작하지 않는다.
