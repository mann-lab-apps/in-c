import { describe, expect, it, vi } from 'vitest'

import {
  hasUnsavedScoreChanges,
  markBeforeUnloadWhenUnsaved,
  shouldReplaceCurrentScore,
  toFileName,
  unsavedScoreChangesMessage
} from './file-lifecycle'

describe('file lifecycle guards', () => {
  it.each(['CON','PRN','AUX','NUL',...Array.from({length:9},(_,i)=>`COM${i+1}`),...Array.from({length:9},(_,i)=>`LPT${i+1}`),'COM¹','COM²','COM³','LPT¹','LPT²','LPT³'])('uses a portable suggestion for the reserved device title %s',title=>{
    expect(toFileName(title)).toBe('score-'+title.normalize('NFKC').toLowerCase())
    for(const extension of ['.chromatics','.musicxml','.mid','.pdf'])expect(toFileName(title)+extension).not.toMatch(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])\./i)
  })
  it.each(['com0','com10','lpt0','lpt10','con-certo','auxiliary','nul-notes'])('keeps the nonreserved canonical name %s',title=>expect(toFileName(title)).toBe(title))

  it.each(['LongCompositionTitle'.repeat(30), '긴악보제목'.repeat(100), '𐐀'.repeat(100)])('bounds the suggested filename for a long title without changing the title', title => {
    const before = title, stem = toFileName(title)
    expect(new TextEncoder().encode(stem + '.chromatics').length).toBeLessThanOrEqual(255)
    expect(stem).toMatch(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u)
    expect(title).toBe(before)
  })

  it('does not leave a truncated separator or split a Unicode code point at the filename boundary', () => {
    const stem = toFileName('a'.repeat(239) + '-𐐀')
    expect(stem).toBe('a'.repeat(239))
    expect(stem).not.toMatch(/\p{Surrogate}/u)
  })

  it('keeps ordinary canonical names and the existing empty-name fallback', () => {
    expect(toFileName('  Café / 악보. #1  ')).toBe('café-악보-1')
    expect(toFileName('***')).toBe('untitled-score')
  })
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
