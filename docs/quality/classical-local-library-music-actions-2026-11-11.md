# Play 대기열·즐겨찾기·IMSLP 이어하기

## 복구 기준

2026-11-11 사용자 요청으로 11-03 중단 범위를 재개했다. 지정 `/tmp/ddirori-play-library-context-20261031` 디렉터리는 소실됐지만 같은 브랜치·HEAD cb29d398의 Git index와 실행 기록이 남아 있었다. 등록된 경로를 복원하고 기록의 편집 패치252개·출력 패치 생성4개·format/fix99개를 순서대로 재적용했다. 당시 실패 후 수정한 패치는 같은 오류로 실패했으며, 다운로드 정리의 중괄호 보완1개는 이미 같은 형태여서 별도 검토했다. 복구 로그와 원문 이벤트는 앱 `build/recovery-20261111/`에 보관한다.

원본 저장소의 별도 제품 작업에는 적용하거나 덮어쓰지 않았다. 복구 도중 드러난 설정 메서드 중복은 현재 코드 검토와 회귀 대상으로 삼는다. 소실된 과거 PNG·실행 로그·archive를 복구했다고 주장하지 않는다. 기존 품질 문서는 역사적 기록이며 이번 통과 증거는 새 실행에서만 만든다.

검색 oracle JSON은 현재 검색 구현으로 새 기대값을 만든 것이 아니다. 기존 Git 소스에 최적화 전 기록된 표시 정책 패치를 적용한 독립 baseline과 당시20질의 fixture로 복구했다. baseline/생성 도구는 build/recovery에 보존하고 임시 lib/tool 파일은 제거했다. 복구한 oracle로 검색11테스트가 통과했다. EXIF orientation6 자체 제작 JPEG fixture도 당시20x10 합성 이미지 생성 절차로 다시 생성했다.

## 범위와 수용 조건

| 영역 | 완료 조건 | 현재 증거 |
| --- | --- | --- |
| 실제 대기열 편집 | 미래 occurrence만 편집, 현재/position/paused·셔플·반복·시스템 일치 | 통과: host 경합/실패 회귀·실제 native 큐 편집2건 |
| 저장·즐겨찾기 | file ID·schema18·백업/구버전·삭제/초기화/재연결과 화면 동기화 | 통과: SQLite/backup/UI 및 native 종료·재시작 통합 |
| IMSLP | 독립 검색→공식 페이지→사용자 파일 가져오기→확인/재생·출처 확인 | 통과: fixture 검색/선택·실제 가져오기/SQLite/native 재생. 외부 페이지·제공자 UI는 별도 |
| 다운로드 복구 | 권리·형식·단계·취소·실패·journal 중단·중복 복구 | 통과: fake/loopback·filesystem·손상/재시작 회귀. 실제 사이트 다운로드 검증 아님 |
| 반응형·접근성 | 실제 Flutter 크기/테마/글자·busy/error·캡처 | 통과: widget12조합·새 캡처. 실제 VoiceOver 발화/사용성은 미검수 |
| 회귀·native·metadata | source 동일 최종 QA·새 iOS 증거·문서/YAML | 통과: 최종 runner15검사·앱706개·고유 native11개·metadata13검사 |

기존 내부0.1.0(4)는 새 기능을 포함하지 않는다. 커밋·푸시·버전 증가·archive·업로드는 하지 않는다. 실제 Xs 청감·VoiceOver·Files/iCloud·Bluetooth·전화 검수는 사용자 영역으로 남긴다.

## 구현과 보존 계약

- `PlaybackQueueEditor`는 선택적 contract다. 기존 controller 소비처를 유지하며 fake·직렬화 wrapper·just_audio adapter가 같은 미래 항목 정책을 사용한다. `moveQueueItem(from,to)`의 to는 이동 후 최종 인덱스다. 실제 source insert/remove/move를 사용하고 정상 편집에서 전체 큐를 재로드하지 않는다.
- 현재/과거 occurrence는 보호한다. 예약과 미래 편집은 현재 곡·position·일시정지를 유지한다. 빈 큐 추가는 ready, completed 큐 추가는 첫 새 항목 ready이며 자동 재생하지 않는다. 셔플 중 바로 다음 예약은 실제 다음에 넣되 canonical 원본 끝에 추가한다. 셔플 off는 원본+추가 순서를 복원하고 셔플 off의 수동 이동은 canonical 순서에도 반영한다. 저장된 재생목록은 수정하지 않는다.
- source 부분 실패로 native 순서를 확신할 수 없으면 실제 플레이어를 정지하고 명시적 재로드가 필요한 오류를 유지한다. 단순 stop도 native 자원을 해제하되 확정되지 않은 큐를 정상으로 꾸미지 않는다. 실제 추가 수와 제외/실패를 구분한다. 늦은 seek·편집·자연 전환·큐 교체·dispose와 시스템 조작은 같은 직렬화/선택 경계로 처리한다.
- additive schema18의 즐겨찾기는 file ID이며 경로가 아니다. 누락/재연결 때 유지하고 명시적 제거/초기화에서 정리한다. 스캔 저장의 delete/reinsert는 deferred FK transaction 안에서 기존 ID를 보존한 뒤 orphan을 제거한다. 논리 백업은 즐겨찾기를 포함하고 구버전 백업은 빈 집합으로 읽되 additive 복원에서 기존 즐겨찾기를 지우지 않는다. UI는 실제 저장 성공 뒤 확정하며 복원/초기화 전 대기 저장을 drain하고 재조회한다.
- 곡·검색·재생목록·현재 재생과 보관함 즐겨찾기에서 같은 상태를 사용한다. current file ID가 없으면 즐겨찾기 조작을 노출하지 않는다. 저장 실패·새로고침 실패·재시도·늦은 완료를 구분한다. 혼합 파일/클래식 큐의 재시작 복원에서 어느 한 종류를 버리지 않으며 중복 occurrence와 모드를 복원하고 자동 재생하지 않는다.
- IMSLP는 작품 없는 보관함에서 검색 → 공식 페이지 확인 → 사용자가 Files에 저장 → 실제 가져오기 → 가져온 곡 보기/명시적 재생으로 연결한다. `ImslpLocalImportResult`는 실제 등록 ID와 안전한 파일명 표시만 전달한다. 가져오기/페이지 열기는 출처 연결이나 권리 확인 완료가 아니며 대상 페이지와 가져온 파일을 사용자가 별도 확인해야 출처를 저장한다. 가짜 Work/Recording은 만들지 않는다.
- 직접 URL 고급 경로는 공통 Ddirori dialog·busy·실패 draft 보존을 사용한다. rename 전 journal을 저장하고 checksum·형식·경로를 검사한다. 다운로드 후 scanner/store 실패와 재시작은 관리 파일을 재사용해 등록을 재시도한다. 손상 journal·symlink·경로 이탈은 실패 근거를 보존하며 PDF/MIDI를 곡으로 등록하지 않는다. 공간 부족·취소·중복·다운로드/검증/등록 단계를 구분한다.
- 공통 UI 소스/API, 의존성, 권한, 원본 음원·태그는 추가/변경하지 않았다. 기존 중립/의미색과 Play adapter를 조합하고 새 하단 탭을 만들지 않았다.

## 최종 검증에서 보완한 결함

첫 native 실행은 assertion 실패를 그대로 기록했다. 최종 통과를 위해 assertion을 제거하거나 과거 이미지를 재사용하지 않는다.

- 첫 큐/알림 노출로 `PlayPlaybackLayout`의 트리 형태가 바뀌면 IMSLP 화면이 다시 만들어져 검색어와 가져오기 결과를 잃었다. Stateful layout의 안정된 keyed page로 상태를 보존하며 좁은/넓은 화면 회귀를 추가했다. 넓은 재생 영역은 독립 route에서도 Slider가 사용할 Material을 제공한다.
- 기존 재생목록 완료 SnackBar가 재생 상세 진입 버튼을 덮던 경우는 새 음악 작업의 inline 안내로 전환할 때 이전 SnackBar와 큰 글자용 별도 OverlayEntry를 모두 정리했다. 재생목록 생성 피드백 자체는 유지하고 기존 테스트는 실제 상세 제목까지 확인한다. 320px/200%에서 완료 안내가 실제로 보인 뒤 즐겨찾기 변경으로 교체되고 미니플레이어를 터치할 수 있는지 검사한다.
- 내부 Scaffold 밖 IMSLP 알림도 Material을 제공해 테마 본문 스타일을 상속한다. MaterialApp 오류 글꼴의 빨간 글씨/노란 밑줄이 나타나지 않도록 실제 Material 조상과 테마 스타일을 회귀로 확인한다.
- completed 뒤 play의 native 상태는 명령 Future 직후 loading일 수 있다. 시스템 테스트는 실제 playing 이벤트를 제한 시간 안에 기다린 뒤 같은 강한 상태/시스템 정보를 검사한다.
- 독립 screenshot scene은 새 fixture로 시작한다. 이전 분류/IMSLP 방문의 보관함 스크롤 보존을 새 scene의 초기 위치로 오인하지 않는다. UI 통합 helper는 현재 hit-test 가능한 세로 목록을 탐색하고 화면 전환을 기다린다.

## 외부 자료 확인과 검증 경계

2026-11-11 [IMSLP API](https://imslp.org/wiki/IMSLP:API), [Membership Q&A](https://imslp.org/wiki/IMSLP:Membership_Q%26A), [Public domain](https://imslp.org/wiki/Public_domain)을 확인했다. 문서화된 사람/작품 API를 음원 파일 API로 취급하지 않는다. 자동 파일 URL 수집·지역/회원 제한 우회·저작권 자동 판단은 구현하지 않는다. URL 입력만으로 이용 권리를 확정하지 않는다.

host decoder PCM 검사는 OS 출력 녹음/스피커 청감이 아니다. widget 캡처는 실제 Flutter 제품 위젯과 fake controller이고 native 검사는 실제 just_audio·SQLite를 사용한다. IMSLP 검색/파일 선택은 fixture 주입이며 실제 사이트/Files 제공자 UI가 아니다. 시스템 명령 검사는 native 명령 경계와 상태 정보 검증이지 물리 잠금 화면 버튼의 가청 검증이 아니다. 전용 iOS 시뮬레이터의 OS 앱 전환 증거와 iPhone Xs 검수는 구분한다.

## 실행 방법과 화면 검수

작업 트리 앱에서 아래 runner를 실행했다. 단계별 로그와 해시는 runner가 생성하며 문서에 통과값을 수동 입력해 runner 판정을 바꾸지 않는다. metadata 검사는 별도 deployment 디렉터리에서 실행한다.

```sh
dart format lib test integration_test tool
dart run tool/run_local_qa.dart --library-ux --captures \
  --simulator 38B3F034-2212-4566-B09B-AC5DFEEB1187 \
  --output build/music_actions_qa_20261111

cd ../../deployment
bundle exec ruby -Ilib test/ios_metadata_test.rb
bundle exec fastlane prepare_ios_metadata \
  manifest:apps/classical-local-library/ios-metadata.yaml mode:check
git diff --check
```

2026-11-11 새 `run-MSxfZk`의 실제 PNG를 열어 검수했다. 대기열 미래 메뉴·현재 항목 표시, 즐겨찾기 검색/행/미니플레이어, IMSLP 검색과 수동 가져오기 안내 각3장(390px/1x/light, 320px/2x/light, 1024px/2x/dark) 및 native 생성 완료·재생목록 상세·검색3장이다. 한글/Material glyph, 긴 제목 줄바꿈, 공통 색/disabled/선택 상태와 조작 접근을 확인했다. 대기열 메뉴 캡처는 스크롤한 위치이며 전체 화면 첫 위치의 증거가 아니다. 저장/오디오 성공은 픽셀만으로 판정하지 않고 실제 assertion/SQLite/engine 상태를 함께 사용한다.

12가지 viewport/글자/테마 조합과 2x reduced motion을 widget 회귀로 검사한다. 한국어 tooltip/공통 컨트롤의 접근성 마크업과 키보드 입력 경로 검사는 실제 VoiceOver 낭독·읽기 순서·포커스 사용성 검증을 대신하지 않는다. 이미지에는 개인 음원이 없으며 합성 음원/fictional metadata만 사용했다. 촬영일·목적과 해시가 있는 QA 이미지이지 App Store 승인 screenshot이 아니다.

## 최종 결과와 인계

최종 새 실행은 [runner report](evidence/play-music-actions-20261111/report.json)의 `run-MSxfZk`다. 모든15검사가 exit0/passed이며 앞뒤 source fingerprint와 별도 live 재검산이 `ea6efac895a795f86b432d7f476d725f757994608dfca7e7e6e912f6b09c4ea8`로 일치한다. [파일별 소스 해시](evidence/play-music-actions-20261111/source-files.json), [산출물 해시](evidence/play-music-actions-20261111/files.sha256.json), [handoff](evidence/play-music-actions-20261111/handoff.json)를 보존했다. 첫 실패 report/native 로그도 diagnostics에 그대로 남겨 최종 통과와 구분했다.

| 최종 명령/범위 | 실제 결과 |
| --- | --- |
| `dart format lib test integration_test tool` | 172파일, 변경0 |
| `flutter test --no-pub --reporter expanded` | 706개 통과. capture 재실행79개를 더하지 않음 |
| `flutter analyze` | No issues found |
| fixture check·decoder signal | 통과. decoder PCM 신호 검사는 가청 출력 증거가 아님 |
| 5,000/20,000곡 보관함·검색 host benchmark | 통과. 실기기 성능으로 승격하지 않음 |
| 실제 Flutter widget 캡처 | 새57장, 추가 native3장. 예상60장 모두 생성·PNG 구조/hash 확인 |
| iOS native 보관함/생성/검색 | 1개 통과·새3장 캡처 |
| native 시스템 미디어·scene·검색·셔플/반복 | 고유5개 통과 |
| native 큐 편집/완료 후 추가·IMSLP→가져오기→즐겨찾기/큐 재시작 | 고유3개 통과 |
| native background runner | 고유2개 통과·실제 OS 앱 전환·위치 저장·마지막 완료 |
| metadata 단위 검사 | 13 runs / 40 assertions / failures0 / errors0 |
| `prepare_ios_metadata mode:check` | exit0. YAML pending/reviewed false, 기존0.1.0(4)/Apple build ID 보존 |
| `git diff --check`, TODO/FIXME/Flutter Demo/Counter 소스 잔여 검색 | diff 오류/검색 결과 없음 |

환경: Flutter3.47.2/Dart3.13.2, Xcode26.5(17F42), iPhone17 Pro iOS26.5의 전용 `DDIRORI-QA-Play-20261023`. 실제 OS 전환 뒤 index0→3, 완료 index12, position 저장과 rate1.0을 [background report](evidence/play-music-actions-20261111/background/result.json)에서 확인했다. 시스템/저장/복원 assertion과 iOS build 결과가 통과했으나 소리를 녹음/청취한 것은 아니다.

필수 로컬 구현·검증·문서/YAML 인계는 완료했다. 작업 위치는 `/tmp/ddirori-play-library-context-20261031`, 브랜치는 `feature/ddirori-play-library-context-20261031`, 실제 HEAD는 `cb29d398321d3b1ac84e4ce90d619e3da7af574b`이며 **미커밋·미배포**다. 기존 다른 변경과 원본 저장소는 유지했다. 디자인/공통 API의 기존 변경은 복구·보존한 선행 작업이며 이번 큐/즐겨찾기/IMSLP 목표에서 새 공통 API나 의존성을 추가하지 않았다.

임시 폴더 재소실에 대비해 `/Users/jaemankim/Desktop/privates/coding/worktrees/ddirori-play-snapshots/20261111/play-worktree-final.tar.gz`와 같은 폴더의 `snapshot.json`에 내구성 checkpoint를 남긴다. 실제 HEAD 대비 tracked binary diff, untracked/변경 파일의 내용·SHA-256, 이번 증거와 recovery 로그를 포함한다. 빌드/사용자 음원/자격 증명/.git은 포함하지 않는다. 별도 깨끗한 worktree를 baseCommit에서 만든 뒤 patch/files를 복원하며 기존 dirty worktree에 덮어쓰지 않는다. archive와 파일별 hash를 다시 검사한다.

## 남은 사용자 검수와 한계

- [Xs 사용자 점검표](classical-local-library-physical-device-checklist.md)의 새 후보5~10분 경로: 실제 Files/iCloud·출력/청감·VoiceOver·Bluetooth/유선·전화/interruption·대형 개인 보관함. 기존 TestFlight4에서 이번 기능을 확인할 수는 없다.
- 공식 페이지/제공자 UI와 실제 자료 권리·지역·회원 조건은 사용자가 확인한다. 자동 파일 URL 추출/제한 우회·새 스트리밍·자동 곡 식별은 구현하지 않았다.
- native 부분 큐 편집 실패는 명시적 큐 재로드가 필요하다. 다운로드 후 등록 실패는 journal 복구로 재다운로드 없이 재시도한다. 손상 journal을 정상 자료로 추정하지 않는다.
- 이번 증거는 공개 출시·metadata pinning·새 빌드 승인/업로드를 의미하지 않는다. 버전/Apple 빌드·기존 내부 테스터 상태를 변경하지 않았다.
