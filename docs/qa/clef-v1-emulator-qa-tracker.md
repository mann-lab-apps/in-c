# Clef v1 Emulator QA Tracker

작성일: 2026-08-29

## 목적

Android 실기기 QA 전에 macOS 로컬 Android Emulator에서 Codex가 직접 재현, 확인, 회귀 검증할 수
있는 항목을 한곳에서 관리한다. 이 문서는 실기기/S Pen/Bluetooth 페달/cloud provider 검증을 대체하지
않고, Play 내부테스트 빌드 전 로컬 smoke, 회귀 테스트, 자동화 가능한 입력 검증을 빠르게 돌리기
위한 실행표다.

## 현재 에뮬레이터

- AVD: `clef_rc_tablet_api35`
- Device profile: Pixel Tablet
- System image: Android 15 API 35, Google APIs Play Store, arm64-v8a
- Flutter device id: `emulator-5554`
- 앱 id: `com.mannlab.clef`
- 현재 검증 build: `1.0.0+10` debug APK(clean temp worktree), release AAB 내부테스트 준비 완료
- 확인한 외부 샘플: 사용자가 제공한 IMSLP Bach Minuet PDF, 4 pages, 약 101 KB
- 최근 전체 QA 실행: 2026-08-31 15:20-15:35 KST, `clef_rc_tablet_api35`

## 사전 준비

실행 위치는 `apps/in_c_sheet`다.

```sh
dart run tool/rc_release_check.dart
flutter build apk
flutter build appbundle
adb devices
adb install -r build/app/outputs/flutter-apk/app-release.apk
adb shell am start -n com.mannlab.clef/.MainActivity
```

샘플 파일:

- `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf`: 3-page text/score-like fixture.
- `apps/in_c_sheet/test-fixtures/pdfs/link-annotation-score.pdf`: URL link annotation fixture.
- `apps/in_c_sheet/test-fixtures/pdfs/long-scan-like-score.pdf`: 90-page scan-like stress fixture.
- 사용자 제공 IMSLP PDF: `IMSLP924425-PMLP301733-Op.85_Bach_Minuet_Anh._120_arranged_by_Ramón_León_Egea.pdf`.
- JPG/PNG 임시 이미지 2-3장: 이미지 PDF 변환 smoke용.
- 작은 MP3/M4A/WAV 샘플: local audio import/playback UI smoke용. 실제 latency 평가는 제외한다.

ADB 파일 주입 예시:

```sh
adb push test-fixtures/pdfs/short-score.pdf /sdcard/Download/clef-short-score.pdf
adb push test-fixtures/pdfs/link-annotation-score.pdf /sdcard/Download/clef-link-annotation-score.pdf
adb push test-fixtures/pdfs/long-scan-like-score.pdf /sdcard/Download/clef-long-scan-like-score.pdf
adb push ~/Desktop/IMSLP924425-PMLP301733-Op.85_Bach_Minuet_Anh._120_arranged_by_Ramón_León_Egea.pdf /sdcard/Download/imslp-bach-minuet.pdf
```

## 15분 에뮬레이터 Smoke

| 순서 | 영역 | 실행 | 통과 기준 | 상태 |
| --- | --- | --- | --- | --- |
| 1 | 설치/첫 실행 | release APK 설치 후 앱 실행 | blank/crash 없이 라이브러리 진입 | 통과 |
| 2 | PDF import | Downloads의 IMSLP 또는 `short-score.pdf` 가져오기 | 라이브러리 등록 후 viewer 진입 | 통과 |
| 3 | viewer render | 1쪽/마지막 쪽/빠른 이동 | toolbar page label과 실제 렌더가 맞고 회색 화면 없음 | 통과 |
| 4 | 라이브러리 카드 | viewer에서 뒤로 돌아오기 | 카드가 `마지막 N쪽`으로 표시되어 총 page 수와 혼동되지 않음 | 통과 |
| 5 | 보기 모드 | 1페이지, 2페이지, 세로 스크롤, fit width/fullscreen 전환 | layout 전환 후 blank 고정 없음 | 예정 |
| 6 | 필기 저장 | pen/highlighter 짧은 stroke 후 앱 재시작 | annotation이 보존됨 | 예정 |
| 7 | 본문 검색 | text PDF에서 `PDF 본문 검색` 실행 | 결과 이동/이전/다음/clear 동작 | 통과 |
| 8 | 자동 스크롤 | 시작 후 수동 page turn | 자동 스크롤이 정지하고 안내가 자연스러움 | 예정 |
| 9 | 테스트 정보 | 테스트 정보 sheet와 피드백 템플릿 복사 | version/build, debug summary, sample file 필드 포함 | 통과 |
| 10 | 백업 | metadata backup/full backup 진입 | crash 없이 export/share flow 진입 | 예정 |

## 상세 QA 매트릭스

| ID | 영역 | 에뮬레이터에서 할 일 | 샘플/입력 | 통과 기준 | 상태 |
| --- | --- | --- | --- | --- | --- |
| EMU-001 | 설치/업데이트 | `adb install -r`로 release APK 덮어 설치 | `app-release.apk` | 기존 library metadata가 유지되고 앱이 실행됨 | 통과 |
| EMU-002 | Play build sanity | build number와 앱 내 테스트 정보 version 확인 | `1.0.0+10` | 앱 내 표시와 `pubspec.yaml` version이 일치 | 통과 |
| EMU-003 | 첫 화면 | 빈 라이브러리/기존 라이브러리 상태 확인 | 앱 첫 화면 | 검색, 필터, import CTA, 테스트 정보 진입이 보임 | 통과 |
| EMU-004 | PDF import | system picker로 PDF 가져오기 | IMSLP, `short-score.pdf` | import 실패 없이 viewer 진입 | 통과 |
| EMU-005 | 비PDF import 실패 | PDF picker/공유에서 비PDF 선택 시도 | `.txt` 또는 이미지 파일 | crash 없이 unsupported 안내 | 예정 |
| EMU-006 | 이미지 import | JPG/PNG 여러 장을 PDF로 묶기 | JPG/PNG 2-3장 | PDF 악보 등록, 원본 이미지 linked file viewer 진입 | 예정 |
| EMU-007 | HEIC 안내 | HEIC/HEIF 선택 시도 | HEIC/HEIF sample | 직접 변환 미지원 안내와 JPG 변환 유도 | 예정 |
| EMU-008 | IMSLP 회귀 | IMSLP PDF 열기 | 사용자 제공 IMSLP PDF | viewer render, `PdfTextSearcher` null crash 없음 | 통과 |
| EMU-009 | PDF page render | 첫/마지막 page와 빠른 이동 | IMSLP 4-page PDF | toolbar `N/4`와 화면이 일치, blank 없음 | 통과 |
| EMU-010 | 대형 PDF render | 90-page fixture 열기 | `long-scan-like-score.pdf` | 첫 render, page jump, scroll 중 crash 없음 | 통과 |
| EMU-011 | 보기 모드 | 1-page/two-page/vertical 전환 | any PDF | 전환 후 현재 page와 layout 유지 | 예정 |
| EMU-011-1 | 세로 toolbar overflow | Pixel Tablet portrait에서 상단 toolbar 좌우 swipe | `short-score.pdf` | `필기 모드`, `페이지 정리`, `공연 설정`, `공연 모드`, page label 접근 | 통과 |
| EMU-012 | scale/display | fit page, fit width, fullscreen, dark/invert | any PDF | 악보가 프레임 밖으로 사라지지 않음 | 예정 |
| EMU-013 | half-page | landscape half-page 이동 | any PDF | half-page anchor와 마지막 page 저장이 자연스러움 | 예정 |
| EMU-014 | 라이브러리 카드 | viewer exit 후 card subtitle 확인 | imported PDF | `마지막 N쪽` 문구와 최근 열기 시간이 보임 | 통과 |
| EMU-015 | metadata edit | 제목/작곡가/태그/컬렉션/그룹/별점/custom field 수정 | imported score | 저장 후 검색/필터에서 다시 찾을 수 있음 | 예정 |
| EMU-016 | 라이브러리 분리 | 새 library profile 생성/전환/비우기 | library switcher | profile별 score 저장소가 분리되고 파일 삭제 오해 없음 | 예정 |
| EMU-017 | 즐겨찾기/고정 | favorite/pin toggles | score card | quick access와 필터가 반영됨 | 예정 |
| EMU-018 | 세트리스트 기본 | setlist 생성, score 추가, 순서 변경, 첫 곡 열기 | 2개 이상 score | 시작 page/memo/duration이 viewer 진입에 반영 | 예정 |
| EMU-019 | 세트리스트 복제 | setlist duplicate | setlist with score settings | score duration/transition/override 보존 | 예정 |
| EMU-020 | 공연 preset | template 생성/적용/삭제 | performance preset UI | score setting과 setlist override 우선순위가 문서와 일치 | 예정 |
| EMU-021 | 자동 스크롤 기본 | duration/start/end 설정 후 실행 | any PDF | 진행 bar와 page 이동이 설정대로 동작 | 예정 |
| EMU-022 | 자동 스크롤 marker | page duration, pause marker, repeat section, cue 추가 | 3+ page PDF | timeline 충돌 없이 저장/복원 | 예정 |
| EMU-023 | 자동 다음 곡 | setlist auto advance | 2-score setlist | 곡 종료 후 다음 곡 이동/확인이 설정대로 동작 | 예정 |
| EMU-024 | 본문 검색 | text PDF 검색, 결과 클릭, 이전/다음, clear | `short-score.pdf`, IMSLP | viewer ready 이후 sheet 동작, highlight가 page와 맞음 | 통과 |
| EMU-025 | 스캔 PDF 검색 | scan-like PDF에서 검색 | `long-scan-like-score.pdf` | crash 없이 결과 없음/OCR unsupported 안내 | 통과 |
| EMU-026 | PDF link tap | URL link 영역 탭 | `link-annotation-score.pdf` | URL tap 차단, 내부 destination은 유지 | 예정 |
| EMU-027 | PDF link sanitizer | URL link 제거 사본 생성 | `link-annotation-score.pdf` | 원본 linked file 보존, removed count/page count 재검증 | 예정 |
| EMU-028 | sanitizer 실패 | 손상/비PDF/header malformed | synthetic bad file | partial output cleanup, 사용자 안내 | 예정 |
| EMU-029 | crop mask | page/global crop 설정 | any PDF | overlay/crop-to-fit 표시가 page와 맞음 | 예정 |
| EMU-030 | crop preset | all/odd/even/cover 제외 preset | 4+ page PDF | 적용/삭제 후 page별 crop metadata 유지 | 예정 |
| EMU-031 | rotation metadata | source/instance rotation 설정 | any PDF | badge/metadata 저장, 적용 사본 path 유지 | 예정 |
| EMU-032 | page order | hide/move/duplicate/repeat blank page | 3+ page PDF | navigation grid와 order cursor가 일치 | 예정 |
| EMU-033 | 적용 사본 | crop/rotation/page arrangement applied copy 생성 | modified score | 새 내부 PDF 열림, 원본 linked file 보존 | 예정 |
| EMU-034 | bookmark/jump | bookmark, jump point, rehearsal mark CRUD | any PDF | 목록에서 page 이동, 저장/복원 | 예정 |
| EMU-035 | annotation stroke | pen/highlighter/eraser/undo/redo | touch input | stroke가 page와 같이 움직이고 저장됨 | 예정 |
| EMU-036 | annotation text | ASCII text 추가/수정/삭제 | any PDF | 위치/내용/크기 저장, PDF export fallback 확인 | 예정 |
| EMU-037 | annotation shape/stamp | rectangle/arrow/stamp 추가/삭제 | any PDF | hit-test/delete와 redo가 동작 | 예정 |
| EMU-038 | layer flag | layer visibility/export include toggle | annotated score | viewer hide는 metadata 삭제 없이 overlay만 숨김 | 예정 |
| EMU-039 | annotated PDF export | 필기 포함 PDF 공유 | annotated score | 원본 수정 없이 rendered stamp copy 생성 | 예정 |
| EMU-040 | export unsupported | standard annotation mode 또는 한글 text fallback | Korean text annotation | unsupported/fallback 안내가 명확함 | 예정 |
| EMU-041 | large annotation | 10k stroke fixture 성격의 큰 annotation score | generated metadata/test fixture | summary 안내와 저장/복원 crash 없음 | 예정 |
| EMU-042 | keyboard page turn | `adb shell input keyevent` 또는 hardware keyboard | DPAD/Page/Space keys | mapped action이 page/score 이동으로 실행 | 통과(에뮬레이터 focus 조건 주의) |
| EMU-043 | unknown inputId | diagnostic log에서 custom mapping 저장 | unknown key path | 저장한 inputId가 action으로 실행 | 예정 |
| EMU-044 | global defaults | viewer/action 기본값 변경 후 새 score import | settings UI | 새 score에만 기본값 적용, 기존 score 불변 | 예정 |
| EMU-045 | metronome | BPM/meter/start/stop/sound toggle | metronome sheet | visual tick과 state 저장 | 예정 |
| EMU-046 | tuner UI | profile/display/reference pitch 전환 | tuner sheet | Concert/Bb/Eb/F/Strings/Guitar/Bass label 정상 | 통과(실마이크 제외) |
| EMU-047 | tone/drone | 기준음/5도/옥타브 drone start/stop | Android native channel | UI state와 stop 동작 정상. latency 평가는 실기기 | 예정 |
| EMU-048 | local audio | linked MP3/M4A/WAV import/play/stop | small audio files | MediaPlayer sheet 진입과 오류 안내 정상 | 예정 |
| EMU-049 | backup metadata | metadata export/import | score with metadata | custom field, page metadata, pedal mapping 보존 | 예정 |
| EMU-050 | full backup | PDF 포함 ZIP export/import | 1-2 PDFs | PDF bytes와 linked files round-trip | 예정 |
| EMU-051 | automatic backup | automatic metadata snapshot restore | edited library | active library profile 기준 restore | 예정 |
| EMU-052 | app restart | force-stop 후 재실행 | `adb shell am force-stop` | last score/page/view setting/recent 유지 | 통과 |
| EMU-053 | tester info | 테스트 정보 sheet | top-right info | app version/build, debug summary 복사 가능 | 통과 |
| EMU-054 | feedback template | 피드백 템플릿 복사 | tester info sheet | device/OS/install/sample/steps/severity fields 포함 | 예정 |
| EMU-055 | log capture | logcat capture after issue | `adb logcat -d --pid=...` | crash/error 원인 기록 가능 | 통과 |

## ADB로 자동화 가능한 입력

| 목적 | 명령 예시 | 기대 결과 |
| --- | --- | --- |
| 앱 실행 | `adb shell am start -n com.mannlab.clef/.MainActivity` | MainActivity foreground |
| 앱 종료 | `adb shell am force-stop com.mannlab.clef` | 다음 실행 시 저장 상태 확인 가능 |
| 화면 캡처 | `adb exec-out screencap -p > /private/tmp/clef-screen.png` | 시각 QA evidence 저장 |
| 로그 확인 | `adb logcat -d --pid="$(adb shell pidof com.mannlab.clef)" -v time` | crash/Flutter error 확인 |
| 뒤로가기 | `adb shell input keyevent KEYCODE_BACK` | viewer/library navigation |
| 다음 page 후보 | `adb shell input keyevent KEYCODE_DPAD_RIGHT` | keyboard mapping path 확인, PDF 내부 스크롤 없음 |
| 이전 page 후보 | `adb shell input keyevent KEYCODE_DPAD_LEFT` | keyboard mapping path 확인, PDF 내부 스크롤 없음 |
| 다음 page 후보 | `adb shell input keyevent KEYCODE_DPAD_DOWN` | 방향키 방식 페달 호환 확인 |
| 이전 page 후보 | `adb shell input keyevent KEYCODE_DPAD_UP` | 방향키 방식 페달 호환 확인 |
| Space 입력 | `adb shell input keyevent KEYCODE_SPACE` | pedal/keyboard standard mapping 확인 |
| PageDown 입력 | `adb shell input keyevent KEYCODE_PAGE_DOWN` | pedal/keyboard mapping 확인 |
| PageUp 입력 | `adb shell input keyevent KEYCODE_PAGE_UP` | pedal/keyboard mapping 확인 |

## 에뮬레이터로는 대체할 수 없는 항목

- Galaxy Tab S Pen pressure/palm rejection 체감과 pointer classification tuning.
- 실제 Bluetooth/USB 페달 제조사별 HID key variance, focus 유지, repeat 동작.
- 실제 cloud provider offline placeholder/download flow.
- 실제 CamScanner/object stream PDF compact rewrite 잔존 검증.
- Android 태블릿 실기기 성능, 밝기/keep-awake/immersive mode 체감.
- iOS TestFlight/Files/iCloud/Share Extension 관련 QA.
- 마이크 튜너 정확도와 audio latency.

## 이슈 기록 양식

```text
제목:
심각도: blocker / high / medium / low
QA ID:
에뮬레이터:
앱 version/build:
설치 방식:
샘플 파일:
파일 유형:
페이지 수/파일 크기:
재현 단계:
기대 결과:
실제 결과:
표시 문구:
스크린샷:
logcat:
재현율:
실기기 재확인 필요 여부:
v1.1 spike 여부:
비고:
```

## 2026-08-29 관찰 기록

- 사용자가 제공한 IMSLP PDF는 macOS `pdfinfo`/Poppler render에서는 정상 4-page vector PDF였다.
- 수정 전 Android release app에서 같은 PDF import 후 회색 빈 화면이 재현됐다.
- logcat 원인: `PdfTextSearcher`가 `PdfViewerController` ready 전에 생성되어 null check crash 발생.
- 수정 후 같은 에뮬레이터에서 해당 PDF가 viewer에 렌더링되고 `PdfViewer: Loaded page 4 of 4` 로그가 찍혔다.
- 라이브러리 카드의 `1쪽` 문구는 총 page count가 아니라 마지막 열린 page 의미라 오해 가능성이 있어
  `마지막 1쪽` 문구로 보강했고, 당시 release APK 설치 후 화면에서 확인했다.
- 당시 release APK 설치 후 같은 IMSLP PDF를 다시 열었고 viewer toolbar는 `1/4`를 표시했다.
- 2026-08-29 16:30-16:36 KST 전체 QA에서 `dart run tool/rc_release_check.dart`와
  `flutter test --reporter compact`가 통과했다. Flutter test는 251개 테스트 통과.
- release APK를 `clef_rc_tablet_api35`에 설치하고 IMSLP PDF, `long-scan-like-score.pdf`를 Downloads에서
  import했다. 두 PDF 모두 viewer에서 회색 blank 없이 렌더링됐다.
- IMSLP PDF의 `PDF 본문 검색`에서 `Bach` 검색은 `1/2 결과`를 표시하고 결과 탭 후 페이지 하이라이트가
  렌더링됐다.
- `long-scan-like-score.pdf`에서 `zzzzz` 검색은 crash 없이 `결과 없음 - 스캔 PDF는 텍스트가 없을 수
  있습니다.` 및 스캔 악보 본문 검색 미지원 안내를 표시했다.
- 앱 force-stop 후 재실행해도 라이브러리 2곡, 최근 카드, 마지막 page 문구가 보존됐다.
- 테스트 정보 sheet에서 당시 앱 version, `Beta test build`, 악보 수, 필기 요약, 외부 필기 저장소,
  custom pedal 요약이 표시됐다.
- 재시작 후 앱 프로세스 logcat에는 Flutter exception/crash가 없었다. 초기 render에서 Android
  `Skipped frames` 경고 1건은 관찰됐고 실기기 성능 QA에서 재확인한다.
- ADB `KEYCODE_DPAD_RIGHT`/`KEYCODE_PAGE_DOWN` 입력은 당시 focus 상태에서 page label 변화가
  확인되지 않았다. 이후 viewer key event 소비 경로를 보강했으므로 다음 emulator/실기기 QA에서
  PDF 내부 스크롤 없이 페이지 단위 이동하는지 재확인한다.
- 2026-08-29 사용자 실기기 QA에서 Play 설치 앱의 테스트 정보와 `pubspec.yaml` build number가
  분리되어 있던 점을 확인했다. 현재 QA 기준 build `1.0.0+10`에서는 두 값을 맞췄고 에뮬레이터
  테스트 정보에서 재확인했다.
- 같은 사용자 QA에서 직접 스캔 PDF는 아니지만 IMSLP PDF 정상 출력, page turn/jump, 마지막 page
  저장은 통과로 기록했다.
- 같은 사용자 QA에서 형광펜이 얇을 때 원형 cap이 연속으로 겹쳐 보여 부자연스럽고, 지우개 삭제가
  undo로 복원되지 않는 문제가 발견됐다. 후속 build에서 highlighter를 continuous path로 렌더링하고
  eraser 삭제 undo/redo 모델 테스트를 추가했다.

## 2026-08-31 실기기 QA 제외 RC closeout 기록

- classical discovery dirty 변경을 피하기 위해 `/private/tmp/clef-sim-qa-dev` clean temp worktree에서
  Clef viewer hunk만 적용해 에뮬레이터 검증을 진행했다.
- `clef_rc_tablet_api35`에 debug APK를 설치했고 테스트 정보에서 앱 `1.0.0+10`, `Beta test build`가
  표시되는 것을 확인했다.
- `short-score.pdf`를 Downloads에 주입한 뒤 `content://media/external/file/...` read grant로 열어
  viewer 렌더링을 확인했다. 회색 blank 고정은 재현되지 않았다.
- 직접 `file://` 경로를 ADB intent로 여는 방식은 Android scoped storage 권한으로 거부됐다. 제품
  기준 import/share 경로는 file picker 또는 share sheet의 `content://` URI로 둔다.
- Pixel Tablet portrait에서 viewer AppBar action 영역이 `HorizontalScrollView`로 노출되고, 좌우
  swipe 후 `필기 모드`, `페이지 정리`, `공연 설정`, `공연 모드`, `1/3` page label까지 접근됐다.
- 마지막 page의 다음 버튼을 누르면 비활성 dead button이 아니라 dimmed button이 눌리고 `곡 끝`
  snackbar가 표시됐다. 첫 page의 이전 입력은 같은 정책으로 `곡 처음`을 표시한다.
- 홈 화면은 큰 `Clef` 제목 없이 시작했고, metadata가 비어 있는 최근 카드도 파일명, source filename,
  최근 연 시간, `마지막 1쪽`으로 구분 가능했다.
- 튜너 bottom sheet는 crash 없이 열렸고 Chromatic/Target, preset, A4, calibration history,
  target lock, 기준음/드론 진입점이 표시됐다. 실제 마이크 정확도와 latency는 실기기 QA로 남긴다.
- `dart format lib/main.dart`, `flutter analyze`, `flutter test test/sheet_viewer_input_test.dart
  test/sheet_auto_scroll_test.dart`, `flutter build apk --debug`, `git diff --check`가 clean temp
  worktree에서 통과했다.

## 내부테스트 업로드 전 확인

```sh
cd apps/in_c_sheet
dart run tool/rc_release_check.dart
flutter test --reporter compact
flutter build apk
flutter build appbundle
shasum -a 256 build/app/outputs/flutter-apk/app-release.apk build/app/outputs/bundle/release/app-release.aab
```

통과한 build 산출물과 hash는 `clef-v1-device-qa-runbook.md` 또는 최종 QA 보고에 같이 남긴다.
