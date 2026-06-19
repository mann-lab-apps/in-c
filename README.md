# in-C

Electron-based notation editor inspired by modern scorewriting workflows.

## Repository Layout

- `src/main`: Electron main process.
- `src/preload`: Secure preload bridge between Electron and the renderer.
- `src/renderer`: Application UI.
- `src/score-core`: Notation domain model and editing commands.
- `src/engraving`: Rendering adapters for notation engines.
- `src/playback`: Playback scheduling and audio integration.
- `src/io`: MusicXML and project file import/export.
- `docs/research`: Reference notes and product decisions.
- `docs/architecture`: Architecture records and technical design notes.

## Reference Boundary

MuseScore is kept outside this repository as a read-only architectural reference:

`../references/musescore`

Do not copy MuseScore source code, assets, generated files, or tests into this project.
