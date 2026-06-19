# MVP Decisions

- Start with a desktop Electron application.
- Keep the notation domain model independent from any rendering library.
- Keep MuseScore outside this repository and use it only as a reference.
- Target MusicXML import/export as the first interchange format.
- Begin with single-part common Western notation before expanding to advanced engraving.

## Initial Scope

- Open a MusicXML file.
- Render the score.
- Select notes and rests.
- Edit pitch and duration.
- Add and remove measures.
- Save or export MusicXML.
- Provide simple playback with a visible cursor.
