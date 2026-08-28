# Clef Android 태블릿 smoke test

작성일: 2026-08-22

## 목적

`apps/in_c_sheet` MVP가 Android 태블릿에서 악보앱으로 기본 사용 가능한지 확인한다. 이번
체크리스트는 자동 성능 계측이 아니라 설치, PDF 보기, 연주 보조 기능, 튜너 microphone
pipeline이 crash 없이 이어지는지를 보는 수동 smoke test다.

## 준비

- v1 RC 전체 QA 순서는 `docs/qa/clef-v1-rc-qa-plan.md`를 기준으로 삼고, 이 문서는 Android
  태블릿 세부 smoke test로 사용한다.
- 실기기 QA 당일 산출물, 샘플, triage 기록은 `docs/qa/clef-v1-device-qa-runbook.md`를 기준으로
  남긴다.
- Android 태블릿 개발자 옵션과 USB debugging을 켠다.
- 태블릿을 Mac에 연결한 뒤 권한 dialog를 승인한다.
- 프로젝트 루트: `apps/in_c_sheet`.
- 빌드 산출물:
  - debug APK: `build/app/outputs/flutter-apk/app-debug.apk`
  - release APK: `build/app/outputs/flutter-apk/app-release.apk`
  - release AAB: `build/app/outputs/bundle/release/app-release.aab`

## 설치/실행

```sh
flutter devices
adb devices
flutter install -d <android-device-id>
```

`flutter install`이 막히면 debug APK를 직접 설치한다.

```sh
adb install -r build/app/outputs/flutter-apk/app-debug.apk
```

## PDF 뷰어 흐름

1. 앱 첫 화면이 렌더링되는지 확인한다.
2. `악보 추가`로 짧은 PDF를 import한다.
3. 라이브러리 목록에 악보가 표시되는지 확인한다.
4. 악보를 열고 첫 페이지가 blank 없이 렌더링되는지 확인한다.
5. 이전/다음 페이지 버튼으로 이동한다.
6. 보기 모드를 `1페이지`, `2페이지`, `세로 스크롤`로 바꿔 본다.
7. `반 페이지 넘김`을 켜고 하단 버튼이 page 내부 viewport와 다음/이전 page를 오가는지 확인한다.
8. 50-100페이지 이상 PDF에서 첫 로딩, 페이지 이동, blank/crash 여부를 기록한다.

## 라이브러리/공연 흐름

1. 악보 메타데이터에서 제목, 작곡가, 태그, 메모를 수정한다.
2. 검색 결과에 수정된 메타데이터가 반영되는지 확인한다.
3. 현재 페이지를 북마크하고 목록에서 해당 페이지로 이동한다.
4. 세트리스트를 만들고 악보를 2개 이상 추가한다.
5. 세트리스트에서 첫 곡을 열고 이전/다음 곡 버튼으로 이동한다.
6. 공연 모드를 켜고 관리 action이 숨겨지는지 확인한다.

## 필기 흐름

1. 필기 모드를 켠다.
2. 펜/형광펜으로 stroke를 남긴다.
3. 색상과 두께를 바꿔 본다.
4. undo와 지우개가 stroke 단위로 동작하는지 확인한다.
5. 페이지를 이동했다 돌아와도 annotation이 page 위치와 맞는지 확인한다.
6. 확대/이동 후 annotation이 PDF page와 같이 움직이는지 확인한다.

## 튜너 흐름

1. viewer에서 튜너 bottom sheet를 연다.
2. `시작`을 눌러 microphone permission prompt가 뜨는지 확인한다.
3. 권한 허용 후 상태가 `마이크 입력 수신 중` 또는 `소리가 작거나 안정적이지 않습니다`로 바뀌는지
   확인한다.
4. Concert/Bb/Eb/F/Strings/Guitar/Bass 표시 profile과 감지 profile을 각각 전환한다.
5. 440Hz reference tone을 입력해 Concert A4, frequency, cents, signal이 갱신되는지 확인한다.
6. Bb Trumpet, Alto Sax, Horn in F에서 written/concert 표시가 이해되는지 확인한다.
7. Violin 또는 Guitar profile에서 open string target shortcut을 누르고 target 표시와 cents meter를
   확인한다.
8. 조용한 상태에서 no signal로 안정적으로 돌아가는지 확인한다.
9. start/stop을 빠르게 여러 번 눌러 crash가 없는지 확인한다.
10. bottom sheet를 닫은 뒤 다시 열어 recorder가 정상 재시작되는지 확인한다.
11. 권한을 거부한 뒤 앱이 crash 없이 권한 안내를 표시하는지 확인한다.

기록할 항목:

- 권한 prompt 표시 여부.
- 440Hz 또는 튜닝 앱 reference tone 입력 시 A4 근처 탐지 여부.
- Bb/Eb/F 악기 profile에서 실제 입력 시 written/concert 표시가 기대와 맞는지 여부.
- Strings/Guitar/Bass target shortcut이 실제 open string 조율에 맞는지 여부.
- note label 깜빡임 정도.
- cents meter 흔들림 정도.
- start/stop/bottom sheet close 후 microphone indicator가 꺼지는지 여부.

## 하드웨어 키/Bluetooth 페달

1. Bluetooth 페달이 있으면 연결한다.
2. 페달이 없으면 hardware keyboard로 확인한다.
3. 기본 mapping:
   - `ArrowRight`, `PageDown`, `Space`: 다음 페이지.
   - `ArrowLeft`, `PageUp`, `Shift+Space`: 이전 페이지.
4. 반 페이지 넘김 ON 상태에서도 같은 입력이 동작하는지 확인한다.
5. 숨김 페이지가 있을 때 숨김 페이지를 건너뛰는지 확인한다.
6. `직접 설정` mapping에서 Arrow, PageUp/PageDown, Enter, Space, Shift+Space, Tab, Media previous/next 동작을 바꿔 저장한다.
7. custom mapping의 `이전 곡`, `다음 곡`, `Quick action 토글`, `사용 안 함`이 viewer에서 기대대로 동작하는지 확인한다.
8. viewer 메뉴의 `입력 진단`을 열어 logical key, physical key, normalized input id, mapped action이 기록되는지 확인한다.
9. `진단 로그 복사`를 눌러 장비명과 함께 diagnostic log를 기록한다.
10. 페달이 다른 key code를 보내면 장비명과 key 동작을 기록한다.

## v1 RC 추가 탐색/세트리스트

1. 페이지 탐색 grid를 열고 현재 page 강조, 숨김 page 비활성화, duplicate page 배지가 보이는지 확인한다.
2. page number grid에서 먼 page로 이동한 뒤 blank render 없이 표시되는지 확인한다.
3. 텍스트 PDF에서 본문 검색 결과를 눌러 해당 page로 이동하고 highlight, 이전/다음 결과, 검색어 지우기를 확인한다.
4. 스캔 PDF 또는 이미지 변환 PDF에서 본문 검색이 crash 없이 결과 없음/unsupported 안내로 끝나는지 확인한다.
5. 세트리스트를 복제하고 곡별 예상 시간, 전환 시간, 총 예상 시간이 원본과 맞는지 확인한다.
6. 세트리스트 공연/리허설 viewer title에서 현재 곡 시간과 총 예상 시간이 길어도 겹치지 않는지 확인한다.
7. odd/even 또는 cover 제외 crop preset 적용 후 page별 crop mask와 crop-to-fit이 실제 page에 맞게 바뀌는지 확인한다.
8. metadata 백업/복원과 PDF 포함 전체 백업/복원 후 custom pedal, page별 crop, 세트리스트 예상 시간이 유지되는지 확인한다.
9. 큰 필기 layer가 있는 악보에서 PDF 공유/백업 전 필기 요약 안내가 보이는지 확인한다.
10. `테스트 정보`에서 score/setlist/annotation/custom pedal/page metadata summary와 debug summary 복사가 동작하는지 확인한다.
11. external annotation storage 표시가 있으면 full backup manifest와 복원 뒤 annotation storage path가 유지되는지 확인한다.

## 현재 미확인

2026-08-22 현재 로컬에는 Android device/emulator가 연결되어 있지 않았다. `flutter devices`는
iPhone Simulator, macOS, Chrome만 표시했고, `adb devices`는 빈 목록이었다. 따라서 이 문서의
Android 태블릿 항목은 태블릿 연결 후 별도로 실행해야 한다.
