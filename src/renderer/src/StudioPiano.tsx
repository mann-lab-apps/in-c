import { Checkbox, IconButton, Text, Tooltip } from '@ddirori/ui'
import { Volume2 } from 'lucide-react'
import './studio-piano.css'

export function StudioPiano({ theme, state, progress, error, sustain, onSustain,
  natural, onNatural, preparing, onPreview, playing }: {
  theme: 'light' | 'dark'
  state: 'idle' | 'loading' | 'ready' | 'error'
  progress: number
  error: string
  sustain: boolean
  onSustain: (down: boolean) => void
  natural: boolean
  onNatural: (enabled: boolean) => void
  preparing: boolean
  onPreview: () => void
  playing: boolean
}) {
  return <section className="studio-piano ddirori" data-theme={theme} data-density="compact"
    aria-label="피아노 음색" onKeyDown={e => { if (e.key === ' ') e.stopPropagation() }}>
    <Text variant="caption" role="status">{state === 'loading'
      ? `피아노 준비 중 ${Math.round(progress * 100)}%` : state === 'ready' ? '그랜드 피아노' : '피아노'}</Text>
    <Tooltip text="피아노 음색 들어보기"><IconButton label="피아노 음색 들어보기"
      disabled={state === 'loading' || playing} onClick={onPreview}><Volume2 size={18} /></IconButton></Tooltip>
    <Checkbox label="수동 서스테인 페달" aria-description="켜면 악보의 페달 재생에 더해 수동 페달을 누른 상태로 유지합니다." checked={sustain} onChange={e => onSustain(e.target.checked)} />
    <Checkbox label="자연스러운 연주 (시험)" checked={natural} onChange={e => onNatural(e.target.checked)} />
    {preparing && <Text variant="caption" role="status">연주 표현 준비 중</Text>}
    <details className="studio-piano__credits"><summary>음원 정보</summary>
      <p>Salamander Grand Piano V3 — Alexander Holm. SFZ 배포·매핑: kinwie.</p>
      <p>실제 녹음 4개 세기 층을 선택해 32kHz OGG로 변환했습니다. 최대 12초, 끝부분 fade를 적용했습니다.</p>
      <a href="https://github.com/sfzinstruments/SalamanderGrandPiano" target="_blank" rel="noreferrer">원본과 크레딧</a>{' · '}
      <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>
    </details>
    {error && <Text variant="caption" role="alert">{error} 재생을 눌러 다시 시도할 수 있습니다.</Text>}
  </section>
}
