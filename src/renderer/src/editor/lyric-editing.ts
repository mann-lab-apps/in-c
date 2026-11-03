import type { LyricSyllable } from '../../../score-core'

export const ambiguousLyricMessage = '절 번호가 중복된 가사는 현재 편집할 수 없습니다. 가사 원문은 그대로 보존됩니다.'

// Missing numbers already mean verse one in the existing edit command. Do not
// infer a migration from the renderer's visual fallback row index.
export function hasAmbiguousLyricVerses(lyrics: readonly LyricSyllable[] | undefined): boolean {
  const verses = new Set<number>()
  for (const lyric of lyrics ?? []) {
    const verse = lyric.number ?? 1
    if (verses.has(verse)) return true
    verses.add(verse)
  }
  return false
}
