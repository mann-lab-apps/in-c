import { describe, expect, it } from 'vitest'

import { resolveNotationEventTone } from './visual-state'

describe('notation visual state priority', () => {
  it('keeps selection tone when the selected event is also playing', () => {
    expect(
      resolveNotationEventTone(
        'note-1',
        new Set(['note-1']),
        'note-1',
        'note-1'
      )
    ).toBe('selected')
  })

  it('uses playback tone only when the event is not selected', () => {
    expect(resolveNotationEventTone('note-1', new Set(), undefined, 'note-1')).toBe(
      'playback'
    )
  })

  it('leaves unrelated events in the default tone', () => {
    expect(resolveNotationEventTone('note-1', new Set(), undefined, 'note-2')).toBe(
      'default'
    )
  })
})
