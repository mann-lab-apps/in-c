import { describe, expect, it } from 'vitest'

import { resolveNotationEventTone, sameVoiceLane } from './visual-state'

describe('notation visual state priority', () => {
  it('keeps selection tone when the selected event is also playing', () => {
    expect(
      resolveNotationEventTone(
        'note-1',
        new Set(['note-1']),
        'note-1',
        true
      )
    ).toBe('selected')
  })

  it('playback.cursor-selection-sync uses playback tone only when the event is not selected', () => {
    expect(resolveNotationEventTone('note-1', new Set(), undefined, true)).toBe(
      'playback'
    )
  })

  it('range-selection.same-staff-voice keeps selection tone scoped to the selected voice address', () => {
    expect(
      resolveNotationEventTone(
        'shared-id',
        new Set(['shared-id']),
        undefined,
        false,
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-1'
        },
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-2'
        }
      )
    ).toBe('default')

    expect(
      resolveNotationEventTone(
        'shared-id',
        new Set(['shared-id']),
        undefined,
        false,
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-2'
        },
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-2'
        }
      )
    ).toBe('selected')
  })

  it('range-selection.same-staff-voice allows drag ranges across measures in the same voice lane only', () => {
    expect(
      sameVoiceLane(
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-2'
        },
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-3',
          voiceId: 'voice-2'
        }
      )
    ).toBe(true)

    expect(
      sameVoiceLane(
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-2'
        },
        {
          partId: 'part-1',
          staffId: 'staff-1',
          measureId: 'measure-1',
          voiceId: 'voice-1'
        }
      )
    ).toBe(false)
  })

  it('leaves unrelated events in the default tone', () => {
    expect(resolveNotationEventTone('note-1', new Set(), undefined, false)).toBe(
      'default'
    )
  })
})
