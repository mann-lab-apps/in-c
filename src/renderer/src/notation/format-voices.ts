import VexFlow, { Formatter, StaveNote, type ModifierContext, type Stave, type Voice } from 'vexflow'
import { placeLeadingGraceGroups, placeTrailingGraceGroups } from './trailing-grace-group'

export function formatNotationVoices(voices: readonly Voice[], stave: Stave): void {
  // Empty authored voices remain in the score and draw list. VexFlow's
  // formatter needs at least one tick context; it cannot format an empty bar.
  const populated = voices.filter(voice => voice.getTickables().length > 0)
  if (populated.length) joinNotationVoices(new Formatter(), populated).formatToStave(populated, stave)
}

export function joinNotationVoices(formatter: Formatter, voices: Voice[]): Formatter {
  formatter.joinVoices(voices)
  if (voices.length < 2) return formatter
  placeTrailingGraceGroups(voices)

  const contexts = new Set<ModifierContext>()
  for (const voice of voices) {
    for (const note of voice.getTickables()) {
      const context = note.getModifierContext()
      if (context) contexts.add(context)
    }
  }

  for (const context of contexts) {
    placeLeadingGraceGroups(context)
    const notes = context.getMembers(StaveNote.CATEGORY)
    if (!notes.every(note => note instanceof StaveNote)) continue
    if (notes.length > 2) {
      separateChromaticVoices(context, notes)
      continue
    }
    if (notes.length !== 2) continue
    const [first, second] = notes
    if (first.isRest() || second.isRest() || !first.hasStem() || !second.hasStem()) continue
    const firstKeys = first.getKeys()
    const secondKeys = second.getKeys()
    const secondProps = second.getKeyProps()
    const conflicts = first.getKeyProps().some(({ line }, i) =>
      secondProps.some((key, j) => key.line === line && firstKeys[i] !== secondKeys[j])
    )
    if (!conflicts) continue

    // VexFlow can separate the notes and reserve their width in this onset's
    // modifier context. Its default unison setting compares the notehead glyph,
    // which is identical even when the written pitches differ.
    const unison = VexFlow.UNISON
    try {
      VexFlow.UNISON = false
      context.preFormat()
    } finally {
      VexFlow.UNISON = unison
    }
  }

  return formatter
}

function separateChromaticVoices(context: ModifierContext, notes: StaveNote[]): void {
  const pitched = notes.filter(note => !note.isRest())
  if (pitched.length < 2) return
  const voices = pitched.map(note => {
    const keys = note.getKeys()
    return {
      note,
      heads: note.getKeyProps().map(({ line }, index) => ({ line, key: keys[index] }))
    }
  })
  const conflict = (a: typeof voices[number], b: typeof voices[number]) =>
    a !== b && a.heads.some(first =>
      b.heads.some(second => first.line === second.line && first.key !== second.key)
    )
  if (!voices.some(a => voices.some(b => conflict(a, b)))) return

  // Keep the formatter's stem and accidental arrangement. Its multi-voice
  // pass can put two different pitches in the same notehead column.
  context.preFormat()
  const rests = notes.filter(note => note.isRest() && note.renderOptions.draw !== false)
    .map(note => ({ left: note.getXShift(), right: note.getXShift() + note.getGlyphWidth() }))
    .sort((a, b) => a.left - b.left)
  const placed = voices.map(voice => {
    const left = voice.note.getLeftDisplacedHeadPx()
    return { ...voice, left, right: voice.note.getVoiceShiftWidth() - left }
  }).sort((a, b) => a.note.getXShift() - b.note.getXShift())
  const rightEdge = () => Math.max(...rests.map(rest => rest.right),
    ...placed.map(({ note, right }) => note.getXShift() + right))
  const originalRight = rightEdge()
  placed.forEach((voice, index) => {
    let x = voice.note.getXShift()
    for (const earlier of placed.slice(0, index)) {
      if (conflict(earlier, voice)) x = Math.max(x, earlier.note.getXShift() + earlier.right + voice.left + 2)
    }
    if (x === voice.note.getXShift()) return
    for (const rest of rests) {
      if (x - voice.left < rest.right + 2 && x + voice.right + 2 > rest.left) x = rest.right + voice.left + 2
    }
    voice.note.setXShift(x)
  })
  // TickContext reads this allowance when spacing the following shared beat.
  context.getState().rightShift += rightEdge() - originalRight
}
