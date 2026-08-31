# Chromatics Desktop V1

작성일: 2026-08-31

## Product Cut

Chromatics V1은 여러 플랫폼 제품군이 아니라 데스크탑 중심 사보앱이다. V1의
목표는 사용자가 Mac 또는 Windows에서 새 악보를 만들고, 읽을 수 있는 파트/총보를
작성하고, MusicXML/PDF/MIDI로 주고받을 수 있게 하는 것이다.

웹 클라우드, 모바일 reader, 협업 편집은 V1 이후 제품 확장 후보로 둔다. V1에서
필요한 클라우드성 기능은 자동 복구와 로컬 파일 안정성까지다.

## Reference Baseline

- MuseScore Studio: 데스크탑 무료 사보앱 기준선. duration-before-pitch,
  A-G 입력, 숫자 음가, MusicXML/MIDI/PDF export, parts, voices, palette,
  cloud score publishing을 갖춘다.
- Dorico: 모드와 명령 체계가 엄격하다. 화살표는 탐색, modifier는 변형,
  grid 기반 duration change, popover 기반 기호 입력이 강하다.
- Sibelius: keypad 중심 duration-before-pitch와 A-G 입력, T tie, S slur,
  desktop/mobile/cloud sharing의 연속성이 강하다.
- Flat/Noteflight: 웹 협업이 본체인 제품군이다. Chromatics V1에는 full cloud
  editor보다 share/export 호환성만 참고한다.

## V1 Principles

- 데스크탑에서 악보를 완성할 수 있어야 한다.
- 기본 조작은 마우스 없이 가능해야 한다.
- 단축키는 입력 속도보다 예측 가능성과 손실 방지를 우선한다.
- 일반 OS 단축키와 텍스트 입력은 사보 단축키보다 우선한다.
- 한글 IME 상태에서도 A-G, 숫자, 주요 물리키 단축키는 안정적으로 동작해야 한다.
- MusicXML은 교환 포맷이고, V1 이후에는 전용 프로젝트 포맷을 둔다.
- 지원하지 않는 표기는 조용히 버리지 않고 가져오기/내보내기/검증 단계에서 알린다.

## V1 Functional Requirements

### Document Lifecycle

- 시작 화면: 새 악보, 최근 파일, MusicXML 열기.
- 새 악보 wizard: 제목, 작곡가, 악기/파트, 조표, 박자표, 템포, 마디 수.
- 로컬 저장: MusicXML 저장과 전용 프로젝트 포맷 저장 중 최소 하나를 명확한
  primary save로 둔다.
- 자동 저장과 crash recovery.
- 저장 전 종료 확인.
- 최근 파일 목록.
- 파일 변경 dirty state 표시.

현재 구현 evidence:

- 새 악보, MusicXML 가져오기, 최근 파일 열기, MusicXML 저장, 자동 저장,
  recovery snapshot, 최근 파일 목록은 App shell/preload/main IPC 경로에 있다.
- 저장되지 않은 변경사항이 있으면 새 악보, MusicXML 가져오기, 최근 파일 전환 전에
  확인 dialog를 띄우며, clean MusicXML/recent open 직후에는 dirty로 오판하지 않는다.
- 브라우저/Electron window unload 경로는 dirty score가 있을 때 beforeunload guard를
  건다.
- 근거 테스트: `src/renderer/src/editor/file-lifecycle.test.ts`,
  `src/renderer/src/App.test.tsx`.

### Score Model

- score, part, staff, voice, measure, event 주소 체계.
- multi-part 총보.
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
- note input state는 기존처럼 `target: VoiceAddress`를 보존하며, cursor 복귀와
  selection 생성 경로가 이 address를 유지한다.
- playback timeline event는 `partId`, `staffId`, `voiceId`, `measureId`를 포함한다.
- 근거 테스트: `src/renderer/src/editor/editor-state.test.ts`,
  `src/renderer/src/editor/note-input-state.test.ts`,
  `src/renderer/src/playback/timeline.test.ts`.

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

### Notation Objects

- clef, key signature, time signature, tempo marking.
- dynamics: p, mp, mf, f, ff, crescendo, diminuendo.
- articulations: staccato, accent, tenuto, marcato.
- slur.
- fermata, breath mark, caesura.
- rehearsal mark.
- staff text, system text.
- lyrics with syllabic/hyphen/melisma.
- chord symbols.
- repeat start/end and repeat count.
- first/second endings are P1 unless needed for V1 sample scores.
- octave lines and single-note tremolo can remain display/import-export first if
  the UI clearly labels playback limitations.

### Layout And Engraving

- page view and continuous view.
- page size, orientation, margins.
- staff size and system spacing.
- automatic system layout.
- manual system break and page break.
- part extraction or part view from full score.
- collision avoidance for core items: notes, stems, beams, lyrics, dynamics,
  hairpins, slurs, chord symbols, rehearsal marks.
- print/PDF preview.
- export PDF with page settings.

### Playback

- play, pause, stop, jump to start.
- playback cursor.
- tempo control.
- tempo marking playback for explicit BPM.
- repeat playback for simple repeats.
- tie and tuplet timing.
- mixer minimum: mute/solo/volume per part.
- MIDI export.
- high-end sound library, VST, audio export are not V1 blockers.

### Import And Export

- MusicXML import/export.
- PDF export.
- MIDI export.
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
- Text entry mode: lyrics, chord symbols, staff text, system text.
- Engrave/layout mode can be V1.1; V1 may keep layout controls in inspector.

`N` toggles note input mode. `Esc` exits note input, closes pending slur/tuplet
input, closes popovers, then clears selection if already idle.

### Duration Keys

V1 should move to an industry-compatible duration map instead of the current beta
map.

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

Migration policy:

- V1 uses the target map by default.
- A temporary "Chromatics beta shortcuts" preference may preserve the old map
  until V1 release notes announce removal.
- The UI must show the active shortcut map beside duration buttons.

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
| Tuplet N | `Cmd/Ctrl-2` to `Cmd/Ctrl-9` |

`9` should no longer mean triplet in V1 because it conflicts with standard
duration maps. If retained during migration, it must be marked as legacy.

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

Plain `Up/Down` should navigate vertical selection where possible. Current beta
uses plain `Up/Down` for pitch movement; V1 should migrate to modifier-based
editing to reduce accidental edits.

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

## Current Gap Against V1

- Current duration shortcuts are beta-specific and conflict with common notation
  software expectations.
- Current `9` triplet shortcut conflicts with standard duration/tuplet policy.
- Current plain `Up/Down` pitch editing is fast but risky; V1 should make plain
  arrows navigational and modifier arrows transformative.
- Multi-voice editing is partial.
- Multi-part and part extraction are partial.
- Page setup is not complete.
- Mixer is not complete.
- MIDI input/export coverage needs a clear V1 decision.
- Native project format is still deferred.
- Visual regression baseline currently fails only on screenshot height, but the
  V1 release gate should require a clean snapshot run or an intentional baseline
  update.

## V1 Release Gate

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run verify:e2e`
- `npm run verify:visual-regression`
- MusicXML round-trip fixtures for V1 notation objects.
- Manual QA: create a 16-32 bar solo score, a piano grand staff score, and a
  small ensemble score; export PDF/MusicXML/MIDI; reopen exported MusicXML.
- Shortcut QA: run the same note-entry path with English and Korean IME active.
- Packaged app smoke on macOS and Windows.

## Explicit Non-V1

- Real-time cloud collaboration.
- Browser full editor.
- Mobile full editor.
- Scan/OCR import.
- Guitar tab and percussion notation completeness.
- VST/audio plugin hosting.
- Marketplace or publishing store.
- Classroom assignment management.
