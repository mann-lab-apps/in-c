import { globalSwingPlaybackUnavailableReason, type Score } from '../../../score-core'

export const partSwingProjectionSummary = '총보에서 적용되지 않는 스윙은 파트 사본에도 적용하지 않았습니다. 총보와 같은 직선 리듬으로 출력했습니다. 원본 프로젝트의 설정은 유지됩니다.'
export const partSwingProjectionMessagePrefix = 'Part copy omits global swing playback '

// Private export context, not a serializer warning, native field or live-view
// policy. Keep the full score's stored setting; only prepare a derived copy.
export interface StudioPartSwingProjectionWarning {
  code: 'studio-part-swing-projection'
  path: string
  message: string
  summary: string
}

export function preparePartSwingExport(source: Score, projected: Score): {
  score: Score
  warning?: StudioPartSwingProjectionWarning
} {
  if (!source.swingPlayback || !globalSwingPlaybackUnavailableReason(source)) return { score: projected }
  const score = { ...projected }
  delete score.swingPlayback
  return {
    score,
    warning: {
      code: 'studio-part-swing-projection',
      path: 'score.swingPlayback',
      message: `${partSwingProjectionMessagePrefix}(${source.swingPlayback.unit}, ${source.swingPlayback.ratio}) because it cannot apply to the full score. The part copy retains straight rhythm; the original project setting is unchanged.`,
      summary: partSwingProjectionSummary
    }
  }
}
