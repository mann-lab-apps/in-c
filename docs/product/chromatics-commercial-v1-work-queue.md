# Chromatics Commercial V1 Work Queue

## 2026-10-23 Rhythm-feel Boundary and External Control

Measured rhythm-feel text/glyphs and bracket stroke now join page preflight.
Long custom text reproduces missed rejection in renderer and actual Electron;
the existing guard now blocks before PDF IPC. At 960/1400, real Format/tempo
controls replace it with eighth/16th swing, native reopen preserves the explicit
edit, and both reviewed retries produce one A4 page. Four files / 215 layout
tests, typecheck/build/visual pass without baseline changes. Current full suite:
1,166 passed, two App timeouts, nine skipped. Both timeout cases pass unchanged
in focused isolation; this does not turn the full gate green. Timing stability
remains open; 1,163 tests below belong to the preceding checkpoint.

An ordered-XML, test-only omission of the ending repeat count leaves original
fixtures and independent MIDI expectations intact. Both normalized inputs exit
normally in MuseScore but still give nine notes versus eight: compatibility is
not fixed. Separate fresh as-written runs SIGABRT, including without concurrent
Electron. Next: actual print header/title bounds and automatic header spacing,
general blank-tail pages, GUI/listening and repeat interpretation. Native menus,
IME and real-score QA remain unverified; no V1/RC completion claim.

## 2026-10-23 Tempo Boundary and Non-destructive Visibility

Actual global/positioned tempo text uses the existing page guard; positioned
ascent also feeds existing automatic spacing. Hidden tempo ink is excluded from
print boundary checks. Visibility toggles preserve imported tempo text and BPM,
with undo/redo/native reopen coverage. Production 960/1400 reproduces width
4720.014 beyond 750, blocks before IPC, and allows a reviewed one-page PDF after
explicitly hiding the mark through the real control. Text is not discarded.
Focused 211 layout + 18 App tests, types/build/visual pass without baseline edits;
post-tempo full suite passes 71 files / two skipped, 1,163 tests / eight skipped.
Header/title,
rhythm-feel ink, general blank-tail pages and external repeat/volta QA remain.
The repeat QA document adds a specification-backed, unexecuted ending-count
isolation control; current strict external mismatches remain unresolved.

## 2026-10-23 Inline Clef Rendering Contract

The floating inline character is replaced by a VexFlow small clef aligned to the
staff. Notes/rests across its voices use the latest clef at their tick; the next
measure compares against the previous final effective clef, and primary-system
ledger spacing uses the same resolver. Native pitches/data remain unchanged.
Actual inline text ink feeds the existing page/spacing checks. Renderer, boundary
and ledger regressions fail first, then focused 204 + App/XML five tests pass.
Production 960/1400 rejects a genuinely overflowing nine-staff page; explicit
90% staff size via the actual PDF control allows reviewed one-page output and
native reopen. Types/build/visual regression pass without baseline changes;
whole-suite rerun passes 71 files / two skipped, 1,159 tests / eight skipped.
General blank-tail output, dense inline collisions,
simultaneous contradictory clefs, tempo/header ink and external repeat/volta QA
remain open, not implied complete by these gates.

## 2026-10-23 Harmony Boundary and Retry

Chord glyph ink now reuses page-width/height checks and automatic upper-space
measurement. Long imported text is preserved, rejected before PDF IPC, then
corrected through the existing Add/chord property path. Production 960/1400,
native preservation/reopen and a reviewed one-page C7 retry pass. Controlled
ascent coverage verifies automatic fitting separately from the actual-font
horizontal failure. Focused 201 tests, types/build and unchanged visual baseline
pass. Whole-suite run passes 1,137 tests / eight skipped (70 files / two skipped);
subsequent concurrent-work type correction and targeted checks are in evidence.
Inline clef and tempo/header checks plus
external nested-repeat/volta and GUI/listening QA remain incomplete.

The initial inline-clef audit found no glyph/page intersection for nine G/F/C
markers, but its PDF had a blank second page and clefs above the staff. It also
found notes/rests positioned from `measure.clef`, ignoring the inline change.
The follow-up rendering contract above fixes the clef geometry and effective-clef
calculation with regressions. General print-tail padding remains open: do not
crop by a selection box or weaken the existing page guard.

## 2026-10-23 Consumer Comparison and QA Safety

MuseScore CLI checks no longer request factory/revert settings; one tested
argument builder covers playback, XML/MXL and PDF exports. Installed 4.7.5 lacks
the old config-folder option, so temporary output is not settings isolation.
Three argument tests/types pass. Normal-exit source/round-trip comparisons now
pass for simple endings but fail the independent nested contracts: both MuseScore
inputs produce nine notes versus Chromatics' twelve (repeat) / eight (volta).
This narrows the discrepancy beyond serialization alone; it does not approve
external playback or change either expected traversal. Intermittent SIGABRT and
GUI/listening remain pending; precise runs are in evidence.

Final default suite passes 1,134 tests with eight skips (70 files passed / two
skipped). The twice-observed 5s volta workflow timeout is addressed with a scoped
15s budget, retaining all history/native/XML assertions. This does not close the
opt-in external playback failures or establish a performance SLA.

## 2026-10-23 Rehearsal Boundary and Reserved Top Space

Rehearsal glyphs and the outer frame stroke now participate in existing page
checks and staff/system envelopes. Unit glyph/stroke probes and an actual-font
stroke-only Electron failure precede the fix. The 960/1400 production retry uses
the real rehearsal property editor, preserves object identity/native content,
and produces a reviewed one-page PDF after correction.

Page-start spacing no longer adds measured top ink to already-reserved annotation
space in full. The base header margin remains reserved, while inter-system and
page-break clearance are tested separately. Four files / 199 focused tests pass;
broader/production results and reviewed baseline changes are in evidence. This
supersedes the earlier upper-text snapshot spacing, not the horizontal guard.
Remaining ink audit: inline clef, harmony, tempo/header and other unmeasured
families. External nested repeat/volta discrepancies and GUI/listening QA remain.

## 2026-10-23 Horizontal Page-boundary Guard

Actual measured ink is checked against both page width and height, with separate
width-error guidance. Staff/system texts now participate in measurement and
automatic upper spacing. This does not silently shorten imported text or change
manual geometry. Wide staff/system/expression tests and App reject/retry coverage
pass; production reproduces the missing guard and verifies rejection, native
preservation and correction through the real text property editor before PDF retry.

Focused layout 192 / PDF App 11 tests, types/build and 960/1400 production pass.
Actual long text right edge 3221.91 exceeds print width 750. The corrected same
object exports to a reviewed one-page PDF. Visual baseline changes reflect the
reviewed upper-ink spacing; final broad gates are in evidence. Other unmeasured
symbols/header ink, automatic text wrapping, real-score typography and external
MuseScore traversal compatibility remain open.

## 2026-10-23 External Repeat Source Control

MuseScore playback QA now retains the original MusicXML alongside Chromatics
output and compares both consumer imports against the written traversal contract.
Per-stage exit/signal evidence prevents CLI crashes from becoming semantic passes.
All three current external attempts abort before comparison; internal 46 tests
pass with three opt-in skips. Existing nested-repeat/volta mismatches are not
resolved, and no product expectation was changed to match one consumer.

## 2026-10-23 Leading Symbol Page Boundaries

Actual leading clef/key/time glyph ink feeds system spacing and PDF rejection via
the existing text measurement path. Native content and manual geometry are not
rewritten, and internal staff gaps are not expanded for full-width annotation
lanes that these left-edge modifiers do not occupy.

Focused 188 tests, types/build, production 960/1400/native/PDF and unchanged visual
baseline pass. The real treble-clef probe exceeds page bottom by 4.44 while staff
lines fit; save is blocked and the affected part retries with its clef intact.
Key/time boundary tests use controlled font metrics, not real-font clipping
claims. Broad results are in evidence. Inline clefs, header/upper text, readable
fitting and external nested-repeat compatibility remain open.

## 2026-10-23 Tie Page-boundary Coverage

Page checks and automatic spacing now include actual VexFlow filled tie contours,
including separate ownership for cross-system/alternate-ending pieces. Existing
tie data, playback and save-error/retry paths remain unchanged. A low tie below
the last staff was not rejected in unit and production red cases; the corrected
renderer rejects the full score before save and exports the fitting affected part.

Focused 185 tests, types/build, production 960/1400/native/PDF and notation
snapshots pass, no baseline update. Nested-volta production checks preserve the
existing source-note/tie/slur and eight-beat contract; external MuseScore MIDI
differences are not resolved by this measurement change. Broad results are in
evidence. Clef/upper text/header boundaries and general readable fitting remain.

## 2026-10-23 Lower Annotation Page Boundaries

PDF preflight now includes actual lyric/dynamic/expression glyph ink. The same
measurements feed automatic staff/system spacing, allowing later systems to move
to the next page when their measured text exceeds the estimated lane. Score and
native contents are preserved, and the existing App rejection/retry surface is
reused. This is not a new text model or an automatic rewrite of user geometry.

Expression unit/production red cases are fixed; lyric/dynamic and enlarged-descent
spacing controls pass. Focused 183 tests, types/build, 960/1400/native/PDF and
notation snapshots pass, baseline unchanged. Affected Part 9 saves with its four
texts after the oversized whole score is rejected. Broad results are in evidence.
Remaining work includes tie/clef/header ink, readable fitting, real-score PDF and
external nested-repeat QA; this stress fixture is not complete engraving approval.

## 2026-10-23 Hairpin Page-boundary Guard

PDF rejection now covers painted hairpin strokes outside their system's page,
in addition to staff lines and slurs. Existing App error/retry handling is reused;
manual height/offset and native score contents are preserved. Both unit cases
and a pre-fix production run reproduce the missing rejection. Regression coverage
includes a centerline that fits while its stroke crosses the boundary.

Layout 179 tests, types/build, 960/1400 production/native and notation snapshots
pass. The overflowing full score is rejected before save; the affected Part 9
exports to a reviewed one-page PDF without changing manual height. No baseline
change. Broad results are in evidence. General ink preflight, readable fitting,
external MuseScore nested-repeat compatibility and manual platform QA stay open.

## 2026-10-23 External Repeat MIDI Evidence

Independent MuseScore MIDI checks now supplement XML round trips. The simple
first/second ending matches pitch/onset/tied-sustain expectations; plain nested
repeat and nested-volta cases fail (12-vs-9 and 8-vs-9 notes). CLI crashes are
recorded separately. This is partial external evidence, not full interoperability
or a reason to silently change Chromatics traversal to one consumer's output.

See [the opt-in QA guide](../testing/musescore-playback-qa.md). Five MIDI inspector
tests and 80 internal focused tests pass; three external tests skip by default
and remain strict when enabled. No product change or fresh full/UI/PDF gate in
this slice. External GUI/listening and ambiguous nested-repeat policy stay open.

## 2026-10-23 Slur Page-boundary Preflight

The prior staff-only PDF guard now also rejects slur ink outside its system's
page, without rewriting manual height/offset or score data. Filled contour bounds
and SVG viewport origin are reused. Nine-staff unit and pre-fix production cases
reproduce the missing rejection; final production rejects measure 1 before IPC,
then exports the affected Part 9 with its manual slur intact.

Layout 177 tests, App PDF 10 tests, types/build, complete span/PDF runner and
notation snapshots pass. The detail capture and one-page Part 9 PDF were reviewed;
baseline unchanged. Broad results are in evidence. General annotation/tie/hairpin
preflight, readable score fitting and external MuseScore/manual QA remain open;
this extreme fixture is not a substitute for real-score engraving approval.

## 2026-10-23 PDF Oversized-system Save Guard

Page-crossing staff systems are now rejected before the PDF save dialog, with
their first measure identified in the existing error surface. Editing/selection
are restored and a fitting part can be exported on retry. Scope is actual staff
lines from existing VexFlow staves; native/score state and manual geometry remain
unchanged. General annotation/page-boundary detection is not complete.

Renderer/App and production fail-then-pass evidence, PDF-focused 13 tests, layout
176 tests, types/build, complete span runner and notation snapshots pass. The
32-staff whole score is rejected; its one-page Part 1 PDF and error captures at
960/1400 were inspected. No further baseline changes. The earlier oversized
three-page PDF remains defect evidence only. Full-suite results are in evidence;
real-score fitting, external app QA, native macOS menu and IME checks remain open.

## 2026-10-23 Oversized System Empty-page Guard

Systems already at a page top no longer generate an additional empty page when
too tall. Three red unit/renderer cases now pass; the automatic later-system
control already passed. Production uses 32 staves because target-page fitting
prevented reproduction with 12. First print y changes 1665->97, with score/native
contents preserved. Focused 176 tests, typecheck/build and notation snapshots
pass; full-suite results are separate in evidence.

The three-page PDF was reviewed and is **not approved as finished engraving**:
Parts 14 and 28 straddle page cuts. Next page-layout work must detect systems too
tall for a readable page and provide a fit/rejection policy, not equate removal
of an empty page with valid pagination. No automatic staff shrink or new data
model was added by this guard. External real-score/MuseScore QA remains open.

## 2026-10-23 Local Staff and System Geometry

Automatic staff gaps now use each system's annotations and measured ink rather
than the whole score's maximum. Screen/PDF layout share local heights and retain
manual geometry, explicit page breaks, hit-target alignment and native equality.
Red screen/print cases and production [291.92,291.92,291.92] gaps become scoped
[272.50,291.92,272.50] gaps. Focused 172 tests, types/build, 960/1400/PDF and full
span verifier pass. Four PDF pages and captures reviewed; two SVG-height baseline
values updated after real-ink containment verification. Full-suite results are
tracked separately; no claim of finished page composition or external approval.

## 2026-10-23 Ending Ownership Within Nested Repeats

An inner repeat no longer supplies the pass used by an enclosing volta. First-
and second-ending core regressions fail then pass; XML/native round trips keep
written endings and slurs separate from the eight-beat fixture timeline.
Focused 110 tests, two App limit controls, types/build and 960/1400/native/MIDI/PDF
checks pass, including the earlier plain nested-repeat control. PDF/captures were
reviewed without baseline edits. MuseScore MIDI and music21 expansion differ;
external compatibility and GUI/listening are not approved. Fresh full suite
passes 1,086 tests / five skips; both document verifiers and diff check pass.

## 2026-10-23 Repeat Work Bound

Skipped endings now count toward a one-million-step traversal budget, alongside
the existing emitted-visit/depth limits. The red core fixture returned normally
despite excessive traversal work; it now throws the existing expansion error.
107 focused tests, two App controls and typecheck pass. Editing from two to eight
outer passes rejects excessive work without changing score or Undo history.
No claim of a reproduced UI hang. Full suite passes 1,083 tests / five skips;
both document verifiers and diff check pass. Next repeat audit: an inner repeat
contained inside an outer volta, with independent ownership of pass selection.

## 2026-10-23 Nested Repeat Traversal

Nested repeat regions now replay inner sections on every outer pass, replacing
the fixture's incorrect seven visits with twelve. Alternate-ending, single-bar,
implicit-repeat and expansion-limit tests protect the shared traversal. App
rejection preserves score/history; nested MusicXML export reports a consumer
compatibility warning. Focused 106 core/XML/playback/measure-edit tests, one App test, types,
build and actual 960/1400/native/MIDI/PDF structural checks pass.
music21 10.5.1 agrees with the twelve visits; MuseScore CLI emits nine onsets.
Do not claim external playback parity. PDF raster review differs by renderer:
`pdftoppm` omits the beam, while `pdftocairo` shows it and retains the vector path.
Do not call this confirmed missing PDF content; other-viewer QA remains open.
Final full suite passes 1,081 tests / five skips, including the unchanged existing
measure-insertion expectation after completed-pass retention was repaired.

## 2026-10-23 PDF Target Overrun Feedback

Successful PDF save reports when the measured print-layout estimate exceeds the
requested page count. Cancel/error and invalid-estimate paths retain their prior
behavior. Nine focused App tests, typecheck/build and actual one-page-target
960/1400/PDF/native checks pass. Both fixture PDFs are two pages, matching the
renderer estimate; all four pages and notice captures were inspected. This does
not claim improved page fitting or complete engraving parity.
Full Vitest passes 1,072 tests / five skips. A subsequent test-double-only DOM
string conversion was covered by a nine-test PDF rerun; product code unchanged.

## 2026-10-23 System-local Hairpin Density

`--audit-hairpin-local-baselines` reproduces sparse systems inheriting a dense
middle system's 227.92px automatic baseline. Annotation/stem/overlap budgets and
expression reservation now follow each system, preserving manual geometry and
native content. Screen/print regressions, focused 140 tests, typecheck/build,
960/1400/PDF/native, mixed-baseline and complete span checks pass. Actual captures
and all four PDF pages were inspected. Sparse annotation gaps shrink; overall
staff spacing, pagination and external real-score approval remain incomplete.
Unchanged-baseline visual regression and full Vitest pass: 1,067 tests, five
skipped. Both document verifiers and final whitespace gate pass.

## 2026-10-23 Middle Slur Continuation Shape

`--audit-slur-continuation-shape` reproduces excessive automatic middle-segment
depth (80.29px in Electron). Free hanging ends now account for nearby ink before
the existing clearance solver; attached/manual endpoints are unchanged. Four
screen/print regressions fail then pass; focused 140 tests, typecheck/build,
960/1400/PDF/native, complete span and unchanged-baseline visual gates pass.
All four PDF pages were inspected. Large sparse-system hairpin/annotation gaps,
varied pitch contours and external engraving QA remain open, not parity-complete.
Full Vitest passes 1,067 tests with five skips; both document verifiers pass.

## 2026-10-23 Interior Hairpin Lane Coverage

`--audit-hairpin-interior` reproduces an actual middle-measure `mf`/hairpin
intersection. Automatic layout now reads all traversed measure lanes; manual
endpoint geometry stays unchanged. Focused 136 tests, typecheck/build and real
960/1400/PDF/native reopen checks pass. Both two-page PDFs were inspected.
Review also found an unusually deep middle lower slur and large sparse-system
annotation gaps, still open for quantitative geometry QA. Complete span and
unchanged-baseline visual gates pass; full Vitest passes 1,063 tests (five skipped).
No complete engraving/parity approval is implied.

## 2026-10-23 Unequal Hairpin Baseline Follow-up

`--audit-hairpin-mixed-baselines` reproduces overlapping automatic spans when
endpoint lyric counts differ. Allocation now uses actual occupied baselines and
reserves their height against local expression rows; score content is unchanged.
134 focused tests, typecheck/build, 960/1400/PDF mixed- and equal-baseline fixtures
and native equality pass. Reversed insertion order is covered at renderer level.
Screens and both PDF pages were inspected. Complete span and unchanged-baseline
visual gates pass; full Vitest passes 1,061 tests (five skipped).
interior annotation peaks, broader stem cases and external QA remain open.

## 2026-10-23 Automatic Hairpin Stack Clearance

Actual Electron open-end ink overlaps (-5.8px gap) now have a dedicated
`--audit-polyphonic-hairpin-stack` fixture. Automatic rows use 26px spacing and
feed their extra height into expression/staff/system lanes on the bounded render
pass. Two/three/nested renderer cases include extra-row removal and native score
immutability; existing manual controls remain. Focused 132 tests, typecheck/build,
960/1400/PDF/native reopen and complete span checks pass. Full Vitest passes 1,059
tests (five skipped); visual regression needs no baseline changes.
Different span baseline budgets and general multi-verse/external QA
remain separate from this same-range acceptance fixture.

## 2026-10-23 Combined Hairpin And Text Clearance

`--audit-polyphonic-hairpins` adds a cross-system automatic crescendo to the
two-voice slur/lower-text fixture. Actual line/stroke sampling reproduced a 3.70px
expression gap, below the 4px acceptance criterion. The existing lower lane gap
was increased to 28px; manual geometry and native data remain unchanged.
129 focused tests, typecheck/build, 960/1400 Electron and PDF/native reopen checks
pass. Both screenshots and PDF pages were reviewed. Final full suite passes 1,056
tests (five skipped), with complete span and unchanged-baseline visual gates.
Multiple overlapping hairpins and lyric verses,
mixed-voice spans and external GUI/IME QA are not approved by this fixture.

## 2026-10-23 Slur And Lower Text Competition

Real Electron lyric/slur intersection is fixed by a measured shared lower-row
offset, using the existing bounded renderer/vertical layout pass. Text row order,
inline lyric positioning, manual span geometry and score/native data are preserved.
Four renderer cases and two lane/spacing cases pass; 128 focused tests and
typecheck/build pass. The new production annotation audit verifies 960/1400/PDF,
actual text ink, next staff/system clearance, containment and native equality.
Complete part/span verification passes; final broad/visual gates are in evidence.
Automatic hairpins combined with shifted text rows and multi-verse/voice lyric
competition remain follow-ups, alongside mixed-voice spans and external QA.

## 2026-10-23 Multi-Voice Automatic Slurs

Same-lane polyphonic slurs now use the existing voice's outward side. Manual
whole/segment placement remains authoritative; neutral/mixed-lane cases keep the
previous fallback. Endpoint stem and attachment margins are combined rather than
double-counted. Renderer direction/manual/staccato controls pass, as do actual
960/1400/PDF triplet+two-voice curves, neighboring staff clearance, native equality
and complete part-span/system-spacing checks. Visual baseline unchanged; 126 focused
tests and typecheck/build pass. Fresh global suite passes 1,053 tests / 66 files,
five tests / one file skipped, 196.09s; document verifiers and diff check pass.
Lower annotation competition, voice-count transitions inside spans, cross-voice
connections, manual volta geometry and external/native-menu/IME QA remain open.

## 2026-10-23 Triplet And Second-Voice Runtime QA

The previously renderer-only triplet/polyvoice combination now has a dedicated
Electron fixture (`--audit-polyphonic-triplets`) at 960/1400 and PDF, with dense part
above/below, same-beat alignment, barline containment, visible tuplets, voice stem
policies and native equality/reopen checks. Product code did not need alteration.
Eight focused renderer tests and typecheck pass; captures/PDFs were inspected.
The initial failure came from fixture voice IDs and VexFlow collision displacement,
not the shared tick layout. The automatic-slur variant and deliberate crossed-voice
spacing remain follow-ups; preserved manual geometry is not automatic-clearance QA.
Global 1,049-test and visual PASS remain the immediately preceding product checkpoint,
not newly rerun gates for this verifier-only slice. No baseline changes.

## 2026-10-23 Lower-Staff Density And Print Planning

The earlier lower-staff width follow-up now has unit and real-font regression
coverage. Shared system widths and print candidate estimates consider all displayed
staves rather than just the first. Swapping the dense part leaves tested geometry
and page plans unchanged. A real Electron barline overrun was reproduced before
the fix; 960/1400, PDF and native equality/reopen now pass. The complete existing
span/system-spacing runner also passes, and visual baselines were not changed.
Fresh global suite passes 1,049 tests / 66 files, five tests / one file skipped,
196.12s; both document verifiers and whitespace check pass. Production triplet/polyvoice,
arbitrary imported gaps/polymeter, extreme single-bar density, manual volta geometry
and external/native-menu/IME QA remain open; this is not full parity or RC approval.

## 2026-10-23 Cross-Staff Rhythm Alignment

Deferred note drawing allows VexFlow to format compatible staves together instead
of independently spreading each rhythm. Existing event handlers, manual span
geometry, score/native data and single-staff behavior are retained. Real-font
mixed-rhythm red (up to 22.97px) becomes zero delta at 960/1400 and in PDF.
Eight renderer cases cover dense upper/lower staves, print/screen, triplets and
same-staff polyphony; 146 focused tests and typecheck/build pass. Existing complete
span/system-spacing and unchanged-baseline visual gates pass. Fresh global suite
passes 1,045 tests / 66 files, five tests / one file skipped, 200.08s. Document
verifiers and whitespace gate pass. Dense lower-staff width budgets, arbitrary imported gaps/polymeter,
manual volta geometry and external QA are not claimed complete.

## 2026-10-23 Shared Repeat Barline Projection

The full-score renderer now uses the existing aligned-staff repeat source and
local-ID projection helper. Canonical repeats are visible on each aligned staff;
native content is unchanged. Four screen/print regressions (source above/below)
and a real 960px capture reproduced the 20px first-onset discrepancy. Focused
166 tests, typecheck/build, 960/1400 and PDF zero-delta checks, native preservation
and visual regression pass without baseline updates. Fresh full suite: 1,037
tests / 66 files pass, five tests / one file skipped, 196.96s. Both document
verifiers and whitespace gate pass.
General mixed-rhythm horizontal alignment, manual volta geometry, native select
keyboard and external QA remain open. No score schema/version changes.

## 2026-10-23 Repeat Boundary Spacing

Real part-PDF glyph ink crossed the first repeated measure's barline by 10.27px.
Repeat-start/end footprints now participate in minimum-width packing. Three
failure-first layout cases and 162 focused tests pass; 960/1400 full/part captures,
PDF ink containment (at least 4px right clearance), native preservation,
typecheck/build and unchanged-baseline visual regression pass. The inspected
part PDF now has at least 26.60px right clearance. Fresh global suite: 66 files /
1,033 tests pass, one file / five tests skipped, 201.80s. Documentation gates pass.
No version or score model changed. The asymmetric-repeat first-onset issue is
fixed by the follow-up above; general cross-part rhythm alignment, manual volta
geometry, native select keyboard and external QA remain open.

## 2026-10-23 Explicit Volta Display Range

Users can now choose the final displayed measure inside an existing volta or
return to automatic display, without changing repeat playback. Native references,
range deletion/undo, part projection and history/save/reopen are covered. XML
warns that the visual range is native-only while retaining repeat semantics; its
save guard still catches conflicting local endings. Equivalent closed ends and
shared part barlines no longer cause false save rejection.

Focused/types/build, 960/1400 production UI, three-system full-score PDF, part PDF
and unchanged-baseline visual regression pass. Fresh full suite passes 1,030 tests
/ 66 files, five opt-in skips (one skipped file), 201.25s.
Manual vertical/segment geometry, native select keyboard opt-in and external QA
remain open. The tight first-boundary spacing is fixed by the follow-up above.

## 2026-10-23 Volta End Editing

The shared measure-properties card now provides open/closed ending selection,
target identity and disabled outside-range state. Existing repeat-source lookup,
measure command/history and native storage are reused. Actual menu/selection,
960/1400 containment, undo/redo and native reopen pass; 32 focused tests and
typecheck/build pass. Score event buttons also support Enter/Space selection.

The regular Electron gate uses the existing visible/enabled select-change helper.
Native arrow/Return selection remains a failing opt-in check via
`--audit-native-volta-keyboard`; no claim of keyboard-only workflow approval.
Visual regression passes without baseline changes. First full run fails the
existing combined PDF-result timeout; unchanged isolated retry passes. Three
independent PDF outcome cases retain assertions and the per-test 15s limit.
Fresh full rerun: 1,022 tests / 66 files pass, five opt-in tests skipped (one
skipped file), 371.79s. Explicit long brackets, manual volta geometry, external
partial-tie/mode/PDF and human QA remain unresolved.

## 2026-10-23 Open Volta Endings

MusicXML open endings retain `endStyle` through native/renderer/export and ending
shrink/undo. Legacy closed endings and repeat playback are unchanged. 143 focused
tests, types/build, fixture gate, actual menu import/export, 960/1400/native/PDF
and visual regression pass. Fresh full suite: 1,015 tests / 66 files passed, five
external opt-in tests skipped (one skipped file). MuseScore XML exchange succeeds,
but its PDF subprocess fails with a mutex error, so external gate is not approved.
Endpoint-style editing is covered above; explicit long display spans and manual
geometry remain unimplemented.

## 2026-10-23 Neighboring Note Ink

Follow-up closes the reproduced unslurred neighboring-note/stem collision using
existing renderer ink metrics. Actual Electron red -28px becomes 12px clearance
for above/below whole/half-note fixtures at 960/1400 and PDF. 124 focused tests,
typecheck/build, native equality/reopen and visual regression pass. Fresh full
suite passes 1,008 tests / 65 files, four opt-in tests skipped (one skipped file).
No baseline or score/native changes. Other ink
combinations, local density, manual volta and external compatibility remain open.

## 2026-10-23 Inner Staff Slur Gaps

Same-system inward slur collision is reproduced in renderer and actual Electron.
Measured contours feed existing vertical staff spacing without native mutations
or manual shape changes. 122 focused tests, types/build, 960/1400/native/PDF and
visual regression pass; no baseline update. Fresh full suite passes 1,006 tests /
65 files with four external opt-in tests skipped (one skipped file).
Spacing remains global per staff, not locally optimized per system. Unslurred
neighboring note/stem ink, other annotation lanes and excessive curves remain
open, along with external partial-tie/mode-metadata interoperability and GUI QA.

## 2026-10-23 Sparse Attributes

Current recovered serializer now suppresses unchanged key/time/clef/staves/divisions
and transposition output. First-part attributes, actual boundary changes, numbered
staff changes, zero transpose reset and inline-clef carry/reset remain covered.
Six red cases become green; 140 focused tests, typecheck/build, external-fixture
unit verifier and production 960/1400/native/PDF pass. Fresh full suite passes
1,001 tests / 65 files with four external opt-in tests skipped (one skipped file).
MuseScore signature fixture semantic comparison passes but CLI test processes
still exit SIGABRT; a separate PDF command exits 0 and the reviewed PDF shows no
redundant measure-2 signatures. External partial ties and explicit major-mode
metadata loss remain unresolved. This is not full interchange/Commercial V1/RC
approval; no version or release changes.

## 2026-10-23 Partial Tie Exchange Gap

Alternate-ending external MuseScore parity is still failing: stop-only notation
disappears; paired partial notation becomes let-ring and loses playback merging.
Export now separates single-note tied notation from sounding tie flags and warns
at the affected destination measure through the existing MusicXML report. Local
native/XML/undo contracts are preserved; 134 focused tests, two App export-report
tests, types/build and production 960/1400/native/PDF pass. Fresh full suite passes
995 tests / 64 files; three external opt-in tests are skipped (one skipped file).
No external parity approval: the opt-in assertion remains strict and fails.
Next evidence-driven item: suppress unchanged measure attributes, because actual
MuseScore PDF shows repeated clef/time signatures from our current serializer.
Reference PDF inspection is not GUI editing/listening validation. CLI shutdown
SIGABRT is recorded separately from actual tie semantic loss.

## 2026-10-23 Alternate-Ending Ties

Branching-ending ties now share playback's repeat traversal for validation and
editing. Five red core cases become green: second-ending native save preservation,
correct source selection, branch-safe deletion and rejection of exclusive-ending
linear ties. Structural edit/native/MusicXML/undo coverage preserves remaining
branches. Renderer shows the second-ending incoming partial tie without crossing
the first ending. Focused 154 tests, typecheck/build, production 960/1400/native/PDF
and unchanged visual baseline pass; PDF inspected. A sixth red/green guard makes
body-start creation prefer the forward ending, not the repeat-return edge. The
990-test full pass predates this priority fix; fresh final gate passes 991 tests /
64 files with two external opt-in tests skipped. Final build/production/visual
reruns pass without baseline changes.
Remaining: partial-tie curvature polish, nested repeat semantics,
same-system inter-staff clearance, manual volta policy, and external GUI/listening
QA. No Commercial V1/RC completion, version change or release action.

## 2026-10-23 Volta / Slur Clearance

`CV1-X-SPAN-PAIR-COLLISIONS` now has a bounded volta/slur repair: ending hooks and
labels move above actual slur contours, share a system-wide bracket height, and
reserve system space. X ranges/ending numbers and automatic/whole-manual/segment
slur geometry/native data are preserved. Production failure (-26.10px line,
-9.78px label) becomes about 6px/22.32px clearance at 960/1400px and PDF.
Six failure-first renderer cases and a same-system alignment guard pass, along
with native reopen, inspected PDFs, typecheck/build and unchanged visual baseline.
Other annotation-lane collisions, branching-ending tie semantics, manual volta
geometry policy and external GUI/listening QA remain open. Fresh full suite passes
979 tests / 64 files, with two external opt-in tests skipped. Prior 972-test result
does not include this slice.

## 2026-10-23 Automatic Slur System Collision

`CV1-X-SLUR-DENSE-CLEARANCE` / `CV1-X-SPAN-PAIR-COLLISIONS` remain open.
The production verifier's `--audit-system-spacing` initially reproduced inward
extreme-register slurs crossing (-46.48/-38.29/-40.46px at 960/1400/PDF). Actual
curve bounds now feed a synchronous second pass through shared system/page layout;
minimum gaps are 13.84/12.98/13.21px. Manual geometry/native preservation and prior
production assertions pass; final PDF inspected. 114 focused tests and fresh
typecheck/build pass, as do production notation snapshots without baseline edits.
Post-layout page estimates include measured height, but preflight target-page
scaling is not yet re-optimized using measured envelopes. Same-system inter-staff
collisions, excessive curve depth and slur/volta proximity remain open. See the
evidence log for scope: fresh full suite passes 972 tests / 64 files, with two
external opt-in tests skipped. Prior 966-test PASS predates this fix.

## 2026-10-22 Parent Brand

Use 띠로리 for the parent brand, replacing the former 도요 naming direction.
Chromatics remains the product name. English spelling, domains, internal asset
identifiers and release metadata are not renamed by inference. The current
worktree contained no prior parent-brand display copy. The user confirmed that
the original checkout must remain unchanged; its brand artifacts and Clef metadata
are outside the approved editing boundary.

## 2026-10-22 Menu-Driven Workspace Follow-Up

`CV1-X-WORKSPACE` and `CV1-X-COMMANDS-SHORTCUTS` remain Partial. The recovered
permanent worktree removes the four contextual category buttons and routes their
editing surfaces through Format/Tools/Add and command search. File/Export quick
actions and workspace controls move onto the menu row. Existing handlers and
score/native data are unchanged. Production Electron verifies 960/1400px focus,
containment, no category buttons and zero history edits. Full menu-slice Electron
and notation visual regression pass. Menu-checkpoint Vitest passed 898 tests
(1 skipped); later slices are validated separately.

The follow-up shares palette/properties in one tabbed dock at wide widths, with
a real View action to restore split placement. Old width/visibility preferences
are preserved; shared width/layout use local workspace storage, not score/native
data. Focused App and 960/1400px production checks cover resizing, tab persistence,
compact fixed width and split compatibility. Detailed editing consolidation and
broader shared-layout visual/workflow QA remain.

Selected-measure clef/key/time now use one properties section instead of duplicate
toolbar controls. Palette/menu entry opens and focuses the existing fields;
scope, selection, undo/redo and native reopen retain their existing commands.
Focused tests and 960/1400px menu-surface production checks pass. Pickup/repeats,
text/span consolidation remain. Palette/Add measure entries preserve collapsed
work tools instead of opening the score toolbar; Format retains full settings.
Failure-first App cases and 960/1400px production focus/height checks pass.

Pre-harmony combined gate: 63 files / 902 tests passed, 1 skipped; full production
Electron, visual regression without baseline changes, typecheck/build and both
documentation verifiers pass. Initial workflow timeouts and an interrupted run
are retained in evidence. Long native/clipboard integration cases now use the
existing 15-second budget with all assertions intact. Detail placement and
external/manual engraving gates remain open; no release/version change.

Harmony detail editing now has one canonical properties editor, preserving the
object chooser and same-tick neighbors. Menu/object entry reveals and focuses it
without reopening collapsed work tools. The duplicated summary input is gone;
range disabling, invalid input/cancel, history, native reopen and XML preservation
are covered by the 29-test focused bundle. Latest full suite: 63 files / 903 tests
passed, 1 skipped. Production full-workflow and 960/1400px shared-dock harmony
checks pass. A follow-up fixes nonzero-tick harmony object resolution and scope
feedback: explicit IDs precede cursor-tick filtering; "new" uses the cursor.
Failure-first/native-content coverage, 16 focused tests and 960/1400px production
object-click/edit checks pass. The 903-test global gate predates that follow-up.
Text/lyric/span detail consolidation and engraving QA remain open; results and
exclusions are in evidence.

Rehearsal detail placement now removes the duplicated summary input and moves
the existing chooser/12-character field into properties. Score-object, Add-menu
and palette entry preserve collapsed work tools. The existing update command,
global/local aliases, neighbor identity and range-disable policy are reused.
Failure-first and 37 focused App cases pass; 960/1400px production entry/focus and
containment checks pass. Staff/system/expression detail duplication remains;
broader post-change results are tracked in evidence, not inferred from old gates.
Latest combined frozen-code result: 63 files / 905 tests passed, 1 skipped,
547.35s. Full production Electron, typecheck/build and documentation gates pass.
This is a stabilization checkpoint, not Commercial V1 or RC completion.

The next text consolidation removes duplicate staff/system/expression fields
from notation tools and summary, retaining one selected-kind properties editor.
Existing targets, update commands, 80-character limit and native score model are
unchanged. Palette/Add/object entry, scoped feedback, range disabling, history,
native reopen, global/local system identity and IME have focused coverage.
36 workflow cases and four canonical/scope cases pass; 960/1400px production
entry/focus/containment checks pass. Full post-text results are tracked in evidence;
the 905-test checkpoint above predates this change. Lyrics/span consolidation,
manual density review and external engraving/MuseScore/PDF QA remain open.

Post-text broad result: 63 files / 909 tests passed, 1 skipped, 525.17s. Complete
production Electron, typecheck/build, both document verifiers and diff check pass.
Visual regression and external engraving QA were not rerun for this slice.

Explicit property entry from a selected slur/hairpin no longer focuses hidden
measure/text fields. It clears the span selection without score mutation; generic
workspace switching retains selection. Two failure-first cases, 11 focused tests,
typecheck/build and 960/1400px production checks pass. The preceding 909-test
global gate predates this follow-up; lyric detail placement is next.

Lyric detail placement now puts verse/syllabic/melisma settings in properties;
the text input remains in-score. The legacy lyric toolbar is removed. Menu entry
preserves collapsed work tools; clicking an existing lyric reveals its verse and
properties without adding a second text editor. Failure-first/native-reopen and
27 focused cases pass, as do 960/1400px entry/focus/advance/containment checks.
Broad post-lyric gates are tracked separately in evidence. Remaining UI density
includes previously opened unrelated property sections; engraving QA is still open.

Latest combined span-entry/lyric full gate: 63 files / 912 tests passed, 1 skipped,
501.08s. Complete production Electron, typecheck/build, roadmap/queue verifiers
and whitespace gate pass. No new visual-regression baseline or external engraving
QA claim. The goal stays active; current work remains uncommitted.

Contextual-properties follow-up: selection-bound workspace state prioritizes one
object editor without changing score data, target IDs or manual folds. `가사 입력`
and `코드 심벌 입력` now open separate editors. Explicit lyric entry clears span
selection; score/note workspace switching does not. Six focused regression cases
and production 960/1400px context/focus/overflow checks pass. The prior 912-test
global gate does not cover this change; broader results are recorded in evidence.
Full production now passes. The post-context global run has 912 passes and one
legacy dock-visibility assertion failure, followed by a focused assertion
migration. All eight final focused cases and typecheck pass; a fresh all-suite
pass after that test-only change remains unclaimed.
Dynamic editors are now consolidated in properties; Add/menu-search/glyph entry
focuses the existing value field without expanding collapsed tools. Palette tile
application is retained. Failure-first, 20 focused and four final grand-staff/
context/dock cases pass, covering neighbors, new/delete, history, native reopen
and range disabling. Typecheck/build pass; production/broad gates are tracked
in evidence. Dense span engraving and external MuseScore/PDF QA remain open.
Production dynamic entry now passes at 960/1400px, with inspected captures and
preserved neighbor IDs. The audited uniform slur is now a filled tapered contour,
retaining its centerline hit path and manual geometry. Twenty-four renderer/CSS
cases pass; production visual regression passes after capture/diff review and
six slur-only bounding-box baseline updates. Full combined Vitest passes:
63 files passed / 1 skipped, 917 tests passed / 1 skipped in 519.34s. This closes
the pending broad recheck, not the remaining engraving acceptance criteria.
Interior collisions, cross-system contour joins and actual PDF review remain.
At the user's handoff request, stop after recording this checkpoint; do not start
the next slice. On resumption, migrate the audited but unchanged/unrun
`verify-part-span-geometry.cjs` to real menus/shared properties before relying on
its native round-trip, independent part/segment geometry and PDF checks. Version
0.1.0-alpha.34 and all uncommitted changes are preserved; no release action.


2026-10-22 resumed part/segment QA: removed category-button failure reproduced;
`verify-part-span-geometry.cjs` now uses real menus/shared Properties/disclosure
with visibility, enabled-state and containment guards. Isolated nonpersistent
Electron storage prevents inherited split-dock preferences. Fresh production
build/runner and typecheck pass; native part/segment geometry, history and PDF
assertions remain. One part PDF page and two segment PDF pages were inspected.
This fixture validates manual geometry preservation, not collision-free automatic
engraving. External MuseScore/manual dense-score QA remains open. No product,
version, commit or release change in this verifier-only slice.

Automatic cross-system slur follow-up: first/last hanging ends angle outward,
while manual whole/segment geometry remains unchanged. Six focused cases plus
the renderer/layout/CSS bundle (38 tests) pass. Production geometry/native/PDF
checks pass at 960/1400px; visual baseline remains unchanged. New automatic PDF
shows interior stem crossings, so dense-clearance acceptance stays open. This
policy is not full configurable MuseScore contour parity or RC approval.

Interior slur stem follow-up now constrains automatic curves using rendered
same-staff/system stem extents and places automatic stem-side anchors beyond the
stem tip. Manual geometry is untouched. Three failure-first coordinate/endpoint
cases pass within 41 renderer/layout/CSS cases; typecheck, production native/PDF
runner and reviewed visual regression pass. Four scalar baseline values changed
after rejecting an excessively tall short-curve candidate. Full combined Vitest
passes: 63 files passed / 1 skipped, 926 tests passed / 1 skipped, 521.92s.
Dot/beam/stemless-note obstacles and extreme-density bounds remain
open; this is not completion of CV1-X-SLUR-DENSE-CLEARANCE.
Next verify stemless whole-note obstacles and automatic SVG containment (existing
viewport expansion is manual-span based). Keep the goal active and continue with
failure-first fixtures; no release or version changes are authorized.

Stemless follow-up: four whole-note cases cover automatic above/below clearance
and manual geometry preservation; a fifth excludes non-rendered rest stems.
46 renderer/layout/CSS tests, typecheck and production geometry/native/PDF checks
pass. Glyph ink bounds, not logical note centers or SVG font-line boxes, drive
clearance. Reviewed the new PDF and compact capture; updated only two snapshot
slur heights caused by removing phantom rest stems. The previous 926-test full
run predates this slice. Automatic viewport bounds, dots/beams and external QA
remain open. No score schema/version/release changes.

Automatic viewport follow-up: real Electron red showed a lower slur 33.67px below
the SVG viewport. Collecting all slur bounds in the existing 8px-padded viewport
helper fixes editor/PDF clipping without altering score data or manual geometry.
49 focused tests, typecheck, production part/segment/native/PDF runner and notation
visual regression pass. Extreme-register PDF inspected; excessive arch depth is
still a separate engraving-quality risk. Combined full Vitest now passes with
source/tests frozen: 63 files passed / 1 skipped, 932 tests passed / 1 skipped in
519.65s, exit 0. Goal stays active; next investigate interior staccato/tuplet
clearance without claiming complete dense-score or RC readiness.

User-requested stop checkpoint (2026-10-22): finished the in-flight interior
staccato slice, with two reproduced automatic failures and two manual controls.
Shared placement/radius now provide actual dot edges to the automatic solver.
53 focused tests and typecheck pass. Latest full 932-test run and production/PDF
evidence are before this last change. On resume verify staccato in production/PDF
before proceeding to tuplet/duration-dot obstacles; full engraving parity remains
open. Preserve dirty changes and pause after documentation gates; no release.

Staccato production follow-up: single/stacked circles in upper/lower automatic
slurs pass actual edge-clearance checks at 960/1400px and in PDF. Manual curve
controls, score nonmutation and native reopen pass; all three PDFs inspected.
53 focused tests, typecheck and visual regression pass with no new baseline edit.
Full Vitest passes: 64 files passed / 1 skipped, 942 tests passed / 1 skipped,
200.17s. Separate Appearance/brand work is left untouched. Continue with interior
tuplet/dot/beam fixtures after the broad gate.

Interior tuplet follow-up: two automatic cases failed first, then six note/rest
and manual-control cases pass. Automatic slurs use actual number ink and visible
bracket edges, not the invisible hit rectangle. 59 focused tests, typecheck,
production 960/1400px/native/PDF checks and notation visual regression pass;
automatic/manual PDF rasters were inspected and no baseline was changed. Full
Vitest remains the pre-tuplet 942-test result until rerun. Duration dots, beams,
rest glyphs, spacing and external MuseScore QA remain; no release action taken.

Duration-dot follow-up: automatic constraints now include augmentation-dot ink
independently of staccato. One upper clearance regression fails under test-font
metrics before the fix; the production-font fixture already passes before it,
so no production-overlap claim is made. Four dot cases plus existing checks pass
(63 focused tests), as do typecheck, 960/1400px/native/PDF and visual regression.
Both PDF rasters inspected; manual geometry preserved. Combined full Vitest passes:
64 files passed / 1 skipped, 952 tests passed / 1 skipped, 199.42s; source/script/
baseline diff unchanged during execution. No baseline/version/release changes in this slice.

Rest ink follow-up: actual Electron font geometry reproduces a lower slur crossing
the 64th-rest glyph; unit stub metrics do not reproduce it. Automatic slurs now
include rest ink while still excluding phantom stems and retaining manual geometry.
71 focused tests, typecheck, 960/1400px/native/PDF and visual regression pass;
automatic/manual PDF rasters inspected with no baseline edit. A 33/64 stress case
isolates the short rest. Current full Vitest passes: 64 files passed / 1 skipped,
960 tests passed / 1 skipped in 203.34s, exit 0; tracked source/script/baseline
diff unchanged through execution.
Beam edges, extreme inter-system spacing and repeat/volta/external-app QA remain.

Beam audit: three renderer tests exercise twelve sloped single/multiple/partial
beam combinations with above/below and manual controls. No collision reproduced;
existing stem-tip constraints already protect these polygons. No product mutation.
86 focused tests, typecheck, build and 960/1400px/native/PDF production checks pass;
minimum conservative contour clearance 4.2745px. Auto PDF (1 page) and manual PDF
(2 pages) inspected. This is bounded coverage, not arbitrary dense beam parity.
The previous full 960-test run predates these tests; system spacing remains open.

Repeat/volta contract coverage now preserves a body tie, exclusive ending numbers
and a second-ending slur endpoint through internal MusicXML/native round trips.
The slur does not alter the 16-beat unfolded playback. 113 focused tests, typecheck
and 960/1400px/native/PDF production checks pass. Authored-fixture MuseScore CLI
PDF conversion passed on retry after SIGABRT, and both PDFs were inspected. This
does not establish GUI or external XML round-trip parity. Chromatics' forced-break
PDF exposes slur/volta line and number proximity; collision handling and ties
branching into both endings remain open. No product/baseline change in this audit.

Follow-up CLI exchange passes Chromatics export -> MuseScore XML export ->
Chromatics reimport/native validation with the same endpoints, endings and tied
playback. First external invocation aborted; a separate retry passed. Full Vitest
before adding this opt-in external test passed 966 tests / 64 files, one skipped;
external test and typecheck passed afterward. GUI/manual collision QA stays open.

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

### Editing UX Slice (2026-09-25)

`CV1-X-EDITING-UX-SHORTCUTS` is in progress. The current slice adds a visible
File-toolbar "new window" command backed by Electron IPC, remaps duration entry
to the Finale-style high-frequency order `1=whole, 2=half, 3=quarter, 4=eighth,
5=16th, 6=32nd, 7=64th`, and changes notation-surface navigation to
`Tab`/`Shift+Tab` for measure movement plus `Enter`/`Shift+Enter` for voice
movement. Plain `Up/Down` now edits selected note pitch diatonically, with
`Alt/Option+Up/Down` chromatic and `Cmd/Ctrl+Up/Down` octave movement. Shortcut
help and shortcut badges are updated.

Follow-up in the same slice adds Finale-style interval chord input for selected
notes through explicit Option aliases: `Alt/Option+2-9` stack diatonic chord
tones above the selected note and `Alt/Option+Shift+2-9` stack them below. Plain
`1-7` stays a consistent duration map for selected notes, rests and the
note-input caret. The older `Shift+A-G` absolute pitch shortcut stays as a
secondary command. Focused App tests also confirm that selected-measure clef
changes are performed from the `표기 객체` category rather than structural setup.
Beat/tick-internal clef changes, per-notehead chord selection, MIDI chord capture
and user shortcut preferences remain Required follow-up.

`CV1-X-MEASURE-CLIPBOARD` receives a first single-measure internal clipboard:
measure selection can copy/cut/paste the aligned full-score measure contents
for notes, rests, chords and tuplets while preserving target measure IDs and
issuing new event IDs. Score-level markings, spans, repeats/voltas and
measure-level clef/key/time interchange across clipboard boundaries remain
Required follow-up, not completed by this slice.

`CV1-X-MULTI-WINDOW` receives only the first independent-window launcher. Each
new BrowserWindow owns an independent renderer state, but window/document-scoped
autosave, recovery, dirty-state coordination, quit dialog aggregation and
packaged multi-window smoke remain Required follow-up before this umbrella can
be marked Done.

### Integration Checkpoint (2026-09-15)

The user approved commit/push/merge of the current Chromatics work, not release.
Latest source at that checkpoint passed 707 tests / 1 skip and build; exact
renderer/package evidence is separated by bundle in evidence-log. Do not interpret
that merge as V1 complete. 2026-09-16 follow-up preserves Chromatics-authored
lower/non-primary system text through MusicXML and adds same-measure system-text
object editing without neighbor deletion. Global rehearsal edit/undo is covered in
actual Electron score/part workflows. Expression text uses normalized direction
ticks, and the 2026-09-16 follow-up covers lower-staff backup/native/App preview
ownership; actual renderer/PDF placement review remains Required. Next work should
continue explicit scope UI, arbitrary tick identity, object list/range selection
and passive attachment renderer/PDF placement rather than repeating this slice.

### Scoped Rehearsal Resumption (2026-09-15)

Explicit resumption found no existing goal and registered an active expanded-V1
goal. Remote main remains `9d44696`; the existing uncommitted worktree is preserved.
`CV1-X-XML-SCOPED-REHEARSAL` narrows the parent scope task to concrete measure-ID
ownership: MusicXML `system="none"` plus staff number, global `only-top`, native v4
without schema changes, cross-staff paste, and multiple rehearsal renderer lanes.
Failure-first XML/clipboard/lane tests now pass. Follow-up fixes add lower-staff
measure selection, preserve neighboring rehearsal objects during text editing,
and remove part-owned rehearsal marks with their part instead of globalizing them.
Current full suite: 699 pass / 1 skip; build/typecheck, 28-case Electron clipboard
workflow and fresh macOS arm64 unsigned package smoke pass. Final E2E and unchanged
960/1400px notation snapshots also pass on bundle `index-B-nOq9dA.js`.
System text ownership, arbitrary tick identity, explicit scope UI and linked
displays remain Required. The earlier usageLimited checkpoint is historical.

### Explicit Endpoint Resumption (2026-09-15)

Explicit user resumption supersedes the historical stop checkpoints below. Remote
main was fetched at PR #757 merge `9d44696`; the old temporary worktree was absent.
Current isolated worktree: `/private/tmp/chromatics-span-targets-20260915`, branch
`feature/chromatics-span-targets-20260915`, base `9d44696`. Original Clef/quiz/site
changes remain untouched. A matching goal was registered; no new Git integration
or deployment is authorized.

`CV1-X-SPAN-EXPLICIT-TARGETS` adds start/end event selectors after copying a span.
Explicit endpoints override source duration, remain in the target staff, and may
cross voices. Invalid explicit endpoints never fall back to automatic matching.
Slurs require notes; hairpins accept notes/rests. Automatic paste retains the
same-voice exact tick-distance policy. Chords are single events with `pitches`,
not multiple same-tick event IDs; individual chord-notehead anchoring is not added.
Cross-voice source copying now requires explicit destination endpoints; automatic
paste remains rejected for those snapshots. Endpoint core/App/native/
XML, 14-case renderer/disk, 673-test full suite, E2E and visual checks pass. Subsequent
text-filter work passes 9 focused tests, 22 renderer/disk cases and a 682-test full
suite. Standard-attribute checkpoint: 686 tests / 1 skip, build and fresh macOS
package smoke pass. Subsequent all-part global-text import has 99 XML tests / 1 skip
and typecheck; final gates are tracked separately. Next: scoped global-text XML ownership,
then independent-object/list/range selection. All expanded Required umbrellas stay open.

Latest checkpoint: 696 tests pass / 1 skip, build and 26 Electron cases pass,
including cross-voice source snapshots requiring explicit destination ends. The
960/1400px notation baseline is unchanged. Fresh E2E and macOS arm64 unsigned
package smoke pass; see evidence-log for the exact checkpoint. Goal manager
currently reports `usageLimited`; explicit user resumption permits this normal
execution but does not reactivate automatic goal continuation.

### Clipboard Continuation (2026-09-14)

User subsequently requested stopping feature work and committing/pushing/merging.
Finish only the in-flight clipboard validation and integration; do not begin the
next Required task until explicit resumption. Independent slur/hairpin copy now
preserves destination notes using exact same-voice tick-distance endpoints.
Core and App history/native/XML tests and ten renderer/disk cases pass; final
integration gates are recorded in evidence-log.
Cross-voice endpoints, ambiguous chord endpoints, arbitrary rhythmic anchors,
other object types and expanded umbrella completion remain open.

Explicit resumption starts from pushed c105c7e in the isolated recovery worktree.
Approval-service capacity initially blocked edits; no alternate write path was used.
Current code snapshots effective part slur/hairpin geometry and reports omitted
partial spans/outside segments on copy and paste. Six App tests cover object/null/
absent overrides, part-to-score switching, native save/reopen and history. Editor
tests cover source deletion and repeated cross-document paste without aliasing.
New actual-renderer/disk harness: `verify:range-span-copy`. Initial sandbox launch
and approval-service failures were followed by a successful elevated run: all six
960/1400px cases pass, including a measured 20px independent segment displacement.
Full suite: 660 pass / 1 skip; build, E2E, visual and fresh macOS package smoke pass.
Octave lines now copy with fresh endpoints and four-type native/XML/playback tests.
Same-staff identical intervals reuse existing lines; conflicting overlaps reject
before mutation. Independent slur/hairpin object copy without notes is now covered
below. On explicit resumption: broader object/chord/cross-voice contracts and
cross-measure note ranges; all expanded Required umbrellas remain open.

### Explicit Resumption (2026-09-14)

Quota resumption completed the interrupted pre-segment gates: 629 tests pass /
1 skip after fixing test-only Storage isolation, with fresh macOS package and
actual renderer/PDF checks. Segment implementation now writes native v4 with
source-preserving v1/v2/v3 migration. Exact musical segment editing/history,
part scope, reflow nonapplication and two-page export have initial evidence.
Reproduced continuation/fermata/caesura collisions are fixed with shared vertical
reservation and corrected continuation offsets; final segment gates are running.
Inactive-segment status/removal/undo/reapplication now pass actual Electron QA;
boundary deletion/save/undo and insertion/reorder pass focused regressions.
Next: current whole-suite/package gates, then denser geometry and clipboard audits.
All expanded Required umbrellas remain incomplete, not QA-only.

The user explicitly resumed implementation. Goal lookup returned no existing goal,
so the expanded Required goal was registered active. Work is isolated in
`/private/tmp/chromatics-expanded-v1-20260914`, branch
`feature/chromatics-expanded-v1-recovery-20260914`, based on merged PR #754
(`ff6c9c2`). Other services' dirty worktree changes are untouched. No new Git
integration or release is authorized by this execution request.

First task: `CV1-X-NATIVE-AUTOSAVE-MIGRATION`, child of native lifecycle/schema.
Reproduced v1 rejection before migration and overwrite of unreadable recovery on
the next write. Input validation now migrates first; writes/cleanup validate the
existing recovery before replacement/removal. App retry, invalid-input feedback,
and stale discard response guards are under actual-workflow verification.
Acceptance: preserve score/part/view/markings, read without source mutation,
save/reopen as current native format, preserve broken/future files, and verify UI/IPC/disk together.
State: disk/App and fresh macOS packaged migration proof pass. Full current
regression gates are recorded in evidence; the child rows track bounded contracts.
Native lifecycle remains Partial, including retention and crash/cross-machine QA.
Next: span segment/collision and
independent part-geometry contracts. All expanded Required rows remain in scope.

PR #754's final automated package jobs passed on macOS, Linux and Windows.
Earlier Windows automation availability rows are historical, not a current
external blocker. Actual installer/native-dialog/OS-signoff remains manual QA.

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
| CV1-X-SPAN-PROPERTIES | span endpoint/geometry 속성 | UI Information Architecture | Expanded V1 span contract | 슬러/헤어핀 직접 조정 부재 | core/App/layout | engraving QA | Partial | Direct selection/endpoint edit, numeric placement/offset/height, auto reset/history/native-v2 and SVG/PDF first contracts implemented. 2026-10-20 makes the active placement visible before opening the geometry editor, including score/independent-part scope, object/segment target, inherited segment state, placement and manual sp offsets. Next: segment-specific geometry, inter-system collisions, independent part geometry, arbitrary rhythmic anchors and XML geometry interchange. |
| CV1-X-OBJECT-FILTERS | 객체 선택과 필터 확장 | Editing Workflow | Expanded V1 selection contract | 원하는 표기만 일괄 편집 불가 | core/App | selection ergonomics | Partial | Chord/dynamic/text/lyric/note-attached object filters and visible text-object direct selection have bounded coverage. 2026-09-18 follow-ups render/click-select multiple same-measure staff text and dynamic objects instead of losing all but one; visible chord/dynamic/text objects expose accessible role/name labels plus Enter/Space activation; visible slur/hairpin segment targets also expose accessible labels and keyboard activation for span selection. Remaining: list/multi-object selection UX, span object clipboard/filter workflows and broader range/list semantics. |
| CV1-X-OBJECT-CLIPBOARD | 객체 clipboard 확장 | Editing Workflow | CV1-X-OBJECT-FILTERS | 음표와 별개 표기 재사용 불완전 | core/App/round-trip | 실전 편집 | Partial | Contained range slur/hairpin/octave and independent slur/hairpin exact-tick copying have tests. Other object/text copying, cross-voice/chord endpoints, cross-measure note ranges and partial-span policies remain Required. |
| CV1-X-PART-LAYOUT | 독립 파트보 portable layout | Parts / Part View | Expanded V1 part contract | 기기 이동 시 파트 조판 손실 | App/native/export | PDF QA | Partial | Part title, page/system breaks and page settings support independent editing/history/native save. Reset removes independent title/break/page overrides and is undoable. Next: structural score-edit/removed-anchor audit and complete portable authoring/export verification |
| CV1-X-ENGRAVING | 마디 밀도와 수동 조판 | PDF / Page Setup | Expanded V1 engraving contract | 출판용 페이지 조정 부족 | layout/visual/PDF render | human engraving | Todo | 폭/밀도/manual override 우선순위 구현 |
| CV1-X-CONCERT-VIEW | 실음/기보음 표시 전환 | MusicXML Compatibility | Expanded V1 transpose contract | 이조악기 총보 검토 불편 | pitch/App/XML/MIDI | 청감 | Todo | 저장음과 표시음 분리 및 key/input semantics 고정 |
| CV1-X-MIDI-INPUT | MIDI step/chord input | Editing Workflow | MuseScore input-by-duration; Expanded V1 | 장치 기반 입력 부재 | simulated MIDI/App | physical device | Todo | permission/device adapter와 안전한 note-on/off 처리 |
| CV1-X-PITCH-FIRST | pitch-first 입력 | Editing Workflow | MuseScore input-by-duration | 음높이 먼저 고르는 입력 부재 | state/App | keyboard ergonomics | Todo | pitch preview와 duration commit 상태 구현 |
| CV1-X-TEMPLATES-STYLES | 사용자 template/style | Document Lifecycle | Expanded V1 customization contract | 반복 편성/서식 재사용 불가 | App/import/export | 사용자 작업 확인 | Todo | native/schema 이후 저장/재사용/교환/초기화 구현 |
| CV1-X-COMMANDS-SHORTCUTS | 명령 검색/단축키 설정 | UI Information Architecture | Expanded V1 commands contract | 기능 탐색과 개인화 부족 | App/conflict tests | keyboard/IME | Partial | Global context-strip shortcut help exposes pitch movement, chromatic movement, octave movement, measure navigation and voice navigation from every work mode. Plain ↑/↓ edits selected-note pitch diatonically, Alt/Option+↑/↓ moves chromatically, Cmd/Ctrl+↑/↓ moves by octave, Tab/Shift+Tab moves by measure and Enter/Shift+Enter cycles voices. 2026-09-18 searchable command palette first slice opens from Cmd/Ctrl+K or the context strip, searches work-mode commands, independent palette commands, note duration commands, voice-switch commands, the new-score lifecycle command and shortcut reference entries, supports ↑/↓ active result movement plus Enter execution, can switch tabs, can switch the left palette category without changing the top work mode, can apply durations, can switch voices, can open the new-score dialog and can open shortcut help from a found shortcut row. 2026-09-25 remaps duration entry to `1=whole` through `7=64th` and adds the Electron new-window command plus first measure clipboard slice. 2026-09-27 keeps plain `1-7` as duration shortcuts even on selected notes while moving interval chord stacking to `Alt/Option+2-9` and `Alt/Option+Shift+2-9`; the latest tooltip slice removes inline toolbar badges, exposes shortcuts through hover titles and keeps the shortcut help keycap reference, including articulation shortcuts. 2026-09-28 follow-up removes the duplicate plain `0`/numpad `0` rest shortcut so rest conversion is `R`, while natural remains available as `N` and the legacy `Alt/Option+0` accidental alias. Another follow-up separates part navigation from same-staff voice navigation: `Enter`/`Shift+Enter` still cycles voices, while `Cmd/Ctrl+Alt+↓/↑` moves to the next/previous score part at the same measure/voice/tick when possible. Remaining: complete command inventory, user shortcut settings, conflict detection and reset. |
| CV1-X-WORKSPACE | 도킹/크기/배치 저장 | UI Information Architecture | Expanded V1 workspace contract | visibility 외 배치 조정 불가 | pointer/keyboard/visual | ergonomics | Partial | Context-strip grid expansion fixed (152px to 43px at 960); visible command headless regression. 2026-09-18 docked palette category buttons no longer change the top work mode, so palette browsing and task-mode switching are independent. 2026-09-27 toolbar access slice makes the work-mode tabs/context strip/active selection toolbar sticky, adds `작업 도구 접기/펼치기` and lets the inner File toolbar wrap in compact desktop; App, visual and E2E coverage show no document/context/text/toolbar overflow in the checked compact modes. 2026-09-28 follow-up removes the remaining horizontal clipping contract from the toolbar stack, active selection toolbar and workspace toolbar, lets inspector grids wrap internally and keeps horizontal auto overflow as a last-resort accessibility fallback when a control group is still wider than the viewport. 2026-10-08 follow-up changes inspector section separators from full-height borders to centered pseudo-element dividers controlled by `--toolbar-section-separator-height`. 2026-10-21 score-tab density follow-up adds a locally persisted disclosure for detailed `파트/보표` structure editing without changing the established expanded initial state or score/native contents; production Electron accepts either user preference before the existing part-view/export path. The same day, Export adds a separately persisted disclosure for margin/staff-size/system-spacing/margin-guide engraving controls while preserving the established expanded initial state. Dock headers now reuse the context-strip visibility setters, so either side panel can be closed in place without adding a parallel workspace state. 2026-10-22 finishes the first role split: only `악보 / 입력 / 표기 / 가사` remain as contextual editor tabs, while lifecycle/export/playback move to labelled quick surfaces; the contextual tabs support `←/→`, `Home`, and `End` through the existing workspace handler and preserve focus. Its focused App regression and 62 files / 848 tests (1 skipped) single-worker full suite pass; the default parallel runner's worker shutdown remains a runner-hygiene follow-up. The View menu now visually groups existing actions into workspace, dock sizing, workspace management, selection, and score/part mode without adding focus stops or a parallel workspace state. The same View menu now stores a `짧게 / 기본 / 길게` toolbar-divider height preference in local workspace state, verifies the 40px selection and 30px reset through production Electron, and never serializes this display setting into a score/native project. Remaining: broader dock placement/reset inventory, complete compact command access and actual compact-desktop manual QA. |
- 2026-10-22: palette/properties dock widths now persist as bounded local workspace
  preferences. View-menu commands, dock-header buttons, labelled keyboard separators,
  pointer dividers, and workspace reset reuse one state; score/native contents remain unchanged.
- 2026-10-22: local MuseScore 4 blank-score comparison changes the default left dock and
  workspace-reset palette from `음표` to `표기 객체`; the existing explicit duration-palette
  command remains available and score/native contents are unchanged.
- 2026-10-22: the default notation dock now exposes a non-mutating clef/key/time entry
  that opens the existing selected-measure workspace instead of duplicating its score command path.
  Its adjacent tempo entry reuses the same workspace and existing tempo handler.
- 2026-10-22: compact defaults now collapse docked selected-note articulation and ornament
  families while preserving user choices, reset behavior, symbol application, and score/native isolation.
- 2026-10-22: notation-palette primary symbol families now precede saved `즐겨찾기` and
  `최근 사용` shortcuts in the actual DOM, so visual, keyboard, and screen-reader order
  agree without changing the local-only shortcut persistence or notation command handlers.
- 2026-10-22: compact dock layout at 761–1200px now hides the desktop-only resize separators.
  The pointer guard uses the same 1200px boundary, preventing a visible but inactive divider at
  intermediate desktop widths; 960/1100/1400px production Electron coverage passes.
- 2026-10-22: at compact widths, context-strip secondary playback/filter values collapse into an
  accessible `보조 상태` summary with a disclosure for the full detailed group. Primary editing
  status remains visible; score/native contents and existing playback/filter state are unchanged.
| CV1-X-IMAGE-EXPORT | PNG/SVG 출력 | PDF / Page Setup | MuseScore File export | 악보 이미지 공유 불가 | render/pixel/disk | viewer QA | Todo | self-contained page/part/range capture 구현 |
| CV1-X-WORKFLOW-AUDIT | 확장 V1 실전 감사 | Same-Staff Multi-Voice | Expanded V1 audit contract | 큐 밖 누락 기능 방치 | fixtures/headless | 청감/engraving | Todo | 각 slice 후 Required 재감사, 새 누락은 별도 ID 등록 |

### Expanded V1 Discovered Subtasks (2026-09-13)

These are Required children of the expanded contracts, not optional research.

2026-09-14 children below were reproduced in the fresh worktree. Parent lifecycle,
workflow and span umbrellas remain Partial even when a bounded child is Done.

| ID | 문제명 | 카테고리 | Reference 근거 | 사용자 영향 | 자동화 가능 | 외부/수동 필요 | 상태 | 다음 action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CV1-X-NATIVE-AUTOSAVE-MIGRATION | legacy recovery rejected before migration | Document Lifecycle | MuseScore native opening/saving; parent CV1-X-NATIVE-LIFECYCLE | v1 recovery rejected and unreadable source overwritten | disk/schema/App/package | crash/native dialogs remain in parent | Done | v1/v2 source-preserving migration, retry, protected cleanup and late-discard guards pass; 625-test rerun and fresh v3 package UI/save/reopen pass. Retention/quarantine remains in parent. |
| CV1-X-PART-INITIAL-SELECTION | restored view targets hidden part | Parts / Part View | actual recovery screenshot; parent CV1-X-PART-LAYOUT | deleting after part-view open edits first score part | App/native/package | broad authoring remains in parent | Done | Part-aware initial selection, Piano open/recovery/delete/history/save and Cello packaged context pass. Scope is initial selection, not the whole part authoring contract. |
| CV1-X-RHYTHM-SPAN-CLEANUP | deleted endpoint prevents native save | Editing Workflow | failing rich Piano workflow; parent CV1-X-WORKFLOW-AUDIT | note-to-rest leaves invalid slur/octave endpoint | core/App/native/history | full editing audit remains in parent | Done | Rhythm transaction cleans invalid/consumed endpoints, preserves rest hairpins and other parts, undo/redo restores state; current full suite passes. Independent clipboard audit remains in parent. |
| CV1-X-BEAT-REST-GROUPING | duration edits hide beat structure in dotted rests | Editing Workflow / Engraving | User-reported 4/4 eighth-note release and commercial rest-grouping practice; parent CV1-X-WORKFLOW-AUDIT | off-beat duration edits produced double-dotted rests that obscure the beat | core rhythm-editing/App shortcuts | tuplet-local spelling and human engraving remain | Partial | Core rhythm edit/delete now splits ordinary released rest spans at beat and 4/4 half-bar / compound-meter group boundaries, e.g. eighth rest + quarter rest + half rest instead of a double-dotted half. 2026-10-07 follow-up lets a duration grow operation use measure-end trailing rests even when intervening notes/rests sit between the selected event and the trailing rest: later events shift right by the added duration and the final rest suffix shrinks, while growth still rejects when no trailing rest space exists. Focused core and editor duration tests pass. Next: tuplet-local rest spelling, beaming-aware grouping, renderer/PDF visual QA and broader meter policy. |
| CV1-X-PART-SPAN-GEOMETRY | independent part span placement | Parts / Part View | MuseScore Parts; parent CV1-X-SPAN-PROPERTIES | adjusting a part altered the full score | schema/App/Electron/disk/PDF | full engraving review | Done | Scoped overrides/reset/relink/history, XML primary-save warning, actual 960/1400/PDF and 629-test rerun pass. Per-system segment contracts remain in their separate child; parent is not Done. |
| CV1-X-STACKED-ANNOTATION-CLEARANCE | piano staff text and upper clef overlap | Layout / Engraving | reviewed rich Piano PDF; parent CV1-X-ENGRAVING | fixed 96px spacing ignores neighboring annotation ink | lane/layout/Electron/PDF | full engraving review | Done | Shared renderer/print staff extents, long-hairpin interior lanes and rich Piano ink/PDF checks, fresh macOS package and 629-test rerun pass. Extreme ledger/manual segment collision handling stays in parent. |
| CV1-X-SPAN-SEGMENT-GEOMETRY | per-system span geometry | Layout / Engraving | expanded V1 contract; parent CV1-X-SPAN-PROPERTIES | uniform offset cannot adjust one segment or separate part layout | schema/layout/App/real export | engraving review | Partial | Native v4 musical boundaries, segment edit/reset/inherit, independent part history, actual four-system/two-page disk/PDF and inactive status/cleanup/undo/reapplication pass. Boundary deletion/save/undo/reopen and ensemble insertion/reorder regressions pass. Finish current gates, deleted-span clipboard geometry ownership and denser geometry QA; broad engraving remains in parent. |
| CV1-X-RANGE-SPAN-COPY | contained span and segment ownership on paste | Editing Workflow | MuseScore copy-and-paste; parent CV1-X-OBJECT-CLIPBOARD | copied passage loses spans or retains source geometry anchors | core/App/native/XML | editing/engraving QA | Partial | Effective part object/null/inherit snapshots, omission feedback, source immutability, repeated cross-document IDs and octave conflict guards pass core/App/native/XML and actual renderer/disk QA. Broader cross-measure/partial-span policy remains Required. |
| CV1-X-SPAN-OBJECT-COPY | independent slur/hairpin clipboard | Editing Workflow | MuseScore copy-and-paste; parent CV1-X-OBJECT-CLIPBOARD | broader anchors and editing remain incomplete | core/App/native/XML/renderer | clipboard ergonomics and manual engraving | Partial | Automatic same-voice distance and explicit same-staff cross-voice destination selection preserve notes. Cross-voice sources now require explicit destination ends. Individual chord-notehead anchors, arbitrary tick/cross-staff and broader clipboard remain Required. See explicit-target/source children and current evidence. |
| CV1-X-SPAN-EXPLICIT-TARGETS | explicit start/end chord-event paste | Editing Workflow | Parent CV1-X-SPAN-OBJECT-COPY; MuseScore slurs-and-ties / copy-and-paste | valid target requires another voice or different duration | core/App/native/XML/renderer | pointer ergonomics and engraving | Done | Bounded explicit same-staff destination contract passes core/App/native/XML, renderer/disk harness, E2E and unchanged visual snapshots. Wrapped address readback fixes narrow dock clipping. Cross-voice source support is tracked in its own completed child; individual notehead/rhythmic anchors remain parent work. |
| CV1-X-TEXT-MARKING-CLIPBOARD | independent measure text filtering and reuse | Editing Workflow | Parents CV1-X-OBJECT-FILTERS / CV1-X-OBJECT-CLIPBOARD | list/multi-object selection remains | core/App/native/XML/renderer | selection ergonomics and human engraving | Partial | Four text filters, snapshot copy, type-only replacement/deletion and fresh IDs pass core/App/native/XML and renderer/disk tests. Staff/expression/rehearsal text support other staves; 2026-09-16 system text clipboard can target another part/staff and round-trip through MusicXML, and active-measure staff/system text choosers edit/delete one object without replacing neighbors. 2026-09-16 expression text chooser edits/deletes one same-measure/same-tick object while preserving neighboring expression texts through undo/native/MusicXML. Active-measure dynamics and chord symbols now also have stable-ID choosers so one same-measure or same-tick object can be edited/deleted without replacing neighbors. Selected chord/dynamic/text object copy/paste/delete now preserves target-measure neighbors through App workflows. 2026-09-18 adds bounded range-selection object filter copy/paste/delete for chord symbols, dynamics, staff text, system text, rehearsal marks, expression text and note lyrics, plus measure-selected and note-selected lyric copy/paste/delete. Range lyric paste now replaces the selected target range, clearing stale target lyrics where the source range has no lyric. Measure-selected lyric clipboard is voice-aware for same-staff multi-voice measures and preserves unrelated target voices when the copied measure only has lyrics in a subset of voices; note-selected, range and measure lyric clipboard are active-verse aware through the File-mode `가사 필터 절` selector, so copying/deleting verse 2 preserves verse 1 on source and target through undo/native/MusicXML evidence. Selected-note, range and measure articulation object copy/paste/delete now move only articulations while preserving notes, durations, lyrics and unrelated target voices through undo/native/MusicXML evidence. Selected-note, range and measure ornament, tremolo, grace-note, fermata and breath/caesura object copy/paste/delete now move only those note-attached markings while preserving notes, lyrics, articulations and unrelated target voices through native/MusicXML evidence. MusicXML grace-note export now writes voice/staff ownership so lower-staff and voice-2 grace notes reattach to the original target note on reopen. Visible chord/dynamic and text score objects can be clicked to select their stable object target; staff text and dynamics rendering now keeps multiple same-measure objects in separate lanes so each is visible and click-selectable. List selection, span object clipboard and broader object clipboard remain Required. |
| CV1-X-REHEARSAL-OBJECT-SELECTION | edit a specific rehearsal object without replacing its neighbors | Editing Workflow | Parents CV1-X-OBJECT-FILTERS / CV1-X-OBJECT-CLIPBOARD | bounded active-measure rehearsal chooser | App selection/edit/delete/history/native and Electron | manual usability review | Done | Stable-ID chooser, explicit new state, document-transition reset and undo-then-recreate pass. 700 tests and 28 Electron cases pass. Individual clipboard/range selection and other text types remain separate contracts. |
| CV1-X-GLOBAL-ANNOTATION-PROJECTION | show generic global anchors on rich multipart staves | Layout / Engraving | Parent CV1-X-XML-SCOPED-GLOBAL-TEXT; rich part fixture | generic measure-N anchors missed lane and draw maps | shared projection/lane tests and actual renderer | human PDF review is a separate release gate | Done | Bounded render projection passes tests and six actual renderer cases with three inspected PDFs. Source anchors remain unchanged. Global rehearsal edit/undo also passes score/part App and Electron workflows. Scope conversion and general object editing remain in parent. |
| CV1-X-PASSIVE-STAFF-ATTACHMENTS | keep note attachments visible in full score as in part view | Layout / Engraving | Parent CV1-X-WORKFLOW-AUDIT; global PDF comparison | full-score Piano omitted lyrics shown in its part view | actual full-score/part renderer and PDF; lyric selection | human engraving review | Partial | Shared drawing restores lyrics and tenuto in actual score/part/PDF checks; lyric edit/undo/native readback pass. 2026-09-16 App/native preview matrix covers lower-staff fermata, caesura, grace note, ornaments and tremolo ownership; follow-up NotationPreview SVG test confirms lower-staff fermata, caesura, tremolo, ornaments and grace markers retain the source event id in screen and print-layout renderer paths. 2026-09-23 staccato dots use notehead-relative placement instead of a fixed upper annotation lane. 2026-10-07 grace-note engraving follow-up replaces the temporary lowercase pitch-letter marker with SVG mini noteheads, stems, slash marks and multi-grace beams while preserving the existing event-id ownership marker. 2026-10-08 grace-note entry UX removes the `짧은` label and turns a selected rhythmic note into a non-rhythmic grace note attached to the following main note, carrying the selected duration into the grace-note model/XML. `verify:passive-attachments-pdf` adds bounded Electron `printToPDF` file smoke, native readback and same-note marker overlap checks for those lower-staff markers. Broader fixture matrix, full grace-note engraving QA and human engraving review remain Required. |
| CV1-X-EXPRESSION-TEXT-TICKS | preserve imported expression text musical position | MusicXML Compatibility | Parent CV1-X-TEXT-MARKING-CLIPBOARD; ordered direction tick index | raw offset ignored divisions and preceding cursor | signed-offset/divisions/lower-staff/native/App preview/Electron PDF tests | imported-position external app review | Partial | Parser uses indexed direction ticks. 2026-09-16 adds lower-staff backup timing with inherited divisions, MusicXML round-trip, native round-trip and App preview ownership/tick evidence. `verify:expression-text-pdf` now checks actual screen and PDF print-layout DOM x-position for lower-staff expression text at tick 1.5 quarters, writes a real Electron PDF and verifies native readback. External-app visual comparison and broader list/range text selection remain Required. |
| CV1-X-XML-SCOPED-GLOBAL-TEXT | preserve non-primary system/rehearsal annotations | MusicXML Compatibility | Parent CV1-X-PART-XML; text clipboard cross-part regression | explicit scope editing and arbitrary tick identity remain | multi-part/grand-staff XML/native/renderer | external-app fidelity | Partial | Scoped rehearsal child preserves concrete measure anchors and lower-staff XML. 2026-09-16 concrete lower-staff system text exports with local `system="none"` plus Chromatics system-text marker and reopens without merging identical text objects; same-measure system text chooser preserves neighboring objects. 2026-09-18 App workflow prevents deleting a part from promoting its concrete local system text to a global `measure-N` system text, while preserving true global system text and undoing back to the original local object. Global import aggregation is not full explicit scope support. |
| CV1-X-XML-SCOPED-REHEARSAL | preserve local rehearsal marks on another staff | MusicXML Compatibility | Parent CV1-X-XML-SCOPED-GLOBAL-TEXT; concrete measure IDs | bounded concrete measure-ID ownership contract | XML/native/clipboard/lane tests and Electron disk workflow | external-app and human engraving remain separate gates | Done | system=none plus staff number preserves local ownership; only-top preserves generic global marks. Multiple rehearsal lanes, lower-staff selection, cross-staff paste, part-view filtering, edit preservation and part removal/undo pass. Actual 960/1400 renderer/native/XML workflow passes. Explicit scope UI, arbitrary tick identity and system text remain in parent. |
| CV1-X-XML-TEMPO-DUPLICATION | readable tempo in external notation apps | MusicXML Compatibility | Parent CV1-X-WORKFLOW-AUDIT; MuseScore CLI PDF observation | broader generated labels and custom display policy remain | serializer/parser/actual MuseScore PDF | custom tempo text fidelity | Partial | Exact generated quarter/eighth labels export once as a visible metronome; custom words preserved in separate direction-type. Five new tests and actual PDF visual check pass. MuseScore exits 134 after writing PDF on two attempts, so CLI gate remains failed. Dotted/other-unit labels and custom display choices remain Required. |
| CV1-X-SPAN-CROSS-VOICE-SOURCE | reuse a span joining voices on one staff | Editing Workflow | Parent CV1-X-SPAN-OBJECT-COPY; explicit endpoint selectors | explicit source-to-target contract completed; broader anchors separate | core/component/Electron/native/XML | dense-span engraving remains parent work | Done | Copy snapshot records explicit-end requirement; automatic paste rejects even with a timed candidate. Core/component, 26-case renderer/disk, full 696-test suite and unchanged visual baseline pass. Cross-staff and chord-notehead anchors remain separate Required contracts; parent remains Partial. |
| CV1-X-XML-SYSTEM-RELATION | standard system text attribute | MusicXML Compatibility | Parent CV1-X-XML-SCOPED-GLOBAL-TEXT; W3C MusicXML 4.0 system-relation | also-top placement and explicit ownership UI remain | MusicXML unit/fixture/native | external-app visual behavior | Partial | only-top reads/writes; legacy yes reads remain compatible; generic none stays staff-local, while Chromatics-authored bold local system text reopens as `systemTexts`; also-top extra-placement loss warns. Standard-attribute checkpoint passed 686 tests and macOS package smoke. Later all-part import, tempo and 2026-09-16 scoped system text changes have separate current evidence. |
| CV1-X-SPAN-PAIR-COLLISIONS | overlapping independent hairpin layout | Layout / Engraving | Parent CV1-X-ENGRAVING; explicit-target renderer QA | overlapping source and pasted hairpins share a lane and intersect in 1400px fixture | layout/renderer/PDF | human engraving | Partial | 2026-09-28 first slice reproduces same-staff overlapping automatic hairpins and reserves separate lower lanes per staff/system/x-range, while leaving manually engraved hairpins under explicit geometry control. Focused renderer, broader renderer/layout tests, typecheck, visual regression, full suite and package smoke pass before alpha.21 prep. PR #777 merged and `v0.1.0-alpha.21` was published as an unsigned prerelease; site manifest updated to the alpha.21 release. Remaining: explicit-target clipboard fixture, PDF visual QA, adjacent dynamic/expression lane audit and manual engraving review. |
| CV1-X-SLUR-DENSE-CLEARANCE | dense slur/note collision and responsive crowding | Layout / Engraving | User screenshots of dense piano/Melody systems; parent CV1-X-ENGRAVING | short slurs can look flat or compete with notes/annotations, and tuplets/accidentals can crowd measure widths | layout/renderer/unit; Electron once runtime is healthy | visual/PDF engraving review | Partial | 2026-09-27 first slice increases short-slur curve depth, exposes slur curve metrics for regression tests, and adds tuplet/accidental width weight so responsive layout wraps ornate measures sooner. 2026-10-20 automatic slur endpoints now reserve the actual same-side articulation stack, preventing lower staccato dots from touching either endpoint; manual span geometry intentionally retains its user-defined anchors. 2026-10-21 mixed-stem automatic slurs compare the articulation clearance at both endpoints and choose the clearer side, while equal-clearance pairs retain the established start-stem direction. 2026-10-22 automatic endpoints also reserve the rendered VexFlow tuplet bracket/number lane, so a shared bracketed triplet no longer intersects an upper slur; manual geometry remains authoritative. Focused passive-attachment tests pass; production visual/PDF review and broader tuplet/accidental combinations remain. |
| CV1-X-VOLTA-AUTO-SPAN-DISPLAY | long inferred volta line overdraw | Layout / Engraving | MuseScore Studio Handbook Voltas / Repeat signs, user long-ending screenshot; parent CV1-X-ENGRAVING | first ending line stretches across every system until the next repeat, obscuring the score as if the whole passage were one displayed ending | renderer/unit/App/native/Electron | visual/PDF engraving review | Partial | Automatic spans still shorten after 3 measures. 2026-10-23 adds an explicit visual end-measure selector, auto reset, native validation, deletion/undo and part reference projection without changing repeat playback. Actual menus, 960/1400, native reopen and full-score/part PDF pass. XML preserves repeat semantics and warns about native-only display extent. Remaining: manual vertical/segment geometry, continuation refinements, dense spacing and external/listening QA. |
| CV1-X-RANGE-PASTE-MARKING-SAFETY | range paste drops markings and leaves dead span anchors | Editing Workflow | MuseScore copy-and-paste; parents CV1-X-WORKFLOW-AUDIT / CV1-X-OBJECT-CLIPBOARD | pasted notes lose attached markings and native save can reject deleted target endpoints | core/App/native/history | clipboard ergonomics | Partial | Current code audit found minimal pitch-duration clone and raw voice replacement. Reproduce deep-clone loss and dangling span anchors, fix one history transaction, verify target selection and native save/undo. Independent object clipboard and source span replication remain separate Required contracts. |
| CV1-X-XML-OCTAVE-PITCH | octave-shift XML 음높이 의미 | MusicXML Compatibility | W3C MusicXML octave-shift; parent CV1-X-PART-XML | XML up/down and performed pitches differ from internal display-pitch convention | XML/MIDI/pitch fixture | external app comparison | Partial | Four octave types now use standard direction and performed pitch; stop at end-note duration, chord/native/MIDI/lower-staff instrument transpose tests pass. Remaining: legacy ambiguous XML recovery, rest/interior-tick/cross-staff anchors, 22 shifts, held notes/ties across boundaries, overlap and real external GUI comparison. |
| CV1-X-SPAN-RHYTHMIC-ANCHORS | 음표 외 span endpoint | Editing Workflow | MuseScore Dynamics and hairpins; parent CV1-X-SPAN-PROPERTIES | interior-duration/end-of-measure positions cannot be preserved as event IDs alone | model/native/XML/layout/Electron | engraving QA | Partial | Rest-event hairpin input/undo/redo/native/XML/renderer and voice-scoped playback implemented. Add portable arbitrary-tick anchors, exact stop time and cross-staff spans; unsupported positions still reject. |
| CV1-X-HAIRPIN-REPEAT-VELOCITY | 반복 구간 헤어핀 재생 | Playback | Rest-anchor audit; parent CV1-X-WORKFLOW-AUDIT | bare event ID lookup applies velocity only to first repeated occurrence | timeline/XML regression | listening | Partial | Three-pass note/rest hairpin regression fixed with per-start occurrence pairing and part/staff/voice scope. Cross-ending/missing-stop traversal policy and listening remain open. |
| CV1-X-PLAYBACK-FROM-SELECTION | 선택 위치부터 재생 시작 | Playback / Mixer | User report that playback needs to start from the middle of the score; parent CV1-X-WORKFLOW-AUDIT | transport play always resumed from the current playback beat/start, so selecting a note did not let the user audition from that location | timeline/App transport tests | repeat-pass UX policy and listening | Partial | 2026-10-13 first slice adds selected-event start beat lookup on the playback timeline and routes transport play, Space and command-palette playback start through the selected note/rest when one is focused. Follow-up preserves source event start beats inside merged tie playback events, so selecting a tied continuation starts playback at the continuation beat rather than falling back to the old cursor. 2026-10-21 repeat expansion now offsets those source starts to the active pass before tie merging; first and second volta endings produce separate sustained notes instead of a stray stop event. Remaining: explicit UI wording for "play from selection", repeat/volta pass choice policy and actual listening QA. |
| CV1-X-HAIRPIN-DENSE-CLEARANCE | 낮은 음역 헤어핀과 하단 표기 간격 | Layout / Engraving | Actual rest-hairpin 960/1400 screenshots; parent CV1-X-ENGRAVING | stem clearance must also reserve system height and adjacent annotation lanes | layout/Electron image | engraving/PDF | Partial | Stem/wedge contact reproduced (-9px). Actual stem-aware offset added; finish extreme ledger, expression-lane and multi-system height audit. |
| CV1-X-PART-LAYOUT-STRUCTURE | 파트 조판 anchor와 구조 편집 | Parts / Part View | Expanded V1 linked part contract | deleting a measure left saved break anchors dangling | App/native/layout | full score authoring | Partial | Reorder/removal/global direction retention and re-add isolation tested. Equal-length removed-staff breaks remap within the owning part; score/native layouts undo together. Actual earlier packaged XML contains independent title/page break. 2026-09-28 renderer follow-up treats piano/grand-staff parts as one visible system group: the part label is rendered once at the system start, lower staves no longer show generated `Staff 2` labels and multi-staff parts receive a left brace. Next: unequal-staff policy, page-setting interchange, conflicting external layouts and complete linked-score authoring verification |
| CV1-X-PICKUP-DURATION-UX | 못갖춘마디 세분화 입력 | Editing Workflow | User report that beat-count selector cannot express smaller upbeat durations; parent CV1-X-SCORE-MEASURE-STRUCTURE | wizard allowed only whole beat pickups such as quarter-note counts, blocking eighth/sixteenth anacruses | App/new-score/native/MusicXML | external-app visual check | Partial | 2026-09-28 wizard setup now accepts pickup length as unit + count, preserving legacy `pickupMeasureBeats` while adding `pickupMeasureTicks`. Focused App/new-score coverage creates a 3x16th pickup, verifies MusicXML reopen timing, saves it as a native project, reopens the same native contents through `window.inC.project.open`, and re-saves with the pickup timing preserved. The selected-measure notation panel now exposes the same unit/count editor, applies one undoable score-wide update to every part/staff at the selected measure index, preserves full-measure placeholder rests, rejects content that would overflow the new duration, supports undo/redo, round-trips MusicXML timing, and can reset the measure to regular with count 0. 2026-10-08 wizard polish groups the pickup unit/count controls under one `못갖춘마디` fieldset so the selector and count input read as one setting. Remaining: external-app visual display check and broader real-content pickup authoring QA. |
| CV1-X-INLINE-CLEF-CHANGE | 악보 중간 음자리표 변경 | Editing Workflow / MusicXML Compatibility | User report that changing clef in the middle of the score did not appear to apply; parent CV1-X-SCORE-MEASURE-STRUCTURE | event-level clef changes could not be attached before a selected note/rest, so piano passages needing temporary bass/treble changes required measure-wide workarounds | App/native/MusicXML/renderer | external-app reopen and engraving QA | Partial | 2026-09-28 first slice adds a selected-event `음표 앞 음자리표` property, stores `clefBefore` on notes/rests, preserves it in native projects, renders an inline clef marker before the event on primary and passive staves, and exports a MusicXML inline `<attributes><clef>` before the event. The follow-up imports/reopens those mid-measure clef attributes by attaching them to the next rhythmic event while preserving inherited staff-count/divisions behavior for multi-staff parts. Inline clefs now also contribute measure width and spacing weight so dense passages wrap before clef glyphs crowd noteheads/barlines. 2026-10-08 UX follow-up keeps the selected-event inline clef path and makes the selected-measure clef label explicit in the notation-object properties. Focused App, renderer/layout and MusicXML round-trip tests pass. Remaining: external notation app visual QA, command discoverability for measure-scoped settings and finer collision polishing around extreme dense inline-clef passages. |
| CV1-X-MEASURE-SCOPED-SETTINGS-UX | 마디 기준 조표/박자/음자리표 설정 UX | Editing Workflow / UI Information Architecture | User report that it is unclear how to change clef/time/key at a specific measure or from a selected measure | score-wide labels made measure-scoped controls look like global setup, so users could not tell whether they were changing the whole score, one bar or later bars | App/renderer/CSS | full workflow review | Partial | 2026-10-08 first slice renames the context-strip controls to `선택 마디부터 조표` and `선택 마디 박자표`, keeps `선택 마디 음자리표` visible in notation-object properties, and normalizes the chord-symbol target output styling so mixed-size toolbar text no longer looks broken. Follow-up moves the same 조표/박자표 command paths into `표기 객체 > 마디 설정` beside measure clef and pickup controls, adds a compact `마디 설정 적용 범위` state, and keeps incompatible meter changes on the existing validation/error path. 2026-10-20 expands the shared new-score and selected-measure preset source to all 15 standard major/minor sharp and flat key signatures (`-7..+7` fifths), including E major (♯ 4개); the existing renderer already supports that full fifths range. Remaining: event-level inline clef copy polish, command-palette wording, a fuller side-properties model, and real user-flow QA. |
| CV1-X-NOTATION-PALETTE-IA | 표기 객체 메뉴 정보구조 | UI Information Architecture | User report that the notation menu feels unstructured; MuseScore palette/properties reference | line/span, text, dynamics, repeat and measure settings were mixed into one long toolbar row, making commands hard to scan and causing wide empty space | App/CSS/focused tests | visual and usability review | Partial | 2026-10-08 first IA slice reorganizes the notation-object toolbar into MuseScore-style families: `라인/범위`, grouped `마디 표기` clusters for rehearsal marks, text, dynamics and measure settings, plus compact repeat/volta controls. The first search slice adds a `기호 검색` filter to the notation toolbar, narrowing line/span, text, dynamics, measure-setting and repeat groups without changing command handlers. Visual regression was updated after inspecting the intended system-label gutter shift and now passes at 960px/1400px. MuseScore Studio 4 was launched locally; its left `팔레트 / 레이아웃 / 속성` split and collapsible symbol-family palettes informed the next slice. Chromatics notation sections can now collapse/expand, while active searches automatically reopen matching sections. 2026-10-20 adds an `음표 기호` family for selected-note articulation, ornament, tremolo, fermata/breath and guarded grace conversion; it delegates to the existing undoable note-marking commands instead of duplicating the score model. Palette family collapse state now persists locally across app remounts, deliberately outside native score projects; icon actions provide one-step collapse/expand, optional `하나씩 보기` retains a single expanded family, and the four primary families (`라인/범위`, `음표 기호`, `마디 표기`, `반복/볼타`) can be re-ordered and restored locally. Search temporarily overrides and locks workspace controls so matching results remain visible. A local `최근 사용` section records/reapplies up to six selected-note notation commands, while each source symbol can be independently pinned to `즐겨찾기`; both local workspace strips remain outside score/native contents and are filtered during search. `npm run verify:mvp` exercises direct source pinning plus populated recent/favorite items in the packaged Electron renderer at 960px/1400px and confirms no horizontal escape. 2026-10-22 extends the desktop-menu migration: an independent `파일 / 편집 / 보기 / 추가 / 형식 / 도구 / 도움말` menubar reuses lifecycle, selection, dock, palette and layout handlers; only `악보 / 입력 / 표기 / 가사` remain as contextual editor tabs, while file/export/playback use labelled quick surfaces. The next compact-density slice changes only default workspace presentation: `라인/범위` stays open, while dense selected-note symbols and repeat/volta start collapsed; measure-level clef/key/time/text/dynamic controls remain open for direct editing. Missing saved preference keys now receive that default while explicit prior choices survive; search still reveals matching controls. Global menu triggers now identify their popup and the score/part view radios expose both checked states, while reusing the same view handler. Remaining: human compact-desktop review, measure scope selector and broader menu inventory. |
| CV1-X-SYSTEM-LEADING-SYMBOLS | 시스템 시작 파트명/박자표 반복 억제 | Layout / Engraving | User report that every row repeated the part name and 4/4 meter; parent CV1-X-ENGRAVING | unchanged time signatures and part labels repeated at every system, making simple scores look unlike common notation practice | renderer/layout/App | visual/PDF engraving review | Done | 2026-10-08 renderer/layout slice keeps clef/key signatures at system starts, but shows time signatures only at the first measure or actual meter changes. System part labels now draw only on the first system while grand-staff braces remain on every system. Follow-up reserves a left system gutter, moves labels/braces outside the staff, and disables brace fill so added staves no longer produce black filled brace artifacts over clefs. Focused layout, renderer and pickup wizard App tests pass. |
| CV1-X-GRACE-NOTE-ENTRY-UX | 선택 음표 기반 꾸밈음 입력 | Editing Workflow / Engraving | User screenshot of a floating grace glyph after pressing `짧은 꾸밈음`; parent CV1-X-PASSIVE-STAFF-ATTACHMENTS | button added a decorative mini-note to the selected note instead of converting the selected rhythmic note into a non-rhythmic grace note | App/MusicXML/native/schema/renderer | broader tuplets/ties/manual engraving QA | Done | 2026-10-08 slice renames the button to `꾸밈음`, removes the pressed-toggle behavior, converts the selected same-measure note into a grace note on the following main note, shifts later events left, fills the measure tail with an equivalent rest, stores optional grace-note duration in native schema, and round-trips grace-note duration through MusicXML. Focused App, MusicXML and renderer marker tests pass. Current guarded scope rejects tuplet voices, tied notes and chord notes instead of silently corrupting rhythm. |
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
| CV1-MULTIVOICE-GRAND-STAFF-WORKFLOW | Same-staff multi-voice 실전 workflow 완성 | Same-Staff Multi-Voice | MuseScore/Dorico multiple voices, Finale layer-style entry | 피아노/합창 악보에서 voice별 rest/stem/selection/export 신뢰가 부족하다. | 자동 회귀는 현재 가능 범위 완료 | 복잡한 PDF engraving과 SATB/piano 실제 작성 QA는 수동 확인 필요 | Manual QA required | voice별 selection/range/delete/copy/paste/playback/MusicXML 기본 회귀와 filtered copy/paste 회귀는 자동화되었다. 2026-09-28 follow-up prunes automatically-created empty auxiliary voices when returning to voice 1, while preserving voice 2 if it contains actual note content. RC 전 SATB 또는 piano grand staff 실제 악보를 작성해 rest/stem/engraving/PDF 시각 결과를 manual QA에 기록한다. |
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
| CV1-PROPERTIES-TEXT-HARMONY | 선택 객체 속성 편집 | UI Information Architecture | MuseScore Properties; Required UX matrix | 코드/텍스트 수정에 작업 mode 전환이 필요함 | App 입력/undo/context 회귀 | 화면 밀도 최종 수동 QA | Done | MS-PROPERTIES-002: harmony와 rehearsal/staff/system/expression text의 선택 문맥 편집/취소/undo/XML 검증. 2026-10-20 follow-up exposes the selected note's tie relation as `연결 없음`, `앞 음에서 연결`, `다음 음으로 연결`, `앞·뒤 음 연결` and reuses the existing tie command for direct add/remove from note properties; a valid cross-measure tie toggles off and back on in App coverage. 실제 밀도 평가는 별도. |

Each linked parity row records current state, gap, implementation slice and test
strategy. `In progress` is a valid live queue state; a schema pass is not release
signoff or evidence that unregistered Required gaps do not exist.

2026-10-21 상단 IA follow-up에서 `문서`, `출력`, `재생`은 더 이상 편집 category가
아니다. 전역 `파일` 메뉴와 icon-only `파일 빠른 작업`이 native/MusicXML lifecycle 및
selection edit/filter의 기존 command path를 공유하고, PDF/MIDI/MusicXML은 별도
`내보내기 작업`, transport와 mixer는 `재생 도구`로 이관됐다. 편집 category는
`악보 / 입력 / 표기 / 가사`만 남는다. 재생 surface는 transport를 기본으로 두고
속성 도크는 실제 편집 가능한 셈여림/텍스트 control을 먼저 노출하고, 대상·위치·음높이·
타이·음가 같은 읽기 전용 selection metadata는 접힌 `선택 정보`로 분리한다. 이 구조는
score/native data나 기존 property edit handler를 바꾸지 않는다.
`믹서 표시` 뒤에 part mixer를 접어 기본 밀도를 낮췄다. 다음 우선순위는 persistent
compact transport의 필요성 판단, multi-part mixer 행 밀도, context strip의 실제
compact desktop 수동 밀도 확인이다. 파일/내보내기/재생 icon은 `빠른 작업` group으로
분리되어 편집 category와 시각적·접근성 경계를 가진다. `파일` 메뉴도 동일 export
surface를 여는 entry point를 제공한다. `보기` 메뉴의 `작업 도구` checkbox는 context
strip의 collapse state와 같은 workspace state를 사용하므로, 깊은 편집 도구 행을
메뉴에서도 숨기거나 다시 펼칠 수 있다. 이 동작은 score/native project data를 변경하지
않으며 display options를 연속으로 조절할 때 menu를 유지한다. `보기 > 선택 필터 열기`는
기존 파일 quick surface와 filter select로 focus를 보내 선택 범위 편집 전의 filter
설정을 직접 찾을 수 있게 한다.

초기의 context strip `보조 상태` 분리/disclosure 정책은 2026-10-22 quick-row 통합으로
대체했다. 별도 상단 상태 행을 제거하고, 도크 표시/도구 접기/검색/도움말 버튼은 같은
quick row에 배치한다. 하단 상태바는 입력 모드·대상과 활성 필터/범위 개수를 표시한다.
기본 `필터 전체`와 선택 탭 이름의 중복 chip은 생략하며 기존 playback/filter handler는 유지한다.
좌측 `표기 객체` 팔레트는 기존 셈여림뿐 아니라 selected-note 아티큘레이션과 장식음을
같은 기존 command path로 적용한다. `tr/mord./turn` 기호는 한국어 accessible name을
제공하며, 팔레트 선택은 상단 편집 mode와 독립이라는 workspace 계약을 그대로 유지한다.
초기에 두었던 좌측 `음표 / 가사 / 악보` 탭은 2026-10-22 notation-only 정리에서 제거했다.
음가, 가사/코드, 악보/마디 설정은 기존 상단 도구와 메뉴에서 계속 접근한다.
고정 표기 도크의 셈여림·아티큘레이션·장식음 family는 각각 독립 collapse와 local workspace
저장을 제공해 compact desktop에서 필요한 기호만 남길 수 있고, score/native contents나
기존 selected-note command path는 바꾸지 않는다.
기본으로 열린 마디 표기 family도 같은 collapse/persistence 계약을 적용해, clef/key/time과
tempo entry의 discoverability를 유지하면서 compact desktop에서는 사용자가 직접 접을 수 있다.
마디 설정 entry는 기존 선택 마디 조표 select로, 빠르기 entry는 기존 global tempo slider로
focus를 넘겨 palette에서 작업대를 연 뒤 keyboard flow가 body에 끊기지 않게 한다.
960px~1100px의 top palette symbol grid는 짧은 셈여림 기호를 full-width ribbon으로 늘리지
않고 content-sized cluster로 배치해, 필요한 표기 family만 compact하게 읽을 수 있게 한다.
`악보` workspace의 global tempo controls는 default collapsed summary로 시작하고 local
preference를 보존한다. 표기 팔레트의 빠르기 entry는 section을 열어 기존 slider에 focus한다.
로컬 MuseScore Studio 4의 빈 악보 화면은 시스템 메뉴와 in-window `홈 / 악보 / 게시`
workspace, 얇은 기호 row, 팔레트/레이아웃/속성 dock을 분리한다. 이 reference에 맞춰
Chromatics는 redundant `편집 도구` label을 제거하고 File/Export/Playback quick action과
contextual editor tab 사이의 separator를 22px(1080px 이하 18px)로 제한했다.
`보기 > 작업공간 기본값으로 재설정`은 score/native contents에 영향을 주지 않고 local dock,
toolbar, notation palette workspace 상태를 초기화해 compact desktop에서 예측 가능한 복귀점을
제공한다. 긴 File/View menu는 group label로 lifecycle/exchange와 workspace/dock/view-mode
action을 구분하지만, focusable command 순서나 기존 command handler는 바꾸지 않는다.

2026-10-22 악보 contextual toolbar의 `파트/보표` 구조 편집은 새 workspace에서 기본 접힘으로
시작한다. 빠르기도 기본 접힘으로 현재 BPM을 요약하며, 팔레트에서 진입하면 펼쳐서 slider에
focus한다. 각 disclosure 상태는 local workspace preference에 보존한다. 파트·보표 추가/삭제/순서, 이조, native/MusicXML 저장은
기존 command path와 undo contract를 유지한다. compact desktop의 실제 작업 밀도는 수동 QA로
계속 확인한다.

2026-10-22 마디 표기 팔레트 entry의 `마디 시작 음자리표`는 악보 작업대에서 직접 접근한다.
마디 또는 단일 음표 선택을 대상으로 기존 command/history를 재사용한다. 해당 마디만 변경하고
선택 음표를 유지하는 회귀 테스트와 960/1100/1400px Electron containment 검증이 통과했다.
`속성 도크 > 음표 > 음표 앞 음자리표`의 inline clef와는 적용 위치가 구분된다.
후속 검증은 피아노 아래 보표와 quartet 마지막 파트의 native save/open까지 포함한다.
도크의 긴 마디 설정 entry는 전체 폭의 텍스트 행으로 정리해 1400px의 과도한 줄바꿈을
줄였다. 초기 tempo 접힘은 960/1100px에서 toolbar 48px, 펼침 116px로 측정했고,
1400px에서는 둘 다 한 줄 48px이다. 실제 MuseScore 빈 악보와 비교하면 상단 행 수와
기호 팔레트 breadth는 여전히 후속 IA 작업이다. status bar는 후속 slice에서 하단으로 옮겼다.
이 UI/native checkpoint는 global 866 tests PASS / 1 skipped, visual regression PASS다.
이후 test-only shared tuplet/slur fixture의 음가와 tick 불일치를 수정했고 rhythm guard와
renderer 19 tests가 통과했다. 내부 tuplet/accidental 조합 및 PDF/manual 조판 QA는 남아 있다.

2026-10-22 하단 편집 상태바는 기존 재생/저장 상태를 재사용하고 긴 저장 오류를 줄바꿈한다.
상태바 위치와 저장 실패/재시도는 failure-first App test로 보호한다. production Electron에서
960/1400px 기본 높이 32px, 긴 오류 60.5px, 마지막 음표와 비겹침, 인쇄 숨김을 확인했다.
이 시점 전체 Vitest 867 passed / 1 skipped와 production verifier가 통과했다.
후속 명령 검색 audit에서는 숨긴 팔레트를 `열기`로 요청해도 표시되지 않는 문제를 수정했다.
기존 visibility와 category state를 함께 갱신하고 해당 범주로 focus한다. 네 범주 App 회귀와
960/1100/1400px production palette verifier가 통과했다. 867개 전체 suite는 이 후속 수정 전 기준이다.
같은 audit에서 `탭 열기`가 접힌 toolbar를 펼치지 않는 문제도 네 범주에 재현했다.
기존 workspace 열기 handler로 통합해 quick surface를 닫고 실제 toolbar를 표시한다.
focused 20 tests, build/typecheck, production palette verifier가 통과했다. 이 checkpoint의
전체 suite는 875 passed / 1 skipped다. 이후 상태바 키보드 스크롤 보호는 별도 검증한다.
상태바 focus에서 방향키와 Tab이 악보 편집으로 전달되던 문제는 failure-first 회귀로
막았고 focused 11 tests, build/typecheck, 960/1400px production 검증이 통과했다.
전체 875개 checkpoint에는 이 마지막 guard가 포함되지 않는다. compact 초기 캡처의
상단 팔레트 높이와 범주 탐색 중복은 남아 있으므로 다음 IA 작업으로 유지한다.

2026-10-22 후속 구조 정리에서 고정 팔레트의 네 작업 범주와 중복 음가/가사/악보 surface를
제거했다. 기존 상단 작업 도구와 메뉴는 그대로이며, 팔레트는 표기 요소 전용이다.
Add/명령 검색의 팔레트 열기는 도크만 열고 focus한다. 기존 toolbar를 불필요하게 펼치지
않으며 selection/history는 유지한다. 이전 네 범주 팔레트 열기 계약은 이 정책으로 대체한다.
focused 44 tests, build/typecheck, full production verifier와 global 874 tests / 1 skipped가
통과했다. 네 중복 범주 opener 테스트를 하나의 실제 notation opener로 바꾸고 구조 회귀를
추가한 결과다. 이후 compact sidebar CSS는 별도로 검증한다.

761–1200px의 팔레트와 속성은 236px 좌측 열에 세로 배치한다. 악보는 오른쪽에서 같은 높이로
시작하므로 960px 초기 score top은 455px에서 214px로 올라왔다. 1400px 좌우 도크와 desktop
폭 preference는 그대로다. compact에서는 적용되지 않는 폭 +/-와 grip을 숨긴다. focused
Electron/캡처 검증, 도크 표시 네 조합을 포함한 full production verifier, 최신 global suite
(874 tests PASS / 1 skipped)가 통과했다. visual regression도 baseline 변경 없이 통과했다.
이 checkpoint 뒤 clef 기호 타일은 아래 후속 slice에서 추가했다. 상단 편집 범주,
key/time 기호 타일과 MuseScore의 tabbed dock과의 차이는 남아 있다.

2026-10-22 마디 표기 도크에 VexFlow 기반 높은/낮은/알토/테너 음자리표 타일을 추가했다.
기존 `changeClef`로 선택 마디 시작에 적용하며 inline clef 명령은 바꾸지 않는다.
단일 대상이 없는 음표 범위에서는 disabled이고, plain Tab/Enter/Space가 전역 음표 단축키로
전달되지 않는다. focused 10 tests에 selection/history, 피아노 아래 보표와 quartet 마지막
파트 native save/reopen이 포함된다. build/typecheck 및 960/1100/1400px production palette
검증에서 실제 glyph/font, 타일 containment, Enter 적용/undo, family 접힘이 통과했다.
960px score top은 214px를 유지한다. 이 타일은 클릭/키보드 적용이며 drag/drop은 미구현이다.
최신 전체 Vitest는 63 files / 882 tests PASS, 각각 1 skipped이며 full production Electron과
visual regression도 통과했다. 기호 타일 추가가 상단 contextual 행의 IA까지 해결한 것은 아니다.

후속 상단 상태 행 통합은 failure-first 구조/키보드 회귀와 focused 25 tests로 검증했다.
build/typecheck PASS, production 960/1100/1400px에서 workspace 버튼 다섯 개를 포함한
quick row 높이 42px와 score top 171px를 확인했다. 이전 214px보다 43px를 확보했으며,
default 필터를 숨겨도 활성 필터는 계속 하단에서 읽을 수 있다. 하단 상태/긴 오류 메시지와
전체 suite의 broad 검증은 evidence log의 최신 checkpoint를 기준으로 한다.
full production Electron은 하단 상태바 기본 32px/긴 오류 60.5px, 마지막 음표 비겹침,
인쇄 숨김을 확인했다. Visual regression도 baseline 갱신 없이 통과했다. 상태바 음가는
선택 음표 또는 입력 커서의 현재 값으로 표시해 음가 toolbar와 일치한다.
그 뒤 global native save 회귀에서 새 프로젝트 open 후 초기 악보가 저장되는 실패가 발견됐다.
이전 렌더 keyboard listener를 유지한 adversarial test로 stale snapshot을 재현했다.
저장 시 score/settings/part view/tuplet guard를 기존 `currentNativeContext`에서 함께 읽도록
수정했고 관련 18 tests가 통과했다. 원래 간헐 실패의 scheduling을 확정했다고 주장하지 않으며,
최종 전체 검증은 evidence log의 후속 native snapshot 항목에 기록한다.
수정 후 전체 suite는 63 files / 884 tests PASS, 각각 1 skipped다. rebuild/typecheck와
full production Electron도 통과했으며 커밋·릴리즈는 하지 않았다.

후속 역할 분리에서 `입력` toolbar의 선택 event 세부 속성을 속성 도크로 이동했다.
기존 상단 기본 접힘 정책을 대체한다. 성부·입력 보표와 quick 음가 입력은 유지하고,
선택한 음표/쉼표의 음가·inline clef·임시표·아티큘레이션·타이·장식음 등은 도크에서 편집한다.
도크는 기본 펼침이며 `chromatics.event-properties-sections.v1` local preference만 저장한다.
이전 toolbar의 접힘 preference를 새 도크 기본 상태로 가져오지 않는다. 범위/span 선택과
음표 입력 중에는 단일 이벤트 속성을 숨긴다. 기존 command/history와 score/native 모델은
그대로다. focused 18 tests, build/typecheck와 960/1400px production control containment,
끝 control scroll 접근 검증이 통과했다. compact tabbed inspector와 독립 스크롤은 후속이다.
최신 전체 suite는 885 tests PASS / 1 skipped이며 full production Electron과 visual
regression도 통과했다. 최소 180px 도크의 줄바꿈과 스크롤 접근도 추가 검증했다.
이후 선택한 슬러/헤어핀은 상단 작업 탭을 바꿔도 속성 도크에서 편집할 수 있게 했다.
도크 안 일반 키는 브라우저 control 동작을 유지하고 modifier undo/redo는 기존 경로로
전달한다. focused 9 tests와 960/1400px production 탭 전환/Enter/Space 회귀가 통과했다.
이 후속 수정의 broad gate는 evidence log의 `Selection-Driven Span Properties`를 따른다.
최신 전체 suite 887 tests PASS / 1 skipped와 full production Electron도 통과했다.
후속 desktop frame 변경은 문서 전체 스크롤을 팔레트/속성/악보 독립 스크롤로 대체한다.
compact 두 도크는 세로 공간을 나누고, 숨긴 도크가 있으면 표시 도크가 높이를 확보한다.
헤더 고정, 끝 control/마지막 음표 접근, PageDown 격리, 하단 오류 줄바꿈을 production에서
검증했다. 시작 화면/PDF에는 고정 frame class를 주지 않는다. 이 후속 검증은 evidence의
`Independent Desktop Workspace Scrolling`을 따른다. PDF 생성 smoke는 통과했으나 실제
렌더링에서 mordent/turn 사각형 glyph가 확인되어 후속 결함으로 처리했다.
frame 변경 후 전체 887 tests PASS / 1 skipped와 visual regression도 통과했다.
후속 장식음 수정은 VexFlow의 Bravura glyph/font를 재사용하며 mordent 세로획 의미를 유지한다.
실제 PDF로 드러난 윗보표 충돌은 ornament/fermata 높이를 공통 vertical layout에 예약해
해결했다. focused 27 tests, build/typecheck, visual regression, App/PDF/native readback은
통과했고 A4 PDF의 실제 PNG에서도 대체 사각형 없이 13.6px 보표 간격을 확인했다.
이 증거는 해당 fixture에 한정되며 전체 수동 PDF/외부 앱 QA의 Required 상태는 유지한다.
상세 실패 및 broad gate는 evidence의 `Ornament Glyphs And Staff Clearance`를 따른다.
최신 전체 suite는 889 tests PASS / 1 skipped이며 full production Electron도 통과했다.
로컬 MuseScore 4.7.5의 빈 Grand Staff 악보를 직접 생성해 좌측 palette/layout/properties
탭, 상시 입력 row/transport, 선택 rest 속성, 하단 mixer/status를 확인했다. 다음 compact
도크 개선은 이 실제 관찰을 기준으로 한다. 960px 요청은 1050px로 제한되어 같은 폭의
비교라고 주장하지 않는다. 사용자 악보 변경/저장과 외부 PDF 교환은 수행하지 않았다.
후속 compact 도크는 761-1200px에서 palette/properties tablist로 전환해 표시 panel이
남은 높이를 공유한다. 기존 도크/score handler는 유지하고 활성 탭만 local workspace에
저장한다. 메뉴/명령 진입, keyboard 탭/닫기, breakpoint focus, reset, print 숨김을 검증했다.
wide 기본 배치와 상단 category 구조는 별도 후속이며, 전체 MuseScore parity 완료가
아니다. 실패 및 최신 gate는 evidence의 `Compact Tabbed Docks`를 따른다.
최신 전체 891 tests PASS / 1 skipped, build/typecheck, 문서/diff 검증도 통과했다.

상시 transport 후속: 기존 handler의 처음으로/재생/일시정지/정지를 전역 메뉴 옆에 항상
노출하고, 재생 도구 quick category를 제거했다. 믹서는 독립 하단 영역으로 이동해 편집
surface 전환 중에도 유지하며 25dvh 높이 제한을 둔다. Tools 메뉴/상단 mixer toggle은
같은 state를 사용하고 기존 mute/solo/volume local preference와 score/native 계약은 유지한다.
failure-first App, focused 30 tests, 최신 global 892 tests / 1 skipped, build/typecheck,
full Electron 및 기존 baseline visual regression이 통과했다. 후속 quartet production
assertion도 960/1400px에서 높이 제한, 마지막 볼륨 접근, 가로 overflow 없음을 확인했다.
상세 검증 순서와 미실행 청감/외부 앱 QA는 `Persistent Transport And Bottom Mixer`를 따른다.
상시 음표 입력과 남은 category 제거는 여전히 별도 작업이다. 버전/릴리즈는 변경하지 않았다.

상시 음표 입력 후속: 기존 duration/accidental/pitch/voice/staff control을 단일 toolbar로
이동했다. File/Export/가사/표기/악보 설정을 열어도 입력 조작에 접근할 수 있으며 선택 음
편집과 입력 커서의 다음 음가 설정은 기존 함수로 구분한다. 가사에서 입력을 시작하면 note
workspace로 전환해 음 이름 key가 가사에 가로채이지 않는다. 기존 dense note 전용 행과
빈 default toolbar 공간을 제거했으며 960px 두 줄/1400px 한 줄 containment를 검증했다.
기존 category 자체의 제거와 음가 glyph 전환, wide dock 통합은 남아 있다. 자세한 실패와
latest gate는 evidence의 `Persistent Note Input Toolbar`를 따른다. 전체 parity 완료는 아니다.
최신 global은 895 tests PASS / 1 skipped다. typecheck, production Electron, visual regression,
roadmap/work-queue/diff gate도 통과했다. CSS 검사기의 suffix 오인 실패와 수정은 evidence에 남겼다.

음가 symbol 후속은 기존 숫자 버튼을 VexFlow/Bravura의 실제 7개 음표 glyph로 교체한다.
별도 font asset/score model/shortcut은 추가하지 않았다. 실제 raster의 64분음표 top clipping을
실패 재현 후 수정했고 960/1400px에서 fixed symbol bounds, 접근성 이름과 기존 입력 흐름을
검증했다. 최신 결과는 `Duration Toolbar Symbols` evidence를 따른다. category/navigation
제거와 wide dock 통합, 수동 악보/외부 앱 QA가 남아 있어 전체 IA 완료는 아니다.
최신 global 896 tests PASS / 1 skipped, full production Electron, typecheck와 문서 gate가 통과했다.

`가사` 작업대의 음절 연결 selector는 화면에서 `단일 / 시작 / 중간 / 끝`으로 표기한다.
저장 및 MusicXML에는 기존 `single / begin / middle / end` 값이 계속 사용되므로,
표기 언어 정리가 기존 가사·멜리스마·코드 심벌 편집 계약을 바꾸지 않는다.

`내보내기 작업`은 PDF/MIDI/MusicXML 실행 control과 `PDF 출력 설정` group을 분리한다.
PDF 목표 장수 검증 및 기존 save handler는 공유하므로, UI 구조 정리가 score/native/MusicXML
내용이나 export semantics를 바꾸지 않는다.

전역 `편집` menu는 undo/redo의 `실행 기록`과 copy/paste/delete의 `선택 편집`을
시각적으로 묶는다. 이 label은 focusable action이 아니므로 menu keyboard traversal과 기존
selection command path는 그대로다.

우측 속성 도크의 읽기 전용 `선택 정보` disclosure는 local workspace에서만 열림 상태를
기억하고 workspace reset에서 다시 접힌다. 따라서 selection metadata의 탐색 편의는 높이되,
score/native project와 MusicXML에는 UI 상태가 섞이지 않는다.

2026-10-21 alpha.32 tag workflow의 Windows package test는 selected rehearsal-mark
native-history App regression이 기본 5초 timeout을 넘어 실패했다. assertion은
그대로 유지하고 test-local 15초 timeout을 추가해 alpha.33으로 다시 release gate를
실행한다. alpha.32 tag는 immutable하게 남지만 prerelease publication은 skipped이며,
manual PDF/listening/external-app QA의 Required 상태도 변하지 않는다.

alpha.33 retry에서는 Windows가 통과했으나 macOS의 lyric range object-filter
native/MusicXML App workflow가 동일한 기본 5초 제한을 넘겼다. assertion은
유지하고 test-local 15초 timeout을 적용해 alpha.34 tag workflow로 재검증한다.

alpha.34는 PR #785 merge commit `898e790`에 `v0.1.0-alpha.34` tag를 생성해
release workflow `39573419366`을 실행했다. Linux/macOS/Windows package, macOS
Developer ID signing/notarization preparation/signature verification, packaged-app
smoke 및 GitHub prerelease publication이 통과했다. site PR #786과 main Site
workflow `39576803911`도 통과했고, production manifest가 alpha.34 asset/checksum
URL을 반환하는 것을 확인했다. manual PDF/listening 및 external-app QA의 Required
상태는 변하지 않는다.

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
