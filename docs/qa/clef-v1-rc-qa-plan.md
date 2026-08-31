# Clef v1 RC QA Plan

작성일: 2026-08-27

## 목적

실기기 없이 준비 가능한 RC QA 자료를 먼저 고정한다. 주말 실기기 테스트에서는 이 문서를
실행 순서대로 따라가며 결과만 기록한다. 이번 RC 준비는 새 기능 추가가 아니라, 연주 중
헷갈리지 않고 metadata가 안전하게 보존되는지 확인하는 데 집중한다.

## 준비물

- 설치 파일: Android debug/release APK, 가능하면 iPad용 TestFlight 또는 local iOS build.
- 당일 실행표: [`clef-v1-device-qa-runbook.md`](clef-v1-device-qa-runbook.md).
- 에뮬레이터 사전 검증표: [`clef-v1-emulator-qa-tracker.md`](clef-v1-emulator-qa-tracker.md).
- 기기: Android 태블릿, iPad, hardware keyboard, Bluetooth 페달.
- 파일:
  - 텍스트가 추출되는 일반 PDF 악보 1개.
  - 스캔 PDF 또는 이미지 기반 PDF 1개.
  - 50쪽 이상 큰 PDF 1개.
  - JPG 또는 PNG 이미지 악보 2-3장.
  - 가능하면 HEIC/HEIF 이미지 1장.
  - Drive, iCloud, Dropbox 같은 cloud file provider에 있는 PDF 1개.
  - URL link가 들어 있는 PDF 1개.
- synthetic metadata fixture:
  - Dart fixture: `apps/in_c_sheet/test/fixtures/rc_qa_fixture.dart`.
  - 회귀 테스트: `apps/in_c_sheet/test/rc_qa_fixture_test.dart`.
  - 실제 저작권 악보 파일은 포함하지 않는다.
- synthetic PDF fixture:
  - `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf`: 3-page score-like PDF.
  - `apps/in_c_sheet/test-fixtures/pdfs/link-annotation-score.pdf`: page 1 URL link annotation fixture.
  - `apps/in_c_sheet/test-fixtures/pdfs/long-scan-like-score.pdf`: 90-page scan-like stress fixture.
  - 이미지-only scan PDF는 테스트 안에서 임시 생성해 OCR unsupported manifest를 검증한다.

## 실행 순서

| 순서 | 영역 | 통과 기준 | 기록할 항목 |
| --- | --- | --- | --- |
| 1 | 설치/첫 실행 | 앱이 crash 없이 열리고 테스트 정보가 표시된다. | 설치 방식, 앱 버전/build, 기기/OS |
| 2 | Import | PDF, JPG/PNG 변환 PDF가 라이브러리에 등록되고 원본 이미지 viewer가 열린다. | 파일 유형, 페이지 수, 파일 크기, 원본 이미지 표시 여부 |
| 3 | 라이브러리 | 검색/정렬/필터, 즐겨찾기/고정, collection/group/rating/custom field가 유지된다. | 찾지 못한 필터 조건, 정렬 이상 여부 |
| 3-1 | 라이브러리 전환 | 기본/추가 라이브러리를 전환하고 이름 변경/비우기가 파일 삭제 없이 동작한다. | 변경한 library profile, 전환 전후 악보 수 |
| 4 | 뷰어 기본 | 페이지가 blank 없이 렌더링되고 보기 모드/scale/crop/render profile/반 페이지 정책이 전환된다. | PDF 유형, blank 발생 page, render profile, portrait/landscape half-page anchor, 재현 여부 |
| 5 | 페이지 관리 | 숨김, duplicate, virtual order, page crop 요약이 이해된다. | UI 문구 혼동 여부, 원본 PDF 불변 안내 위치 |
| 5-1 | 페이지 적용 사본 | crop/rotation/page arrangement 적용 사본 생성 후 원본 링크와 새 page metadata가 보존된다. Duplicate instance별 crop/rotation override는 출력 page metadata로 재배치된다. | 적용 전후 page 수, 연결 파일 label, bookmark/annotation page, instance crop/rotation |
| 6 | PDF 본문 검색 | 텍스트 PDF는 결과 이동/이전/다음/clear가 동작한다. | 검색어, 결과 수, 이동 page |
| 7 | 스캔 PDF 검색 | crash 없이 결과 없음 또는 unsupported 안내가 표시된다. | 표시 문구, OCR 기대 혼동 여부 |
| 8 | 필기/주석 | pen/highlighter/text/shape/stamp, undo/redo, layer 표시/숨김, PDF 공유 포함/제외, 저장 복원이 유지된다. | stroke 수, S Pen pressure 폭 변화, layer 표시 상태, export 포함 여부, 저장 실패 문구, 복원 여부 |
| 9 | 큰 annotation | 공유/백업 전 annotation 요약 안내가 표시된다. | stroke/text/point 요약, 파일 크기 |
| 10 | 세트리스트 | 복제, 곡별 시작 page, memo, duration, 총 시간이 보존된다. | 전환 시간, 총 예상 시간, 겹침 여부 |
| 11 | 공연/리허설 | 공연 잠금 상태와 허용 action 표시, BPM 기반 자동 스크롤 preset/page duration/cue point/pause marker/반복 구간/자동 다음 곡 진행이 실제 제한과 맞는다. | 잠금 상태, 허용/차단된 action, BPM/preset/duration, page별 duration, cue point, pause page, 반복 구간, 다음 곡 전환 |
| 11-1 | 공연 preset | 세트리스트별 보기 preset을 켜면 세트리스트로 연 곡에만 override가 적용되고, 곡별 설정은 보존된다. 공연 preset template을 생성, 적용, 삭제해도 우선순위가 유지된다. | override 항목, 일반 열기/세트리스트 열기 차이, template 이름/장비 profile, 복제 setlist 동작 |
| 12 | 페달/키보드 | predefined/custom/unknown inputId mapping이 page/score/quick action/no-op에 맞게 동작한다. Arrow/Page/Space/Enter/Tab/Media 입력은 PDF 내부 스크롤이 아니라 페이지 단위 이동으로 소비된다. 곡 처음/끝에서 반대 방향 입력 시 `곡 처음`/`곡 끝` 안내가 표시된다. | 장비명, 입력 key, action, 실패 key, 경계 안내 문구 |
| 12-1 | 전역 입력 기본값 | 전역 보기/입력 기본값을 바꾼 뒤 새로 가져온 악보에 mapping이 적용된다. | 변경한 기본값, 새 악보 viewer/action 설정, 기존 악보 불변 여부 |
| 13 | 입력 진단 | viewer 입력 진단에서 logical/physical key, input id, mapped action이 복사되고 unknown key를 직접 설정으로 보낼 수 있다. | diagnostic log, unknown key 여부, 저장한 action |
| 14 | 튜너 | Chromatic/Target mode, Guitar/Bass/Ukulele/Mandolin/Strings/Bb/Eb/F preset, custom target/preset 저장/적용/삭제, target lock, sharp/flat 표기, LED/cents/input bar, A4 quick/history/보정 제안, `소리가 너무 작습니다`/`타겟 음을 기다리는 중`/`조금 낮아요`/`조금 높아요`/`맞았습니다` feedback이 자연스럽다. | 입력음, preset, custom preset 이름, target, target lock on/off, 표시 note, sharp/flat 표기, cents 흔들림, 입력 bar, LED 상태, feedback 문구 |
| 14-1 | 기준음/드론 | Android에서 기준음/5도/옥타브 drone이 재생/정지되고 A4 기준 변경이 주파수에 반영된다. | root note, drone mode, volume, latency/끊김, iOS 표시 문구 |
| 14-2 | 로컬 오디오 | MP3/M4A/WAV linked file이 가져와지고 파트/버전 sheet에서 재생/정지된다. | 파일 확장자, codec 실패 여부, latency/끊김, iOS 표시 문구 |
| 15 | 백업/복원 | metadata/full backup과 자동 metadata snapshot 후 새 metadata가 보존/복원된다. | custom field, custom pedal, page crop, score duration, setlist preset override, performance preset template, annotation storage, active library profile 보존 여부 |
| 15-0 | 자동 백업 복원 | 백업 메뉴의 자동 metadata 복원이 파일 picker 없이 active library profile의 최신 snapshot으로 되돌린다. | 복원 전후 악보 수, 활성 library profile, PDF filePath 접근 여부 |
| 15-1 | Cloud import | cloud provider PDF가 system picker에서 앱 내부 사본으로 등록된다. | provider, 내려받기 필요 여부, 실패 문구 |
| 16 | 테스트 정보 | 테스트 정보에서 library/debug summary와 피드백 템플릿 복사가 동작한다. | score/setlist/annotation summary, sample file 공유 가능 여부, screenshot/screen recording 여부, blocker 여부 |
| 17 | 종료/재진입 | 마지막 page/view state와 최근/즐겨찾기/고정 접근이 유지된다. | 재진입 score, 마지막 page, half-page boundary 이동 후 저장 page, 보기 설정 |

## 기기별 필수 확인

| 대상 | 필수 확인 | 실기기 없을 때 상태 |
| --- | --- | --- |
| Android 태블릿 | 큰 PDF 렌더링, immersive mode, keep-awake 안내, Bluetooth 페달 | 미확인으로 남김 |
| iPad | 화면 회전, 2페이지 보기, TestFlight 설치, iOS share/import | 미확인으로 남김 |
| Hardware keyboard | Arrow, PageUp/PageDown, Space, Shift+Space, Enter, Tab이 페이지 단위로 이동하고 PDF가 찔끔 스크롤되지 않는지 확인 | simulator/desktop에서 일부 확인 가능 |
| Bluetooth 페달 | 실제 장비가 보내는 key와 predefined dropdown mapping 일치 | 장비명/key 기록 필요 |

## 이슈 기록 템플릿

```text
제목:
심각도: blocker / high / medium / low
기기:
OS:
설치 방식:
앱 버전/build:
파일 유형:
파일 크기/페이지 수:
테스트 영역:
샘플 파일 공유 가능 여부:
어색한 한글 문구/표시:
재현 단계:
기대 결과:
실제 결과:
표시 문구:
스크린샷/화면녹화:
콘솔/diagnostic log:
재현율:
blocker 여부:
v1.1 spike 여부:
첨부:
```

## Triage 기준

- blocker: 앱 crash, data loss, import/export 불가, 공연 중 page turn 불가, 백업/복원 실패.
- high: 주요 기능은 가능하지만 반복 재현되는 UX/성능/입력 문제.
- medium: workaround가 있는 혼동, 오류 문구, 특정 PDF/provider 문제.
- low: copy polish, edge-case 표시 문제.
- v1.1 spike: OCR, HEIC native conversion, PDF standard annotation embed, HID capture wizard,
  SAF/iOS Files direct folder, iOS Share Extension, font embedding, cloud sync, page별 live rotation.

## Known Issues

- 2026-08-28 기준 로컬 Homebrew Flutter/Dart SDK 검증은 통과했다. 이후 SDK/PATH가 바뀌면
  아래 정적 검증 기록을 다시 갱신한다.
- Android 태블릿의 IMSLP PDF 렌더링, 페이지 이동, 마지막 페이지 저장은 2026-08-30 1차 QA에서
  확인했다. S Pen, Bluetooth/USB 페달, cloud provider, CamScanner link annotation, audio latency,
  iPad smoke는 별도 실기기/샘플 QA가 필요하다.
- 튜너의 sine/noise/time-series synthetic test는 통과했다. Chromatic/Target mode, 악기별 preset,
  custom target/preset 저장, target lock, sharp/flat 표기, target cents, LED/input power 상태,
  A4 quick/history/보정 제안, adaptive noise floor 1차, feedback damping/hold는 자동 테스트로
  검증했다. 실제 악기/기기 마이크 기준 정확도, latency,
  외부 마이크 안정성은 Android/iOS 실기기 QA에서 판단한다.
- 스캔 PDF와 이미지 기반 PDF는 OCR을 지원하지 않으므로 PDF 본문 검색 결과가 없을 수 있다.
  검색 UI는 embedded text 전용 helper와 OCR unsupported 안내를 사용한다.
- HEIC/HEIF 이미지는 바로 PDF로 가져오지 않는다. iOS 사진 앱에서 JPG로 저장한 뒤 가져온다.
- Drive/iCloud/Dropbox는 별도 계정 연동이 아니라 system file picker/provider를 사용한다. provider
  파일 접근 실패 시 기기에 내려받은 뒤 다시 가져온다.
- Bluetooth 페달은 v1에서 predefined/custom input dropdown 방식이다. 입력 진단에서 unknown inputId를
  직접 설정으로 전달할 수 있지만, 실제 HID key capture wizard는 지원하지 않는다. 방향키 방식
  페달은 MobileSheets처럼 위/왼쪽을 이전 page, 아래/오른쪽을 다음 page로 소비한다.
- 공연 모드 keep-awake, 밝기 유지, immersive system UI는 플랫폼 제약이 있을 수 있다.
- 기준음/드론 재생은 Android native `AudioTrack` 채널 기준이고 로컬 오디오는 Android
  `MediaPlayer` 채널 기준이다. iOS에서는 playback channel parity가 아직 필요하다.
- annotation은 v1에서 SharedPreferences 기반 score metadata에 저장된다. 기본 필기 layer의
  표시/숨김과 PDF 공유 포함/제외 flag는 구현되어 있으며, file-backed store adapter와 external ref
  metadata는 v1.1 준비 단계다. 기존 inline metadata를 강제 migration하지 않는다.
- 필기 포함 PDF 공유는 표준 PDF annotation embed가 아니라 렌더링된 사본 생성 방식이다. PDF 공유
  제외 flag가 꺼진 layer는 앱 안 필기를 보존하되 export 사본에는 포함하지 않는다. 표준 annotation
  export mode는 코드상 unsupported result로 분리되어 있고 실제 파일 생성은 하지 않는다.
- crop, rotation, page hide, virtual order는 기본적으로 원본 PDF를 수정하지 않고 앱 metadata/viewer
  표시로 처리한다. 사용자가 적용 사본 생성을 명시적으로 실행한 경우에는 앱 내부 PDF 사본만 새로
  만들고, 원본 PDF는 연결 파일 metadata로 보존한다.
- URL link sanitizer는 synthetic link annotation PDF에서 URL link 제거, 원본 보존, page count 재검증을
  확인했고, 비PDF/손상 PDF를 거부하고 partial output을 정리한다. 실제 CamScanner object stream/compact
  rewrite 검증은 샘플 확보 전까지 blocker다.
- 여러 라이브러리는 별도 계정/폴더 권한이 아니라 앱 내부 library profile별 metadata 저장소
  분리다. 라이브러리 비우기는 앱 metadata만 제거하며, PDF 파일 삭제 QA는 별도 destructive
  테스트로 분리한다.
- 자동 스크롤 pause marker, 반복 구간, page별 duration weight, cue point는 page 기반 1차
  구현이다. start/end 범위 밖 page duration과 cue point는 timeline에서 제외한다. 실제 measure 위치
  자동 감지는 포함하지 않는다.
- 자동 DB 백업은 active library profile별 metadata-only snapshot이다. PDF bytes, 외부 원본 파일,
  OS background scheduled backup은 포함하지 않으며 전체 파일 복구는 PDF 포함 ZIP 백업으로 확인한다.

## V1 Blockers

상세 문제 정의와 acceptance criteria는
[`../product/clef-v1-1-spike-backlog.md`](../product/clef-v1-1-spike-backlog.md)에 분리한다.

| 항목 | 막힌 이유 | 준비된 상태 | 해제 조건 |
| --- | --- | --- | --- |
| OCR 기반 PDF 본문 검색 | OCR engine, native bridge, scan fixture 정확도 검증이 필요하다. | embedded text search UI, OCR unsupported 안내, search index manifest/capability model, 이미지-only synthetic fixture의 unsupported manifest test가 있다. | ML Kit/Tesseract/platform bridge 결정, 스캔 PDF fixture recall/latency QA |
| HEIC/HEIF 직접 변환 | Flutter/Dart 순수 경로에서 HEIC decoder가 없고 platform decoder 선택이 필요하다. | HEIC/HEIF 감지와 JPG 변환 안내가 있다. | Android/iOS decoder dependency 또는 native bridge 결정, 실제 사진 샘플 QA |
| iOS Share Extension | Xcode target, App Group, provisioning 설정이 필요하다. | iOS document open URL bridge는 구현했다. | Apple 계정/provisioning과 extension target 구성 |
| Android 기존 폴더 직접 참조 | SAF persistent URI permission과 tree scan 정책을 실기기에서 검증해야 한다. | 앱 내부 사본 저장, 연결 파일, 전체 ZIP 백업은 구현했다. | Android 태블릿에서 folder picker/권한 상실/재스캔 QA |
| Cloud provider 실패 검증 | Drive/iCloud/Dropbox 계정과 provider별 offline placeholder 동작이 필요하다. | system file picker 우선 정책과 내려받기 안내가 있다. | provider별 실기기 import 실패/성공 기록 |
| CamScanner/malformed PDF link 제거 검증 | 실제 CamScanner류 PDF 샘플과 compact rewrite 비교가 필요하다. | 비PDF/손상 PDF 실패 안전장치, URL link 제거 후 page count 재검증, partial output cleanup 테스트가 있다. | 실제 샘플에서 URL link count, file size, object stream 잔존 여부 기록 |
| S Pen pressure/palm rejection | 스타일러스 hardware와 Android pointer classification 동작이 필요하다. | pressure metadata/render/export 경로와 stylus 직후 touch rejection window는 구현했다. platform gesture tuning은 실기기 검증이 필요하다. | Galaxy Tab + S Pen으로 pressure/palm 입력 로그 확인 |
| PDF 표준 annotation embed/export | 현재 PDF writer 경로에서 편집 가능한 Ink/Text annotation object 생성 API가 확인되지 않는다. | rendered stamp fallback과 standard mode unsupported result/test가 있다. | PDF writer API 선택, 표준 annotation fixture와 Acrobat/Preview/MobileSheets 호환 QA |
| 한글/비라틴 PDF font embedding | 배포 가능한 폰트 asset/license와 PDF embedding 경로가 필요하다. | 비ASCII text export 안내/fallback, mixed ASCII/한글 annotation에서 한글만 skip하고 PDF 사본을 쓰는 test, export 포함/제외 layer flag가 있다. | 폰트 asset 결정과 한글 텍스트 export fixture 검증 |
| USB/Bluetooth 페달 실장비 검증 | 실제 장비가 보내는 HID key가 제조사별로 다르고 앱 foreground focus 영향이 있다. | key mapping resolver, custom dropdown, input diagnostic log, unknown inputId mapping 실행 경로가 있다. | 페달 모델별 logical/physical key와 action 결과 기록 |
| 저지연 메트로놈 audio/player/iOS playback parity | audio session, latency, sound asset, background 정책 검증이 필요하다. | Android native 기준음/드론, Android local audio player, visual metronome, BPM preset, local linked file metadata는 있다. | audio package/asset 결정, iOS playback bridge, Android/iOS latency QA |

## v1.1 후보

상세 backlog는 [`../product/clef-v1-1-spike-backlog.md`](../product/clef-v1-1-spike-backlog.md)를
source of truth로 둔다.

- OCR engine 기반 PDF 본문 검색.
- HEIC/HEIF 직접 변환.
- 기존 폴더 직접 참조(Android SAF/iOS Files) spike.
- iOS Share Extension.
- PDF 표준 annotation embed/export 고도화.
- 한글/비라틴 PDF font embedding.
- SQLite-backed annotation store 또는 inline-to-external migration.
- 다중 annotation layer와 annotation별 layer keying.
- 실제 HID key capture wizard 기반 페달 설정.
- 저지연 metronome/audio/iOS playback parity.
- Page별 live rotation rendering과 overlay/link/search coordinate regression.
- Cloud sync/account/server 저장과 OS background scheduler 기반 주기적 전체 백업은 v1.1 또는 Later
  scope 결정 spike로 유지.

## 릴리즈 노트 초안

### 내부 개발용

Clef v1 RC는 악보 import, 라이브러리 관리, 세트리스트, PDF viewer, 주석, 공연 모드, 자동
스크롤, 메트로놈, 튜너, PDF link safety, 백업/복원을 포함한다. 이번 RC에서는 page
scaling/crop/page order/rehearsal mark/part management/custom pedal mapping/PDF body
search/annotation guard/setlist duration/library profile 분리/자동 metadata snapshot 같은 연주 현장
기능을 metadata 중심으로 안정화했다. 또한 crop/rotation/page arrangement는 원본 보존형 앱 내부 PDF
적용 사본을 만들 수 있다.

### 외부 테스터용

Clef v1 RC는 연주자가 PDF 악보를 가져와 정리하고, 공연 중 빠르게 넘기고, 필요한 표시를
남기고, 세트리스트로 이어 연주할 수 있게 만든 테스트 버전이다. 원본 PDF는 기본적으로 수정하지 않고
앱 안의 보기 설정과 metadata로 관리하며, 필요할 때는 앱 내부 적용 사본을 따로 만든다. 스캔 PDF의 OCR 검색, 실제 페달 key 자동 캡처,
클라우드 동기화는 이번 RC 범위에 포함되지 않는다.

## 정적 검증 기록

주말 QA 전 로컬에서 아래 순서로 갱신한다.

```sh
cd apps/in_c_sheet
dart format lib test
flutter analyze
flutter test
```

SDK가 PATH에 없으면 아래 대체 검증을 실행하고 결과를 기록한다.

```sh
git diff --check
rg -n "[[:blank:]]$" apps/in_c_sheet/lib apps/in_c_sheet/test docs/qa docs/architecture
rg -n "\t" apps/in_c_sheet/lib apps/in_c_sheet/test docs/qa docs/architecture
rg -n "TODO|FIXME|debugPrint\\(|print\\(" apps/in_c_sheet/lib apps/in_c_sheet/test
```

2026-08-28 로컬 검증 기록:

- SDK: Homebrew Flutter at `/opt/homebrew/bin/flutter`, Dart at `/opt/homebrew/bin/dart`.
  Flutter `3.47.2` stable, Dart `3.13.2`.
- `flutter pub get`: PASS.
- `dart format lib test`: PASS. 기존 미포맷 Dart 파일을 formatter 기준으로 정리했다.
- `flutter analyze`: PASS. No issues found.
- `flutter test`: PASS. 246 tests passed.
- `git diff --check`: PASS.

2026-08-28 샘플 PDF 로컬 검증 기록:

- `dart run tool/inspect_pdf_fixtures.dart`: PASS. `short-score.pdf` 3 pages,
  `long-scan-like-score.pdf` 90 pages, `link-annotation-score.pdf` 3 pages/page 1 URL link 1개.
- `flutter test test/sheet_pdf_link_sanitizer_test.dart`: PASS. URL link 제거, 원본 보존,
  비PDF/손상 PDF 실패 안전장치, partial output cleanup을 확인했다.
- `flutter test test/sheet_pdf_search_support_test.dart`: PASS. embedded text manifest,
  OCR unsupported manifest, 이미지-only synthetic scan fixture의 unsupported 안내를 확인했다.
- `flutter test test/sheet_annotated_pdf_exporter_test.dart`: PASS. rendered stamp export,
  표준 annotation export unsupported result, 한글/비ASCII font embedding fallback을 확인했다.
- `flutter test test/sheet_library_store_test.dart`: PASS. JPG/PNG 이미지 PDF 변환, 원본 이미지
  reference linked file 보존, full backup restore bytes round-trip을 확인했다.

2026-08-28 RC polish 로컬 검증 기록:

- 앱 내 피드백 템플릿을 `SheetRcFeedbackTemplate`로 분리하고, 설치 방식, PDF/샘플 유형,
  페이지 수/파일 크기, 샘플 파일 공유 가능 여부, screenshot/screen recording, 테스트 영역, blocker
  여부를 필수 기록 항목으로 추가했다.
- 테스트 정보 화면의 확인 항목에 PDF 본문 검색/OCR 안내, URL link 제거 사본, 페이지 적용 사본,
  기준음/드론/로컬 오디오, 페달/키보드 입력 진단을 포함했다.

RC release checklist 자동화:

```sh
cd apps/in_c_sheet
dart run tool/rc_release_check.dart
```

이 도구는 PDF fixture inspection, non-mutating formatter check, analyze/test, whitespace/tab scan,
stale wording scan, debug print scan을 순서대로 실행한다.

실기기 QA 사전 build 확인:

```sh
cd apps/in_c_sheet
flutter build apk --debug
flutter build apk
flutter build appbundle
flutter build ios --release --no-codesign
```

산출물 경로와 당일 실행 순서는
[`clef-v1-device-qa-runbook.md`](clef-v1-device-qa-runbook.md)에 기록한다.

2026-08-28 실기기 QA 사전 빌드 기록:

- `flutter build apk --debug`: PASS. `app-debug.apk` 178MB.
- `flutter build apk`: PASS. `app-release.apk` 77MB.
- `flutter build appbundle`: PASS. `app-release.aab` 67MB.
- `flutter build ios --release --no-codesign`: PASS. `Runner.app` 27MB. TestFlight 또는 실기기
  배포에는 signing/provisioning이 별도로 필요하다.

2026-08-28 바로 구현 후보 로컬 보강 기록:

- feedback template/tester checklist/QA plan의 이슈 기록 필드를 `blocker 여부`까지 맞췄다.
- annotation file-backed adapter에 10k stroke stress-lite save/load test를 추가해 1MB 이상 외부
  annotation JSON round-trip을 확인한다.
- PDF link sanitizer 성공/부분 성공 snackbar가 원본 PDF 보존을 명시하도록 정리했다.
- `pdfrx` 2.4.7 기준 page별 live rotation hook 미확인 상태를 v1.1 spike backlog로 분리했다.
- `dart run tool/rc_release_check.dart`: PASS. PDF fixture inspection, format check, analyze,
  246-test suite, whitespace/tab/stale wording/debug print scans가 통과했다.

2026-08-30 실기기 1차 QA 반영 기록:

- Play Console 내부 테스트 설치 링크는 게시 직후 지연 후 열리는 것을 확인했다.
- 사용자가 설치한 앱 버전은 당시 Play 설치본 기준으로 확인했고, 이후 튜너 보강분 내부테스트 빌드는
  `1.0.0+10`, 최종 RC 후보는 `1.0.0+11`로 준비했다.
- IMSLP PDF 2개 중 사용자가 올린 Bach Minuet PDF는 실기기에서 정상 출력됐다.
- 페이지 넘김/페이지 이동/마지막 페이지 저장은 실기기에서 합격선으로 확인됐다.
- 페달 방향키 입력은 MobileSheets 기준처럼 좌/상은 이전 page, 우/하는 다음 page로 처리하고,
  PDF 내부 미세 스크롤이 없어야 한다.
- 곡 처음/끝 경계에서 반대 방향 입력 시 `곡 처음`/`곡 끝` 안내를 표시한다.
- CamScanner PDF는 워터마크 또는 URL link annotation이 보이지 않아 link tap 차단 검증은
  완료하지 않았다. 실제 link annotation/object stream 샘플 확보 후 blocker를 닫는다.
- 한국어 버전을 원하는 사용자 요구가 있으므로 앱 내 피드백 템플릿과 QA 기록에 어색한 한글
  문구/표시 항목을 추가했다.
- Android legacy launcher PNG를 Flutter 기본 아이콘에서 Clef 악보/음표 아이콘으로 교체했다.
- Store/launcher 표시 이름은 현재 `Clef`를 유지한다. 단독 `Clef`, `in Clef`, `in C - Clef` 등
  이름 후보는 기존 음악 앱과의 구분 가능성을 보고 출시 전 별도 결정한다. 패키지명과 내부
  프로젝트명은 배포 연속성을 위해 `com.mannlab.clef` / Clef를 유지한다.

2026-08-31 튜너 실기기 QA 준비 기록:

- SDK: Homebrew Flutter at `/opt/homebrew/bin/flutter`, Dart at `/opt/homebrew/bin/dart`.
  Flutter `3.47.2` stable, Dart `3.13.2`.
- 현재 repo version은 `1.0.0+11`이다.
- `adb devices -l`: PASS, ADB daemon은 실행됐지만 연결된 Android 기기는 없었다.
- 따라서 실제 마이크 정확도/latency QA는 미실행이며, `clef-v1-device-qa-runbook.md`의
  튜너 정확도 비교표로 이어서 기록한다.
- 내부테스트 업로드 대상 AAB는
  `apps/in_c_sheet/build/app/outputs/bundle/release/clef-1.0.0+10-release.aab`이다.

2026-08-31 RC 잔여 안정화/작업트리 분리 기록:

- `pubspec.yaml` version과 앱 내 테스트 정보 `_clefAppVersion`을 `1.0.0+10`으로 맞췄다.
- `tool/rc_release_check.dart`는 이제 두 version 값이 다르면 실패한다.
- 현재 작업트리에 남아 있는 `classical_discovery_*`, `classical_concert_import.dart`,
  `classical_admin_commands.dart`, `classical_promotion_reporting.dart`, `classical_discovery_app.dart`,
  `classical_discovery_repository.dart`, `main.dart`의 클래식 탐색 진입점, `url_launcher` 직접 의존성은
  Clef v1 RC 악보 뷰어 안정화 범위가 아니라 별도 classical discovery 후속 기능 후보로 둔다.
- Clef v1 release blocker는 현재 repo만으로 닫을 수 있는 코드 미완료가 아니라 Android/iOS 실기기,
  S Pen, Bluetooth/USB 페달, cloud provider, 실제 CamScanner/object-stream 샘플, 튜너 마이크
  정확도/latency QA로 남아 있다.

2026-08-31 실기기 QA 제외 RC closeout 기록:

- classical discovery dirty 변경을 RC 검증에 섞지 않기 위해 clean temp worktree
  `/private/tmp/clef-sim-qa-dev`에서 Clef viewer hunk만 적용해 검증했다.
- `clef_rc_tablet_api35` emulator에서 앱 `1.0.0+10` 테스트 정보 표시, 홈 카드 식별 정보,
  `short-score.pdf` content URI import/render, 세로 viewer toolbar 좌우 swipe, 마지막 page의
  `곡 끝` 안내, 튜너 bottom sheet 진입을 확인했다.
- ADB의 직접 `file://` intent는 Android scoped storage 권한으로 거부되므로 제품 QA 기준에서는
  file picker/share sheet의 `content://` import를 사용한다.
- clean temp worktree 기준 `dart format lib/main.dart`, `flutter analyze`,
  `flutter test test/sheet_viewer_input_test.dart test/sheet_auto_scroll_test.dart`,
  `flutter build apk --debug`, `git diff --check`가 통과했다.
- 이번 closeout은 release AAB를 새로 만들지 않았다. Clef viewer toolbar/page edge 변경을 내부테스트에
  배포하려면 다음 release build에서 versionCode를 올려 AAB/APK를 생성한다.
