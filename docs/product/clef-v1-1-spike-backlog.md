# Clef v1.1 Spike Backlog

작성일: 2026-08-28

## 목적

Clef v1 RC에서 의도적으로 남긴 blocker와 v1.1 후보를 RC 완료 조건과 분리한다. 이 문서는 새 기능
완료 목록이 아니라, RC 이후 구현 전에 결정해야 할 기술 선택, 샘플/기기 조건, 검증 기준을 고정하는
backlog다. v1 RC는 원본 PDF 보존, 앱 내부 metadata, 적용/공유 사본, 로컬 백업/복원 정책을
유지한다.

## 분류 기준

- v1 유지: 코드/UI/model/store/test가 연결되어 있고 Flutter/Dart 검증을 통과한 범위.
- v1.1 spike: 제품 가치가 크지만 engine/API/device/sample/license 결정이 먼저 필요한 범위.
- blocker: 외부 기기, 플랫폼 계정, 샘플 PDF, 폰트 license, OCR engine처럼 현재 repo만으로 완료할
  수 없는 조건.
- Later/V2: RC 이후 제품 검증을 보고 투자할 확장 범위.

## 1. OCR Engine 기반 PDF 본문 검색

- 현재 v1 상태: `pdfrx.PdfTextSearcher` 기반 embedded text search, 결과 이동/이전/다음/clear,
  OCR unsupported 안내, `SheetPdfSearchIndexManifest` capability scaffold, image-only synthetic
  scan fixture test가 있다.
- 왜 v1.1 spike인지: 스캔 PDF 검색은 OCR engine 선택, 정확도/latency, privacy, native bridge,
  platform별 packaging이 먼저 결정되어야 한다.
- 결정 필요사항: ML Kit vs Tesseract vs platform native bridge vs server OCR, on-device only 여부,
  offline 동작, indexing timing, battery/memory budget, searchable cache 저장 위치.
- 구현 후보: page image rasterization 후 OCR index 생성, score별 incremental index, search
  manifest engine/version 확장, OCR unsupported 상태에서 progressive indexing 상태로 전환.
- 테스트/fixture/실기기 조건: 텍스트 PDF, image-only synthetic PDF, 실제 스캔 악보 10개 이상,
  Korean/English mixed text fixture, 50-100 page latency measurement, airplane mode privacy check.
- Acceptance criteria: 스캔 PDF에서 결과 page와 snippet을 안정적으로 표시하고, 50 page scan 기준
  indexing이 중단/재시작되어도 crash 없이 resume 또는 clean failure 한다.
- Blocker 해제 조건: OCR engine/API 결정, license 확인, Android/iOS bridge spike, scan fixture
  recall/latency 기준 통과.

## 2. HEIC/HEIF 직접 변환

- 현재 v1 상태: JPG/PNG는 PDF 악보로 변환하고 원본 이미지를 reference linked file로 보존한다.
  HEIC/HEIF는 known-but-unsupported로 감지하고 JPG export 안내를 표시한다.
- 왜 v1.1 spike인지: HEIC decoder, EXIF orientation, color profile, 메모리 사용량, iOS/Android
  platform 차이가 크다.
- 결정 필요사항: Android `ImageDecoder`/`BitmapFactory` bridge, iOS `Photos`/`ImageIO` bridge,
  Dart package 사용 여부, alpha/color profile 처리, 변환 결과 포맷(JPEG/PNG/PDF image).
- 구현 후보: platform channel image decode service, per-image downscale policy, original HEIC
  reference linked file 보존, converted JPG cache cleanup.
- 테스트/fixture/실기기 조건: iPhone HEIC, Android HEIF, portrait/landscape EXIF orientation,
  wide-gamut color sample, 큰 사진 20장 batch import, low-memory simulator/device.
- Acceptance criteria: HEIC/HEIF 1-20장을 PDF 악보로 변환하고 orientation/color가 눈에 띄게
  깨지지 않으며 원본 파일은 linked file로 보존된다.
- Blocker 해제 조건: decoder/API 선택, sample photo set 확보, platform license 확인, memory
  regression 기준 통과.

## 3. 기존 폴더 직접 참조

- 현재 v1 상태: 앱 내부 문서 저장소에 PDF/linked files를 복사하고, metadata/full backup ZIP으로
  복원한다. 여러 library profile은 앱 내부 metadata key로 분리되어 있다.
- 왜 v1.1 spike인지: Android SAF persistent URI permission과 iOS security-scoped resource는
  권한 상실, 파일 이동, 재부팅, provider별 동작이 다르다.
- 결정 필요사항: copy-on-import 유지 여부, direct reference score type, tree scan 주기, duplicate
  detection, permission lost UX, iOS Files 지원 범위.
- 구현 후보: `SheetExternalFolderReference` metadata, Android tree URI scanner, stale file badge,
  manual rescan, direct-reference share/export fallback to app copy.
- 테스트/fixture/실기기 조건: Android tablet folder picker, 재부팅 후 권한 유지, 파일 rename/delete,
  SD card/provider folder, iOS Files smoke test.
- Acceptance criteria: 사용자가 선택한 기존 폴더의 PDF를 앱 metadata로 관리하고, 권한 상실 시
  데이터 삭제 없이 재연결 안내를 표시한다.
- Blocker 해제 조건: SAF/iOS Files policy 결정, 실기기 권한 유지 QA, data model migration plan.

### 제품 판단

- v1.1 첫 구현은 **direct reference가 아니라 folder catalog + copy-on-select**로 제한한다.
- 이유:
  - Clef의 현재 백업/복원, setlist package, PDF export/share는 앱 내부 사본을 전제로 안정화되어 있다.
  - SAF/Files direct reference는 권한 만료와 provider offline 상태가 실제 공연 중 blocker가 될 수 있다.
  - MobileSheets식 "폴더에서 빠르게 찾기" 체감은 read-only catalog와 선택 복사만으로도 상당 부분 얻을 수 있다.
- 따라서 `Persistent direct reference`는 별도 migration과 Device QA 이후에만 연다.
- 사용자-facing copy:
  - "폴더를 둘러보고 가져오기"
  - "선택한 파일은 Clef 라이브러리에 복사됩니다"
  - "원본 폴더가 바뀌어도 이미 가져온 악보는 유지됩니다"
  - direct reference 단계 전까지 "폴더와 자동 동기화"라고 표현하지 않는다.

### 첫 구현 경계

- 허용:
  - Android 폴더 선택 권한 요청.
  - PDF 후보 스캔 preview.
  - display name, size, modified time, provider label 표시.
  - 선택 파일만 기존 import pipeline으로 복사.
  - source metadata에 원본 folder hint 저장.
  - 권한 취소/빈 폴더/읽기 실패 안내.
- 금지:
  - 앱 내부 사본 없이 PDF를 여는 direct score.
  - 폴더 변경 자동 감시/자동 동기화.
  - 삭제된 원본 파일을 Clef 라이브러리 삭제로 해석.
  - SAF URI/bookmark를 일반 backup에 그대로 포함.
  - iOS Files parity를 Android와 동일하다고 가정.

### 위험/대응 매트릭스

| 위험 | 첫 구현 대응 | Direct reference 전 필요 조건 |
| --- | --- | --- |
| 권한 상실 | preview만 실패시키고 라이브러리 변경 없음 | score-level stale badge, reconnect flow |
| 원본 rename/delete | 이미 복사한 악보 유지 | document URI 재해석 정책, 사용자 확인 |
| provider offline | folder scan 실패 안내 | offline badge와 retry/backoff |
| 대형 폴더 | scan count/size cap과 cancel | incremental scan, cache invalidation |
| backup privacy | folder URI redaction | encrypted/export opt-in policy |
| 중복 파일 | 기존 checksum/name dedupe 재사용 | source URI history와 duplicate review |

### 권장 단계

1. **Read-only catalog preview**
   - Android `ACTION_OPEN_DOCUMENT_TREE`로 폴더 권한을 얻고 PDF 후보 목록만 보여준다.
   - 이 단계에서는 Clef 라이브러리에 항목을 만들지 않고, provider/display name/last modified/size만 기록한다.
   - Acceptance: 권한 승인/취소/권한 상실/빈 폴더/큰 폴더가 앱 데이터를 변경하지 않고 안내된다.

2. **Copy-on-select bridge**
   - 폴더 안 PDF를 바로 참조하지 않고, 선택한 항목만 기존 import pipeline으로 복사한다.
   - folder source URI와 display path는 source metadata로 남겨 중복 탐지와 “원본 폴더에서 다시 가져오기”에 사용한다.
   - Acceptance: 기존 백업/복원/공유/export 안정성을 유지하면서 MobileSheets식 폴더 탐색 흐름만 먼저 제공한다.

3. **Persistent direct reference**
   - 별도 score storage type을 추가해 앱 내부 사본 없이 tree URI를 직접 열 수 있게 한다.
   - permission lost, file rename/delete, provider offline 상태를 score-level warning으로 표시한다.
   - Acceptance: 권한이 사라져도 metadata와 annotations는 삭제되지 않고, 사용자는 재연결하거나 앱 내부 사본으로 전환할 수 있다.

4. **iOS parity decision**
   - iOS는 security-scoped resource와 Files provider 동작 차이가 커서 Android direct reference와 같은 UX를 보장하지 않는다.
   - iOS는 document picker copy-on-select를 기본으로 유지하고, direct folder parity는 실기기 spike 이후 결정한다.

### 데이터 모델 초안

- `externalFolderId`: opaque local id.
- `platform`: `android-saf` 또는 `ios-files`.
- `treeUri`/`bookmarkData`: platform-specific permission token. 백업에는 기본적으로 포함하지 않거나 redacted로 둔다.
- `displayPath`: 사용자-facing 경로 힌트. 실제 파일 접근 근거로 사용하지 않는다.
- `lastScanAt`, `lastKnownFileCount`, `permissionState`: 홈/설정에서 상태를 보여주는 용도.
- score source metadata:
  - `sourceFolderId`
  - `sourceDocumentUri`
  - `sourceDisplayName`
  - `sourceLastModified`
  - `sourceSizeBytes`

### 배포 원칙

- v1.x에서는 copy-on-select bridge까지만 들어가도 충분한 사용자 가치가 있다.
- direct reference는 백업/복원과 “파일이 사라진 악보” UX를 바꾸므로 release flag 또는 beta-only 설정으로 시작한다.
- 스캔/클라우드/sync 기능과 섞지 않는다. 폴더 참조는 “내 기기에 이미 정리한 악보를 빠르게 가져오는 길”로 한정한다.

## 4. iOS Share Extension

- 현재 v1 상태: iOS document open URL bridge scaffold가 있고, Android ACTION_VIEW/SEND import가
  구현되어 있다.
- 왜 v1.1 spike인지: Share Extension은 별도 Xcode target, App Group, provisioning,
  extension-to-app handoff가 필요하다.
- 결정 필요사항: App Group identifier, shared container path, supported UTTypes, extension UI 최소
  범위, duplicate import policy, TestFlight provisioning.
- 구현 후보: share extension target, shared container payload queue, app launch handoff, import
  conflict resolver, extension error copy.
- 테스트/fixture/실기기 조건: Files, Mail, Safari, Dropbox/Drive provider, PDF/JPG/PNG/HEIC share,
  TestFlight build, offline provider placeholder.
- Acceptance criteria: iOS share sheet에서 PDF/JPG/PNG를 Clef로 보내고 앱 실행 후 import queue가
  중복 없이 처리된다.
- Blocker 해제 조건: Apple 계정/provisioning, App Group 설정, iOS device/TestFlight QA.

## 5. PDF 표준 Annotation Embed/Export

- 현재 v1 상태: 필기 포함 PDF 공유는 rendered stamp 사본 생성 방식이다. standard annotation
  export mode는 explicit unsupported result로 분리되어 있다.
- 왜 v1.1 spike인지: 편집 가능한 Ink/Text annotation object 생성, PDF writer API, coordinate
  mapping, viewer 호환성 검증이 필요하다.
- 결정 필요사항: `pdf_document` 확장 가능성, 다른 PDF writer 도입 여부, Ink/Text/FreeText/Stamp
  annotation mapping, opacity/pressure 처리, flatten vs editable export mode.
- 구현 후보: standard export adapter interface, rendered fallback 유지, annotation object fixture
  generator, export compatibility report.
- 테스트/fixture/실기기 조건: Acrobat, Preview, MobileSheets, Piascore, Android PDF viewer, mixed
  crop/rotation/page order PDF, pressure stroke fixture.
- Acceptance criteria: exported PDF가 주요 viewer에서 editable annotation으로 열리고, rendered
  fallback이 계속 선택 가능하며 원본 PDF는 수정하지 않는다.
- Blocker 해제 조건: writer API 선택, compatibility fixture 통과, export mode UX 결정.

## 6. 한글/비라틴 PDF Font Embedding

- 현재 v1 상태: ASCII text annotation은 rendered stamp export에 포함한다. 한글/비ASCII text는 깨진
  glyph 방지를 위해 skip/fallback 안내를 표시하고, mixed ASCII/한글 fixture test가 있다.
- 왜 v1.1 spike인지: 배포 가능한 폰트 license, subset embedding, CJK glyph coverage, file size
  증가, PDF writer 지원 여부가 필요하다.
- 결정 필요사항: Noto Sans CJK 등 폰트 후보와 license, app bundle size, subset embedding 가능성,
  fallback font list, style/weight 범위.
- 구현 후보: font asset registration, text export font resolver, unicode text fixture, missing glyph
  preflight, export summary copy.
- 테스트/fixture/실기기 조건: Korean/CJK/Latin mixed text, emoji rejection, large text annotation,
  Acrobat/Preview/MobileSheets rendering, file size regression.
- Acceptance criteria: 한글 텍스트 주석이 export PDF에서 깨지지 않고 보이며, license와 bundle
  size가 승인 가능한 범위에 있다.
- Blocker 해제 조건: font asset/license 결정, writer embedding path 확인, compatibility QA.

## 7. SQLite/File-backed Annotation Store Migration

- 현재 v1 상태: inline SharedPreferences metadata가 기본 저장소다. file-backed adapter와
  `SheetAnnotationStorageReference` scaffold는 있고, 10k stroke stress-lite save/load test로
  external file 경로의 기본 회귀를 확인했다. 강제 migration은 하지 않는다.
- 왜 v1.1 spike인지: 대량 stroke 성능, corrupt file recovery, checksum, backup/restore, lazy
  migration rollback 정책이 필요하다.
- 결정 필요사항: SQLite vs JSON file-backed, profile별 path, transaction/locking, checksum strategy,
  automatic migration threshold, rollback UX, export/import mapping.
- 구현 후보: lazy non-destructive migration, read-through inline fallback, per-score external store,
  migration status badge, backup manifest annotation file mappings.
- 테스트/fixture/실기기 조건: 10k stroke synthetic score, corrupted annotation file, checksum mismatch,
  interrupted migration, metadata/full backup round-trip, inline metadata size threshold.
- Acceptance criteria: 기존 inline records가 손상 없이 lazy migration되고, 실패 시 inline fallback
  또는 명확한 복구 안내가 제공된다.
- Blocker 해제 조건: storage backend 선택, migration threshold 결정, stress test 통과.

## 8. 실제 HID Key Capture Wizard 기반 페달 설정

- 현재 v1 상태: predefined/custom dropdown, input diagnostic log, unknown `inputId` custom mapping,
  `Focus.onKeyEvent` action 실행 경로가 있다.
- 왜 v1.1 spike인지: 실제 장비별 HID logical/physical key, focus 유지, key repeat, OS keyboard
  shortcut 충돌을 실기기로 확인해야 한다.
- 결정 필요사항: capture wizard steps, timeout/cancel UX, foreground-only policy, repeat debounce,
  per-device profile 저장, failed capture logging.
- 구현 후보: modal capture wizard, last diagnostic entry apply flow, device profile metadata, mapping
  test mode, no-op safety action.
- 테스트/fixture/실기기 조건: Bluetooth pedal 2종, USB pedal 1종, hardware keyboard, Android tablet,
  iPad keyboard, repeated press/long press, app background/foreground.
- Acceptance criteria: 사용자가 실제 페달을 눌러 inputId를 캡처하고 action에 저장한 뒤 viewer에서
  같은 action이 실행된다.
- Blocker 해제 조건: 장비 확보, focus behavior QA, device profile persistence 결정.

## 9. 저지연 Metronome/Audio/iOS Playback Parity

- 현재 v1 상태: visual metronome, Android native metronome tick volume/accent click, Android native
  tone/drone, Android
  `MediaPlayer` local audio playback, linked audio metadata/backup이 있다. 튜너는
  Chromatic-only UI, sharp/flat 표기, LED/input bar, A4 quick/history/보정 제안, adaptive noise
  floor 1차, weak signal normalization, clipping penalty, 저음 3배음 guard, feedback damping/hold,
  Hybrid/YIN/autocorrelation detector 선택, plucked string 회귀 테스트,
  감지 confidence/noise floor/clipping debug label까지 구현했지만 실제 마이크 latency/외부 마이크 안정성은
  QA가 필요하다. 악기별 preset, custom target/preset, target lock은 선택지 과다로 v1 UI에서 제외했으며,
  악보앱에 다시 넣을지 또는 별도 튜너앱으로 분리할지는 v1.1 이후 제품 판단으로 둔다.
- 왜 v1.1 spike인지: low-latency tick scheduling, audio session, background policy, iOS native
  bridge, codec support를 결정해야 한다.
- 결정 필요사항: audio package/native bridge, tick/accent asset, latency target, background/lock
  screen policy, iOS audio session category, codec matrix.
- 구현 후보: native low-latency audio engine, preloaded tick/accent buffers, shared transport state,
  iOS tone/audio player bridge, latency debug screen, tuner noise calibration dashboard와 MPM/native
  detector 비교 spike.
- 테스트/fixture/실기기 조건: Android tablet, iPhone/iPad, wired/Bluetooth output, MP3/M4A/WAV,
  BPM 40-240, accent drift measurement, tuner concurrent use, 실제 악기/외부 마이크 cents jitter 측정,
  Hybrid/YIN/autocorrelation engine별 상용 튜너 비교표.
- Acceptance criteria: metronome tick/accent가 체감 latency와 drift 기준을 만족하고, Android/iOS
  local audio playback 상태/오류 문구가 일관된다.
- Blocker 해제 조건: audio engine 선택, sound asset license, device latency QA.

## 10. Cloud Sync/Account/Server 저장과 OS Background Full Backup

- 현재 v1 상태: active library profile별 metadata-only automatic snapshot, metadata JSON backup,
  PDF 포함 full backup ZIP이 있다. Cloud provider import는 system picker/provider 경로와 내려받기
  안내로 처리한다.
- 왜 v1.1/Later spike인지: account model, conflict handling, encryption, background scheduler,
  provider API, privacy policy가 제품/운영 결정과 연결된다.
- 결정 필요사항: cloud sync를 v1.1에 둘지 V2/Later로 둘지, account requirement, encrypted backup,
  conflict resolution, quota, background full backup schedule, restore UX.
- 구현 후보: local scheduled full backup, user-selected cloud folder export, account-backed sync,
  conflict-safe metadata merge, backup health status.
- 테스트/fixture/실기기 조건: Drive/iCloud/Dropbox provider import QA, offline/online transitions,
  conflict fixture, large PDF backup, background task reliability.
- Acceptance criteria: 선택한 범위 안에서 데이터 손실 없이 backup/sync 상태를 설명하고, conflict를
  자동 삭제 없이 복구 가능한 상태로 남긴다.
- Blocker 해제 조건: product scope 결정, account/cloud provider strategy, privacy/security review.

## 11. Page별 Live Rotation Rendering

- 현재 v1 상태: source page/virtual instance rotation metadata, 회전 badge, 회전 적용 사본, 페이지
  정리 적용 사본의 output page metadata가 있다.
- 왜 v1.1 spike인지: `pdfrx` 2.4.7 local API에서 `PdfPageView.rotationOverride`는 확인했지만
  현재 앱의 `PdfViewer.file` 경로에 page별 rendered page rotation override를 주입하는 안정적인 공개
  hook은 확인하지 못했다.
- 결정 필요사항: `PdfViewer.file` 유지 vs custom `PdfDocumentView`/`PdfPageView` composition,
  page overlay/crop/annotation coordinate transform, text search/link rect mapping, page layout/zoom
  persistence.
- 구현 후보: custom page view adapter, rotated applied-copy preview, upstream `pdfrx` hook request,
  per-page transform helper.
- 테스트/fixture/실기기 조건: 1페이지/2페이지/세로/half-page modes, crop/rotation mixed pageOrder
  duplicate, annotation/bookmark/jump point overlays, link rects, tablet landscape/portrait screenshot QA.
- Acceptance criteria: page별 live rotation이 viewer에서 즉시 보이고, annotations/links/search
  overlays가 rotated coordinate에 맞으며, applied copy fallback은 계속 사용할 수 있다.
- Blocker 해제 조건: stable viewer hook/API 선택, coordinate regression tests, screenshot QA.

## 12. Viewer Mini Tool Panel과 고급 Metronome UX

- 현재 v1 상태: 튜너와 메트로놈은 viewer bottom sheet에서 열리고, 필요할 때 viewer 우상단의 고정형
  mini panel로 축소해 악보 위에 유지할 수 있다. 튜너는 Chromatic-only로 정리했고, 메트로놈은
  BPM/박자/start-stop/accent visual, 악보별 metronome snapshot, 기본 ON tick sound toggle,
  8분/3연/16분 subdivision, 0/1/2마디 count-in, 첫 박 강조, Tap tempo를 제공한다.
- 왜 v1.1 spike인지: RC에는 drag/resize 없는 고정형 mini panel까지만 넣었다. 연주자가 악보를 보면서
  튜너/메트로놈을 장시간 켜두려면 movable floating panel 또는 side panel architecture, focus/gesture
  충돌, performance mode, accessibility, audio lifecycle을 함께 결정해야 한다.
- 결정 필요사항: modal sheet 유지 vs floating mini panel, drag/move/resize 허용 여부, panel collapse
  UX, viewer tap zone과의 충돌 정책, 공연 모드에서 열 수 있는 action 범위, metronome audible/visible
  mode, setlist별 tempo/time signature override 저장.
- 구현 후보: viewer overlay tool host, movable compact metronome/tuner card, visible metronome border
  pulse, complex accent pattern presets, metronome cue editor.
- 테스트/fixture/실기기 조건: phone/tablet portrait/landscape, 1-page/2-page/scroll/half-page viewer,
  pedal page turn 중 panel focus 유지, Android audio route/volume, TalkBack semantic label, long-running
  battery/latency smoke.
- Acceptance criteria: 사용자가 위치를 조절할 수 있는 작은 패널로 튜너/메트로놈을 유지하고,
  page turn/tap zones/performance mode와 충돌하지 않으며, 소리 실패 시 visible-only 상태가 명확하다.
- Blocker 해제 조건: overlay architecture 결정, audio latency/fallback QA, 실제 연주 중 장시간 사용성
  확인.

## 13. Cloud Sync / Conflict Model

- 현재 v1 상태: 앱은 local-first이다. Library profile별 metadata-only automatic snapshot,
  metadata JSON backup, PDF 포함 full backup ZIP, setlist package ZIP export/import가 있다.
  System file picker/provider를 통해 cloud 파일을 가져올 수 있지만, account-backed continuous sync는 없다.
- 왜 v1.1/Later spike인지: cloud sync는 단순 업로드가 아니라 account, encryption, quota, offline queue,
  background task, conflict UI, privacy policy와 운영 책임을 함께 요구한다.
- 결정 필요사항: account 없이 user-selected cloud folder export로 갈지, 자체 account/server를 둘지,
  PDF binary까지 sync할지 metadata/annotations만 sync할지, conflict를 자동 병합할지 사용자 review로 남길지,
  삭제 tombstone 보존 기간, device identity, encrypted backup 여부.
- Sync 대상 후보:
  - library profiles, score metadata, bookmarks, page transforms, setlists, setlist progress.
  - annotations/stamps/layers, linked audio metadata, ChordPro source, imported package manifests.
  - raw PDFs/images/audio binaries는 quota와 저작권/개인정보 리스크 때문에 별도 선택 sync로 둔다.
- Conflict model 초안:
  - score identity는 `score.id`와 source fingerprint를 함께 본다. 파일명만으로 merge하지 않는다.
  - metadata field는 field-level timestamp merge 후보지만 title/composer/tags 같은 핵심 field는
    conflict review card로 남길 수 있어야 한다.
  - annotations는 stroke/object id 단위 additive merge를 우선하고, 삭제는 tombstone으로 보존한다.
  - setlist order는 list operation log 또는 manual review가 필요하다. last-write-wins는 공연 순서를
    조용히 잃을 수 있으므로 기본값으로 두지 않는다.
  - 파일 binary 충돌은 자동 덮어쓰기 금지. 두 사본을 모두 보존하고 사용자에게 교체/보관을 묻는다.
- 구현 후보:
  1. Backup health/status 화면: 자동 metadata snapshot, 현재 라이브러리 범위, PDF 포함 전체 백업
     필요성, 최근 수동 metadata/full backup export 기록을 보여주는 첫 화면은 구현됐다. Setlist
     package export별 상세 이력은 후속이다.
  2. User-selected cloud folder export: 기존 backup/package를 사용자가 고른 provider 위치로 저장한다.
  3. Sync dry-run: 두 metadata backup snapshot의 score/setlist/settings 변경과 file/annotation conflict
     후보를 계산하고 요약/검토 필요 문구로 바꾸는 core는 구현됐다. 사용자-facing conflict
     review UI와 실제 merge는 후속이다.
  4. Account-backed sync: dry-run conflict model과 privacy/security 검토가 끝난 뒤 별도 제품으로 결정한다.
- 테스트/fixture/실기기 조건: 대형 PDF 포함 backup, 두 기기에서 같은 score metadata/annotation/setlist를
  엇갈리게 수정한 fixture, offline/online 전환, provider quota/권한 취소, iCloud/Drive/Dropbox provider smoke.
- Acceptance criteria: 첫 단계는 데이터를 자동 삭제/덮어쓰기하지 않고 현재 backup/sync 상태와 conflict 후보를
  설명할 수 있어야 한다. 실제 continuous sync는 conflict review UX와 privacy/security review 전에는 완료 처리하지 않는다.
- Blocker 해제 조건: account/provider 전략, privacy policy 갱신 범위, conflict fixture, rollback plan.

## 14. Leader / Follower Tablet Session

- 현재 v1 상태: 한 기기 안의 setlist progress, page turn, pedal input, performance mode는 있다.
  여러 태블릿 사이의 page/setlist 동기화는 없다.
- 왜 v1.1/Later spike인지: local network permission, pairing, latency, reconnect, leader authority,
  score identity mismatch, audience-facing failure mode를 모두 설계해야 한다.
- 결정 필요사항: 같은 library/package를 양쪽에 미리 갖고 있어야 하는지, leader가 PDF 파일까지 보내는지,
  page turn만 sync할지 setlist position/tempo/notes까지 sync할지, follower가 local override를 허용하는지,
  rehearsal mode와 performance mode의 권한 차이.
- Session model 초안:
  - `sessionId`, `leaderDeviceId`, `followerDeviceId`, `setlistId`, `scoreId`, `page`, `timestamp`.
  - pairing은 QR/code 기반으로 시작하고, 같은 LAN/Bluetooth 세부 구현은 spike에서 결정한다.
  - follower는 수신한 `scoreId`가 없으면 조용히 페이지를 넘기지 않고 “악보 없음/패키지 필요” 상태를 표시한다.
  - leader page turn event는 idempotent sequence number를 가진다. 늦은 이벤트가 최신 page를 되돌리면 안 된다.
  - disconnect/reconnect 시 follower는 마지막 leader state를 표시하되 local page turn을 계속 허용할지 mode별로 결정한다.
- 구현 후보:
  1. Offline session event model과 reducer unit test. 구현됨: `SheetFollowerSyncState`는 leader page
     event의 session id, sequence, score availability를 검증해 synced/missing/stale/disconnected 상태로
     축약한다.
  2. QR/code invite payload core. 구현됨: `SheetCollaborationInvite`는 session id, leader device,
     setlist id, created/expiry를 versioned payload로 직렬화하고 valid/malformed/unsupported/expired
     decode 상태를 분리한다.
  3. Same-device leader/follower simulator core. 구현됨: `SheetCollaborationLocalSimulator`는 invite에서
     monotonic leader event를 만들고 follower score set으로 synced/missing/recovered/disconnected 상태를
     reducer로 검증한다.
  4. QR pairing mock UI 또는 debug-only local session simulator 화면.
  5. Same-device leader/follower simulator UI로 setlist/page mismatch UX 검증.
  6. Network transport 선택: local network/WebSocket, Nearby/Bluetooth, cloud relay 중 하나를 별도 spike.
- 테스트/fixture/실기기 조건: Android tablet 2대, iPad/Android 혼합, 같은 setlist/다른 setlist,
  missing score, rapid page turns, disconnect/reconnect, screen sleep, pedal input while following.
- Acceptance criteria: follower가 잘못된 악보로 넘어가지 않고, 연결 손실과 mismatch를 명확히 표시하며,
  leader/follower state reducer가 out-of-order event를 안전하게 처리한다. 현재 unit test는 available score,
  stale event, missing score, session mismatch, disconnect 상태, QR/code invite round-trip, expiry,
  unsupported version, malformed payload, local simulator missing/recovery/disconnect를 검증한다.
- Blocker 해제 조건: transport/API 선택, local network permission UX, two-device QA, session privacy copy.

## 15. Custom Stamp Pack / Stamp Management

- 현재 v1 상태: built-in 음악 stamp, 검색, 카테고리 칩, 빠른 선택, 최근 사용 stamp 저장/복원이
  있다. 사용자 제공 stamp pack, stamp 숨김/정렬/공유/import는 없다.
- 왜 v1.1 spike인지: 사용자 stamp는 에셋 저작권, 백업/복원, sync conflict, PDF export,
  picker 밀도, 앱 번들 크기와 직접 연결된다. 이미지 stamp까지 바로 열면 데이터 모델과 권리 검토가
  함께 커진다.
- 결정 필요사항:
  - built-in stamp와 user stamp를 같은 picker에 섞을지, 별도 섹션으로 둘지
  - v1.1 첫 범위를 text/icon-only preset으로 제한할지
  - image stamp import를 허용할 경우 지원 포맷, 최대 크기, 투명 배경, 압축/보관 위치
  - backup/export/setlist package/cloud sync에 user stamp asset을 포함할지
  - user stamp 삭제 시 기존 주석 rendering을 보존할지 fallback label로 바꿀지
  - 외부 stamp pack 공유를 허용할 경우 license/출처 표시와 악성/대용량 파일 방어
- 제안 schema 초안:
  - `SheetAnnotationStampPack(id, name, version, createdAt, updatedAt, stamps)`
  - `SheetAnnotationUserStamp(id, packId, label, category, kind, iconName?, text?, assetRef?,
    keywords, licenseLabel?, sourceUrl?, checksum?)`
  - `kind`: `text`, `icon`, `image` 중 하나. v1.1 첫 구현은 `text`와 allow-listed `icon`만
    허용하고 `image`는 schema reserved로 둔다.
  - 기존 annotation에는 `stampName` 대신 당장 `userStampId`를 추가하지 않는다. 첫 slice는 picker
    preset으로만 시작하고, 실제 주석 저장 모델 확장은 별도 migration에서 결정한다.
- 구현 후보:
  1. 완료: user stamp pack schema와 JSON validator를 추가했다.
  2. 완료: built-in stamp picker에 `사용자 스탬프` 섹션을 scaffold하되 empty state만 노출한다.
  3. 완료: user stamp pack을 library metadata store와 metadata backup/restore에 연결하고 invalid,
     malformed, duplicate pack fallback을 검증했다.
  4. 완료: text-only custom stamp 생성/삭제/선택을 추가하고, built-in stamp와 동일한
     `SheetTextAnnotation` rendering path를 재사용한다.
  5. 완료: allow-listed icon-only custom stamp 생성/삭제/선택을 추가하고, compact symbol fallback으로
     기존 text annotation rendering path를 재사용한다.
  6. 완료: setlist package ZIP에 optional `clef-user-stamps.json` metadata를 포함하고, package
     import preview에서 신규/중복 stamp id 수를 구분한 뒤 성공 후 신규 text/icon stamp id만 active
     library에 병합한다.
  7. image stamp import는 license/size/export QA 이후 별도 slice로 연다.
- 검증 완료: schema JSON round-trip, duplicate id, pack id mismatch, missing payload, unsupported kind,
  allow-listed icon, malformed source URL warning, image stamp gate, metadata save/load, malformed
  storage fallback, metadata backup restore, text/icon stamp create/delete/reload, picker
  create/select/delete, user stamp search/category filtering, setlist package stamp metadata
  round-trip/import merge, package duplicate stamp preview and local-preservation merge.
- 남은 테스트/fixture/실기기 조건: deleted stamp fallback, Korean/English
  label, large pack performance, PDF export, S Pen picker use.
- Acceptance criteria: 사용자가 직접 만든 text/icon stamp를 picker에서 찾고 재사용할 수 있으며,
  저장/복원/백업 실패가 built-in stamp 사용을 방해하지 않는다. 외부 이미지/에셋 stamp는 license와
  export path가 준비될 때까지 비활성이다.
- Blocker 해제 조건: 권리/라이선스 copy 결정, image stamp asset policy.

## RC 이후 추천 우선순위

1. Android/iPad 실기기 QA에서 S Pen/stylus, audio, pedal, 장시간 연주 결과를 먼저 닫는다.
2. HID key capture wizard와 S Pen tuning은 실기기 QA 결과가 바로 설계 입력이 되므로 장비 테스트 직후
   v1.1 spike로 착수한다.
3. Custom stamp pack은 text/icon-only schema와 backup/restore fixture부터 시작하고, 이미지 stamp는
   라이선스/용량/export 정책이 정해질 때까지 열지 않는다.
4. OCR, HEIC, font embedding은 engine/license/sample 결정이 선행되어야 하므로 별도 기술 선택 회의로
   묶는다.
5. Page별 live rotation은 `pdfrx` API 선택과 overlay/link/search coordinate regression을 먼저
   고정한다.
6. PDF 표준 annotation embed와 SQLite/file-backed migration은 데이터/호환성 리스크가 커서 fixture와
   adapter 설계를 먼저 고정한다.
7. Viewer mini tool panel과 고급 metronome UX는 실제 연주자 피드백 가치가 크지만 viewer overlay와
   audio lifecycle 영향이 있으므로 v1.1 spike로 설계한 뒤 구현한다.
8. Cloud sync/account/server 저장은 backup health/status와 sync dry-run부터 시작하고, continuous sync는
   conflict/privacy 전략 확정 이후 V2/Later 투자 판단으로 남긴다.
9. Leader/follower tablet은 offline event model과 simulator로 mismatch/reconnect UX를 먼저 검증한 뒤
   실제 transport 구현을 결정한다.
