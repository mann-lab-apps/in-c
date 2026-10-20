# Clef v1 실기기 QA Runbook

작성일: 2026-08-28

## 목적

Clef v1 RC 실기기 QA 당일에 빌드, 샘플, 장비, 기록 양식을 한곳에서 확인한다. 이 문서는
로컬 자동화로 확인할 수 없는 Android 태블릿, iPad, S Pen, Bluetooth/USB 페달, cloud provider,
실제 CamScanner/object-stream PDF, audio latency를 기록하기 위한 실행표다.

에뮬레이터에서 Codex가 사전에 재현/회귀 확인할 수 있는 항목은
[`clef-v1-emulator-qa-tracker.md`](clef-v1-emulator-qa-tracker.md)에서 따로 관리한다.

## 2026-09-26 다음 배포 준비

- Clef & Staff Android applicationId/namespace는 `com.mannlab.clef`다. in C는 별도 앱이다.
- 이 문서를 읽는 시점에는 반드시 앱 내 `테스트 정보`의 version/build와 설치 파일명을 함께 기록한다.
  현재 Clef 개발선은 `1.0.1+27`까지 올라왔고, 과거 보관 AAB에는 `1.0.0+22`부터
  `1.0.1+26`까지의 산출물이 섞여 있다. 새 내부테스트 배포는 Play Console에서
  미사용 versionCode를 확인한 뒤 새로 빌드한 산출물만 QA 대상으로 삼는다.
- 서명 파일 누락과 디버그 키를 사용한 검증은 의도대로 실패했고, 기존 Clef 업로드 키 검증은 통과했다.
- `android/`에서 `./gradlew :app:verifyClefReleaseSigning :app:validateSigningRelease`로
  앱 빌드 없이 서명을 재확인할 수 있다. 키 파일은 git에 포함하지 않는다.
- 이번 준비 작업에서는 최신 `1.0.1+27` Android AAB를 만들어 실기기 QA 대상으로 삼는다.
  아래 20번 산출물은 과거 기록이며, 최신 코드가 반영된 배포 파일이 아니다. 새 빌드 후 실제
  경로/해시/버전/서명을 기록한다.
- 2026-09-26 `1.0.1+27` 실기기 QA 후보 AAB:
  `apps/in_c_sheet/releases/clef-and-staff-1.0.1+27-release.aab`.
  SHA-256: `1167bdf20c687fbce51775427d8356c5fea0eef561ba3532a56a71be21c3bc5f`.
  `flutter build appbundle --release`와
  `./gradlew :app:verifyClefReleaseSigning :app:validateSigningRelease`가 통과했다.
- 새로운 소스의 실기기 메트로놈, 튜너, 페달, 스타일러스 품질은 별도 QA가 필요하다.
- v1.x 낮은 위험 잔여 항목 중 최근 rail copy, 메트로놈 로컬 phase guard, 드론 음량 표시,
  PDF 공유는 코드/문서상 반영되어 있다. 거리 가독성, 빠른 BPM 청취감, 드론 체감 음량,
  전용 print action 필요성은 실기기/사용자 요구 확인 뒤 판정한다.
- 2026-09-27 이후 로컬 검증된 v1.1 gap 보강분은 아직 새 실기기 QA로 판정하지 않는다.
  linked audio A-B 구간 저장/복원/지우기, 긴 PDF 페이지 탐색 빠른 이동과 page jump point/북마크/리허설
  `표시 지점`, 원본 PDF의 계층형 `PDF 목차 보기`, metadata 추천 필드 `박자`/`출처`/`연도`와 S84 추가 필드, 긴 라이브러리 `빠른 찾기`는
  최신 설치본에서 별도 확인한다. 세트리스트 `목록 복사`는 공유용 manifest에 곡별 파일명,
  시작 쪽, 시간, 메모, 태그/분류, 사용자 필드와 메트로놈 설정이 포함되고 순서/항목이 구조화 가능한
  텍스트로 유지되는지 확인한다. 세트리스트 화면의 `복사한 세트리스트 가져오기`는 붙여넣은 manifest를
  현재 라이브러리 악보와 매칭해 미리 보여주고, 긴 manifest에서는 매칭/확인/후보 중복 요약과
  `외 N곡` 축약이 작은 화면에서 잘 보이는지 확인한다. missing/ambiguous 곡이 있으면 저장하지
  않아야 하며, 같은 제목을 다시 가져오면 안전한 번호가 붙어야 한다. 가져온 세트리스트의 곡별
  메트로놈 BPM/박자/리듬/소리/강세/카운트인도 복사한 값과 같아야 한다. 이 기능은 PDF 파일을 함께
  가져오는 package import가 아니라 이미 라이브러리에 있는 악보를 새 세트리스트로 묶는 lightweight
  import다. PDF를 포함하는 `clef.setlist.package` ZIP은 세트리스트 화면의 `패키지` 버튼에서
  선택해 dry-run preview까지 확인할 수 있다. 세트리스트 상세의 `패키지 내보내기`는 ZIP으로 묶을
  파일 수와 manifest를 먼저 보여준 뒤 공유한다. 완전히 해결된 package는 preview 후 `패키지 가져오기`로
  기존 악보와 package 안 PDF/image/text/ChordPro/DOCX/RTF 파일을 묶은 새 세트리스트를 만들 수 있어야 한다.
  PDF, `.md`, `.onsong`, `.docx`, `.rtf` 악보가 섞인 세트리스트를 package로 내보낸 뒤 다시 가져와 각 항목이 PDF,
  일반 텍스트, ChordPro 또는 문서 추출 텍스트 viewer로 올바르게 열리는지 확인한다. DOCX/RTF 항목은 원본
  reference 연결 파일을 유지해야 한다. 곡별 메트로놈 override가 있는 세트리스트는 BPM, 박자, subdivision,
  소리/음량, 강세 패턴과 카운트인이 package 재가져오기 후에도 같아야 한다. 빈 text, 잘못된 UTF-8 또는 2 MiB 초과
  text가 들어 있는 package는 preview에서 확인 필요로 표시되고 partial import를 시작하지 않아야 한다.
  Image stamp가 든 package를 가져오면 `사용자 스탬프`에서 실제 bitmap을 다시 선택/배치할 수 있어야 한다.
  같은 asset 경로에 다른 local 이미지가 있으면 기존 파일을 덮어쓰지 않고 스탬프 미적용 안내를 보여야 한다.
  Annotation sidecar가 있는 package는 새 PDF/image 악보의 일반 필기와 검증된 image stamp 필기를
  함께 복원하고, 기존 local 악보나 text score sidecar는 preview에서 보호·미적용으로
  구분해 덮어쓰지 않아야 한다. Image stamp 파일이 누락·손상되거나 local 경로에 다른
  파일이 있으면 가져오기를 막고 기존 파일을 보존해야 한다.
  앱에서 만든 package도 PDF/image 악보의 일반 필기 수를 내보내기 preview에 표시해야 한다.
  같은 PDF를 공유하는 songbook 곡에 서로 다른 필기를 넣으면 package에서 악보별 파일/sidecar로 분리되어
  다시 가져온 각 카드에 해당 필기만 복원되어야 한다. 필기가 없으면 source 파일은 한 번만 포함되어야 한다.
  Text/DOCX/RTF 필기는 제외 수와 이유가 보여야 한다.
  정상 image stamp 필기는 포함하되, asset이 누락·손상된 필기는 별도 제외 사유로 표시해야 한다.
  Picker에서 image stamp 정의를 삭제한 뒤에도 이미 찍힌 필기와 bitmap은 package로 복원되되,
  삭제한 정의가 `사용자 스탬프`에 다시 생기지 않아야 한다.
  사용자 image stamp pack은 asset 파일 수도 표시한다.
  256MB를 초과하는 ZIP은 파일 내용을 읽기 전에 안내하고 거부해야 한다. Entry 512개, 단일
  entry 128MB, 전체 해제 크기 256MB 한도를 넘는 조작 ZIP도 import preview 전에 차단되어야 한다.
  저장 실패 후 재시도했을 때 실패한 첫 시도의 악보가 중복 카드로 나타나지 않아야 한다.
  긴 ChordPro 악보는 상단 `구간` 메뉴에서 verse/chorus/bridge 표식을 골라 해당 줄로 이동해야 한다.
  `코드/가사 찾기`에서 코드명, 가사, 구간 이름을 각각 검색해 결과 수, 이전/다음 이동과 현재 줄 강조를 확인한다.
  한글/영문 가사가 섞인 긴 줄을 좁은 폰과 태블릿에서 열어 코드가 해당 가사 segment 위에 붙어 함께
  줄바꿈되는지 확인한다. 반음 이조와 카포 운지 표시 뒤에도 같은 대응 관계가 유지되어야 한다.
- `악보 추가`의 `텍스트/ChordPro/DOCX/RTF 안내`에서 `ChordPro 붙여넣기 미리보기`를 열고 간단한
  ChordPro 텍스트를 붙여넣어 제목/작곡가/조성/박자 metadata chip과 코드/가사 preview가 보이는지
  확인한다. `악보로 저장`을 누르면 라이브러리에 ChordPro 악보가 생기고, 열었을 때 PDF viewer가 아닌
  읽기 전용 ChordPro 코드/가사 viewer로 들어가야 한다.
- 같은 안내에서 `ChordPro 파일 선택 가져오기`를 실행해 `.chordpro` 또는 `.onsong` 샘플을 고른다.
  성공 후 라이브러리 카드가 생기고 읽기 전용 ChordPro viewer로 열려야 한다.
- 같은 안내에서 `텍스트 파일 선택 가져오기`로 `.txt` 또는 `.md` 샘플을 고른다. 파일명 기반 제목의
  라이브러리 카드가 생기고, 열었을 때 PDF viewer가 아닌 선택 가능한 텍스트 viewer가 표시되어야 한다.
  `원문 편집`으로 내용을 저장하면 즉시 다시 표시되고, 취소·빈 원문·저장 실패에서는 기존 파일과
  라이브러리 정보가 유지되어야 한다. 빈 파일과 2 MiB 초과 파일은 저장되지 않아야 한다.
- 일반 텍스트 viewer의 `글자 크기`를 85/100/115/130%로 바꾸고 본문이 즉시 바뀌는지 확인한다. 앱을
  닫았다가 같은 악보를 다시 열어도 선택값이 유지되어야 한다. DOCX/RTF 추출 viewer에서도 크기 조정은
  가능하되 `읽기 전용` 표시와 검색은 유지되어야 한다. 태블릿 스탠드 거리와 큰 시스템 글자에서 130%가
  AppBar 또는 본문을 겹치게 하지 않는지 확인한다.
- 같은 안내에서 문단, 표, 번호 목록, 불릿과 이미지가 섞인 `.docx` 샘플을 가져온다. core title/creator가 있으면 제목/작곡가로
  반영되고 문단 텍스트와 표의 행/열 관계는 읽기 전용 viewer로 열려야 한다. 표의 행은 줄바꿈, 열은 tab,
  한 셀의 여러 문단은 구분자로 표시되고 기본 번호/불릿 목록은 순서와 중첩을 알아볼 수 있어야 한다. 원본 DOCX는 reference 연결 파일과 전체 백업에
  남아야 한다. 같은 안내에서 Unicode와 이미지가 섞인 `.rtf` 샘플도 가져와 문단 텍스트와 원본 reference가
  남는지 확인한다. DOCX 병합 셀과 시각적 표 layout, 사용자 정의 번호 모양, DOCX/RTF 이미지, 각주, 글꼴/서식은 재현을 보장하지 않는다.
- 저장된 ChordPro viewer에서 `반음 올림`/`반음 내림`, `카포 올림`/`카포 내림`, `원래대로`, `카포 운지`를 눌러 조성 chip과
  코드 표시가 바뀌는지 확인한다. 카포 위치는 0-12 범위를 벗어나지 않아야 한다. 앱을 닫았다가 같은 ChordPro 악보를 다시 열었을 때 표시 조정이
  유지되어야 한다. `원문 편집`에서 코드/가사를 바꾸고 저장하면 화면이 즉시 갱신되어야 하며, 라이브러리에서 별도로 정리한 제목/작곡가는
  원문의 directive 변경만으로 바뀌지 않아야 한다. 빈 원문은 저장되지 않아야 하고 취소하면 기존 파일을 유지해야 한다.
- 태블릿 너비에서 ChordPro viewer의 `단 구성`을 `2단`으로 바꾸면 `{colb}`가 있는 악보는 해당 표식부터 오른쪽 단으로,
  표식이 없는 악보는 가운데에 가까운 구간 표식부터 나뉘어야 한다. 2단에서도 이조/카포, 구간 이동, 코드/가사 찾기가
  계속 동작해야 한다. 같은 악보를 좁은 폰에서 열면 1단으로 안전하게 표시되고, 다시 태블릿에서 열면 저장한 2단 설정이 복원되어야 한다.

## 10-15분 RC Smoke 결과표

오늘 실기기 QA는 아래 표를 먼저 채운다. 로컬 자동 테스트나 에뮬레이터 확인만으로 `PASS`를
쓰지 않는다. 시간이 부족하면 `NOT TESTED`로 남기고, 계속 확인 중이면 `DEVICE QA CONTINUES`로
기록한다.

| 영역 | 빠른 확인 | 상태 | 기록할 정보 |
| --- | --- | --- | --- |
| 설치/첫 실행 | 앱 이름 `Clef & Staff`, 테스트 정보 version/build, 홈 진입 | NOT TESTED | 설치 파일, 기기/OS, buildCode |
| PDF 가져오기/뷰어 | 평소 쓰는 PDF 1개 import, 좌/우 tap, swipe, 마지막 위치 | NOT TESTED | PDF 유형, page 수, blank/crash 여부 |
| 50쪽 이상 PDF | 큰 PDF 첫 렌더, page 이동, 북마크/리허설 `표시 지점` chip과 목록 row, 배경/여백 | NOT TESTED | 렌더 지연, blank page, paper/white 체감, 원하는 지점 찾기 |
| 세트리스트 | bulk add, drag reorder, 최근 세트리스트, 복사 manifest 붙여넣기 import, ZIP package export/import, 이전/다음 곡, 다음 곡 제목 힌트 | NOT TESTED | 곡 수, 중복/건너뜀 안내, 긴 manifest 요약, missing/ambiguous match 차단, 같은 제목 import suffix, package export가 공유 전 preview를 거치는지, package import가 preview 확인 뒤 새 악보/세트리스트를 만드는지, 진행 위치, 다음 곡 예측 가능성 |
| 라이브러리 긴 목록 | 검색/필터, metadata 추천칩, `빠른 찾기` 첫 글자 그룹 | NOT TESTED | 곡 수, 그룹 수, phone/tablet 가독성, 원하는 악보 찾기 체감 |
| 필기/S Pen | pen/highlighter/text/eraser, 스탬프 검색/카테고리 칩/최근 사용/빠른 선택, text/icon/image 사용자 스탬프, active layer 선택/추가/표시/PDF 포함 토글, 텍스트/스탬프 미세 이동, undo/redo, palm rejection | NOT TESTED | S Pen/손 입력 충돌, image picker provider, 최근 스탬프 복원, layer 전환 뒤 새 필기 저장/재열기 |
| 메트로놈 빠른 BPM | 120/180/240 BPM, 4/4·6/8, 8분·3연·16분 | NOT TESTED | 스피커/이어폰/Bluetooth, 끊김/밀림/강세 |
| 연결 오디오/A-B | 연결 파일 목록의 오디오/PDF/이미지 구분, 저장된 A-B 구간 표시, linked audio 재생, A/B 초 입력, 저장된 구간/새 구간 구분, 저장/재열기, `구간 지우기`, 잘못된 구간 안내 | NOT TESTED | MP3/M4A/WAV, 이어폰/스피커, loop timing, 저장/입력 실패 안내 체감 |
| 드론/기준음 | 기준음/5도/옥타브, 앱 음량, 기기 미디어 음량 | NOT TESTED | 이어폰/스피커/연습실, 작은 소리 여부 |
| 튜너 | 기타/목소리/스피커 입력, 주변 소음, pitch chart | NOT TESTED | 기준 앱 대비 cents, 흔들림/latency |
| 페달/키보드 | Arrow, PageUp/PageDown, Space, Shift+Space | NOT TESTED | 장비명, key, 기기 리포트 감지 결과, 실제 악보 화면의 페이지 단위 이동, PDF nudge-scroll 여부, 곡 처음/끝 안내 |
| Import/export/backup | PDF 공유, 필기 포함 공유, metadata backup/restore | NOT TESTED | 공유 대상, 필기 포함 여부, 복원 결과 |

상태 값은 `PASS`, `ISSUE`, `DEVICE QA CONTINUES`, `BLOCKER`, `NOT TESTED` 중 하나만 쓴다.
`ISSUE`와 `BLOCKER`는 재현 단계, 기대 결과, 실제 결과, 스크린샷/화면녹화 가능 여부를 아래 기록
양식으로 남긴다.

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

- 현재 소스 앱 버전: `1.0.0+20`.
- 앱 이름/런처 label은 `Clef & Staff`이다.
- 추가 확인 대상: 렌더링 프리셋 아이콘 구분, 튜너 첫 화면 자동 시작/핵심 UI 노출, 중복 라이브러리
  생성 안내, 일반 화면 `악보 추가` 상단 단일 CTA.
- 최신 내부테스트 AAB 후보는 `1.0.0+20`이며, 튜너 간결화, 입력 안정화, pitch history chart,
  앱 label, 세트리스트 dialog 안정화, 최근 세트리스트 overflow hotfix를 포함한다.

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
- Text/ChordPro/DOCX/RTF 악보 샘플 1개씩. 일반 Text는 파일 선택 저장/카드 노출/읽기 viewer 진입과
  악보별 85/100/115/130% 글자 크기 복원을 확인하고,
  DOCX/RTF는 추출 텍스트 viewer와 원본 reference 보존을 확인한다. ChordPro는 붙여넣기와 파일 선택 모두에서 metadata/preview 또는 저장/카드 노출/읽기 viewer 진입,
  곡별 저장형 transpose/capo shape 전환까지 확인한다.
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

1. Android debug APK 또는 내부테스트 AAB 설치 후 첫 실행, 테스트 정보 화면, 피드백 템플릿 복사를
   확인한다.
2. Android release APK 또는 AAB 설치 경로가 있으면 같은 smoke flow를 반복한다.
3. 홈 `메뉴` > `도움말/피드백`에서 작업별 도움말과 마케팅/지원/개인정보 URL이 보이고
   `기기 리포트 만들기`로 바로 성능 리포트 화면에 들어가는지 확인한다. `리포트 복사` 또는
   `리포트 공유`로 Markdown 결과를 남긴다.
4. iOS TestFlight 또는 local no-codesign build에서 Files open-in, PDF/JPG/PNG import, viewer
   rotation/two-page rendering을 확인한다.
5. PDF import/viewer/search/export/backup 기본 흐름을 `clef-v1-rc-qa-plan.md` 순서대로 실행한다.
   백업 메뉴의 `백업 상태`에서 자동 정보 snapshot, 최근 수동 백업 기록, PDF 포함 전체 백업의
   차이가 명확한지 확인하고, cloud sync 완료처럼 보이면 문구/위치를 기록한다.
   `자동 정보 복원` 확인 dialog가 현재 metadata와 자동 snapshot의 변경 요약을 먼저 보여주는지
   확인한다. 복원 확정 전에는 라이브러리 데이터가 바뀌지 않아야 한다.
   `정보 복원`은 JSON 선택 뒤 악보/세트리스트 수와 변경 요약을 먼저 보여야 하며, invalid/unsupported
   JSON은 복원을 시작하지 않아야 한다.
   `전체 백업 복원`은 ZIP 선택 뒤 악보/세트리스트/파일 항목 수, 변경 요약, 누락 파일 경고를 먼저
   보여야 하며, 손상 ZIP은 현재 라이브러리를 바꾸지 않아야 한다.
6. S Pen pressure, palm rejection, 필기/스크롤 충돌을 집중 확인한다.
7. Bluetooth/USB 페달과 hardware keyboard를 연결해 predefined/custom/unknown inputId mapping을
   확인한다.
8. Cloud provider PDF를 online/offline 상태에서 가져오고 실패 문구를 기록한다.
9. 실제 CamScanner/object-stream PDF에서 URL link count, sanitizer 결과, 원본 linked file 보존을
   기록한다.
10. 긴 라이브러리 샘플이 있으면 검색/필터와 `빠른 찾기` 첫 글자 그룹으로 원하는 악보를 찾는
    데 시간이 줄어드는지 기록한다.
11. 기준음/드론, linked audio A-B loop, local audio playback, tuner latency와 no-signal behavior를
    기록한다.
12. blocker/high/medium/low/v1.1 spike 기준으로 이슈를 분류하고 sample file 공유 가능 여부를 남긴다.

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

Folder connection / direct folder spike:

- Android Files와 iOS Files에서 `여러 악보 파일 가져오기`로 PDF, `.txt`/`.md`, ChordPro, DOCX, RTF를
  섞어 선택한다. 저장 전 각 형식과 전체 개수가 보이고, 확인 후 모두 기존 viewer로 열려야 한다. iCloud
  Drive/Google Drive처럼 내려받기가 필요한 provider도 확인하되 접근 불가 파일이 있으면 부분 카드나 성공
  안내가 남지 않아야 한다. Preview의 세트리스트 추가 옵션을 켜고 기존/새 목록을 각각 골라 전체 순서와 중복
  제외 안내를 확인한다. 대상 선택 취소나 세트리스트 저장 실패에는 가져온 악보가 라이브러리에 유지되어야 한다.
  이 흐름은 일회성 파일 선택이며 폴더 연결/자동 동기화로 기록하지 않는다.
- 현재 구현은 persistent direct score가 아니라 Android `연결된 폴더에서 악보 고르기`의 재사용 가능한
  read-only catalog와 copy-on-select다. Android 외 플랫폼에는 이 import action을 노출하지 않는다.
- 폴더를 처음 연결하고 앱을 완전히 종료/재시작한 뒤 같은 폴더가 목록에 남아 다시 열리는지 확인한다.

- 연결 해제 후 목록에서 사라지는지, 마지막 연결 해제 직후 새 picker가 강제로 열리지 않는지 확인한다.
- Android 설정/파일 provider에서 권한을 회수하거나 폴더를 제거한 뒤 `사용할 수 없는 폴더`로 표시되고
  연결 해제는 가능한지 확인한다. 앱/라이브러리 데이터가 삭제되면 안 된다.
- persistable permission을 제공하지 않는 provider는 이번 가져오기는 허용하되 재시작 후 연결 목록에
  남지 않고 일회성 사용 안내를 보여야 한다.
- Android 태블릿에서 권한 승인/취소, 빈 폴더, 201개 이상 폴더, 읽기 실패, 기존 및 폴더 내 중복 파일명,
  미지원 형식이 라이브러리를 변경하지 않고 안내되는지 확인한다.
- 선택한 항목 중 중복/읽기 실패/미지원/stale 항목이 섞이면 실제 복사 전에 차단되어야 한다.
- ready로 보였던 항목 하나가 provider offline/권한 문제로 실제 복사에 실패하면 임시 사본이나 부분 import가
  남지 않고 실패 안내가 보여야 한다.
- PDF, `.txt`, `.md`, ChordPro, DOCX, RTF를 섞어 선택하면 각 형식의 기존 viewer로 모두 열리고 원래
  확장자와 folder/provider provenance가 유지되어야 한다. 손상 파일 하나를 섞으면 부분 카드나 성공 안내가
  남지 않아야 한다.
- 선택한 악보는 원본 폴더를 직접 참조하지 않고 기존 import pipeline으로 앱 내부에 복사되어야 한다.
- 가져온 뒤 Android 파일 앱에서 원본을 rename/delete해도 Clef 안의 사본이 계속 열려야 한다.
- 가져온 원본의 크기 또는 수정 시각을 바꾸고 같은 연결 폴더를 다시 열면 `원본 변경` 개수와 자동으로
  덮어쓰지 않는다는 안내가 보여야 한다. 해당 파일은 선택할 수 없어야 하며 `기존 악보 열기`는 정확히
  매칭된 앱 내부 악보를 열어야 한다. 기존 악보 내용, metadata, 필기는 그대로 유지되어야 하며 이 확인을
  자동 동기화 성공으로 기록하지 않는다.
- 변경된 PDF/plain text/ChordPro/DOCX/RTF 행의 적용을 취소하면 기존 악보가 그대로여야 한다. 승인하면
  새 사본이 각 형식의 기존 viewer로 열리되 제목, metadata, 필기, 세트리스트 참조가 유지되고 이전 파일은
  연결 파일에 남아야 한다. DOCX/RTF는 새 추출 텍스트가 보이고 새 원본 reference가 `Reference`로 하나만
  남으며 이전 추출본과 원본은 `Edited copy`로 보존되어야 한다. 다른 형식으로 바꿔치기하거나 provider
  오류/권한 회수/저장 실패가 발생하면 성공 안내나 부분 교체가 없어야 한다. 이 검증을 자동 동기화나 direct
  reference로 기록하지 않는다.
- 교체된 plain text/ChordPro 또는 DOCX/RTF 추출 텍스트의 이전 `Edited copy`를 연결 파일 목록에서 열면
  `읽기 전용 사본`으로 표시되고 선택 가능한 본문이 보여야 한다. 닫은 뒤 현재 악보 내용과 출처가 바뀌지
  않아야 한다. 보존된 DOCX/RTF 원본 reference 자체가 앱 안에서 열릴 것이라고 기대하지 않는다.
- 가져온 악보의 `정보 편집`에서 `가져온 위치`가 folder/provider와 원본 파일명을 읽기 전용으로 보여주는지 확인한다.
- 앱을 재시작하거나 metadata backup을 복원한 뒤에도 이 출처 hint가 유지되는지 확인한다.
- 출처 표시는 파일명/provider/folder/size/수정 시각 같은 hint만 사용하고, SAF document token/URI는 백업이나
  지원 보고 텍스트에 그대로 노출되지 않아야 한다. 연결 목록 자체도 backup/restore 대상이 아니어야 한다.
- 원본 폴더 삭제/rename이 이미 가져온 Clef 악보 삭제로 이어지면 안 된다.

Leader/follower preparation:

- `도움말/피드백 > 개발자용 협업 시뮬레이션`을 열고 화면에 실제 태블릿 연결이나 페이지 전송을 하지 않는다는
  안내가 먼저 보이는지 확인한다. 일반 공연 기능이 아니라 개발자용 사전 점검으로 이해되어야 한다.
- 정상 세트리스트를 골라 QR/code, 전체 악보 보유 preflight와 로컬 시뮬레이션을 실행한다. 각 곡의 저장된 쪽,
  연결 끊김, 다음 event 복구가 단계별 report에 나타나는지 확인한다.
- 세트리스트가 참조하는 악보 하나를 라이브러리에서 제거한 fixture에서는 누락 경고가 보이고 시작 버튼이
  비활성화되어야 한다. 이 결과는 Wi-Fi/Bluetooth 연결, camera QR scan, 지연·재연결 품질을 검증하지 않는다.

Long library navigation:

- 현재 설치본 version/build와 라이브러리 곡 수.
- 제목 첫 글자가 2개 이상이고 12곡 이상일 때 홈에 `빠른 찾기`가 보이는지.
- `A 6`, `B 6`처럼 첫 글자와 곡 수가 실제 목록과 맞는지.
- 칩을 눌렀을 때 해당 그룹의 악보만 sheet에 보이고, 선택한 악보가 바로 열리는지.
- 검색/즐겨찾기/태그/작곡가/컬렉션/그룹/별점/custom field 필터 적용 상태에서도 현재 목록 기준으로
  그룹이 만들어지는지.
- 작은 phone 세로, Android tablet/iPad 가로, 큰 글씨에서 칩이 잘리지 않고 가로 스크롤로 접근 가능한지.

Metadata cleanup:

- 가져온 직후 `정보 정리 필요` 작업 패널이 일반 `최근 악보`/`최근 세트리스트` 열기 rail과
  혼동되지 않는지.
- 패널 header 설명이 “악보를 여는 곳”이 아니라 “제목/작곡가를 보강할 작업”으로 읽히는지.
- 카드가 `정보 보강` badge와 `정보 편집` 버튼을 보여 일반 악보 카드의 바로 열기 affordance와
  시각적으로 구분되는지.
- task card의 score title/file fallback을 눌렀을 때 악보 viewer가 아니라 `악보 정보 편집` sheet로
  들어간다고 예측할 수 있는지.
- `최근 악보`, `최근 세트리스트`, `고정`, `즐겨찾기` rail은 여전히 일반 악보/세트리스트 열기 카드로
  보이며 `정보 정리 필요`와 섞이지 않는지.
- phone 세로, Android tablet/iPad 가로, 큰 글씨에서 `정보 보강` badge, 제목, file fallback,
  `정보 편집` 버튼이 잘리지 않는지.
- 악보 정보 편집과 선택 악보 일괄 편집에서 `조성`, `박자`, `조표`, `장르`, `앨범`, `난이도`,
  `편성`, `출처`, `출처 유형`, `연도`
  추천칩이 보이고, 값 입력 후 검색/필터/facet에서 찾을 수 있는지.
- 같은 사용자 필드에 이전에 입력한 값이 `이전에 쓴 값` 칩으로 제안되고, 개별/일괄 편집에서 바로
  재사용할 수 있는지.
- 사용자가 직접 만든 custom field와 추천칩이 충돌하지 않는지.

CamScanner/object-stream PDF:

- page count, file size, URL link count, sanitizer removed/remaining count.
- sanitizer 실패/부분 성공 시 원본 linked file 보존 여부.
- compact rewrite/object stream 잔존 여부는 sample 확보 후 v1.1/blocker로 기록한다.

iPad/iOS smoke:

- TestFlight/local build, Files open-in, PDF/JPG/PNG import.
- iCloud Drive/On My iPhone/Downloads 위치별 접근.
- 화면 회전, two-page rendering, share sheet 후보.

Audio/tuner:

- 먼저 홈 `메뉴` > `개발자용 기기 리포트`에서 `Tuner setup`과 `Drone setup` 줄을 확인한다.
  `Tuner setup`은 A4 기준, 감지 엔진, 표기, chromatic-only 상태를 기록해야 한다.
  `Drone setup`은 drone mode, concert note/frequency, volume, 0%/고음량 다성 clipping-risk를
  기록해야 한다. 이 두 항목의 PASS는 설정 위험도가 낮다는 뜻이며 실제 음량/정확도 PASS가 아니다.
- tuner no-signal behavior, 가장 가까운 chromatic note/cents 표시, 440/441/442Hz A4 quick
  action/history, reference tone frequency/cents, 세부 설정의 감지 엔진(`자동`, `기존`, `정밀 후보`)과
  감지 진단 label.
- 기타 줄 맞춤, Guitar/Bass/Ukulele/Mandolin/Strings/Bb/Eb/F preset, Target mode shortcut,
  target lock은 v1 UI에서 보이지 않는지 확인한다.
- 실제 악기 입력 시 note/cents 흔들림, pitch history chart 흐름, 소음 환경에서 note label 튐 여부.
- reference tone/drone 재생/정지, volume, A4 변경 반영, latency 체감. 이어폰/스피커/Bluetooth/연습실
  각각에서 음량, clipping, 시작/종료 잡음, drone mode별 밸런스를 기록한다.
- linked audio는 연결 파일 목록에서 PDF/이미지/오디오가 구분되는지 확인한 뒤, MP3/M4A/WAV별로
  재생/정지, A/B 초 입력, sheet 닫기/다시 열기 후 구간 복원, `구간 지우기` 후 재진입 시
  입력값이 사라지는지 확인한다. 숫자가 아닌 값, 비어 있는 값, B가 A보다 작거나 같은 값이
  재생 전에 이해 가능한 안내로 막히는지 확인한다.
  이어폰/스피커/Bluetooth에서 loop가 갑자기 끊기거나 밀리는지 기록한다.
  waveform timeline/tempo/pitch shift는 아직 후속 범위다.
- 필기 layer를 둘 이상 만든 뒤 stroke/text/image stamp를 한 layer에 추가하고 `현재 layer 주석 모두 이동`으로
  다른 layer에 옮긴다. 이동 개수, 확인 dialog, 원래 layer의 빈 상태, 대상 layer의 표시/PDF 포함 설정,
  앱 재시작 후 저장 상태를 확인한다. 이 검증은 임의 객체 multi-select 지원으로 기록하지 않는다.
- 메트로놈 BPM/박자, 8분/3연/16분 subdivision, 첫 박 강조, Tap tempo, tick sound, viewer mini
  panel 전환과 장시간 사용 중 page turn/tap zone 충돌 여부.
- 다중 선택 bulk setlist add, 세트리스트 drag reorder, 최근 세트리스트 rail, tap zone hint,
  paper/white viewer background가 실제 태블릿 화면에서 이해되는지.
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
Pitch history chart 읽기 쉬움: 예 / 아니오
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
- v1.1 spike: OCR, HEIC native conversion, PDF standard annotation external-viewer compatibility, HID capture wizard,
  SAF/iOS Files direct folder, iOS Share Extension, font embedding, cloud sync, page별 live rotation.

## Annotation layer management QA

자동 테스트는 active layer 선택/추가/이름 변경/삭제, 기존 annotation의 layer 이동 sheet와
재키잉 helper, 삭제 후 annotation fallback을 검증한다.
실기기에서는 stylus 입력 중 layer를 바꾸는 손맛과 실수 가능성을 확인한다.

1. 필기 toolbar의 layer 메뉴에서 새 layer를 만들고 선택한다.
2. 새 layer에 펜/텍스트/스탬프를 하나씩 추가한 뒤 표시/숨김과 PDF 포함/제외 토글을 확인한다.
3. layer 이름을 변경하고, toolbar와 메뉴 label이 함께 갱신되는지 확인한다.
4. 기존 텍스트/스탬프/도형을 탭해 `다른 layer로 이동`을 열고 현재 layer가 아닌 대상만 보이는지 확인한다.
   이동 뒤 대상 layer의 표시/숨김과 PDF 포함/제외 상태가 기존 규칙대로 적용되어야 한다.
5. 서로 다른 두 layer에 필기/스탬프를 추가한 뒤 현재 선택한 layer에서 undo/redo를 실행한다.
   다른 표시 layer의 annotation이 바뀌지 않아야 하고, 숨긴 layer annotation은 undo/redo 대상이 아니어야 한다.
6. non-default layer를 삭제하고, 해당 layer에 있던 annotation이 사라지지 않고 기본 필기로 보이는지 확인한다.
   앱 재시작 후에도 삭제된 layer 이름이 다시 나타나지 않고 해당 annotation이 기본 필기로 남아야 한다.
6. 기본 필기는 삭제/이름 변경 대상이 아니어야 한다.

## Image stamp import QA

자동 테스트는 image stamp asset copy, metadata 저장/복원, full backup asset byte round-trip,
picker 선택을 검증한다. 실기기에서는 Android/iOS 파일 선택 provider와 권리 안내 copy가 자연스러운지 확인한다.

1. 직접 만든 작은 PNG/JPEG/WebP 파일을 준비한다.
2. 필기 toolbar에서 `스탬프` > `사용자 스탬프` > `이미지 스탬프 추가`를 연다.
3. 파일 선택 후 이름 dialog가 뜨고, 저장하면 `사용자 스탬프` 섹션에 표시되는지 확인한다.
4. 2MB 초과, 2048px 초과, GIF/unsupported 파일은 실패 안내를 보여야 하며 built-in stamp picker가 계속 동작해야 한다.
5. 악보 위를 탭해 image stamp를 배치하고 실제 bitmap으로 보이는지 확인한다. 이미지 파일이 삭제되거나
   읽히지 않는 경우 label fallback으로 보이는지 기록한다.
6. 앱을 재시작하거나 같은 라이브러리를 다시 열어 image stamp metadata와 배치된 annotation이 유지되는지
   확인한다.
7. 가능하면 full backup ZIP을 만들고 새 설치/빈 라이브러리에 복원해 image stamp가 다시 bitmap으로
   보이는지 확인한다.
8. `필기 포함 PDF 공유/인쇄`의 일반 고정 사본을 만들어 PNG/JPEG/WebP image stamp가 label만이 아니라
   실제 bitmap으로 보이는지 확인한다. 누락/깨진 asset은 label fallback으로 기록한다.
9. 편집 가능한 PDF 주석 사본도 만들어 PNG/JPEG/WebP image stamp가 `/Stamp` annotation으로 남는지 확인한다.
   누락/깨진 image stamp만 있는 경우에는 편집 가능한 사본을 만들지 않고 일반 사본 선택 안내가
   나와야 한다. Acrobat/Preview/MobileSheets/Piascore/Android PDF viewer에서 보이지 않거나 선택/이동이 이상하면
   호환성 ISSUE로 기록한다.

## Editable PDF annotation export QA

앱 내부 자동 테스트는 standard export PDF가 다시 열리고 `/Ink`, `/Line`, `/Square`, `/FreeText`,
`/Stamp` annotation subtype, Clef `/NM` 이름, contents, generated appearance를 포함하는지 확인한다.
실제 상용 호환성은 아래 viewer에서 별도 확인한다. 수동 확인용 PDF와 report template은 `apps/in_c_sheet`에서
`dart run tool/generate_pdf_annotation_compatibility_fixture.dart`로 생성한다. 기본 출력은
`.dart_tool/clef-pdf-compatibility/clef-editable-annotation-compatibility.pdf`와
`.dart_tool/clef-pdf-compatibility/clef-editable-annotation-compatibility-report.md`이며
pen/highlighter, pressure-sensitive pen, line/arrow, rectangle, hairpin, staff/grid, free text, text stamp,
music-symbol stamp, PNG/WebP image stamp를 포함한다.
외부 기기로 전달할 때는 같은 폴더의
`.dart_tool/clef-pdf-compatibility/clef-editable-annotation-compatibility-bundle.zip`을 사용한다.
ZIP에는 mixed annotation, Unicode FreeText, `3, 1, 2` 순서로 재정렬한 뒤 2쪽에 90-degree rotation/offset-CropBox를 적용한 fixture PDF와 상대 경로를 사용하는 report가 함께 있어 압축을 푼 위치가 바뀌어도
report 파일 기준으로 artifact를 찾는다.
Report의 `Fixture artifacts` 표에는 세 PDF의 절대 경로와 SHA-256이 기록된다. 외부 앱에서
확인한 PDF와 report가 같은 세트인지 유지하고, `--review-report`가 `Missing fixture artifacts`나
`Fixture SHA-256 mismatches`를 출력하면 fixture를 다시 생성하거나 올바른 파일을 함께 전달한다.
생성 도구는 외부 앱 확인 전에 Clef annotation 이름 중복, 0 이하/페이지 밖 rectangle,
`/A` 또는 `/AA` action, Print/Hidden/NoView flag를 검사한다. `Duplicate names`,
`Out-of-page names`, `Action-bearing names`, `Non-printable names`, `Hidden names`가 모두
빈 목록이어야 fixture를 외부 viewer QA로 넘긴다.
생성 report에는 원본과 출력의 PDF/A-2b error/warning 개수와 출력에서 새로 생긴 finding도
따로 기록된다. `Introduced PDF/A-2b errors/warnings`가 `none`이 아니면 외부 확인 전에 원인을
검토한다. 채운 report의 `--review-report` 검사도 이 finding을 출력하고 종료 코드 2를 반환한다.
다만 이 비교는 정식 PDF/A 인증이 아니며, 현재 validator는 annotation appearance
stream 안의 font resource를 순회하지 않는다. 따라서 PDF/A delta가 깨끗해도 아래 embedded-font
검사와 Unicode glyph 외부 확인은 그대로 수행한다.
같은 도구는 한글/음악 기호 FreeText 표시만 따로 볼 수 있는
`.dart_tool/clef-pdf-compatibility/clef-unicode-freetext-appearance.pdf`도 생성한다.
도구 출력에 `Unicode FreeText contents require external render QA`가 나오면 `/Contents` 보존은
로컬 검사에서 통과했지만 실제 glyph 표시가 viewer별로 달라질 수 있다는 뜻이다. 이어지는
`Unicode FreeText annotations without embedded fonts` 목록이 비어 있지 않으면 해당 주석은 실제
embedded font 없이 viewer font fallback에 의존하므로 Unicode 표시를 반드시 별도 확인한다.

1. 샘플 악보에 pen/highlighter, arrow/line, rectangle, text note를 추가한다.
2. layer export flag가 켜진 상태와 꺼진 상태를 각각 확인한다.
3. `필기 포함 PDF 공유/인쇄`의 editable/standard export 경로가 노출된 빌드라면 standard 사본을 만든다.
   Export mode 선택 화면에서 일반 사본은 제외될 한글/기호 텍스트 수, editable 사본은 viewer 글꼴에
   의존할 한글/기호 수를 표시하는지 확인한다. `PDF 포함`을 끈 layer의 주석은 이 수에서 제외되어야 한다.
   한글/음악 기호 주석이 있고 embedded font를 쓰지 않은 경우 앱이 글꼴 미포함 주석 개수와 PDF 앱마다
   표시가 달라질 수 있다는 안내를 보여주는지 확인한다. 글꼴 preflight가 실패한 빌드에서는 파일 생성
   성공을 알리지 않고 일반 사본 선택 안내가 나와야 한다.
4. 생성 PDF를 Acrobat, macOS Preview, MobileSheets, Piascore, Android PDF viewer 중 가능한 viewer로 열어 annotation이 보이고 선택/편집 가능한지 기록한다.
   생성된 report template의 viewer matrix를 `PASS` / `ISSUE` / `BLOCKED` / `NOT_TESTED`로 채운 뒤 결과를 공유한다.
   report의 `Required external checks`에는 viewer별로 꼭 확인할 항목이 분리되어 있으므로, 보이는지만 확인하지 말고
   선택/이동/편집 가능 여부, text stamp, music-symbol stamp, PNG image stamp, WebP image stamp와
   Unicode glyph 표시를 별도 열로 남긴다.
   `Completion gate`가 남아 있는 동안에는 external compatibility를 완료로 표시하지 않는다. 모든 viewer row의 필수
   cell이 `PASS`이고 `ISSUE`/`BLOCKED`/`NOT_TESTED`가 없어야 하며, 각 viewer row에는
   `Result notes` 또는 `Required external checks`의 `Evidence link / screenshot` 칸에 screenshot path,
   앱 버전, 기기명 또는 확인 메모 같은 evidence가 있어야 통과로 본다. `Unicode text`를 `PASS`로 두는
   viewer row는 notes 또는 evidence path에 Unicode/glyph/font/한글 표시 확인 근거를 명시해야 한다.
   채운 report는 `dart run tool/generate_pdf_annotation_compatibility_fixture.dart --review-report <report.md>`로
   다시 확인할 수 있다. 이 명령이 `Unknown viewer rows` 또는 `NOT READY`를 출력하면 viewer 이름 오타,
   미지원 viewer 행, 외부 뷰어 호환성 미확인/이슈로 분리해 릴리즈 노트에 남긴다. `Invalid status cells`가
   나오면 `PASS`/`ISSUE`/`BLOCKED`/`NOT_TESTED` 중 하나로 고쳐 다시 검사한다. 완전한 PASS report는
   종료 코드 0, unknown viewer/invalid status/미완료 gate가 있는 report는 종료 코드 2를 반환하며 이
   CLI 계약은 temporary report를 사용하는 회귀 테스트로 확인한다.
5. hairpin/staff/grid/text-template stamp가 editable standard annotation으로 보이고 선택 가능한지 확인한다.
   pressure-sensitive pen은 가는 시작점과 굵은 중간 구간이 하나의 `/Ink` annotation으로 보이는지도 확인한다.
6. Image stamp가 standard mode에서 FreeText로 잘못 분류되지 않고 `/Stamp`로 남는지 확인한다.
   별도 WebP image stamp 사본을 만들 수 있으면, PDF 안에서는 PNG appearance로 보이더라도 `/Stamp`
   annotation으로 남는지 함께 확인한다.
7. 한글 FreeText/text stamp와 음악 기호가 실제 viewer에서 깨지지 않는지 확인한다. 로컬 Poppler 렌더는
   Helvetica/Identity encoding 경고와 한글 glyph box가 나올 수 있으므로 contents 보존 PASS와 표시
   호환성 ISSUE를 분리해 기록한다.
8. 원본 PDF에 `/Rotate` 또는 offset CropBox가 있는 페이지에도 좌상단/중앙/우하단에 선과 텍스트를 놓고
   editable/일반 사본을 만든다. 원본 앱 화면과 외부 viewer에서 위치와 방향이 같아야 하며, 회전 전
   PDF 좌표와 화면 좌표를 혼동해 반대 모서리로 이동하면 ISSUE로 기록한다.
   생성한 reordered/rotated/cropped fixture에서는 2쪽만 열어 TL / CENTER / BR와 두 대각선이 같은 화면 위치에 있는지 확인한다. 1쪽과 3쪽에 이 Clef annotation이 나타나면 ISSUE로 기록한다.

기록:

```text
Export mode: flattened / standard
Viewer: Acrobat / Preview / MobileSheets / Piascore / Android viewer / 기타
Ink visible/editable:
Line/arrow visible/editable:
Rectangle visible/editable:
FreeText visible/editable:
Text stamp visible/editable:
Music-symbol stamp visible/editable:
PNG image stamp visible/editable:
WebP image stamp visible/editable:
Unicode text visible:
Evidence path / notes:
Layer export flag 반영:
원본 PDF 보존:
Local inspection PASS:
문제/스크린샷:
```

## QA 후 정리

1. blocker는 RC release gate로 분리한다.
2. high/medium은 재현 단계와 sample availability를 확인해 RC fix 후보로 분류한다.
3. 외부 샘플, 장비, 플랫폼 계정이 없으면 blocker 해제 조건을 적고 v1.1 spike backlog와 연결한다.
4. 통과한 build 산출물과 실패한 산출물은 `clef-v1-rc-qa-plan.md` 검증 기록에 반영한다.

## 2026-09-07 내부테스트 산출물

- 당시 소스 QA 대상: `Clef & Staff` `1.0.0+20`.
- 당시 Play Console 업로드 후보:
  `apps/in_c_sheet/releases/clef-and-staff-1.0.0+20-release.aab`.
- 원본 Flutter 산출물: `apps/in_c_sheet/build/app/outputs/bundle/release/app-release.aab`.
- 파일 크기: 약 68MB.
- SHA-256: `ca67319a8d4613ceda52af3473b8826831efc279ee6e8056b86a709207d8e346`.
- upload key SHA1: `4C:78:A9:1A:12:98:5C:CE:7B:CE:3E:C0:61:A9:CE:08:F1:7C:A1:B9`.
