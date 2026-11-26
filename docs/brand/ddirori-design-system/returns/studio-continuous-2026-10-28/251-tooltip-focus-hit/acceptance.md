#251 - focus-only Tooltip pointer interception

250 native new-score QA fails before first File menu action. pointer.jsonl shows File's coordinate owner is role=tooltip, text=N note-entry guidance. The Tooltip contract C30 forbids actions inside and uses text:string, but hover guidance must keep its existing hover/read behavior. Fix focus-only tooltip hit interception in the public implementation/styles; do not add Studio CSS overrides or remove guidance. Keep hover-open hit/reading behavior, disabled hover, Escape/focus and aria-describedby. API signature/defaults unchanged; no new props or migration.

Actual consumers: StudioNoteToolbar note-entry control and StudioPlayback transport controls. Record source/API before-after and impact: React/Electron only, Flutter native Tooltip unchanged; no color/token or minimum-version change. Add public-style focus-vs-hover regression and native first-click hit-test. Historical manifests/API snapshots are not regenerated.

Final scope: native hover-open case also intercepted File, so focus-only proposal was insufficient. All text tooltips pass clicks through while geometry tracking retains hover/read semantics. No public signature/default change; common-impact.json compares the frozen API signature.
