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
| MS-PARITY-001 | Roadmap | Handbook feature areas and continuous parity backlog | Commercial V1 matrix exists, MuseScore parity queue did not | MuseScore-scale queue was not separated from V1 RC queue | 다음 실행이 같은 최소 V1 항목만 반복할 수 있음 | Create this roadmap and verifier | Roadmap schema verifier | Done | Keep updating rows after every parity run |
| MS-LAYOUT-001 | Layout / Engraving | Page settings and visible page margins | Export/Page Setup has page size/orientation/margin/staff/system controls | Users could not visually inspect margin boundary in the editor | PDF setup feels abstract and hard to trust | Add non-printing page margin guide toggle | App regression plus CSS/data contract | Done | Run visual QA on real desktop widths |
| MS-UI-001 | UI / Workspace | Palettes and Properties sidebars | 2026-09-11 score workspace has a left docked palette, right properties dock, and a notation-mode dynamics palette wired to the active measure | Full MuseScore-style dock customization and deeper object palettes are not complete | Users can switch work surfaces from the score area and apply a common notation object without returning to the top toolbar | Introduce docked palette/properties skeleton without removing commands | App render/workflow tests | Done | Reopen for user-configurable dock layout and richer palette groups |
| MS-SELECTION-001 | Selection / Editing | Selection filter can exclude object types | 2026-09-11 File command surface has an event filter plus a marking filter for dynamics and chord symbols; measure-selected delete can remove only the selected marking type | Text, slur/hairpin, lyric, and copy/list-selection object filters still need follow-up slices | Bulk editing two common measure-level marking types is less risky, but full MuseScore-style object filtering is not complete | Add object-type filter model and UI for two marking types | App delete workflow tests | Done | Reopen for text/slur/hairpin filters and object-aware copy |
| MS-COPY-001 | Selection / Editing | Copy/paste supports markings and system-wide exclusions | 2026-09-11 measure-selected object clipboard copies/pastes filtered dynamics or chord symbols and replaces only that marking type in the target measure | Text, lyric, slur/hairpin, rehearsal/system text, and list-selection marking copy remain follow-up slices | Two common measure-level markings survive arranging copy/paste without replacing notes/rests or unrelated marking types | List selection copy/paste for text/dynamics/harmony subset | App copy/paste/delete workflow tests | Done | Reopen for text/slur/hairpin and list-selection object copy |
| MS-VOICE-001 | Note Input | Working with multiple voices includes rest and stem presentation | Same-staff voice rests/stems have partial polish | Complex piano/SATB pages still need broader visual fixtures | Multi-voice scores can become hard to read | Add SATB/piano multi-voice visual fixture | Visual regression/layout state tests | Todo | Cover full-measure rest plus partial rest collision |
| MS-NOTATION-001 | Notation Objects | Palettes expose lines, dynamics, text, articulations, repeats, and voltas by task | Notation Objects mode separates many measure and event objects | Palette breadth and selected-object applicability are not complete | Users still need faster object discovery and fewer invalid controls | Add context-aware disabled/enabled policy for two notation object groups | App render and state tests | Todo | Start with dynamics and text controls |
| MS-PARTS-001 | Parts | Parts panel, part tabs, part export | Live part view and PDF/MIDI selected part policy slices exist | Independent per-part layout persistence is shallow | Extracted parts need predictable spacing/title/page settings | Store per-part page setup/layout preference | App workflow and serializer policy tests | Todo | Decide storage path under MusicXML-first policy |
| MS-LAYOUT-002 | Layout / Engraving | Staff space and system/page spacing controls | Page setup presets and print layout plan exist | No deeper style system for spacing/measure density | Users cannot tune crowded pages enough | Add readable/compact style preset contract beyond PDF scale | Print layout unit and visual regression | Todo | Map preset to spacing knobs only |
| MS-LAYOUT-003 | Layout / Engraving | Autoplacement avoids collisions | Annotation lane and span avoidance slices exist | More object combinations need fixture coverage | Lyrics/dynamics/slurs/chords can still clash in dense music | Add dense solo and ensemble collision fixtures | Layout unit/visual regression | Todo | Select two-object collision pair per slice |
| MS-EXCHANGE-001 | File / Exchange | Compressed MusicXML MXL import/export | Plain MusicXML supported, no zip dependency | MXL files from notation apps are not first-class | Users often receive `.mxl` instead of `.musicxml` | Research small zip dependency or native bridge policy | Parser/export tests after dependency decision | Research | Decide dependency and security posture |
| MS-EXCHANGE-002 | File / Exchange | Native app file format preserves layout and preferences | V1 uses MusicXML primary save plus local preferences | App-specific state is not portable | Saved projects can lose Chromatics-only layout/view state | Design minimal `.chromatics` package or defer with explicit policy | Save/open unit, migration tests | Research | Draft native format decision record |
| MS-MUSICXML-001 | File / Exchange | MuseScore/Dorico/Sibelius/Finale MusicXML workflows | MuseScore CLI fixture exists; other real fixtures missing | GUI-created and legacy app fixtures are incomplete | Compatibility claim remains weak | Collect versioned external fixtures and warning snapshots | `verify:musicxml-fixtures` | External QA | Gather user-provided Finale/MuseScore GUI files |
| MS-MIDI-001 | Note Input | MIDI keyboard input | Not implemented or not verified | No external MIDI device capture workflow | Fast note entry users need hardware input | Add MIDI input spike behind feature flag | Unit plus manual hardware QA | Research | Check Electron Web MIDI availability |
| MS-PLAYBACK-001 | Playback | Mixer and transport with score cursor | Timeline/mixer tests exist | Human listening QA and richer mixer UX remain | Playback trust depends on audible result | Add mixer persistence and visible track activity slice | Hook/App tests plus manual QA | Todo | Persist mute/solo/volume in session |
| MS-TEMPLATES-001 | Customization | Templates and styles | 2026-09-11 새 악보 dialog에 built-in template picker를 추가했고 solo melody, piano grand staff, duet, string quartet presets가 기존 score structure select와 동기화된다 | User template/style save workflow is still absent | Built-in score starts are faster and more visible, but reusable custom user templates remain a follow-up | Add built-in template list first | New score App tests | Done | Reopen for user-saved templates/style library |
| MS-PROPERTIES-001 | UI / Workspace | Properties panel edits selected element values | Inline/top controls handle many edits; 2026-09-11 selected summary panel shows event/measure/range context and edits the active measure dynamic | Only one editable property type is wired so far | Users can inspect the current target faster and adjust dynamics without switching mode, but richer object editing still needs follow-up slices | Add editable property inspector fields for one object type | App render/edit tests | Done | Open follow-up rows for text and harmony property editing |
| MS-HELP-001 | UX | Discoverable commands and shortcuts | 2026-09-11 File mode includes a shortcut help dialog for V1 note input, voice/selection, and file/editing commands | Full command palette and exhaustive shortcut preferences are not complete | Users can discover core speed workflows without leaving the app | Add command/shortcut reference panel | App render tests | Done | Reopen for searchable command palette and shortcut preferences |
| MS-PRINT-001 | File / Exchange | Print/export multiple formats and part selection | PDF/MIDI export exists, image export absent | PNG/SVG/image export missing | Sharing snippets requires workaround | Define post-V1 image export scope | Docs/verifier only until selected | Postpone | Revisit after PDF QA passes |

## Execution Queue

다음 goal-mode 실행은 위 표에서 `Todo`, `Partial`, `In progress` 상태를 먼저 고른다.
단, `External QA`, `Manual QA required`, `Research`, `Postpone`는 실제 앱/장비/제품 결정이
필요하므로 자동화 가능 항목과 섞어서 완료 처리하지 않는다.

우선순위:

1. `MS-VOICE-001`: same-staff multi-voice visual fixture expansion
2. `MS-NOTATION-001`: notation object applicability policy
3. `MS-LAYOUT-003`: dense collision fixture expansion
4. `MS-PARTS-001`: per-part layout persistence policy and first implementation
5. `MS-PLAYBACK-001`: mixer persistence and visible track activity slice

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
- `.mxl` support is a strong compatibility candidate, but should be implemented only
  after a zip dependency/native bridge decision.

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

## Sources

- MuseScore Studio Handbook: https://handbook.musescore.org/
- MuseScore Studio user interface: https://handbook.musescore.org/navigation/the-user-interface
- MuseScore Studio copy and paste: https://handbook.musescore.org/basics/copy-and-paste
- MuseScore Studio score size and spacing: https://handbook.musescore.org/en_gb/formatting/score-size-and-spacing
- MuseScore Studio pages and vertical spacing: https://handbook.musescore.org/formatting/pages-and-vertical-spacing
- MuseScore Studio chord symbols: https://handbook.musescore.org/text/chord-symbols
- MuseScore Studio templates and styles: https://handbook.musescore.org/en_gb/customization/templates-and-styles
- MuseScore Studio selecting elements: https://handbook.musescore.org/en_gb/basics/selecting-elements
