# Score · MobileSheets / TonalEnergy 작업 흐름 대응표

확인일: 2026-10-31. 이 문서는 기능 수·테스트 개수가 아닌 실제 진입/저장/복구 경로의 대응표다.

## 소스 기준과 상태 해석

- 현재 디자인 작업트리: `feature/chromatics-expanded-v1-checkpoint-20260913`, 시작 `2b23caeb`, pubspec `1.0.0+14`. 이번 도입의 코드·widget 검증은 이 작업트리 기준이다.
- 원격 기능 기준 후보: `origin/dev` = `80103707a186586a5140031196ea27d6f8328fa7`, pubspec `1.0.2+29`. 현재 HEAD와 고유 커밋은 78/480이었다. `origin/main` = `c26dcc0d4189604e2f1b2c6121f1da89cafc9293`, 고유 커밋 78/575.
- 원격에는 현재 트리에 없는 ChordPro/패키지/폴더/동기화와 iOS 오디오 코드가 있다. **현 트리에서 찾지 못함을 Score 전체 미구현으로 해석하지 않는다.** 원격 진입점 존재와 기기에서 동작 완료도 구분한다.
- 이후 기준 선택은 사용자에게 확인 중이다. 기존 디자인·다른 앱·공통 패키지 변경을 보존하고 승인 없는 병합/광범위 복사를 하지 않는다. 안전 수정은 양쪽 코드에서 동일 결함이 있는지 대조한다.
- 상태: 제품 연결 완료 / 부분 구현 / 기반만 있음 / 미구현 / 검증 미완료 / 의도적 차이. 아래는 현재 트리 상태이며 원격 차이는 별도 열이다. 저장소 전체·원격 앱의 최종 평가가 아니다.
- `adb devices -l`에 연결 기기가 없어 MobileSheets/TonalEnergy의 설치 버전·실행 화면을 이번에 직접 관찰하지 않았다. 공식 설명은 확인했고 실제 기기 조작은 미검수다. 버전을 추측하지 않는다.
- metadata의 출시 식별자와 현재 소스 불일치는 기존 `manual.build_selection`대로 유지하며 임의 변경하지 않는다.

## 공식 근거

- M1 [악보함·검색·세트리스트](https://www.zubersoft.com/mobilesheets/features/)
- M2 [표시·페이지·여백](https://www.zubersoft.com/mobilesheets/features/display/)
- M3 [주석](https://www.zubersoft.com/mobilesheets/features/annotations/)
- M4 [연습 도구·동작·오디오](https://www.zubersoft.com/mobilesheets/features/utilities/)
- M5 [파일·백업·폴더·전송](https://www.zubersoft.com/mobilesheets/features/files/)
- M6 [협업·자료 공유](https://www.zubersoft.com/mobilesheets/features/collaboration/)
- T1 [TonalEnergy iOS 가이드](https://www.tonalenergy.com/tet-user-guide-ios)
- T2 [TonalEnergy Android/Desktop 가이드](https://www.tonalenergy.com/tet-user-guide-android)

플랫폼 지원 차이를 유지한다. 예를 들어 M5의 no-copy 직접 파일 참조와 저장 폴더 변경은 플랫폼별 조건이 있다. 공식 설명을 성능 실측이나 모든 플랫폼 지원 증거로 사용하지 않는다.

## 악보 작업 대응

| ID/근거 | 사용자 작업·취소/실패 계약 | 현 트리 경로·상태·남은 gap | 원격과의 차이 / 다음 검증 |
| --- | --- | --- | --- |
| L01 M1/M5 | 가져오기 → 목록 저장 → 취소/실패 시 원본·목록 보존 → retry | 악보 추가의 PDF/이미지, shared import bridge → controller import. 부분 구현: 단일 선택/공유 경로가 있고 대량 선택 정책은 추가 비교 필요 | 원격에 일괄/폴더/텍스트 계열 진입 존재. 현재에 재구현하기 전 기준 확정 |
| L02 M1 | 분류·검색·정렬 → 필터 밖 선택 → 일괄 수정/취소/저장 실패 | LibraryControls/Row/Choices와 bulk edit. 제품 연결 완료(로컬 회귀 범위); 대형 라이브러리 비용/metadata 종류 대응은 검증 미완료 | 원격 성능·custom field 개선과 별도 대조 |
| L03 M1 | 라이브러리 전환 → 관리/생성 취소 → 원래 자료로 복귀 | 공통 switcher, profile별 설정. 제품 연결 완료(검사 범위); 전체 profile 실패 복구는 별도 | 현재 전환 회귀와 원격 저장소 변경의 충돌 조사 |
| V01 M2 | 문서 열기 → 표시/zoom/반쪽/두 쪽/scroll → 닫고 복귀 | ViewerChrome, pdfrx, viewerSettings. 제품 연결 완료(기본 fixture); 실제 스캔·기기 비용 미검수 | source/버전 차이 보존 |
| V02 M1/M2 | 긴 PDF → outline/bookmark/page picker/jump → 이동 취소 | `_loadPdfOutlineBookmarks`, `_importPdfOutlineBookmarks`, ScorePagePicker. 부분 구현: 실제 목차와 사용자 표시 지점이 있으나 전체 통합 UX 비교 필요 | 목차가 없다고 재구현하지 않는다 |
| V03 M2 | crop/회전/순서/복제 → 저장·사본 → 실패 복구 | page settings/transformer와 공통 crop 폼. 부분 구현: 내용 분석 crop의 이 트리 진입은 추가 확인 | 원격 content crop 관련 코드·문서와 대조 |
| A01 M3 | 펜/도형/텍스트/stamp → undo/지우기 → 재열기 | annotation layer/model/store, viewer 주석 도구. 부분 구현: 기본 도구 연결, 선택·nudge는 재조사 | 원격 선택/레이어 이동 커밋 존재 |
| A02 M3 | 사용자 stamp/이미지 → 배치 → 복원/공유 | 현재 `stampName`/built-in 도구; 사용자 asset 저장/pack 진입은 현 트리에 없음. 부분 구현 | 원격 `sheet_annotation_stamp_asset_store.dart` 존재. 전체 미구현으로 분류 금지 |
| A03 M3 | 여러 layer → 객체 배정/이동 → 표시/export → 복원 | display layer metadata/visibility/export 있음. 개별 object layer key/UI는 현 트리에서 확인되지 않아 부분 구현 | 원격에 selected annotation layer 이동의 실제 코드/커밋 있음 |
| A04 M3/M6 | 주석 포함 사본 → 다른 앱 열기/편집 → 실패 안내 | exporter의 renderedStamp 지원, standardAnnotation은 명시적 unsupported. 부분 구현 | 원격 표준 writer/compatibility fixture는 원격 기준에서 재검증 |
| S01 M1 | 세트리스트 생성 → 추가/재정렬/복제 → 준비 → 다음 곡 | SetlistPicker/Rehearsal, 기존 공연 흐름. 제품 연결 완료(지정 회귀); merge/append 대응은 미확인 | 원격 manifest/package 흐름과 별개 |
| S02 M4 | 공연 → 도구 제한/준비 메모 → 전환/복귀 | performance settings와 request 수명 보호. 부분 구현: 기기 keep-awake/페달/장시간 미검수 | native 이미 전송한 명령 취소를 보장하지 않는다 |
| P01 M4 | 연결 음원 → 반복 구간 → 재생/정지/재진입 | linked audio/controller/SheetAudioPlayer. 부분 구현: native 플랫폼 차이·waveform·tempo/pitch 확인 필요 | 원격에 iOS audio bridge와 loop 후속 코드 존재 |
| P02 M4 | 메트로놈·자동 scroll → pause/resume/정지 → 설정 복원 | 공통 연습 도구와 자동 scroll queue. 부분 구현: 실제 음향과 iOS bridge 현 트리 공백 | 원격 iOS metronome bridge 있음; 새 엔진을 이 트리에 다시 만들지 않는다 |
| P03 M4 | 키/페달 → 페이지·곡·도구 동작 → 설정 복원 | viewer_input, custom mapping·진단. 부분 구현: 실제 HID/MIDI 장비 미검수 | MIDI 전송/등록 linking은 별도 범위 |
| F01 M5 | Text/ChordPro 가져오기 → 저장/viewer → transpose/capo | 현 트리의 전용 parser/viewer 진입 없음. 미구현(현 트리에 한함) | 원격 `sheet_chordpro.dart`와 파일/붙여넣기 UI 존재 |
| F02 M5/M6 | PDF 포함 세트 패키지 공유 → preview → 다른 기기에 가져오기 | 현 트리는 전체 backup ZIP과 개별 공유. 패키지 작업은 현 트리 미구현 | 원격 `sheet_setlist_package.dart`/annotation package 존재 |
| F03 M5 | full backup → restore → 파일/metadata/참조 복원 | store/backup의 ZIP·자동 metadata backup. 부분 구현: 삭제/복원 실패·중단 원자성 보장 아님 | 현재 sanitizer 원본 참조의 backup 포함도 추가 확인 필요 |
| F04 M5 | 폴더 연결 → 직접 참조/변경 감지 → 권한 만료/재연결 | 현 트리는 앱 내부 사본 import. no-copy 경로 없음 | 원격 folder gateway/catalog/import UI는 존재. copy import와 no-copy를 구분 |
| C01 M6 | 기기/클라우드 동기화 → 충돌 검토 → 선택 적용·실패 복구 | 현 트리 진입 없음 | 원격 `sheet_library_sync_review.dart`는 존재. review core를 네트워크 동기화 완료로 표시 금지 |
| C02 M6 | leader/follower·두 쪽 기기 표시 → 연결 끊김/재연결 | 현 트리 연결 서비스 없음 | 원격은 transport/사용자 진입까지 확인해야 상태 확정 |
| C03 M4/M5 | MIDI·companion/전송 → 곡/페이지/등록 연결 | 현 트리 MIDI/PC 전송 진입 없음 | 원격도 실제 지원 범위 조사 필요. 계정·장비 때문에 목록에서 제외하지 않는다 |

모든 행의 자동/기기 증거는 작업별 기록과 함께 갱신한다. 위 경로 존재만으로 end-to-end 동등성을 선언하지 않는다. 다음 기능 순서는 기준 소스 확정 후 실제 gap·자료 보존·운영비에 따라 정한다.

## 고유 정책과 튜너 기준

| ID | 작업·채택 방향 | 구현/검증과 남은 조건 |
| --- | --- | --- |
| X01 | PDF 외부 실행 차단, 내부 페이지 이동은 모드 정책 유지 | pdf_link_policy + pdfrx callback. 원본 수정 없는 차단과 URI annotation 제거 사본을 구분한다. 아래 보존 회귀 적용 중 |
| T01 T1/T2 | 음명/주파수/cents/기준 A·입력 강도·상태를 읽고 악보로 복귀 | 현재 tuner model/service/UI 연결. 실제 마이크 정확도 미검수. start/stop/dispose 지연 요청 수명은 양쪽 소스에서 조사할 대상 |
| T02 T1/T2 | 안정도와 반응 속도, 실제 시간축 pitch history | 감지/노이즈 gate/안정화·history 근거를 조사한다. 상태·curve를 꾸미거나 정지한 바늘로 정확해 보이게 만들지 않는다 |
| T03 T1/T2 | 기준음·단음/화음 드론 → 음량·정지·복원 | 현 트리 Dart/Android 구현, iOS native 등록 없음. 원격엔 iOS tone bridge 등록 있음. 기기 출력 검수와 bridge 존재 구분 |
| T04 | PCM 정답·detune/noise/harmonics/transitions로 자동 검증 | 현재 sine/noise tests에 더해 transport chunk·sample rate·세션 수명과 수치 benchmark 보강. 합성 검증은 기기 교정이 아님 |
| X02 | Studio PDF/Play 음원은 사용자가 선택해 독립 사본으로 연결 | 실제 파일 import/linked-file 경로 유지. private 경로 읽기·파일명 자동 작품 매칭 금지 |
| X03 | 진단·피드백은 사용자 통제, 연습 기록 opt-in 미활성 유지 | 일반 연습 기능처럼 내부 QA를 노출하거나 수집 기능을 몰래 활성화하지 않는다 |

TonalEnergy에서 채택할 것은 cents/입력/신호 상태·시간축·기준음의 작업 계약이다. 캐릭터·화면·모든 음률/악기 기능을 복제하지 않는다. 과거 chromatic-only 기록과 실제 target/preset/이조 구현의 차이는 기존 기능을 보존하며 기록한다. 새 악기 모드·연습 강제 제한·사용 기록 수집은 이번에 임의 확장하지 않는다.

## X01 원본 보존 acceptance와 결과

- red: sanitizer가 input=output/정규화 별칭/symlink에 원본을 덮어썼고 malformed alias는 catch cleanup이 원본을 삭제했다. 기존 다른 출력 파일도 교체/삭제했다. 실제 app store는 timestamp가 있는 새 경로를 생성하므로 일반 UI에서 이 alias가 발생했다고 주장하지 않는다.
- 변경: 기존 destination(링크/디렉터리 포함)을 거부하고, 이 요청이 만든 private staging에서 검증 후 사본을 옮긴다. catch는 임의 output을 삭제하지 않고 finally는 own staging만 정리한다. 외부 프로세스가 최종 확인과 rename 사이에 쓰는 경쟁이나 강제 종료를 포함한 전역 transaction 보장은 아니다.
- focused sanitizer/policy 18 PASS (`/private/tmp/score-link-safety-green-20261031.log`), red는 `score-link-safety-red-20261031.log`.
- mixed PDF integration 2 PASS (`/private/tmp/score-link-integration-20261031.log`): 8 URI 종류와 내부 GoTo가 있는 실제 PDF를 parser/엔진으로 읽어 viewer callback의 차단·내부 이동, URI 제거 후 GoTo/3쪽/원본 bytes 보존을 확인한다. 물리 터치·모든 PDF action 검수가 아니다. 테스트 최초 path-provider 실패는 cache 초기화 누락을 보완했다.
- 최초 전체 실행 689 tests PASS, 최종 별도 analyze PASS (`/private/tmp/score-link-safety-analyze-20261031.log`), metadata check PASS (`score-link-safety-metadata-20261031.log`, 같은 디렉터리). 최초 RC는 테스트의 불필요한 non-null assertion 경고로 exit 1이었고 이를 수정했다. 당시 전역 diff 공백 검사는 PASS였다. 최종 RC는 별도로 기록한다.
- 최종 RC exit 0, format/analyze·전체 689 tests·모든 scan PASS (`/private/tmp/score-link-safety-final-rc-20261031.log`). 과거 다른 작업 README 공백은 이번 실행에서는 나타나지 않았다. 해당 파일을 수정한 것은 아니다. 출시/기기 검증을 의미하지 않는다.
- 실제 pdfrx 2.4.7은 이 경로에서 onLinkTap callback에 URL/destination을 전달하고 앱이 처리한다. `pdf_document` URI annotation 제거가 PDF JavaScript/OpenAction/Launch 등 모든 객체를 삭제한다는 뜻이 아니다. 명시적 지원 링크와 비신뢰 PDF 링크를 구분한다.

## 다음 로컬 작업

1. 기준 소스 답변 전에도 양쪽에 동일하게 남은 tuner input의 지연 start/stop/dispose와 스트림 오류·재시작을 재현할 수 있다.
2. 소스 확정 후 중복된 기능을 다시 만들지 말고 기존 구현에 디자인/회귀를 연결한다.
3. 실제 PCM 정답 benchmark와 drone 생성/출력 소유권을 검증한다. 기존 debug/DSP 기반을 읽은 뒤 필요한 부분만 보강한다.
4. 고급 기능은 transport/권한/복구·실제 사용자 진입을 기준으로 상태를 정리한다. 계정·장비가 없는 동안에는 다른 로컬 경로를 계속 진행한다.
