import { createNotePassFixture } from './note-pass-fixture'

export const notePerformanceCases = ['attack-late', 'attack-early', 'release-late', 'release-early', 'independent', 'secondary', 'explicit-zero', 'control'] as const
export type NotePerformanceCase = typeof notePerformanceCases[number]
export function createNotePerformanceFixture(kind: NotePerformanceCase) {
  const attrs: Record<string, string> = kind === 'control' ? {} : kind === 'explicit-zero' ? { attack: '0', release: '0' }
    : kind === 'independent' ? { attack: '1', release: '-1' }
      : kind.startsWith('release') ? { release: kind.endsWith('early') ? '-1' : '1' } : { attack: kind.endsWith('early') ? '-1' : '1' }
  const plain = createNotePassFixture('control').plain.replaceAll('<divisions>1</divisions>', '<divisions>4</divisions>').replaceAll('<duration>2</duration>', '<duration>8</duration>')
  const owner = kind === 'secondary' ? 2 : 1, needle = '<note><pitch><step>D</step>', index = owner === 1 ? plain.indexOf(needle) : plain.lastIndexOf(needle)
  const attributes = Object.entries(attrs).map(([key, value]) => ` ${key}="${value}"`).join('')
  const xml = plain.slice(0, index) + plain.slice(index).replace(needle, `<note${attributes}><pitch><step>D</step>`)
  return { kind, attrs, owner, eventIndex: 2, xml, plain }
}
