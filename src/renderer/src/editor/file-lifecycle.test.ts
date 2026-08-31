import { describe, expect, it, vi } from 'vitest'

import {
  hasUnsavedScoreChanges,
  markBeforeUnloadWhenUnsaved,
  shouldReplaceCurrentScore,
  unsavedScoreChangesMessage
} from './file-lifecycle'

describe('file lifecycle guards', () => {
  it('treats a zero autosave revision as clean', () => {
    expect(hasUnsavedScoreChanges({ autosaveRevision: 0 })).toBe(false)
  })

  it('treats positive autosave revisions as unsaved changes', () => {
    expect(hasUnsavedScoreChanges({ autosaveRevision: 1 })).toBe(true)
  })

  it('allows score replacement without prompting when the score is clean', () => {
    const confirm = vi.fn(() => false)

    expect(
      shouldReplaceCurrentScore({ autosaveRevision: 0 }, confirm)
    ).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('uses the confirmation decision before replacing an unsaved score', () => {
    const confirm = vi.fn(() => false)

    expect(
      shouldReplaceCurrentScore({ autosaveRevision: 2 }, confirm)
    ).toBe(false)
    expect(confirm).toHaveBeenCalledWith(unsavedScoreChangesMessage)
  })

  it('marks beforeunload events when the score has unsaved changes', () => {
    const event = {
      preventDefault: vi.fn(),
      returnValue: ''
    } as unknown as BeforeUnloadEvent

    expect(
      markBeforeUnloadWhenUnsaved(event, { autosaveRevision: 1 })
    ).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.returnValue).toBe(unsavedScoreChangesMessage)
  })
})
