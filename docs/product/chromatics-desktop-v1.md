# Chromatics Desktop V1

작성일: 2026-09-01

## Product Cut

Chromatics V1은 여러 플랫폼 제품군이 아니라 데스크탑 중심 사보앱이다. V1의
목표는 사용자가 Mac 또는 Windows에서 전문적인 악보 작업을 수행하고, 리허설/수업/
소규모 출판에 사용할 수 있는 총보와 파트보를 작성하며, MusicXML/PDF/MIDI로 안전하게
주고받을 수 있게 하는 것이다.

웹 클라우드, 모바일 reader, 협업 편집은 V1 이후 제품 확장 후보로 둔다. V1에서
필요한 클라우드성 기능은 자동 복구와 로컬 파일 안정성까지다.

V1은 단성부 MVP나 데모 편집기가 아니다. 작곡가, 편곡가, 교육자, 연주자가 실제 작업에
쓸 수 있는 데스크탑 사보앱으로 배포하고, 이후 MuseScore Studio, Dorico, Sibelius의
고급 영역을 향해 지속 업데이트한다.

## Reference Baseline

- MuseScore Studio: 무료 데스크탑 사보앱의 기준선. duration-before-pitch,
  A-G 입력, 숫자 음가, MusicXML/MIDI/PDF export, parts, voices, palette,
  playback/mixer, 기본 engraving을 갖춘다.
- Dorico: 전문 workflow 기준선. mode-based editing, insert mode, popover,
  multi-flow/project, automatic engraving, layout/parts가 강하다.
- Sibelius: 빠른 입력과 실무 편집 기준선. keypad, dynamic parts, magnetic layout,
  house style, cloud/export workflow의 기대치를 만든다.
- Finale: legacy professional workflow와 MusicXML migration 기준선. Finale는
  2024-08-26 sunset 되었으므로 미래 제품 기준은 Dorico/Sibelius/MuseScore 중심으로
  두되, 자유도 높은 editing, print/export, expression/library 관성은 참고한다.
- Flat/Noteflight: 웹 협업이 본체인 제품군이다. Chromatics V1에는 full cloud
  editor보다 share/export 호환성만 참고한다.

## V1 Principles

- 데스크탑에서 전문적으로 보이는 총보와 파트보를 완성할 수 있어야 한다.
- 기본 조작은 마우스 없이 가능해야 한다.
- 단축키는 입력 속도보다 예측 가능성과 손실 방지를 우선한다.
- 일반 OS 단축키와 텍스트 입력은 사보 단축키보다 우선한다.
- 한글 IME 상태에서도 A-G, 숫자, 주요 물리키 단축키는 안정적으로 동작해야 한다.
- V1 primary save는 MusicXML이다. 전용 프로젝트 포맷은 V1에 넣지 않고 post-V1
  migration 대상으로 둔다. MusicXML이 보존하지 못하는 Chromatics 전용 layout/view
  상태는 저장/내보내기 warning과 제품 문서에 명확히 표시한다.
- 지원하지 않는 표기는 조용히 버리지 않고 가져오기/내보내기/검증 단계에서 알린다.
- "나중에 고칠 수 있음"은 허용하지만, 전문 악보 작업의 기본 신뢰를 깨는 기능 공백은
  V1 limitation이 아니라 release blocker로 본다.

## V1 Functional Requirements

### Document Lifecycle

- 시작 화면: 새 악보, 최근 파일, MusicXML 열기.
- 새 악보 wizard: 제목, 작곡가, 악기/파트, 조표, 박자표, 템포, 마디 수.
- 로컬 저장: V1 primary save는 MusicXML이다. 전용 프로젝트 포맷은 post-V1로
  미루며, MusicXML이 보존하지 못하는 앱 전용 상태는 warning/report와 release
  notes에 명확히 쓴다.
- 자동 저장과 crash recovery.
- 저장 전 종료 확인.
- 최근 파일 목록.
- 파일 변경 dirty state 표시.

현재 구현 evidence:

- 새 악보, MusicXML 가져오기, 최근 파일 열기, MusicXML 저장, 자동 저장,
  recovery snapshot, 최근 파일 목록은 App shell/preload/main IPC 경로에 있다.
- V1 저장 정책은 MusicXML primary save로 고정한다. 로컬 전용 상태는 autosave/
  recovery snapshot, 최근 파일 목록, 파일 경로별 part view preference로 제한한다.
  나중에 전용 프로젝트 포맷을 도입할 경우 기존 MusicXML을 그대로 가져오고, 가능한
  로컬 preference를 migration하며, MusicXML에서 보존되지 않았던 layout 데이터는
  warning report를 기준으로 재설정하도록 안내한다.
- 저장되지 않은 변경사항이 있으면 새 악보, MusicXML 가져오기, 최근 파일 전환 전에
  확인 dialog를 띄우며, clean MusicXML/recent open 직후에는 dirty로 오판하지 않는다.
- 브라우저/Electron window unload 경로는 dirty score가 있을 때 beforeunload guard를
  건다.
- 근거 테스트: `src/renderer/src/editor/file-lifecycle.test.ts`,
  `src/renderer/src/App.test.tsx`.

### Score Model

- score, part, staff, voice, measure, event 주소 체계.
- multi-part 총보.
- multi-staff instrument.
- single staff multi-voice.
- grand staff 피아노 악보.
- measure-level clef/key/time 변화.
- pickup measure.
- full-measure rest와 실제 duration 구분.
- command 기반 undo/redo.
- score validation: 마디 길이, voice overlap, tuplet, tie/slur 참조 무결성.

현재 구현 evidence:

- `VoiceAddress`는 `partId`, `staffId`, `measureId`, `voiceId`를 포함한다.
- editor selection은 event/range/measure selection에 active `VoiceAddress`를
  선택적으로 보존하고, 주소가 있을 때는 해당 part/staff/voice 경로를 우선 탐색한다.
- range selection과 adjacent navigation은 active voice address를 기준으로
  동작해 multi-part 또는 duplicate event id 상황에서 다른 part로 튀지 않는다.
- NotationPreview selection highlight는 event id와 selection address를 함께 비교해
  same-staff multi-voice 또는 duplicate event id 상황에서 다른 voice/staff를 selected
  tone으로 칠하지 않는다.
- Range selection uses a translucent dashed band grouped by rendered
  system/staff, so drag-selected multi-voice or grand-staff passages have a
  visible span without leaking selection affordance into PDF output.
- note input state는 기존처럼 `target: VoiceAddress`를 보존하며, cursor 복귀와
  selection 생성 경로가 이 address를 유지한다.
- playback timeline event는 `partId`, `staffId`, `voiceId`, `measureId`를 포함한다.
- 새 악보 마법사는 solo melody, piano grand staff, 2-part ensemble, string quartet
  skeleton을 만들고, NotationPreview는 생성된 추가 staff를 stacked staff로 표시한다.
- 추가 staff SVG event는 `partId/staffId`를 가진 선택 대상으로 동작하며, grand staff
  lower staff에서 note input target이 staff-2에 유지되는 Electron smoke가 있다.
- Note toolbar의 입력 보표 select는 grand staff와 multi-part score에서 active part/staff를
  전환하고, selection과 note input cursor가 target `VoiceAddress`를 유지한다.
- 악보 탭은 현재 part 이름/약어 변경, part 추가/삭제, staff 추가/삭제의 첫 slice를
  제공하고, `score-parts.replace` command로 undo 가능한 구조 교체를 수행한다.
- 악보 탭은 현재 보표 전체 음자리표 select를 제공하고, active part/staff의 모든 마디 clef를
  `staff-measures.replace` command로 함께 갱신한다.
- 악보 탭의 "추가할 악기" select는 piano, strings, woodwind, voice/melody preset의
  이름, 약어, 기본 staff 수, clef를 사용해 새 part를 추가한다.
- NotationPreview는 multi-staff score에서 measure-attached notation objects를 해당
  measure id가 속한 staff 위치에 렌더링하고, passive staff 이벤트 좌표를 span notation
  object 렌더링에도 사용한다.
- MusicXML parser/serializer는 grand staff와 multi-part 구조를 round-trip하며,
  part/staff clef, measure skeleton, 기본 note/rest event를 보존한다.
- MuseScore, Finale, Sibelius, Dorico compatibility seed MusicXML fixture QA는
  part/staff 구조, clef, note event, voice 구조, unsupported warning을 자동 검증한다.
- External app fixture manifest는 각 fixture의 origin, collection status, export settings,
  evidence link를 추적하고, 실제 app-export 파일이 없는 앱은 RC 전
  `manual-collection-required`로 남긴다.
- 근거 테스트: `src/renderer/src/editor/editor-state.test.ts`,
  `src/renderer/src/editor/note-input-state.test.ts`,
  `src/renderer/src/playback/timeline.test.ts`,
  `src/musicxml/musicxml.test.ts`, `scripts/verify-single-voice-mvp.cjs`.

### Note And Rhythm Editing

- duration-before-pitch 기본 입력.
- A-G pitch 입력.
- rest 입력.
- note/rest duration 변경.
- dots, double dots.
- ties.
- tuplets: duplet, triplet, quadruplet 이상은 최소 import/export 보존,
  triplet은 직접 입력.
- chord notes.
- range selection, copy, paste, delete.
- measure insert/delete.
- transpose by step, chromatic semitone, octave, key interval.
- enharmonic respell.
- voice switching.
- part/staff switching.
- insert/delete가 뒤 음악을 망가뜨리지 않는 정책.

### Notation Objects

- clef, key signature, time signature, tempo marking.
- dynamics: ppp, pp, p, mp, mf, f, ff, fff, sfz, crescendo, diminuendo.
- articulations: staccato, accent, tenuto, marcato.
- slur.
- fermata, breath mark, caesura.
- rehearsal mark.
- staff text, system text, expression text.
- lyrics with syllabic/hyphen/melisma.
- chord symbols.
- repeat start/end and repeat count.
- first/second endings.
- octave lines.
- tremolo display and MusicXML preservation.
- unsupported advanced notation warning.

### Layout And Engraving

- page view and continuous view.
- page size, orientation, margins.
- staff size and system spacing.
- automatic system layout.
- manual system break and page break.
- part extraction or part view from full score.
- first live part view slice: the score tab can switch preview/PDF output from
  full score to a selected part and display the selected part name as a part
  score title.
- part-view print pages expose the active view mode and selected part id in the
  score page DOM, and the part title carries the same part id for packaged PDF
  smoke verification.
- import-origin live part views keep primary-part staff-level annotations out
  of other selected part PDF render targets while preserving global rehearsal
  marks that use generic MusicXML measure references.
- saved part view workflow policy: MusicXML stays the exchange format, while
  Chromatics Desktop restores the last full-score/part-view choice per local
  MusicXML file path when that part still exists.
- collision avoidance for core items: notes, stems, beams, lyrics, dynamics,
  hairpins, slurs, chord symbols, rehearsal marks.
- print/PDF preview.
- export PDF with page settings.
- professional default note spacing, system spacing, and engraving polish.

### Playback

- play, pause, stop, jump to start.
- playback cursor.
- tempo control.
- tempo marking playback for explicit BPM.
- mid-score tempo map.
- repeat playback for simple repeats.
- tie and tuplet timing.
- dynamics and hairpin playback minimum behavior.
- mixer minimum: mute/solo/volume per part.
- MIDI export.
- high-end sound library, VST, audio export are not V1 blockers.

### Import And Export

- MusicXML import/export.
- PDF export.
- MIDI export.
- practical MusicXML fixtures from MuseScore, Dorico, Sibelius, and Finale-origin
  migration files.
- automated compatibility seed fixtures currently cover representative
  MuseScore, Finale, Sibelius, and Dorico-shaped MusicXML before real app-export
  fixtures are collected for RC signoff. The manifest now distinguishes seed
  placeholders from collected app-export fixtures and records the required
  export settings/evidence slots.
- PNG/SVG export is P1.
- compressed `.mxl` is P1 unless import compatibility becomes a launch blocker.
- unsupported MusicXML features produce actionable warnings.
- round-trip tests cover V1 notation objects.

## Shortcut Policy

### Design Rules

- Standard OS commands win: `Cmd/Ctrl-S`, `Cmd/Ctrl-Z`, `Cmd/Ctrl-Shift-Z`,
  `Cmd/Ctrl-Y`, `Cmd/Ctrl-C`, `Cmd/Ctrl-V`, `Cmd/Ctrl-X`, `Cmd/Ctrl-A`.
- Text fields, lyrics input, chord-symbol input, dialogs, and IME composition
  consume text keys before notation shortcuts.
- Notation shortcuts should use `KeyboardEvent.code` first so Korean IME does not
  break physical A-G/number shortcuts. `event.key` is fallback only.
- Plain destructive keys require visible selection and must be undoable.
- Plain arrow keys should navigate by default. Destructive musical transforms
  should use modifiers.
- Every toolbar button with a shortcut shows it in tooltip/aria text.
- Shortcut conflicts are resolved by scope in this order:
  1. modal/dialog local commands
  2. active text editor commands
  3. system save/undo/clipboard commands
  4. notation mode commands
  5. global playback/navigation commands

### Modes

- Select mode: inspection, navigation, property edit, range edit.
- Note input mode: caret-based note/rest entry.
- Text entry mode: lyrics, chord symbols, staff text, system text, expression text.
- Engrave/layout mode can be V1.1; V1 may keep layout controls in inspector.

`N` toggles note input mode. `Esc` exits note input, closes pending slur/tuplet
input, closes popovers, then clears selection if already idle.

### Duration Keys

V1 uses an industry-compatible duration map by default.

| Key | V1 target | Current beta |
| --- | --- | --- |
| `1` | 64th | whole |
| `2` | 32nd | half |
| `3` | 16th | quarter |
| `4` | eighth | eighth |
| `5` | quarter | 16th |
| `6` | half | none |
| `7` | whole | none |
| `8` | breve | none |
| `9` | reserved for longer duration or no default | triplet |

Implementation policy:

- V1 uses the target map by default.
- The beta duration map is not exposed as an active V1 shortcut preference.
- The UI shows the active shortcut map in duration button labels.

### Note Input

| Action | Shortcut |
| --- | --- |
| Toggle note input | `N` |
| Exit note input | `Esc` |
| Enter pitch | `A-G` |
| Add pitch to chord | `Shift-A` to `Shift-G` |
| Enter rest | `0` |
| Enter rest alias | `R`, kept as Chromatics convenience |
| Add tie | `T` |
| Add slur | `S` |
| Toggle dot / add dot | `.` |
| Remove one dot | `,` |
| Triplet | `Cmd/Ctrl-3` |
| Tuplet N | P1 after V1 triplet input |

`9` should no longer mean triplet in V1 because it conflicts with standard
duration maps. The active V1 map leaves plain `9` unbound and exposes triplet as
`Cmd/Ctrl-3`.

### Accidentals And Pitch

| Action | Shortcut |
| --- | --- |
| Sharp | `+` |
| Flat | `-` |
| Natural | `=` |
| Respell enharmonically | `J` |
| Transpose selected note diatonically | `Alt/Opt-Up/Down` |
| Transpose selected note chromatically | `Shift-Alt/Opt-Up/Down` |
| Transpose selected note by octave | `Cmd/Ctrl-Alt/Opt-Up/Down` |

`J` respells the selected note enharmonically without changing the sounding
pitch, and the operation is undoable.

Plain `Up/Down` navigates vertical selection where possible. The first V1
navigation-first slice moves between adjacent part/staff/voice lanes by measure
index and nearest tick; modifier arrows remain the pitch transformation path.

### Navigation And Selection

| Action | Shortcut |
| --- | --- |
| Previous/next event | `Left/Right` |
| Extend range selection | `Shift-Left/Right` |
| Previous/next measure | `Cmd/Ctrl-Left/Right` |
| Previous/next part or staff | `Up/Down` |
| Start/end of score | `Cmd/Ctrl-Home/End` |
| Delete selection | `Backspace` or `Delete` |
| Select all | `Cmd/Ctrl-A` |
| Clear selection / cancel operation | `Esc` |

If a note is selected and the app cannot navigate vertically because there is no
other staff/voice/chord tone, `Up/Down` may show a hint for transpose shortcuts
instead of editing pitch directly.

### Voice And Part

| Action | Shortcut |
| --- | --- |
| Voice 1-4 | `Cmd/Ctrl-Alt/Opt-1` to `4` |
| Next voice | `V` |
| Previous voice | `Shift-V` |
| Next part/staff | `Cmd/Ctrl-Alt/Opt-Down` |
| Previous part/staff | `Cmd/Ctrl-Alt/Opt-Up` |

Voice shortcuts follow MuseScore's visible convention where possible. `V` is a
Chromatics convenience and should be displayed in the voice selector tooltip.

### Text And Symbols

| Action | Shortcut |
| --- | --- |
| Lyrics | `Cmd/Ctrl-L` |
| Chord symbol | `Cmd/Ctrl-K` |
| Staff text | `Cmd/Ctrl-T` |
| System text | `Cmd/Ctrl-Shift-T` |
| Tempo marking | `Alt/Opt-Shift-T` |
| Rehearsal mark | `Cmd/Ctrl-M` |
| Dynamics popover | `Shift-D` |
| Ornaments/articulations popover | `Shift-O` |
| Command palette | `Cmd/Ctrl-Shift-P` |

Inside text entry:

- `Space` advances lyrics/chord symbol to the next rhythmic position.
- `Shift-Space` moves to the previous position.
- `-` enters lyric hyphen.
- `_` enters lyric melisma.
- `Enter` commits or moves to next verse depending on text type.
- `Esc` commits/cancels according to dirty state and returns to select mode.

### Playback And View

| Action | Shortcut |
| --- | --- |
| Play/pause | `Space` |
| Stop | `Esc` when playback is active, or `Shift-Space` if text mode conflict exists |
| Zoom in/out | `Cmd/Ctrl-=` / `Cmd/Ctrl--` |
| Zoom 100% | `Cmd/Ctrl-0` |
| Fit page/width | `Cmd/Ctrl-1` / `Cmd/Ctrl-2` only outside note input |
| Print or PDF export | `Cmd/Ctrl-P` |

When a text editor is focused, `Space` is text input, not playback.

## Current Gap Against Professional V1

구체 작업 순서와 release blocker 목록은
[`chromatics-v1-blocker-backlog.md`](chromatics-v1-blocker-backlog.md)를 따른다.

- Duration shortcuts now use the V1 notation map (`1..7` from 64th to whole).
  The legacy `9` triplet shortcut has been removed from the active shortcut map;
  triplet uses `Cmd/Ctrl-3`.
- Plain `Up/Down` no longer edits pitch directly. It navigates to adjacent
  vertical lanes where possible and shows a transpose hint when no target exists.
- Multi-voice editing is partial and blocks professional V1 release.
- Multi-part ensemble editing and part extraction/live part view are partial and
  block professional V1 release. The score tab can preview a selected part and
  use that part view as the PDF output target with a part score title. Saved
  MusicXML files keep a local file-path view preference so reopen returns to the
  last valid part view, but independent part-layout polish and real PDF file QA
  remain. App tests verify a string quartet Viola part PDF export path uses only
  the selected part and the compact parts PDF preset, and that import-origin
  first-part staff-level annotations do not leak into a Cello part PDF render
  target; packaged smoke verifies Cello part page/title metadata, visible event
  part ids, and compact parts page setup metadata.
- Grand staff and multi-staff instrument workflows have wizard creation,
  stacked preview, lower staff note-input target smoke coverage, toolbar
  part/staff target switching, score-tab part/staff add/remove/rename first
  slice, score-tab current-staff clef selection, and MusicXML
  structure/basic-event round-trip coverage. Score-tab instrument-library part
  creation now covers V1 piano, strings, woodwind, voice/melody presets, and
  compatibility seed fixture QA covers representative MuseScore/Finale/Sibelius/Dorico
  MusicXML shapes, but the workflow still needs real app-export fixture QA,
  collision-aware polish, and manual QA evidence. Multi-staff notation object
  anchoring has a first implementation for lower-staff measure-attached
  text/dynamics and passive-staff span anchors.
- Page setup has a first PDF-focused implementation for page size, orientation,
  margins, staff size, system spacing, and V1 presets for default A4,
  rehearsal Letter, publication A4, and compact parts. The score page DOM now
  exposes normalized page setup metadata for the PDF renderer, and App tests
  verify manual Letter landscape, publication A4, and compact parts preset
  values reach the export-time renderer contract, but real PDF output QA and
  preview polish still remain.
- System text and expression text have a first implementation for input, display,
  shortcut protection, and MusicXML round-trip; collision-aware engraving polish
  remains under the professional engraving blocker.
- Annotation lane stacking has a first implementation for dense lyric, dynamic,
  hairpin, expression text, system text, rehearsal mark, staff text, and chord
  symbol measures; full-score visual QA still remains under the professional
  engraving blocker.
- Long-span collision avoidance now uses annotation lanes for hairpin spans and
  slur side choice: hairpins take the safer start/end measure lower lane, and
  below slurs flip above when they would compete with lyric/dynamic/expression
  lanes. Broader solo/grand staff/ensemble visual/manual engraving QA remains.
- Lyrics and chord symbols have App workflow coverage for editing a `release-test`
  score, saving MusicXML, reopening through the recent-file path, and restoring
  the lyric syllabic/melisma state plus chord symbol. Broader solo/grand staff/
  ensemble manual QA remains under release-candidate signoff.
- Tempo map playback supports discrete positioned tempo events in the playback
  timeline and scheduler; text-only rit./accel. curve interpretation remains
  post-V1 advanced playback behavior.
- Tie and tuplet playback has automated coverage for single-voice tie merge,
  triplet proportional timing, same-staff multi-voice cross-measure tie merge,
  ensemble tuplet shared beat grid, and score-wide repeat expansion for
  grand staff/ensemble scores with canonical-staff repeat/volta marks and
  repeated tempo events; grand staff/ensemble listening QA remains.
- Playback cursor and editing selection synchronization is partial. The current
  policy keeps the last playback event as the editing selection after stop or
  jump-to-start while clearing the playback cursor/highlight, and exposes a
  separate jump-to-start transport button.
- Mixer has playback-tab part mute/solo/volume controls, scheduler gain
  coverage, and a string quartet App workflow check that each part row updates
  an independent `partId` mixer state. Actual listening QA for solo/mute
  combinations remains for release-candidate signoff.
- MIDI export writes Standard MIDI File type 1 with tempo map, note/chord
  events, and per-part track/channel/program separation. Percussion/tab staves
  are explicitly excluded from V1 MIDI note output with `unsupported-midi-clef`
  warnings. `npm run verify:midi-fixtures` covers solo melody, piano grand staff,
  and string quartet preset exports for header track count, tempo/part track
  names, General MIDI programs, part/staff note-on events, and warning absence,
  but the MIDI flow still needs DAW/notation app and packaged-app validation.
- Unsupported MusicXML warning/reporting has import-side coverage for common
  unsupported notation/direction cases and export-side coverage for app layout
  data that MusicXML does not preserve, plus seed fixture coverage for Dorico-style
  unsupported direction/technical notation. The first detailed report UI shows
  import/export warning direction, file name, code, location/path, and message,
  but real app-export fixture validation is not complete.
- Practical app-export MusicXML fixtures from MuseScore, Dorico, Sibelius, and
  Finale-origin files are required before public release candidate signoff; the
  current manifest records them as manual collection requirements until real
  exports are added and verified.
- Native project format is explicitly post-V1. V1 uses MusicXML as the primary
  save format, with autosave/recovery and file-path view preferences kept as
  local app state. Future native-project migration must import existing MusicXML
  first and then restore any local preference state that can be mapped safely.
- Visual regression baseline is currently clean in the latest verified run, but
  must remain a release gate for every candidate.

## V1 Release Gate

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run verify:e2e`
- `npm run verify:visual-regression`
- `npm run package:dir`
- `npm run verify:package`
- Current macOS arm64 unpacked package smoke passes with unsigned local
  packaging, including new score workspace/title/notation SVG, smoke-only
  MusicXML file write/recent reopen, score PDF file structure, Cello part view
  page/title metadata, visible event part id, compact parts page setup metadata,
  part PDF file structure, MIDI type-1 tempo/note track structure, and autosave
  round-trip; installer, Windows, and manual file-dialog QA remain RC evidence.
- Web landing release can proceed with Mac/Windows V1 public copy while product
  owner completes the manual QA signoff evidence separately.
- The 2026-09-03 RC manual/external QA availability audit found GarageBand
  10.4.12 and the macOS arm64 unpacked app, but no local MuseScore, Dorico,
  Sibelius, Finale, DMG, Windows, or Linux release artifacts. A latest packaged
  smoke PDF rendered as an A4 Cello part page with Poppler, but this does not
  replace human file-dialog PDF visual QA, external MusicXML fixture collection,
  MIDI app-open QA, or playback/mixer listening QA.
- MusicXML round-trip fixtures for V1 notation objects.
- Manual QA: create a 16-32 bar solo score, a piano grand staff score, and a
  small ensemble score; export PDF/MusicXML/MIDI; reopen exported MusicXML.
- Shortcut QA: run the same note-entry path with English and Korean IME active.
- Packaged app smoke on macOS and Windows.
- Practical import/export QA with real MuseScore, Dorico, Sibelius, and
  Finale-origin MusicXML export fixtures.
- Release notes list only post-V1 advanced limitations; professional V1 blockers
  must be resolved before public release.

## Explicit Non-V1

- Real-time cloud collaboration.
- Browser full editor.
- Mobile full editor.
- Scan/OCR import.
- VST/audio plugin hosting.
- Advanced publishing marketplace.
- Classroom assignment management.
- Full guitar tab/percussion professional support.
