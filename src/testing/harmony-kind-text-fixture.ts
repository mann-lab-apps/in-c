import { createHarmonyDegreeFixture } from './harmony-degree-fixture'

// Owned standard-kind input; labels are explicit expectations, not parsed oracles.
export const harmonyKindTextCases = [
  { id: 'empty-major', root: '<root-step>C</root-step>', kind: 'major', text: '', bass: '', expected: 'C' },
  { id: 'minor', root: '<root-step>D</root-step>', kind: 'minor', text: 'm', bass: '', expected: 'Dm' },
  { id: 'dominant-bass', root: '<root-step>B</root-step><root-alter>-1</root-alter>', kind: 'dominant', text: '7', bass: '<bass><bass-step>F</bass-step><bass-alter>1</bass-alter></bass>', expected: 'Bb7/F#' },
  { id: 'major-seventh-bass', root: '<root-step>C</root-step>', kind: 'major-seventh', text: 'maj7', bass: '<bass><bass-step>G</bass-step></bass>', expected: 'Cmaj7/G' },
  { id: 'minor-seventh', root: '<root-step>A</root-step>', kind: 'minor-seventh', text: 'm7', bass: '', expected: 'Am7' },
  { id: 'diminished', root: '<root-step>B</root-step>', kind: 'diminished', text: 'dim', bass: '', expected: 'Bdim' },
  { id: 'suspended-fourth', root: '<root-step>F</root-step>', kind: 'suspended-fourth', text: 'sus4', bass: '', expected: 'Fsus4' },
  { id: 'legacy', root: '<root-step>C</root-step>', kind: 'major-seventh', text: 'Cmaj7/G', bass: '<bass><bass-step>G</bass-step></bass>', expected: 'Cmaj7/G' },
  { id: 'opaque', root: '<root-step>C</root-step>', kind: 'other', text: 'Original analysis', bass: '', expected: 'Original analysis' },
  { id: 'mismatch', root: '<root-step>C</root-step>', kind: 'dominant', text: 'm', bass: '', expected: 'm' },
  { id: 'relative', root: '', kind: 'dominant', text: 'V7', bass: '', expected: 'V7' },
  { id: 'unknown', root: '<root-step>C</root-step>', kind: 'Tristan', text: 'm', bass: '', expected: 'm' }
] as const
export type HarmonyKindTextFixtureKind = typeof harmonyKindTextCases[number]['id']
export function createHarmonyKindTextFixture(id: HarmonyKindTextFixtureKind): string {
  const entry = harmonyKindTextCases.find(item => item.id === id)!
  return createHarmonyDegreeFixture('control')
    .replace('코드 구성음 보존 조사', '코드 종류 접미사 조사')
    .replace('<root><root-step>C</root-step></root>', entry.root ? `<root>${entry.root}</root>` : '<function>V</function>')
    .replace('<kind>dominant</kind>', `<kind text="${entry.text}">${entry.kind}</kind>${entry.bass}`)
}
