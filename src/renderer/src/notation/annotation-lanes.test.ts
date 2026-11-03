import { describe, expect, it } from 'vitest'

import {
  createDuration,
  createMeasure,
  createNote,
  createTimePosition,
  createVoice
} from '../../../score-core'
import {
  countMeasureLyricLines,
  resolveAnnotationVerticalExtension,
  resolveAnnotationSystemTop,
  resolveHairpinSpanYOffset,
  resolveSlurSideForAnnotationLanes,
  resolveMeasureAnnotationLanes
} from './annotation-lanes'

describe('annotation lanes', () => {
  it('reserves measured dynamic displacement before downstream automatic hairpins and expression text',()=>{
    const base={hasDynamic:true,hasHairpin:true,expressionTextCount:1}
    const normal=resolveMeasureAnnotationLanes(base),shifted=resolveMeasureAnnotationLanes({...base,dynamicExtraSpacing:48})
    expect(shifted.dynamicMarkYOffset).toBe(normal.dynamicMarkYOffset!+48)
    expect(shifted.hairpinYOffset).toBe(normal.hairpinYOffset!+48)
    expect(shifted.expressionTextYOffsets[0]).toBe(normal.expressionTextYOffsets[0]+48)
    expect(shifted.requiredAbove).toBe(normal.requiredAbove)
    expect(resolveMeasureAnnotationLanes(base)).toEqual(normal)
  })
  it('does not reserve a measured dynamic offset on measures without dynamics',()=>{
    const base={hasHairpin:true,expressionTextCount:1}
    expect(resolveMeasureAnnotationLanes({...base,dynamicExtraSpacing:48})).toEqual(resolveMeasureAnnotationLanes(base))
  })

  it('reserves measured lyric displacement below the staff before automatic dynamics, hairpins and text', () => {
    const input = { lyricLineCount: 2, hasDynamic: true, hasHairpin: true, expressionTextCount: 1, lyricExtraSpacing: 13.21 }
    const normal = resolveMeasureAnnotationLanes({ ...input, lyricExtraSpacing: 0 })
    const shifted = resolveMeasureAnnotationLanes(input)
    expect(shifted.dynamicMarkYOffset).toBeCloseTo(normal.dynamicMarkYOffset! + 13.21)
    expect(shifted.hairpinYOffset).toBeCloseTo(normal.hairpinYOffset! + 13.21)
    expect(shifted.expressionTextYOffsets[0]).toBeCloseTo(normal.expressionTextYOffsets[0] + 13.21)
    expect(shifted.requiredAbove).toBe(normal.requiredAbove)
  })

  it('ignores unavailable lyric displacement and never reserves it for absent lyrics', () => {
    const base = { lyricLineCount: 2, hasDynamic: true }
    for (const lyricExtraSpacing of [-1, NaN, Infinity]) expect(resolveMeasureAnnotationLanes({ ...base, lyricExtraSpacing })).toEqual(resolveMeasureAnnotationLanes(base))
    const empty = { hasDynamic: true, lyricExtraSpacing: 40 }
    expect(resolveMeasureAnnotationLanes(empty)).toEqual(resolveMeasureAnnotationLanes({ hasDynamic: true }))
  })
  it('reserves header space and tempo lanes above rehearsal and system text even without harmonies', () => {
    const lanes = resolveMeasureAnnotationLanes({
      hasRehearsalMark: true,
      systemTextCount: 2,
      tempoCount: 2
    })
    expect(lanes.rehearsalMarkYOffset).toBeLessThan(lanes.systemTextYOffsets[0]!)
    expect(lanes.tempoYOffsets[0]).toBeLessThan(lanes.rehearsalMarkYOffset! - 12)
    expect(lanes.tempoYOffsets[0]! - lanes.tempoYOffsets[1]!).toBe(24)
    const top = resolveAnnotationSystemTop(72, [lanes], true)
    expect(top - lanes.requiredAbove).toBeGreaterThanOrEqual(60)
    expect(resolveAnnotationSystemTop(72, [resolveMeasureAnnotationLanes({})], false)).toBe(72)
  })

  it('layout.annotation-lanes keeps lower marks below lyrics without collisions', () => {
    const lanes = resolveMeasureAnnotationLanes({
      expressionTextCount: 1,
      hasDynamic: true,
      hasHairpin: true,
      lyricLineCount: 2
    })

    expect(lanes.dynamicMarkYOffset).toBeGreaterThan(145)
    expect(lanes.hairpinYOffset).toBeGreaterThan(lanes.dynamicMarkYOffset!)
    expect(lanes.expressionTextYOffsets[0]).toBeGreaterThan(
      lanes.hairpinYOffset!
    )
    expect(lanes.requiredBelow).toBeGreaterThan(154)
  })

  it('layout.annotation-lanes stacks upper text, rehearsal marks, harmonies, and staff text', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 1,
      hasRehearsalMark: true,
      hasStaffText: true,
      systemTextCount: 2
    })

    expect(lanes.systemTextYOffsets).toEqual([-100, -84])
    expect(lanes.rehearsalMarkYOffset).toBe(-144)
    expect(lanes.harmonyMarkYOffsets).toEqual([-30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(lanes.requiredAbove).toBeGreaterThan(100)
  })

  it.each([2,4])('layout.annotation-lanes reserves every staff-text row with dense upper annotations (%s)',count=>{
    const lanes=resolveMeasureAnnotationLanes({staffTextCount:count,harmonyCount:2,systemTextCount:2,hasRehearsalMark:true})
    expect(lanes.staffTextYOffsets).toHaveLength(count)
    const rows=lanes.staffTextYOffsets!
    for(let index=1;index<rows.length;index++)expect(rows[index]-rows[index-1]).toBeGreaterThanOrEqual(16)
    expect(Math.max(...lanes.harmonyMarkYOffsets)).toBeLessThanOrEqual(rows[0]-16)
    expect(Math.max(...lanes.systemTextYOffsets)).toBeLessThanOrEqual(Math.min(...lanes.harmonyMarkYOffsets,...rows)-16)
    expect(lanes.requiredAbove).toBeGreaterThanOrEqual(-Math.min(...rows,...lanes.systemTextYOffsets))
  })

  it('layout.annotation-lanes keeps dense chord symbols from colliding with staff text', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 2,
      hasRehearsalMark: true,
      hasStaffText: true
    })

    expect(lanes.rehearsalMarkYOffset).toBe(-90)
    expect(lanes.harmonyMarkYOffsets).toEqual([-46, -30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(new Set([
      lanes.rehearsalMarkYOffset,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset
    ])).toHaveLength(4)
    expect(
      lanes.harmonyMarkYOffsets[1] - lanes.harmonyMarkYOffsets[0]
    ).toBeGreaterThanOrEqual(16)
    expect(
      lanes.staffTextYOffset! - lanes.harmonyMarkYOffsets[1]
    ).toBeGreaterThanOrEqual(16)
  })

  it('layout.annotation-lanes raises rehearsal marks for very dense chord symbol lanes', () => {
    const lanes = resolveMeasureAnnotationLanes({
      harmonyCount: 3,
      hasRehearsalMark: true,
      hasStaffText: true
    })

    expect(lanes.rehearsalMarkYOffset).toBe(-106)
    expect(lanes.harmonyMarkYOffsets).toEqual([-62, -46, -30])
    expect(lanes.staffTextYOffset).toBe(-14)
    expect(new Set([
      lanes.rehearsalMarkYOffset,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset
    ])).toHaveLength(5)
    expect(
      lanes.harmonyMarkYOffsets[0] - lanes.rehearsalMarkYOffset!
    ).toBeGreaterThanOrEqual(16)
    expect(
      lanes.staffTextYOffset! - lanes.harmonyMarkYOffsets.at(-1)!
    ).toBeGreaterThanOrEqual(16)
  })

  it('layout.annotation-lanes reports extra system space for dense annotations', () => {
    const extension = resolveAnnotationVerticalExtension([
      resolveMeasureAnnotationLanes({
        expressionTextCount: 2,
        hasDynamic: true,
        hasHairpin: true,
        lyricLineCount: 3
      }),
      resolveMeasureAnnotationLanes({
        systemTextCount: 2
      })
    ])

    expect(extension.above).toBeGreaterThan(0)
    expect(extension.below).toBeGreaterThan(0)
  })

  it('layout.annotation-lanes covers a dense solo collision fixture across upper and lower objects', () => {
    const lanes = resolveMeasureAnnotationLanes({
      expressionTextCount: 2,
      harmonyCount: 3,
      hasDynamic: true,
      hasHairpin: true,
      hasRehearsalMark: true,
      hasStaffText: true,
      lyricLineCount: 3,
      systemTextCount: 2
    })

    const upperOffsets = [
      ...lanes.systemTextYOffsets,
      lanes.rehearsalMarkYOffset!,
      ...lanes.harmonyMarkYOffsets,
      lanes.staffTextYOffset!
    ].sort((left, right) => left - right)
    const lowerOffsets = [
      lanes.dynamicMarkYOffset!,
      lanes.hairpinYOffset!,
      ...lanes.expressionTextYOffsets
    ]

    expect(upperOffsets).toEqual([-144, -100, -84, -62, -46, -30, -14])
    expect(
      upperOffsets.every(
        (offset, index) => index === 0 || offset - upperOffsets[index - 1]! >= 16
      )
    ).toBe(true)
    expect(
      lowerOffsets.every(
        (offset, index) => index === 0 || offset - lowerOffsets[index - 1]! >= 20
      )
    ).toBe(true)
    expect(lanes.dynamicMarkYOffset).toBeGreaterThan(175)
    expect(lanes.hairpinYOffset).toBeGreaterThan(lanes.dynamicMarkYOffset!)
    expect(lanes.expressionTextYOffsets[0]).toBeGreaterThan(
      lanes.hairpinYOffset!
    )
    expect(lanes.requiredAbove).toBeGreaterThan(100)
    expect(lanes.requiredBelow).toBeGreaterThan(220)
  })

  it('layout.annotation-lanes keeps long hairpins below lyrics and dynamics across the span', () => {
    const sparseStart = resolveMeasureAnnotationLanes({
      hasHairpin: true
    })
    const denseEnd = resolveMeasureAnnotationLanes({
      hasDynamic: true,
      hasHairpin: true,
      lyricLineCount: 2
    })

    expect(resolveHairpinSpanYOffset([sparseStart, denseEnd])).toBe(
      denseEnd.hairpinYOffset
    )
    expect(denseEnd.hairpinYOffset).toBeGreaterThan(
      denseEnd.dynamicMarkYOffset!
    )
    expect(denseEnd.hairpinYOffset).toBeGreaterThan(175)
  })

  it('layout.annotation-lanes moves lower slurs away from lyric/dynamic lanes', () => {
    const lowerAnnotations = resolveMeasureAnnotationLanes({
      expressionTextCount: 1,
      hasDynamic: true,
      lyricLineCount: 1
    })

    expect(
      resolveSlurSideForAnnotationLanes('below', [lowerAnnotations])
    ).toBe('above')
    expect(resolveSlurSideForAnnotationLanes('below', [])).toBe('below')
    expect(
      resolveSlurSideForAnnotationLanes('above', [lowerAnnotations])
    ).toBe('above')
  })

  it('layout.annotation-lanes counts the deepest lyric verse in a measure', () => {
    const measure = createMeasure({
      voices: [
        createVoice({
          events: [
            createNote({
              id: 'lyric-note',
              position: createTimePosition(0),
              pitch: { step: 'C', octave: 4 },
              duration: createDuration('quarter'),
              lyrics: [
                { number: 1, text: 'la' },
                { number: 3, text: 'da' }
              ]
            })
          ]
        })
      ]
    })

    expect(countMeasureLyricLines(measure)).toBe(3)
  })
})

it('keeps chord symbols at different onsets on the same row',()=>{
  const lanes=resolveMeasureAnnotationLanes({harmonyCount:2,harmonyTicks:[0,26880],hasStaffText:true})
  expect(lanes.harmonyMarkYOffsets).toEqual([-30,-30])
})
it('stacks simultaneous chords while retaining mixed array identity and rehearsal clearance',()=>{
  const ticks=Object.freeze([26880,0,0]),before=[...ticks]
  const lanes=resolveMeasureAnnotationLanes({harmonyCount:3,harmonyTicks:ticks,hasStaffText:true,hasRehearsalMark:true})
  expect(lanes.harmonyMarkYOffsets).toEqual([-30,-46,-30])
  expect(lanes.rehearsalMarkYOffset).toBeLessThanOrEqual(Math.min(...lanes.harmonyMarkYOffsets)-44)
  expect(ticks).toEqual(before)
})
it('retains the existing vertical stack for coincident chord symbols',()=>{
  expect(resolveMeasureAnnotationLanes({harmonyCount:2,harmonyTicks:[0,0],hasStaffText:true}).harmonyMarkYOffsets).toEqual([-46,-30])
})

it.each([2,4])('reserves every rehearsal frame above the existing dense upper stack (%s)',count=>{
  const input={staffTextCount:2,harmonyCount:2,systemTextCount:2,hasRehearsalMark:true,tempoCount:1}
  const single=resolveMeasureAnnotationLanes(input)
  const lanes=resolveMeasureAnnotationLanes({...input,rehearsalMarkCount:count})
  expect(lanes.rehearsalMarkYOffsets).toHaveLength(count)
  expect(lanes.rehearsalMarkYOffsets?.at(-1)).toBe(single.rehearsalMarkYOffset)
  const offsets=lanes.rehearsalMarkYOffsets!
  for(let index=1;index<offsets.length;index++)expect(offsets[index]-offsets[index-1]).toBeGreaterThanOrEqual(28)
  expect(lanes.requiredAbove).toBeGreaterThanOrEqual(-offsets[0])
  expect(lanes.tempoYOffsets[0]).toBeLessThanOrEqual(offsets[0]-16)
  expect(lanes.systemTextYOffsets).toEqual(single.systemTextYOffsets)
  expect(lanes.harmonyMarkYOffsets).toEqual(single.harmonyMarkYOffsets)
  expect(lanes.staffTextYOffsets).toEqual(single.staffTextYOffsets)
})


it.each([1,2,4])('staff-text-only stack keeps the full rehearsal frame above every staff baseline (%s)',staffTextCount=>{
  const lanes=resolveMeasureAnnotationLanes({staffTextCount,rehearsalMarkCount:2})
  const firstBaseline=Math.min(...lanes.staffTextYOffsets!)
  // Match the existing 24px frame plus 20px baseline clearance used for chords.
  expect(lanes.rehearsalMarkYOffsets!.at(-1)!+24).toBeLessThanOrEqual(firstBaseline-20)
  expect(lanes.requiredAbove).toBeGreaterThanOrEqual(-Math.min(...lanes.rehearsalMarkYOffsets!))
  expect(lanes.staffTextYOffsets).toEqual(resolveMeasureAnnotationLanes({staffTextCount}).staffTextYOffsets)
})
