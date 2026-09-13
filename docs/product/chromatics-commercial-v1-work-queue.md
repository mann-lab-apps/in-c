# Chromatics Commercial V1 Work Queue

작성일: 2026-09-11
상태: 장기 반복 작업 큐

## Purpose

Chromatics Commercial V1 작업은 단일 vertical slice로 끝나지 않는다. 이 큐는
MuseScore Studio와 Finale-style workflow를 primary reference로 삼고, Dorico와
Sibelius를 secondary commercial reference로 유지하면서 남은 Commercial V1 blocker를
반복 수집, 우선순위화, 구현, 검증하기 위한 작업판이다.

상태 값은 `Todo`, `In progress`, `Done`, `Partial`, `Blocked external`,
`Manual QA required`, `Post-V1`만 사용한다.

## Queue

### User-Requested Wrap-Up And Integration (2026-09-13)

User requested stopping feature work and pushing/merging the current Chromatics
changes. Only in-flight validation/documentation and Git integration continue;
do not start another implementation task without explicit user resumption.
Span geometry now has first native-v2 migration, numeric placement/offset/height,
reset/history, SVG/PDF and loss-warning evidence. PDF image review reproduced
clipping below the old SVG boundary; expanded manual bounds fix it. This does
not close multi-system manual collision handling, arbitrary rhythmic anchors,
independent object clipboard or the other expanded Required umbrellas.
Next on explicit resumption: span segment/collision and independent part-geometry
contracts, then remaining Ready Required work. Implementation and RC incomplete.

### Direct Span Selection And Endpoints (2026-09-13)

The latest explicit execution request found no current goal; a new matching goal
was registered active. Earlier paused/stopped entries below are historical.
`CV1-X-SPAN-PROPERTIES` is now Partial: a part-scoped slur/hairpin list and actual
SVG pointer/keyboard targets open the endpoint inspector. Same-staff ordered
endpoints can be edited; hairpins allow rests, slurs require notes. Missing,
foreign-staff and reversed endpoints reject without mutation. Delete/history,
native disk reopen, MusicXML round-trip and unchanged background notes are tested.
Selected-object context survives history but not a document/view/selection change.
Manual geometry, arbitrary rhythmic anchors and independent object clipboard
remain Required implementation, not manual-QA-only. Next: portable geometry with
schema migration, auto-layout reset and renderer/export tests.

### Resumed Range Palette Work (2026-09-13)

The user explicitly resumed work after the checkpoint below. Goal tool state was
`paused`; no tool supports resuming it, so this is ordinary execution, not a claim
of active goal-mode continuation. The earlier stop checkpoint remains historical.

`CV1-X-RANGE-PALETTE-ACCESS` now has a single primary range group at the start of
Notation Objects. Clicking notes preserves that mode, while Note Input no longer
contains those commands. Controls reflect valid note/rest endpoints, existing
spans and undo/redo. Current model still requires a two-event range for hairpins
and octave lines; this does not implement MuseScore's single-note extension or
free rhythmic anchors. Separate endpoint/geometry work remains Required.
The docked dynamics palette now follows the same range-disabled policy as the
toolbar and property dock. Existing live handlers also reject range application.

Electron actual pointer-command and file round-trip evidence covers 960/1400;
native dialogs and human engraving remain separate. See evidence-log for final
gates. Next implementation: `CV1-X-SPAN-PROPERTIES`, span selection and endpoint
editing followed by portable geometry; not another palette relocation.

### User-Requested Checkpoint (2026-09-13)

Stopped again at the user's request after finishing the in-flight removed-staff
layout-anchor slice. No subsequent implementation task was started. This resumed
run covered aligned signature/repeat/volta boundaries, part removal/reordering,
standalone part XML titles/breaks, rest hairpins and repeated velocity, stem
clearance, workspace height and four-type octave XML/playback pitch conversion.
These are partial contracts, not completed umbrella features.

Removed-staff breaks now map by measure position to an equally sized surviving
staff of the same part; undo/redo restores score and native part layouts together.
Deleting a measure from a surviving staff still drops that measure's break.
Focused regression passed; final full-suite results are in evidence-log.

Next suggested task: `CV1-X-RANGE-PALETTE-ACCESS`, reproduce visible range-command
access at 960/1400 before moving slur/hairpin/octave controls to Notation Objects.
Other pending work includes unequal-staff layout remapping, page-setting XML
interchange, arbitrary rhythmic span anchors, octave held-note/tie boundaries
and ambiguous legacy XML recovery. All Expanded V1 Required rows remain in scope.
Development preview remains at http://localhost:5173/ (`npm run dev`, session 3715);
do not close an open user document or discard edits as part of this checkpoint.
See evidence-log for commands and results. Implementation and public RC are
both incomplete; this checkpoint is not a completion claim. No commit/push/merge
or deployment was performed.

### Expanded V1 Required Queue (2026-09-12)

The user explicitly promoted previous parity/Post-V1 items. The earlier native
decision and narrow filter definition below are historical. All new rows are
Required; their dependencies, observable acceptance and evidence contracts are
in [Expanded V1](chromatics-expanded-v1.md#required-contracts).
Do not close an umbrella row after its first slice.

2026-09-13 discovered while testing CV1-X-PART-XML: rich secondary-part
annotations are dropped by primary-part-only import; multi-staff export only
writes upper-staff directions. Repair part/staff ownership and slur voice/chord
mapping before claiming the rich export contract. Direction span tick/voice
endpoints need a separate audit; first/last-note mapping is not full fidelity.

2026-09-13 corrected 960px Electron screenshot review: score rendering is
nonblank and the existing visual baseline passes, but the upper command surface
remains dense. Track usable command access and compact layout under
CV1-X-WORKSPACE; existing bounds checks are not ergonomic completion evidence.

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-X-PART-XML | 선택 파트 MusicXML export | Parts / Part View | MuseScore File export; Expanded V1 contract | 총보를 손상하지 않고 개별 파트 교환 | projection/App/disk/Electron | native dialog | Partial | Note/rest hairpin anchors, standalone independent title and system/page breaks now round-trip. Actual packaged XML checked. Remaining: arbitrary rhythmic anchors, page settings, octave pitch semantics, real dialog/external reopen |
| CV1-X-NATIVE-SCHEMA | portable native schema | Document Lifecycle | Expanded V1 contract; native vs interchange | 다른 기기에서 조판/파트 설정 손실 | schema/migration/round-trip | cross-machine QA | Partial | Version 2 adds span geometry with v1 validation/migration, limits/reference checks and round-trip. Remaining expanded portable models and cross-machine/native-dialog QA; see native format contract |
| CV1-X-NATIVE-LIFECYCLE | native save/open/recovery | Document Lifecycle | CV1-X-NATIVE-SCHEMA | 프로젝트 저장 안전성 | disk/race/package tests | native dialog | Partial | Backup discovery/recovery UI, stale autosave error guard and dirty-only full-envelope recovery after native/XML cleanup across document switches. Next: file-open/settings and discard race audit, retention controls and native-dialog/crash evidence |
| CV1-X-SPAN-PROPERTIES | span endpoint/geometry 속성 | UI Information Architecture | Expanded V1 span contract | 슬러/헤어핀 직접 조정 부재 | core/App/layout | engraving QA | Partial | Direct selection/endpoint edit, numeric placement/offset/height, auto reset/history/native-v2 and SVG/PDF first contracts implemented. Next: segment-specific geometry, inter-system collisions, independent part geometry, arbitrary rhythmic anchors and XML geometry interchange. |
| CV1-X-OBJECT-FILTERS | 객체 선택과 필터 확장 | Editing Workflow | Expanded V1 selection contract | 원하는 표기만 일괄 편집 불가 | core/App | selection ergonomics | Todo | lyrics/text/span 포함 single/list/range 소속 모델 감사 |
| CV1-X-OBJECT-CLIPBOARD | 객체 clipboard 확장 | Editing Workflow | CV1-X-OBJECT-FILTERS | 음표와 별개 표기 재사용 불완전 | core/App/round-trip | 실전 편집 | Todo | 필터 모델 이후 텍스트/span 재연결 및 부분 포함 정책 구현 |
| CV1-X-PART-LAYOUT | 독립 파트보 portable layout | Parts / Part View | Expanded V1 part contract | 기기 이동 시 파트 조판 손실 | App/native/export | PDF QA | Partial | Part title, page/system breaks and page settings support independent editing/history/native save. Reset removes independent title/break/page overrides and is undoable. Next: structural score-edit/removed-anchor audit and complete portable authoring/export verification |
| CV1-X-ENGRAVING | 마디 밀도와 수동 조판 | PDF / Page Setup | Expanded V1 engraving contract | 출판용 페이지 조정 부족 | layout/visual/PDF render | human engraving | Todo | 폭/밀도/manual override 우선순위 구현 |
| CV1-X-CONCERT-VIEW | 실음/기보음 표시 전환 | MusicXML Compatibility | Expanded V1 transpose contract | 이조악기 총보 검토 불편 | pitch/App/XML/MIDI | 청감 | Todo | 저장음과 표시음 분리 및 key/input semantics 고정 |
| CV1-X-MIDI-INPUT | MIDI step/chord input | Editing Workflow | MuseScore input-by-duration; Expanded V1 | 장치 기반 입력 부재 | simulated MIDI/App | physical device | Todo | permission/device adapter와 안전한 note-on/off 처리 |
| CV1-X-PITCH-FIRST | pitch-first 입력 | Editing Workflow | MuseScore input-by-duration | 음높이 먼저 고르는 입력 부재 | state/App | keyboard ergonomics | Todo | pitch preview와 duration commit 상태 구현 |
| CV1-X-TEMPLATES-STYLES | 사용자 template/style | Document Lifecycle | Expanded V1 customization contract | 반복 편성/서식 재사용 불가 | App/import/export | 사용자 작업 확인 | Todo | native/schema 이후 저장/재사용/교환/초기화 구현 |
| CV1-X-COMMANDS-SHORTCUTS | 명령 검색/단축키 설정 | UI Information Architecture | Expanded V1 commands contract | 기능 탐색과 개인화 부족 | App/conflict tests | keyboard/IME | Todo | command inventory와 searchable palette부터 구현 |
| CV1-X-WORKSPACE | 도킹/크기/배치 저장 | UI Information Architecture | Expanded V1 workspace contract | visibility 외 배치 조정 불가 | pointer/keyboard/visual | ergonomics | Partial | Context-strip grid expansion fixed (152px to 43px at 960); visible command headless regression. Resize/reorder/dock/reset and complete compact command access remain Required. |
| CV1-X-IMAGE-EXPORT | PNG/SVG 출력 | PDF / Page Setup | MuseScore File export | 악보 이미지 공유 불가 | render/pixel/disk | viewer QA | Todo | self-contained page/part/range capture 구현 |
| CV1-X-WORKFLOW-AUDIT | 확장 V1 실전 감사 | Same-Staff Multi-Voice | Expanded V1 audit contract | 큐 밖 누락 기능 방치 | fixtures/headless | 청감/engraving | Todo | 각 slice 후 Required 재감사, 새 누락은 별도 ID 등록 |

### Expanded V1 Discovered Subtasks (2026-09-13)

These are Required children of the expanded contracts, not optional research.

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-X-XML-OCTAVE-PITCH | octave-shift XML 음높이 의미 | MusicXML Compatibility | W3C MusicXML octave-shift; parent CV1-X-PART-XML | XML up/down and performed pitches differ from internal display-pitch convention | XML/MIDI/pitch fixture | external app comparison | Partial | Four octave types now use standard direction and performed pitch; stop at end-note duration, chord/native/MIDI/lower-staff instrument transpose tests pass. Remaining: legacy ambiguous XML recovery, rest/interior-tick/cross-staff anchors, 22 shifts, held notes/ties across boundaries, overlap and real external GUI comparison. |
| CV1-X-SPAN-RHYTHMIC-ANCHORS | 음표 외 span endpoint | Editing Workflow | MuseScore Dynamics and hairpins; parent CV1-X-SPAN-PROPERTIES | interior-duration/end-of-measure positions cannot be preserved as event IDs alone | model/native/XML/layout/Electron | engraving QA | Partial | Rest-event hairpin input/undo/redo/native/XML/renderer and voice-scoped playback implemented. Add portable arbitrary-tick anchors, exact stop time and cross-staff spans; unsupported positions still reject. |
| CV1-X-HAIRPIN-REPEAT-VELOCITY | 반복 구간 헤어핀 재생 | Playback | Rest-anchor audit; parent CV1-X-WORKFLOW-AUDIT | bare event ID lookup applies velocity only to first repeated occurrence | timeline/XML regression | listening | Partial | Three-pass note/rest hairpin regression fixed with per-start occurrence pairing and part/staff/voice scope. Cross-ending/missing-stop traversal policy and listening remain open. |
| CV1-X-HAIRPIN-DENSE-CLEARANCE | 낮은 음역 헤어핀과 하단 표기 간격 | Layout / Engraving | Actual rest-hairpin 960/1400 screenshots; parent CV1-X-ENGRAVING | stem clearance must also reserve system height and adjacent annotation lanes | layout/Electron image | engraving/PDF | Partial | Stem/wedge contact reproduced (-9px). Actual stem-aware offset added; finish extreme ledger, expression-lane and multi-system height audit. |
| CV1-X-PART-LAYOUT-STRUCTURE | 파트 조판 anchor와 구조 편집 | Parts / Part View | Expanded V1 linked part contract | deleting a measure left saved break anchors dangling | App/native/layout | full score authoring | Partial | Reorder/removal/global direction retention and re-add isolation tested. Equal-length removed-staff breaks remap within the owning part; score/native layouts undo together. Actual earlier packaged XML contains independent title/page break. Next: unequal-staff policy, page-setting interchange, conflicting external layouts and complete linked-score authoring verification |
| CV1-X-RANGE-PALETTE-ACCESS | 범위 기호 primary 위치 | UI Information Architecture | MuseScore expressive-marking palettes; parent CV1-X-WORKSPACE | range commands were in Note Input and note clicks changed mode | App/headless | broad ergonomics remains in workspace parent | Done | Primary range group moved to Notation Objects; selection preserves mode, controls expose disabled/pressed state. App history/XML/native and actual Electron pointer, 960/1400 hit bounds pass. Direct span geometry remains under CV1-X-SPAN-PROPERTIES. |
| CV1-X-DYNAMIC-PALETTE-APPLICABILITY | 셈여림 팔레트 적용 정책 불일치 | UI Information Architecture | Range-palette audit; parent CV1-X-WORKSPACE | docked dynamics accepted ranges while toolbar/property dock disabled them | App/headless | none for this narrow policy | Done | Regression reproduced enabled docked buttons on range. Shared handler and all three surfaces now reject range application consistently; App and actual Electron checks pass. |
| CV1-X-SCORE-MEASURE-STRUCTURE | 총보 마디 삽입/삭제 동기화 | Editing Workflow | MuseScore Adding and removing measures; Expanded V1 workflow audit | staff-only edits desynchronized piano/ensemble measures | core/App/native/XML/package | reference GUI and musical review | Partial | Aligned edits, preceding signature inheritance, active input voice, repeat timing and matched volta shrink covered. Next: unaligned import recovery, broader complex endings and App/manual boundary audit |
| CV1-PART-PAGE-BREAK | page break가 시스템만 나눔 | PDF / Page Setup | Native part layout failing print test | 명시적 페이지 나눔이 PDF에서 무시됨 | layout/real PDF | human engraving | Done | Page-aware placement now starts a new page and preserves explicit breaks over target-page fitting; native Cello PDF has two pages |
| CV1-REST-CLEF-PLACEMENT | 쉼표가 보표 밖에 렌더링됨 | Layout / Engraving | Native Cello PDF raster review; VexFlow staff-line coordinates | bass/alto/tenor rests use treble pitch keys | adapter/real PDF raster | full engraving review | Done | Clef-specific keys and whole-versus-half/quarter rest baselines; VexFlow line assertions for four clefs. Broad dense engraving remains Required |

### Historical Baseline Rows

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-MXML-MUSESCORE-GUI-SNAPSHOT | MuseScore GUI-created/reopen snapshot QA | MusicXML Compatibility | MuseScore Studio export/reopen workflow | MuseScore 사용자가 가져온 악보 호환성을 신뢰하기 어렵다. | 부분 가능: CLI app-export fixture와 PDF smoke는 존재 | MuseScore GUI에서 실제 작성, export, reopen snapshot 필요 | Manual QA required | MuseScore GUI로 grand staff score를 작성해 export하고 warning snapshot/reopen screenshot을 추가한다. |
| CV1-MXML-FINALE-MIGRATION-FIXTURE | Finale-origin migration fixture 수집 | MusicXML Compatibility | Finale MusicXML migration / Simple Entry legacy workflow | Finale 사용자 이전 파일을 상용 V1에서 검증했다고 말할 수 없다. | fixture가 있으면 자동 검증 가능 | Finale 설치 환경 또는 사용자 제공 Finale-origin MusicXML 필요 | Blocked external | Finale-origin uncompressed MusicXML과 출처/버전/export setting을 받아 `origin: app-export` fixture로 추가한다. |
| CV1-MXML-DORICO-SIBELIUS-FIXTURES | Dorico/Sibelius app-export fixture 수집 | MusicXML Compatibility | Dorico layout/export, Sibelius Dynamic Parts/MusicXML migration | secondary commercial reference 호환성 근거가 compatibility seed에 머문다. | fixture가 있으면 자동 검증 가능 | Dorico/Sibelius 설치 환경 또는 실제 export 파일 필요 | Blocked external | Dorico/Sibelius 실제 export 파일을 수집하고 manifest expectation/warning snapshot을 연결한다. |
| CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW | Same-staff multi-voice 실전 workflow 완성 | Same-Staff Multi-Voice | MuseScore/Dorico multiple voices, Finale layer-style entry | 피아노/합창 악보에서 voice별 rest/stem/selection/export 신뢰가 부족하다. | 자동 회귀는 현재 가능 범위 완료 | 복잡한 PDF engraving과 SATB/piano 실제 작성 QA는 수동 확인 필요 | Manual QA required | voice별 selection/range/delete/copy/paste/playback/MusicXML 기본 회귀와 filtered copy/paste 회귀는 자동화되었다. RC 전 SATB 또는 piano grand staff 실제 악보를 작성해 rest/stem/engraving/PDF 시각 결과를 manual QA에 기록한다. |
| CV1-SELECTION-FILTERS | Voice/object selection filter | Editing Workflow | MuseScore selection filters, Dorico filters, Sibelius filter/copy reliability | 대량 편집 때 다른 voice나 표기 객체가 같이 바뀔 위험이 있다. | V1 필수 event-type filter 자동화 완료 | object-type fine filter UX는 후속 polish | Done | V1 필수 범위는 `전체/음표만/쉼표만` event-type filter로 고정했다. Filtered delete/copy/paste는 addressed same-staff voice 안에서만 작동하고, non-contiguous filtered copy는 rhythm gap을 만들지 않도록 거부한다. Lyrics/chord/dynamics 같은 object-type fine filters는 promoted될 때 별도 V1 Polish/Post-V1 row로 연다. |
| CV1-PART-EXPORT-MANUAL-QA | 선택 파트보 export 수동 QA | Parts / Part View | MuseScore parts, Dorico layouts/Print, Sibelius Dynamic Parts | 총보와 파트보 export가 섞이면 리허설 배포에 실패한다. | 부분 가능: export path smoke 존재 | file dialog PDF/MusicXML/MIDI와 사람이 PDF 여는 확인 필요 | Manual QA required | string quartet에서 full score/selected part export를 실제 file dialog로 저장하고 matrix에 Pass/Fail을 기록한다. |
| CV1-PDF-FILEDIALOG-VISUAL-QA | PDF page setup visual QA | PDF / Page Setup | MuseScore page layout, Dorico Engrave/Print | page size, margin, staff/system spacing이 실제 출력에서 잘릴 수 있다. | 부분 가능: renderer metadata/structure smoke 존재 | 사람이 PDF를 열어 solo/piano/ensemble/part를 확인 필요 | Manual QA required | release QA score 3종과 선택 파트보 PDF를 저장해 visual checklist를 채운다. |
| CV1-PLAYBACK-LISTENING-QA | playback/mixer 청감 QA | Playback / Mixer | MuseScore playback/mixer, Sibelius playback workflow | 자동 timeline은 통과해도 실제 소리, mute/solo/volume 체감은 미확인이다. | 부분 가능: timeline/scheduler 테스트 존재 | 실제 앱에서 사람이 들어야 함 | Manual QA required | solo, grand staff, ensemble에서 repeat/volta, cursor sync, mixer 조합 청감 결과를 기록한다. |
| CV1-PACKAGED-WINDOWS-SMOKE | Windows packaged smoke | Packaged App / Release QA | 상용 데스크탑 앱 OS별 설치/첫 실행 | Windows 사용자가 설치/저장/export 가능한지 검증되지 않았다. | CI/Windows runner가 있으면 가능 | Windows 환경 또는 CI artifact 필요 | Blocked external | Windows package를 생성하고 설치/첫 실행/save/open/export smoke evidence를 추가한다. |
| CV1-UI-COMPACT-DESKTOP-VISUAL-QA | compact desktop command surface 최종 정리 | UI Information Architecture | MuseScore palettes/properties, Dorico mode/panel, Sibelius ribbon/keypad | 기능이 많아졌지만 전문 사보앱처럼 빠르고 조용하게 보이는지 아직 확정되지 않았다. | 자동 guard는 현재 가능 범위 완료 | 사람이 compact desktop에서 조작 확인 필요 | Manual QA required | Electron E2E가 960px에서 File/Score Setup/Note Input/Notation Objects/Lyrics-Chords/Export-Page Setup/Playback mode를 순회하며 document/context/text overflow, File과 Export command 분리, Lyrics/Chords chord input 위치, playback controls 노출을 확인한다. RC 전 compact desktop screenshot 기준으로 사람이 naming/command density를 확인한다. |
| CV1-NATIVE-FORMAT-DECISION | native project format 또는 Commercial save policy 최종 판정 | Document Lifecycle | MuseScore/Dorico/Sibelius native project + MusicXML exchange | MusicXML-first 저장에서 앱 전용 상태가 사라지는 위험을 사용자가 오해할 수 있다. | 문서/테스트 가능 | 제품 결정 필요 | Done | V1은 native project format을 포함하지 않고 MusicXML primary save + local autosave/recent/view preference + export warning report 정책을 유지한다. `npm run verify:chromatics-v1-save-policy`가 release notes, known limitations, desktop V1 docs, export warning code/test, work queue consistency를 검증한다. Post-V1 native format 설계는 별도 work item으로 다시 열어야 한다. |

## Current Loop Notes

### 2026-09-12 Final Local Reaudit

Eleven previously unregistered local tasks below were implemented in this run.
The queue is not a complete MuseScore feature inventory. Reauditing Required
score setup/input/editing/parts/exchange/layout/playback against App, serializer,
timeline, Electron DOM and package results did not reproduce another defect in
the tested workflows after these fixes. A future failing score reopens the queue.

- Automated: 491 unit/App tests; Electron built-app and live-local-server runs;
  reviewed 960/1400 screenshots; visual snapshots; XML/MIDI fixtures; macOS unpacked
  smoke, including compressed MXL resave; actual MuseScore 4.7.5 CLI MXL exchange.
- Manual/external still required: the original GUI fixture, PDF, listening,
  native-dialog, installer/Windows rows. They were not changed to Done.
- Existing product boundaries: native project persistence is post-V1; MIDI hardware
  input, pitch-first input, custom styles and advanced filters remain the matrix's
  V1 Polish/research scope. No Required data-loss defect was moved to Post-V1.
- Additional object-specific inspectors and freeform drag-docking are not claimed
  complete by the new text/harmony editor or visibility toggles. Their expanded
  V1-versus-parity scope needs an explicit product decision before RC signoff;
  neither a drained queue nor this audit proves all functionality complete.

### 2026-09-12 Save Lifecycle Findings

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-DOCK-VISIBILITY | 작업 공간 도크 표시 설정 | UI Information Architecture | Required UX matrix configurable workspace | 좁은 화면에서 팔레트/속성 영역을 작업 목적에 따라 조절할 수 없음 | App persistence/context + viewport toggle | 사람 기준 도킹 ergonomics | Done | 독립 표시 토글, local preference, 선택/표기 유지 App 회귀와 960/1400 canvas 확대 E2E 통과. Freeform drag-docking은 별도 범위 결정. |
| CV1-TEMPO-ANNOTATION-COLLISION | 빠르기와 연습표 상단 충돌 | Layout / Engraving | release-test 960px screenshot; Required readable notation | 글로벌 빠르기와 첫 연습표가 겹치며 위치별 빠르기도 lane 계산에서 빠짐 | lane unit + Electron bounding-box regression | 실제 PDF human review | Done | header/positioned tempo lane과 rehearsal frame clearance 구현. Lane unit, visual baseline, 960/1400 Electron bbox 회귀 통과; human PDF review는 별도. |
| CV1-RESAVE-PATH | 두 번째 저장이 smoke 전용 guard에 막힘 | Document Lifecycle | primary save/reopen Required | 실제 데스크탑에서 열린 파일 또는 첫 저장 후 덮어쓰기가 실패 | main 파일 세션 실제 disk I/O 테스트 | native dialog 최종 확인 | Done | 실제 disk I/O 테스트에서 plain/MXL 최초 저장, 덮어쓰기, 원본 backup, 재열기, 비허용 경로 거부 통과. Native dialog 확인은 별도. |
| CV1-SAVE-ASYNC-STATE | 늦은 저장 응답이 새 편집/문서 상태를 지움 | Document Lifecycle | undo/recovery/save Required | 저장 중 편집이나 문서 교체 후 dirty/recovery와 현재 파일 경로가 틀어짐 | 지연 Promise 기반 App 회귀 | 실제 파일 dialog 최종 확인 | Done | App 지연 응답 테스트에서 중복 저장, 새 편집, 문서 전환 성공/실패, 복구본 정리 중 편집, 실패 후 재시도 통과. Native dialog 최종 확인은 별도. |
| CV1-COMPACT-CANVAS | 960px에서 양쪽 도크 때문에 악보 가로 스크롤 발생 | UI Information Architecture | Required compact desktop; captured screenshot | 오른쪽 마디를 보기 위해 악보를 가로 스크롤해야 함 | viewport/screenshot/renderer bounds | 사람이 실제 작업 밀도 확인 | Done | 960px palette 상단 배치로 악보 폭 확대. 내부 scoreOverflow=false, 1400px 유지; screenshot 검토와 visual regression 통과. |
| CV1-PART-ORDER | 기존 파트 순서 변경 UI 부재 | Parts / Part View | Required instrument ordering matrix | 악기를 뒤늦게 추가하면 총보 순서를 바로잡을 수 없음 | App reorder/undo/XML order | 출력 순서 수동 확인 | Done | App part-order 회귀로 파트 이동/undo/redo, 이조 설정, 원래 음표, MusicXML part-list 순서 보존 확인. 실제 출력 순서 수동 확인은 별도. |

### 2026-09-12 Rediscovered Implementation Work

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-TRANSPOSE-INSTRUMENTS | Bb/Eb/F 기보음과 실음 | MusicXML Compatibility | Required matrix common transposing instruments; MusicXML transpose specification | 이조악기 파일의 재생음과 재저장 의미가 잘못됨 | 모델/parser/serializer/timeline/MIDI/App 검증 | 실제 외부 앱 청감은 별도 | Done | MS-TRANSPOSE-001 구현/검증 완료: written pitch 유지, transpose 상속/초기화, Bb/Eb/F/octave 실음 재생/MIDI, UI undo. 외부 앱 청감은 별도. |
| CV1-FERMATA-SYNC | 다성부/앙상블 fermata 시간 동기화 | Playback / Mixer | 동시 성부 및 repeat 재생 | 다른 성부가 늦게 시작하거나 repeat 구간이 겹칠 수 있음 | timeline/tempo/repeat 회귀 | 실제 청감은 별도 | Done | MS-PLAYBACK-002: score-wide hold map으로 다성부/파트/반복/tempo 동기화 회귀 통과. 실제 청감은 별도. |
| CV1-PROPERTIES-TEXT-HARMONY | 선택 객체 속성 편집 | UI Information Architecture | MuseScore Properties; Required UX matrix | 코드/텍스트 수정에 작업 mode 전환이 필요함 | App 입력/undo/context 회귀 | 화면 밀도 최종 수동 QA | Done | MS-PROPERTIES-002: harmony와 rehearsal/staff/system/expression text의 선택 문맥 편집/취소/undo/XML 검증. 실제 밀도 평가는 별도. |

Each linked parity row records current state, gap, implementation slice and test
strategy. `In progress` is a valid live queue state; a schema pass is not release
signoff or evidence that unregistered Required gaps do not exist.

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-MXL-EXCHANGE | 압축 MusicXML 열기/저장/최근 파일 | MusicXML Compatibility | MS-EXCHANGE-001; W3C compressed MusicXML container | 외부 사보앱의 .mxl 파일을 바로 열 수 없음 | ZIP library와 container parser, bridge 파일 I/O 테스트 | 실제 file dialog/외부 앱 교환은 별도 | Done | container/disk tests, 실제 MuseScore 4.7.5 CLI 왕복, macOS packaged MXL save/reopen/resave 통과. Native dialog와 human visual은 별도. |
| CV1-MXML-TRILL | 표준 trill-mark import/export | MusicXML Compatibility | MusicXML ornaments/trill-mark | 트릴이 사라지고 잘못된 unsupported warning 발생 | parser/serializer/재생 왕복 테스트 | 외부 앱 snapshot 별도 | Done | 표준 trill-mark import/export와 이조 trill 재생 검증 통과; 기존 trill alias 호환 입력 유지. |

- 2026-09-11: 큐 파일과 `verify:chromatics-v1-work-queue` gate를 추가해 다음 실행이
  남은 blocker를 다시 수집하고 최소 5개 후보를 확인할 수 있게 한다.
- 2026-09-11: MuseScore CLI app-export fixture는 자동 evidence로 인정하지만,
  GUI-created source score, GUI reopen snapshot, human PDF review는 완료 처리하지 않는다.
- 2026-09-11: `CV1-SELECTION-FILTERS` 첫 implementation slice로 `notes/rests/all`
  event-type filter를 File command surface와 context strip에 연결했다. Filtered delete는
  addressed same-staff voice에서만 작동하고, copy/paste/object-type filters는 다음 action으로 남긴다.
- 2026-09-11: `CV1-SELECTION-FILTERS` 후속 slice로 filtered copy/paste도 `notes/rests/all`
  event-type filter를 따른다. Copy source와 paste target 모두 addressed voice 안에서 필터링하고,
  non-contiguous filtered range는 rhythm gap을 만들지 않도록 거부한다. Object-type fine filters는
  Commercial V1 필수 blocker가 아니라 별도 polish 후보로 분리한다.
- 2026-09-11: `CV1-UI-COMPACT-DESKTOP-VISUAL-QA` 자동 guard를 Electron E2E에 추가했다.
  960px compact desktop에서 모든 work mode를 순회하며 command placement와 overflow를 점검한다.
  남은 작업은 사람이 실제 화면 밀도와 naming을 확인하는 manual QA다.
- 2026-09-11: `CV1-NATIVE-FORMAT-DECISION`은 Commercial V1 정책을 `Done`으로 전환했다.
  V1 native project format은 포함하지 않고, MusicXML primary save 정책과 unsupported layout
  warning report를 `verify:chromatics-v1-save-policy`로 유지한다.
