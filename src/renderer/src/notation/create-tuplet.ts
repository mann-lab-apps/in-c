import { Tuplet, type StaveNote } from 'vexflow'

export function createNotationTuplet(notes: StaveNote[], options: ConstructorParameters<typeof Tuplet>[1]): Tuplet {
  // The renderer already resolves clef and voice rest positions. VexFlow's
  // constructor aligns every default-line rest to the adjacent pitched note,
  // even when there is no beam over the rest. Keep our existing staff/voice
  // placement while retaining the normal tuplet attachment and rhythm.
  const rests = notes.filter(note => note.isRest()).map(note => ({
    note, lines: note.getKeyProps().map(key => key.line)
  }))
  const tuplet = new Tuplet(notes, options)
  for (const { note, lines } of rests) lines.forEach((line, index) => {
    if (note.getKeyProps()[index]!.line !== line) note.setKeyLine(index, line)
  })
  return tuplet
}
