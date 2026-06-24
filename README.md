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

## Packaging

Create an unpacked app for the current operating system and run the packaged
renderer smoke test:

```bash
npm run package:dir
npm run verify:package
```

Native installers and GitHub prereleases are documented in
[`docs/distribution.md`](docs/distribution.md). Release artifacts are unsigned
until macOS and Windows signing credentials are configured.

## Website

The public introduction and download page lives in `site/`.

```bash
npm run site:dev
npm run site:build
```

The page reads `site/download-manifest.json` for prerelease download metadata.
Until the first GitHub Release is published, platform buttons link to the
repository release list instead of nonexistent installer files.
