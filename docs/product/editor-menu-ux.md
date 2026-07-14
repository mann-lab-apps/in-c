# Editor Menu UX

작성일: 2026-07-14

## Decision

MVP 이후 앱은 Electron native menu와 app 내부 toolbar를 함께 쓴다. native menu는
파일/편집/보기/도움말처럼 운영체제 사용자가 기대하는 명령을 맡고, 악보 입력 도구는
현재처럼 화면 안 toolbar와 inspector에 둔다.

## Proposed Native Menu

| menu | commands |
| --- | --- |
| File | New Score, Open MusicXML, Save MusicXML, Export PDF, Recent Files |
| Edit | Undo, Redo, Copy Range, Paste Range, Clear Selection |
| View | Zoom In, Zoom Out, Reset Zoom, Toggle Sidebar |
| Input | Select Mode, Note Mode, Rest Mode, Tie, Tuplet |
| Help | Keyboard Shortcuts, Release Notes, Report Issue |

## App Toolbar Boundary

Keep high-frequency notation actions in the app toolbar:

- note/rest mode
- duration selection
- dot controls
- tie and tuplet controls
- pitch movement and accidental controls
- measure add/remove
- playback transport and tempo

These commands require visible state and immediate feedback, so hiding them only in
native menus would make the editor slower.

## Accessibility Rules

- Every native menu command needs a matching keyboard shortcut only when it is
  stable and documented.
- App toolbar icon buttons keep `aria-label`, `title`, and disabled state.
- macOS and Windows shortcut differences should follow platform convention.
- Do not add a dense ribbon UI before the design token migration is stable.

## Implementation Order

1. Document current command map and shortcuts.
2. Add Electron native menu for File/Edit/View/Help.
3. Keep notation input actions visible in the toolbar.
4. Add a shortcut help view only after shortcuts are stable.

