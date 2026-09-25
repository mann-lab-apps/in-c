# Known Limitations

## 2026-09-15 Integration Checkpoint

Expanded V1 remains incomplete. An earlier read-only serializer probe confirmed
that a system text at `P2-staff-2-measure-1` disappeared from MusicXML with no
export/import warning; the 2026-09-16 and 2026-09-18 follow-ups now preserve that
bounded Chromatics-authored concrete lower-staff system text path and prevent a
deleted part's local system text from being promoted to a global `measure-N`
object. Broader explicit scope editing, arbitrary tick identity and external-app
fidelity remain incomplete.
Generic global rehearsal objects are now selectable/editable separately from
local objects in score and part views; scope conversion and arbitrary tick anchors
are not implemented. Expression-text import now normalizes cursor/divisions/offset
to score ticks, and 2026-09-16 follow-up covers lower-staff backup timing with
inherited divisions plus native/App preview ownership. `verify:expression-text-pdf`
adds bounded Electron screen/PDF print-layout DOM proof and an actual PDF artifact
for a lower-staff expression text at tick 1.5 quarters. External-app visual
comparison and broader expression-text editing/filter workflows remain.
The user approved a development checkpoint merge, not a public RC release.

2026-09-16 follow-up: concrete lower/non-primary staff system text now exports as
local `system="none"` text and reopens as `systemTexts` when it carries the
Chromatics bold system-text marker. The `P2` lower-staff loss case and cross-part
system-text clipboard path are covered by focused tests. System-text object
selection now mirrors the rehearsal chooser enough to edit/delete one same-measure
system-text object without replacing its neighbors. Explicit scope-switching UI,
arbitrary tick identity, list/range selection, external-app fidelity and human
engraving review remain Required.

## 2026-09-15 Render Projection And Attachments

Generic global rehearsal/system/positioned-tempo anchors now resolve onto the
visible primary staff for screen and print layout without changing the saved score.
Six actual full-score/part renderer cases and three generated PDF inspections cover
this bounded projection. They do not add explicit scope editing or arbitrary-tick
identity. Those remain implementation blockers under scoped global text.

PDF comparison exposed lyrics omitted from additional staves in the full score.
Primary and additional staves now share note-attachment drawing. Actual renderer
checks cover lyrics and tenuto, lyric click/edit/undo and native readback; corrected
PDFs show Sing in both full score and piano part. 2026-09-16 App/native preview
coverage confirms lower-staff fermata, caesura, grace note, ornaments and tremolo
remain attached to the same event after native reopen/save. A follow-up
NotationPreview SVG tests confirm lower-staff fermata, caesura, tremolo,
ornaments and grace markers retain the source event id in both screen and
print-layout renderer paths, and 2026-09-23 coverage keeps staccato dots
notehead-relative instead of fixed in the upper annotation lane.
`verify:passive-attachments-pdf` additionally writes
an actual Electron `printToPDF` artifact for a bounded lower-staff passive marker
fixture, validates native readback and checks same-note marker boxes do not overlap
in that fixture. Broader generated-PDF fixture matrix and detailed human engraving
review for those markings remain to be verified. General engraving and human PDF
signoff are not complete.

## 2026-09-15 Text And XML Scope

Measure text filters now copy/delete/replace staff/system/rehearsal/expression text
without editing notes. Staff/expression text can target another part. Rehearsal
marks with concrete part/staff measure IDs now use MusicXML `system="none"` and
retain lower-staff ownership on reopen; global measure anchors use `only-top`.
Multiple rehearsal marks receive separate renderer lanes and shared print spacing.
Rehearsal paste can target another staff. Core/native/XML and actual 960/1400px
renderer workflows pass. Additional-staff blank measures are now selectable;
editing one rehearsal mark preserves neighboring marks, and removing its part
removes concrete-owned marks without converting them to global. 2026-09-16
follow-up allows Chromatics-authored system text paste outside the primary staff
and preserves that concrete ownership through MusicXML reopen. Global import
aggregation still merges repeated part exports by measure/text occurrence count;
different tick positions, explicit scope editing, external-app system-text
semantics and linked `also-top` displays remain implementation blockers, not
completed QA.
The notation palette now selects rehearsal objects by stable ID within the active
measure and supports adding, editing and deleting one without changing neighbors.
Chord symbols, staff text, system text, expression text and dynamics now have
matching active-measure object selectors: chord symbols and expression text can
edit/delete one same-measure/same-tick object, while staff/system text and
dynamics can edit/delete one same-measure object without changing neighbors.
Document open/new/recovery resets those ephemeral selections. The measure object
copy/delete path can now use the selected object target for chord symbols,
dynamics, staff text, system text, rehearsal marks and expression text; selected
object paste appends a fresh object without replacing target-measure neighbors.
Range selection object filters now support bounded chord-symbol, dynamics, staff
text, system text, rehearsal mark, expression text and note lyric
copy/paste/delete with relative source-to-target mapping; lyric range paste also
clears stale target lyrics where the source range has no lyric. Note-selected lyric
object copy/paste/delete is also supported for one selected note, and
measure-selected lyric object copy/paste/delete maps lyrics by event index within
the target measure, preserves same-staff multi-voice voice ownership and leaves
target voices outside the copied source voices unchanged.
The File-mode `가사 필터 절` selector makes note-selected, range and
measure-selected lyric object copy/paste/delete follow the active lyric verse, so
copying/deleting verse 2 preserves verse 1 on the source and target notes.
Selected-note, range and measure-selected articulation object copy/paste/delete
are supported; they preserve notes, durations, lyrics and unrelated target voices
while moving only articulations.
Selected-note, range and measure-selected ornament object copy/paste/delete are
supported for `trill`, `mordent` and `turn`, preserving notes, lyrics,
articulations and unrelated target voices through native save and MusicXML
evidence.
Selected-note, range and measure-selected single-note tremolo object
copy/paste/delete preserve the `marks` value while leaving notes, lyrics,
articulations and unrelated target voices unchanged through native save and
MusicXML evidence.
Selected-note, range and measure-selected grace-note object copy/paste/delete
preserve the grace-note pitch list and slash flags while leaving notes, lyrics,
articulations and unrelated target voices unchanged through native save and
MusicXML evidence. MusicXML export now includes voice/staff ownership on grace
notes so lower-staff and voice-2 grace notes reattach to the original target note
on reopen. The selected-note inspector exposes the direct toggle as
`짧은 꾸밈음`, but full-size professional grace-note engraving remains part of
the broader engraving polish blocker.
Selected-note, range and measure-selected fermata object copy/paste/delete are
also supported; they preserve notes, lyrics, articulations and unrelated target
voices while moving only fermatas through native save and MusicXML evidence.
Selected-note, range and measure-selected breath/caesura object copy/paste/delete
preserve the concrete `breath` or `caesura` value while leaving notes, lyrics,
articulations and unrelated target voices unchanged through native save and
MusicXML evidence.
Direct score-object selection has a bounded implementation for visible chord
symbols, dynamics, rehearsal marks, staff text, system text and expression text:
clicking the score object selects its measure and stable object target for
editing. A 2026-09-18 renderer follow-up fixes same-measure staff text visibility
so multiple staff text objects draw in separate lanes and can each be clicked by
stable object id. A second 2026-09-18 renderer follow-up applies the same direct
selection guarantee to multiple same-measure dynamics by stacking them in lower
lanes. Visible chord, dynamic and text objects also expose accessible `role`
and `aria-label` names plus Enter/Space keyboard activation for direct object
selection. Visible slur/hairpin segment targets expose accessible labels plus
Enter/Space keyboard activation for direct span selection. This is still not full
list selection: multi-type object lists, span object clipboard/filter workflows
and broader independent object clipboard remain Required. These choosers do not
complete the umbrella.

System text now exports standard MusicXML `system="only-top"` for generic global
objects; that value and legacy `yes` import as system text. Ordinary `none`
remains local staff text, while Chromatics-authored local system text uses the
existing bold marker to reopen as `systemTexts`. `also-top` text is classified as
system text but its additional staff display relation is not modeled or preserved
and produces an import warning. This does not establish full external-app
system-text semantics, explicit scope editing or full text/engraving parity.

Generated undotted quarter/eighth tempo labels no longer duplicate the numeric
metronome in MusicXML. Other generated labels and custom-text display policy remain
open. MuseScore's generated PDF shows the corrected tempo once, but its CLI exited
134 after writing on two attempts; external runtime verification is not a clean Pass.

## 2026-09-15 Explicit Span Paste Targets

Start/end selectors now address chord events and same-staff cross-voice destination
endpoints; explicit selection overrides automatic duration matching. Invalid or
foreign-staff targets reject without changing notes or markings. Source spans
across voices on one staff can now be copied only for explicit destination-end
selection; automatic paste rejects those snapshots. Chords use one event with multiple pitches;
individual pitch/notehead anchoring is not implemented. Older references below to
"ambiguous chord endpoints" described defensive duplicate-event rejection, not
this actual chord model. Arbitrary ticks, cross-staff anchors, broader independent
objects and human engraving remain Required; current gate evidence is separate.

## 2026-09-14 Clipboard Continuation

Range copy/paste now reports omitted partial spans and saved segments outside its
single-measure range. Slur/hairpin geometry snapshots respect independent part
object/null/inherit overrides; switching view does not change a captured snapshot.
Core/App history and native round-trip tests pass. Actual renderer/disk clipboard
QA passes six 960/1400px cases after the initial launch/approval interruption.
DOM-driven Electron QA is not native file-dialog or human engraving signoff.
Contained octave lines now copy with fresh endpoints; four-type native/XML/pitch
tests pass. Identical staff-wide intervals are reused to avoid double transposition;
conflicting/partial overlaps reject before editing. General octave overlap semantics
remain Required.
Independent slur/hairpin copy now supports exact same-voice endpoint distance,
including cross-measure distance in core tests, without changing destination notes.
Missing/ambiguous chord endpoints and cross-voice source spans explicitly reject.
Other independent objects, cross-measure note ranges and broader editing remain
Required implementation audits, not QA-only or permitted RC gaps.

## 2026-09-14 Recovery Follow-Up

Latest segment follow-up writes native v4 and migrates v1/v2/v3, including v3
independent part geometry. Exact part/staff/measure-boundary segments now support
selection, independent placement/reset/inheritance, history and portable output.
Changed boundaries retain but do not apply saved overrides. Inactive-state UI
now labels these entries, disables geometry edits and offers undoable removal.
Boundary deletion/save/undo/reopen and ensemble insertion/reorder have regression
coverage. Broader structural editing and collision/ledger handling remain Required.
The reproduced continuation/fermata/caesura intersections are fixed and checked
in actual two-page PDF; this is not complete manual engraving signoff.

Legacy v1/v2/v3 autosaves now migrate before current v4 validation; real disk/UI/package
save-reopen tests cover the portable envelope. Unreadable recovery is protected
from subsequent autosave and cleanup. Postponed recovery pauses autosave visibly
until claimed/discarded; File provides retry. Retention/quarantine UI, actual
crash/power-loss and cross-machine QA remain Required, not implied by this pass.
Saved-part open/recovery now targets the visible part. The reproduced single-
event rhythm deletion/native-save failure is fixed with undoable span cleanup.
Other editing/clipboard transactions still require their whole-workflow audit.
Independent slur/hairpin geometry now has native/UI/history/projection and
actual Electron/PDF evidence, including the bounded segment contracts above.
Broader geometry/collisions remain implementation blockers. The reproduced rich Piano staff-text/clef collision is
fixed by adjacent annotation space reservation shared by renderer and print.
Actual 960/1400 and PDF ink checks cover that fixture; extreme ledger/manual
geometry, per-system collision handling and broader dense scores remain Required.
The 960px File command row still needs a viewport-wide
accessibility audit; recovery-modal checks do not establish whole-UI completion.

## 2026-09-13 Direct Span Inspector

Follow-up: numeric placement/X/Y/height and auto reset now persist in native v2
with v1 migration and SVG/PDF evidence. Manual outer bounds prevent clipping;
they do not resolve collisions with adjacent staves/systems. Per-segment handles,
independent part geometry and XML geometry interchange remain implementation work.
The earlier missing-geometry statement below describes the endpoint-only slice.

Slur/hairpin direct SVG/list selection and same-staff endpoint edit/delete/history
now have App, native/XML and 960/1400 actual-renderer evidence. Hairpins accept
rest events; slurs remain note-ended. This is not arbitrary tick, cross-staff,
manual geometry or independent object clipboard support. Those are expanded V1
implementation blockers. Human PDF engraving and native dialogs remain Not run.

## 2026-09-13 Implementation Checkpoint

The native schema and File-menu open/save/Save As are now partially implemented;
the earlier "pending" statement is historical. Native recent files and envelope
autosave/recovery have first implementation evidence. Backup discovery and
read-only recovery UI are implemented; full recovery race audit, manual geometry
and linked part-layout structural editing audits are still Required implementation
blockers, not manual-QA-only. Part titles now support direct edit/reset/undo/redo
and native reopen; page/system breaks support independent editing/removal and
undo/redo from either staff. Part page-setting edits and complete override reset
are undoable. Native snapshots prune removed break anchors while undo restores
live anchors. Aligned score-wide measure insertion/deletion is implemented; repeat/
volta and key/meter-boundary behavior and unaligned-import recovery still require
implementation audit. Aligned signature/repeat/volta boundary tests and part
removal/reordering regressions now cover initial contracts. Removed-staff break
anchors remap by position within an equally sized surviving staff of the same
part, with score/native layout undo/redo. Unequal-staff cases, complex endings
and complete linked-layout authoring remain implementation audits.
Selected-part MusicXML uses the independent
title for the standalone document, without changing the source or instrument name.
Page-setting loss is still reported explicitly. Valid system/page breaks now round-trip using
MusicXML print flags; conflicting per-part external layouts and explicit no-break
constraints are not represented. Cleanup
across document switches preserves dirty native envelopes, startup recovery ignores
stale replies, and native open reconfirms edits to part settings while waiting.
See [native contract](../product/chromatics-native-project-format.md).
Rich part XML now preserves secondary-part/lower-staff markings and shared
repeats. Direction spans now preserve note-onset offset/voice anchors using
ordered XML cursor timing. Hairpins now accept rest-event anchors in range input,
native validation and XML interchange; playback is scoped to the owning staff and,
for same-voice endpoints, that voice. Octave 8va/8vb/15ma/15mb now convert
performed/display pitch and XML direction together, including chord pitches and
instrument transposition in playback/MIDI. The conversion applies to note onsets
in a same-staff interval. Free rhythmic endpoints, held-note/tie boundaries,
overlap/22 shifts and ambiguous older XML recovery remain Required; see queue.
Unrepresentable note anchors are rejected rather than silently snapped. Stop
positions at note ends currently collapse onto that note's ID. Cross-staff spans
and more than 16 same-kind spans occupying an exported measure are not yet supported.
Hairpin clearance now accounts for stems within its staff/span, but extreme low
register spacing and expression-lane interaction remain Required audits. Three-pass
velocity now repeats for note/rest hairpins; cross-ending/missing-stop behavior
still needs audit. The oversized context strip is fixed to 43px, while horizontal
toolbar clipping/scroll access still needs audit. Successful SVG rendering is not
full workspace or engraving signoff.
Range hairpin/slur/octave commands now have a primary Notation Objects group
that remains visible while selecting notes; 960/1400 hit bounds and pointer
commands are covered. The docked dynamics range policy now matches toolbar/dock.
This historical checkpoint did not complete span selection, endpoint/shape editing
or arbitrary rhythmic anchors; later slices added bounded direct span selection
and same-staff endpoint/shape editing, while arbitrary rhythmic anchors,
cross-staff spans and list/filter/clipboard workflows are still Required
implementation tasks, not QA-only.
Native dialogs, external app reopen, listening/engraving and signed installers
remain separate unexecuted release gates. Expanded V1 is not complete.

## 2026-09-12 Expanded V1 Scope Override

The user-approved [Expanded V1 contracts](../product/chromatics-expanded-v1.md) supersede
earlier V1 exclusions for native project storage, MIDI/pitch-first input,
templates/styles, object filters, command customization, docking and image export.
These are now Required implementation tasks, not optional parity or QA-only work.
Current implemented save: MusicXML/MXL and an initial native project slice.
Required target: portable native project plus interchange. Native lifecycle remains
partial; recent/recovery/manual geometry requirements are not completed.
Earlier dated decisions below are historical, not the current release boundary.
Implementation and RC approval are both incomplete until the expanded contracts
and the separate manual/external gates have evidence.

기준일: 2026-09-01

## Document Control

| 항목 | 값 |
| --- | --- |
| 제품 상태 기준 commit | `f526ad7 Complete notation editing issue set` |
| initial evidence package commit | `7364290 Add quality evidence package` |
| quality follow-up 기준 commit | `6fb9698 Refine quality evidence follow-up` |
| 기준 branch | `main` |

## Purpose

이 문서는 사용자, QA 담당자, 운영자가 현재 제품의 의도적 미지원 범위와 미완성 기능을
구분하도록 돕는다. Chromatics Desktop V1의 목표가 전문적인 악보 작업이 가능한
사보앱으로 상향되었으므로, 기본 전문 사보 workflow를 막는 항목은 release notes에
"제한"으로 남길 수 없고 V1 release blocker로 처리한다.

## Professional V1 Blockers Are Not Release Limitations

| 항목 | 내용 |
| --- | --- |
| 유형 | 릴리즈 정책 |
| 제한 | multi-voice, multi-part, part extraction/live part view, page setup, mixer, MIDI export, unsupported MusicXML warning처럼 전문 악보 작업의 기본 신뢰를 좌우하는 항목은 public V1에서 known limitation으로 남기지 않는다. |
| 사용자 영향 | 이 항목들이 미완성인 상태라면 Chromatics는 내부/비공개 QA 후보일 수는 있어도 전문 V1 public release 후보가 아니다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#current-gap-against-professional-v1), [Feature Map](../product/feature-map.md) |

## Commercial V1 Toolbar Information Architecture Is Partial

2026-09-12 update: the previous text/harmony read-only gap is now implemented.
The properties dock edits harmony, rehearsal, staff/system/expression text and
dynamics with selection-aware controls and undo. Compact palette placement and
internal score overflow have local Electron checks. Independent panel visibility
is configurable and persisted; freeform drag-docking, richer object inspectors
and human visual signoff are separate remaining parity work;
this update does not certify every engraving combination.

Common Bb/Eb/F/octave written instrument transposition, part ordering, synchronized
fermata timing, standard MusicXML trill-mark and compressed MXL containers are now
implemented and tested. Written display is retained; concert-pitch display switching
is not implemented. Doubled or non-integer/microtonal transposition is rejected
explicitly. MXL supports the existing partwise MusicXML subset, not an opus, embedded
media renderer or a portable native project. Native dialog/external app testing is
still an RC blocker. The current queue/evidence supersedes historical drained counts.

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | Commercial V1 UX information architecture slice |
| 제한 | 2026-09-04에 현재 작업 컨텍스트 strip과 compact inspector/panel layout을 추가했고, 2026-09-07에 measure-level notation objects를 `표기 객체` 탭으로 분리했으며, chord symbol input을 `가사` 탭의 별도 코드 group으로 옮겼고, PDF/MIDI export와 PDF page setup controls를 `내보내기` 탭으로 분리했다. 2026-09-11에는 Electron E2E가 960px compact desktop에서 모든 work mode를 순회하며 command placement와 overflow를 자동 점검하도록 보강했고, MuseScore Properties parity 첫 조각으로 우측 `속성 도크`의 `선택 요약`과 active measure dynamics 편집을 추가했으며, 좌측 `고정 팔레트`와 notation-mode `셈여림 팔레트`, File mode `단축키 도움말` dialog, measure selection용 `표기 필터`를 노출했다. 2026-09-18에는 단축키 도움말을 전역 context strip에서 열 수 있게 하고, 좌측 팔레트 버튼이 상단 work mode를 바꾸지 않게 분리했으며, 선택 음표에서 plain ↑/↓는 온음계 음높이 이동, Alt/Option+↑/↓는 반음 이동, Shift+↑/↓는 옥타브 이동, Cmd/Ctrl+↑/↓는 인접 보표 이동으로 고정했다. 같은 날 command palette 첫 slice는 Cmd/Ctrl+K 또는 context strip 검색 버튼에서 열리고 work-mode/palette/duration/voice-switch/new-score 명령과 shortcut reference row를 검색하며 ↑/↓ active result 이동과 Enter 실행을 지원한다. 2026-09-23에는 context strip의 `단축키 힌트` toggle과 음가/타이/셋잇단음표/임시표 inline badge, `Alt/⌥+-`, `Alt/⌥+0`, `Alt/⌥+=` 임시표 입력 shortcut을 추가했다. 다만 complete command inventory, 사용자 단축키 설정/충돌 감지, slur/hairpin 등 추가 객체별 Properties inspector, list-selection object copy, freeform drag-docking (기본 표시 설정은 구현됨), 사람이 실제 화면 밀도/naming을 보는 compact desktop visual QA는 아직 완료되지 않았다. |
| 사용자 영향 | 개인용 MVP보다 현재 입력 대상과 상태, 마디 단위 표기 객체 위치, 가사/코드 입력 위치, 출력/페이지 설정 위치를 파악하기 쉬워졌지만, 전문 사보앱 수준의 최종 palette/inspector/work mode 체계로 보려면 release candidate 전 사람 기준 시각 QA가 필요하다. |
| 현재 가능 | 현재 작업, 입력 모드, part/staff/voice 대상, 음가, 재생 상태, 선택 필터를 상단 context strip에서 확인할 수 있고, 같은 strip의 키보드 버튼에서 핵심 단축키를 바로 확인할 수 있다. 같은 strip의 `⌘` 버튼으로 음가/타이/셋잇단음표/임시표 inline shortcut badge를 표시하거나 숨길 수 있으며, 임시표는 `Alt/⌥+-`, `Alt/⌥+0`, `Alt/⌥+=`로 입력한다. 같은 strip의 검색 버튼 또는 Cmd/Ctrl+K로 명령 검색을 열어 work mode를 전환하거나 `옥타브` 같은 단축키 항목을 찾아 도움말로 이동할 수 있으며, 검색 결과는 ↑/↓와 Enter로도 실행할 수 있다. 명령 검색에서 duration 명령은 기존 duration toolbar와 같은 편집 경로로 적용되고, voice-switch 명령은 기존 성부 전환 경로를 사용하며, palette 명령은 상단 work mode를 유지한 채 좌측 팔레트 category만 바꾸고, `새 악보` 명령은 새 악보 만들기 dialog를 연다. 좌측 `고정 팔레트`는 팔레트 category만 바꾸며 상단 work mode는 유지한다. 선택된 event/measure/range의 위치, 성부, 음가, 박자 같은 핵심 속성은 우측 `속성 도크`의 `선택 요약`에서 확인한다. active measure dynamics는 `선택 요약`과 좌측 `셈여림 팔레트`에서도 바로 편집할 수 있고, rehearsal mark, staff/system/expression text, dynamics, repeat/volta, measure clef는 `표기 객체` 탭에서 조작한다. Range selection에서는 measure-level text/dynamics controls가 disabled 상태로 남아 현재 선택에 바로 적용 가능한지 구분된다. File command surface의 `표기 필터`는 measure selection에서 `코드` 또는 `셈여림`만 골라 삭제하거나 별도 object clipboard로 복사/붙여넣기 할 수 있다. Score Setup의 `악보` 탭은 빠르기와 파트/보표 같은 구조 설정 중심으로 남아 있다. 코드 심벌은 `음표` 탭이 아니라 `가사` 탭의 코드 group에서 입력하며, note/rest 선택은 해당 event tick, measure 선택은 tick 0에 붙는다. `내보내기` 탭은 PDF 변환, MIDI 내보내기, PDF 목표 장수, page size/orientation/margins/staff size/system spacing/preset controls와 page margin guide preview를 제공한다. MusicXML save는 full-score primary save이고, PDF/MIDI export는 현재 full score 또는 selected part view를 따른다. E2E compact/headless guard는 File/Export 분리, Lyrics/Chords chord input 위치, Notation Objects 노출, playback controls, 960 compact short/tall 및 1400 desktop-short overflow/page visibility, selected part view export state, playback mixer persistence/activity를 확인한다. |
| 문서 근거 | [Commercial V1 Reference Gap Matrix](../product/chromatics-commercial-v1-reference-gap-matrix.md#commercial-v1에서-반드시-줄여야-할-blocker) |

## Backend Is Not Live

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | #316 |
| 제한 | 공개 사이트 Auth client와 publishable env 주입은 적용되었지만, OAuth provider 설정, schema, RLS, 서버 데이터 운영은 아직 완료되지 않았다. |
| 사용자 영향 | provider 설정 전에는 소셜 로그인 버튼이 성공하지 않으며, 커뮤니티 데이터와 서버 CRUD가 필요한 기능은 현재 제품 범위 밖이다. |
| 문서 근거 | [Supabase Backend Plan](../product/supabase-backend-plan.md), [Risk R-001](risk-register.md#r-001-supabase-backend-is-not-operational) |

## Multi-Voice Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #93 |
| 제한 | 같은 staff 안에서 여러 독립 voice를 완전하게 입력/전환/편집하는 UX가 남아 있다. |
| 사용자 영향 | 복잡한 피아노/합창/대위적 악보 작성은 제한된다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 단성부, chord notes, voice 1-4 toolbar/shortcut 전환, note input target 유지, same-staff voice 2 range delete/copy/paste, `전체/음표만/쉼표만` 선택 필터와 addressed voice scoped filtered delete/copy/paste, playback active event voice-aware selection/highlight, stop/jump 후 selection 유지 정책, address-scoped range visual highlight 첫 슬라이스, drag range anchor voice-lane guard, selected range band visual polish 첫 슬라이스, MusicXML voice stream import와 backup export 첫 슬라이스, 다성부 staff에서 voice 1/3 upper/up-stem lane과 voice 2/4 lower/down-stem lane을 쓰는 rest/stem renderer policy. |
| 문서 근거 | [Risk R-002](risk-register.md#r-002-multi-voice-editing-is-not-complete), [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#score-model) |

## Multi-Part Ensemble Editing Is Not Complete

| 항목 | 내용 |
| --- | --- |
| 유형 | 부분 지원 |
| 연결 이슈 | #94 |
| 제한 | 고급 표기가 포함된 저장/재열기, 출력까지 완성하는 workflow가 남아 있다. |
| 사용자 영향 | 합주보/앙상블 score authoring은 아직 안정 지원으로 보지 않는다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 단일 part 중심 workflow, 새 악보 마법사의 `악보 구성` 단일 템플릿 선택 그룹과 piano grand staff/2-part/string quartet skeleton 생성, piano grand staff/multi-part stacked preview 첫 슬라이스, 추가 staff 이벤트 선택과 note input target 보존 첫 슬라이스, note toolbar의 입력 보표 전환 UI, plain `Up/Down`의 인접 part/staff/voice lane navigation 첫 슬라이스, `J` 이명동음 respell과 modifier 기반 diatonic/chromatic/octave transpose 회귀 검증, 악보 탭의 part/staff add/remove/rename 첫 슬라이스와 삭제 reference cleanup, 현재 보표 전체 음자리표 선택 첫 슬라이스, 악기 라이브러리 기반 part 생성 첫 슬라이스, multi-staff notation object anchoring 첫 슬라이스, MusicXML multi-staff/multi-part 구조와 기본 note/rest event round-trip, string quartet part별 입력 후 MusicXML 저장/최근 파일 재열기 App workflow 자동 검증 첫 슬라이스, local file-path/part-id 기반 selected-part PDF page setup preference restore, multi-part playback addressing 일부. |
| 문서 근거 | [Risk R-003](risk-register.md#r-003-multi-part-ensemble-editing-is-not-complete), [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#score-model) |

## Part Extraction Or Live Part View Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 총보에서 선택 part만 보는 live part view와 파트보 제목 첫 슬라이스는 있으나, 독립 파트보 레이아웃 polish와 file dialog 기반 실제 파트보 PDF visual QA가 아직 부족하다. |
| 사용자 영향 | 앙상블 리허설과 배포에 필요한 파트보 제작 신뢰도가 아직 충분하지 않다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 총보 중심 렌더링 일부, MusicXML 기반 교환, 악보 탭의 총보/파트보 보기 전환, 선택 part만 표시하는 프리뷰, 파트보 제목 표시, part view를 PDF 출력 대상으로 쓰는 첫 구현, 파일 경로별 마지막 총보/파트보 선택을 로컬 preference로 저장/복원하는 V1 정책 첫 구현, App 테스트의 string quartet Viola part PDF print target/compact parts preset 검증, import-origin 2-part part view/PDF renderer에서 첫 part staff-level annotation이 다른 part로 새지 않는 회귀 검증, macOS arm64 unpacked packaged smoke의 string quartet Cello part page/title metadata, visible event part id, compact parts page setup metadata, PDF target/write/structure 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [Feature Map](../product/feature-map.md) |

## Page Setup And PDF Settings Are Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 페이지 크기, 방향, 여백, 보표 크기, 시스템 간격의 file dialog 기반 실제 PDF 출력 visual QA와 저장 파일 round-trip polish가 아직 완료되지 않았다. |
| 사용자 영향 | 출력물 설정은 조절할 수 있지만, 실제 PDF 결과와 packaged app 출력에서 수업/리허설/소규모 출판 품질을 아직 충분히 입증하지 못했다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | PDF 변환 흐름, 기본 렌더링, `내보내기` 탭 PDF page setup UI, default A4/rehearsal Letter/publication A4/compact parts preset 첫 구현, print layout planner 반영, `default`/`readable`/`compact` engraving style contract와 compact parts spacing unit regression, PDF export renderer가 캡처하는 score page DOM의 normalized page setup metadata, manual Letter landscape/publication A4/compact parts preset renderer contract App 검증, MuseScore parity page margin guide preview toggle, export capture 중 margin guide 숨김 App regression, packaged app 새 악보 총보 PDF와 Cello part view PDF 구조 및 compact parts page setup metadata smoke. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [Feature Map](../product/feature-map.md) |

## Native Project Format Is Post-V1

| 항목 | 내용 |
| --- | --- |
| 유형 | 명시적 제품 정책 |
| 제한 | Chromatics V1은 별도 전용 프로젝트 파일 포맷을 제공하지 않고 MusicXML을 primary save로 사용한다. |
| 사용자 영향 | MusicXML이 표현하지 못하는 일부 Chromatics 전용 layout/view 상태는 파일 자체에 들어가지 않으며, 저장/내보내기 warning과 release notes에서 안내한다. |
| 현재 가능 | MusicXML 저장/열기/최근 파일, autosave/recovery snapshot, 파일 경로별 part view preference, MusicXML export-side warning report, `npm run verify:chromatics-v1-save-policy` 기반 release docs/export warning/work queue 정책 일관성 검증. |
| migration path | post-V1 전용 프로젝트 포맷을 도입하면 기존 MusicXML을 먼저 import하고, 안전하게 매핑 가능한 로컬 preference만 migration한다. MusicXML에서 보존되지 않은 layout 데이터는 warning report를 기준으로 사용자가 재설정하도록 안내한다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#document-lifecycle), [V1 Blocker Backlog](../product/chromatics-v1-blocker-backlog.md#v1-polish-after-blockers) |

## Professional Engraving Collision Avoidance Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | lyrics, dynamics, hairpins, slurs, chord symbols, rehearsal marks가 핵심 QA 악보에서 항상 읽을 수 있게 배치된다는 solo/grand staff/ensemble 시각 검증이 아직 완료되지 않았다. |
| 사용자 영향 | 복잡한 실전 악보에서 일부 표기 간격은 public V1 전 추가 polish와 visual/manual QA가 필요하다. |
| 현재 가능 | Same-staff voice rhythmic density 기반 measure width 보강, lyrics 아래 dynamic/hairpin/expression text lane stacking, system text/rehearsal/chord/staff text upper lane stacking 첫 구현, rehearsal mark와 여러 chord symbols 및 staff text가 같은 measure에 있을 때 chord/staff/rehearsal upper annotation baseline을 16px 이상 분리하는 dense lane 보강, system text가 함께 있는 dense stack에서는 rehearsal mark를 system text 위로 올리는 collision avoidance, renderer annotation lane metadata, hairpin span start/end lane y-offset 보정, lower annotation lane이 있는 slur의 above-side avoidance, `ppp/pp/p/mp/mf/f/ff/fff/sfz` dynamics UI/MusicXML/playback velocity 지원, `release-test` App workflow의 lyric syllabic/melisma와 chord symbol MusicXML 저장/재열기 보존 자동 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#layout-and-engraving), [V1 Blocker Backlog](../product/chromatics-v1-blocker-backlog.md#release-blockers) |

## Windows Dev Server Advisory Is Unverified

| 항목 | 내용 |
| --- | --- |
| 유형 | 보안/개발 환경 미확인 |
| 연결 이슈 | #8 |
| 제한 | esbuild/Vite low severity advisory의 Windows dev server 영향이 실제 Windows에서 확인되지 않았다. |
| 사용자 영향 | production app build보다는 Windows 개발자 환경 안내에 영향이 있다. |
| 현재 가능 | macOS 기준 `npm audit --audit-level=moderate`는 통과한다. |
| 문서 근거 | [Windows Dev Audit](../security/windows-dev-audit.md), [Risk R-004](risk-register.md#r-004-windows-dev-server-advisory-remains-unverified) |

## Advanced Notation Exclusions

| 항목 | 내용 |
| --- | --- |
| 유형 | 고급 해석 미완성 |
| 연결 이슈 | #321에서 사용자-facing 상태 문서와 feature map 동기화 |
| 제한 | 최근 notation extension은 지원되지만, 일부 고급 해석은 현재 안정 지원 범위 밖이다. V1 필수 표기와 후속 고급 확장을 계속 분리해야 한다. |
| 사용자 영향 | 고급 사보 파일을 가져오거나 재생할 때 일부 표시는 보존되더라도 전문 engraving/playback까지 완전하다고 보장하지 않는다. V1 필수 표기와 discrete tempo map은 별도 지원 범위로 유지하고, text-only tempo curve처럼 해석이 필요한 항목은 후속 고급 playback으로 다룬다. |
| 현재 제외 | text-only tempo curve playback, octave-shift playback pitch transposition, actual repeated oscillator tremolo playback, two-note tremolo, mid-measure clef changes. |
| 현재 가능 | repeat barline/count 입력, score-wide repeat/volta playback expansion 자동 검증, system/expression text 입력/표시/MusicXML 보존, positioned tempo event BPM 입력/삭제와 tempo map playback 반영, repeated measure tempo event playback 반영, octave-shift 표시/MusicXML 보존, single-note tremolo slash 입력/표시/MusicXML 보존. |
| 문서 근거 | [Traceability Matrix](traceability-matrix.md#notation-editor), [Notation Extension Roadmap](../architecture/notation-extension-roadmap.md) |

## Mixer And MIDI Export Are Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | part별 mute/solo/volume mixer의 실제 청감 QA와 MIDI export의 실제 DAW/notation app 열기 검증이 아직 완료되지 않았다. |
| 사용자 영향 | 여러 파트 악보를 확인하고 다른 음악 도구와 주고받는 전문 workflow가 제한된다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | 기본 playback, tempo control, tempo map playback, playback 탭 part mixer 첫 구현, string quartet App workflow의 part별 mute/solo/volume 독립 상태 전달 검증, 2026-09-12 MuseScore parity slice의 mixer mute/solo/volume localStorage 저장/복원과 active part `재생 중`/`대기` row activity 표시, multi-part scheduler 후보의 mute/solo/volume gain과 재시작 beat velocity interpolation 자동 검증, tie/tuplet/repeat timeline 자동 검증 일부, piano grand staff playback event의 part/staff/voice address 보존 회귀 검증, string quartet Cello playback event의 jump-to-start 후 selection 유지/cursor 초기화 App 검증, Standard MIDI File type 1 내보내기, multi-part MIDI track/channel/program 분리 첫 구현, percussion/tab staff를 V1 MIDI note output에서 제외하고 `unsupported-midi-clef` 경고를 표시하는 정책 첫 구현, `verify:midi-fixtures`의 solo melody/piano grand staff/string quartet MIDI header/track/program/note event 자동 검증. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#playback), [Feature Map](../product/feature-map.md) |

## MusicXML Warning And External Fixtures Are Missing

| 항목 | 내용 |
| --- | --- |
| 유형 | 미완성 기능 |
| 연결 이슈 | 필요 시 신규 이슈 |
| 제한 | 실제 MuseScore/Dorico/Sibelius/Finale export-origin fixture 검증과 지원 표기 false positive warning 제거 범위 확장이 아직 부족하다. 2026-09-11 audit에서 MuseScore 4.7.5는 로컬 설치가 확인됐고 MuseScore CLI app-export fixture와 import/render smoke는 추가됐지만, MuseScore GUI-created source score와 reopen/manual snapshot은 아직 수집하지 않았다. Finale는 로컬에 설치되어 있지 않아 Finale-origin migration fixture가 필요하다. |
| 사용자 영향 | 외부 사보앱에서 가져온 파일의 손실 여부를 사용자가 신뢰하기 어렵다. Professional V1 public release 전에는 해결해야 한다. |
| 현재 가능 | MVP subset과 최근 notation extension round-trip 테스트, MusicXML multi-staff/multi-part 구조와 기본 note/rest event round-trip, multi-staff imported score-level direction의 MusicXML 재저장 보존, import-side unsupported notation/direction warning report 첫 구현, export-side app layout data warning report 첫 구현, import/export 상세 report UI 첫 구현, `pp/ff/sfz` dynamics warning-free import/export 검증, MuseScore seed의 `mf` dynamic/staccato articulation warning-free import/export 검증, Dorico seed의 unsupported warning code/path snapshot 검증, MuseScore/Finale/Sibelius/Dorico compatibility seed fixture QA, MuseScore 4.7.5 CLI app-export fixture 수집과 warning-free round-trip 검증, MuseScore lower-staff raw `<voice>5</voice>` 입력 조건과 Chromatics staff-local `voice-1` normalize 결과 fixture 검증, fixture manifest의 origin/status/export setting/evidence/dynamics/articulation/warning path/reference role/manual QA status gate와 앱별 manual collection requirement 추적, `npm run verify:notation-reference-apps` 기반 MuseScore/Dorico/Sibelius/Finale local environment audit, `npm run verify:musescore-cli-fixtures` 기반 MuseScore 4.7.5 CLI import/render smoke. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#import-and-export), [External MusicXML Fixture QA](external-musicxml-fixture-qa.md), [MusicXML MVP](../musicxml-mvp.md) |

## Commercial V1 Work Queue Is Active

| 항목 | 내용 |
| --- | --- |
| 유형 | 릴리즈 운영 장치 |
| 제한 | 큐는 blocker 추적과 자동화 가능한 다음 작업 선정을 돕지만, 큐 통과가 Commercial V1 완료 판정은 아니다. |
| 사용자 영향 | 다음 작업자가 매번 새 프롬프트로 범위를 다시 추측하지 않고, MuseScore/Finale/Dorico/Sibelius 기준 남은 work item과 manual blocker를 바로 이어갈 수 있다. |
| 현재 가능 | `docs/product/chromatics-commercial-v1-work-queue.md`가 11개 blocker row와 다음 action을 유지하고, `npm run verify:chromatics-v1-work-queue`가 table schema, approved status values, required categories, non-empty next actions를 검증한다. |
| 문서 근거 | [Commercial V1 Work Queue](../product/chromatics-commercial-v1-work-queue.md) |

## Production Deployment Smoke Is Separate

| 항목 | 내용 |
| --- | --- |
| 유형 | 운영 검증 미실행 |
| 연결 이슈 | 필요 시 후속 이슈 |
| 제한 | 이 package는 production URL, DNS, hosting 전환, GitHub Pages 비활성화 등을 수행하지 않는다. |
| 사용자 영향 | 실제 production release 전에는 별도 smoke evidence가 필요하다. |
| 문서 근거 | [Release Readiness Checklist](release-readiness-checklist.md#deployment-and-rollback), [Production Playbook](../operations/production-playbook.md) |

## Packaged Desktop Smoke Is Partial

| 항목 | 내용 |
| --- | --- |
| 유형 | 릴리즈 검증 미실행 |
| 연결 이슈 | V1 Slice Q 또는 release candidate QA |
| 제한 | macOS arm64 unpacked app의 자동 smoke는 새 악보 workspace 표시, bridge 기반 MusicXML 파일 쓰기/다시 열기, 총보 PDF와 Cello part view PDF 구조/target/page setup metadata 검증, MIDI type-1 tempo/note track 구조 검증까지 통과했지만, macOS/Windows packaged app에서 실제 file dialog, quit dialog, save/open/export 흐름은 아직 별도 수동 smoke가 필요하다. |
| 사용자 영향 | 개발 환경에서는 데이터 손실 방지 경로가 검증됐지만, Professional V1 public release 후보로 부르기 전에는 설치된 앱에서 새 악보 작성 -> 저장 -> 재실행 -> 열기 -> PDF/MusicXML/MIDI export를 확인해야 한다. |
| 현재 가능 | 새 악보/열기/최근 파일 전환 전 unsaved-change guard, clean open state, beforeunload guard, macOS arm64 `package:dir` 산출물의 preload bridge/start screen/start action/string quartet workspace/notation SVG/smoke-only MusicXML write/recent-open/score PDF structure/Cello part view page and title metadata/visible event part id/compact parts page setup metadata/PDF target and structure/MIDI type-1 structure/autosave 자동 smoke. Linux는 V1 public release target이 아니라 post-V1 follow-up target으로 분리했다. |
| 문서 근거 | [Chromatics Desktop V1](../product/chromatics-desktop-v1.md#document-lifecycle), [Traceability Matrix](traceability-matrix.md#notation-editor) |

## Manual QA Is Still Required For Release Candidates

| 항목 | 내용 |
| --- | --- |
| 유형 | 수동 확인 |
| 연결 이슈 | 필요 시 QA 기록 이슈 |
| 제한 | 자동 E2E는 핵심 흐름을 검증하지만, 패키징된 앱에서 사람이 전문 악보 샘플을 완성하는 수동 QA를 대체하지 않는다. |
| 사용자 영향 | release candidate 전 solo score, piano grand staff score, 2-4 part ensemble score 작성과 PDF/MusicXML/MIDI export/reopen 확인이 필요하다. |
| 문서 근거 | [Manual Score Completion QA](../releases/manual-score-completion-qa.md) |
