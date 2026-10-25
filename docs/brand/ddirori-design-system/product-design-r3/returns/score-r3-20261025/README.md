# Ddirori Score R3 Return

## Basis

- Design revision: Product Design R3, manifest SHA-256 `a61baa86bd6869b38982042aa501631881df313e3de7be08411a6cfdb4ff0f36`. `revision.py` reported changed inputs and was not re-frozen.
- Changed input relevant to this service: `apps/in_c_sheet/lib/main.dart`, already changed by the earlier R2 viewer work. Historical R1/R2/R3 manifests were preserved.
- Product source: `apps/in_c_sheet`.
- Product source SHA-256 after this change: `main.dart` `d08e7ccf205dac301e21b9b20ace04e084c9618182eebdc6004507a621d54205`, `sheet_library_controller.dart` `ad630a70937b098e016612d90ab84ca00d62678c47a04ab18049378bfa4f7514`, `sheet_library_store.dart` `48d9e35ad529c3e9f9d28d603214d8afacb7df3abab0f20a53cbc93d373718cd`.
- This return records the focused R3 changes only. The final commit hash is filled from the committed product checkpoint, not predicted here.

## Applied Work

### R3-S01: imports only publish after metadata persistence

- `SheetLibraryController.importPdf`, `importImagesAsPdf`, and `importSharedPdfFiles` now build the next library list locally, save it, and only then replace the visible model.
- If import metadata storage fails, the visible library remains unchanged and any managed copies made by the failed attempt are removed through the store's managed-folder guard. User-selected source files and existing score files are never deleted.
- Native shared-PDF failures release their handled path in the existing screen bridge, so a later platform delivery can be attempted again. A successful delivery still opens the newly persisted score directly; it does not show a first-use interstitial.

### R3-S02 and manual connections

- The empty library's primary action is now `PDF 악보 추가`.
- PDF import explicitly includes PDFs exported from Studio, while remaining a regular user-selected PDF flow. `.chromatics` projects and MusicXML are not presented as PDFs or supported import inputs.
- The existing score metadata dialog remains the explicit target-selection step for linked files. It now explains that Play-exported audio is copied to the selected score and that selectable `MP3`, `WAV`, `M4A`, `FLAC`, and `OGG` are not a promise of device codec playback.
- The existing viewer remains responsible for PDF ready state, annotations, retry, page/zoom/crop, undo, practice, and linked-audio playback. No static raster or memory-only annotation path was added.

## Preserved Contracts

- PDF source, app-managed copy, linked-file copy, and metadata remain separate.
- Import success is not announced before metadata persistence succeeds.
- Existing collection assignment, selection/search/filter state, performance and practice routes, page mapping, annotation coordinates, annotation save retry, and R2 document ownership guards are unchanged.
- No filename-based cross-app matching, private-path access, direct audio share receiver, ALAC/OPUS conversion, account, cloud, or direct app launching was added.

## Verification

Executed from `apps/in_c_sheet`:

```sh
dart format lib/main.dart lib/sheet_library_controller.dart lib/sheet_library_store.dart test/sheet_library_controller_test.dart
flutter test test/sheet_library_controller_test.dart test/adoption_pilot_test.dart test/score_annotation_save_contract_test.dart
flutter analyze
```

Focused result: 63 tests passed; `flutter analyze` reported no issues.

The focused controller tests cover PDF and shared-PDF metadata write failure, unchanged visible scores, and guarded managed-copy cleanup. Existing R2 tests cover annotation write failure/retry and real PDFium fixture rendering separately.

## Visual and Device Scope

- Widget coverage includes empty, error, 320px/390px/1024px, 200% text-scale, and light/dark library states through `adoption_pilot_test.dart`.
- No new screenshot is claimed here. R3 wording was checked by widget tests, not iOS store capture.
- Not run: iOS document-open/share provider, cloud-provider download delay, physical stylus/pedal, VoiceOver, actual Studio-to-mobile transfer, and Play-exported audio codec/output-route validation.

## Common Component Impact

No shared API changed. Existing Ddirori state panel, button, dialog/sheet, item, and viewer adapters were composed in the app. A generic cross-service transfer API remains out of scope until two actual consumers share one host contract.

## Remaining Backlog

1. Run the R3 import and first-annotation flow on an iOS candidate with a real Studio-exported PDF.
2. Verify supported linked-audio samples on target output routes; retain codec failures as device QA rather than widening picker promises.
3. Evaluate durable import retry only with a transactional metadata/file recovery design; this change intentionally keeps no unpublished import across app restart.
