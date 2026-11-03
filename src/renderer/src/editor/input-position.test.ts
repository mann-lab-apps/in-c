import { describe, expect, it } from 'vitest'
import { createDuration, createMeasure, createPart, createScore, createStaff, TICKS_PER_QUARTER as quarter } from '../../../score-core'
import { describeInputPosition } from './input-position'
import { beginTupletInput, createNoteInputState } from './note-input-state'

const target = { partId: 'part-1', staffId: 'staff-1', measureId: 'measure-1', voiceId: 'voice-1' }
const state = (tick: number) => createNoteInputState({ target, tick, duration: createDuration('eighth'), mode: 'note' })

describe('Studio input position readout', () => {
  it.each([
    { beats: 4, beatType: 4, tick: 0, label: '1마디 · 1박 (4분음표 기준)' },
    { beats: 4, beatType: 4, tick: quarter, label: '1마디 · 2박 (4분음표 기준)' },
    { beats: 4, beatType: 4, tick: quarter * 1.5, label: '1마디 · 2+1/2박 (4분음표 기준)' },
    { beats: 4, beatType: 4, tick: quarter / 3, label: '1마디 · 1+1/3박 (4분음표 기준)' },
    { beats: 4, beatType: 4, tick: quarter / 16, label: '1마디 · 1+1/16박 (4분음표 기준)' },
    { beats: 6, beatType: 8, tick: quarter * 1.5, label: '1마디 · 4박 (8분음표 기준)' },
    { beats: 2, beatType: 2, tick: quarter, label: '1마디 · 1+1/2박 (2분음표 기준)' },
    { beats: 1, beatType: 1, tick: quarter, label: '1마디 · 1+1/4박 (온음표 기준)' },
    { beats: 4, beatType: 4, tick: quarter * 4, label: '1마디 · 끝' }
  ])('uses written $beats/$beatType units for tick $tick without rounding or changing the model', ({ beats, beatType, tick, label }) => {
    const score = createScore(), input = state(tick)
    score.parts[0].staves[0].measures[0].timeSignature = { beats, beatType }
    const before = structuredClone({ score, input })
    expect(describeInputPosition(score, input)).toBe(label)
    expect({ score, input }).toEqual(before)
  })

  it('labels a pickup relative to its actual beginning and ends at its shortened duration', () => {
    const score = createScore()
    score.parts[0].staves[0].measures[0].timing = { type: 'pickup', durationTicks: quarter }
    expect(describeInputPosition(score, state(0))).toBe('못갖춘 1마디 · 1박 (4분음표 기준)')
    expect(describeInputPosition(score, state(quarter / 2))).toBe('못갖춘 1마디 · 1+1/2박 (4분음표 기준)')
    expect(describeInputPosition(score, state(quarter))).toBe('못갖춘 1마디 · 끝')
  })

  it('keeps a staged tuplet anchor explicit instead of pretending it is the next member position', () => {
    const score = createScore(), input = beginTupletInput(state(quarter), 'group')!
    input.tupletInput!.members.push({ mode: 'note', step: 'C', duration: createDuration('eighth') })
    const before = structuredClone({ score, input })
    expect(describeInputPosition(score, input)).toBe('1마디 · 묶음 시작 2박 (4분음표 기준)')
    expect({ score, input }).toEqual(before)
  })

  it('resolves a shared measure ID in the active part/staff instead of the first match', () => {
    const score = createScore()
    score.parts.push(createPart({ id: 'part-2', staves: [createStaff({ measures: [createMeasure({ timeSignature: { beats: 6, beatType: 8 } })] })] }))
    const input = state(quarter); input.target = { ...target, partId: 'part-2' }
    expect(describeInputPosition(score, input)).toBe('1마디 · 3박 (8분음표 기준)')
    input.target.staffId = 'missing-staff'
    expect(describeInputPosition(score, input)).toBeUndefined()
  })

  it('omits an absent or stale input position rather than displaying raw internal coordinates', () => {
    const score = createScore()
    expect(describeInputPosition(score)).toBeUndefined()
    for (const tick of [-1, 0.5, NaN, quarter * 5]) expect(describeInputPosition(score, state(tick))).toBeUndefined()
    const input = state(0); input.target.measureId = 'removed'
    expect(describeInputPosition(score, input)).toBeUndefined()
  })
})
