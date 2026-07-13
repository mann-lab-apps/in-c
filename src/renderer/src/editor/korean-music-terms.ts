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
  breathMark: '숨표',
  caesura: '중지표'
} as const

export const articulationTermOptions: Array<{
  label: string
  value: Articulation
}> = [
  { label: koreanMusicTerms.staccato, value: 'staccato' },
  { label: koreanMusicTerms.accent, value: 'accent' }
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
