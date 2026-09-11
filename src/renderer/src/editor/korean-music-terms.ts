import type { Articulation, BreathMark } from '../../../score-core'

export const koreanMusicTerms = {
  expressiveSymbols: '표현 기호',
  rehearsalMark: '연습표',
  staffText: '보표 글자',
  dynamics: '셈여림',
  tempo: '빠르기',
  fermata: '페르마타',
  staccato: '스타카토',
  accent: '악센트',
  tenuto: '테누토',
  marcato: '마르카토',
  breathMark: '숨표',
  caesura: '중지표'
} as const

export const articulationTermOptions: Array<{
  label: string
  symbol: string
  value: Articulation
}> = [
  { label: koreanMusicTerms.staccato, symbol: '•', value: 'staccato' },
  { label: koreanMusicTerms.accent, symbol: '>', value: 'accent' },
  { label: koreanMusicTerms.tenuto, symbol: '−', value: 'tenuto' },
  { label: koreanMusicTerms.marcato, symbol: '^', value: 'marcato' }
]

export const breathMarkTermOptions: Array<{
  label: string
  symbol: string
  value: BreathMark
}> = [
  { label: koreanMusicTerms.breathMark, symbol: ',', value: 'breath' },
  { label: koreanMusicTerms.caesura, symbol: '//', value: 'caesura' }
]

export const avoidedEnglishMusicTerms = [
  'articulation',
  'dynamic',
  'tempo',
  'rehearsal',
  'staff text'
] as const
