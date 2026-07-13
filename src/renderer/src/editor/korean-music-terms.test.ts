import { describe, expect, it } from 'vitest'

import {
  articulationTermOptions,
  avoidedEnglishMusicTerms,
  breathMarkTermOptions,
  koreanMusicTerms
} from './korean-music-terms'

describe('korean music UI terms', () => {
  it('keeps primary editor music terms in Korean', () => {
    expect(koreanMusicTerms).toMatchObject({
      expressiveSymbols: '표현 기호',
      rehearsalMark: '연습표',
      staffText: '보표 글자',
      dynamics: '셈여림',
      tempo: '빠르기',
      fermata: '페르마타',
      staccato: '스타카토',
      accent: '악센트',
      breathMark: '숨표',
      caesura: '중지표'
    })
  })

  it('uses Korean labels for symbol option controls', () => {
    expect(articulationTermOptions.map((option) => option.label)).toEqual([
      '스타카토',
      '악센트'
    ])
    expect(breathMarkTermOptions.map((option) => option.label)).toEqual([
      '숨표',
      '중지표'
    ])
  })

  it('does not expose avoided English music terms through the Korean term list', () => {
    const visibleTerms = [
      ...Object.values(koreanMusicTerms),
      ...articulationTermOptions.map((option) => option.label),
      ...breathMarkTermOptions.map((option) => option.label)
    ]
      .join(' ')
      .toLocaleLowerCase()

    for (const englishTerm of avoidedEnglishMusicTerms) {
      expect(visibleTerms).not.toContain(englishTerm)
    }
  })
})
