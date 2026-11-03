import { describe, expect, it } from 'vitest'
import {
  TICKS_PER_QUARTER as T, createDuration, createMeasure, createNote, createPart,
  createRest, createScore, createStaff, createTimePosition, createVoice,
  type Rest, type VoiceEvent
} from '../../../score-core'
import { buildTupletGroupCommand } from './editor-state'

const rest = (id: string, tick: number, half = false): Rest => createRest({ id,
  position: createTimePosition(tick), duration: createDuration(half ? 'half' : 'quarter') })
const note = (id: string, tick: number) => createNote({ id,
  position: createTimePosition(tick), pitch: { step: 'C', octave: 4 } })
const markings = [{ fermata: true }, { breathMark: 'caesura' as const }]

describe('tuplet protected rest notation', () => {
  it.each((['create', 'expand', 'compact'] as const).flatMap(mode => markings.map(mark => ({ mode, mark }))))('does not silently consume $mark during $mode', ({ mode, mark }) => {
      const start = mode === 'compact' ? 2 * T : 0
      let events: VoiceEvent[]
      if (mode === 'create') events = [note('member', 0), { ...rest('protected', T), ...mark }, rest('tail', 2 * T, true)]
      else {
        const group = [note('member', start), mode === 'expand' ? note('slot-1', start + T * 2 / 3) : rest('slot-1', start + T * 2 / 3),
          mode === 'expand' ? note('slot-2', start + T * 4 / 3) : { ...rest('protected', start + T * 4 / 3), ...mark }]
        for (const event of group) event.duration = { ...event.duration, tuplet: { actualNotes: 3, normalNotes: 2 } }
        events = mode === 'expand' ? [...group, { ...rest('protected', 2 * T, true), ...mark }] : [rest('before', 0, true), ...group]
      }
      const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [createMeasure({ voices: [createVoice({ events,
        ...(mode !== 'create' ? { tuplets: [{ id: 'group', actualNotes: 3, normalNotes: 2, eventIds: events.filter(e => e.duration.tuplet).map(e => e.id) }] } : {})
      })] })] })] })] }), before = structuredClone(score)
      expect(buildTupletGroupCommand(score, { type: 'event', eventId: 'member' }, () => 'generated')).toBeUndefined()
      expect(score).toEqual(before)
  })
})
