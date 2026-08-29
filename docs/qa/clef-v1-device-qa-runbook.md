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

- tuner no-signal behavior, reference tone frequency/cents, instrument profile 표시.
- reference tone/drone 재생/정지, volume, latency 체감.
- MP3/M4A/WAV codec 성공/실패와 표시 문구.

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
