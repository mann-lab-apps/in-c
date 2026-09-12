# Chromatics MuseScore Parity Roadmap

작성일: 2026-09-11
상태: MuseScore Studio 공식 문서 기반 장기 parity 실행 큐

## Reference Scope

이 문서는 Chromatics를 개인용 MVP/public alpha가 아니라 MuseScore Studio급 전문
사보앱으로 성장시키기 위한 living roadmap이다. Primary reference는 MuseScore
Studio 공식 Handbook이며, Finale-style workflow는 사용자가 익숙한 legacy migration
reference로만 둔다. 커뮤니티 글이나 소스코드가 아니라 공식 문서에서 확인되는 기능
표면을 먼저 수집하고, Chromatics worktree의 실제 구현 상태로 gap을 판정한다.

이번 roadmap은 "MuseScore의 모든 기능을 한 번에 구현한다"는 뜻이 아니다. 큐를
계속 비우는 방식으로 작은 vertical slice를 선택하고, 코드/테스트/문서 evidence를
남긴 뒤 다시 큐를 읽어 다음 작업으로 이어간다.

## Feature Area Map

| 영역 | MuseScore reference signal | Chromatics parity 방향 |
| --- | --- | --- |
| UI / Workspace | score tabs, note input toolbar, palettes, properties, instruments, status bar | work mode, palette, inspector, status/context strip을 전문 작업 흐름별로 정리 |
| Note Input | duration-first input, rests, accidentals, ties, tuplets, voices, MIDI keyboard | 빠른 반복 입력, same-staff voice, shortcut/palette state 일치 |
| Selection / Editing | single/list/range selection, selection filter, copy/paste of notes and markings | event/object/range filter와 voice-safe copy/paste/delete 고도화 |
| Notation Objects | articulations, dynamics, text, chord symbols, slurs, hairpins, repeats, voltas | 표기 객체 palette와 MusicXML/export/playback 연결 강화 |
| Parts | parts panel, part tabs, create/customize/export parts | 독립 파트보 layout/state/export 신뢰성 강화 |
| Layout / Engraving | page size, margins, staff space, system spacing, breaks, autoplacement | page setup preview, spacing policy, collision avoidance 확장 |
| File / Exchange | MuseScore native files, MusicXML, compressed MXL, MIDI, PDF, images | MusicXML primary save, PDF/MIDI export, MXL/native policy 결정 |
| Playback | playback toolbar, mixer, tempo, repeats | timeline, cursor/selection sync, mixer, external listening QA |
| Customization | templates, styles, preferences, workspaces | V1 preset/shortcut/workspace 최소화 후 post-V1 확장 |

## Current Chromatics Capability

Chromatics는 현재 solo, piano grand staff, 2-4 part ensemble을 향한 core score model,
MusicXML import/export, PDF/MIDI export, same-staff multi-voice 첫 구현, part view,
playback/mixer, notation object palette, lyrics/chords, Export/Page Setup 분리,
selection filter 일부, MuseScore CLI MusicXML fixture smoke를 갖고 있다.

Commercial V1 최소 release blocker 큐는 상당 부분 자동화되었지만, MuseScore parity
관점에서는 아직 편집 필터 범위, page/engraving option breadth, part layout, native
format, MXL, MIDI keyboard, templates/styles, object properties, command help가 장기
작업으로 남아 있다.

## MuseScore Gap Matrix

| ID | Area | MuseScore Reference Feature | Chromatics Current State | Gap | User Workflow Impact | Implementation Slice | Test Strategy | Status | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MS-UX-SCOPE-002 | UI / Workspace | Broader element Properties and configurable docks | Text/harmony/dynamics editing plus independent persisted dock visibility implemented | Direct span endpoint/geometry inspectors and freeform drag-docking are not implemented | Users may need a richer editing workspace than the current toolbar/range commands | Decide whether these expanded surfaces are mandatory for Commercial V1 or subsequent MuseScore parity; then create concrete implementation rows | Existing App/Electron coverage proves the baseline only | Research | Product scope decision required before RC; do not call all V1 functionality complete |
| MS-PARITY-001 | Roadmap | Handbook feature areas and continuous parity backlog | Commercial V1 matrix exists, MuseScore parity queue did not | MuseScore-scale queue was not separated from V1 RC queue | 다음 실행이 같은 최소 V1 항목만 반복할 수 있음 | Create this roadmap and verifier | Roadmap schema verifier | Done | Keep updating rows after every parity run |
| MS-LAYOUT-001 | Layout / Engraving | Page settings and visible page margins | Export/Page Setup has page size/orientation/margin/staff/system controls | Users could not visually inspect margin boundary in the editor | PDF setup feels abstract and hard to trust | Add non-printing page margin guide toggle | App regression plus CSS/data contract | Done | Run visual QA on real desktop widths |
| MS-UI-001 | UI / Workspace | Palettes and Properties sidebars | 2026-09-11 score workspace has a left docked palette, right properties dock, and a notation-mode dynamics palette wired to the active measure | Full MuseScore-style dock customization and deeper object palettes are not complete | Users can switch work surfaces from the score area and apply a common notation object without returning to the top toolbar | Introduce docked palette/properties skeleton without removing commands | App render/workflow tests | Done | Reopen for user-configurable dock layout and richer palette groups |
| MS-SELECTION-001 | Selection / Editing | Selection filter can exclude object types | 2026-09-11 File command surface has an event filter plus a marking filter for dynamics and chord symbols; measure-selected delete can remove only the selected marking type | Text, slur/hairpin, lyric, and copy/list-selection object filters still need follow-up slices | Bulk editing two common measure-level marking types is less risky, but full MuseScore-style object filtering is not complete | Add object-type filter model and UI for two marking types | App delete workflow tests | Done | Reopen for text/slur/hairpin filters and object-aware copy |
| MS-COPY-001 | Selection / Editing | Copy/paste supports markings and system-wide exclusions | 2026-09-11 measure-selected object clipboard copies/pastes filtered dynamics or chord symbols and replaces only that marking type in the target measure | Text, lyric, slur/hairpin, rehearsal/system text, and list-selection marking copy remain follow-up slices | Two common measure-level markings survive arranging copy/paste without replacing notes/rests or unrelated marking types | List selection copy/paste for text/dynamics/harmony subset | App copy/paste/delete workflow tests | Done | Reopen for text/slur/hairpin and list-selection object copy |
| MS-VOICE-001 | Note Input | Working with multiple voices includes rest and stem presentation | 2026-09-12 same-staff multi-voice renderer policy now separates voice 1/3 into upper/up-stem lanes and voice 2/4 into lower/down-stem lanes; full-measure and partial rests receive voice-lane offsets only when multiple voices share a staff | Complex piano/SATB pages still need broader real-score visual/manual QA | Multi-voice rests and stems are less likely to obscure each other in common SATB/piano-style passages | Add SATB/piano multi-voice visual fixture | Visual-state policy tests plus renderer data attributes | Done | Reopen for dense real-score PDF/manual engraving QA |
| MS-NOTATION-001 | Notation Objects | Palettes expose lines, dynamics, text, articulations, repeats, and voltas by task | 2026-09-12 Notation Objects mode separates measure text/dynamics applicability from range-only notation; range selections keep measure text and dynamics controls visible but disabled with an explicit applicability state | Palette breadth is still not MuseScore-complete, and richer object groups need follow-up slices | Users get fewer invalid measure-level edits while arranging selected ranges | Add context-aware disabled/enabled policy for two notation object groups | App render and state tests | Done | Reopen for slur/hairpin/text object-specific property editing |
| MS-PARTS-001 | Parts | Parts panel, part tabs, part export | 2026-09-12 selected part view now has local per-part PDF page setup preferences restored with the saved MusicXML file path; PDF/MIDI selected-part export policy remains intact | Independent portable part-layout persistence is still outside plain MusicXML and deeper part editing UI is incomplete | Extracted parts keep predictable page setup/title state when reopened on the same machine | Store per-part page setup/layout preference | App workflow and serializer policy tests | Done | Reopen for portable native project format or richer part layout inspector |
| MS-LAYOUT-002 | Layout / Engraving | Staff space and system/page spacing controls | 2026-09-12 print layout plan exposes a `default`/`readable`/`compact` engraving style contract derived from page margin, staff size, and system spacing; compact parts now has unit coverage for denser render width/system spacing behavior | Full MuseScore-style style library and manual page fitting controls are not complete | Users and tests can distinguish readable vs compact output intent instead of treating presets as opaque PDF scale values | Add readable/compact style preset contract beyond PDF scale | Print layout unit and visual regression | Done | Reopen for full style library, measure density controls, and manual visual QA |
| MS-LAYOUT-003 | Layout / Engraving | Autoplacement avoids collisions | 2026-09-12 dense solo annotation fixture covers system text, rehearsal marks, chord symbols, staff text, lyrics, dynamics, hairpins, and expression text; rehearsal marks now move above dense system text stacks and renderer elements expose annotation lane metadata | More real-score combinations and PDF/manual visual QA still need coverage | Dense text/chord/rehearsal stacks are less likely to become unreadable | Add dense solo and ensemble collision fixtures | Layout unit/visual regression | Done | Reopen for ensemble collision fixtures and human PDF engraving QA |
| MS-EXCHANGE-001 | File / Exchange | Compressed MusicXML MXL import/export | fflate 0.8.3 container decode/encode and desktop open/save/recent paths implemented | External app/native dialog confirmation remains | Users can open and resave compressed scores without manual extraction | Validated rootfile container with size/path limits; authorized atomic resave | Container and real disk I/O tests; packaged smoke | Done | Run native dialog and external app MXL exchange QA; container support does not expand the notation parser subset |
| MS-EXCHANGE-002 | File / Exchange | Native app file format preserves layout and preferences | V1 uses MusicXML primary save plus local preferences; CV1-NATIVE-FORMAT-DECISION already resolved | App-specific state is not portable | Moving scores to another machine does not carry local view preferences | Explicit post-V1 native format policy, not an unresolved V1 implementation task | verify:chromatics-v1-save-policy | Postpone | Reopen only when portable native project scope is approved |
| MS-MUSICXML-001 | File / Exchange | MuseScore/Dorico/Sibelius/Finale MusicXML workflows | MuseScore CLI fixture exists; other real fixtures missing | GUI-created and legacy app fixtures are incomplete | Compatibility claim remains weak | Collect versioned external fixtures and warning snapshots | `verify:musicxml-fixtures` | External QA | Gather user-provided Finale/MuseScore GUI files |
| MS-MIDI-001 | Note Input | MIDI keyboard input | Not implemented or not verified | No external MIDI device capture workflow | Fast note entry users need hardware input | Add MIDI input spike behind feature flag | Unit plus manual hardware QA | Research | Check Electron Web MIDI availability |
| MS-PLAYBACK-001 | Playback | Mixer and transport with score cursor | 2026-09-12 playback part mixer mute/solo/volume settings persist in localStorage and restore on reload; mixer rows expose visible active/idle track activity while playback reports an active part | Human listening QA, richer mixer metering, and external audio-device checks remain | Playback setup is less fragile across sessions and users can see which part is currently active | Add mixer persistence and visible track activity slice | App mixer persistence/activity tests plus manual listening QA | Done | Reopen for richer metering and human listening QA |
| MS-TEMPLATES-001 | Customization | Templates and styles | 2026-09-11 새 악보 dialog에 built-in template picker를 추가했고 solo melody, piano grand staff, duet, string quartet presets가 기존 score structure select와 동기화된다 | User template/style save workflow is still absent | Built-in score starts are faster and more visible, but reusable custom user templates remain a follow-up | Add built-in template list first | New score App tests | Done | Reopen for user-saved templates/style library |
| MS-PROPERTIES-001 | UI / Workspace | Properties panel edits selected element values | Inline/top controls handle many edits; 2026-09-11 selected summary panel shows event/measure/range context and edits the active measure dynamic | Only one editable property type is wired so far | Users can inspect the current target faster and adjust dynamics without switching mode, but richer object editing still needs follow-up slices | Add editable property inspector fields for one object type | App render/edit tests | Done | Open follow-up rows for text and harmony property editing |
| MS-HELP-001 | UX | Discoverable commands and shortcuts | 2026-09-11 File mode includes a shortcut help dialog for V1 note input, voice/selection, and file/editing commands | Full command palette and exhaustive shortcut preferences are not complete | Users can discover core speed workflows without leaving the app | Add command/shortcut reference panel | App render tests | Done | Reopen for searchable command palette and shortcut preferences |
| MS-PRINT-001 | File / Exchange | Print/export multiple formats and part selection | PDF/MIDI export exists, image export absent | PNG/SVG/image export missing | Sharing snippets requires workaround | Define post-V1 image export scope | Docs/verifier only until selected | Postpone | Revisit after PDF QA passes |

## Execution Queue

### 2026-09-12 Reopened V1 Discovery

| ID | Area | MuseScore Reference Feature | Chromatics Current State | Gap | User Workflow Impact | Implementation Slice | Test Strategy | Status | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MS-TRANSPOSE-001 | File / Exchange | Transposing instruments and MusicXML transpose | Per-staff/measure transpose, Bb/Eb/F/octave presets and written-to-sounding playback/MIDI implemented | Concert-pitch display toggle and external listening are not covered | Written parts preserve pitches and sound at the instrument offset | XML inheritance/reset; instrument setup; inserted measure inheritance | XML round-trip, timeline/MIDI, editor undo and App workflow pass | Done | Manual wind ensemble exchange/listening; keep doubled/microtonal transposition explicitly unsupported |
| MS-PLAYBACK-002 | Playback | Synchronized ensemble playback | Score-wide fermata hold map follows repeat expansion | Human interpretation/listening remains unverified | Voices and parts share holds instead of accumulating offsets independently | Map note and tempo times through common holds | Multi-voice/part/repeat/tempo regression pass | Done | Manual listening with simultaneous fermatas and repeats |
| MS-PROPERTIES-002 | UI / Workspace | Editable selected element properties | Harmony, rehearsal, staff/system/expression text and dynamics editable in dock | Richer object inspectors remain parity follow-ups | Selected markings can be corrected without mode switching | Existing commands; Enter commit/Escape cancel; range disabled | App edit/undo/XML/context regression pass | Done | Human compact-desktop ergonomics; separate future object-property scope |

The queue-empty result above describes only registered rows at that moment. These
locally actionable V1 gaps were discovered by checking Required matrix rows against
code. Research or manual labels must not conceal missing local implementation.

다음 goal-mode 실행은 위 표에서 `Todo`, `Partial`, `In progress` 상태를 먼저 고른다.
단, `External QA`, `Manual QA required`, `Research`, `Postpone`는 실제 앱/장비/제품 결정이
필요하므로 자동화 가능 항목과 섞어서 완료 처리하지 않는다.

우선순위:

- 큐가 비었는지는 매 실행의 verifier 결과로 판단한다. 과거 drained 결과는
  미등록 Required 기능의 완성을 뜻하지 않는다. Save/compact/part-order 후속 작업은
  [Commercial V1 Work Queue](chromatics-commercial-v1-work-queue.md)에서도 확인한다.

## Current Loop Notes

- 2026-09-11: MuseScore Handbook을 primary reference로 두는 별도 parity roadmap을
  만들었다.
- 2026-09-11: 첫 실행 slice로 Export/Page Setup의 non-printing page margin guide를
  추가했다. PDF export capture 중에는 guide를 숨겨 출력물에 섞이지 않게 한다.
- 2026-09-11: MuseScore Properties sidebar parity 첫 조각으로 `선택 요약` 패널을
  추가했다. 선택된 event/measure/range의 위치, 성부, 음가, 박자 같은 핵심
  컨텍스트를 보여주며, active measure dynamic은 패널에서 바로 편집된다. Text와
  harmony property editing은 후속 큐로 남긴다.
- 2026-09-11: File mode에 `단축키 도움말` dialog를 추가했다. 현재 V1 shortcut
  policy인 음가 1-7, triplet `⌘/Ctrl+3`, tie/slur, voice switching, navigation,
  save/undo/redo/copy/paste/delete를 노출하고 legacy `9 = triplet`은 노출하지 않는다.
- 2026-09-11: MuseScore template/style parity 첫 조각으로 새 악보 dialog에
  `내장 템플릿` picker를 추가했다. Solo melody, piano grand staff, 2-part ensemble,
  string quartet 버튼은 기존 `악보 구성` select와 같은 `templateId`를 갱신하며,
  현악 4중주 템플릿 선택 후 4파트 skeleton이 생성되는 App regression을 추가했다.
- 2026-09-11: MuseScore palette/properties workspace parity 첫 조각으로 score
  workspace 안에 좌측 `고정 팔레트`와 우측 `속성 도크`를 추가했다. 좌측 팔레트는
  top work mode와 같은 `toolbarCategory`를 갱신하고, `표기 객체` mode에서는 active
  measure에 바로 셈여림을 적용하는 `셈여림 팔레트`를 노출한다.
- 2026-09-11: MuseScore selection filter parity 첫 조각으로 File command surface에
  `표기 필터`를 추가했다. Measure selection 상태에서 `코드` 또는 `셈여림`을 고르면
  삭제 command가 해당 마디의 chord symbols 또는 dynamics만 제거하며, note/rest
  event filter와 context strip 상태는 유지된다.
- 2026-09-11: MuseScore copy/paste parity 첫 조각으로 `표기 필터`가 선택한
  measure-level chord symbols 또는 dynamics를 별도 clipboard에 복사하고, target
  measure에 붙여넣을 때 같은 marking type만 교체하는 정책을 추가했다. Note/rest
  range clipboard와 object clipboard는 서로 덮이지 않게 분리된다.
- 2026-09-11: 기존 Commercial V1 큐가 비어도 MuseScore parity 큐는 비어 있지 않으므로
  "제품 완성" 판정으로 해석하지 않는다.
- 2026-09-12: `MS-VOICE-001` slice에서 same-staff multi-voice stem/rest
  presentation policy를 렌더러에 명시했다. 단성부는 VexFlow automatic stem
  placement를 유지하고, 다성부 staff에서만 voice 1/3 upper lane, voice 2/4 lower
  lane을 적용한다. 실제 PDF/manual engraving QA는 여전히 RC 전 확인 항목이다.
- 2026-09-12: `MS-NOTATION-001` slice에서 range selection 중 measure-level
  text/dynamics controls가 적용 가능한 것처럼 보이지 않도록 disabled state와 App
  regression을 추가했다. 객체별 properties editing은 다음 후속 slice로 남긴다.
- 2026-09-12: `MS-PARTS-001` slice에서 MusicXML primary save 정책을 유지하면서
  selected part별 PDF page setup preference를 file-path localStorage에 저장/복원한다.
  이는 같은 장비의 reopen workflow를 보강하지만, portable native project format은 별도
  연구/제품 결정으로 남긴다.
- 2026-09-12: `MS-LAYOUT-002` slice에서 print layout plan에 `default`,
  `readable`, `compact` engraving style contract를 추가했다. Compact parts preset은
  render width와 system spacing을 더 조밀하게 만드는 unit regression으로 고정한다.
- 2026-09-12: `MS-LAYOUT-003` slice에서 dense solo collision fixture가 system
  text와 rehearsal mark 간 실제 6px 충돌 후보를 잡았다. Rehearsal mark는 dense
  system text stack 위로 이동하고, renderer annotation elements는 lane metadata를
  노출한다.
- 2026-09-12: `MS-PLAYBACK-001` slice에서 part mixer mute/solo/volume 설정을
  `chromatics.part-mixer.v1` localStorage에 저장/복원하고, playback active part를
  mixer row의 `재생 중`/`대기` 상태로 노출했다. 실제 청감 QA는 별도 manual RC gate다.

## External / Manual QA Requirements

| 항목 | 상태 | 필요한 환경 | Evidence target |
| --- | --- | --- | --- |
| MuseScore GUI-created fixture reopen snapshot | External QA | MuseScore Studio GUI | `docs/quality/external-musicxml-fixture-qa.md` |
| Finale-origin MusicXML migration fixture | External QA | Finale 설치 환경 또는 사용자 제공 파일 | `docs/quality/external-musicxml-fixture-qa.md` |
| Dorico/Sibelius-origin fixtures | External QA | 각 앱 설치 환경 또는 사용자 제공 파일 | `docs/quality/external-musicxml-fixture-qa.md` |
| PDF visual QA | Manual QA required | macOS packaged app, PDF viewer | `docs/releases/manual-score-completion-qa.md` |
| MIDI keyboard input feasibility | Research | MIDI keyboard or virtual MIDI device | future spike evidence |
| Playback listening QA | Manual QA required | 실제 앱과 오디오 출력 | `docs/releases/manual-score-completion-qa.md` |

## Postponed / Research Items

- Full MuseScore native `.mscz` compatibility is not a Chromatics target.
- Large orchestral engraving, condensing, cues, guitar tablature/percussion completeness,
  cloud collaboration, plugins, and audio export remain post-V1 unless the product scope
  is explicitly raised again.
- `.mxl` container support is implemented with fflate 0.8.3. Native-dialog and
  external-app confirmation remain required; it is not native project persistence.

## Latest Verification Evidence

| 날짜 | 항목 | 결과 | 근거 |
| --- | --- | --- | --- |
| 2026-09-11 | MuseScore parity roadmap schema | Pass | `npm run verify:chromatics-musescore-parity-roadmap` passed with 19 rows and `parityAutomationQueueDrained: false` |
| 2026-09-11 | Page margin guide and selected properties App regression | Pass | `npm test -- src/renderer/src/App.test.tsx -t "page margin guides\|properties-panel"` passed 2 tests |
| 2026-09-11 | Built-in template picker App regression | Pass | `npm test -- src/renderer/src/App.test.tsx -t "built-in-template-picker\|create-ensemble-score"` passed 2 tests |
| 2026-09-11 | Template picker slice final gates | Pass | `npm run typecheck`, `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, and `git diff --check` passed; roadmap verifier now lists 9 remaining automatable rows |
| 2026-09-11 | Docked palette/properties App regression | Pass | `npm test -- src/renderer/src/App.test.tsx -t "playback.global-tempo"` passed after scoping the notation dynamics assertion to the visible notation panel; `npm run typecheck` passed |
| 2026-09-11 | Object-type marking filter App regression | Pass | `npm test -- src/renderer/src/App.test.tsx -t "palette.lyrics-chords"` passed; `npm run typecheck` passed |
| 2026-09-11 | Measure marking copy/paste App regression | Pass | `npm test -- src/renderer/src/App.test.tsx -t "palette.lyrics-chords"` passed after adding object clipboard coverage for chord symbols and dynamics; `npm run typecheck` passed |
| 2026-09-11 | Dock/filter/copy final gates | Pass | `npm run verify:chromatics-musescore-parity-roadmap`, `npm run build`, `node scripts/verify-site-content.mjs`, and `git diff --check` passed; roadmap verifier now lists 6 remaining automatable rows |
| 2026-09-12 | Same-staff voice, notation applicability, part setup, layout, collision, and playback mixer slices | Pass | Focused tests and typecheck passed for `MS-VOICE-001`, `MS-NOTATION-001`, `MS-PARTS-001`, `MS-LAYOUT-002`, `MS-LAYOUT-003`, and `MS-PLAYBACK-001`; `npm run verify:visual-regression` passed |
| 2026-09-12 | MuseScore parity automation queue drain | Pass | `npm run verify:chromatics-musescore-parity-roadmap` passed with 19 rows, `parityAutomationQueueDrained: true`, and no `nextAutomatableRows`; Commercial RC still requires External QA/Manual QA/Research/Postpone items |
| 2026-09-12 | Headless Commercial V1 QA expansion | Fail, then Pass | `npm run verify:e2e` now checks 960 compact short/tall and 1400 desktop-short work-mode layout, selected Viola part view export state, compact part page setup metadata, and playback mixer persistence/activity. First run caught a selector/value mismatch in the new QA itself; follow-up passed after aligning the check to the real range step and DOM output. |

## Sources

- MuseScore Studio Handbook: https://handbook.musescore.org/
- MuseScore Studio user interface: https://handbook.musescore.org/navigation/the-user-interface
- MuseScore Studio copy and paste: https://handbook.musescore.org/basics/copy-and-paste
- MuseScore Studio score size and spacing: https://handbook.musescore.org/en_gb/formatting/score-size-and-spacing
- MuseScore Studio pages and vertical spacing: https://handbook.musescore.org/formatting/pages-and-vertical-spacing
- MuseScore Studio chord symbols: https://handbook.musescore.org/text/chord-symbols
- MuseScore Studio templates and styles: https://handbook.musescore.org/en_gb/customization/templates-and-styles
- MuseScore Studio selecting elements: https://handbook.musescore.org/en_gb/basics/selecting-elements
