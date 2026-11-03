# Studio release follow-up before alpha.38

No new tag is created until the remaining alpha.37 sibling jobs and the targeted Linux package check have been reviewed. The original failed tags and evidence remain unchanged.

The macOS failure counts `scrollIntoView`, not file saves. The test previously replaced RAF/cancellation after mounting the App, leaving already-scheduled native frames outside its map. Its scheduler now controls both window/global APIs before import/mount and restores them after cleanup. All five existing scenarios pass on the unchanged product renderer; expected counts and score/save assertions are retained. No product scroll-handler change is justified by this probe.

Linux passed the full suite, built its AppImage and passed artifact checks, then the hidden-window packaged smoke hit the original 20-second deadline without completion. The smoke-only window is now shown inactive before checks, requires actual page visibility and emits compact phase logs. Regular application window behavior and every native/PDF/MIDI/backup/undo assertion are unchanged. The timeout is not increased.

The existing Release workflow gains a separate `tag=preflight` dispatch path for a selected source branch. That job only builds/runs the Linux package and never publishes. Normal tag/PR packaging gates still run the complete suite and artifact/native checks. This isolates the observed Linux failure before spending another release tag. Diagnostic preflight success is not a full release or cross-platform PASS.
