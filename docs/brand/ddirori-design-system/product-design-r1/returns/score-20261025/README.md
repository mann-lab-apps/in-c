# Score R1 제품 구현 반환

2026-10-25. 대상은 현재 루트 작업트리의 `apps/in_c_sheet`다. **구현 후 검토 대기**. 제품 checkpoint는 `c1ced3125055d9eaec930d4c76545fb8c086c371`이며, 캡처 당시에는 미커밋 상태였다. 제품 빌드·배포는 하지 않았다. 과거 앱 릴리즈 기록이나 다른 작업트리를 이번 소스의 검증으로 재사용하지 않는다.

## 기준과 보존

- 디자인: `product-design-r1`, `revision.py --check`로 대조. 기준 manifest는 재생성하지 않았다.
- manifest SHA-256: `00d7e83fa897871ccb399c5ca2d8ca1dbb84632e7b630e2df15b84bd693d2efb`.
- 시작 HEAD: `6bb5f027cfa5df3a78094a97699c6c5a84c9f0c1`, 제품 구현 commit: `c1ced3125055d9eaec930d4c76545fb8c086c371`. PNG/JSON의 `uncommitted`는 캡처 당시 상태로 보존한다.
- [design-baseline](design-baseline/)은 적용 당시 Score/화면 계약과 manifest의 원문 snapshot이다. 다른 앱의 진행 중인 R1/R2 작업은 이번 커밋 범위에 포함하지 않으며 전체 R1 리뷰 번들을 복제하지 않는다.
- 브랜치: `feature/chromatics-expanded-v1-checkpoint-20260913`. 기존 웹 공통 패키지/R1 미커밋 자료와 동시에 진행된 Play/Studio 변경은 수정·스테이징하지 않았다. 다른 worktree와 이전 evidence도 보존했다.
- Flutter 3.47.2 / Dart 3.13.2, 실제 제품 위젯의 Flutter test 렌더러. iOS/Android 설치본 캡처가 아니다.

## 구현 범위

| 영역 | 실제 변경과 보존 |
| --- | --- |
| 악보함 위계 | 현재 라이브러리를 검색 위로 이동. 정렬/즐겨찾기/필터는 유지하고 분류별 찾기는 접어 둠. 빠른 접근·가져오기·백업·설정·세트리스트 진입 유지 |
| 목록 | 기존 `ScoreLibraryRow/Collection`과 `DdiroriItem` 재사용. 가변 높이와 lazy 목록, 넓은 화면 2열/큰 글자 1열 유지. 행 폭 480 이상·글자 배율 125% 이하에서만 보조 행동을 같은 줄에 배치 |
| 선택 | ID 집합과 선택 시 제목/checkbox 동작 유지. 필터 밖 선택 개수 명시, 하단 safe area에 일괄 편집 배치. 검색·정렬은 선택을 지우지 않음 |
| 편집 | 기존 모든 필드와 앱 소유 draft 유지. 저장 중 readonly·중복 요청·취소/Back/drag/barrier 차단. 취소 시 버튼, 성공 시 라이브러리 제목으로 focus 복귀 |
| 실제 결함 수정 | 기존 controller는 저장 전에 `_scores`를 바꿔 실패 후에도 원본이 변경됨. 이제 임시 결과를 저장하고 성공한 뒤에만 모델 publish/notify. 실패 주입과 재시도로 검증 |
| 큰 글자 | 기존 nullable 3분할 버튼이 320px/200% 캡처에서 잘림. 필드 이름과 공통 `DdiroriChoices`의 변경 없음/켜기/끄기로 분리해 wrap. 데이터의 null/true/false 의미 유지 |
| 뷰어 배치 | 좁은 화면의 제목/뒤로 가기는 고정하고 기존 도구만 다음 줄에서 스크롤. 페이지 표시 폭은 유연하게, 파일 없음 안내는 스크롤 가능하게 변경. PDF/주석/페이지 이동/연습 명령은 변경하지 않음 |

변경 소스: `lib/main.dart`, `lib/presentation/score_library_components.dart`, `lib/sheet_library_controller.dart`, 새 `test/score_r1_adoption_test.dart`.
`main.dart`에는 RC 검사기의 formatter가 기존 미정렬 코드까지 정리한 차이도 포함된다. 다른 제품 파일에는 해당 포맷을 적용하지 않았다.

## 검증 근거

최종 결과: 전체 **535 PASS**, focused **51 PASS**, 공통 Item **4 PASS**, format/analyze/RC/metadata/diff/revision 모두 PASS. 최종 판정은 [verification-final.json](verification-final.json), 공통 Item 검사는 [verification.json](verification.json)의 `common-item`을 참조한다. 각 항목에 명령·cwd·환경 변수·종료 코드·원문 로그가 있다. 최종 소스 해시는 [source-hashes-final.json](source-hashes-final.json).

푸시 전에는 커밋만 포함한 별도 작업트리에서 검사했다. [push-verification.json](push-verification.json)에 해당 소스 commit, 환경, 명령, 종료 코드와 로그를 기록한다. 초기 검증 해시는 당시의 metadata를 포함하므로 커밋 기록을 추가한 후속 metadata와는 다를 수 있다.

- 신규 28개 + 기존 adoption 23개: 행 행동 분리, 라이브러리 전환, 가져오기 취소/실패, 숨은 선택, focus, 저장 중/실패/재시도/성공, scroll 보존, 실제 파일 없음 경로.
- 목록: 320/390/840px × 100/200% × light/dark 전 조합. 저장 흐름: 320px/200%/dark, 390px/light, 840px/light. 행 보조 행동은 600px inline 경로도 검사.
- 공통 Flutter Item 계약 4개: 두 테마·두 density, 독립 보조 행동. 신규 웹 Item API를 Dart에 존재한다고 가정하지 않았으며 Flutter의 실제 `flat/trailing/actions` 계약을 사용했다.
- 전체 앱 회귀, analyze, 포맷과 RC, iOS metadata 형식 검사는 최종 로그에서 판정. 최초 analyze/RC 실패 로그도 삭제하지 않았다. 원인은 중괄호 스타일 경고 3건과 main.dart 포맷이며 테스트 제외나 timeout 증가는 하지 않았다.
- `rc_release_check.dart`의 통과는 이 저장소의 자동 검사 통과다. 아래 출시 식별자 차이나 실기기 검수가 해소됐다는 뜻이 아니다.

## 실제 화면과 fixture

[screens](screens/)에 31개 PNG와 각각의 JSON이 있다. PNG는 실제 `InCSheetApp`을 실행한 RepaintBoundary 캡처이며 웹 시안을 제품으로 둔갑시킨 것이 아니다. DPR 1, 높이 1000px, 임시 lime 팔레트 유지. Pretendard/MaterialIcons는 테스트 전용 로더로 주입했다. 모든 캡처 파일명에 상태와 폭이 있으며 JSON에 theme/text scale이 있다.

| R1 리뷰 데이터/장면 | 제품 반환 데이터/장면 |
| --- | --- |
| bwv846/bwv772/l75, 6/3/5페이지 | pilot-0 평균율 연습곡(즐겨찾기), pilot-1 저녁 연습, pilot-2 긴 한영 제목. 모두 자가 제작 샘플 metadata, 마지막 쪽 1, 페이지 수 미확인 |
| 대표 목록 | `default-*`, `selected-*`. 큰 글자 선택 화면은 목록으로 스크롤한 상태 |
| 빈/검색 없음/loading/error/disabled | 같은 이름의 PNG. loading은 미완료 controller load, 오류는 store 실패 주입. disabled는 선택 0개 |
| dialog pending/failure/retry/success | `pending-*`, `failure-*`, `retry-*`, `success-*`. 태그 `R1 연습`, Completer 저장 지연·실패 주입. 320px 실패 화면은 재시도 버튼을 보이도록 아래로 스크롤 |
| 정적 viewer 시안 | `viewer-unavailable-*`. `/ddirori-pilot-fixture/0.pdf`는 의도적으로 없는 경로이며 실제 filesystem 검사 후 복구 안내를 표시. 정상 PDF 캡처 아님 |

시각 확인: 390 light 기본, 840 dark 기본, 320/200% 선택·실패, 320/200% viewer 등 대표 PNG를 직접 확인했다. 작은 폼 전체가 한 화면에 들어온다는 뜻은 아니며 스크롤로 모든 필드·취소·재시도에 접근한다.

## 시안과의 차이 / 공통 계약

- R1 웹 리뷰의 wrapper·설명 문구·가짜 분류 저장 필드는 반입하지 않았다. 실제 라이브러리 전환, 태그/컬렉션/그룹/별점/즐겨찾기/고정 필드를 보존했다.
- 추천 violet을 새 기본색으로 확정하지 않았다. 기존 lime 및 앱의 `ddiroriTheme` light/dark 설정을 유지한다. PDF와 저장된 주석 색도 그대로다.
- 기존 wide 2열, 720px 전환, page gutter16/32를 보존했다. R1 리뷰의 840px 단일 목록과 픽셀 일치를 목표로 삼지 않았다.
- Flutter flat Item은 외곽선·rounding이 없는 기존 surface를 사용하므로 dark의 2열에서 배경 면이 구분된다. 웹 시안의 투명 행과의 차이는 공유 API 검토 사항이지 이번에 다른 앱까지 바꿀 이유로 삼지 않았다.
- bottom bar는 `DdiroriStack`의 최대 높이 Column 대신 앱의 `Column(mainAxisSize: min)`으로 합성했다. 공통 소스 복사 없음. 현재 계약으로 해결됐고 공통 API 변경은 없음.
- 향후 flat surface 정책 변경 제안은 Play 실제 소비처와 교차 확인한 뒤 별도로 검증해야 한다. 이번 작업은 Play/Studio 계약 변경이나 공통 테마 전체 교체를 포함하지 않는다.

## iOS / 미검수 / 인계 주의

`deployment/apps/clef/ios-metadata.yaml`은 pending/reviewed false를 유지하고 release notes, 테스트 동선, library/selection/bulk-edit/annotation scenes, steps/assertions와 manual 근거를 갱신했다. 촬영 결과나 이미지 해시·사람 검수를 YAML에 만들어 넣지 않았다.

**현재 소스와 배포 manifest가 다르다.** 앱은 `1.0.0+14`, Android `com.mannlab.inc`, iOS Runner `com.mannlab.inc.clef`; YAML은 기존 `1.0.3+30`, `com.mannlab.inc.clefandstaff`다. 사용자 지정 경로의 UI 작업만 수행했고 번호/식별자는 변경하지 않았다. 출시 전에 올바른 제품 checkpoint·식별자를 반드시 대조해야 한다.

미실행: 실제 PDF 렌더링·좌표/출력 시각 비교, iPhone/iPad/Android 설치본, VoiceOver/TalkBack/IME, 실제 파일 picker/provider, 오디오·페달·스타일러스·장시간 연주. 테스트 double을 OS 디스크 장애나 강제 종료 원자성의 보장으로 해석하지 않는다. 전체 수동 QA를 매번 반복할 관문으로 추가하지 않고 위 영향 범위만 명시한다.

다음 검토: 이 반환의 목록/저장 배치 확인 → 출시 소스/식별자 대조 → 필요한 플랫폼의 PDF·접근성 확인. 버전 변경·빌드·push/merge·업로드는 별도 승인 범위다.
