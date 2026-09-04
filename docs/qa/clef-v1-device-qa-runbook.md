# Clef v1 실기기 QA Runbook

작성일: 2026-08-28

## 목적

Clef v1 RC 실기기 QA 당일에 빌드, 샘플, 장비, 기록 양식을 한곳에서 확인한다. 이 문서는
로컬 자동화로 확인할 수 없는 Android 태블릿, iPad, S Pen, Bluetooth/USB 페달, cloud provider,
실제 CamScanner/object-stream PDF, audio latency를 기록하기 위한 실행표다.

에뮬레이터에서 Codex가 사전에 재현/회귀 확인할 수 있는 항목은
[`clef-v1-emulator-qa-tracker.md`](clef-v1-emulator-qa-tracker.md)에서 따로 관리한다.

## 사전 확인

실행 위치는 `apps/in_c_sheet`다.

```sh
dart run tool/rc_release_check.dart
flutter build apk --debug
flutter build apk
flutter build appbundle
flutter build ios --release --no-codesign
```

빌드 산출물:

- Android debug APK: `apps/in_c_sheet/build/app/outputs/flutter-apk/app-debug.apk`
- Android release APK: `apps/in_c_sheet/build/app/outputs/flutter-apk/app-release.apk`
- Android release AAB: `apps/in_c_sheet/build/app/outputs/bundle/release/app-release.aab`
- iOS no-codesign app: `apps/in_c_sheet/build/ios/iphoneos/Runner.app`

2026-08-28 사전 빌드 확인:

- `dart run tool/rc_release_check.dart`: PASS.
- `flutter build apk --debug`: PASS. `app-debug.apk` 178MB.
- `flutter build apk`: PASS. `app-release.apk` 77MB.
- `flutter build appbundle`: PASS. `app-release.aab` 67MB.
- `flutter build ios --release --no-codesign`: PASS. `Runner.app` 27MB. 실제 기기 배포에는
  별도 signing/TestFlight가 필요하다.
- 첫 Android build 중 Android SDK Build-Tools 36, Android SDK Platform 35/36, CMake 3.22.1이
  설치되었다.

2026-08-30 튜너 보강분 내부테스트 빌드 준비:

- 대상 커밋: `fadffd0 feat: expand Clef tuner practice controls` 이후 versionCode bump.
- 앱 버전: `1.0.0+10`.
- dirty workspace의 classical discovery/pubspec 변경은 이번 튜너 빌드 범위가 아니므로 커밋하지 않고,
  release 산출물은 clean worktree에서 생성해 빌드에 섞이지 않게 한다.
- Android 내부테스트 업로드 대상:
  `apps/in_c_sheet/build/app/outputs/bundle/release/clef-1.0.0+10-release.aab`.
- 2026-08-31 `adb devices -l` 기준 연결된 Android 기기는 없어서 튜너 실마이크 QA는 아직 미실행이다.
  이번 기록은 로컬 자동 검증과 QA handoff 기준으로만 해석한다.

2026-09-02 최종 UI polish 내부테스트 준비:

- 현재 소스 앱 버전: `1.0.0+15`.
- 앱 이름/런처 label은 `Clef & Staff`이다.
- 추가 확인 대상: 렌더링 프리셋 아이콘 구분, 튜너 첫 화면 자동 시작/핵심 UI 노출, 중복 라이브러리
  생성 안내, 일반 화면 `악보 추가` 상단 단일 CTA.
- 마지막으로 생성한 내부테스트 AAB는 `1.0.0+15`이며, 튜너 간결화와 `자동`/`정밀 후보` 감지 엔진
  변경분을 포함한다.

## 준비물

Repo 포함 fixture:

- `apps/in_c_sheet/test-fixtures/pdfs/short-score.pdf`
- `apps/in_c_sheet/test-fixtures/pdfs/long-scan-like-score.pdf`
- `apps/in_c_sheet/test-fixtures/pdfs/link-annotation-score.pdf`
- `apps/in_c_sheet/test/fixtures/rc_qa_fixture.dart`

외부 샘플:

- 평소 쓰는 텍스트 PDF 악보 1개.
- 스캔 PDF 또는 이미지 기반 PDF 1개.
- 실제 CamScanner/object-stream PDF 1개.
- JPG/PNG 이미지 악보 2-3장.
- HEIC/HEIF 이미지 1장.
- Drive, iCloud, Dropbox 등 cloud provider에만 있는 PDF 1개.
- MP3/M4A/WAV local audio file 각 1개 이상.

장비:

- Android 태블릿.
- iPad 또는 iPhone.
- S Pen 또는 Android stylus.
- Bluetooth 페달 1-2종.
- USB 페달 1종과 필요한 adapter.
- Hardware keyboard.
- 기준음 source 또는 튜닝 앱.

## 당일 실행 순서

1. Android debug APK 설치 후 첫 실행, 테스트 정보 화면, 피드백 템플릿 복사를 확인한다.
2. Android release APK 또는 AAB 설치 경로가 있으면 같은 smoke flow를 반복한다.
3. iOS TestFlight 또는 local no-codesign build에서 Files open-in, PDF/JPG/PNG import, viewer
   rotation/two-page rendering을 확인한다.
4. PDF import/viewer/search/export/backup 기본 흐름을 `clef-v1-rc-qa-plan.md` 순서대로 실행한다.
5. S Pen pressure, palm rejection, 필기/스크롤 충돌을 집중 확인한다.
6. Bluetooth/USB 페달과 hardware keyboard를 연결해 predefined/custom/unknown inputId mapping을
   확인한다.
7. Cloud provider PDF를 online/offline 상태에서 가져오고 실패 문구를 기록한다.
8. 실제 CamScanner/object-stream PDF에서 URL link count, sanitizer 결과, 원본 linked file 보존을
   기록한다.
9. 기준음/드론, local audio playback, tuner latency와 no-signal behavior를 기록한다.
10. blocker/high/medium/low/v1.1 spike 기준으로 이슈를 분류하고 sample file 공유 가능 여부를 남긴다.

## 기록 양식

```text
QA 세션:
날짜:
담당자:
앱 version/build:
설치 방식:
기기/OS:
빌드 산출물:

테스트 영역:
PDF/샘플 파일 유형:
파일명:
페이지 수:
파일 크기:
샘플 공유 가능 여부:

재현 단계:
기대 결과:
실제 결과:
표시된 오류 문구:
스크린샷/화면녹화:
콘솔/diagnostic log:
재현율:
심각도:
blocker 여부:
v1.1 spike 여부:
비고:
```

## 항목별 기록 포인트

Android 태블릿 smoke:

- 기기명, OS, APK 종류, 화면 방향, PDF page count/file size, blank page, crash 여부.
- immersive/keep-awake, landscape half-page, large PDF first render time.

S Pen:

- pressure에 따른 stroke width 변화.
- stylus 직후 touch rejection window에서 palm input이 막히는지.
- 필기 중 scroll/zoom 충돌, pointer classification이 불명확한 상황.

Bluetooth/USB pedal:

- 제조사/모델, 연결 방식, logical key, physical key, normalized inputId.
- predefined/custom mapping action, unknown inputId 저장/실행, repeat/long press 여부.
- viewer foreground/background 전환 뒤 focus 유지 여부.

Cloud provider:

- provider, online/offline, 내려받기 필요 여부, picker error.
- 앱 내부 사본 생성 여부, 같은 파일 재가져오기 중복 여부.

CamScanner/object-stream PDF:

- page count, file size, URL link count, sanitizer removed/remaining count.
- sanitizer 실패/부분 성공 시 원본 linked file 보존 여부.
- compact rewrite/object stream 잔존 여부는 sample 확보 후 v1.1/blocker로 기록한다.

iPad/iOS smoke:

- TestFlight/local build, Files open-in, PDF/JPG/PNG import.
- iCloud Drive/On My iPhone/Downloads 위치별 접근.
- 화면 회전, two-page rendering, share sheet 후보.

Audio/tuner:

- tuner no-signal behavior, 440/441/442Hz A4 quick action/history, reference tone frequency/cents,
  instrument profile 표시, 세부 설정의 감지 엔진(`자동`, `기존`, `정밀 후보`)과 감지 진단 label.
- Guitar/Bass/Ukulele/Mandolin/Strings/Bb/Eb/F preset 전환, Target mode shortcut, target lock
  on/off, 다른 줄/음 입력 시 `타겟 음을 기다리는 중` 표시.
- 실제 악기 입력 시 note/cents 흔들림, LED/input bar 상태, 소음 환경에서 note label 튐 여부.
- reference tone/drone 재생/정지, volume, A4 변경 반영, latency 체감.
- sheet 닫기/다시 열기 후 microphone stream/resource 정리 여부.
- MP3/M4A/WAV codec 성공/실패와 표시 문구.

Tuner 정확도 비교:

```text
기준 앱:
기기/OS:
설치 build:
마이크/입력원:
주변 환경: 조용함 / 보통 / 시끄러움
A4 기준: 440 / 441 / 442 Hz
Clef 감지 엔진: 자동 / 기존 / 정밀 후보
Clef 감지 진단: 신호 / 신뢰도 / 노이즈 / 제외 사유

음 / 악기:
Clef note:
Clef cents:
기준 앱 note:
기준 앱 cents:
차이:
반응 속도: 빠름 / 보통 / 느림
note label 튐: 없음 / 가끔 / 자주
LED/input bar 읽기 쉬움: 예 / 아니오
비고:
```

튜너 통과 기준:

- v1 통과 후보: 기준 앱 대비 대체로 +/-5 cents 안팎이고 note label이 안정적이다.
- high: +/-10 cents 이상 차이가 반복되거나 반응이 연주 전 조율에 답답하다.
- blocker: 실제 입력에서 다른 음으로 자주 튀거나 튜너 sheet 진입/종료가 crash 또는 resource 오류를 낸다.

## Triage 기준

- blocker: 앱 crash, data loss, import/export 불가, 공연 중 page turn 불가, 백업/복원 실패.
- high: 주요 기능은 가능하지만 반복 재현되는 UX/성능/입력 문제.
- medium: workaround가 있는 혼동, 오류 문구, 특정 PDF/provider 문제.
- low: copy polish, edge-case 표시 문제.
- v1.1 spike: OCR, HEIC native conversion, PDF standard annotation embed, HID capture wizard,
  SAF/iOS Files direct folder, iOS Share Extension, font embedding, cloud sync, page별 live rotation.

## QA 후 정리

1. blocker는 RC release gate로 분리한다.
2. high/medium은 재현 단계와 sample availability를 확인해 RC fix 후보로 분류한다.
3. 외부 샘플, 장비, 플랫폼 계정이 없으면 blocker 해제 조건을 적고 v1.1 spike backlog와 연결한다.
4. 통과한 build 산출물과 실패한 산출물은 `clef-v1-rc-qa-plan.md` 검증 기록에 반영한다.

## 2026-09-04 내부테스트 산출물

- 현재 소스 QA 대상: `Clef & Staff` `1.0.0+15`.
- 마지막 Play Console 업로드 후보:
  `apps/in_c_sheet/build/app/outputs/bundle/release/clef-and-staff-1.0.0+15-release.aab`.
- 원본 Flutter 산출물: `apps/in_c_sheet/build/app/outputs/bundle/release/app-release.aab`.
- 파일 크기: 약 67MB.
- SHA-256: `2c56d917e151829852201614e0ad3dff410f41f93dfe0ec082d438833a236773`.
- upload key SHA1: `4C:78:A9:1A:12:98:5C:CE:7B:CE:3E:C0:61:A9:CE:08:F1:7C:A1:B9`.
