# Clef v1 Emulator QA Tracker

작성일: 2026-08-29

## 목적

Android 실기기 QA 전에 macOS 로컬 Android Emulator에서 Codex가 직접 재현, 확인, 회귀 검증할 수
있는 항목을 따로 관리한다. 이 문서는 실기기/S Pen/Bluetooth 페달/cloud provider 검증을 대체하지
않고, Play 내부테스트 빌드 전에 빠르게 돌릴 수 있는 로컬 smoke와 회귀 테스트 목록으로 사용한다.

## 현재 에뮬레이터

- AVD: `clef_rc_tablet_api35`
- Device profile: Pixel Tablet
- System image: Android 15 API 35, Google APIs Play Store, arm64-v8a
- Flutter device id: `emulator-5554`
- 검증 앱: `com.mannlab.clef`, release run
- 확인한 샘플: 사용자가 제공한 IMSLP Bach Minuet PDF, 4 pages, 약 101 KB

## 바로 확인 가능한 항목

| 영역 | 에뮬레이터에서 할 일 | 통과 기준 | 상태 |
| --- | --- | --- | --- |
| 설치/첫 실행 | release APK/AAB에서 설치된 앱을 실행한다. | 앱이 blank/crash 없이 라이브러리로 진입한다. | 통과 |
| PDF import | Downloads에 넣은 PDF를 system file picker로 가져온다. | PDF가 라이브러리에 등록되고 바로 viewer로 열린다. | 통과 |
| IMSLP 회귀 | `imslp-bach-minuet.pdf`를 열어 회색 빈 화면 재현 여부를 본다. | viewer가 악보 페이지를 렌더링하고 logcat에 `PdfTextSearcher` null crash가 없다. | 통과 |
| PDF page render | 1쪽, 마지막 쪽, 빠른 좌우 이동을 확인한다. | 페이지가 흰 빈 화면으로 고정되지 않고 toolbar page label이 실제 page count와 맞는다. | 통과 |
| 라이브러리 표시 | viewer에서 뒤로 나온 뒤 카드 하단 문구를 확인한다. | 카드가 총 page 수로 오해되지 않게 마지막 열린 page로 표시된다. | 통과 |
| 본문 검색 | 텍스트 PDF에서 `PDF 본문 검색`을 연다. | viewer ready 이후 검색 sheet가 열리고 결과 이동/clear가 동작한다. | 예정 |
| 스캔 PDF 검색 | 이미지-only/synthetic scan PDF에서 검색을 실행한다. | crash 없이 결과 없음 또는 OCR unsupported 안내가 표시된다. | 예정 |
| 보기 모드 | 1페이지, 2페이지, 세로 스크롤, fit width/fullscreen을 바꾼다. | layout 전환 후 page가 blank로 남지 않는다. | 예정 |
| crop/page arrangement | crop mask, page order, duplicate, 적용 사본 생성을 확인한다. | 원본 PDF는 linked file로 남고 viewer가 새 사본을 연다. | 예정 |
| annotation | pen/highlighter/text/shape/stamp, undo/redo, 저장 복원을 확인한다. | 앱 재실행 후 annotation이 유지된다. | 예정 |
| annotation export | 필기 포함 PDF 공유와 includeInExport=false layer를 확인한다. | 원본은 수정되지 않고 export 사본만 생성된다. | 예정 |
| PDF link sanitizer | synthetic link PDF에서 link tap 차단/제거 사본을 확인한다. | URL link는 제거되고 원본 linked file은 보존된다. | 예정 |
| 자동 스크롤 | page duration, pause marker, repeat section을 설정하고 실행한다. | 수동 page turn 시 정지되고 setlist 자동 진행과 충돌하지 않는다. | 예정 |
| 공연 preset | template 생성, 적용, 삭제, setlist override를 확인한다. | 일반 열기와 세트리스트 열기의 viewer setting 우선순위가 다르다. | 예정 |
| 페달/키보드 | hardware keyboard input 또는 adb keyevent를 보낸다. | predefined/custom/unknown inputId mapping이 action으로 실행된다. | 예정 |
| 백업/복원 | metadata/full backup, 자동 metadata restore를 실행한다. | 설정, page metadata, annotation summary가 round-trip 된다. | 예정 |
| QA handoff | 테스트 정보와 피드백 템플릿 복사를 확인한다. | version/build, diagnostic summary, sample file 필드가 포함된다. | 예정 |

## 에뮬레이터로는 대체할 수 없는 항목

- Galaxy Tab S Pen pressure/palm rejection 체감과 pointer classification tuning.
- 실제 Bluetooth/USB 페달 제조사별 HID key variance, focus 유지, repeat 동작.
- 실제 cloud provider offline placeholder/download flow.
- 실제 CamScanner/object stream PDF compact rewrite 잔존 검증.
- Android 태블릿 실기기 성능, 밝기/keep-awake/immersive mode 체감.
- iOS TestFlight/Files/iCloud/Share Extension 관련 QA.
- 마이크 튜너 정확도와 audio latency.

## 2026-08-29 관찰 기록

- 사용자가 제공한 IMSLP PDF는 macOS `pdfinfo`/Poppler render에서는 정상 4-page vector PDF였다.
- 수정 전 Android release app에서 같은 PDF import 후 회색 빈 화면이 재현됐다.
- logcat 원인: `PdfTextSearcher`가 `PdfViewerController` ready 전에 생성되어 null check crash 발생.
- 수정 후 같은 에뮬레이터에서 해당 PDF가 viewer에 렌더링되고 `PdfViewer: Loaded page 4 of 4` 로그가 찍혔다.
- 라이브러리 카드의 `1쪽` 문구는 총 page count가 아니라 마지막 열린 page 의미라 오해 가능성이 있어
  `마지막 1쪽` 문구로 보강했고, `1.0.0+4` release APK 설치 후 화면에서 확인했다.
- `1.0.0+4` release APK 설치 후 같은 IMSLP PDF를 다시 열었고 viewer toolbar는 `1/4`를 표시했다.

## 실행 메모

```sh
cd apps/in_c_sheet
flutter run -d emulator-5554 --release
adb push ~/Desktop/IMSLP924425-PMLP301733-Op.85_Bach_Minuet_Anh._120_arranged_by_Ramón_León_Egea.pdf /sdcard/Download/imslp-bach-minuet.pdf
adb logcat -d --pid="$(adb shell pidof com.mannlab.clef)" -v time
```

내부테스트 업로드 전에는 `dart run tool/rc_release_check.dart`, `flutter test`, `flutter build appbundle`
결과를 함께 기록한다.
