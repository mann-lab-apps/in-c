# Project Layout

The app is split by responsibility rather than by framework layer alone.

- `src/main` owns native desktop concerns such as windows, menus, files, and app lifecycle.
- `src/preload` exposes a narrow, typed API to the renderer through Electron's context bridge.
- `src/renderer` owns the visible editor UI.
- `src/score-core` owns the score model, editing commands, validation, and undoable mutations.
- `src/engraving` translates score data into renderer-specific notation output.
- `src/playback` translates score data into timed playback events.
- `src/io` imports and exports external file formats.

The most important rule is that `score-core` must not depend on Electron or a specific engraving library.
