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

- 현재 v1 상태: visual metronome, `SystemSound` click, Android native tone/drone, Android
  `MediaPlayer` local audio playback, linked audio metadata/backup이 있다. 튜너는
  Chromatic/Target mode, 악기별 preset, custom target/preset, target lock, sharp/flat 표기,
  LED/input bar, A4 quick/history/보정 제안, adaptive noise floor 1차, target cents,
  feedback damping/hold까지 구현했지만 실제 마이크 latency/외부 마이크 안정성은 QA가 필요하다.
- 왜 v1.1 spike인지: low-latency tick/accent sound, audio session, background policy, iOS native
  bridge, codec support를 결정해야 한다.
- 결정 필요사항: audio package/native bridge, tick/accent asset, latency target, background/lock
  screen policy, iOS audio session category, codec matrix.
- 구현 후보: native low-latency audio engine, preloaded tick/accent buffers, shared transport state,
  iOS tone/audio player bridge, latency debug screen, tuner noise calibration dashboard와 YIN/MPM 비교 spike.
- 테스트/fixture/실기기 조건: Android tablet, iPhone/iPad, wired/Bluetooth output, MP3/M4A/WAV,
  BPM 40-240, accent drift measurement, tuner concurrent use, 실제 악기/외부 마이크 cents jitter 측정.
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

## RC 이후 추천 우선순위

1. 실제 CamScanner/object stream 샘플과 Android tablet smoke QA로 v1 RC release blocker를 먼저 닫는다.
2. HID key capture wizard와 S Pen tuning은 실기기 QA 결과가 바로 설계 입력이 되므로 장비 테스트 직후
   v1.1 spike로 착수한다.
3. OCR, HEIC, font embedding은 engine/license/sample 결정이 선행되어야 하므로 별도 기술 선택 회의로
   묶는다.
4. Page별 live rotation은 `pdfrx` API 선택과 overlay/link/search coordinate regression을 먼저
   고정한다.
5. PDF 표준 annotation embed와 SQLite/file-backed migration은 데이터/호환성 리스크가 커서 fixture와
   adapter 설계를 먼저 고정한다.
6. Cloud sync/account/server 저장은 RC 사용성 검증 이후 V2/Later 투자 판단으로 남긴다.
