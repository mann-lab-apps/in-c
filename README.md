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

## Development

Install dependencies:

```bash
npm install
```

Run the desktop app in development:

```bash
npm run dev
```

## Verification

```bash
npm test
npm run build
npm run verify:mvp
```

`verify:mvp`는 공통 8마디 단성부 fixture를 Electron에서 열어 desktop과
최소 지원 폭의 SVG 이벤트 매핑을 검사한다.

Check TypeScript:

```bash
npm run typecheck
```

Build the app bundles:

```bash
npm run build
```
