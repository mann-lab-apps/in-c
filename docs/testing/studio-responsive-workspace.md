# Studio workspace and engraving regression policy

2026-10-26. This policy describes the R1/R2/R3 original `in-c` adapter. It does not
replace the larger parity worktree's layout or certify Commercial V1/RC.

## Independent checks

| Check | Command after `npm run build` | Meaning |
| --- | --- | --- |
| Historical responsive snapshot | `env -u ELECTRON_RUN_AS_NODE electron scripts/verify-notation-snapshots.cjs` | Original default workspace metrics. Currently FAIL; retained, not silently rebaselined |
| Explicit R3 notation profile | `npm run verify:studio-notation-profile` | Reviewed v2 fixture:960 shared/1400 split,available docks280,active palette,fit100%,details/input off |
| Fixed-canvas engraving | `env -u ELECTRON_RUN_AS_NODE electron scripts/verify-notation-snapshots.cjs --fixed-canvas` | Same historical SVG widths; compares notation marks/event counts independently of dock reflow |
| Legacy workspace contract (migration pending) | `env -u ELECTRON_RUN_AS_NODE electron scripts/verify-studio-responsive-workspace.cjs` | Real dock controls,200/280/360,show/hide,reopen,fit/fixed and selection/history;48 cases |
| Current standalone compact workflow (revalidated in UI144) | `env -u ELECTRON_RUN_AS_NODE electron scripts/verify-studio-compact-workspace.cjs --short-window` | 960/1400 ×750/800/1000 geometry, normal-text header density, actual Tab/Enter/Space navigation and dock focus scroll |

| Current shared-dock/sidebar contract | `env -u ELECTRON_RUN_AS_NODE electron scripts/verify-studio-system-toolbar.cjs --compact-dock-scroll` | Actual menu/public controls,6 normal heights plus2 large-text/coarse cases,width207/280/360,draft/resize/focus/undo/native/output |

Use `node_modules/.bin/electron` if Electron is not on PATH. The compact runner's
ordinary mode retains initial staff/note visibility at1000px. Short mode records
the initial geometry at every height but accepts explicit navigation at750/800:
the selected real SVG target must gain focus and fit without selection/history
changes. It does not claim the first note initially fits those shorter windows.
Large-text/coarse checks are emulation and must not be reported as physical input.

## Baseline provenance and current geometry

The historical JSON last changed in commit50ebfe03 (2026-09-12). Its CSS used a
236px right dock at960 and168/236px side docks at1400. Subsequent R1/R3 adapters
changed actual workspace layout. The arithmetic explains the known differences:

- Historical960: `(960 - 236) - 32 - 48 = 644` SVG width.
- Before51,960 used the full-width canvas: `960 - 32 - 48 = 880`.
- Current51+,960 uses one saved280px sidebar: `(960 - 280) - 32 - 48 = 600`.
- Historical1400: canvas996; capped900px paper minus96px padding gives804.
- Current1400/default280: canvas840; paper776 minus96px padding gives680.

The legacy workspace runner pins the older CSS contracts and has not been
migrated to the shared sidebar; it must not be reported as a current PASS. The
new shared-dock verifier checks actual compact sidebar and canvas positions;
the explicit profile separately pins current960/1400 geometry. Fit-width uses the existing paper insets/cap and renderer minimum560px.
Fixed mode retains996px paper and900px SVG; horizontal canvas scroll is required
only when the paper exceeds the available canvas. Hiding docks can make fixed
paper fit. No assertion assumes that fixed mode always requires scrolling.

The first new QA draft omitted the renderer's560px floor and assumed all fixed
cases scroll. Those were verifier specification errors, not product defects.
Their logs are retained in the new return alongside corrected contract runs.

## Review boundary

Do not rewrite `notation-snapshot-baseline.json` merely to make its default run
green. Keep its diff/images and compare fixed-canvas results before deciding
whether a difference is engraving or workspace policy. A future accepted baseline
needs an explicit viewport/dock/zoom fixture, before/after images and a documented
design decision. The continuous follow-up adds a **separate** reviewed
`studio-r3-notation-profile.json`; it does not replace the historical JSON or
change `verify:visual-regression`. Candidate captures and the adoption decision
are retained in the continuous return's `profile-review.json`.

`--profile=studio-r3 --capture-profile` writes a candidate under its isolated QA
output only; it is not verification or approval. The ordinary profile command
compares actual metrics to the reviewed profile and validates the real workspace
state. Unknown, duplicate and misspelled arguments (including `--profile studio-r3`
instead of `--profile=studio-r3`) reject before any window/fixture/baseline write.
Mixing the profile with historical `--fixed-canvas` or `--update` also fails.
Existing valid historical commands keep their previous meaning. Parser tests
and actual negative invocations are separate from positive snapshot verification.

Paper, music glyphs and font metrics stay unchanged. The desktop document header
puts the existing label and zoom control beside one another, keeps the label
whole and uses the existing small spacing token. Duration controls wrap inside
their actual available width instead of leaving the keyboard target clipped at
large text. Dark context values inherit the readable chrome text token.
The `악보로 이동` action changes focus/scroll only: selected span first,
logical range endpoint/event next, first editable event of the selected measure
next, then first editable event/canvas fallback. Address matching preserves the
part/staff/voice context. It introduces no
score command and does not change input mode. Enter/Space activation is kept local
so Space does not also trigger global playback. Existing keyboard input, canvas
selection, undo, print and save semantics are checked separately by the R2/R3
production runners and root suite. The continuous follow-up adds local F6 pane
navigation between the canvas and that existing action. It preserves input and
selection and ignores IME/modifier/text-editing contexts; it does not replace a
score command or claim physical OS function-key behavior.

## Discovery follow-up commands

After a current production build, run `scripts/verify-studio-navigation-contexts.cjs`
with Electron for range/rest/measure/input/replacement, synthetic title/chord IME
signals, F6 draft isolation and persisted-pitch rejection/native/undo coverage.
`--pitch-only` isolates the ascending-entry regression. Output defaults to
`out/ddirori/studio-navigation-contexts` (`DDIRORI_CONTEXT_QA_OUT` overrides it).

`scripts/verify-studio-musical-workflow.cjs` creates a64-measure/79-note synthetic
fixture through the wizard and existing input commands, with quarter/eighth
notes, Korean lyrics, a chord and a manually edited slur. It exercises real
native save/reopen, undo/redo, XML/PDF and height/reset controls at960/1400,
light/dark/text200/fine/coarse. `DDIRORI_MUSICAL_QA_OUT` sets its isolated output.
This is a broader synthetic case, not a dense user-score or engraving approval.

`scripts/verify-studio-output-ink.cjs` opens that journey's `manual.chromatics`.
Set `DDIRORI_OUTPUT_QA_SOURCE` when using a nondefault musical output directory;
`DDIRORI_OUTPUT_QA_OUT` sets the ink/PDF artifacts directory. The actual glyph
check detects a first chord extending left of SVG x0; the renderer now keeps
that automatic label's measured ink inside the SVG without changing the score.
Long adjacent lyric words still overlap in this fixture. PDF success now shows
a nonblocking warning measured from actual print-layout lyric ink, after fonts
are ready. It does not change the text, manual geometry or native dirty state.
`--retry-lyric-layout` on the output runner verifies true→false→true warnings
using the existing explicit system-break command and exact undo. The corrective
layout preserves all music/lyrics/manual shape; it is not automatic spacing.
File/PDF transport success and chord containment do not approve unresolved
automatic lyric spacing or all manual slur/lyric clearances.

## Qualified automatic lyric layout

The subsequent lyric-layout return adds automatic spacing for **one visible
staff**, including a single-staff part view. Actual unchanged rendered typography
is measured after fonts are ready. Width reservation reuses the existing
VexFlow note/formatter; the same measured bar minima drive screen and PDF plans.
The original two7-character Korean words now clear automatically. The prior
warning/manual-break evidence stays historical; it is not rewritten as an
automatic-layout pass. The musical runner now expects no lyric warning by
default. `--extreme-lyrics` creates two48-character words and expects honest
overlap/clipping warnings, with no text truncation or notehead overflow.

`--require-auto-lyric-clearance` on the output runner checks both screen widths
and actual print-layout ink. `--audit-lyric-draft` checks resize/caret retention,
composition DOM deferral, Escape, Tab/one undo and a delayed native reopen with
detached old composition callbacks. `--audit-part-view` adds score/part view,
selected-address/native-view preservation and an actual part PDF. Generated
files/QA IPC remain distinct from physical OS dialogs/IME.

Grand staff/ensemble automatic spacing is not qualified: existing staves are
formatted independently, so the new reservation is not applied there. Current
layout and measured PDF warnings remain. Extending shared-onset alignment needs
a separate engine-layout contract. Manual span geometry remains authoritative;
lyric clearance does not certify every manual slur/text collision. Conservative
leading-modifier reservation can change automatic wrapping/page count; the
reviewed64-bar fixture now produces3 pages, with actual final-page content.

## Multi-part selection and metadata continuation

After the current build, `env -u ELECTRON_RUN_AS_NODE npx electron
scripts/verify-studio-part-selection.cjs --audit-commands --audit-metadata
--audit-playback` uses the real expanded-part MusicXML fixture and QA disk-backed
IPC. `DDIRORI_PART_QA_OUT` selects owned output. It checks960/1400 visible-part
edits,one undo/native reopen,ensemble cursor projection,add/undo/redo,input staff,
within-part voice ordering and delayed metadata/session contracts. It uses the
actual Score navigation before native shortcuts; select/input shortcut guards
are not bypassed. This is not native OS dialog,physicalIME/audio-hearing or
multi-staff engraving approval. Known PianoPDF start-ink collisions remain in
the execution queue rather than being hidden by file/native success.

## Immutable native PDF request

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-pdf-snapshot.cjs`
checks960/1400 edit/replacement/part-view/page settings with a delayed QA native
save boundary and real disk/PDF output. DDIRORI_PDF_SNAPSHOT_OUT chooses output;
source/replacement variables point only at owned native fixtures. This delays
QA IPC rather than automating an OS dialog. The print subtree is inert and uses
real NotationPreview;the live editor remains interactive. Inspect print ink inside
PDF IPC under `.studio-pdf-snapshot`;post-return reads are live editor geometry.
Existing root tests explicitly scope these surfaces. Default historical visual
failure and fixed/current profiles retain separate meanings.

## Whole-event chord movement

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-chord-pitch.cjs`
uses an owned native project with2parts,a2-staff Piano,independent system break
and manual slur0/3. DDIRORI_CHORD_QA_SOURCE/OUT select the owned fixture/output.
960/1400 × diatonic/chromatic/octave requires both actual heads to move or2sharp
SMuFL glyphs,native exact source/one undo/redo/reopen,part XML/MIDI note-on bytes
and real2-pagePDF. VexFlow accidental text is inside notehead groups,not a
`.vf-accidental` class. This is whole-event selection,not individual-head editing.
Disk-backed QA IPC is not an OS dialog/hearing/physical IME certification.

`verify-studio-chord-pitch.cjs --audit-spelling` adds sharp/natural/enharmonic
whole-event actions through the real note disclosure and selected-property
buttons. It checks actual sharps/flats,clearing unnecessary accidentals,XML/MIDI,
native one undo/reopen and two-pagePDF at960/1400. Input preparation remains a
separate App regression. Synthetic native-open tests explicitly flush React's
effect boundary before window keys;failure history is retained. No individual
head editor or physical input/audio certification is implied.

`verify-studio-chord-pitch.cjs --audit-letter` checks nativeD replacement on owned
single/chord source at960/1400. It expects the established single-note result,
actual Sing lyric retention,one undo/native reopen,part XML/MIDI/PDF and preserved
neighbor/manual data. Rich optional attachments/rest replacement/native bounds
also have unit/App coverage;this is not all-symbol PDF or OS input approval.

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-midi-results.cjs`
uses an owned native source and delayed QA MIDI save boundary at960/1400.
DDIRORI_MIDI_RESULT_SOURCE/OUT select owned fixtures/output. It separates old-doc
success/error from same-doc pitch edits,compares requested/completed bytes and
current native/selection/history/oneundo/reopen. Expected injected rejection logs
do not mean physical OS dialog or listening validation. No notation/PDF changes.

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-import-results.cjs`
checks960/1400 × old picker success/error,pending note edit cancel/accept,native
page-layout cancel and old recent-list error. DDIRORI_IMPORT_RESULT_SOURCE/OUT
select owned native source/output. Real controls/keys/disk/undo/reopen are used;
picker/recent/JS confirm responses are QA boundaries,not physical OS automation.
One window-lifetime unload handler avoids listener accumulation across12cases.
No notation/PDF change or all-entry lifecycle approval is implied.

`verify-studio-import-results.cjs --audit-recent` starts without fixture mode,
clicks the real visible welcome recent entry,opens an owned native replacement
and releases old recent-file success/error/list failure.6cases cover960/1400;
welcome and current-document captures are retained. It does not manufacture an
editor recent button. Default12picker cases remain separate regression coverage.
Expected injected handler errors are not physical OSdialog/IME verification.

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-welcome-keyboard.cjs`
uses nativeTab/Space/Enter on visible welcome controls at960/1400. Set
DDIRORI_WELCOME_KEY_SOURCE/OUT for owned source/output. It checks real wizard,
import/project/backups/recent entry,templateSpace/Escape/focus return and normal
editorN/native save after open. Welcome has no rendered editor status;do not
invent a hidden status control to test it. App mock observes actual hook score
props for hidden model protection. --probe-only isolates the first nativeSpace
assertion. QA IPC/native browser input is not physical OSdialog/IME certification.

`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-score-authors.cjs`
checks960/1400 new blank/explicit authors and existing undefined/empty/named/in-C
source via native/XML/PDF,undo/redo/reopen. DDIRORI_AUTHOR_QA_SOURCE/OUT select
owned fixtures/output. --capture-existing captures old observed header/music
references only,not default-author approval. Compare real Poppler page rasters
and print-source SVG separately;do not call screen HTML bounds PDF coordinates.
The return's nativeImage review validates only author-region pixel changes.
SharedInput labels use the real label.control association,not nested-input
assumptions. No OSdialog/physicalIME/Score receipt certification.


`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-chord-memory.cjs`
checks actual960/1400 chord-member accidental carry via full MIDI oracle,actual
sharp/natural SVG ink,XML pitch values,PDF,native source/oneundo/reopen. Generate
owned source using DDIRORI_CHORD_MEMORY_QA_DIR with chord-accidental-memory.test.ts;
use that directory for the verifier and DDIRORI_CHORD_MEMORY_UI_DIR for outputs.
--probe-only isolates960. Oracle spells every alteration explicitly;merely
finding a65 note-on would miss the erroneous later64. Initial fixture tempo
without canonical text triggers the existing safety guard and is retained as
a separate diagnostic,not silently treated as successful XML export. No OSdialog
or listening/external-app certification.


The same chord-memory verifier also reads optional title/signs/xmlNotes/letter
from an owned contract.json. Generate key and preceding cases with
DDIRORI_IMPLICIT_CHORD_QA_DIR and implicit-chords.test.ts;point
DDIRORI_CHORD_MEMORY_QA_DIR at each case. It requires the full independent
explicit MIDI oracle before checking actual XML export/native/PDF. A corrected
serializer may still be rejected by an incorrect save signature;that is a
separate product failure,not a reason to weaken the safety assertion. Capture
key/prior cases separately at960/1400 and preserve failed intermediate output.


Optional tempoText/parsedTempo in the owned chord-export QA contract also
checks actual tempo SVG text and real XML reimport/MIDI after native preservation.
Generate six cases with DDIRORI_TEMPO_LABEL_QA_DIR and musicxml/tempo-label.test.ts.
Run each using DDIRORI_CHORD_MEMORY_QA_DIR and a separate UI output directory.
Default labels are compared semantically in save safety;explicit words,unit,dots,
BPM and transparency remain meaningful. Unit tests cover all7units×3dot counts;
production covers quarter absent/empty,eighth,dottedquarter,half and explicit
words,not all21combinations. PDF print ink and actual page rasters are separate
from screen geometry. No listening or external-app compatibility certification.


`verify-studio-midi-results.cjs --audit-xml` reuses the deferred real-IPC boundary
for MusicXML copies. Default output is separate from MIDI;DDIRORI_MIDI_RESULT_OUT
still allows an owned output directory. It compares exact string bytes on disk,
current native/selection/history,old-document success/error and same-document
edit warning at960/1400. --probe-only checks960edit-success before product fix.
MIDI default keeps its legacy requestMidiSha256 result alongside generic format/
requestSha256. Expected injected old-file errors are not environment failures
or OS dialog/listening certification.


`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-xml-report.cjs`
checks16conditions:960/1400,light/dark,text100/200,fine/coarse emulation. Set
DDIRORI_XML_REPORT_SOURCE/OUT for owned files. It opens actual manual-span XML
export warnings,tests native summary Enter/Space and stopped playback,raw-data
visibility,contained lines,selection and native/XML preservation;light100fine
exports2PDFs. Compare these pages to sealed D27production,not the older author
placeholder reference. Copy UI uses shared neutral/theme/warning/density tokens.

Apply CDP emulation after page load;enforce bounded case deadlines. Native
Enter needs a char carriage return. Closed details may retain client rects,so
use checkVisibility for paint visibility and retain positive open checks. These
are verifier qualifications,not reasons to weaken product assertions. Actual
import technical/unknown-ornament fallback is App coverage;the production matrix
uses a manual-span export report,not every warning type/physical touch.


Generate owned identical whole-chord tie cases with DDIRORI_CHORD_TIE_QA_DIR
and notation/chord-ties.test.ts. Run
`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-chord-ties.cjs`;
DDIRORI_CHORD_TIE_UI_DIR selects outputs,--probe-only isolates960same-system.
It checks actual .vf-stavetie path count for both members/partial halves,existing
model-validated8beat MIDI snapshot,XML flags,native/oneundo/redo/reopen andPDF.
The renderer uses existing VexFlow firstIndexes/lastIndexes arrays only when
resolved chord keys are identical. Unequal/member-specific tie semantics are
not expanded. Short incoming tails remain an observation requiring separate
spacing review,not full engraving/MuseScore/listening certification.


Generate mixed supported/unsupported MIDI sources with DDIRORI_MIDI_WARNING_QA_DIR
and midi/warning-policy.test.ts.
`env -u ELECTRON_RUN_AS_NODE npx electron scripts/verify-studio-midi-warning.cjs`
uses that source directory and DDIRORI_MIDI_WARNING_UI_DIR. Default18conditions
cover16percussion viewport/theme/text/pointer combinations plus nativeTAB at
960/1400. --audit-pdf compares before/after warning-panel outputs at both widths;
--probe-only is the first actual guidance case. Explicit record counts qualify
PASS;single probes are not matrix passes.

The test uses fresh owned native windows,explicit keyboard target activation
and document.hasFocus/:focus before asserting a painted2px ring. App lifecycle
of window-all-closed must not terminate the runner before all cases finish.
Closed-details visibility is checked with checkVisibility;Enter includes char.
Native TAB is supported by project schema while TAB MusicXML import is rejected;
do not expand import support to make a UI fixture pass. Diagnostic IDs/messages
stay intact and are not mixed into MusicXML report payloads. Physical input/
listening/OSdialogs/external MIDI consumers remain separate manual gates.

## Studio R3 incoming tie spacing audit

8actual960/1400 single/identical-chord same/cross-system cases pass screen and
print modifier separation,SVG containment,all tie pieces,exact native/MIDI/XML,
oneundo/redo/reopen. Incoming tails remain12SVG units;nearest clef/time bounding
box separation is23.995SVG units. SVG font group boxes are conservative metrics,
not a pixel-accurate glyph outline;actual scrolled captures and representative
PDFs were reviewed separately.8PDFs are one page;paired-width PNG hashes match.
No clipping/modifier collision was reproduced in these fixtures. No renderer,
spacing,font/model change and no new partial-chord semantics.2single-note model
cases extend old2chord cases;4pass/typecheck pass. Global870+Node4 is the prior
MIDI checkpoint,not rerun after these2tests. Historical responsive/physicalIME/
OSdialog/screenreader/external/listening remain unverified or known separately.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-tie-spacing-2026-10-26/handoff.md).


## Studio R3 MIDI request ordering

6App reds and actual Electron older-success overwrite red reproduce stale
same-document result UI. A private monotonic request identity now gates status
and warning feedback together with document generation. Disk requests/bytes
still finish independently;no bridge cancellation or score mutation.
Latest success wins,latest failure remains visible,and latest cancellation
keeps previous completed UI.18focused pass;12actual960/1400 orderings retain
rest-oracle bytes,dirty/selection/history,redo/undo,native reopen and report
isolation. Expected QA error replies remain in raw logs.

Full878passed/1externalMXLskip + Node-native5passed includesD36single-note
coverage andD37order tests.70tracked source/config/doc hashes remained stable
during global. Type/build and doc gates pass. D35current/fixed profiles andD36
PDFs remain earlier separate results;not rerun for result-ownership-only change.
No baseline/engine/schema/bridge/commonAPI/iOS/version/remote actions.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-midi-ordering-2026-10-26/handoff.md).


## Studio R3 MusicXML warning document lifetime

A qualifiedApp red and actual renderer red show old-file import warnings remain
after accepted new-score creation. The existing creation adapter now clears the
report only on accepted creation;cancel and declined dirty replacement preserve
report/selection/current music. No engine/report schema or wizard/pending-open
ownership expansion.7focused and6actual960/1400 create/cancel/decline cases pass,
with native score checks and viewed representative captures. Initial fixture
errors(clean import mistaken for dirty,synthetic shortcut focus,button text and
implicit native-dialog selector) are retained separately from the product red.
Recovery after import was not reproduced and is not claimed fixed.

Type/build/doc gates pass. Full878+Node5 isD37before these3tests/one-line reset;
not rerun yet. EarlierPDF/profile results remain distinct. No geometry/font/
baseline/version/iOS/remote changes.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-report-lifetime-2026-10-26/handoff.md).


## Studio R3 compact result-status readability

Actual960 MIDI result squeezed duration/view/history/playback text into2lines.
Qualified coordinate red precedes a chrome-only wrapping change:short readouts
retain intrinsic width;full completion text flexes/wraps independently. No label
is hidden,aria-live/commands preserved,and notation fonts/geometry untouched.
18actual960/1400 theme/text100/200/fine/coarse cases now keep short readouts on
one line with no overflow;keyboard/details/MIDI/native/undo/reopen remain green.
Text-fragment rect count was corrected to distinct line tops before product fix.

18focused,type/build,current profile/fixed canvas and doc gates pass.4one-page
PDF rasters matchD35before/after exactly;representatives viewed. Global881passed/
1externalMXLskip + Node-native5passed includesD39new3tests.70recorded hashes
remained stable during global;other mobile work advancedHEAD independently,
recorded without resets or edits. No baseline/version/iOS/remote actions.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-status-readability-2026-10-26/handoff.md).


## Studio R3 actionable MIDI failure guidance

3App reds and actual IPC/path default-disclosure red precede MIDI-specific
Korean failure feedback. Shared Banner(kinderror) and private native technical
disclosure preserve original error verbatim without changing engine/XML report
models/commonAPI. Request/generation ownership covers error state;cancel retains
it,retry success clears it,new-document replacement hides stale errors.
24focused/type/build pass;16actual theme/text/pointer error/cancel/retry/native/
keyboard cases and12ordering regressions pass. Dark status/meta contrast red
(2.01/2.07) led to existing error/muted tokens (7.92/7.04),not new token values.
2one-page PDFs while error UI remains present matchD40rasters exactly.

Full881+Node5/current/fixed are priorD40checks;D41new3tests not in global yet.
No baseline/serializer/schema/bridge/commonAPI/version/iOS/remote change.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-midi-failure-copy-2026-10-26/handoff.md).


## Studio R3 result filename case

Actual innerText renderedwarning.mid asWarning.Mid while textContent/disk/report
keptwarning.mid. A Studio-only text-transform override now preserves the actual
result spelling;no filenames or bytes are renamed.18actual viewport/theme/text/
pointer cases pass filename/status/keyboard/MIDI/native/history/reopen checks.
Type/build/currentprofile/fixedcanvas and doc gates pass;baseline unchanged.
Global881+Node5 remainsD40prior;D41new3tests pending next broad checkpoint.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-result-filename-case-2026-10-26/handoff.md).


## Studio R3 full long result filenames

An actual legal190-ish-byte MIDI basename expanded report/header to1343.55px in
960px viewport. Qualified MIDI overflow red precedes a private shared-header
wrap rule (min-width0/max-width100%/overflow-wrapanywhere). Full names stay intact;
no shortening/renaming/serializer or commonAPI changes.18MIDI and16MusicXML actual
viewport/theme/text/density cases retain full filename,keyboard/native and exact
output contracts. Initial XML runner native-open deadline was a verifier failure,
not a qualified XML product red;instrumented ownedconfirm/focus run passes.

Type/build/currentprofile/fixedcanvas/doc gates pass. XML2PDFs/4pages are rendered
identical toD35;representative2pages viewed. Global884passed/1externalMXLskip +
Node-native5passed includesD41new3tests.73source/config/doc/commonAPI hashes stable
while global ran without product edits/build/Electron. No baseline/version/iOS/
remote changes. Historical responsive/physicalIME/OSdialog/screenreader/listening/
external consumers remain separately unverified or known prior failure.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-long-result-filenames-2026-10-26/handoff.md).


## Studio R3 keyboard return from long results

Existing local navigation works without new product code/global shortcut:
nativeShiftTab14steps fromMIDI summary (15fromXML) reaches visible existing
navigation button;F6returns to selected real target,F6back andF6return preserve
selection/history/dirty. Qualified18MIDI+16XML viewport/theme/text/density cases
pass actual target containment and native/output checks.52product/commonAPI hashes
stay fixed during QA;type/syntax/doc gates pass.4PDFpages match reviewedD43rasters.
Full884+Node5/current/fixed remainD43product checkpoint;verifier-only changes
were tested directly,not counted as new product fixes or rerun-global results.

Retained intermittent failure:one960/light200fine run showedSpace with playback
before new navigation phase. It lacked actual key target at the failing moment;
root cause is NOT established. Isolated trace,full trace and stronger native/
document/live-summary precondition matrix pass without product changes. Failed
log remains alongside diagnostics;this is not a blanketSpace reliability signoff.
[Evidence](../brand/ddirori-design-system/product-design-r3/returns/studio-r3-result-keyboard-return-2026-10-26/handoff.md).



## Lower view focus return (44)
The existing local F6 score-return path also accepts a lower view radio or a closed, enabled readonly Select. Open choices, text drafts, composition/229 and Ctrl/Meta/Alt stay untouched. Score F6 still returns to the existing navigation action, rather than a new all-pane cycle. Native Electron keys validate selection/history/payload and the returned event above the status area at six height cases and four theme/scale/pointer cases. This is not a physical OS function-key or screen-reader claim.

## 2026-10-27 shared compact profile v2

The761-1023px workspace now uses one left dock with public SegmentedControl. Saved visibility declares availability for both panes; the active pane is separately persisted. The profile records shared compact/split desktop/initial palette and independently asserts real pane visibility. At960/default280,SVG600x633 replaces880x466;1400 remains680x620. Fixed-canvas and native/XML/MIDI/six one-page PDF rasters are unchanged. Candidate and old failure are retained in checkpoint51/profile-review.md. Historical baseline is unchanged. Older compact/continuous/responsive runners above remain unported,not current passes. New --compact-shared-dock on verify-studio-system-toolbar covers six heights/widths,207/280/360,visibility/reload,draft/keyboard/native/output. First note is still footer-obscured at750 in both widths;800/1000 pass. Existing10rem cap remains a follow-up.

## 53 measured sidebar and focus

The old10rem top-surface cap is replaced with actual compact pane-top/viewport/status measurements and a160px minimum. ResizeObserver and resize/scroll listeners are cleaned up;pane contents remain mounted. The minimum can require document scrolling at large text. Focus reveal accounts for the sticky footer and preserves the same live draft across width changes. Native8-case checks retain all height/width/visibility/reload/native/output assertions;full transport/mixer4 and R1/R2 also pass. No initial750px first-note guarantee follows from the sidebar improvement. Profile v2 and historical baseline are unchanged in53.

## 54 shared desktop profile v3

All desktop widths>=761 now use the same left shared palette/properties dock. Saved visibility remains availability; active pane and each200–360/default280 width retain their keys. Inactive pane contents stay mounted. <=760 retains its stacked compatibility layout. `--desktop-shared-dock` on verify-studio-system-toolbar checks eight real production cases, including widths207/280/360, both closed/reload/reopen, focus/draft across viewport changes, native and output.

Profile v3 records shared/shared/initial palette and independently checks actual visible panes at960/1400. v2 visibility red and before JSON remain in checkpoint54. Reviewed960 metrics remain600x633;1400 changes680x620 to804x466 because the second dock is removed and fit-width uses the existing capped paper. Cross-system slur pieces follow the resulting line break. Fixed-canvas and eight XML/MIDI/PDF comparisons stay unchanged. This is an explicit workspace contract revision, not an update of the historical baseline or a guarantee that all200% controls fit without document scrolling.


55 responsive runner restored:48 cases at960/1400,width200/280/360,fit/fixed andfour availability combinations. Actual public dock-settings Input/Popover,live header close,Tools finder andpublic Select replace retired/hidden controls. Saved availability/preferred pane are asserted separately from actual fallback visibility after reload. Canvas/paper/SVG arithmetic,33events,selection,zero history,overflow andoriginal48 combinations retained. Actual input event/preview andslur target also clear the sticky footer. Red simultaneous-pane assumption andintermediate mistaken fallback/scroll expectations retained;no product changes. Smallest600px canvas fits560px SVG plus16px margin/24px left padding;fixedpaper996px unchanged. Native48 plusnavigation2 PASS;whole962+Node5 remains54product checkpoint. Current profile v3/historical baseline unchanged. Continuous/compact runners remain unported.


57 continuous runner restoration:actual menus/public Select/Accordion/dock settings replace retired category/native-select/detail paths. Four960/1400x750/800 editing journeys retain native keys,late selection,input/property edits,exact undo/redo,F6,fit/fixed/dock anchor andnative reopen. Separate64-measure real wizard journey retains2notes,range/slur,explicit0/manualheight3,invalid no-commit,light/dark200%fine/coarse,native/XML andactual2-page PDF. English native-only geometry diagnostic is inspected through opened public technical disclosure. Window-bound focus assertions pass,but reviewed captures show late note ink andlarge-text geometry can still be under the sticky footer;this is NOT a footer-clearance approval. Next58 adds actual ink/footer red andfixes the product.207product/common files remain equal56. Whole962+Node5 remains56;no new product change in57. PDF2pages andlarge-text/late-note captures directly viewed. Physical/OS/external limitations remain.


## 58 actual focused ink andfooter

`verify-studio-continuous-editing.cjs --audit-visible-focus` now records settled before/after capture geometry,actual canvas-measured Bravura note ink,focused outline andthe actual sticky status top. Existing window/pane-only assertions are retained butare not clearance approval. App uses the existing reveal logic for still-active SVG event/span focus,outline plus public8px margin,andfooter height changes. It never focuses the whole canvas bounding box orcommits a draft. Four editing andseparate64-measure/light-dark200 fine/coarse native flows pass withactual footer clearance. Initial750px first-ink visibility is a different contract andremains limited.


59 compact runner restored:default andshort-window PASS,six960/1400x750/800/1000 native navigation paths withactual footer/ink/ring,zero history/selection,print hiding,two current disclosure/property journeys,dark200/coarse48 andnooverflow. Retired note-details key cannot hide persistent voice controls;palette persistence andinspector session-only disclosure are explicit current replacements. Legacy null-detail red andmistaken general-text-color expectation retained;original context-color equality pluspublic muted token pass.207product/common files equal58;whole962+Node5 remains58. Fulltransport/mixer4 PASS. No product/baseline change. Initial750first ink andphysical/external limits remain. Next60:public Button for menu items.


## UI144 · standalone compact revalidation

The current standalone compact runner already uses actual menus, public controls,
notation-family disclosure, current lower view controls and real field focus. Both
its short-window and default modes passed against the UI143 product build. The
remaining `migration pending` table label was stale and has been corrected.
An additional presence assertion checks the actual next-input context, persistent
note toolbar and application menu before approving their measurements. It passed
on first observation; this is regression coverage, not a newly reproduced product
bug. The initial note/real ink, footer clearance, keyboard, disclosure persistence,
print hiding, enlarged text, coarse48px and selection/history assertions remain.
No baseline or product code changed in this follow-up.
