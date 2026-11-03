import { describe, expect, it } from 'vitest'

import {
  resolveNotationEventTone,
  resolveSameStaffVoicePresentation,
  sameVoiceLane
} from './visual-state'

describe('notation visual state priority', () => {
  it('range-selection.cross-measure resolves each selected event address without widening duplicate IDs', () => {
    const anchor = { partId: 'p', staffId: 's', measureId: 'm1', voiceId: 'v' }
    const end = { ...anchor, measureId: 'm2' }
    const addresses = new Map([['a', anchor], ['b', end]])
    const ids = new Set(['a', 'b'])
    expect(resolveNotationEventTone('a', ids, 'b', false, anchor, anchor, addresses)).toBe('selected')
    expect(resolveNotationEventTone('b', ids, 'b', true, end, anchor, addresses)).toBe('selected')
    for (const unrelated of [
      { ...end, partId: 'other' }, { ...end, staffId: 'lower' },
      { ...end, voiceId: 'other' }, { ...end, measureId: 'm3' }
    ]) expect(resolveNotationEventTone('b', ids, 'b', false, unrelated, anchor, addresses)).toBe('default')
    expect([...addresses]).toEqual([['a', anchor], ['b', end]])
  })

  it('range-selection.cross-measure does not paint an unresolved projected event', () => {
    const address = { partId: 'p', staffId: 's', measureId: 'm1', voiceId: 'v' }
    expect(resolveNotationEventTone('a', new Set(['a']), 'a', false, address, address, new Map())).toBe('default')
  })

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

  it('same-staff.multi-voice-fixture separates voice 1/3 and 2/4 stem and rest lanes', () => {
    expect(resolveSameStaffVoicePresentation('voice-1', 4)).toEqual({
      lane: 'upper',
      restYOffset: -10,
      stemDirection: 1
    })
    expect(resolveSameStaffVoicePresentation('voice-2', 4)).toEqual({
      lane: 'lower',
      restYOffset: 10,
      stemDirection: -1
    })
    expect(resolveSameStaffVoicePresentation('voice-3', 4)).toEqual({
      lane: 'upper-secondary',
      restYOffset: -18,
      stemDirection: 1
    })
    expect(resolveSameStaffVoicePresentation('voice-4', 4)).toEqual({
      lane: 'lower-secondary',
      restYOffset: 18,
      stemDirection: -1
    })
  })

  it('same-staff.multi-voice-fixture keeps single-voice notation on VexFlow automatic stem placement', () => {
    expect(resolveSameStaffVoicePresentation('voice-1', 1)).toEqual({
      lane: 'neutral',
      restYOffset: 0
    })
  })
})
