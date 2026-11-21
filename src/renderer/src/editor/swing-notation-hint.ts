import type { Score } from '../../../score-core'

// Default rhythmFeel is drawn as a 2:1 triplet glyph. A custom text cue has
// no numeric ratio contract; never infer one or rewrite the source marking.
export function getSwingNotationHint(notation: Score['rhythmFeel'], playback: Score['swingPlayback'], unavailable = false): string | undefined {
  const unit = (value: 'eighth' | '16th') => value === 'eighth' ? '8분' : '16분'
  if (!playback) {
    if (!notation) return undefined
    return notation.text
      ? '리듬 해석 문구를 사용 중이지만 실제 스윙 재생은 꺼져 있습니다.'
      : `악보의 ${unit(notation.unit)} · 2:1 표기와 별개로 실제 스윙 재생은 꺼져 있습니다.`
  }
  const performed = `${unit(playback.unit)} · ${playback.ratio}`
  if (unavailable) return `저장된 스윙 재생 설정은 ${performed}입니다. 현재 악보에서는 적용되지 않으며 표기는 그대로 유지됩니다.`
  if (!notation) return `실제 스윙 재생은 ${performed}입니다. 악보에 리듬 해석 표기를 자동으로 추가하지 않습니다.`
  if (notation.text) return `실제 스윙 재생은 ${performed}입니다. 원본 리듬 해석 문구의 비율은 자동으로 해석하지 않습니다.`
  if (notation.unit === playback.unit && playback.ratio === '2:1') return undefined
  return `악보 표기는 ${unit(notation.unit)} · 2:1, 실제 재생은 ${performed}입니다. 두 설정은 자동으로 맞춰지지 않습니다.`
}
