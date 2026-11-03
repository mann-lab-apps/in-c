export const unsavedScoreChangesMessage =
  '저장되지 않은 변경사항이 있습니다. 계속하면 현재 악보의 변경사항을 잃을 수 있습니다.'

export function toFileName(title: string): string {
  const normalized = title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '')

  // Keep room for the longest current extension (.chromatics). Bound UTF-8
  // bytes rather than UTF-16 units, and never cut a Unicode code point.
  const encoder = new TextEncoder()
  let stem = '', bytes = 0
  for (const char of normalized) {
    const size = encoder.encode(char).length
    if (bytes + size > 240) break
    stem += char
    bytes += size
  }
  const candidate = stem.replace(/-$/, '') || 'untitled-score'
  // Windows device names stay reserved even with an extension. Apply this
  // after NFKC so COM¹/LPT² receive the same portable suggestion as COM1/LPT2.
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(candidate)
    ? `score-${candidate}`
    : candidate
}

export interface ScoreLifecycleState {
  autosaveRevision: number
}

export interface OpenScoreOptions {
  markDirty?: boolean
}

export const hasUnsavedScoreChanges = ({
  autosaveRevision
}: ScoreLifecycleState): boolean => autosaveRevision > 0

export const shouldReplaceCurrentScore = (
  lifecycle: ScoreLifecycleState,
  confirm: (message: string) => boolean
): boolean => {
  if (!hasUnsavedScoreChanges(lifecycle)) {
    return true
  }

  return confirm(unsavedScoreChangesMessage)
}

export const markBeforeUnloadWhenUnsaved = (
  event: BeforeUnloadEvent,
  lifecycle: ScoreLifecycleState
): boolean => {
  if (!hasUnsavedScoreChanges(lifecycle)) {
    return false
  }

  event.preventDefault()
  event.returnValue = unsavedScoreChangesMessage
  return true
}
