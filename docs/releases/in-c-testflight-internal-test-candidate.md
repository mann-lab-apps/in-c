# in C TestFlight Internal Test Candidate

Audit date: 2026-09-15. Status: UPLOADED; APPLE PROCESSING / INSTALL NOT VERIFIED.
This is a feature-freeze milestone, not expanded V1 completion or founder approval.

## Post-Upload Source Checkpoint

The user chose to keep TestFlight build2609.15.1 as uploaded, then authorized Git commit,
push and merge. This is not authorization for a replacement upload or public App Store release.
The source now separates `InCAppIcon` from Clef's `AppIcon`, using the existing in C
soft-launch artwork. A newly generated candidate is stored separately at
`apps/in_c_sheet/assets/brand/in-c-next-icon-candidate-20260915.png`; it is NOT wired into
the platform asset catalog and requires design approval/platform export before use.
The uploaded build still has the shared C/staff artwork. Do not describe the newer source
icon configuration as already installed on TestFlight.

Pre-merge checks: full1135/analyze/12-file format/diff PASS; the Ruby identity check verifies
all three inc configurations select distinct artwork while Clef keeps AppIcon. Local logs:
`/private/tmp/in-c-merge-20260915-{tests,analyze,ios}.log`. The local iOS validation build uses
2609.15.2, PASS26.2MB, unsigned and not uploaded; its status does not replace the signed2609.15.1 evidence.
Remote PR CI checks the root Node app, not Flutter; local Flutter evidence remains separate.

## Latest Signed Build And Upload

The user confirmed `com.mannlab.inc` after authorizing build/archive/distribution.
The independent `inc` iOS flavor now uses this ID and the display name `in C`.
All nine pre-existing Clef build configurations were compared structurally with HEAD
and are unchanged. The original Runner scheme, Info.plist and ExportOptions.plist remain
Clef-specific. `inc` selects the discovery home, also explicitly enabled in this build.
The shared C/staff icon is retained; no new icon approval is claimed. PDF document registration
is removed from the inc Info.plist; the shared tuner permission description remains unused.

- App Store Connect record: `6804194541`, also found in the upload delivery logs.
- Version/build: `1.0.0 (2609.15.1)`; do not reuse this uploaded build number.
- Team: `ZRA4DHHKQ4`; exported IPA signed with Apple Distribution.
- Store profile: `iOS Team Store Provisioning Profile: com.mannlab.inc`.
- Effective identity: `ZRA4DHHKQ4.com.mannlab.inc`; `get-task-allow=false`,
  `beta-reports-active=true`. Deep/strict signature verification PASS with keychain access.
- Archive: `/private/tmp/in-c-expanded-v1-20260915/apps/in_c_sheet/build/ios/archive/Runner.xcarchive`.
  This archive is unsigned; distribution signing was applied at export, not archive time.
- Signed IPA: `/private/tmp/in-c-expanded-v1-20260915/apps/in_c_sheet/build/ios/ipa-inc/in C.ipa`.
- Upload: Xcode reports `Upload succeeded` and `EXPORT SUCCEEDED`, 2026-09-15 16:16 KST.
  Uploaded package processing began. Processing completion, internal-group assignment,
  TestFlight installation and physical-device behavior remain NOT_VERIFIED.
- Nonblocking upload warning: missing PDFium.framework dSYM, UUID
  `4C4C44A5-5555-3144-A160-F8874342EBE8`. Native PDFium crash symbolication is limited.
- Flutter also reports the default launch-image placeholder. This is retained, not polished.
- Full1135 tests/analyze/format/diff PASS after flavor changes; Clef tests included.
- Isolated inc-flavor native suite PASS10 entries; actual provisional foreground notification
  received. This is not physical-device, background/banner/tap or hearing evidence.
- No commit/push/merge, public App Store release or tester invitation performed.

Automatic development signing initially failed because the team had no registered development
devices. A no-codesign archive followed by automatic App Store export succeeded without
registering a device. Reproduce with a NEW build number from the app directory:

```sh
flutter build ipa --release --no-codesign --flavor inc --build-name=1.0.0 --build-number=<NEW_BUILD> --dart-define=IN_C_DISCOVERY_HOME=true
xcodebuild -exportArchive -archivePath build/ios/archive/Runner.xcarchive -exportOptionsPlist ios/ExportOptions-InC.plist -exportPath build/ios/ipa-inc -allowProvisioningUpdates
```

For an authorized upload, use `ios/UploadOptions-InC.plist` in place of the export plist.
Do not use the Clef export plist. Before archiving, rerun Flutter with release flags so an
earlier integration run cannot leave QA defines/entrypoints in generated build settings.
No QA defines were supplied to this release archive. Personal app data was not reset.

Logs: `/private/tmp/in-c-testflight-20260915-inc-{archive,export,upload}.log`.
See dated evidence for source/artifact hashes. Remaining listening-content and human-value
limitations below still apply; successful delivery does not resolve them.

## Earlier Distribution Authorization (Historical)

The user supplied the target App Store Connect record
`https://appstoreconnect.apple.com/apps/6804194541/distribution/ios/version/inflight`
and subsequently requested build, archive and distribution. This authorizes the intended
in C TestFlight delivery, not publication to the public App Store, unrelated tester invitations,
Git publication or uploading the shared Clef binary. Earlier no-upload statements below
describe the preceding task and are superseded only within this internal-test scope.

At this earlier checkpoint the numeric Apple app ID was `6804194541`; its bundle ID had NOT been verified. The private
page was unavailable to the browser tool. A public Apple lookup for this ID in Korea returned
`resultCount: 0`; this does not prove the private app record is absent. No matching record ID
was found in the checked local project/release documents. The project still targets
`com.mannlab.inc.clefandstaff`. Requested the actual App Information bundle ID or screenshot
before changing configuration, rebuilding or uploading. No new distribution was attempted.

Latest follow-up: slow local event persistence no longer delays opening the listening
destination. The event is queued first; failures retain the controller's warning/retry path.
No listen-completion evidence is created. Full1135/analyze/11-file format/native10 PASS;
unsigned archive rebuilt with the same blocked identity. Current hashes are in the latest
section of the dated evidence document. Earlier verification below is historical.

## Scope Lock

Included: taste intake, Daily Pick, listening guide and external listening,
return/reaction/save, personal listening map, local persistence, optional iOS reminders.
No new recommendation mode, gamification, community or Ops dashboard.
Existing unrelated Clef/Chromatics changes and personal records remain untouched.
No commit, push, merge, identity change, TestFlight upload or invitation was performed.

Known exclusions: streaming, hosted audio, approved preview recordings, remote account
sync, production concert guarantees and human-validated recommendation quality.
Demo concerts must not be mistaken for current bookable events. Search is not direct playback.
First30 recording windows remain unapproved; this milestone does not close K01.

## Source And Candidate Identity

- Worktree: `/private/tmp/in-c-expanded-v1-20260915`.
- Branch: `feature/in-c-expanded-v1-followup-20260915`.
- Base: `9d44696baab26dafd234e8ec0cde9f1c12df3fe7` plus uncommitted in C changes.
- This is NOT a clean revision-only release. The base alone cannot reproduce this artifact.
- Existing changes: catalog/controller/screen, native integration, controller/avoidance tests,
  bridge/listening-level tests, product/QA/release/content-review documents.
- This milestone adds `test/in_c_testflight_candidate_test.dart` and a narrow Daily Pick
  composer-rotation fix, plus the link-launch persistence-wait repair and three recovery tests.
  Capture `git diff --binary` and untracked source hashes before
  an approved release build; secrets and personal data are never part of that capture.

Actual diagnostic archive metadata, not the historical store draft:

| Field | Observed value | Release consequence |
| --- | --- | --- |
| Display name / bundle name | Clef & Staff | Wrong identity for a separate in C app |
| Bundle ID | com.mannlab.inc.clefandstaff | Same as sibling Clef release22; do not install over Clef |
| Version / build | 1.0.0 / 21 | Diagnostic only; App Store Connect build uniqueness NOT_VERIFIED |
| Minimum iOS / SDK | 15.0 / 26.5 | Deployment target is not a tested-device claim |
| Signing | unsigned | No deployable IPA |
| Project team | ZRA4DHHKQ4 | Development/distribution identities exist locally |
| Project/export profile | Clef And Staff | Not evidence of a separate in C provisioning profile |
| Icon | Existing C/staff icon visually inspected | Separate in C brand approval pending |
| Launch image | Flutter reports default placeholder | Replace/verify in the approved in C configuration |
| Microphone usage | Tuner description | Shared Clef capability; in C must not solicit microphone access |
| Document type | PDF Score Viewer | Shared Clef registration; review when separating the product |
| Entitlements | No Runner entitlement file / CODE_SIGN_ENTITLEMENTS setting found | Signed effective entitlements still unverified |

`ios/ExportOptions.plist` also maps the Clef ID to the Clef profile; do not reuse it blindly.
Sandbox-only certificate enumeration initially showed zero; privileged public-identity
enumeration found valid signing identities. The blocker is NOT simply a missing certificate.
No private key, profile contents, tokens or certificate files were exported.

Historical decision, now resolved above: supply the existing in C App Store Connect record/bundle ID, or authorize
review of a separate identity. `com.mannlab.inc` is only a proposed candidate, not an
approved or registered iOS ID. Check availability, target isolation and record ownership
before changing anything. Do not repurpose the Clef record or reset its local data.

## Actual First Picks Versus Editorial Candidates

Fixed-date diagnostic: 2026-09-15, empty memory-only store, existing founder simulation.
The simulation supplies recorded favorites and explicit avoidance; it does not apply a
founder profile to ordinary users. Its next days simulate completion, NOT real listens.
Existing personal state may produce different pinned picks. The fixture proves repeatability
and no writes, not human satisfaction, musical distance or actual playback.

Before the repair: Moonlight -> Fur Elise -> Symphony5, all Beethoven.
After: Moonlight -> Raindrop -> Eine kleine Nachtmusik -> Pathetique II ->
Haydn Surprise II -> Revolutionary Etude -> Fur Elise.
The fix rotates among eligible composers explicitly present in intake, considering the last
two prior picks. Existing connection/difficulty/exclusion rules still apply. If no such
alternative exists, the strongest eligible connection remains; same-day pins do not change.
The founder fixture requires three distinct composers in its first three picks; the sparse
Beethoven fixture requires preservation of a grounded fallback and same-day reopening.

| Actual simulated first candidate | Connection and change | Short guide | Source / listening-path evidence |
| --- | --- | --- | --- |
| Beethoven Sonata14 Op.27 No.2, I, Moonlight | Supplied Symphony9 -> same composer, orchestra to solo piano; not proof of equal mood | Follow the repeating accompaniment under the melody | [Henle work identity](https://www.henle.de/en/Piano-Sonata-no.-14-c-sharp-minor-op.-27-no.-2-Moonlight/HN-1062); [DG Perahia movement-I video page](https://www.deutschegrammophon.com/de/kuenstler-innen/murray-perahia/videos/beethoven-mondscheinsonate-1-adagio-sostenuto-460852) opened. Page lists 3:41, so do NOT label it a verified complete movement. |
| Chopin Prelude Op.28 No.15, Raindrop | Supplied Nocturne Op.9 No.2 -> same composer/piano, different form and recurring-note attention | Notice the repeated note while the surrounding mood changes | [Henle HN854](https://www.henle.de/us/Prelude-D-flat-major-op.-28-no.-15-Raindrop/HN-854); [Paul Barton performance candidate](https://www.youtube.com/watch?v=2SVAL5JfYRg), search metadata only; direct page fetch failed. |
| Mozart K525, I, Eine kleine Nachtmusik | Supplied Symphony40 -> same composer, smaller string ensemble | Follow the opening signal and the string melody that follows | [Mozarteum work catalogue](https://kv.mozarteum.at/de/work/eine-kleine-nachtmusik-6049); [Academy of St Martin in the Fields Chamber Ensemble, UMG recording candidate](https://www.youtube.com/watch?v=70O_-lGhlZQ), search metadata only; direct page fetch failed. |

All three: work identification has source evidence; playback, Korean-region access,
actual hearing, specific 30-second window and preview permission are NOT_VERIFIED.
No new provider URL was approved or inserted in seed. In-app listening remains the existing
clearly labelled provider search fallback where no approved direct exists.
The listening guides above are work-level prompts, not recording-specific time claims.
This leaves a first-listen friction/content blocker. Resolve it before saying listening is effortless.

Editorial follow-up options, NOT secretly forced into the ranking:

- Brahms Symphony3, III: lyrical orchestral bridge from Dvorak9. [LA Phil work note](https://www.laphil.com/works/symphony-no-3-brahms).
  Its opening F-A-F discussion concerns movement I, not III. A full-symphony video needs
  a separately checked third-movement entry. No recording/window approved.
- Bach Little Fugue BWV578: explicit Bach-fugue preference, organ and recurring entries.
  [Netherlands Bach Society](https://www.bachvereniging.nl/en/bwv/bwv-578) identifies
  Dorien Schouten, Reil organ, Bovenkerk Kampen, recorded 2015-10-01.
  A general fugue preference is not an assertion that this exact piece is already known.
  Source identification only; no hearing/window/region approval.

The repaired first picks are still very familiar repertoire. Composer diversity alone does
not establish discovery impact. Do not mark founder satisfaction or novelty as PASS.
Confirm actual familiarity before treating an already-known piece as a new discovery;
record explicit input without inferring favorite movements or erasing listening history.

## Verification And Evidence

Current logs are local, not remote CI or human evidence:

- Latest link7/full1135/analyze PASS: `/private/tmp/in-c-testflight-20260915-link-save-final.log`,
  `/private/tmp/in-c-testflight-20260915-listening-full.log`,
  `/private/tmp/in-c-testflight-20260915-listening-analyze.log`.
- Latest diagnostic archive/native10 PASS: `/private/tmp/in-c-testflight-20260915-listening-archive.log`,
  `/private/tmp/in-c-testflight-20260915-listening-native.log`.
- The following results precede the listening-wait repair:

- Baseline full1130 and analyze PASS: `/private/tmp/in-c-testflight-20260915-full.log`,
  `/private/tmp/in-c-testflight-20260915-analyze.log`.
- RED first-three composer concentration: `/private/tmp/in-c-testflight-20260915-picks-red.log`.
- GREEN diagnostic sequence: `/private/tmp/in-c-testflight-20260915-picks-green.log`.
- Final full1132 and analyze PASS: `/private/tmp/in-c-testflight-20260915-final-full.log`,
  `/private/tmp/in-c-testflight-20260915-final-analyze.log`.
- Final nine changed Dart files format PASS, zero changes; git diff --check PASS.
- Controller110 plus candidate2 tests PASS112:
  `/private/tmp/in-c-testflight-20260915-final-targeted.log`.
- Baseline isolated native run: `/private/tmp/in-c-testflight-20260915-native.log`, PASS10
  entries (8 behavior tests plus setup/teardown), actual provisional foreground delivery.
  Post-fix native PASS10 with provisional foreground receipt:
  `/private/tmp/in-c-testflight-20260915-final-native.log`.
- Post-fix unsigned archive PASS186.8MB, IPA skipped:
  `/private/tmp/in-c-testflight-20260915-final-archive.log`.
  Source/diff/binary hashes and inspected screenshots are in
  [dated evidence](../quality/in-c-expanded-v1-evidence-2026-09-15.md).
- Unit/widget suite covers next-day and same-day behavior, fallback, exclusions, unsure,
  non-listening clicks, persistence and responsive/accessibility contracts. It is not proof
  of VoiceOver traversal, provider playback or physical notification taps.

## Archive Safety And Rebuild

Diagnostic path, NOT installable / NOT FOR UPLOAD:
`/private/tmp/in-c-expanded-v1-20260915/apps/in_c_sheet/build/ios/archive/Runner.xcarchive`

Command used for diagnostic archive:

```sh
flutter build ipa --release --no-codesign --dart-define=IN_C_DISCOVERY_HOME=true
```

Do not hand this archive to the founder as an installable IPA. The unsigned build explicitly
skips IPA export. Archive success, signed IPA export, upload, processing and installation
are five separate observations. Build artifacts stay ignored and outside source commits.

After explicit identity/config approval and App Store Connect inspection, use an unused
build number and the matching in C signing/export configuration. Preserve Clef target settings.
The future command below is a template; placeholders are not assigned values:

```sh
flutter build ipa --release --dart-define=IN_C_DISCOVERY_HOME=true \
  --build-name=<approved-version> --build-number=<unused-build-number> \
  --export-options-plist=<approved-in-C-export-options.plist>
```

Never pass `IN_C_SIMULATOR_QA`, `IN_C_ISOLATED_NOTIFICATION_QA` or `IN_C_CATALOG_OPS`
to that build. Ops entry is source-gated by release mode/explicit flag; native provisional
QA code is simulator-only. Recheck release launch on a physical device, rather than claiming
debug screenshots prove the release menu is hidden. Local notifications do not require
inventing an APNs entitlement or remote-push service.

Inspect archive and exported app: name/icon/ID/version, effective signed entitlements,
provisioning match, microphone/document declarations, release entry and no QA flags.
Record base revision, dirty/untracked source hashes, command, Xcode/Flutter versions,
artifact SHA256 and inspection time. Never include signing secrets in evidence.

## TestFlight Handoff (Not Executed)

Apple guidance checked 2026-09-15: [internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).
Internal testers are App Store Connect users with access to this app, not arbitrary public
email invitees. Verify founder eligibility and app access. Create a founder-only group after
approval, with automatic distribution disabled; manually choose the intended processed build.
No group, invitation or account-role change was made in this task.

Required owner input: in C app record/bundle ID and allowed team, unused build number,
founder Apple-account eligibility, a monitored feedback contact. Historical
`support@mannlab.app` is a placeholder, not a confirmed mailbox. Complete the console's
test-information/export-compliance prompts truthfully after checking the compiled app/SDKs.
Do not select privacy/encryption answers based only on this document.

Test description draft:
"좋아하는 음악에서 출발해 하루 한 곡을 고릅니다. 짧은 감상 안내를 본 뒤 외부 음악
서비스에서 듣고, 좋았는지 또는 아직 낯선지 남겨보세요. 알림은 선택 사항입니다.
음원은 앱에서 직접 제공하지 않으며 일부 작품은 검색 결과로 연결됩니다."

What to test draft:
"첫 곡이 마음에 드는지, 듣기까지 번거롭지 않은지, 다음 선곡도 맡기고 싶은지
알려주세요. 막힌 화면이나 링크가 있으면 작품명과 화면을 남겨주세요.
마음에 들지 않으면 며칠을 채울 필요 없이 첫인상을 말씀해 주세요."

After separate upload approval: upload via the approved Apple workflow, record processing
result, add only that build to the founder group, then confirm actual iPhone installation.
Do not uninstall Clef or erase existing in C records as an installation workaround.
If updating an existing in C app, check local-state preservation first and back up explicitly
with consent. No automatic analytics export or personal-event sharing is added.

## Physical QA And Decision

Before asking for satisfaction: verify correct product icon/name, launch into in C,
skip/complete intake, provider failure and return, same-day reopen, saved state and map.
Check small display/larger text, actual VoiceOver, permission denial without blocking app use,
time change/cancel/reschedule, background delivery and real warm/cold notification taps.
Record timezone/device/iOS/build and distinguish successful OS delivery from injected callbacks.

Ask only: was the piece worthwhile, was listening easy, would you trust the next pick?
Song-fit/familiarity problems are content/ranking issues; dead links, wrong app and lost state
are technical defects. No forced multi-day checklist or fabricated satisfaction score.

Hotfix only: wrong product identity, crash/data loss, unusable first listening path,
false completion, notification misrouting/duplicates, exclusion regression or severe overflow.
Defer new surfaces, new modes and broader expanded-V1 tasks until this session is evaluated.

| Decision | Current result |
| --- | --- |
| Feature scope frozen | YES |
| Code candidate | Regression gate PASS1135; artifact/source evidence recorded; packaging identity unresolved |
| Content listening readiness | HOLD: first recordings/region/windows not actually played |
| Signed IPA | NOT BUILT; wrong shared identity is a blocker, not absent certificates |
| TestFlight upload/processing/install | NOT RUN; no authorization/account inspection |
| Founder satisfaction | NOT_VERIFIED |
| Public V1 / expanded goal | NOT COMPLETE; Required39 remains DONE12 / IN_PROGRESS25 / NOT_VERIFIED2 |
