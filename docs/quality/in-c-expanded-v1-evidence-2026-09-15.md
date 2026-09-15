# in C Expanded V1 Evidence: 2026-09-15

## Latest: User-Authorized in C TestFlight Upload

User confirmed bundle ID `com.mannlab.inc` and authorized archive/distribution to their
App Store Connect record6804194541. Added independent inc scheme/configurations and Info.plist,
separate export/upload options, and flavor-aware discovery entry. Xcodeproj structured
comparison against HEAD: all9 original Clef configurations unchanged. No Git publication.

Automatic development archive failed: no registered development devices/profile. Instead,
`flutter build ipa --release --no-codesign --flavor inc --build-name=1.0.0
--build-number=2609.15.1 --dart-define=IN_C_DISCOVERY_HOME=true` created the archive;
automatic App Store export signed it successfully. The archive itself remains unsigned.
The IPA reports in C/com.mannlab.inc/1.0.0/2609.15.1, Apple Distribution, teamZRA4DHHKQ4,
App Store profile, get-task-allow=false, beta-reports-active=true. Deep/strict codesign PASS
with keychain access; sandbox-only trust failure was not a binary-signature defect.

Xcode upload returned exit0, `Upload succeeded`, `EXPORT SUCCEEDED`, at16:16KST.
Delivery logs contain target app ID6804194541. Apple processing started; completion/group
assignment/physical install are NOT_VERIFIED. Missing PDFium dSYM UUID
4C4C44A5-5555-3144-A160-F8874342EBE8 is a nonblocking warning, not silently ignored.
Flutter default launch-image warning remains. No private signing material is committed.

Verification logs under `/private/tmp/`:
- Full1135 PASS: in-c-testflight-20260915-flavor-full.log (Clef included).
- Analyze PASS: in-c-testflight-20260915-flavor-analyze.log.
- lib/main.dart format0 changes; git diff --check PASS.
- Failed development signing: in-c-testflight-20260915-signed-build.log.
- Archive/export/upload: in-c-testflight-20260915-inc-{archive,export,upload}.log.
- inc-flavor isolated native PASS10 entries (eight behavioral tests plus setup/teardown):
  in-c-testflight-20260915-inc-native.log. Actual provisional foreground delivery
  receivedAt1789456620.030497, NOT physical/background/banner/tap evidence.
  Current intake-strongest-bridge and listening-map screenshots visually inspected;
  no visible overlap in the captured viewport. Not a VoiceOver/all-screen approval.

Artifacts are under `apps/in_c_sheet/build/ios/` in this worktree:
`archive/Runner.xcarchive`, `ipa-inc/in C.ipa`.
The candidate remains base9d44696 plus dirty/untracked changes, not a clean committed release.
Current tracked app snapshot: `/private/tmp/in-c-testflight-20260915-inc-tracked.patch`.

| Object | SHA256 |
| --- | --- |
| Tracked app patch | 714acb45fe8b0e0d35f90629e028658d83a9d192968cfe5f3ba9b71380ba66e6 |
| Signed local exported IPA | f4226a7c6ac431a0f9c90404de3452b0ac56874719dae0a0b689ab973b6ceeb2 |
| Archived App.framework/App | 01d35aabaee51a87148c1e40947defc7aa90c9bc5848b1c1b76924962535dffd |
| ExportOptions-InC.plist | 4cac694ceb0d1827b672d0cbdeda0429dbea6c922ad6532db90107c21e347180 |
| UploadOptions-InC.plist | b1521c099eb1dafe6f6bbcadb79931435986cc5bc5b5bd8784270a3303eca6a4 |
| InC-Info.plist | e1e39a37f6efeede16e4d97f69707b0e35e97f7183578d807199582e6d5f2f02 |
| inc.xcscheme | 2b78ee67bf85c2483566ad6888cca2673a5324649c8e0c92af859ca4ae9d47aa |
| configure_in_c_ios.rb | 90add4d4e9bf2f20ebed1239603f5f1e55efbf64cf41198c4007a8a3ac489d23 |
| classical_listening_level_evidence_test.dart | 4be142dcae9733adc577c2813d3a7e10fb466d3a8ea98355760397f4ea699133 |
| classical_recommendation_bridge_test.dart | 25d0dff339ac115223528061735b48cd51665f1300f5344f5f9d5c9af09354dc |
| in_c_testflight_candidate_test.dart | d90e986ea20f2d71f426b51bd22ef032b83e3ff472875f5ec4898b85b74c62c7 |

Required39 remains DONE12/IN_PROGRESS25/NOT_VERIFIED2. Delivery is not founder approval,
actual audio/region/window verification, real notification tap evidence or Public V1 completion.
Earlier identity blockers and artifacts below are historical and superseded only for distribution.

## Latest Follow-Up: Listening Must Not Wait For Disk

Previous goal turn made concrete progress. The same identity decision still blocks signing;
no new authorization was received. This continuation stayed within first-listen defect repair.

- Seed search review: Moonlight includes I/Adagio sostenuto, Raindrop Op.28 No.15,
  Mozart K525. No evidence requiring replacement by a different work; search is not playback.
- Actual blocking await found: `launchClassicalWorkLink` waited for `recordProviderClick`'s
  serialized disk persistence before invoking the provider. RED pending-save fixture observed
  zero launcher calls before completing storage, expected one.
- Launch now queues the event first and observes persistence separately. Controller snapshot
  serialization, warning and retry remain unchanged. A rejected logging sink is caught with a
  non-personal diagnostic, not mistaken for a failed provider or extra fallback.
- Three new tests: pending storage, rejected event sink, actual Work Detail/controller/store
  delayed failure then retry. Same click ID is retained, warning visible in controller state,
  one launch only, `lastListenedAt` null. Explicit user saves/reactions still await persistence.
- Click durability remains best effort if the process terminates before storage completes;
  neither launcher success nor an in-memory event proves listening or durable disk success.

| Check | Result | Evidence under `/private/tmp/` |
| --- | --- | --- |
| RED | Expected failure reproduced | in-c-testflight-20260915-link-save-red.log |
| Link recovery | PASS7 | in-c-testflight-20260915-link-save-final.log |
| Full suite including Clef | PASS1135 | in-c-testflight-20260915-listening-full.log |
| Analyze | PASS | in-c-testflight-20260915-listening-analyze.log |
| Format / diff | PASS11 changed Dart files, zero changes / PASS | format command and git diff --check |
| Unsigned device archive | PASS186.8MB; IPA skipped | in-c-testflight-20260915-listening-archive.log |
| Isolated native | PASS10 entries (eight behavior tests plus setup/teardown) | in-c-testflight-20260915-listening-native.log |

Native provisional foreground receipt `receivedAt=1789454940.020273`; no physical/banner/tap
or provider-playback evidence. The simulator is the same isolated device identified below.
Current archive path is unchanged, but the binary was rebuilt. Same Clef identity/name/build21,
unsigned, NOT FOR UPLOAD. No commit/push/merge/identity/signing/upload action.
Current source snapshot is `/private/tmp/in-c-testflight-20260915-listening-tracked-app.patch`;
previous snapshot and hashes below remain historical. Untracked files are unchanged.

| Updated object | SHA256 |
| --- | --- |
| New tracked app patch | d1eded7aca62910f094561663cf8b94c291707019201dd3782c1e3a5b3bb9a4f |
| lib/classical_link_launcher.dart | 907cd52aa23507a04a12add7ed78435c40282df42dfda51c0877d63f9db6269a |
| test/classical_link_recovery_test.dart | 53b6143b528d815c97d7eccff8e4db8afc5f6ffcc245630fffc88f9f176370e2 |
| Archived Frameworks/App.framework/App | 537378b83793a73adbedf5dbf048bb74ec7036878e655db28fcd70905a1db2d8 |
| Archived app Info.plist | f6551d50ac9c857dbc2daf5f152815938c2aa6d9f4d9972be5c594800ed11977 |

Required39 remains DONE12 / IN_PROGRESS25 / NOT_VERIFIED2. H01/L01 improved, not closed.
Next: approved separate identity/profile/build-number decision, actual first-recording playback,
signed artifact inspection, then separately authorized upload/install. Founder evidence is absent.

## TestFlight Freeze Follow-Up (Same Date)

User now freezes feature expansion for founder iPhone testing. This is a subordinate
milestone, not a reduction/completion of the expanded V1 goal. Goal lookup returned no
active goal in this execution; the full remaining scope was registered, without a token
budget or quota bypass. No commit/push/merge/upload/invitation/identity edit was performed.
Required39 remains DONE12 / IN_PROGRESS25 / NOT_VERIFIED2.

### First-Pick Defect And Repair

- Baseline fixed-date founder simulation: Moonlight, Fur Elise, Symphony5. Three different
  works, one composer. Existing tests passing did not reveal this first-use concentration.
- Added first-three composer diversity acceptance for this multi-composer founder fixture.
  RED `/private/tmp/in-c-testflight-20260915-picks-red.log`: actual composer set length1,
  expected3. No failed assertion was relaxed to obtain green.
- `_pickDailyWork` now prefers an eligible explicitly supplied composer outside the last
  two prior picks; all existing eligibility/connection checks remain. Sparse single-composer
  catalogs keep a connected fallback. No new recommendation mode or founder-only default.
- GREEN sequence: Moonlight, Raindrop, Eine kleine Nachtmusik, Pathetique II, Haydn Surprise II,
  Revolutionary Etude, Fur Elise. These are simulated completed days, not founder listens.
- New tests verify stable output, no writes or real intake mutation, no known-favorite first
  picks, sparse fallback, stored original input and same-day reopening. Existing first-week,
  excluded/unsure/late-return tests pass. Famous repertoire still risks weak discovery impact;
  composer diversity is not musical-quality or satisfaction evidence.

### Current Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline full/analyze | PASS1130 / PASS | `/private/tmp/in-c-testflight-20260915-full.log`, `in-c-testflight-20260915-analyze.log` in the same directory |
| Final controller + candidate tests | PASS112 (controller110 + candidate2) | `/private/tmp/in-c-testflight-20260915-final-targeted.log` |
| Final full regression, including Clef | PASS1132 | `/private/tmp/in-c-testflight-20260915-final-full.log` |
| Final flutter analyze | PASS | `/private/tmp/in-c-testflight-20260915-final-analyze.log` |
| Changed Dart format | PASS, nine files, zero changes | `dart format --output=none --set-exit-if-changed` over tracked/untracked changed Dart files |
| Diff whitespace | PASS | `git diff --check` |
| Final unsigned device archive | PASS, 186.8MB; IPA skipped | `/private/tmp/in-c-testflight-20260915-final-archive.log` |
| Final isolated native flow | PASS10 entries: eight behavior tests plus setup/teardown | `/private/tmp/in-c-testflight-20260915-final-native.log` |
| Actual foreground calendar receipt | PASS under simulator provisional permission only | final native log `receivedAt=1789454340.040282`; not physical/banner/tap evidence |
| Physical iPhone, OS notification taps, VoiceOver | NOT_VERIFIED | No such device observations |
| Provider hearing/region/window | NOT_VERIFIED | Source pages/search metadata only; direct YouTube page fetch failed |
| Signed IPA / upload / processing / install | NOT RUN | Identity collision, no approved separate in C configuration or upload authorization |

The isolated simulator is `64D3F002-45AC-4980-B2AE-D6C5AE6497C3` (iPhone17Pro/iOS26.5).
Final screenshots inspected: `in-c-daily-pick.png`, `in-c-listening-guide.png`,
`in-c-listening-map.png`, under
`/private/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/in-c-expanded-v1-ui`.
At the captured viewport, text/buttons fit, a clear main guide button is visible and search
buttons are labelled as searches. Map scrolls below the bottom navigation; this is not a
claim that the entire long page was visible at once. Debug Ops icon is visible in these
captures; they do not prove its release absence. Release source uses `kReleaseMode` plus
`IN_C_CATALOG_OPS`; device-only build omitted QA/ops flags and used discovery-home=true.
Physical release entry/menu behavior remains to be verified after signing.

### Artifact And Source Evidence

Base `9d44696baab26dafd234e8ec0cde9f1c12df3fe7`, branch
`feature/in-c-expanded-v1-followup-20260915`, dirty in C changes retained.
Tracked app diff snapshot (no secrets/profile export):
`/private/tmp/in-c-testflight-20260915-tracked-app.patch`.
Untracked tests are separately listed below; this patch alone does not reproduce them.
Documentation-only edits after the archive do not change the runtime binary.

| Object | SHA256 |
| --- | --- |
| Tracked app diff snapshot | b7ff139e266d8561227059a9af17d96a9141f38defd1b45f326ec185dd3c5071 |
| `lib/classical_discovery_controller.dart` | bfa72fcfe40d6f5145faebff87fea476d1347c36e09a59aeb975e68e09da36ea |
| Untracked `test/classical_listening_level_evidence_test.dart` | 4be142dcae9733adc577c2813d3a7e10fb466d3a8ea98355760397f4ea699133 |
| Untracked `test/classical_recommendation_bridge_test.dart` | 25d0dff339ac115223528061735b48cd51665f1300f5344f5f9d5c9af09354dc |
| Untracked `test/in_c_testflight_candidate_test.dart` | d90e986ea20f2d71f426b51bd22ef032b83e3ff472875f5ec4898b85b74c62c7 |
| Archived `Frameworks/App.framework/App` | 41d6084e24a39988c04b392c04840553e20fa439b2550c25ab73999b938eafe2 |
| Archived app `Info.plist` | f6551d50ac9c857dbc2daf5f152815938c2aa6d9f4d9972be5c594800ed11977 |

Diagnostic archive:
`/private/tmp/in-c-expanded-v1-20260915/apps/in_c_sheet/build/ios/archive/Runner.xcarchive`.
Actual plist: Clef & Staff / com.mannlab.inc.clefandstaff / 1.0.0(21) / minimum15.0 / SDK26.5.
`codesign -dv` reports not signed (expected for diagnostic; no usable IPA). Archive/IPA paths
are ignored by Git. A compiled shared microphone description/PDF registration remains;
no claim that an in C-only binary permission audit is complete.

Read-only comparison with `/private/tmp/clef-release-22-20260915` confirmed the same bundle
ID and profile. Current `ios/ExportOptions.plist` also targets Clef And Staff. Privileged
certificate-identity listing found valid development/distribution certificates; do not repeat
the sandbox's misleading zero-identities result as a signing diagnosis.
App Store Connect app record and latest build number were not accessible/inspected. Build21
is diagnostic, not claimed unique. No private certificate material was read/exported.

### Content And Next Action

[Candidate manifest](../releases/in-c-testflight-internal-test-candidate.md) records actual
simulated first3 separately from editorial BrahmsIII/BWV578 alternatives, official source
links, performance candidates, short work-level guides and every missing playback check.
DG's Perahia page identifies a movement-I video but lists3:41; do not call it a verified full
movement. YouTube search metadata for Mozart/Chopin is not successful playback. No URL,
time window or preview authorization was added to the catalog.

Next owner input: existing in C App Store Connect bundle ID/record, or permission to review
a separate in C identity. Then isolate the configuration without changing Clef, choose an
unused ASC build number, verify actual listening, export a signed IPA and inspect it.
Upload/install need separate authorization. First founder impression is unanswered and
may end the test immediately; do not demand a multi-day quota or fabricate feedback.
Code regression gate PASS; distributable candidate HOLD; recommendation quality unknown;
physical validation NOT_VERIFIED; Public V1 NOT COMPLETE. Goal is not marked complete.

## Scope And Provenance

- Goal tool initially returned no active goal; full remaining A-I/Required scope registered.
- Fetched main9d44696 includes PR #758 merge8eef6a8 and implementation38fb38f.
- New worktree `/private/tmp/in-c-expanded-v1-20260915`, branch
  `feature/in-c-expanded-v1-followup-20260915`. Old resume directory is absent.
- Original dirty worktree and other products preserved. No git publication/deployment/identity change.
- Initial Required39: DONE11 / IN_PROGRESS26 / NOT_VERIFIED2.
  Current: DONE12 / IN_PROGRESS25 / NOT_VERIFIED2; R01 current-code validation is complete.
  Counts describe row scope, not all V1 approval.

## Reproduced And Corrected

### A04/E01/B02: Consistent First Reward

Four runtime failures in `/private/tmp/in-c-20260915-taste-red.log`:

1. Translation replaced broad Dvorak Symphony9 input with an automatically matched movement title.
2. Puccini-only input and a Mozart-only pool still produced generic familiarity copy.
3. Persisted intake with an empty catalog threw a StateError from the fallback selector.
4. An excluded Chopin anchor returned as the listening guide when other candidates were recently heard.

Translation now quotes original input and uses the same actual work/input connection contract
as Next Three. Unknown/unconnected input is acknowledged without inferred familiar qualities.
The reward chips retain raw input. Empty pools return null; fallback anchors must be ready.
Draft state stays unchanged and corrected fallback survives reopening. Small320px/1.6 text
onboarding regression passes. Targeted7 and initial full avoidance27 PASS.

### A04/B02/D01: Unknown Titles Are Not Musical Evidence

Whole-suite regression exposed an OST path that still fabricated a connection. Further runtime
RED cases: Lost Stars, Ghost, Interstellar OST, 나의 기록 and 색연필. Previous substring matching
treated `ost`, `록`, `색` inside unknown titles as an explicit listening preference.
Log: `/private/tmp/in-c-20260915-title-red.log` (five failures).

Free-text axes now require recognized whole descriptors. Explicit 영화음악/OST/선율/피아노/리듬
remain usable; composer-confirmed fugue/variation hints remain supported. Unknown songs retain
their raw text and use open_start, with no inferred taste-axis evidence. This is deliberately
conservative: unrecognized descriptive sentences stay unclassified rather than inventing traits.
It is not an acoustic similarity model or proof of recommendation satisfaction.
The actual quick choices (밤의 피아노, 현악 소리, 라흐마니노프 선율) have explicit descriptor
entries and tests. Runtime RED `/private/tmp/in-c-20260915-descriptor-red.log` caught all three
missing axis entries before correction. A word occurring inside a title still cannot use them.

### A04: Old Pinned Proximity Claims

Runtime RED `/private/tmp/in-c-20260915-legacy-red.log`: an old Lost Stars snapshot with
unmatched-source evidence still displayed 아주 가까움. The existing legacy-copy guard now also
withdraws that contradictory proximity claim. Same work/moment/date/revision and saved records
are preserved; raw input remains intact. Both stale-snapshot merge orders and history display
are covered. Scoped1 PASS `/private/tmp/in-c-20260915-legacy-green.log`.

### K01: Satie First-Exposure Guide

Inspected publisher [HN1072](https://www.henle.de/de/Gymnopedies/HN-1072) and its linked
[opening score p2](https://www.henle.de/media/2a/f2/4a/1692630332/1072_0010-1692630332-sync.jpg).
Four accompaniment bars precede the upper melody in bar5. Updated the guide to follow the
alternating low note/chord before the melody enters. The earlier downloaded public page0009
was forewordVII, not score evidence; page0010 is the inspected opening. Images are temporary
review material, not bundled app assets. No audio downloaded or provider URL/preview approved.
Recording identity, regional playback, actual hearing and timed passage remain NOT_VERIFIED.

## Verification

- Initial full run: 1100 PASS/1 FAIL, uncovered the remaining unknown-OST translation path.
- After unknown-title repair and Satie guide: full1112 PASS,
  `/private/tmp/in-c-20260915-full-final.log`. This predates the final legacy guard repair.
- Controller plus avoidance147 PASS before the last Satie/legacy regression additions:
  `/private/tmp/in-c-20260915-controller.log`.
- Initial analyze exposed an erroneous await of a void test keyboard helper; replaced with
  native focus dismissal.
- Final scoped152 PASS `/private/tmp/in-c-20260915-scoped-final.log` (controller110 plus avoidance42).
- Final full1116 PASS `/private/tmp/in-c-20260915-full-closeout.log`, including current-main Clef tests.
  This count includes the newly merged Clef suite; it must not be presented as 532 new in C tests.
- Final analyze PASS `/private/tmp/in-c-20260915-analyze-closeout.log`. Changed Dart files formatted;
  final five-file format check has zero changes; `git diff --check` PASS.
- Final iOS no-codesign build PASS (26.0MB), `/private/tmp/in-c-20260915-ios-closeout.log`,
  with `IN_C_DISCOVERY_HOME=true`. Identity remains `com.mannlab.inc.clefandstaff`.
- Added direct unknown-title map assertions and store/reopen checks: scoped5 PASS,
  `/private/tmp/in-c-20260915-map-reopen.log`. No false opened nodes are generated.
- Full suite after those final assertions:1116 PASS,
  `/private/tmp/in-c-20260915-full-final-state.log`.
- Native integration uses a NEW isolated simulator64D3F002-45AC-4980-B2AE-D6C5AE6497C3,
  named `in C Isolated QA 20260915`, iPhone17Pro/iOS26.5. No personal device reset.
  Native integration PASS `/private/tmp/in-c-20260915-native.log`: seven behavioral cases plus
  setup/teardown, nine runner entries, no SKIP. Unauthorized rejection, actual pending replacement/
  cancellation and provisional foreground delivery observed. This run predates the final legacy
  guard and quick-descriptor corrections; those have current automated regression coverage.
- Final current-code native repeat PASS `/private/tmp/in-c-20260915-native-final.log`: seven
  behavioral cases plus setup/teardown, nine runner entries, no SKIP. Installation began with
  not-determined permission, then isolated provisional authorization enabled actual foreground
  delivery again. Still no full user permission/physical/banner/tap or audio approval.
- Inspected current `in-c-intake-original-evidence.png` and `in-c-listening-map.png` in
  `/private/var/folders/7t/fwnpt1816d1_v7lympf0jnsw0000gn/T/in-c-expanded-v1-ui`.
  Original symphony input and the actual candidate's bridge/guide/chip are readable. The captured
  sheet is scrolled, so its earlier heading is above the viewport, not evidence of full-page QA.
  Map summary/controls are readable without overlap; lower nodes still require scrolling.

## Remaining Required Evidence

Only R01 (current code verification) is promoted. The product/content rows repaired above remain
in progress because their complete acceptance is broader. Implementation completion remains NO.
Recommendation satisfaction, physical-device validation and public release approval are NOT_VERIFIED/NO.
First30 selected recordings and windows, regional playback, real hearing, notification permission
choice/background/banner/warm-cold tap, VoiceOver and actual founder/five-user responses remain open.
Rule fixtures and simulator provisional delivery cannot substitute for those observations.

Founder was asked whether Brahms Symphony3 movementIII is known/liked and feels too familiar,
an appropriate extension or unappealing after Dvorak9. No answer has been supplied at this entry;
no observed response or satisfaction event was manufactured.

Next: A04/B01/B02 independent recommendation review, K01 recording/window review and G/H/I
device gaps. Resume from this worktree, not the removed old one. Do not re-copy merged PR #758.

```sh
cd /private/tmp/in-c-expanded-v1-20260915/apps/in_c_sheet
flutter test test/classical_avoidance_preferences_test.dart test/classical_discovery_controller_test.dart
flutter test
flutter analyze
flutter build ios --no-codesign --dart-define=IN_C_DISCOVERY_HOME=true
```

## Continued Audit: Grounded Daily And Next Three

Scope: A03/A04/B02/E01/F01. These are remaining cross-surface defects, not human approval.

### Reproduced Failures

- `/private/tmp/in-c-20260915-bridge-red.log`: five failed cases. With Carmen then
  Chopin supplied, a new Chopin piano work was open_start because Daily considered only
  the first work; reversing input order exposed source copy referencing unrelated Carmen.
  Instrument-only preferences could claim expansion without a known changed dimension.
  A default melodic axis admitted surprise for an unconnected Puccini-composer input.
  An exhausted one-work pool described a known favorite as new.
- `/private/tmp/in-c-20260915-known-input-red.log`: both input orders re-recommended an
  already supplied favorite in Next Three. Root and draft sets now exclude all supplied
  matched works, not just the highest-ranked anchor.
- `/private/tmp/in-c-20260915-surprise-reason-red.log`: a connected Chopin-nocturne to
  Bach-Air surprise omitted the changed instrumentation in its copy.
- `/private/tmp/in-c-20260915-strongest-bridge-red.log`: one of eight cases failed.
  Daily was correctly close here, but draft reward/Next Three described the looser
  Bach-Air mood connection rather than the closer supplied Chopin piano work.
  This log does NOT demonstrate that Daily chose surprise in that particular fixture.

### Repairs And Acceptance

- Daily and Next Three inspect all supplied inputs via the same connection contract.
  Matching difficulty or a default axis alone cannot establish familiarity or expansion.
- Connected inputs use the existing composer/instrument/period weighting, stably tied by
  input order, in selection and explanation. Explicit work-page navigation anchors remain
  distinct from an assertion that the user liked the displayed work.
- Gentle expansion needs an actual changed attribute; surprise additionally needs a
  period/instrument change and the existing shared-axis requirement. Piano preference
  alone supplies proximity, not evidence of expanding an existing repertoire.
- Shared evidence and changed instrumentation/period are named in the reason. A positive
  surprise regression remains: Chopin-nocturne -> Bach-Air shares a catalog mood and
  changes period/ensemble. These metadata assertions are NOT musical satisfaction.
- If new candidates are exhausted, Daily honestly offers a revisit. It neither marks the
  work saved nor changes the daily record on reopen. Next Three does not fill novelty
  slots with supplied favorites. Explicit work-page navigation remains usable.
- Eight focused regressions: `test/classical_recommendation_bridge_test.dart`. Day-four
  scheduling history is explicitly simulated, never observation.

### Current Verification

- Scoped245 PASS: `/private/tmp/in-c-20260915-strongest-bridge-scoped.log`, includes
  bridge8, avoidance42, expanded85 and controller110.
- Full1124 PASS: `/private/tmp/in-c-20260915-bridge-full-current.log`, including Clef.
  Earlier full1122/analyze logs predate the strongest-input fix and are historical.
- Analyze PASS before the additional native fixture:
  `/private/tmp/in-c-20260915-bridge-analyze-current.log`.
- iOS no-codesign build PASS26.0MB: `/private/tmp/in-c-20260915-bridge-ios.log`.
  `IN_C_DISCOVERY_HOME=true`; identity unchanged. Not installation or hearing proof.
- Native10 runner entries PASS (8 behavioral plus setup/teardown), no SKIP:
  `/private/tmp/in-c-20260915-bridge-native.log`. Same isolated simulator64D3F002.
  Includes the new two-input/three-work onboarding case, original input chips and stronger
  source text, without saving draft preferences. Not-determined refusal, provisional
  pending replacement/cancellation and actual foreground calendar receipt observed.
  Physical/full permission/background/banner/OS tap/audio remain NOT_VERIFIED.

Required39 remains DONE12/IN_PROGRESS25/NOT_VERIFIED2 after current code verification.
No first30 recording/window, founder response or release approval follows from these repairs.
No commit, push, merge, deployment or identity change.

## Screenshot Follow-Up And Listening Pacing

The native `in-c-intake-strongest-bridge.png` showed the correct original inputs and
Chopin source with no overlapping text. It also exposed a real flow defect: the displayed
first work was repeated verbatim under "next path". Sparse and full-catalog widget cases
both failed in `/private/tmp/in-c-20260915-intake-next-red.log`. The reward now omits its
first work from that following list, and hides the list when no following candidate exists.
It does not add fake extra works or mutate the preview model to conceal a sparse pool.

An additional D01/D03/A03 audit found `listeningLevelSnapshot` counting intake entries,
external attempts, saves and raw reaction count as advancement. Four runtime RED cases:
`/private/tmp/in-c-20260915-level-red.log`. Repeated clicking/saving without any confirmed
listening reached the deepest label; repeated same-day confirmations did likewise.

Pacing now reuses `_dailyCompletionDates`, including durable confirmed dates after recent
logs are compacted. Each local date counts once; future dates are excluded. Revising a
reaction to unsure does not erase the fact of a confirmed day or penalize earlier activity.
This is a conservative recommendation-pacing heuristic, NOT a claim of musical competence,
verified audio playback, satisfaction or independently measured progress. Existing labels
and difficulty thresholds remain; the evidence being counted is corrected. No schema change.

Four tests in `test/classical_listening_level_evidence_test.dart` cover non-listening
actions/reopen, repeated same-day records, compaction/correction and future dates.
The first scoped run exposed an older founder test requiring Beethoven as every reason
even when Dvorak was the closer supplied source. It now independently checks the actual
quoted input's composer/instrument/mood connection, not a particular first input or the
recommender's own distance label. Log: `/private/tmp/in-c-20260915-level-scoped.log`.

After repair: scoped251 PASS `/private/tmp/in-c-20260915-level-scoped-final.log`:
controller110, avoidance42, expanded85, bridge10, listening-level4. Earlier scoped245,
full1124 and native10 remain chronological checkpoints, not final evidence for these last
screen/pacing edits. Final full/native/format checks are recorded below when complete.

### Final Code Checks After Screen/Pacing Repairs

- Full1130 PASS `/private/tmp/in-c-20260915-pacing-full.log`, includes Clef regression.
- Analyze PASS `/private/tmp/in-c-20260915-pacing-analyze.log`.
- Eight changed Dart files: `dart format --output=none --set-exit-if-changed`, zero changes.
- `git diff --check` PASS. Required table re-count:39, DONE12/IN_PROGRESS25/NOT_VERIFIED2.
- Current iOS no-codesign build PASS26.0MB `/private/tmp/in-c-20260915-pacing-ios.log`.
- Final native10 PASS (8 behavioral plus setup/teardown), no SKIP:
  `/private/tmp/in-c-20260915-pacing-native.log`. Includes sparse onboarding with no
  duplicate next path, actual native store/reopen retaining one confirmed day and initial
  pacing, permission refusal, pending replacement/cancel and provisional foreground receipt.
  This supersedes earlier native logs for current screen/pacing behavior only.
- Visually inspected final `in-c-intake-strongest-bridge.png` and `in-c-listening-map.png`
  in the temporary `in-c-expanded-v1-ui` screenshot directory. The sparse reward has the
  correct original chips/source/guide and no duplicate next-path row. No text overlap in
  the captured viewport; map lower nodes require scrolling. Not an all-screen/VoiceOver proof.
- Neither code tests nor build approval establishes actual listening/physical-device/user value.

Next independent work remains K01/A04 first30 recording/window review and B01/B02 actual
founder/contrasting-listener relevance; G03/G04/G06 physical permission/background/tap and
I02 VoiceOver still need separate observations. No observed human answer has been supplied.
Continue in this worktree with `flutter test test/classical_listening_level_evidence_test.dart
test/classical_recommendation_bridge_test.dart test/classical_expanded_v1_test.dart
test/classical_avoidance_preferences_test.dart test/classical_discovery_controller_test.dart`,
then full tests/analyze after further edits. Historical native runs are not current-code evidence.
