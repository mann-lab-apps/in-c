# Clef v1 RC QA Plan

작성일: 2026-08-27

## 목적

실기기 없이 준비 가능한 RC QA 자료를 먼저 고정한다. 주말 실기기 테스트에서는 이 문서를
실행 순서대로 따라가며 결과만 기록한다. 이번 RC 준비는 새 기능 추가가 아니라, 연주 중
헷갈리지 않고 metadata가 안전하게 보존되는지 확인하는 데 집중한다.

## 준비물

- 설치 파일: Android debug/release APK, 가능하면 iPad용 TestFlight 또는 local iOS build.
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

## 실행 순서

| 순서 | 영역 | 통과 기준 | 기록할 항목 |
| --- | --- | --- | --- |
| 1 | 설치/첫 실행 | 앱이 crash 없이 열리고 테스트 정보가 표시된다. | 설치 방식, 앱 버전/build, 기기/OS |
| 2 | Import | PDF, JPG/PNG 변환 PDF가 라이브러리에 등록되고 원본 이미지 viewer가 열린다. | 파일 유형, 페이지 수, 파일 크기, 원본 이미지 표시 여부 |
| 3 | 라이브러리 | 검색/정렬/필터, 즐겨찾기/고정, collection/group/rating/custom field가 유지된다. | 찾지 못한 필터 조건, 정렬 이상 여부 |
| 3-1 | 라이브러리 전환 | 기본/추가 라이브러리를 전환하고 이름 변경/비우기가 파일 삭제 없이 동작한다. | 변경한 library profile, 전환 전후 악보 수 |
| 4 | 뷰어 기본 | 페이지가 blank 없이 렌더링되고 보기 모드/scale/crop이 전환된다. | PDF 유형, blank 발생 page, 재현 여부 |
| 5 | 페이지 관리 | 숨김, duplicate, virtual order, page crop 요약이 이해된다. | UI 문구 혼동 여부, 원본 PDF 불변 안내 위치 |
| 5-1 | 페이지 적용 사본 | crop/rotation/page arrangement 적용 사본 생성 후 원본 링크와 새 page metadata가 보존된다. | 적용 전후 page 수, 연결 파일 label, bookmark/annotation page |
| 6 | PDF 본문 검색 | 텍스트 PDF는 결과 이동/이전/다음/clear가 동작한다. | 검색어, 결과 수, 이동 page |
| 7 | 스캔 PDF 검색 | crash 없이 결과 없음 또는 unsupported 안내가 표시된다. | 표시 문구, OCR 기대 혼동 여부 |
| 8 | 필기/주석 | pen/highlighter/text/shape/stamp, undo/redo, 저장 복원이 유지된다. | stroke 수, 저장 실패 문구, 복원 여부 |
| 9 | 큰 annotation | 공유/백업 전 annotation 요약 안내가 표시된다. | stroke/text/point 요약, 파일 크기 |
| 10 | 세트리스트 | 복제, 곡별 시작 page, memo, duration, 총 시간이 보존된다. | 전환 시간, 총 예상 시간, 겹침 여부 |
| 11 | 공연/리허설 | 공연 잠금 상태와 허용 action 표시, BPM 기반 자동 스크롤 preset이 실제 제한과 맞는다. | 잠금 상태, 허용/차단된 action, BPM/preset/duration |
| 11-1 | 공연 preset | 세트리스트별 보기 preset을 켜면 세트리스트로 연 곡에만 override가 적용되고, 곡별 설정은 보존된다. | override 항목, 일반 열기/세트리스트 열기 차이, 복제 setlist 동작 |
| 12 | 페달/키보드 | predefined custom mapping이 page/score/quick action/no-op에 맞게 동작한다. | 장비명, 입력 key, action, 실패 key |
| 12-1 | 전역 입력 기본값 | 전역 보기/입력 기본값을 바꾼 뒤 새로 가져온 악보에 mapping이 적용된다. | 변경한 기본값, 새 악보 viewer/action 설정, 기존 악보 불변 여부 |
| 13 | 입력 진단 | viewer 입력 진단에서 logical/physical key, input id, mapped action이 복사된다. | diagnostic log, unknown key 여부 |
| 14 | 튜너 | Concert/Bb/Eb/F/Strings/Guitar/Bass profile 표시가 자연스럽다. | 입력음, 표시 note, cents 흔들림 |
| 14-1 | 기준음/드론 | Android에서 기준음/5도/옥타브 drone이 재생/정지되고 A4 기준 변경이 주파수에 반영된다. | root note, drone mode, volume, latency/끊김, iOS 표시 문구 |
| 15 | 백업/복원 | metadata/full backup과 자동 metadata snapshot 후 새 metadata가 보존/복원된다. | custom field, custom pedal, page crop, score duration, setlist preset override, annotation storage, active library profile 보존 여부 |
| 15-0 | 자동 백업 복원 | 백업 메뉴의 자동 metadata 복원이 파일 picker 없이 active library profile의 최신 snapshot으로 되돌린다. | 복원 전후 악보 수, 활성 library profile, PDF filePath 접근 여부 |
| 15-1 | Cloud import | cloud provider PDF가 system picker에서 앱 내부 사본으로 등록된다. | provider, 내려받기 필요 여부, 실패 문구 |
| 16 | 테스트 정보 | 테스트 정보에서 library/debug summary와 피드백 템플릿 복사가 동작한다. | score/setlist/annotation summary |
| 17 | 종료/재진입 | 마지막 page/view state와 최근/즐겨찾기/고정 접근이 유지된다. | 재진입 score, 마지막 page, 보기 설정 |

## 기기별 필수 확인

| 대상 | 필수 확인 | 실기기 없을 때 상태 |
| --- | --- | --- |
| Android 태블릿 | 큰 PDF 렌더링, immersive mode, keep-awake 안내, Bluetooth 페달 | 미확인으로 남김 |
| iPad | 화면 회전, 2페이지 보기, TestFlight 설치, iOS share/import | 미확인으로 남김 |
| Hardware keyboard | Arrow, PageUp/PageDown, Space, Shift+Space, Enter, Tab | simulator/desktop에서 일부 확인 가능 |
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
재현 단계:
기대 결과:
실제 결과:
표시 문구:
재현율:
첨부:
```

## Known Issues

- 현재 로컬 환경에서는 `dart`, `flutter`, `fvm` 명령이 PATH에 없어 전체 format/analyze/test를 실행할 수 없다.
- Android 태블릿, iPad, Bluetooth 페달 실기기 검증은 주말 QA에서 진행해야 한다.
- 스캔 PDF와 이미지 기반 PDF는 OCR을 지원하지 않으므로 PDF 본문 검색 결과가 없을 수 있다.
- HEIC/HEIF 이미지는 아직 직접 PDF 변환하지 않는다. iOS 사진 앱에서 JPG로 내보낸 뒤 가져온다.
- Drive/iCloud/Dropbox는 별도 계정 연동이 아니라 system file picker/provider를 사용한다. provider
  파일 접근 실패 시 기기에 내려받은 뒤 다시 가져온다.
- Bluetooth 페달은 v1에서 predefined input dropdown 방식이다. 실제 HID key capture는 지원하지 않는다.
- 입력 진단은 key/action log를 수집하기 위한 QA 도구이며, mapping 자동 저장 UI는 아니다.
- 공연 모드 keep-awake, 밝기 유지, immersive system UI는 플랫폼 제약이 있을 수 있다.
- 기준음/드론 재생은 Android native `AudioTrack` 채널 기준이다. iOS에서는 playback channel parity가
  아직 필요하다.
- annotation은 v1에서 SharedPreferences 기반 score metadata에 저장된다. file-backed store adapter와 external ref metadata는 v1.1 준비 단계이며, 기존 inline metadata를 강제 migration하지 않는다.
- 필기 포함 PDF 공유는 표준 PDF annotation embed가 아니라 렌더링된 사본 생성 방식이다.
- crop, rotation, page hide, virtual order는 기본적으로 원본 PDF를 수정하지 않고 앱 metadata/viewer
  표시로 처리한다. 사용자가 적용 사본 생성을 명시적으로 실행한 경우에는 앱 내부 PDF 사본만 새로
  만들고, 원본 PDF는 연결 파일 metadata로 보존한다.
- 여러 라이브러리는 별도 계정/폴더 권한이 아니라 앱 내부 library profile별 metadata 저장소
  분리다. 라이브러리 비우기는 앱 metadata만 제거하며, PDF 파일 삭제 QA는 별도 destructive
  테스트로 분리한다.
- 자동 DB 백업은 active library profile별 metadata-only snapshot이다. PDF bytes, 외부 원본 파일,
  OS background scheduled backup은 포함하지 않으며 전체 파일 복구는 PDF 포함 ZIP 백업으로 확인한다.

## V1 Blockers

| 항목 | 막힌 이유 | 준비된 상태 | 해제 조건 |
| --- | --- | --- | --- |
| HEIC/HEIF 직접 변환 | Flutter/Dart 순수 경로에서 HEIC decoder가 없고 platform decoder 선택이 필요하다. | HEIC/HEIF 감지와 JPG 변환 안내가 있다. | Android/iOS decoder dependency 또는 native bridge 결정, 실제 사진 샘플 QA |
| iOS Share Extension | Xcode target, App Group, provisioning 설정이 필요하다. | iOS document open URL bridge는 구현했다. | Apple 계정/provisioning과 extension target 구성 |
| Android 기존 폴더 직접 참조 | SAF persistent URI permission과 tree scan 정책을 실기기에서 검증해야 한다. | 앱 내부 사본 저장, 연결 파일, 전체 ZIP 백업은 구현했다. | Android 태블릿에서 folder picker/권한 상실/재스캔 QA |
| Cloud provider 실패 검증 | Drive/iCloud/Dropbox 계정과 provider별 offline placeholder 동작이 필요하다. | system file picker 우선 정책과 내려받기 안내가 있다. | provider별 실기기 import 실패/성공 기록 |
| S Pen pressure/palm rejection | 스타일러스 hardware와 Android pointer classification 동작이 필요하다. | page overlay normalized annotation 경로는 구현했다. | Galaxy Tab + S Pen으로 pressure/palm 입력 로그 확인 |
| 한글/비라틴 PDF font embedding | 배포 가능한 폰트 asset/license와 PDF embedding 경로가 필요하다. | 비ASCII text export 안내/fallback이 있다. | 폰트 asset 결정과 한글 텍스트 export fixture 검증 |
| USB/Bluetooth 페달 실장비 검증 | 실제 장비가 보내는 HID key가 제조사별로 다르다. | key mapping resolver, custom dropdown, input diagnostic log가 있다. | 페달 모델별 logical/physical key와 action 결과 기록 |
| 저지연 메트로놈 audio/player/iOS drone parity | audio session, latency, sound asset, background 정책 검증이 필요하다. | Android native 기준음/드론, visual metronome, BPM preset, local linked file metadata는 있다. | audio package/asset 결정, iOS playback bridge, Android/iOS latency QA |

## v1.1 후보

- OCR 기반 PDF 본문 검색.
- 실제 HID key capture 기반 페달 설정.
- SQLite-backed annotation store 또는 inline-to-external migration.
- PDF 표준 annotation embed/export 고도화.
- 기존 폴더 직접 참조(Android SAF/iOS Files) spike.
- 클라우드 동기화, 계정, 서버 저장.
- OS background scheduler 기반 주기적 전체 백업과 cloud sync conflict handling.

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
