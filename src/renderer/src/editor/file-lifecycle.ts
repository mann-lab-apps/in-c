export const unsavedScoreChangesMessage =
  '저장되지 않은 변경사항이 있습니다. 계속하면 현재 악보의 변경사항을 잃을 수 있습니다.'

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
