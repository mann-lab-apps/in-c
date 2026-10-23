# Chromatics MuseScore Parity Roadmap

## 2026-10-23 Rhythm-feel Ink and Ending-count Isolation

Rhythm-feel text, musical glyphs and the painted triplet bracket now reuse the
page preflight. Coordinates remain visually identical but are expressed in page
space rather than a translated group; fixed header ink does not inflate staff
spacing. Two long-text renderer cases and a real-font Electron rejection fail
before the fix. Stroke-boundary coverage is additional regression coverage.

Four files / 215 layout tests, typecheck/build and unchanged visual regression
pass. Production `--audit-rhythm-feel-page` and `--audit-rhythm-feel-16th-page`
check 960/1400, native preservation, explicit replacement through the real rhythm
control and reviewed one-page PDF retries. Long custom text reaches 4125.393 /
4219.393 against width 750. Default numeral top is 0.256px in this font: it fits,
but that is not evidence for every font/platform. No truncation or manual move.

The independent ending-count experiment now ran: removing only the ending's
repeat count from temporary source/round-trip XML still yields nine MuseScore
notes versus the independently expected eight, with both CLI stages exiting 0.
Fresh as-written runs instead abort, including an isolated run without Electron.
Do not conflate these failures. No product traversal/export or expectations were
changed. Header/title, print-tail padding, external GUI/listening and broader
repeat interpretation remain open. Current full suite finishes with 1,166 passed,
two App timeouts and nine skipped (608.40s). Both timed-out cases pass unchanged
in a focused rerun, but the full gate remains failed; timing cause is unproven.
The 1,163-test result below predates this slice.

## 2026-10-23 Tempo Ink and Visibility Preservation

Global and positioned tempo text now participates in measured page preflight;
positioned ink also reuses automatic staff/system spacing. Fixed header tempo
does not move with the staves, and print-hidden tempo is excluded from printed
ink checks. No automatic text shortening. A visibility-only edit now preserves
imported wording instead of replacing it with a generated metronome label.

Three renderer regressions and an App native/history regression fail before the
fix. Production `--audit-tempo-page` reproduces real width overflow (4720.014 vs
750) and rejects before PDF IPC at 960/1400. Using the real visibility checkbox
preserves wording/BPM/native content apart from transparency; reopen and reviewed
one-page PDF retry pass. Four files / 211 layout tests, 18 App/PDF/tempo tests,
types/build and unchanged visual regression pass. Post-tempo full gate passes
71 files / two skipped, 1,163 tests / eight skipped (559.04s).
The tall positioned-tempo probe uses synthetic metrics, not a real-font vertical
failure claim. Title/header, rhythm-feel glyphs, print-tail padding and external
nested-repeat/GUI/listening QA remain open.

Read-only repeat specification review records a separate ending-count isolation
experiment in `docs/testing/musescore-playback-qa.md`. No XML fixture, traversal,
expected MIDI or external comparison result is changed by that review.

## 2026-10-23 Inline Clef Geometry and Effective Clef

Inline clefs now use VexFlow's small SMuFL clef on the actual staff, replacing the
floating generic-font character. A shared tick-based clef resolver drives note
and rest placement across voices on that staff, next-measure clef visibility and
primary-system ledger-space calculation. Source pitches, native objects and
manual geometry are not rewritten. Inline glyph ink joins the existing measured
page/spacing path rather than using its selection region.

Five renderer failures, two boundary-visibility failures and a ledger-space
failure precede the correction. Focused four files / 204 tests, five App/XML tests,
types/build and unchanged visual regression pass. Production 960/1400 verifies
Bravura glyphs, staff baselines and C5 note positions. Actual painted clef bottom
1090.307 exceeds the default page bottom 1086 while staff bottom 1074.367 fits;
preflight blocks before IPC. The real PDF control changes staff size to 90%, then
native reopen and a reviewed one-page PDF pass with only that page setup changed.
Broad rerun passes 71 files / two skipped, 1,159 tests / eight skipped (568.05s),
including concurrent worktree additions. This is not a fix for general trailing blank pages, nor
approval of dense accidental/chord collisions, contradictory simultaneous clefs,
external GUI exchange, tempo/header ink or nested-repeat interoperability.

## 2026-10-23 Harmony Page Ink

Chord-symbol text now joins the existing measured-ink/page-preflight and automatic
vertical-spacing paths. Two controlled-metric regressions fail before the fix;
production also reproduces the missing rejection for an imported long label.
At 960/1400, real ink reaches x 1083.039 beyond print width 750. The Add menu and
shared chord property edit that same object to C7, allowing a reviewed one-page
PDF with native content otherwise preserved. No model, truncation or manual
geometry policy changes. Four focused files / 201 tests, types/build and visual
regression pass without a baseline update. Whole-suite run: 70 files passed / two
skipped, 1,137 tests passed / eight skipped. Concurrent brand changes are preserved;
post-run type/targeted gates and their exact scope are recorded in evidence.
Inline clef, tempo/header ink and
external nested-repeat interoperability remain open.

Initial `--audit-inline-clef-page` checked actual G/F/C glyph ink on nine staves,
960/1400 and native reopen. All nine fit the first page, but PDF review revealed a
blank second page (SVG/layout height 1125 vs printable 1086), plus inline clefs
floating above the staff rather than aligned as conventional mid-measure clefs.
This audit is not PDF/engraving approval. Do not truncate the SVG based on one
glyph or count its transparent selection rectangles as painted ink. Tail-space
and inline-clef alignment needed separate regressions. The later inline-clef
contract above supplies the geometry/effective-clef fix; general tail padding
remains unresolved.
Read-only follow-up also found `createStaveNote` used `measure.clef` for both note
and rest positions without consulting `clefBefore`. The follow-up tests the
same-staff effective clef from its tick onward and next-measure behavior without
changing pitch/playback/native data. Dense and external clef parity is not implied.

## 2026-10-23 External Comparison Without Preference Reset

All five CLI QA export call sites share tested arguments without factory/revert
flags. Installed 4.7.5 has no config-folder option; outputs are temporary but
consumer settings are not isolated. Types and three argument regressions pass.
Simple endings now reach a passing three-way MIDI comparison with normal exits.
Nested repeat and nested volta also reach normal-exit comparison: original and
Chromatics round-trip inputs produce identical MuseScore notes, but differ from
Chromatics' independent 12/8-note expectations with nine notes each. Both remain
compatibility failures; no traversal expectation is weakened. An initial nested
attempt still aborts, so CLI reliability and GUI/listening QA remain open.

Latest default broad gate: 70 files passed / two skipped, 1,134 tests passed /
eight skipped. Two earlier runs timed out only in the existing multi-reopen volta
workflow; its assertions remain intact with a scoped 15s budget. External opt-in
semantic failures are not converted to passes by this default-suite result.

## 2026-10-23 Rehearsal Frame Ink and Page-start Spacing

Rehearsal text and its painted frame (including half the stroke width) now reuse
the measured-ink/PDF preflight path. A real-font probe has text within the page,
the frame centerline at x 750, and painted ink at 750.75: save is correctly blocked
before IPC. The real Add menu opens the existing rehearsal property field; editing
that same object to `A` allows a one-page PDF, with native content otherwise intact.

Measuring this upper frame also exposed duplicate top-space reservation. Page
starts now combine existing annotation space with measured clearance instead of
adding both in full, retaining the base header margin. Between-system clearance,
explicit/automatic page breaks, oversized-system rejection and manual geometry
remain protected. Four focused files / 199 tests pass; production 960/1400,
native/retry PDF and reviewed snapshot results are recorded in evidence. The
previous upper-text snapshot shift is superseded by this spacing correction.

Inline clefs, chord symbols, tempo/header ink, real-score typography and external
nested-repeat interoperability remain incomplete. This is not full page-ink or
MuseScore parity approval.

## 2026-10-23 Horizontal Ink and Upper Text

PDF preflight now checks horizontal bounds of measured text, leading symbols and
tie/slur/hairpin ink against the rendered SVG viewport. It reports width overflow
separately from height and retains the editor selection/retry path. Staff/system
text joins actual ink measurement; its ascent also feeds existing automatic
spacing instead of merely rejecting a fitting upper annotation. No wrapping,
text truncation, manual repositioning or native-score rewrite is introduced.

Focused layout 192 tests, PDF App 11 tests, types/build and production 960/1400
pass. A long imported staff text reaches x 3221.91 beyond a 750-wide print area;
save is rejected before IPC. The real Add menu/property editor shortens that same
object, then a reviewed one-page PDF exports. A controlled large-ascent test
checks automatic fitting separately from real-font evidence. Snapshot capture
review shows the expected 10.826px vertical shift for measured upper text; final
visual/broad results are in evidence. Header, inline-clef, harmony/rehearsal and
other unmeasured ink plus external nested-repeat compatibility remain partial.

## 2026-10-23 External Traversal Isolation

The opt-in MuseScore MIDI test now compares original-fixture and Chromatics
round-trip imports before checking the independently specified traversal. It
retains per-stage process evidence and does not accept outputs from aborted runs.
Current attempts fail with SIGABRT: simple endings/nested volta at round-trip,
plain nested repeat at source. No new semantic conclusion or product change.
Internal focused 46 tests pass with three external skips; source-vs-round-trip
comparison still needs normal exits. CLI instability and GUI/listening QA remain.

## 2026-10-23 Leading Symbol Page Ink

Leading clef/key/time modifiers now contribute their actual rendered text ink to
system envelopes and PDF preflight. The existing canvas/font/anchor measurement
is reused; selection rectangles are not glyph bounds. These left-edge symbols do
not inflate every internal staff annotation lane. Score and manual geometry stay
unchanged. Inline clefs and upper/header text remain outside this slice.

Focused 188 tests, types/build, production 960/1400/native/PDF and unchanged
notation snapshots pass. Controlled-metric tests cover all three symbol kinds;
actual-font evidence is the treble clef: staff bottom 1051.5 fits page bottom 1063,
but clef bottom 1067.44 crosses it. The whole score is rejected before save and
Part 9 exports to a reviewed one-page PDF. Broad results are in evidence. This
does not establish general page fitting or external nested-repeat compatibility.

## 2026-10-23 Tie Contour Page Ink

VexFlow's actual filled tie paths now feed staff/system spacing and PDF preflight.
The renderer does not duplicate the curve formula or change tie/playback semantics.
Cross-system and alternate-ending pieces are associated with their own systems.
Nine-staff low-tie unit and production probes reproduce missing rejection; the
affected part retries with its tie intact and native content preserved.

Four files / 185 focused tests, types/build, 960/1400 production/PDF and unchanged
notation snapshots pass. Actual print tie bottom is 1109 with staff y 993. A
reviewed one-page Part 9 PDF retains the low-note tie. Production nested-volta
engraving/playback/native checks also pass for the existing Chromatics contract,
not external MuseScore equivalence. Broad results are in evidence. Tests with
jsdom use explicit tie metrics only where needed; actual SVG evidence is separate.
Clef/header/upper text ink, general fitting and external nested-repeat QA remain.

## 2026-10-23 Lower Text Page Ink

Lower lyrics, dynamics and expression text now reuse canvas ink measurements for
staff/system spacing and PDF preflight. The shared measurement respects the
rendered font and text anchor; it does not use selection targets. A nine-staff
expression fixture reproduces missing rejection in both unit and pre-fix Electron
runs. Unit coverage also includes lyrics/dynamics, fitting-part retry and print
exit. A deliberately enlarged-descent metric fixture verifies moving a later
system to the next page instead of merely rejecting an otherwise fitting system.

Four focused files / 183 tests, types/build, production 960/1400/native/PDF and
notation snapshots pass with unchanged baseline. The actual expression ink bottom
is 1187.82 with last staff y 993; the full score is rejected before save, while
Part 9 retains all four texts in a reviewed one-page PDF. Broad results are in
evidence. Tie/clef/header-only page ink, general fitting and external nested-repeat
compatibility remain open; no new MuseScore GUI/listening or native-menu/IME pass.

## 2026-10-23 Hairpin Ink PDF Preflight

The existing page guard now includes actual hairpin line endpoints and painted
stroke width, excluding transparent selection targets. Manual geometry and score
content are unchanged. Nine-staff crescendo/diminuendo tests reproduce missing
rejection; a stroke-only edge case, fitting retry and leaving print mode are
covered. The pre-fix production probe also reaches PDF save without rejection.

Focused layout 179 tests, types/build, production 960/1400/native/PDF and notation
snapshots pass without baseline changes. Production reports staff y 993 and
hairpin bottom 1217.9, rejects measure 1 before save, then exports the affected
Part 9 with unchanged manual height. Its one-page PDF and rejection/detail
captures were reviewed. Broad results are recorded in evidence. This is a stress
fixture, not general page fitting or real-score approval; ties, text/header ink,
external nested-repeat compatibility, native menus and IME QA remain open.

## 2026-10-23 Independent MIDI Consumer Audit

Added opt-in MuseScore MIDI comparison using the Mido parser, rather than treating
Chromatics playback of reimported XML as proof of MuseScore playback. Simple volta
note order/onsets and tied sustain match on a normal-exit run; nested repeat and
nested-ending cases reproduce 12-vs-9 and 8-vs-9 note differences. Those tests remain
strict failures when enabled. Repeated CLI mutex/SIGABRT failures are a separate
execution limitation, not semantic evidence. No product traversal was changed.

[Playback QA commands and limits](../testing/musescore-playback-qa.md) document the
optional dependencies, retained comparison artifacts and skipped-by-default tests.
Five helper tests, internal focused 80 tests and typecheck pass. No fresh full
suite, UI/PDF or GUI/listening pass is claimed for this verification-only slice.
External nested-repeat compatibility remains open.

## 2026-10-23 Slur Ink at PDF Page Boundaries

PDF preflight now checks each rendered slur's filled contour against its system's
page, including manual geometry. It reuses actual slur ink bounds, not selection
hit paths, and accounts for a shifted SVG viewport. A nine-staff regression has
staff lines inside the page but a lower manual slur outside it; rejection was
missing in both the renderer test and the pre-fix Electron build.

Focused layout 177 tests and App PDF 10 tests, types/build, complete span/native/
PDF runner and notation snapshots pass. Production 960/1400 reports last staff y
993 and slur ink bottom 1332.6, rejects before save and preserves native content.
The affected Part 9 then exports with unchanged manual height to a reviewed
one-page PDF. Controls restore a fitting curve and leave print mode without stale
warnings. No baseline update. Full-suite result is in evidence; this is not a
complete ink preflight (hairpins, ties, annotations and headers remain separate).
External real-score/MuseScore review and native-menu/IME QA remain open.

## 2026-10-23 PDF Staff-system Preflight

The renderer now identifies a system whose actual VexFlow staff-line range crosses
a PDF page boundary. App PDF save rejects it before invoking the save bridge,
names the starting measure and restores editing. The same score remains savable
as a fitting part. This reuses print layout, App error/finally handling and part
projection; no score schema, manual geometry or automatic resizing is changed.

Renderer/App red cases and the pre-fix production rejection probe fail then pass.
Focused PDF tests (13), layout tests (176), typecheck/build, full span/PDF runner
and notation snapshots pass without baseline changes. At 960/1400 the 32-staff
case reports measure 1, never calls PDF save and retains native content; Part 1
then saves to a visually reviewed one-page PDF. Both rejection captures fit.
Broad results are in evidence. Detection covers staff-line extents, not every
external annotation, slur or header; general PDF preflight and fitting remain
partial. Prior three-page oversized PDF is historical defect evidence, not an
approved/current App export path. External MuseScore/manual QA remains open.

## 2026-10-23 Oversized System Page Start

Page alignment no longer moves a system already at the page top to another empty
page merely because it exceeds the available height. First-system and explicit
page-break regressions fail then pass; normal later-system page movement remains
covered. No new scaling, score mutation or manual-geometry policy is introduced.

Focused four files / 176 tests, types/build, production 960/1400/native/PDF and
notation snapshots pass without another baseline change. The App's page-count
fitting masks the 12-staff auto-plan case; the 32-staff production fixture instead
reproduces first-y 1665 before the fix and 97 afterward. Its three PDF pages and
desktop captures were inspected. **This extreme PDF is not engraving-approved:**
staff/clef ink still crosses page cuts at Parts 14 and 28. Oversized-system
preflight/fit or safe rejection remains open, alongside real-score external QA.
Fresh full-suite results are recorded in the evidence log.

## 2026-10-23 System-local Staff Spacing

Staff annotation extents and measured slur/neighbor ink now resolve per rendered
system. Renderer and print estimation share system-specific heights/top margins;
automatic and explicit page breaks use those metrics. Manual span geometry and
its conservative envelope remain intact, and native score contents do not change.

Screen/print regression reproduces sparse systems inheriting a middle lyric peak.
Actual Electron red gaps were all 291.92px; final sparse gaps are 272.50px while
the dense middle stays 291.92px at 960/1400/PDF. Four files / 172 focused tests,
typecheck/build and complete span/native/geometry verification pass. Both two-page
PDFs and desktop captures were inspected; this does not claim ideal pagination.
Visual baseline review changed only SVG heights 855->707 and 842->694; notation
coordinates were unchanged. A real-ink lower-bound guard passes (font DOM boxes
alone gave a false positive). Final notation snapshots pass. Broad gate follows
in the evidence log; external real-score/manual QA remains open.

## 2026-10-23 Outer Volta Ownership

Complete ending brackets now resolve the owning repeat's pass instead of the
innermost loop's pass. Two red cases cover an inner repeat in outer ending 1 and
in outer ending 2. The former previously moved the inner replay to the wrong
outer pass; the latter omitted one inner pass. Shared traversal now keeps the
owner active/completed pass and skips an excluded enclosing bracket's inner loop.

110 focused core/XML/playback/structure tests, two App rejection controls, types
and build pass. `--audit-nested-volta` preserves six written notes, one tie and
five slur segments while replaying eight beats, with 960/1400/native/MIDI/PDF
coverage. Both captures and the one-page Cairo-rendered PDF were reviewed; the
plain nested-repeat production control also passes. No engraving baseline change.
MuseScore CLI exports nine onsets and omits the second-ending G5; music21 10.5.1
produces an empty expansion for this composite fixture. Neither is independent
approval of this contract. External GUI/listening and broader nested-ending
interoperability remain open. Full suite passes 1,086 tests / five skips (67 files
passed / one skipped); both document verifiers and diff check pass.

## 2026-10-23 Skipped-ending Traversal Budget

The expansion safeguard now counts traversal work as well as emitted measures.
A bounded three-level fixture previously exceeded one million traversal steps
without hitting the 100,000-output limit because most endings were skipped.
The shared traversal now raises the existing error after one million steps;
normal nested/volta behavior and the existing App rejection path are unchanged.
107 focused core/XML/playback/measure-edit tests, both App rejection controls and
typecheck pass. This reproduces a missing bound, not an observed UI hang.
Fresh broad gate passes 1,083 tests / five skips (67 files / one skipped).
No renderer/model changes. Outer-volta ownership around an inner repeat remains
a separate unverified contract; simple nested coverage does not approve it.

## 2026-10-23 Nested Repeat Playback Contract

The four-measure nested fixture previously traversed seven measures instead of
twelve. Paired repeat regions now expand inner repeats independently on each
outer pass, including inner alternate endings. Written notes, tie/slur geometry
and native contents remain separate from playback expansion. Excessive expansion
is rejected, not truncated; App edits keep the previous score and undo history.
MusicXML export warns that other consumers may interpret nested repeats differently.

Core/XML/timeline/measure-edit focused tests (106), the App rejection test, typecheck, build,
960/1400px native/MIDI/PDF checks pass. music21 10.5.1 expands the fixture to the
same twelve visits; MuseScore CLI instead exports nine note onsets, so external
compatibility is explicitly not approved. GUI/listening remains untested.
Screen captures and the one-page PDF were inspected. `pdftoppm` omits the first
pair's beam, but `pdftocairo` raster and vector output retain it in the same PDF.
This is a renderer-specific discrepancy, not demonstrated missing PDF content;
native/other PDF viewer acceptance remains open. Final full suite passes 1,081
tests / five skips (67 files passed / one skipped), including the repaired
inserted-gap-before-ending-2 regression. No baseline, version or release change.

## 2026-10-23 Measured PDF Target Feedback

PDF export now snapshots the renderer's measured page estimate after print layout
and reports a target overrun alongside successful saving. It explicitly calls the
value an engraving estimate, not a parsed PDF page count. Cancel/error paths do
not show a success or overrun notice; invalid/missing estimates are ignored.
No page-fit algorithm, geometry, native model or release setting changes here.

The missing notice is reproduced by App regression; nine PDF App tests and
typecheck/build pass. `--audit-pdf-target-overflow` sets the visible target to one
page, checks ink/native invariants and the actual notice at 960/1400. Both part
orders report two pages, and independently inspected PDFs each contain two pages.
All four PDF pages and notice captures were reviewed. Automatic fitting with
measured ink, conservative staff spacing and external engraving approval remain
open; a warning does not solve those layout limitations.
Full Vitest passes 1,072 tests with five skips (66 files passed / one skipped).
Afterward, the test double's invalid page attribute was stringified to match DOM
dataset behavior; nine PDF tests were rerun. No later product change.

## 2026-10-23 System-local Automatic Hairpin Baselines

The three-system interior-verse fixture reproduced identical 227.92px baselines
even on the sparse first/last systems. Automatic hairpins now resolve annotation,
stem and overlapping-hairpin budgets per system; measured expression/spacing
reservation follows each segment's actual height. Manual geometry retains its
previous endpoint/stem policy, and the native model is unchanged.

Both screen/print regressions fail then pass; the focused 140-test bundle,
typecheck/build, real 960/1400/PDF/native checks, mixed-baseline overlap and complete
span regressions pass. The real-ink fixture checks consistent distance to local
dynamics, not an arbitrary displacement threshold. Both two-page PDFs and desktop
captures were reviewed: sparse annotation gaps shrink, but conservative staff
spacing, pagination and general real-score engraving remain open.
Unchanged-baseline visual regression and full Vitest pass (66 files passed / one
skipped, 1,067 tests passed / five skipped). System-local staff spacing requires
joint renderer and print-plan validation; do not tighten only the screen offsets.

## 2026-10-23 Middle Slur Continuation Shape

The three-system production fixture reproduced an 80.29px control-point depth
on a flat middle upper slur. Automatic segments with two free hanging ends now
place those ends outside nearby actual ink before solving the existing quadratic
clearance constraints. Attached endpoints and manual whole/segment geometry keep
their policies; there is no blanket curve-depth clamp or score-model change.

Four screen/print and upper/lower-part regressions failed before the fix. The
140-test focused bundle, typecheck/build, complete span verification and unchanged
visual baseline pass. `--audit-slur-continuation-shape` passes at 960/1400/PDF with
the existing ink, staff/system, native reopen and manual controls retained.
All four PDF pages were reviewed: middle curves are shallower, while sparse-system
hairpin gaps and conservative spacing remain open. Varied pitch contours and
external real-score QA are not approved by this flat-fixture check. Full Vitest
passes 1,067 tests with five opt-in skips (66 files passed / one skipped).

## 2026-10-23 Interior Hairpin Annotation Peak

A three-system fixture with three lyric verses only in its middle measure
reproduced a hairpin crossing the actual `mf` glyph. Automatic baseline resolution
now consumes every measure lane between the anchors, not just the endpoints.
Manual baseline resolution deliberately retains the endpoint policy; screen/print
controls confirm that changing interior lyrics does not move manual geometry.

136 focused tests, typecheck/build and 960/1400/PDF production checks pass, with
native content unchanged. Both part orders produce two PDF pages; all four pages
were inspected. This is clearance evidence, not overall engraving approval:
the lower-part middle slur has a noticeably deep arc and the shared hairpin
baseline leaves large gaps on sparse systems. Quantify those shapes next rather
than treating SVG containment as sufficient. Complete span and unchanged-baseline
visual regression pass; full Vitest passes 1,063 tests with five opt-in skips.

## 2026-10-23 Unequal Hairpin Baselines

A three-verse first measure followed by one verse reproduces intersecting automatic
hairpins despite their nominal lane indices. The allocator now compares actual
staff-relative baselines of horizontally overlapping spans, retaining 26px ink
budget instead of adding a lane index to each span's unrelated baseline. Actual
span height is reserved against every traversed system's local annotation lane,
including the first automatic hairpin, so expression text does not cross a high
continuation. The existing manual policy and native model are unchanged.

134 focused tests pass, including reversed input order (a distinct expression-row
failure before the fix). Typecheck/build, both mixed/same-baseline Electron
fixtures at 960/1400/PDF and native equality pass. Both PDF pages and screenshots
were inspected. Complete span and unchanged-baseline visual regression pass;
full Vitest passes 1,061 tests with five opt-in skips. Interior-only annotation
peaks, variable stem budgets and general real-score/external QA remain open.

## 2026-10-23 Automatic Hairpin Stack Ink Budget

Two same-range automatic crescendos reproduced -5.8px clearance between their
open ends including stroke in Electron. The existing lane allocator now steps
26px, reserving both openings, stroke and at least 4px. The bounded layout pass
feeds the measured extra stack offset into existing annotation lanes so expression
text and staff/system spacing reserve all rows, not just the first. Lyrics,
dynamics, the initial hairpin baseline and manual geometry keep their policies.

132 focused tests cover two/three rows, nested opposing wedges, removing extra
hairpins and returning expression rows, score equality and manual controls.
Typecheck/build and `--audit-polyphonic-hairpin-stack` pass at 960/1400/PDF for
either dense-part order with native reopen equality. Screens and both PDF pages
were inspected; complete existing span verification and unchanged-baseline visual
regression pass. Full Vitest passes 1,059 tests with five opt-in skips. Differing baseline/stem/lyric budgets between
overlapping spans, multiple lyric verses and external real-score QA remain open.

## 2026-10-23 Automatic Hairpin And Expression Clearance

The combined polyphonic slur/lyric/dynamic/expression fixture now includes an
automatic cross-system crescendo. The initial whole-box check was refined to
actual line interpolation and half stroke width before diagnosing a product gap:
`espressivo` had only 3.70px clearance against the required 4px in Electron.
The existing hairpin-to-expression lane gap now reserves opening, stroke, text ink
and padding (28px instead of 20px). No score model or command path changes.

Focused 129 tests, typecheck/build and the dedicated 960/1400/PDF verifier pass.
Both dense-part orders retain shared beats, neighboring staff/system separation
and unchanged native save/reopen contents. Screens and both PDF pages were
inspected. Full Vitest passes 1,056 tests (five external opt-in skips); complete
span and unchanged-baseline visual regression pass. Overlapping automatic
hairpins, multiple lyric verses/voices and external manual QA remain open.

## 2026-10-23 Lower Annotation Rows Around Slurs

A real-font two-voice fixture reproduced a lower slur crossing the lyric `dolce`.
The bounded layout pass now measures lower text ink and reserves a common downward
offset for the staff/system's lower annotation row. Lyrics, inline lyric editors,
dynamics, expressions and automatic hairpin lanes use that offset; vertical staff
and system spacing reserves it as well. No score/native fields are changed.
Manual slurs do not trigger automatic row movement. Manual hairpin segments use
the unshifted lane baseline, preserving their geometry while automatic rows move.

Four renderer cases reproduce/fix lyric clearance and a manual-hairpin movement
regression; two lane/vertical tests cover row gaps and score equality. Focused 128
tests and typecheck/build pass. The production `--audit-polyphonic-annotations`
fixture passes at 960/1400 and PDF for either dense part: text/slur separation,
neighbor staff/system clearance, SVG containment, shared beats and native reopen.
Final screens and both PDFs were inspected. Complete existing part/span checks
also pass. Broad and visual results are recorded in the evidence log.
The single automatic hairpin follow-up is recorded above; overlapping hairpins, multiple lyric verses/voices,
voice-count transitions, crossed voices and external/native-menu/IME QA remain.

## 2026-10-23 Polyphonic Slur Direction And Endpoint Budget

Automatic slurs whose endpoints share a non-neutral voice lane now follow that
lane's outside direction, reusing existing voice presentation. Single-voice/mixed
lane behavior remains on the previous policy; explicit whole/segment geometry wins.
Endpoint attachment clearance is measured from the notehead, then combined with
the stem edge instead of being added to it twice. Four renderer cases and a real
Electron direction failure reproduced the issue. A second production failure
measured 33.66px redundant clearance over the first tuplet number.

The new `--audit-polyphonic-slurs` production fixture checks both part positions,
960/1400 and PDF: two voices with cross-system slurs, triplets/beams, actual head and
tuplet ink, stems, >=4px curve clearance and >=12px neighboring-staff ink clearance.
Native equality/reopen and shared beat columns are retained. Focused 126 tests,
typecheck/build, complete existing span/system-spacing runner and visual regression
pass without baseline changes. Fresh global suite passes 1,053 tests / 66 files,
five tests / one file skipped, 196.09s. Both document verifiers and diff check pass.
Inspected final screens and PDFs. Annotation competition (dynamics/lyrics), changes
in active voices within a span, crossed-voice spans and general real-score QA remain.

Behavior reference, not copied implementation: [MuseScore 4.7 polyphonic slur policy](https://github.com/musescore/MuseScore/blob/v4.7.0/src/engraving/rendering/score/slurtielayout.cpp#L2420-L2439).

## 2026-10-23 Polyphonic Triplet Production Coverage

`verify-part-span-geometry.cjs --audit-polyphonic-triplets` now exercises a first-beat
triplet against quarters on the other staff and half notes in a second same-staff
voice. Both dense-part positions pass at 960/1400 and PDF: quarter-onset deltas are
zero, noteheads remain within bars, dense head gaps are at least 2px, and the second
voice aligns within 1px. Tuplet groups and upper/lower stem policies are asserted.
Native save/reopen and PDF preserve score contents. Screen captures and both PDFs
were inspected; this is coverage of existing behavior, not a product fix.

An initial fixture used noncanonical voice IDs and crossing pitches, producing
VexFlow collision displacement; its failure is not recorded as a product regression.
The corrected fixture uses `voice-1`/`voice-2` and a lower second voice. The retained
manual slur crosses a beam by design and does not certify automatic clearance.
Automatic slurs in this exact combined multi-voice fixture, intentional crossed-voice
spacing, arbitrary imported gaps/polymeter and broader real-score QA remain open.

## 2026-10-23 Parallel Staff Width Budgets

System packing and width distribution now consider the densest displayed staff,
using each staff's own preceding signatures. PDF candidate selection uses the same
parallel measure inputs. Native score data and primary measure/break identities
remain unchanged. Two width regressions and two page-plan regressions failed
before the fix; Electron also reproduced a lower-density-part-order barline overrun.
The production fixture now passes with dense sixteenths above or below at 960/1400
and in PDF: equal beat columns, notehead containment, minimum 2px head gaps and
identical geometry after swapping density. Native save/reopen preserves the score.
Focused tests, typecheck/build and unchanged-baseline visual regression pass.
Fresh global suite passes 1,049 tests / 66 files, five tests / one file skipped,
196.12s. Both document verifiers and whitespace checks pass.
Production triplet/polyvoice combinations, arbitrary gaps/polymeter, extreme single
bar density and broader real-score comparison remain outside this fixture.

## 2026-10-23 Shared Rhythmic Columns

Compatible staves now prepare their notes before drawing, join modifier contexts
per staff, and use VexFlow's shared tick formatter with a common notation start.
Single-staff/incompatible timing groups retain the independent path. Attachments,
selection, ties and slurs use the resulting note positions; score data is unchanged.
Per-voice tuplet interpolation is not reapplied to already shared tick columns.

Four original mixed-quarter/eighth cases failed; a real 960px capture independently
showed up to 22.97px mismatch. Eight screen/print renderer cases now include either
part as the dense staff, different clefs, triplets and a second same-staff voice.
Focused 146 tests, typecheck/build, actual 960/1400 mixed-rhythm and PDF checks,
native equality/reopen, the complete part-span/system-spacing runner and visual
regression pass. Same-onset deltas in the production fixture are zero; snapshots
were inspected without baseline changes. Fresh global suite passes 1,045 tests /
66 files, five tests / one file skipped, 200.08s. Both document verifiers and
whitespace gate pass.

Dense lower-staff minimum-width packing, arbitrary imported rhythm gaps/polymeter,
and broader mixed-rhythm real-score QA remain separate audits. Manual volta
geometry and the recorded external/native-select QA gaps remain open.

## 2026-10-23 Shared Repeat Rendering

Full-score rendering now reuses `scoreRepeatSource` and
`projectRepeatMarksToStaff`, matching playback and extracted-part repeat policy.
Aligned staves display the canonical repeat barlines without mutating native
content; non-aligned measure counts/timings retain local rendering. A repeat
source on a lower part also supplies the top-staff volta display.

Four renderer cases reproduced a 20px same-onset discrepancy in screen/print
with the source in either part. The 960px production capture independently
reproduced the same 20px delta before rebuilding. Now the whole-note fixture's
cross-part delta is zero at 960/1400 and in full-score PDF. 166 focused tests,
typecheck/build, native equality/reopen and unchanged-baseline visual regression
pass; captures/PDF inspected. Fresh global suite passes 1,037 tests / 66 files,
five skipped tests (one skipped file), 196.96s. Both document verifiers and
whitespace gate pass.
This fixes asymmetric repeat-mark spacing, not general mixed-rhythm staff
alignment. Manual volta geometry and external/keyboard QA remain open.

## 2026-10-23 Repeat Boundary Ink Clearance

The tight part-PDF boundary reported below is now reproduced and fixed: the first
whole-note head exceeded its measure's right edge by 10.27px in real Electron
font metrics. Minimum system packing now reserves repeat-start/end barline space
alongside the existing header/rhythm allowances. The score model is unchanged.
Three packing regressions fail before the fix; all 34 layout tests and a broader
162-test bundle pass. Typecheck/build, actual 960/1400 full/part views, both PDFs,
native equality/reopen and unchanged-baseline visual regression pass. Captures
and rendered PDFs were inspected; part-PDF minimum right clearance is 26.60px.
Fresh global suite: 66 files / 1,033 tests pass, one file / five tests skipped,
201.80s. Both documentation verifiers and whitespace gate pass.

The full-score capture also exposed a separate horizontal alignment gap when
only the first part carries repeat marks; the shared-repeat follow-up above fixes
that fixture. General mixed-rhythm staff alignment remains a separate audit.
Manual volta geometry, native-select keyboard and external-app QA remain open.

## 2026-10-23 Explicit Volta Display Extents

The measure-properties card now selects the visual ending's final measure or
restores automatic display. The chosen measure must be inside the existing repeat
ending. Optional start-mark `displayEndMeasureId` preserves the choice in native
projects; repeating semantics and open/closed end style are independent. Long
explicit lines survive the automatic three-measure display limit. No independent
vertical/segment geometry editor is implied.

Boundary/interior deletion rebases display anchors, undo restores them, and part
projection/source-part removal maps them to local staff IDs. Native validation
rejects missing/outside/non-start references. Existing command/history and shared
properties paths are reused. MusicXML exports the repeat interval and reports the
native-only display loss; save safety still rejects conflicting local endings.
Equivalent omitted/closed end styles and unstated secondary-staff part barlines
no longer cause false save failures.

Focused tests, typecheck/build, actual 960/1400 menus, auto/full/interior display,
undo/redo, native reopen, part view, full-score three-system PDF and part PDF pass.
Visual regression passes without changing baselines. Fresh full suite passes
1,030 tests / 66 files, five opt-in skips (one skipped file), 201.25s.
Captures/PDFs inspected: the part PDF
had tight adjacent whole-note spacing at the first repeat boundary; the following
boundary-ink audit above reproduces and fixes it. Native select keyboard opt-in, manual volta offsets,
continuation refinements and external GUI/listening/IME QA remain open.

## 2026-10-23 Volta End Properties

The selected-measure card now edits open/closed ends through the existing measure
command and history. Selection anywhere inside an ending resolves its final
measure, including aligned secondary staves. The target ending/measure is visible;
outside or incomplete ranges show a disabled empty state. No duplicate editor or
new score field is introduced in this slice.

Failure-first App/resolver coverage and actual Electron exposed missing Enter
activation on focusable score events. Primary/lower-staff events now activate on
Enter/Space without triggering transport shortcuts. 32 focused tests, typecheck,
build and 960/1400 actual-menu production checks pass, including undo/redo and
native reopen/equality. Both property captures were inspected.

Native select arrow/Return automation still fails to commit a value, even in a
visible window; the cause is not confirmed. The assertion is retained under
`--audit-native-volta-keyboard`, separate from the regular visible/enabled select
change gate. This is not a keyboard-only end-to-end approval. Visual regression
passes without baseline changes. First full run hit the existing combined PDF
result test's 15s timeout; its unchanged isolated rerun passed. Splitting its
three outcomes into independent cases preserves assertions and the per-test
15s limit. Fresh full rerun passes 1,022 tests / 66 files, five opt-in skips
(one skipped file), 371.79s. Explicit long display spans, manual geometry and
external QA remain open.

## 2026-10-23 Open Volta End Preservation

Five failure-first cases reproduced loss of MusicXML `discontinue`, native
rejection, closed rendering and endpoint-style loss after deleting an ending's
last measure. Optional volta `endStyle` now preserves open/closed appearance;
absent legacy values remain closed. Open ends still terminate the range, with
identical repeat playback. Renderer covers screen/print and cross-system spans;
structural edits preserve the end style and undo restores the original score.

143 focused tests, typecheck/build, MusicXML fixture gate, production menu import,
export/native reopen, 960/1400/PDF and unchanged-baseline visual regression pass.
Fresh full suite passes 1,015 tests / 66 files, with five external opt-in tests
skipped (one skipped file), 285.91s. Installed MuseScore XML exchange exits 0 and passes
strict semantics, including open ends; its subsequent PDF process crashes with
mutex failure. The produced PDF is readable and inspected, but the integrated
external gate remains failed. Human GUI/listening QA is not implied.

Endpoint-style editing is covered by the subsequent properties entry above.
Remaining: explicit long-bracket display ranges/manual geometry, per-system
continuation policy and other external failures.
This is an interchange/display fix, not completion of manual volta controls.
Older strict native readers may reject files containing the new optional field;
reading legacy files in this build is covered, not forward compatibility with
older executables. Keep this distinction in release notes before approval.

## 2026-10-23 Unslurred Neighbor Ink

The next fixture reproduces a slur colliding with an unslurred neighboring staff:
renderer above/below cases fail, and actual Electron reports -28px. Existing
cursor ink metrics now reserve the neighboring side of each slur-bearing staff,
including note/rest heads, real stems, staccato, dots and tuplets; synthetic rest
stems remain excluded. No new notation model or command path.

124 focused tests, types/build, 960/1400/native/PDF and unchanged-baseline visual
regression pass. Above/below whole-note and half-note fixtures retain 12px actual
glyph/stem clearance. All four PDFs inspected. Fresh full suite passes 1,008 tests
/ 65 files with four external opt-in tests skipped (one skipped file), 192.65s.
Other articulation/accidental/beam/ledger ink combinations, per-system density,
manual volta and external GUI/listening/interchange QA remain open.
Next audit: XML `stop` and `discontinue` currently share the same end boolean;
their displayed endpoint distinction needs a dedicated round-trip regression.

## 2026-10-23 Same-System Slur Spacing

Measured slur contours now reserve inner staff gaps through the existing vertical
layout and synchronous render passes. Upper/lower automatic curves previously
overlapped in a two-staff system, including -97.90px in the actual Electron font.
960/1400px and PDF now retain 12px ink clearance. Manual contour geometry remains
unchanged, with native equality/reopen and final-only selection callbacks covered.
Four-file 122-test bundle, types/build, production PDF and visual regression pass;
baseline unchanged. Fresh full suite passes 1,006 tests / 65 files, with four
external opt-in tests skipped (one skipped file), 204.20s.

This uses the existing score-wide staff offsets, not per-system optimized gaps.
Neighboring notes without slurs, other annotation lanes, excessive curve shape,
target-page scale search and external MuseScore semantic gaps remain separate QA.
The inspected PDFs prove this fixture's clearance, not full engraving approval.

## 2026-10-23 Sparse Attribute Export Restoration

Six failure-first cases reproduced repeated attributes after the first measure.
Export now emits divisions/staves initially per part, then only changed key/time,
numbered staff clefs and transpositions. Explicit zero transpose resets remain;
next-measure clef comparison uses the last serialized inline clef. Tests cover
solo, piano and quartet inheritance, actual changes/returns, independent lower
staff changes, inline carry/reset and score non-mutation. Native model untouched.

140 focused MusicXML/core tests, typecheck/build, fixture verifier and production
960/1400/native/PDF pass. The App export verifier asserts one initial attributes
block for the unchanged repeat fixture. Fresh full suite passes 1,001 tests /
65 files, with four external opt-in tests skipped (one skipped file), 191.18s.
No renderer or visual-baseline changes in this slice.

The dedicated external signature fixture passes semantic comparison through the
installed MuseScore, but both test invocations terminate with mutex SIGABRT, so
the integrated CLI gate remains failed. A separate PDF export exits 0; inspected
PDF has no repeated signatures in measure 2, retaining real changes in 3 and 4.
The stricter existing slur fixture also exposes MuseScore dropping explicit
`mode=major` metadata; this is kept as an unresolved assertion, not normalized
away. Partial-tie/let-ring incompatibility and manual GUI/listening QA remain open.

## 2026-10-23 Partial Tie MusicXML Interoperability

External QA now includes the alternate-ending fixture and compares explicit tie
flags as well as endpoints/playback. The installed MuseScore drops the original
second-ending stop. A paired single-note `<tied start/stop>` export, following
the [MusicXML partial notation rule](https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/tied/),
is now separate from the sounding `<tie stop>`; the parser uses explicit sounding
flags when supplied. Chromatics native/XML round-trips preserve both directions
across repeat jumps. Ordinary notation-only imports retain their fallback.

This does NOT resolve MuseScore interoperability: its returned XML converts the
pair to `let-ring`, removes the sounding stop, and splits the second playback
pass. The opt-in parity test remains a failing guard, not an expected-pass loss
test. The existing export report now warns at the destination measure to retain
the native original and review imports. Core/XML tests, actual File-menu App
coverage and production 960/1400/native/PDF pass. Fresh full suite: 64 files
passed / 1 skipped, 995 tests passed / 3 external opt-in tests skipped, 196.70s.
Default-suite PASS does not override the observed opt-in interoperability failure.

Two reference PDFs were inspected: original stop-only disappears; paired notation
becomes an outgoing let-ring rather than an incoming tie. Repeated clef/time
attributes in our export also become redundant signatures in MuseScore: current
serializer still emits them every measure; sparse-attribute restoration is next.
Several CLI runs terminate with a mutex SIGABRT, including a control whose
semantic comparison passes; a separate paired-fixture PDF export exits 0.
Do not equate generated files or local round-trips with successful external QA.

## 2026-10-23 Alternate-Ending Tie Contract

Five failure-first core cases reproduced a valid second-ending stop rejected on
save, incorrect first-to-second-ending creation, and orphaned flags on removal.
Tie validation/editing now use the same measure traversal as playback, with
voice-local, contiguous equal-pitch edges. A body note can connect to both ending
stops; removing one stop preserves the other branch, while removing the source
clears both. Structural edits retain surviving original edges. No score schema
or playback model was added. Native and MusicXML round-trips preserve the flags
and yield two sustained two-beat playback events instead of source-order merges.

Rendering keeps the source-order score and draws an incoming partial tie in the
second ending, not a full curve across the exclusive first ending. 154 focused
tests, typecheck/build, 960/1400px production/native/PDF and visual regression
pass without baseline changes. The one-page PDF was inspected. A subsequent
failure-first guard makes body-start creation prefer the forward ending over a
repeat return. Fresh full gate after that final change passes 991 tests / 64 files,
with two external opt-in tests skipped (one skipped file), in 204.03s. Final build,
production/PDF and visual regression also pass. Partial-tie contour refinement,
external MuseScore GUI/listening, nested repeats and other annotation lanes are
not approved by this bounded fixture.

## 2026-10-23 Volta / Slur Clearance

The repeat/volta fixture now protects bracket hooks and ending numbers from slur
ink. Production red measured -26.10px line clearance and -9.78px label clearance.
Automatic volta placement now moves above intersecting slur contours and keeps
all ending brackets aligned within a system. The measured system envelope also
reserves the shifted bracket and label. Horizontal spans, ending numbers, slur
geometry and source/native/playback data are unchanged, including whole/segment
manual slurs. This is automatic engraving, not a new manual volta model.

Six screen/print automatic/manual regressions fail before repair and pass after;
an adjacent-ending alignment regression also passes. Production 960/1400/native
reopen/PDF passes with minimum line clearance about 6px and label clearance
22.32px. Automatic, whole-manual and segment-manual PDFs were inspected.
Typecheck/build and production notation snapshots pass without baseline changes.
Other text/tempo lanes, branching-ending ties, excessive curve depth and full
external GUI/listening QA remain separate. Fresh full suite passes 979 tests /
64 files, with two external opt-in tests skipped. Prior 972-test pass predates
this slice.

## 2026-10-23 System Spacing Regression And Repair

The explicit production diagnostic `env -u ELECTRON_RUN_AS_NODE npx electron
scripts/verify-part-span-geometry.cjs --audit-system-spacing` initially failed. Reversing the
existing extreme whole-note systems puts a lower E0 slur before an upper F8 slur.
Both remain inside the SVG and clear the adjacent staff, yet their filled curves
cross: sampled conservative gaps are -46.48px at 960, -38.29px at 1400 and
-40.46px in PDF. The screen capture and PDF raster confirm actual crossings.

The renderer now computes conservative bounds from the actual quadratic contour,
then synchronously re-renders through the shared system/page layout with those
envelopes. Existing pitch/stem reservations remain, and page transitions reserve
upper ink too. Hit targets and selection callbacks use only the final pass;
manual whole/segment geometry and native data remain unchanged. Measured layout
height supplies post-layout page-count/target-overflow metadata, not the earlier
unmeasured estimate. The preflight target-page scale search is not yet rerun using
these measurements; that optimization and same-system inter-staff collisions
remain open, along with slur/volta collisions and excessive contour depth.

Two core gap tests and two automatic renderer tests failed before repair; two
manual controls passed throughout. 114 focused tests, typecheck/build and the
production diagnostic pass. New minimum gaps are 13.84px (960), 12.98px (1400),
13.21px (PDF). Final PDF raster reviewed. Production notation snapshots pass
without baseline updates. Full suite: 64 files passed / 1 skipped, 972 tests
passed / 2 skipped (external MuseScore opt-in tests), 205.27s.

## 2026-10-22 Part / Segment Menu QA

`verify:part-span-geometry` is restored for the current menu/shared-dock UI.
The initial production run failed on the removed `표기 객체` button. The runner
now uses actual File/Add/Format/Edit menu clicks, the Properties tab and geometry
disclosure, with visible/enabled/viewport checks before editing. An isolated
in-memory Electron partition prevents prior verifier workspace preferences from
changing the default shared-dock scenario. Product handlers/models are unchanged.

Fresh build and full runner pass at 960/1400px: independent part offsets, score
inheritance, per-segment isolation, native disk reopen, inactive-segment cleanup
and undo, restored-boundary geometry, shared dock and no horizontal overflow.
The intercepted save/open bridge exercises the actual parser and renderer;
this is not a native OS dialog test. The one-page part PDF and two-page segment
PDF were rasterized and inspected. No missing page or clipped output was seen;
the manual-offset fixture deliberately permits collisions and is not a general
engraving approval. Typecheck passes; the prior 917-test full gate remains the
latest Vitest result. Cross-system contour policy and interior collisions are next.

## 2026-10-22 Automatic Slur Continuation

Automatic first/last system segments now angle their hanging end away from the
staff; whole-object and segment-local manual geometry retain the prior endpoints
and height. This is a narrow default policy, not MuseScore's complete configurable
slur style: [MuseScore slurs and ties](https://handbook.musescore.org/en_gb/notation/expressive-markings/slurs-and-ties)
documents contour-following and outward-angle alternatives. Six renderer cases
cover above/below automatic, whole/manual and first-segment/manual states.
The 38-test renderer/layout/CSS bundle and production geometry/PDF runner pass;
visual regression passes without baseline changes. Automatic layout stays out of
saved engraving data. PDF review still finds interior stem crossings: hanging-end
direction is covered, collision-free automatic engraving is not. That defect is
the next slice; the latest full Vitest predates this continuation change.

## 2026-10-22 Repeat/Volta Slur Contract

A three-measure MusicXML fixture now separates source-order engraving from repeat
playback: one tied pair inside the repeat body, two exclusive endings, and a slur
ending in the second ending. Internal XML/native round trips preserve endpoints
and ending numbers. Removing the slur does not affect the 16-beat playback; the
body tie merges independently on each pass. Screen/print tests retain four source
events, one visual tie and three source-order slur segments across forced breaks.
113 focused tests and typecheck pass; production 960/1400px/native/PDF checks pass.
PDF inspection found slur/volta-line and number proximity at system boundaries:
structural assertions are not collision-free engraving approval.

Installed MuseScore CLI converted the authored fixture to PDF on retry after an
initial SIGABRT. Its PDF was inspected alongside Chromatics output; line wrapping
differs deliberately because only the Chromatics test forces three systems.
This is not GUI QA or a full external XML round trip. Branching ties into both
endings, volta/slur collision handling and system spacing remain open. No product
code or baseline change was needed for this contract coverage.

Follow-up external exchange: the opt-in `RUN_MUSESCORE_SPAN_QA=1` test now exports
Chromatics XML, runs the installed MuseScore CLI XML exporter, reimports it and
validates native persistence, endpoint indices, notes, endings and playback. First
execution aborted in MuseScore; a separate retry passed. This adds real CLI XML
round-trip evidence, not GUI or collision-free engraving approval. Full Vitest
before this opt-in addition passed 64 files / 966 tests (one skipped), 210.12s;
the new external test and subsequent typecheck pass separately.

## 2026-10-22 Beam Boundary Audit

Three renderer tests cover twelve single/multiple/partial sloped-beam combinations
(above/below, automatic/manual). Existing post-beam stem metrics already keep the
automatic slur outside each filled polygon; no product change was justified.
Production checks sample polygon vertices and edges at 960/1400px and PDF,
with native equality/reopen and manual geometry preservation. Minimum conservative
filled-contour clearance is 4.2745px. Automatic one-page and manual two-page PDF
rasters were inspected. 86 focused tests, typecheck, build and production verifier
pass. Full Vitest's 960-test result predates these three tests. Extreme system
spacing and repeat/volta contracts remain separate work. Goal query returned null;
the explicitly requested objective was registered active, not falsely resumed.

## 2026-10-22 Rest Ink Clearance

Production verification reproduces a lower automatic slur crossing a 64th-rest
glyph. The renderer's stub font metrics do not reproduce this (all eight controls
already pass), which makes the real-font Electron fixture the failure-first gate.
Rest glyph bounds now participate in automatic clearance while synthetic rest
stems remain excluded. The quarter-rest phantom-stem regression and manual
geometry remain unchanged. 71 focused tests, typecheck, production 960/1400px,
native reopen/nonmutation, PDF and visual regression pass without baseline edits.
Both automatic/manual PDF rasters were inspected. The 33/64 fixture is a narrow
geometry stress case, not a representative real-score engraving approval.
Current full Vitest passes with all three slices: 64 files passed / 1 skipped,
960 tests passed / 1 skipped in 203.34s, exit 0; tracked source/script/baseline
diff unchanged during execution. Beam edges, extreme spacing,
repeat/volta contracts and external app QA remain open.

## 2026-10-22 Duration Dot Clearance

The automatic solver now includes actual VexFlow augmentation-dot ink bounds,
separately from staccato circles, without changing manual geometry or score data.
A late double-dotted note fails the upper clearance threshold under the renderer
test font metrics before the fix; lower/manual controls pass. The production-font
fixture already passed before this fix, so this is not claimed as a reproduced
production overlap. All 63 focused tests and typecheck pass. Production checks at
960/1400px, native save/reopen and PDF pass; both PDF rasters were inspected.
Visual regression passes without baseline changes. Combined full Vitest passes:
64 files passed / 1 skipped, 952 tests passed / 1 skipped, 199.42s, exit 0.
Tracked source/script/baseline diff hash stayed unchanged during the run.
Beams, actual rest glyphs, extreme spacing,
repeat/volta contracts and external app QA remain separate work.

## 2026-10-22 Interior Tuplet Clearance

Automatic slurs now account for the rendered tuplet number ink and visible
bracket rectangles, excluding VexFlow's invisible pointer rectangle. Both note
and rest tuplets participate; manual whole/segment geometry remains authoritative.
Two automatic quarter/eighth-triplet regressions failed before the fix while
manual controls passed. The expanded six cases include rest-only triplets.
Production checks pass at 960/1400px, after native save/reopen, and in PDF; automatic
and manual PDF rasters and the compact editor capture were inspected. Notation
visual regression passes without baseline edits. The 59-test focused bundle and
typecheck pass. Full Vitest's 942-test pass predates this slice; rerun at the next
broad gate. Duration dots, beams, actual rest ink and extreme inter-system spacing
remain open. Current goal query reports paused after interruption; no resume API
is exposed, so implementation continues in the user-requested turn without
claiming the goal state changed.

## 2026-10-22 Staccato Production Follow-up

Resumed production verification now checks single and stacked staccato circles
inside above/below slurs at 960/1400px, native save/reopen/nonmutation, and PDF.
A manual-geometry control retains the specified curve even when it overlaps ink.
All three one-page PDFs were inspected. Existing part/segment/history assertions
remain. Native equality now uses structural comparison rather than JSON key order.
53 focused tests, typecheck and notation visual regression pass without a new
baseline update. Full Vitest passes: 64 files passed / 1 skipped, 942 tests passed
/ 1 skipped in 200.17s, exit 0. Tracked source/script/baseline diff hash unchanged
through the run. This includes the separately present Appearance tests without
claiming ownership of that work.
Separate Appearance/brand changes are preserved and visible in editor captures;
this slice does not claim their UI acceptance. Interior tuplet/dot/beam QA remains.

## 2026-10-22 Stop Checkpoint: Interior Staccato

User requested stopping after the current work. Finished the already-added
interior staccato regression: automatic above/below cases failed, manual controls
passed. Automatic curves now include the actual circle edges from the existing
articulation placement helper and shared 1.9px radius; manual geometry is unchanged.
53 focused renderer/layout/CSS/viewport tests and typecheck pass. The preceding
932-test full pass and production/PDF results predate this last staccato change;
do not report them as a new end-to-end pass. Next resume with actual Electron/PDF
staccato measurements and visual regression, then interior tuplet/duration dots.
No new slice, version or release action is started at this handoff.

## 2026-10-22 Automatic Slur Viewport

Production red reproduced an automatic lower slur extending to SVG Y 662.67
while the viewport ended at 629. All slur bounds now enter the existing padded
viewport calculation; manual hairpin handling is unchanged. No musical geometry
or native score mutation. Renderer/layout/CSS/viewport tests (49), typecheck,
production part/segment/native/PDF checks and notation visual regression pass.
The 960/1400px extreme fixture and its one-page PDF were inspected. This proves
containment, not attractive engraving of extreme register leaps; the quadratic
can still be very tall. Combined full Vitest passes: 63 files passed / 1 skipped,
932 tests passed / 1 skipped, 519.65s; exit 0 and JSON success true. Source/tests
were not edited during execution; tracked source/script/baseline diff hash also
remained unchanged from the mid-run audit to completion. Next: interior staccato
and tuplet obstacles, then inter-system spacing and repeat/volta contracts.

## 2026-10-22 Stemless Slur Clearance

Upper/lower 6/4 fixtures reproduced insufficient clearance at an interior whole
note. Automatic curves now constrain both edges of the notehead's measured ink
bounds as well as stems. Logical VexFlow head bounds are center heights, not ink
extents; SVG text boxes include the whole SMuFL font line. Production QA therefore
measures the rendered glyph with Canvas TextMetrics. Manual geometry remains
authoritative; rests no longer contribute non-rendered phantom stems.

46 renderer/layout/CSS tests and typecheck pass. Production part/segment verification
passes at 960/1400px with native reopen and both whole-note glyph edges checked in
editor/PDF. The new one-page PDF and compact capture were inspected. Visual review
found only the old rest-inflated slur heights changing from 28.2/27.8 to 15.3/15;
those two scalar values were reviewed and updated; the notation runner passes.
Full Vitest's previous 926-pass
result predates this slice. Automatic viewport expansion, interior dots/beams and
external MuseScore/manual review remain open; this is not complete engraving parity.

## 2026-10-22 Interior Slur Stem Clearance

Two actual SVG-coordinate regressions reproduced an interior opposite-direction
stem crossing automatic above/below curves. Rendered stem extents now constrain
the quadratic control point for the same staff/system, excluding span anchors.
Manual whole/segment geometry bypasses this adjustment. A third regression guards
stem-side endpoints: automatic endpoints use the stem tip instead of forcing a
short curve into an excessively tall arch. The first visual candidate was rejected
and not baselined; the corrected short slur keeps its prior height.

All 41 renderer/layout/CSS tests, typecheck and the production part/segment runner
pass. The runner checks actual SVG path-to-interior-stem clearance in both editor
and PDF, alongside the preserved manual/native/history contracts. Both final
automatic PDF pages were inspected. Visual regression passes after reviewing four
scalar changes from the preceding baseline (first slur Y -35px at both widths;
second height 15.3/15 -> 28.2/27.8). Other snapshot metrics are unchanged.
The combined full Vitest run passes: 63 files passed / 1 skipped, 926 tests
passed / 1 skipped in 521.92s. Source/tests were frozen during execution, with no
concurrent build/Electron verifier (`/tmp/chromatics-span-clearance-full-20261022.json`
and `.log`).
Interior articulation/duration dots, stemless noteheads, beams, multiple staff
ownership and extreme-density curve bounds require further fixtures; do not infer
complete collision-free engraving from these stem tests.
Next start with a stemless whole note inside a slur and interior attachment
clearance. Also cover extreme automatic arcs against SVG bounds: current viewport
expansion collects manually engraved spans, so existing manual-bound tests do not
prove automatic containment. Goal remains active; this is a verification checkpoint,
not a release or overall parity completion.

## 2026-10-22 Parent Brand Update

The user renamed the parent brand from 도요 to 띠로리. New Chromatics parent-brand
copy must use 띠로리; the product name remains Chromatics unless separately
approved. This does not authorize guessed English spelling, domain, bundle ID,
signing or release changes. Existing `doyo` asset/code identifiers and the
mascot's descriptive name are not automatically product-name replacements.
The active Chromatics worktree has no existing 도요/doyo copy to replace.
The user explicitly limited this rename to Chromatics work. Brand design artifacts
and Clef metadata in the protected original checkout remain unchanged and are
outside this task's scope.

## 2026-10-22 Menu-Driven Editing Surfaces

The recovered permanent worktree now removes the score/note/notation/lyrics
category buttons. Format opens score/measure settings, Tools opens note entry,
and Add opens notation or lyrics/chords. These entries reuse
`openToolbarWorkspace` and focus existing fields without score mutation.
File/Export quick actions and workspace controls share the global menu row;
the persistent note-input toolbar and transport remain available.
Command search uses action names instead of obsolete "open tab" labels.

Production Electron at 960/1400px verifies category absence, one-row containment,
non-overlap, field focus and unchanged history. The captured screens were
inspected. Full menu-slice Electron and visual regression pass without baseline
edits; the menu-checkpoint whole suite passed 898 tests (1 skipped). This is not a parity or RC
claim. Recovery evidence is in the external recovery archive;
recovered-file hashes do not prove comparison with the lost original files.

The next shared-dock slice makes palette/properties tabs the default above 1200px
as well. View can restore split placement; the old independent widths remain
untouched. `chromatics.shared-dock.v1` stores layout and a bounded shared width,
initially migrated from the larger legacy width. Compact desktop keeps 236px;
wide shared panels support pointer and 16px keyboard resize. Existing visibility,
active-tab persistence, palette opener and reset paths are reused. App and
production shared-dock checks and the 899-test full suite pass (1 skipped). Detailed
editing consolidation and external engraving QA remain.

Measure clef/key/time now have one canonical set of controls in the selected
measure properties section. Menu and palette entries open that section and focus
the key field; existing commands, scope labels and undo/redo are retained.
Focused coverage includes selected-note versus measure clef scope and native
save/reopen in piano/quartet scores. Production 960/1400px checks confirm the
three controls live in properties. Pickup/repeats and text/span editing remain
separate follow-ups. Palette and Add-menu measure entries now preserve the
current workspace and collapsed toolbar state; Format still opens full score
settings. Two failure-first entry cases and production checks at 960/1400px
protect focus, unchanged canvas top and contained fields.

Harmony detail placement now uses one properties editor with the existing
`harmonyTarget`, same-tick identity, `updateHarmonyText`, validation and history.
The redundant summary field is removed; Add-menu and score-object entry reveal
and focus the canonical editor without expanding collapsed work tools. App
coverage includes invalid input, cancellation, range disabling, same-tick
neighbors and native save/reopen. The 29-test focused bundle and full 903-test
suite pass (1 skipped); production checks cover both split compatibility and
960/1400px shared-dock harmony entry. Do not blindly move
the lyric text field: it is an in-score input created by NotationPreview; verse,
syllabic/extend and next-note behavior must be preserved separately. Selected
span geometry is already selection-driven in properties, while the unselected
span list still follows notation workspace state. These are audited follow-ups,
not yet completed features. Rehearsal/staff/system/expression text consolidation
is the next independent detail-placement slice.

Harmony target resolution now looks up an explicit object ID before filtering
same-tick neighbors. This fixes nonzero-tick object clicks showing an empty field
while the mutation handler still edits that object. The scope output follows the
resolved object; selecting "new" returns to the cursor location. Failure-first
App coverage checks both paths and native contents; 16 focused cases and
production object selection/editing at 960/1400px pass. The 903-test whole-suite
checkpoint above predates this target-resolution change.

Rehearsal marks now use one properties chooser and the existing 12-character
field. The duplicate 120-character summary input is removed. Direct score-object,
Add-menu and palette entries reveal/focus properties with work tools still
collapsed. Existing target IDs, global-measure aliases and concrete staff scope
remain unchanged. Failure-first App coverage and a 37-test focused bundle pass;
production checks at 960/1400px verify all three entries, folding, containment
and unchanged canvas top. Broad gates are tracked separately in evidence.
The frozen-code combined gate now passes 63 files / 905 tests (1 skipped),
including the nonzero-tick harmony follow-up and rehearsal migration. Full
production Electron, typecheck/build and documentation verifiers pass. No new
visual-regression baseline or external MuseScore/PDF result is claimed.

Staff/system/expression text now share one selected-kind properties section.
Their original object choosers, 80-character limits and mutation handlers remain;
the notation toolbar and selection summary no longer duplicate those editors.
Add-menu, palette and rendered-object entry open/focus the same field without
expanding work tools. Scope identifies staff/global measure and expression tick.
Failure-first coverage plus 36 focused workflow cases and four canonical/scope
cases pass, including neighbor IDs, cancel, history, native reopen, range disabling,
global/local system scope and IME. Production 960/1400px entry checks pass with
no horizontal overflow or toolbar growth; both captures were inspected. Broader
post-text gates are recorded separately in evidence. Lyrics and span detail policy,
manual engraving and external MuseScore/PDF exchange remain open.

Post-text frozen-code full Vitest passes 63 files / 909 tests (1 skipped), 525.17s.
Full production Electron, typecheck/build, both documentation verifiers and
whitespace checks pass. Visual regression was not rerun for this text slice;
the inspected production captures do not stand in for external engraving QA.

Explicit measure/text entry from a selected span now clears only that span
selection, restoring the underlying note/measure and revealing the requested
field. Two failure-first cases, an 11-test focused bundle and 960/1400px production
checks pass for all six property entry commands and both span kinds. Generic
workspace switching still preserves span selection. The 909-test checkpoint
predates this focused follow-up. In-score
lyric input should retain its composition/verse/next-note behavior, not become a
second dock text field merely for visual consistency.

Lyric verse, syllabic type and melisma now live in the properties dock, while
the only lyric text input remains on the score. The old lyric toolbar and its
empty instructional surface are removed; existing Add/command-palette entry
preserves collapsed work tools. Direct lyric selection reveals properties and
the selected verse. Existing handlers, four-verse model and notation editor are
reused. Failure-first/native-reopen coverage and a 27-case lyric/span/workspace
bundle pass. Production 960/1400px checks pass for dock containment, inline focus,
Enter advance, second-verse reselection, hidden-dock reopen and unchanged canvas
top; both captures inspected. Full production including composition handling
and broader gates are tracked in evidence. Selected-object density still needs
review: previously opened unrelated property sections remain expanded.

Combined span-entry/lyric checkpoint: full Vitest passes 63 files / 912 tests
(1 skipped), 501.08s. Complete production Electron, typecheck/build, both document
verifiers and diff check pass. Composition behavior is tested with synthetic DOM
events in the renderer, not manual OS IME input. External engraving/PDF QA and
visual-regression baseline checks were not rerun for these two slices.

Contextual-properties implementation now prioritizes the requested object editor
using a selection-bound workspace context. Note/measure selection invalidates stale
contexts; target IDs and manual disclosure state are retained. The old combined
lyric/chord entry is now `가사 입력`; chords use the existing `코드 심벌 입력` entry.
Lyrics keep their single in-score input plus verse metadata, without unrelated
chord or note-detail panels. Explicit lyric entry replaces span selection; generic
score/note workspace switching still preserves it. Failure-first and six focused
cases pass, as do 960/1400px production context/focus/containment checks. Broad
migration and full production results are tracked separately in evidence; the
912-test checkpoint predates this context change.
The subsequent full Electron run passes. Full Vitest found 912 passes and one
legacy dock-visibility assertion failure; its selection-identity assertion is
now migrated and passes with seven related regressions (eight total). Typecheck
passes. A fresh all-suite run after this test-only change remains unrun; do not
describe the preceding full run as a pass.

Dynamic property consolidation now removes the notation-workspace and
selection-summary duplicate selectors. One canonical properties section owns the
existing object chooser/value field and current-staff measure scope. Add-menu,
notation-search entry and glyph selection reuse the same focus path, preserve
collapsed tools and reopen hidden properties. Palette tiles still apply through
the existing update command. Failure-first coverage preserves same-measure IDs,
new/delete behavior, undo/redo, native reopen and range disabling. Twenty focused
cases plus four final grand-staff/context/dock cases pass; typecheck and build
pass after fixing an optional-measure guard and invalid test-query options.
Production and broad verification are tracked separately in evidence.
Focused production now passes at 960/1400px, including searched source entry,
Add menu, hidden-dock glyph selection, single editor, new mark/neighbor identity,
scope, control containment and unchanged canvas top. Both captures inspected.

The engraving audit found a uniform open quadratic slur in the recovered code,
not the tapered contour described in historical notes. It is now a filled pair
of mirrored quadratic edges with shared tips and a 2.2–3.2px midpoint thickness.
The original centerline remains the selection hit path; automatic endpoints,
manual offsets/height and span addressing are unchanged. Three failure-first
automatic/above/below contour cases and CSS contracts pass with the existing
passive-attachment clearance tests (24 total). Production visual regression
passes after reviewing both captures and updating only six slur bounding-box
values; other notation metrics are unchanged. Full Vitest for dynamic/context/
slur changes now passes: 63 files passed / 1 skipped, 917 tests passed / 1 skipped,
519.34s (`/tmp/chromatics-dynamic-slur-full-20261022.json` and `.log`). This
supersedes the earlier pending whole-suite recheck, without changing its failure
history. Interior-note/stem/tuplet collisions, cross-system contour joins and PDF
review remain separate acceptance items.

User-requested handoff: stop after this checkpoint, with changes uncommitted and
version 0.1.0-alpha.34 unchanged. Next migrate `verify-part-span-geometry.cjs`
from removed category tabs to real menu/shared-dock entry, preserving all geometry,
history, native reopen and PDF assertions. That verifier was audited, not run or
modified in this slice. No further implementation starts before goal resumption.

Native-menu boundary: current containment/keyboard evidence covers the renderer
menubar. A read-only audit of `src/main`/`src/preload` found no explicit Electron
`Menu`/`setApplicationMenu` integration. macOS system-menu command/state parity
therefore remains unverified; renderer evidence must not be described as native
menu integration. Review actual packaged behavior before designing that bridge.
Staff/system/expression text now use canonical selected-kind properties;
the in-score lyric editor remains a distinct workflow, not a generic text field.

Text-detail migration must also move real test interactions, not just selectors:
the staff-text summary field currently exercises edits during pending save,
autosave cleanup, retry and dock hide/reopen. Preserve those async contracts
through visible canonical controls. System text retains global/concrete measure
aliases; expression text retains explicit IDs and nonzero ticks. Reuse their
existing 80-character inputs, IME/Enter/Escape behavior and update handlers.

Pre-harmony frozen-code gate: 63 files / 902 tests passed, 1 skipped.
Typecheck/build, full production Electron, notation visual regression (unchanged
baselines), and documentation verifiers pass. Long clipboard/native structural
workflows use the existing 15-second integration-test budget; assertions remain
unchanged and no global timeout or retry was introduced. External manual
engraving and MuseScore/PDF exchange remain unverified in this execution.

## 2026-09-12 Expanded V1 Scope Override

The user-approved [Expanded V1 contracts](chromatics-expanded-v1.md) supersede
earlier V1 exclusions for native project storage, MIDI/pitch-first input,
templates/styles, object filters, command customization, docking and image export.
These are now Required implementation tasks, not optional parity or QA-only work.
Current implemented save: MusicXML/MXL and an initial native project slice.
Required target: portable native project plus interchange. Native lifecycle remains
partial; recent/recovery/manual geometry requirements are not completed.
Earlier dated decisions below are historical, not the current release boundary.
Implementation and RC approval are both incomplete until the expanded contracts
and the separate manual/external gates have evidence.

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

2026-10-21 alpha.32 tag workflow에서 Windows의 느린 rehearsal-mark native-history
App regression이 Vitest 기본 5초 제한을 넘겼다. 기능 assertion을 완화하지 않고
명시적 15초 timeout을 적용한 alpha.33 후속 release로 교체 검증한다. alpha.32는
published prerelease가 아니며, 이 문서는 alpha.33 결과가 확인되기 전 배포 성공을
주장하지 않는다.

alpha.33의 Windows retry는 통과했지만 macOS에서 별도의 lyric range
object-filter App integration test가 같은 기본 timeout을 넘겼다. assertion을
유지한 15초 local budget과 immutable `v0.1.0-alpha.34` tag로 재검증한다.

alpha.34는 PR #785로 `main`에 병합됐고, tag workflow `39573419366`에서
Linux/macOS/Windows package와 GitHub prerelease publication을 모두 통과했다.
macOS는 Developer ID signing secret 검증, notarization key 준비, 서명 검증 및
packaged-app smoke까지 통과했다. site PR #786과 main Site workflow `39576803911`도
통과했고, production `https://in-c.mannlab.app/download-manifest.json`이 alpha.34
다운로드 및 checksum URL을 반환하는 것을 확인했다.

## MuseScore Gap Matrix

| ID | Area | MuseScore Reference Feature | Chromatics Current State | Gap | User Workflow Impact | Implementation Slice | Test Strategy | Status | Next Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MS-UX-SCOPE-002 | UI / Workspace | Broader element Properties and configurable docks | Text/harmony/dynamics editing, direct span endpoint/geometry/segment inspectors, independent persisted dock visibility, locally persisted score-toolbar structure disclosure, compact export engraving disclosure, and in-place dock-header visibility actions are implemented | Freeform drag-docking, arbitrary panel placement, and broad compact-desktop human QA remain | Users can edit common markings and span geometry in place, while dense structure and PDF engraving controls can be collapsed when a user wants more room and side panels close where they are being used | Keep the current dock model stable; decide whether freeform docking is mandatory for a later parity milestone | App history/native/XML coverage proves editing; targeted Electron compact-toolbar QA remains | Research | Product scope decision required before RC; do not call all V1 functionality complete |
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
| MS-PROPERTIES-002 | UI / Workspace | Editable selected element properties | Harmony, rehearsal, staff/system/expression text and dynamics editable in dock; selected-note properties now state and toggle a valid tie relation | Richer object inspectors remain parity follow-ups | Selected markings and common note relations can be corrected without mode switching | Existing commands; Enter commit/Escape cancel; range disabled | App edit/undo/XML/context regression pass | Done | Human compact-desktop ergonomics; separate future object-property scope |

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
- 2026-09-23: 새 악보 dialog의 중복된 `내장 템플릿` picker와 `악보 구성`
  select를 `악보 구성` 단일 템플릿 선택 그룹으로 통합했다. Solo melody,
  piano grand staff, 2-part ensemble, string quartet 선택은 같은 `templateId`
  계약을 사용하며, 현악 4중주 선택 후 4파트 skeleton이 생성되는 App
  regression을 유지한다.
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
- 2026-10-21: 로컬 MuseScore Studio 4의 실제 데스크톱 화면에서 macOS 앱 메뉴와
  내부 `홈 / 악보 / 게시` 작업 영역이 분리된 것을 다시 확인했다. Chromatics는
  첫 이행으로 `파일 / 편집 / 보기 / 추가 / 형식 / 도구 / 도움말` menubar를 추가하고,
  기존 lifecycle·selection·dock·palette·layout handler만 연결했다. 기존 category
  strip은 `작업 도구`와 `문서 / 악보 / 입력 / 표기 / 가사 / 출력 / 재생`으로
  명시적으로 격하했다. 다음 UI slice는 이를 짧은 역할별 toolbar와 sidebar 중심
  entry point로 이동하는 일이다.
- 2026-10-21: staged toolbar migration의 첫 vertical slice로 `문서` category를
  제거했다. 파일 lifecycle은 기존 전역 File 메뉴를 유지하고, score workspace 안에서는
  음악 파일 아이콘의 `파일 빠른 작업`만으로 열 수 있다. 이 action은 새 score/open/save,
  MusicXML import/save, backup/recovery, edit selection/filter의 기존 handler와 disabled
  policy를 그대로 사용한다. `악보 / 입력 / 표기 / 가사 / 출력 / 재생`만 편집 도구
  category로 남았으며, `출력`과 `재생`은 다음 role-surface migration 대상으로 남는다.
- 2026-10-21: `출력` category도 제거하고 PDF/MIDI/MusicXML과 PDF page setup을 여는
  icon-only `내보내기 작업`으로 이관했다. 파일 빠른 작업을 열면 내보내기 작업은 닫히고
  반대도 마찬가지라서 두 비편집 surface가 context toolbar를 동시에 차지하지 않는다.
  현재 편집 category는 `악보 / 입력 / 표기 / 가사 / 재생`만 남았다. 재생은 transport와
  mixer가 함께 있어 별도 compact workflow slice에서 분리한다.
- 2026-10-21: `재생`도 편집 category에서 제거했다. icon-only `재생 도구`는 기존
  transport와 part mixer handler를 그대로 연다. 파일/내보내기/재생 quick action은
  상호 배타적으로 열리고, 현재 편집 category는 `악보 / 입력 / 표기 / 가사`만 남는다.
  재생 surface는 항상 보이는 transport와 필요할 때 여는 mixer 접근으로 더 분리한다.
- 2026-10-21: 재생 surface의 첫 compact density slice는 transport를 기본 표시하고,
  part mixer는 `믹서 표시` disclosure 뒤로 옮겼다. mute/solo/volume의 기존 local
  persistence와 playback handler는 바꾸지 않았으며, 상세 mixer는 열었을 때만 DOM과
  layout을 차지한다. 다음 UX 검토는 compact transport를 workspace 전반에 계속 보일지,
  그리고 multi-part score에서 mixer의 행 밀도를 어떻게 더 줄일지다.
- 2026-10-21: context strip은 실행 icon cluster 뒤에 `작업 / 입력 / 대상 / 음가`를
  primary status로, `재생 / 필터`를 secondary status로 구분했다. 1080px 이하에서는
  secondary status를 더 조밀하게 배치해 compact desktop에서 판단 우선순위를 유지한다.
  score/native data나 command path는 변경하지 않았다.
- 2026-10-21: 상단의 파일/내보내기/재생 icon action은 접근 가능한 `빠른 작업` group으로
  묶고 편집 category 앞에 구분선을 추가했다. icon label, expanded state와 기존 keyboard
  focus path는 유지한다.
- 2026-10-21: `파일` 메뉴에 `내보내기 작업 열기`를 추가해 quick icon을 기억하지 않아도
  PDF/MIDI/MusicXML surface로 갈 수 있게 했다. 이 항목은 export 구현을 복제하지 않고
  기존 quick surface와 동일한 state/handler를 연다.
- 2026-10-21: `보기` 메뉴에도 `작업 도구` checkbox를 추가해 context strip의 도구
  접기/펼치기와 같은 workspace state를 노출했다. 여러 display option을 연달아 바꿀 수
  있도록 checkbox를 누른 뒤 menu는 유지하며, Escape dismissal과 score data 불변 정책은
  기존 메뉴 contract를 따른다.
- 2026-10-21: `보기 > 선택 필터 열기`는 기존 파일 quick surface를 열고 실제 선택
  필터 select에 focus한다. 새 filter model이나 복제된 command는 만들지 않았고, menu는
  action 뒤 닫혀 현재 control로 바로 이동한다. production Electron verifier는 세 desktop
  width에서 이 메뉴 action, popup containment, visible focused filter를 확인한다.
- 2026-10-21: icon-only `파일 / 내보내기 / 재생 도구` quick action은 각각 기존
  `파일 작업 / 내보내기 작업 / 재생 작업` region을 `aria-controls`로 가리킨다. quick
  surface의 state, label, handler는 바꾸지 않고 control-to-surface 관계만 명시했다.
- 2026-10-21: contextual toolbar가 접힌 상태에서도 `추가 / 형식 / 도구` 메뉴와 상단
  editing category tab은 요청한 surface를 실제로 펼친다. 공통 workspace opener는 quick
  surface를 닫고, collapse state를 해제한 뒤 기존 toolbar category만 선택한다.
- 2026-10-21: application-menu popup은 viewport 높이를 넘을 때 자체 세로 scroll을
  사용한다. Arrow/Home/End navigation은 새 focused item을 `block: nearest`로 scroll해
  긴 menu에서도 keyboard target이 가려지지 않게 한다.
- 2026-10-21: 960px production capture에서 표기 contextual toolbar가 기호 행보다 큰
  빈 영역을 점유한 것을 확인해 notation surface만 136px compact cap으로 줄였다. 남은
  symbol row는 기존 vertical scroll로 접근하며 note/score/lyrics toolbar의 높이는 바꾸지
  않았다.
- 2026-10-21: 열린 application-menu popup 안에서도 `←/→`로 이전/다음 menu를 열고
  해당 popup의 첫 enabled action으로 focus가 이동한다. trigger focus와 popup focus가
  분리돼 있던 keyboard 흐름을 desktop menubar convention에 맞췄다.
- 2026-10-21: 선택 속성 도크는 셈여림/텍스트 등 editable controls를 먼저 두고,
  대상·위치·음높이 같은 read-only metadata를 접힌 `선택 정보` disclosure로 옮겼다.
  선택 객체의 데이터나 기존 edit handler는 바꾸지 않았다.
- 2026-10-21: context strip의 `재생`·`필터`는 접근 가능한 `보조 상태` group으로
  묶었다. 넓은 화면에서는 primary status 뒤에 붙고, 1080px 이하에서는 별도 행으로
  내려가 긴 대상 이름이 작업·입력·대상·음가 상태를 밀어내지 않는다.
- 2026-10-21: 좌측 고정 팔레트의 `표기 객체` family는 기존 measure-level 셈여림에
  더해 note-level 아티큘레이션과 장식음을 직접 적용한다. 기호 표시는 `tr/mord./turn`을
  유지하되, 한국어 accessible name을 제공하며 상단 편집 mode를 바꾸지 않고 기존
  selected-note command만 재사용한다.
- 2026-10-21 (2026-10-22 notation-only 정책으로 대체): 좌측 `음표` 탭은 온음표부터 32분음표까지의 실제 음가 팔레트를 제공했다.
  선택 음표와 note-input 상태는 기존 duration command가 판단하며, palette tab은 상단
  편집 mode를 바꾸지 않는다.
- 2026-10-21 (이후 중복 탭 제거): 좌측 `가사` 탭은 새 입력 모델을 만들지 않고 기존 `가사 편집` workspace를
  여는 명시적 entry point를 제공한다.
- 2026-10-21 (이후 중복 탭 제거): 좌측 `악보` 탭도 기존 `악보 편집` workspace의 마디·구조 설정으로 가는
  명시적 entry point를 제공한다. 네 dock tab은 빈 category 없이 각각 score setup, duration,
  selected-note notation, lyric/chord workflow로 이어지며, 상단 작업 mode와 score model을
  별도로 복제하지 않는다.
- 2026-10-21: 고정 `표기 객체` 도크의 셈여림, 아티큘레이션, 장식음 family는 각각 독립적으로
  접고 펼칠 수 있다. 이 compact 상태는 local workspace preference로 저장되며, 한 family를
  접어도 나머지 family와 기존 selected-note command path는 유지된다.
- 2026-10-22: 로컬 MuseScore Studio 4의 빈 악보 workflow를 직접 확인했다. macOS의
  `파일 / 편집 / 보기 / 추가 / 양식 / 도구 / 플러그인 / 도움말`은 시스템 menubar에 두고,
  앱 안에서는 `홈 / 악보 / 게시` workspace tab, 얇은 기호 중심 note-input row, 좌측
  `팔레트 / 레이아웃 / 속성` dock, 우측 transport/status를 분리한다. Chromatics의
  custom menubar와 `악보 / 입력 / 표기 / 가사`는 따라서 같은 시각 계층에 경쟁하는
  global navigation이 아니라, native-menu-equivalent command surface와 contextual
  editor surface로 더 분명히 분리해야 한다. 다음 IA slice는 이 관찰을 기준으로
  top-row label, quick-action boundary, contextual toolbar의 역할을 정리한다.
- 2026-10-22: 이 관찰의 첫 화면 밀도 slice로 Chromatics의 redundant `편집 도구` label을
  제거했다. toolbar nav의 accessible name은 유지하고, 파일·내보내기·재생 quick action과
  contextual editor tab 사이에는 22px 제한 높이의 separator만 남긴다. 따라서 category가
  다시 전역 메뉴처럼 보이지 않으며 1080px 이하에서도 separator가 18px로 줄어든다.
- 2026-10-22: `보기 > 작업공간 기본값으로 재설정`은 score/native contents를 건드리지 않고
  palette/properties visibility, contextual toolbar, quick surface, palette category, search,
  collapse, one-at-a-time, family order, recent/favorites를 기본 local workspace 상태로
  복구한다. 이는 MuseScore식 workspace 전환 전에도 예측 가능한 복구 지점을 제공한다.
- 2026-10-22: contextual `악보 / 입력 / 표기 / 가사` tab은 `←/→`, `Home`, `End` keyboard
  navigation을 제공한다. 이동은 기존 workspace handler와 동일하므로 quick surface를 닫고
  선택한 편집 surface를 열며 focus도 새 tab으로 이동한다. 이 의미론은 focused App
  regression으로 고정한다. production Electron verifier는 headless host에서 native key
  event를 renderer focus로 안정적으로 전달하지 못하므로 화면 containment와 기존 workspace
  path의 비회귀만 확인하며, 키 입력 자체의 대체 evidence로 과장하지 않는다. 기본 병렬
  Vitest runner는 worker shutdown에서 멈췄지만 single-worker full suite는 62 files / 848
  tests (1 skipped)로 통과했다.
- 2026-10-22: 표기 객체 작업대는 기본 기호 family를 saved shortcut보다 먼저 렌더링한다.
  `즐겨찾기`와 `최근 사용`은 기존 local workspace persistence 및 selected-note command를
  그대로 재사용하지만, family를 모두 지난 뒤에 배치해 화면, keyboard focus, screen-reader
  reading order가 일치한다. 이 순서는 source-family와 recent strip의 DOM 순서 regression으로
  고정한다.
- 2026-10-22: dock width pointer separator는 side-by-side desktop에서만 보인다. 761–1200px는
  palette와 properties를 고정 폭 좌측 열에 쌓으므로 CSS visibility와 pointer guard를 같은
  1200px boundary로 맞췄다. 이 폭에서는 header의 폭 +/-도 숨기고 desktop 저장 폭은 보존한다.
  기존 상단 compact surface 정책은 폐기했다.
- 2026-10-22 (아래 quick-row/status-bar 통합으로 대체): compact context strip은 보조 재생·필터 상태를 삭제하지 않고 한 줄의
  `보조 상태` disclosure로 요약한다. 세부 값은 native details interaction으로 펼치며,
  desktop은 기존의 즉시 표시 group을 유지한다. 따라서 compact 편집 상태가 primary chip을
  밀어내는 높이를 줄이면서도 screen-reader용 detailed group을 보존한다.
- 2026-10-22: 새 표기 작업공간은 긴 symbol matrix를 기본으로 모두 펼치지 않는다.
  `라인/범위`는 즉시 보이지만 selected-note `음표 기호`와 `반복/볼타` family는 접힌
  상태로 시작한다. 선택 마디의 clef/key/time/text/dynamic 편집은 빈번한 workflow이므로
  그대로 즉시 노출한다. 검색은 이전처럼 matching family를 자동으로 펼치며, 명시적으로
  저장한 collapse preference만 기본값보다 우선한다. 이 상태는 local workspace만 바꾸며
  score/native contents나 기존 command handler는 변경하지 않는다.
- 2026-10-22: palette/properties dock 폭은 더 이상 고정 grid 값이 아니다. View menu와
  각 dock header의 16px 조절 버튼, labelled keyboard separator, pointer divider가 하나의
  bounded local workspace preference를 사용하며 reset은 두 폭을 기본값으로 복구한다.
  score/native contents에는 저장하지 않는다.
- 2026-10-22: 긴 `보기` menu는 단순 separator 나열 대신 `작업 영역`, `도크 크기`,
  `작업공간`, `보기 모드`의 읽기 전용 group label을 사용한다. label은 keyboard stop이나
  새 command가 아니므로 Arrow/Home/End focus 순서와 기존 menuitem semantics를 바꾸지
  않는다. production Electron smoke는 세 desktop width에서 네 group label, popup
  containment, workspace reset, selection-filter focus를 함께 확인한다.
- 2026-10-22: `파일` menu도 `악보`, `저장`, `교환`, `내보내기` 순으로 lifecycle을
  묶는다. 새 악보/창, native project lifecycle, MusicXML exchange, output surface가
  시각적으로 분리되지만 IPC/busy disabled 정책과 keyboard action order는 기존과 같다.
- 2026-10-22: `악보` contextual toolbar의 빠르기와 part/staff structure editor는
  새 workspace에서 기본 접힘으로 시작하며 현재 값을 header에 요약한다.
  disclosure를 펼친 선택은 `chromatics.score-toolbar-sections.v1` local workspace
  preference에 보존되며, part 추가·삭제·순서·이조·native/MusicXML save workflow는 같은
  visible control을 통해 계속 동작한다. 접힌 header도 현재 part와 보표 수를 요약해 대상
  문맥을 잃지 않으며, score/native project contents에는 저장하지 않는다.
- 2026-10-22: `입력` toolbar도 staff/voice와 duration input은 즉시 보이게 유지하고,
  inline clef, accidental, articulation, tie, tremolo, ornament, grace-note처럼 선택 event에
  대한 깊은 속성은 `선택 속성` disclosure로 분리했다. 새 workspace의 기본은 접힘이며,
  사용자가 펼친 선택은 `chromatics.note-toolbar-sections.v1` local workspace preference로
  보존한다. 모든 control은 기존 note command와 shortcut path를 재사용한다.
- 2026-10-22: `가사` workspace의 음절 연결 선택은 internal/MusicXML 값인
  `single/begin/middle/end`를 유지하면서 UI에서는 `단일/시작/중간/끝`으로 표시한다.
  따라서 한국어 편집 화면의 용어가 다른 workspace와 일관되고, 기존 lyric update,
  native project, MusicXML round-trip 계약은 바뀌지 않는다.
- 2026-10-22: `내보내기` quick surface는 PDF/MIDI/MusicXML 실행과 `PDF 출력 설정`을
  별도 accessible group으로 나눈다. PDF 목표 장수의 validation과 저장 handler는 그대로
  재사용하고, desktop에서는 구분선으로, 좁은 폭에서는 wrapping으로 두 흐름을 구분한다.
- 2026-10-22: `편집` menu는 `실행 기록`과 `선택 편집`으로 command hierarchy를 드러낸다.
  group label은 aria-hidden이며 focusable command가 아니므로 기존 Arrow/Home/End/Page
  navigation, undo/redo 및 selection clipboard handler는 그대로 유지된다.
- 2026-10-22: 우측 속성 도크의 read-only `선택 정보` disclosure는 처음에는 접힌다.
  사용자가 연 상태는 `chromatics.selection-properties-metadata.v1` local workspace
  preference로 재시작 뒤에도 복원하며, workspace reset은 다시 접힌 기본값으로 돌린다.
  선택과 score/native project contents에는 저장하지 않는다.
- 2026-10-22: automatic slur endpoint는 같은 tuplet bracket/number lane의 실제 VexFlow
  y-position도 clearance로 읽는다. 따라서 bracketed triplet 위에 놓이는 upper slur는
  bracket과 숫자 바깥으로 이동하며, manual span geometry는 기존처럼 사용자 anchor를
  우선한다. 이 정책은 renderer fixture로 고정했고, dense PDF와 실제 악보 수동 검토는
  다음 engraving QA로 남긴다.
- 2026-10-22: 전역 menu trigger는 항상 해당 popup의 stable id를 `aria-controls`로
  가리키고, `보기`의 총보/파트보 menuitemradio는 모두 현재 `aria-checked` 상태를
  노출한다. 기존 popup placement, keyboard traversal, score-view handler는 바꾸지
  않아 visual hierarchy와 desktop accessibility model이 같은 구조를 공유한다.
- 2026-10-22: toolbar section divider는 `보기 > 도구 구분선`에서 `짧게 / 기본 /
  길게`로 선택한다. 이 값은 `chromatics.toolbar-separator-height.v1` local workspace
  preference에만 저장되고, `작업공간 기본값으로 재설정`은 30px 기본값으로 돌린다.
  score/native project contents와 기존 toolbar command path는 바꾸지 않는다.
- 2026-10-22: `선택 필터 열기`는 View menu의 workspace reset과 view mode 사이에서
  단독 command로 보이지 않도록 aria-hidden, non-focusable `선택` group으로 묶는다.
  기존 field-focus action과 keyboard menu traversal은 그대로 유지한다.
- 2026-10-22: 로컬 MuseScore 4 빈 악보 workspace를 재확인한 뒤, 새 Chromatics
  workspace와 reset의 좌측 dock 기본값을 `표기 객체`로 맞췄다. 이후 notation-only 정책으로
  음가 팔레트 중복은 제거하고 기존 `입력` toolbar와 duration command를 유지한다.
- 2026-10-22: 좌측 표기 팔레트에는 `음자리표, 조표 및 박자표` entry를 더해 기존
  `악보` contextual toolbar의 선택 마디 설정 surface로 이동시킨다. 새 notation model이나
  별도 mutation path 없이 기존 scope validation과 command를 그대로 쓴다.
- 2026-10-22: 같은 마디 표기 section의 `빠르기` entry도 기존 `악보` toolbar로만
  이동한다. MuseScore식 palette discovery를 보강하되 템포 model이나 playback handler를
  중복하지 않는다.
- 2026-10-22: 마디 표기 palette entry는 surface 전환만 하고 body에 focus를 남기지
  않는다. clef/key/time entry는 기존 선택 마디 조표 control을, tempo entry는 기존
  global tempo slider를 다음 frame에 focus해 keyboard workflow를 바로 이어 간다.
- 2026-10-22: compact notation dock은 마디 표기를 우선 보이고, 선택 음표용
  아티큘레이션과 장식음 family는 새 workspace/reset에서 기본 접힘으로 시작한다. 마디
  표기 역시 다른 family와 같은 independent collapse/local preference 계약을 따르지만,
  기본값은 확장이라 clef/key/time entry가 즉시 보인다. 명시적 local preference는 계속
  우선하며, family를 펼친 뒤 기존 note command를 적용한다.
- 2026-10-22: 960px~1100px 상단 palette의 symbol grid는 equal-width ribbon 대신
  content-sized tile cluster로 시작한다. Dynamics처럼 짧은 기호가 넓은 행을 불필요하게
  차지하지 않으면서 동일 click/drag semantics와 horizontal containment를 유지한다.
- 2026-10-22: `악보` contextual toolbar의 global tempo section은 compact desktop에서
  `75 BPM` 요약과 disclosure만 기본 노출한다. palette의 tempo entry는 이 local workspace
  disclosure를 자동으로 열고 기존 slider로 focus하므로, 시작 화면의 높이와 keyboard
  workflow를 함께 보존한다.

- 2026-10-22: 마디 표기 entry의 누락된 `마디 시작 음자리표`를 기존 악보 toolbar에 연결했다.
  음표 선택 시에도 그 음표가 속한 마디를 명시적으로 찾아 기존 staff-measures command를
  사용하며, 선택 음표와 다른 마디는 유지한다. 편집 메뉴 undo/redo 및 기존 inline-clef
  테스트를 포함한 focused 8개와 production Electron의 세 폭 containment 검증이 통과했다.

- 2026-10-22: 마디 표기 설정 entry는 도크에서 기호용 두 열 대신 전체 폭을 쓴다.
  1400px에서 78px였던 긴 타일은 약 45px로 줄었고 compact에서는 34px다. Electron은
  펼친 entry의 폭/높이와 tempo 초기 접힘/펼침 geometry를 별도로 검증한다. App은 tempo
  remount/reset, 왼손 보표와 별도 파트의 native clef save/reopen을 보호한다.
- 2026-10-22: 로컬 MuseScore 빈 피아노 악보 캡처와 File/View menu inventory를 확인했다.
  확인 당시 구조 차이는 상단 범주/context 행 수, 좌측 clef/key/time의 실제 기호 선택,
  status bar 위치였다. 새 악보 wizard는 열렸으나 입력 조작은 확인하지 못했으므로 실제
  입력 workflow 및 GUI/PDF 호환 QA를 완료로 취급하지 않는다.

- 2026-10-22: shared tuplet/slur 회귀 fixture의 quarter-triplet 시작 tick을 실제 음가에
  맞췄다. 새 rhythm guard가 overlap 3건과 gap 1건을 먼저 검출했고, 수정 후 renderer
  테스트 19개가 통과했다. UI/native checkpoint의 global suite는 866 passed / 1 skipped다.
  slur 내부의 별도 tuplet과 실제 PDF/manual 조판 검토는 계속 남아 있다.

- 2026-10-22: 편집/재생/저장 상태를 상단에서 하단 sticky status bar로 옮겼다.
  기존 상태와 오류 내용은 유지하며 긴 오류는 줄바꿈하고 제한 높이를 넘으면 키보드로
  스크롤한다. Electron은 960/1400px 기본 높이 32px, 긴 오류 60.5px, 마지막 음표를
  가리지 않는 배치 및 인쇄 시 숨김을 확인했다. 전체 production verifier와 global
  Vitest 867 passed / 1 skipped가 통과했다. 상단 중복 범주와 실제 기호 breadth는 남아 있다.

- 2026-10-22: 명령 검색의 `팔레트 열기`는 숨긴 도크도 다시 표시하고 해당 범주 버튼으로
  키보드 focus를 옮긴다. 기존 범주/visibility state만 재사용한다. 네 범주의 실패 재현 후
  focused 7 tests와 build/typecheck가 통과했고, 960/1100/1400px Electron에서 숨김 → 검색
  → 표시/focus 및 기존 palette containment를 확인했다. 악보 선택/history는 변경하지 않는다.

- 2026-10-22: 명령 검색의 네 `탭 열기` 경로도 기존 `openToolbarWorkspace`를 공유한다.
  접힌 toolbar를 실제로 펼치고 File/Export/Playback quick surface를 닫는다. 기존에는
  category만 변경해 접힌 toolbar에 접근할 수 없었다. focused 20 tests 및 production
  palette verifier가 통과했다. 상단의 범주 행 자체를 없애는 구조 개편과는 별도 접근성 수정이다.

- 2026-10-22: 하단 상태바 focus에서 방향키/Tab이 전역 악보 편집으로 전달되는 회귀를
  추가로 막았다. 기본 browser 스크롤/Tab은 유지하고 Cmd/Ctrl+K는 계속 열 수 있다.
  focused 11 tests 및 960/1400px Electron 검증이 통과했다. 직전 전체 suite는 875 passed /
  1 skipped이며 이 마지막 keyboard guard는 focused/production 검증 기준이다.
  최신 960px 초기 캡처는 compact top-palette 높이가 아직 크다는 것을 보여 준다.
  다음 IA 우선순위는 중복 범주 탐색과 상단 팔레트 높이이며, 단순 overflow PASS를
  실사용 밀도 또는 MuseScore parity 완료로 취급하지 않는다.

- 2026-10-22: 좌측 팔레트에서 중복 `악보 / 음표 / 표기 객체 / 가사` 범주 탐색을 제거했다.
  이제 도크는 마디 표기/셈여림/아티큘레이션/장식음만 표시한다. 음가, 가사/코드, 악보
  설정은 기존 실제 toolbar 경로를 유지하며 이를 테스트한다. Add/command의 `표기 객체
  팔레트 열기`는 도크만 열고 focus하며 큰 표기 작업대를 동시에 펼치지 않는다.
  과거 네 범주 palette-open 회귀는 이 정책으로 대체했다. failure-first 후 focused 44 tests와
  build/typecheck가 통과했다. 이 구조 변경 checkpoint의 전체 suite는 874 passed / 1 skipped,
  full production verifier PASS다. 삭제된 범주 테스트 4개를 실제 notation-open 테스트 1개로
  대체하고 구조 회귀 1개를 추가한 결과이며, 테스트 수 감소를 기능 손실로 숨기지 않는다.
- 2026-10-22: 761–1200px에서는 팔레트/속성을 좌측 한 열에 쌓고 악보를 오른쪽에 둔다.
  960px 초기 악보 시작 y가 455px에서 214px로 올라왔고, 1400px 좌우 도크는 유지한다.
  실제 캡처를 확인했고, 좌표 assertion은 상단 팔레트가 악보를 밀던 상태에서 먼저 실패했다.
  최신 전체 suite는 62 files / 874 tests PASS, 각각 1 skipped다. full production verifier는
  도크 표시 네 조합의 비겹침/전체 폭 복귀를 확인했고 visual regression도 baseline 변경 없이
  통과했다. 상단 contextual 행과 기호 타일 breadth, tabbed inspector/수동 workflow QA는 남는다.

- 2026-10-22: 마디 표기 도크에 높은/낮은/알토/테너 음자리표 기호 타일을 추가했다.
  기존 VexFlow와 `changeClef`를 재사용하며 클릭/Enter는 선택 마디 시작에만 적용한다.
  음표 앞 inline clef와 별개이고, 모호한 음표 범위에서는 비활성화한다. 선택/history,
  피아노 아래 보표와 quartet 마지막 파트의 native save/reopen 회귀가 통과했다.
  focused 10 tests, build/typecheck 및 960/1100/1400px production palette 검증 PASS다.
  실제 글꼴 ink bounds, SVG/타일 containment, Enter 적용/undo, family 접힘을 확인했다.
  최신 global suite는 63 files / 882 tests PASS, 각각 1 skipped다. Full production
  Electron과 visual regression도 baseline 변경 없이 통과했다.
  조표/박자표 기호 타일, drag/drop 및 MuseScore tabbed inspector는 아직 후속 범위다.

- 2026-10-22: 상단의 별도 context strip을 제거했다. 팔레트/속성 표시, 단축키 도움말,
  명령 검색, 도구 접기는 기존 quick row의 `작업 영역 도구` group으로 옮겼다. 실행 handler와
  workspace preference는 그대로다. 입력 모드·대상 보표/성부·활성 필터는 하단 상태바에
  표시하며, 현재 작업 탭·음가·재생의 중복 chip과 `필터 전체`는 더 이상 상단에 반복하지 않는다.
  선택 범위일 때는 필터가 기본값이어도 선택 개수를 표시한다. 기존 중복 chip 테스트는
  실제 선택 탭과 하단 상태를 검증하도록 갱신했다. Missing group 및 Tab interception
  실패 후 focused 25 tests/build/typecheck PASS. 960/1100/1400px production quick row는
  42px 한 줄이며 score top은 214px에서 171px로 줄었다. 상단 편집 범주 자체의 contextual
  전환, 상시 compact transport, tabbed inspector는 후속 범위로 유지한다.
  full production Electron과 visual regression도 통과했다. 하단 상태바는 기본 32px,
  긴 오류 60.5px를 유지하며 인쇄에는 나오지 않는다. 음가는 선택 음표/입력 커서 기준으로
  음가 toolbar와 일치시켰고, 전체 검증의 과거 input-default 기대값도 이 정책으로 갱신했다.
  이후 global suite의 native 저장 한 건이 이전 초기 악보를 직렬화하는 문제를 드러냈다.
  단독 원본 테스트는 통과했으나, 이전 렌더 keyboard listener를 유지한 재현에서는 실패했다.
  저장 snapshot을 기존 최신 native context에서 읽도록 수정했고 native/workspace focused
  18 tests가 통과했다. 원래 intermittent failure의 정확한 scheduling은 미확정이며,
  최종 broad 결과는 evidence log의 `Current Native Snapshot in Keyboard Save`를 따른다.
  수정 후 global suite는 63 files / 884 tests PASS, 각각 1 skipped이며 rebuild/typecheck,
  full production Electron도 통과했다. UI snapshot 검증은 직전 동일 UI 코드 기준 PASS다.

- 2026-10-22: 선택한 음표/쉼표의 상세 편집을 상단 `입력` toolbar에서 속성 도크로
  옮겼다. 음가, 점, 임시표, inline clef, 아티큘레이션, 타이, 장식음 등은 기존 handler를
  재사용하며 선택 이벤트가 있을 때 기본 펼침이다. 범위/span 선택과 음표 입력 중에는
  해당 panel을 표시하지 않는다. 기존 toolbar disclosure preference와 별개의 local key에
  도크 접힘 상태를 저장하고 workspace reset은 펼침으로 복구한다. 기존 마디 관련 필드는
  `마디 표기` heading으로 구분했다. 상단 note toolbar에는 입력 보표/성부만 남는다.
  missing dock panel, 범위 선택의 첫 음표 속성 노출, 키보드 간섭 회귀를 보완했고 focused
  18 tests와 build/typecheck가 통과했다. production 960/1400px에서 panel 높이 475.5px,
  control containment와 마지막 control의 scroll 접근을 확인했다. compact의 팔레트 아래
  속성 배치와 document scrolling은 유지하므로 tabbed/independent-scroll inspector는 남는다.
  최신 broad gate는 evidence log의 `Selected Event Properties Dock`에 기록한다.
  전체 suite 885 tests / 1 skipped, full production Electron과 visual regression PASS이며,
  최소 도크 폭 180px에서도 664px로 줄바꿈되어 가로 overflow 없이 접근 가능하다.

- 2026-10-22: 선택한 슬러/헤어핀의 속성은 상단 작업 category와 무관하게 유지한다.
  이전에는 다른 작업 탭으로 이동하면 note/measure 속성도 숨겨진 채 도크가 비었다.
  선택 객체가 있거나 표기 작업대가 열려 있을 때 기존 SpanProperties를 표시한다.
  plain-key 보호는 음표 panel에서 도크 전체로 옮겨 Enter/Space가 전역 재생/편집에
  가로채이지 않게 했다. modifier undo/redo는 유지한다. 두 종류의 실패 재현 후
  focused 9 tests/build/typecheck와 production 960/1400px, 최소 180px 도크 검증 PASS다.
  선택 해제는 실제 Chromium Enter/Space로 실행하며 note 속성으로 돌아오는 것을 확인한다.
  native/독립 파트보 geometry 검증은 기존 handler 경로를 그대로 재사용한다.
  최신 전체 suite는 887 tests / 1 skipped, full production Electron도 PASS다.

- 2026-10-22: 데스크톱 편집 frame을 창 높이에 맞추고 팔레트/속성/악보에 독립 스크롤을
  적용했다. 시작 화면, 760px 이하 fallback, PDF 출력 흐름은 제외한다. compact에서는
  좌측 두 도크가 높이를 나눠 사용하며 하나를 숨기면 나머지가 전체 높이를 사용한다.
  도크 header는 스크롤 후에도 보이며 기존 footer는 창 하단을 유지한다. document overflow와
  내부 scroll 0의 실패, header가 사라지는 실패 후 실제 960/1400px 검증이 통과했다.
  PageDown은 속성만 스크롤하고 선택 음표/악보 위치를 유지한다. PDF smoke는 실제 A4 1쪽
  생성과 native readback을 통과했지만, PNG 시각 검수에서 mordent/turn 글꼴 대체 사각형을
  발견했다. 전체 PDF 시각 QA PASS로 간주하지 않으며 다음 렌더링 결함으로 추적한다.
  이때 발견한 화면/출력 장식음 glyph 결함은 아래 후속 수정으로 검증했다.
  이 frame checkpoint의 전체 suite 887 tests / 1 skipped와 visual regression은 PASS다.

- 2026-10-22: 장식음 텍스트의 일반 글꼴 의존을 없애고 VexFlow Ornament의 Bravura
  glyph/font를 사용한다. MusicXML mordent의 세로획 의미를 유지하며 기존 event 데이터는
  변경하지 않는다. 화면/출력 glyph 회귀와 실제 PDF에서 발견한 윗보표 충돌을 수정했다.
  fermata 유무별 장식음 높이를 공통 vertical layout에 예약하고, production 검사에서는
  font em box가 아닌 실제 ink bounds를 측정한다. focused 27 tests와 visual regression PASS;
  실제 A4 PDF를 PNG로 확인했고 앞 보표와 13.6px 간격, Bravura 내장, native readback이
  통과했다. 이는 복합 기호 fixture 검증이며 전체 dense score/MuseScore GUI 호환 완료가 아니다.
  자세한 실패/재검증은 evidence의 `Ornament Glyphs And Staff Clearance`를 따른다.
  최신 전체 889 tests / 1 skipped, full production Electron, typecheck 및 문서 gate도 PASS다.

- 2026-10-22: 로컬 MuseScore Studio 4.7.5에서 General / Grand Staff 빈 악보를 실제로
  생성하고 팔레트/속성 탭, 쉼표 선택, 음자리표 family, 믹서 열기를 직접 조작했다.
  기본 workspace는 좌측 Palette/Layout/Properties 탭, 상시 음표 입력 row/transport,
  하단 mixer/status 구조였다. 다음 UI slice는 compact의 위아래 도크를 shared-height
  탭으로 정리하되 기존 visibility/focus/선택/스크롤 계약을 유지하는 것이다.
  960px 요청은 실제 1050px로 제한되었으므로 960px MuseScore QA로 간주하지 않는다.
  임시 악보는 저장하지 않았고 사용자 악보도 수정하지 않았다. 외부 파일/PDF 왕복은 별도다.
  캡처와 관찰 범위는 evidence의 `Actual MuseScore Workspace Observation`을 따른다.

2026-10-22 compact dock follow-up: 761-1200px에서 팔레트/속성은 좌측 tablist의 한 panel만
표시하고 상태줄 위까지 전체 높이를 쓴다. 탭은 기존 도크 subtree/handler를 그대로 사용하며
visibility와 별개로 활성 탭만 `chromatics.compact-dock.v1`에 저장한다. 좌우/Home/End,
닫기/재열기 focus, 명령 검색의 팔레트 focus, span 선택의 속성 활성화와 reset을 연결했다.
폭이 넓어져 탭이 없어질 때 focus는 해당 도크로 이동한다. 실제 960px 탭/높이/재열기,
1400px 도크 복원, PDF 숨김과 독립 PageDown 검증이 통과했다. 자세한 gate는 evidence의
`Compact Tabbed Docks`를 따른다. >1200px 양쪽 도크와 category navigation은
아직 남아 있어 실제 MuseScore 기본 workspace와 완전히 같다고 말하지 않는다.
이 slice의 최신 global suite는 891 tests PASS / 1 skipped이고 typecheck, build,
roadmap/work-queue/diff gate도 통과했다.

2026-10-22 persistent transport follow-up: 별도 `재생 도구` quick category를 없애고
처음으로/재생/일시정지/정지/믹서 버튼을 상단 전역 메뉴 옆에 계속 표시한다. 재생은 기존
선택 위치 handler와 disabled 정책을 재사용한다. 믹서는 악보 아래, 상태줄 위의 독립
surface이며 편집 category/File/Export 전환으로 닫히지 않는다. DOM 순서도 표시 순서와
같게 배치했고 `도구 > 믹서 열기`는 기존 mixer input에 focus한다. 음량/뮤트/솔로의
기존 local persistence는 유지하고 score/native 데이터는 바꾸지 않는다.
실패 재현 App test 후 focused 30 tests, 최신 global 892 tests / 1 skipped, build/typecheck,
full Electron, visual regression이 통과했다. 추가한 production multi-part assertion도
960/1400px에서 통과했다. 실제 Space로 믹서만 열기, 6개 작업 surface의 transport 유지,
하단 배치, print 숨김, quartet 높이 제한/마지막 볼륨 접근을 확인했다. 상세 결과는
evidence의 `Persistent Transport And Bottom Mixer`를 따른다. 상시 음표 입력 toolbar와
category navigation 제거, wide dock 통합, 실제 청감/외부 악보 QA는 후속이다.

2026-10-22 persistent note-input follow-up: 음가/부점/타이/셋잇단음표, 임시표/음높이,
입력 보표/성부를 `입력` category 전용 행에서 꺼내 하나의 상시 입력 toolbar로 합쳤다.
새 입력 toggle은 기존 `toggleNoteInputMode`를 호출한다. 가사 상태에서 시작했을 때 글자
키가 가사 편집에 잡히던 regression은 기존 note workspace로 전환해 해결했다. 선택 음의
음가 수정과 입력 중 다음 음가 설정, undo/redo는 기존 handler 그대로다. 작업 도구 접기는
명시적으로 이 toolbar도 숨기며 별도 score/native 상태를 추가하지 않는다.
실제 960/1400px에서 높이는 79/45px, 초기 canvas는 500/534px로 확인했다. native Enter,
음 이름 입력, Escape, Tab focus와 5개 작업 surface 전환 중 containment를 확인했다.
숫자 음가 표기와 잔여 category navigation은 아직 MuseScore와 차이가 남아 있다.
검증 순서와 최신 global 결과는 evidence의 `Persistent Note Input Toolbar`를 따른다.
최신 전체 895 tests / 1 skipped, typecheck, production Electron/visual regression,
roadmap/work-queue/diff gate가 통과했다. CSS selector suffix 오인으로 실패했던 contract
test는 CSSOM의 정확한 selector 비교로 수정했고 기존 wrapping assertion을 유지했다.

2026-10-22 duration-symbol follow-up: 숫자/`온` 표기를 VexFlow의 SMuFL 음표 글리프로
교체했다. 온음표부터 64분음표까지 같은 music-font stack과 고정 22x26px SVG surface를
사용하며 버튼의 한국어 accessible name, shortcut tooltip, pressed 상태와 command는
그대로다. 실제 font raster 검증에서 64분음표 상단 clipping을 재현하고 공통 font size와
baseline을 조정했다. 960/1400px의 7개 glyph ink/viewport containment와 native 입력
keyboard regression이 통과했다. 자세한 broad gate는 `Duration Toolbar Symbols` evidence를
따른다. 잔여 category row 제거와 wide shared dock는 계속 남아 있다.
최신 전체 896 tests / 1 skipped와 full production Electron, typecheck, 문서 gate가 통과했다.

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
| 2026-10-20 | Notation palette selected-note symbol breadth and workspace persistence | Fail, then Pass | A failure-first App test found no `음표 기호 팔레트` in Notation Objects. The new collapsible/searchable family exposes existing articulation, ornament, tremolo, fermata/breath and guarded grace-note commands for the selected note without adding a parallel score model. Family collapse state is stored as a local workspace preference and restored on remount; it is intentionally excluded from native score projects. Compact icon actions collapse or expand all families, optional one-at-a-time mode preserves a single expanded family, and primary family ordering is user-controlled and restored on remount. Search temporarily opens matching families and locks workspace controls. A local, six-item `최근 사용` strip and user-pinned `즐겨찾기` strip both reuse those same selected-note command handlers, restore across remounts, and never enter native score contents; each source symbol can be pinned before it is applied. Palette delegation and workspace persistence tests passed; TypeScript passed. `npm run verify:mvp` now checks the open notation workspace at 960px and 1400px, including direct source pinning plus populated recent/favorite items, family reordering, persisted state, search locking and horizontal containment. |
| 2026-10-20 | Full key-signature preset breadth | Pass | The common `keySignaturePresets` source now exposes all 15 major/minor sharp and flat signatures (`-7..+7` fifths) to both the new-score wizard and `표기 객체 > 마디 설정`. Focused App coverage selects E major (♯ 4개) from the selected-measure control, while new-score and VexFlow/layout tests cover preset resolution plus the full renderer boundary. |
| 2026-10-20 | Automatic slur endpoint clearance | Fail, then Pass | A dense lower-register fixture reproduced automatic slur endpoints sitting inside endpoint staccato dots. Automatic slurs now reserve the measured same-side articulation stack while manual span geometry retains its existing user-defined anchor behavior. Passive-attachment/annotation lane tests and the 960px/1400px production Electron notation snapshot verifier passed. |
| 2026-10-21 | Mixed-stem automatic slur side | Fail, then Pass | A dense mixed-register fixture showed that start-stem-only direction placed a lower slur beside the start staccato stack even though the upper side was clear. Automatic slurs now compare both endpoint articulation clearances when stem directions differ, choosing the clearer side and retaining start-stem placement on a tie. Manual span geometry remains user-controlled. Focused passive-attachment and annotation-lane coverage passed; PDF/manual engraving QA remains. |
| 2026-10-21 | Repeat/volta tie traversal | Fail, then Pass | A first/second-ending fixture proved that merging ties in source-measure order created an extra note on the second pass. Playback now expands repeat and volta passes first, offsets source-event starts to that pass, and only then merges contiguous same-voice ties. Volta engraving remains a renderer concern and is unchanged. Timeline coverage passed; repeat listening and explicit pass-selection UX remain. |
| 2026-10-21 | MuseScore-style desktop menubar foundation | Fail, then Pass | A failure-first App regression found no `주 메뉴`. The new `파일 / 편집 / 보기 / 추가 / 형식 / 도구 / 도움말` menubar routes only through existing commands and supports trigger click, `←/→`, `Home/End`, `↓/Enter/Space`, Escape, and outside-pointer dismissal. Once opened, enabled menu actions receive focus and support `↑/↓` plus `Home/End`. Popups anchor beneath the trigger that opened them. The former category row is visibly demoted to `작업 도구` with role-oriented labels, while its legacy accessible names preserve existing workflow state during the staged migration. Focused App tests, typecheck, production build, and the Electron 960/1280/1400 viewport verifier pass; the verifier checks menu labels, trigger alignment, containment, no horizontal overflow and dismissal. It still needs deliberate migration into compact toolbars/sidebar entry points before visual parity can be claimed. |

## Sources

- MuseScore Studio Handbook: https://handbook.musescore.org/
- MuseScore Studio user interface: https://handbook.musescore.org/navigation/the-user-interface
- MuseScore Studio copy and paste: https://handbook.musescore.org/basics/copy-and-paste
- MuseScore Studio score size and spacing: https://handbook.musescore.org/en_gb/formatting/score-size-and-spacing
- MuseScore Studio pages and vertical spacing: https://handbook.musescore.org/formatting/pages-and-vertical-spacing
- MuseScore Studio chord symbols: https://handbook.musescore.org/text/chord-symbols
- MuseScore Studio templates and styles: https://handbook.musescore.org/en_gb/customization/templates-and-styles
- MuseScore Studio selecting elements: https://handbook.musescore.org/en_gb/basics/selecting-elements
