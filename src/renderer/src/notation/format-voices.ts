import { Formatter, type Stave, type Voice } from 'vexflow'

export function formatNotationVoices(voices: readonly Voice[], stave: Stave): void {
  // Empty authored voices remain in the score and draw list. VexFlow's
  // formatter needs at least one tick context; it cannot format an empty bar.
  const populated = voices.filter(voice => voice.getTickables().length > 0)
  if (populated.length) new Formatter().joinVoices(populated).formatToStave(populated, stave)
}
