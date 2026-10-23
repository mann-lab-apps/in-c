import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  TICKS_PER_QUARTER,
  createDuration,
  createMeasure,
  createNote,
  createTimePosition,
  createVoice
} from '../../../score-core'
import { parseMusicXml } from '../../../musicxml'
import {
  createSystemLayout,
  leadingNotationPadding,
  pitchStaffLine,
  resolveLeadingNotationVisibility
} from './system-layout'

const releaseQaFixture = readFileSync(
  resolve('src/musicxml/fixtures/release-qa.musicxml'),
  'utf8'
)

describe('system layout', () => {
  it.each([false, true])('uses reserved top space once without losing inter-system clearance (explicit break=%s)', explicit => {
    const measures = [0, 1].map(index => createMeasure({ id: `framed-mark-${index}` }))
    const layout = createSystemLayout(measures, 960, {
      pageHeight: 600, systemHeight: 150, systemTop: 96,
      systemInkBounds: new Map([[0, { top: -62.75, bottom: 80 }], [1, { top: -62.75, bottom: 80 }]]),
      layout: { systemBreakBeforeMeasureIds: [measures[1]!.id],
        ...(explicit ? { pageBreakBeforeMeasureIds: [measures[1]!.id] } : {}) }
    })
    expect(layout.placements[0]!.y).toBe(96)
    expect(layout.placements[1]!.y).toBe(explicit ? 696 : 308.75)
    expect(layout.placements[1]!.y - 62.75 - (layout.placements[0]!.y + 80)).toBeGreaterThanOrEqual(12)
  })

  it('fits measured top ink on an automatic new page without adding the reserved margin twice', () => {
    const measures = [0, 1].map(index => createMeasure({ id: `page-mark-${index}` }))
    const layout = createSystemLayout(measures, 960, {
      pageHeight: 400, systemHeight: 154, systemTop: 96,
      systemInkBounds: new Map([[1, { top: -180, bottom: 80 }]]),
      layout: { systemBreakBeforeMeasureIds: [measures[1]!.id] }
    })
    expect(layout.placements.map(placement => placement.y)).toEqual([96, 592])
    expect(layout.placements[1]!.y - 180).toBe(412)
  })

  it('keeps header clearance when measured top ink exceeds its reserved lane', () => {
    const measures = [createMeasure({ id: 'tall-header-mark' })]
    const before = structuredClone(measures)
    const layout = createSystemLayout(measures, 960, {
      systemTop: 122, topInkPadding: 60,
      systemInkBounds: new Map([[0, { top: -150, bottom: 80 }]])
    })
    expect(layout.placements[0]!.y).toBe(210)
    expect(layout.placements[0]!.y - 150).toBe(60)
    expect(measures).toEqual(before)
  })

  it('does not prepend an empty page when the first system exceeds a page', () => {
    const measures = [createMeasure({ id: 'oversized' })]
    const original = structuredClone(measures)
    const layout = createSystemLayout(measures, 960, {
      pageHeight: 600, systemHeight: 700, systemTop: 72,
      systemInkBounds: new Map([[0, { top: -90, bottom: 760 }]])
    })
    expect(layout.placements[0]!.y).toBe(102)
    expect(layout.height).toBe(874)
    expect(measures).toEqual(original)
  })

  it.each([false, true])('moves an oversized later system only once (explicit break=%s)', explicit => {
    const measures = [createMeasure({ id: 'short' }), createMeasure({ id: 'tall' })]
    const layout = createSystemLayout(measures, 960, {
      pageHeight: 600,
      systemMetrics: new Map([[0, { systemHeight: 150, systemTop: 72 }],
        [1, { systemHeight: 700, systemTop: 72 }]]),
      layout: { systemBreakBeforeMeasureIds: ['tall'],
        ...(explicit ? { pageBreakBeforeMeasureIds: ['tall'] } : {}) }
    })
    expect(layout.placements.map(placement => placement.y)).toEqual([72, 672])
    expect(layout.height).toBe(1372)
  })

  it('paginates each system with its own height and preserves explicit page breaks', () => {
    const measures = [0, 1, 2].map(index => createMeasure({ id: `local-system-${index}` }))
    const systemMetrics = new Map([0, 1, 2].map(index => [index,
      { systemHeight: index === 1 ? 300 : 150, systemTop: 72 }]))
    const layout = { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) }
    const screen = createSystemLayout(measures, 960, { layout, systemMetrics })
    expect(screen.placements.map(placement => placement.y)).toEqual([72, 222, 522])
    expect(screen.height).toBe(672)
    const print = createSystemLayout(measures, 960, { layout, systemMetrics, pageHeight: 600 })
    expect(print.placements.map(placement => placement.y)).toEqual([72, 222, 672])
    expect(print.height).toBe(822)
    const explicit = createSystemLayout(measures, 960, { systemMetrics, pageHeight: 600,
      layout: { ...layout, pageBreakBeforeMeasureIds: [measures[1]!.id] } })
    expect(explicit.placements.map(placement => placement.y)).toEqual([72, 672, 972])
  })

  it.each([false, true])('packs for the densest parallel staff without depending on part order (compact=%s)', compactSpacing => {
    const sparse = createMeasures(4)
    const dense = sparse.map((measure, index) => ({ ...measure, id: `dense-${index}`,
      voices: [createVoice({ events: Array.from({ length: 16 }, (_, event) => createNote({
        id: `dense-${index}-${event}`, pitch: { step: 'C', octave: 3 },
        position: createTimePosition(event * TICKS_PER_QUARTER / 4), duration: createDuration('16th')
      })) })]
    }))
    const before = structuredClone({ sparse, dense })
    const geometry = (layout: ReturnType<typeof createSystemLayout>) =>
      layout.placements.map(({ width, x, systemIndex }) => ({ width, x, systemIndex }))
    const varied = dense.map((measure, index) => index ? { ...sparse[index]!, id: measure.id } : measure)
    for (const staff of [dense, varied]) for (const width of [700, 2400]) {
      const reference = createSystemLayout(staff, width, { compactSpacing })
      expect(geometry(createSystemLayout(sparse, width, { compactSpacing, parallelMeasures: [staff] })))
        .toEqual(geometry(reference))
      expect(geometry(createSystemLayout(staff, width, { compactSpacing, parallelMeasures: [sparse] })))
        .toEqual(geometry(reference))
    }
    expect({ sparse, dense }).toEqual(before)
  })

  it.each(['start', 'end', 'both'] as const)('reserves repeat %s barline space before packing sparse systems', edge => {
    const measures = createMeasures(6).map(measure => ({
      ...measure,
      voices: [createVoice({ events: [createNote({
        id: `${measure.id}-whole`,
        pitch: { step: 'C', octave: 4 },
        duration: createDuration('whole')
      })] })]
    }))
    expect(createSystemLayout(measures, 666).systemCount).toBe(1)
    measures[0]!.repeat = { start: edge !== 'end' }
    measures[5]!.repeat = { end: edge !== 'start' }
    const before = structuredClone(measures)
    const layout = createSystemLayout(measures, 666)
    expect(layout.systemCount).toBe(2)
    expect(layout.placements[0]!.width).toBeGreaterThanOrEqual(edge === 'end' ? 128 : 148)
    expect(measures).toEqual(before)
  })

  it.each([undefined, 600])('reserves measured curve envelopes across systems with pageHeight=%s', pageHeight => {
    const measures = createMeasures(2)
    const before = structuredClone(measures)
    const layout = createSystemLayout(measures, 600, {
      layout: { systemBreakBeforeMeasureIds: [measures[1]!.id] },
      pageHeight,
      systemInkBounds: new Map([[0, { top: 40, bottom: 310 }], [1, { top: -140, bottom: 80 }]])
    })
    const [first, second] = layout.placements
    expect(second!.y - 140 - (first!.y + 310)).toBeGreaterThanOrEqual(12)
    expect(layout.height).toBeGreaterThanOrEqual(second!.y + 80)
    if (pageHeight) {
      for (const [placement, top, bottom] of [[first!, 40, 310], [second!, -140, 80]] as const) {
        expect(Math.floor((placement.y + top) / pageHeight)).toBe(Math.floor((placement.y + bottom) / pageHeight))
      }
    }
    expect(measures).toEqual(before)
  })

  it('wraps measures instead of shrinking below the minimum width', () => {
    const layout = createSystemLayout(createMeasures(9), 900)

    expect(layout.measuresPerSystem).toBe(8)
    expect(layout.systemCount).toBe(2)
    expect(layout.placements[0]).toMatchObject({
      isSystemStart: true,
      systemIndex: 0,
      x: 8
    })
    expect(layout.placements[8]).toMatchObject({
      isSystemStart: true,
      systemIndex: 1,
      x: 8
    })
    expect(layout.placements[0].width).toBeGreaterThanOrEqual(104)
  })

  it('uses fewer measures per system at the minimum render width', () => {
    const layout = createSystemLayout(createMeasures(6), 560)

    expect(layout.measuresPerSystem).toBe(5)
    expect(layout.systemCount).toBe(2)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 0, 0, 0, 1
    ])
  })

  it('stretches the final carryover system to the full available width', () => {
    const layout = createSystemLayout(createMeasures(9), 900)
    const lastPlacement = layout.placements[8]

    expect(lastPlacement.x).toBe(8)
    expect(lastPlacement.x + lastPlacement.width).toBeCloseTo(892)
    expect(lastPlacement.width).toBeGreaterThan(layout.placements[0].width)
  })

  it('fills every system independently without table-like column alignment', () => {
    const layout = createSystemLayout(createMeasures(7), 900)

    for (let systemIndex = 0; systemIndex < layout.systemCount; systemIndex += 1) {
      const systemPlacements = layout.placements.filter(
        (placement) => placement.systemIndex === systemIndex
      )
      const lastPlacement = systemPlacements.at(-1)!

      expect(systemPlacements[0].x).toBe(8)
      expect(lastPlacement.x + lastPlacement.width).toBeCloseTo(892)
    }
  })

  it('keeps systems inside configured PDF page boundaries', () => {
    const layout = createSystemLayout(createMeasures(6), 320, {
      pageHeight: 300
    })
    const firstSystemPlacements = layout.placements.filter(
      (placement) => placement.systemIndex === 0
    )
    const secondSystemPlacements = layout.placements.filter(
      (placement) => placement.systemIndex === 1
    )

    expect(firstSystemPlacements[0].y + 154).toBeLessThanOrEqual(300)
    expect(secondSystemPlacements[0].y).toBeGreaterThanOrEqual(300)
    expect(secondSystemPlacements[0].y + 154).toBeLessThanOrEqual(600)
  })

  it('keeps lyric descenders inside configured PDF page boundaries', () => {
    const layout = createSystemLayout(createLyricMeasures(3), 320, {
      pageHeight: 245,
      systemHeight: 132
    })
    const firstSystemPlacements = layout.placements.filter(
      (placement) => placement.systemIndex === 0
    )
    const secondSystemPlacements = layout.placements.filter(
      (placement) => placement.systemIndex === 1
    )

    expect(firstSystemPlacements[0].y + 153).toBeLessThanOrEqual(245)
    expect(secondSystemPlacements[0].y).toBeGreaterThanOrEqual(245)
  })

  it('uses tighter sparse measure spacing for PDF export layouts', () => {
    const layout = createSystemLayout(createMeasures(7), 760, {
      compactSpacing: true
    })

    expect(layout.systemCount).toBe(1)
    expect(layout.placements).toHaveLength(7)
    expect(layout.placements.at(-1)!.x + layout.placements.at(-1)!.width).toBeCloseTo(
      752
    )
  })

  it('layout.manual-system-break adds a manual break and returns to automatic layout when removed', () => {
    const measures = createMeasures(6)
    const layout = createSystemLayout(measures, 900, {
      layout: {
        systemBreakBeforeMeasureIds: ['measure-3', 'measure-6']
      }
    })

    expect(layout.systemCount).toBe(3)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 1, 1, 1, 2
    ])
    expect(layout.placements[2]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-3' }),
      x: 8
    })
    expect(layout.placements[5]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-6' }),
      x: 8
    })

    const automaticLayout = createSystemLayout(measures, 900)

    expect(
      automaticLayout.placements.map((placement) => placement.systemIndex)
    ).toEqual([0, 0, 0, 0, 0, 0])
    expect(automaticLayout.placements[2].isSystemStart).toBe(false)
  })

  it('ignores manual system breaks before the first measure', () => {
    const layout = createSystemLayout(createMeasures(4), 900, {
      layout: {
        systemBreakBeforeMeasureIds: ['measure-1']
      }
    })

    expect(layout.systemCount).toBe(1)
    expect(layout.placements[0]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-1' })
    })
  })

  it('layout.manual-page-break adds a page break as a system boundary and returns to automatic layout when removed', () => {
    const measures = createMeasures(6)
    const layout = createSystemLayout(measures, 900, {
      layout: {
        pageBreakBeforeMeasureIds: ['measure-4']
      }
    })

    expect(layout.systemCount).toBe(2)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 0, 1, 1, 1
    ])
    expect(layout.placements[3]).toMatchObject({
      isSystemStart: true,
      measure: expect.objectContaining({ id: 'measure-4' }),
      x: 8
    })

    const automaticLayout = createSystemLayout(measures, 900)

    expect(
      automaticLayout.placements.map((placement) => placement.systemIndex)
    ).toEqual([0, 0, 0, 0, 0, 0])
    expect(automaticLayout.placements[3].isSystemStart).toBe(false)
  })

  it('allocates more width to rhythmically dense measures', () => {
    const sparse = createMeasure({
      id: 'sparse',
      number: 1
    })
    const dense = createMeasure({
      id: 'dense',
      number: 2,
      voices: [
        createVoice({
          events: Array.from({ length: 8 }, (_, index) =>
            createNote({
              id: `note-${index}`,
              position: createTimePosition(
                index * (TICKS_PER_QUARTER / 2)
              ),
              pitch: {
                step: 'C',
                octave: 4
              },
              duration: createDuration('eighth')
            })
          )
        })
      ]
    })
    const layout = createSystemLayout([sparse, dense], 900)

    expect(layout.placements[1].width).toBeGreaterThan(
      layout.placements[0].width
    )
    expect(
      layout.placements[1].x + layout.placements[1].width
    ).toBeCloseTo(892)
  })

  it('allocates more width when a lower same-staff voice is rhythmically dense', () => {
    const sparse = createMeasure({
      id: 'sparse',
      number: 1
    })
    const denseLowerVoice = createMeasure({
      id: 'dense-lower-voice',
      number: 2,
      voices: [
        createVoice({
          id: 'voice-1',
          events: [
            createNote({
              id: 'upper-whole',
              pitch: {
                step: 'C',
                octave: 5
              },
              duration: createDuration('whole')
            })
          ]
        }),
        createVoice({
          id: 'voice-2',
          events: Array.from({ length: 16 }, (_, index) =>
            createNote({
              id: `lower-note-${index}`,
              position: createTimePosition(
                index * (TICKS_PER_QUARTER / 4)
              ),
              pitch: {
                step: 'C',
                octave: 3
              },
              duration: createDuration('16th')
            })
          )
        })
      ]
    })
    const layout = createSystemLayout([sparse, denseLowerVoice], 900)

    expect(layout.placements[1].width).toBeGreaterThan(
      layout.placements[0].width
    )
  })

  it('reserves extra width for notation symbols at system starts', () => {
    const layout = createSystemLayout(createMeasures(2), 900)

    expect(layout.placements[0].width).toBeGreaterThan(
      layout.placements[1].width
    )
  })

  it('does not treat an unchanged time signature as a repeated system-start symbol', () => {
    const measures = createMeasures(9)
    const layout = createSystemLayout(measures, 900)
    const secondSystemMeasure = layout.placements.find(
      (placement) => placement.systemIndex === 1
    )

    expect(secondSystemMeasure).toBeDefined()
    expect(
      resolveLeadingNotationVisibility(
        secondSystemMeasure!.measure,
        measures[7],
        true
      )
    ).toMatchObject({
      showsClef: true,
      showsKeySignature: true,
      showsTimeSignature: false
    })
  })

  it('reserves a time signature at a system start when the meter actually changes', () => {
    const measures = createMeasures(9)
    measures[8] = createMeasure({
      id: 'measure-9',
      number: 9,
      timeSignature: { beats: 3, beatType: 4 }
    })

    const visibility = resolveLeadingNotationVisibility(
      measures[8],
      measures[7],
      true
    )

    expect(visibility).toMatchObject({
      showsClef: true,
      showsKeySignature: true,
      showsTimeSignature: true
    })
  })

  it.each([true, false])('compares the next measure with its previous inline clef (reset=%s)', reset => {
    const previous = createMeasure({ voices: [createVoice({ events: [createNote({
      id: 'inline-clef-before-boundary', pitch: { step: 'C', octave: 4 },
      duration: createDuration('whole'), clefBefore: { sign: 'F', line: 4 }
    })] })] })
    const current = createMeasure({ clef: reset ? { sign: 'G', line: 2 } : { sign: 'F', line: 4 } })
    expect(resolveLeadingNotationVisibility(current, previous, false).showsClef).toBe(reset)
    expect(resolveLeadingNotationVisibility(current, previous, true).showsClef).toBe(true)
  })

  it('scales leading notation padding with the visible key signature', () => {
    const cMajor = createMeasure({
      keySignature: { fifths: 0, mode: 'major' }
    })
    const dMajor = createMeasure({
      keySignature: { fifths: 2, mode: 'major' }
    })
    const cSharpMajor = createMeasure({
      keySignature: { fifths: 7, mode: 'major' }
    })
    const leadingNotation = {
      showsClef: true,
      showsKeySignature: true,
      showsTimeSignature: true
    }

    expect(leadingNotationPadding(cMajor, leadingNotation)).toBe(24)
    expect(leadingNotationPadding(dMajor, leadingNotation)).toBe(32)
    expect(leadingNotationPadding(cSharpMajor, leadingNotation)).toBe(52)
  })

  it('wraps dense measures before their preferred widths would overflow a system', () => {
    const measures = Array.from({ length: 4 }, (_, measureIndex) =>
      createMeasure({
        id: `dense-${measureIndex + 1}`,
        number: measureIndex + 1,
        voices: [
          createVoice({
            events: Array.from({ length: 8 }, (_, eventIndex) =>
              createNote({
                id: `dense-${measureIndex + 1}-${eventIndex + 1}`,
                position: createTimePosition(
                  eventIndex * (TICKS_PER_QUARTER / 2)
                ),
                pitch: {
                  step: 'C',
                  octave: 4
                },
                duration: createDuration('eighth')
              })
            )
          })
        ]
      })
    )
    const layout = createSystemLayout(measures, 900)

    expect(layout.systemCount).toBeGreaterThan(1)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 0, 1
    ])
    layout.placements.forEach((placement) => {
      expect(placement.width).toBeGreaterThan(220)
      expect(placement.x + placement.width).toBeLessThanOrEqual(892)
    })
  })

  it('wraps accidental-heavy tuplet measures before noteheads crowd the barline', () => {
    const measures = Array.from({ length: 4 }, (_, measureIndex) =>
      createMeasure({
        id: `ornate-${measureIndex + 1}`,
        number: measureIndex + 1,
        voices: [
          createVoice({
            events: Array.from({ length: 6 }, (_, eventIndex) =>
              createNote({
                id: `ornate-${measureIndex + 1}-${eventIndex + 1}`,
                position: createTimePosition(
                  eventIndex * (TICKS_PER_QUARTER / 2)
                ),
                pitch: {
                  step: ['C', 'D', 'E', 'F', 'G', 'A'][eventIndex] as
                    | 'C'
                    | 'D'
                    | 'E'
                    | 'F'
                    | 'G'
                    | 'A',
                  octave: 4,
                  alter: eventIndex % 2 === 0 ? 1 : -1
                },
                duration: {
                  ...createDuration('eighth'),
                  tuplet: { actualNotes: 3, normalNotes: 2 }
                }
              })
            ),
            tuplets: [
              {
                id: `ornate-${measureIndex + 1}-tuplet-1`,
                eventIds: [
                  `ornate-${measureIndex + 1}-1`,
                  `ornate-${measureIndex + 1}-2`,
                  `ornate-${measureIndex + 1}-3`
                ],
                actualNotes: 3,
                normalNotes: 2
              },
              {
                id: `ornate-${measureIndex + 1}-tuplet-2`,
                eventIds: [
                  `ornate-${measureIndex + 1}-4`,
                  `ornate-${measureIndex + 1}-5`,
                  `ornate-${measureIndex + 1}-6`
                ],
                actualNotes: 3,
                normalNotes: 2
              }
            ]
          })
        ]
      })
    )
    const layout = createSystemLayout(measures, 900)

    expect(layout.systemCount).toBe(2)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 1, 1
    ])
    for (const placement of layout.placements) {
      expect(placement.width).toBeGreaterThanOrEqual(400)
      expect(placement.x + placement.width).toBeLessThanOrEqual(892)
    }
  })

  it('reserves horizontal room for inline clefs before events', () => {
    const measures = Array.from({ length: 4 }, (_, measureIndex) =>
      createMeasure({
        id: `inline-clef-${measureIndex + 1}`,
        number: measureIndex + 1,
        voices: [
          createVoice({
            events: Array.from({ length: 4 }, (_, eventIndex) =>
              createNote({
                id: `inline-clef-${measureIndex + 1}-${eventIndex + 1}`,
                position: createTimePosition(eventIndex * TICKS_PER_QUARTER),
                pitch: {
                  step: 'C',
                  octave: 4
                },
                duration: createDuration('quarter'),
                clefBefore: {
                  sign: eventIndex % 2 === 0 ? 'F' : 'G',
                  line: eventIndex % 2 === 0 ? 4 : 2
                }
              })
            )
          })
        ]
      })
    )
    const layout = createSystemLayout(measures, 900)

    expect(layout.systemCount).toBe(2)
    expect(layout.placements.map((placement) => placement.systemIndex)).toEqual([
      0, 0, 1, 1
    ])
    for (const placement of layout.placements) {
      expect(placement.width).toBeGreaterThanOrEqual(400)
      expect(placement.x + placement.width).toBeLessThanOrEqual(892)
    }
  })

  it('reserves more horizontal room for crowded note groups', () => {
    const calm = createMeasure({
      id: 'calm',
      number: 1,
      voices: [
        createVoice({
          events: Array.from({ length: 3 }, (_, index) =>
            createNote({
              id: `calm-${index}`,
              position: createTimePosition(index * TICKS_PER_QUARTER),
              pitch: {
                step: 'C',
                octave: 4
              },
              duration: createDuration('quarter')
            })
          )
        })
      ]
    })
    const crowded = createMeasure({
      id: 'crowded',
      number: 2,
      voices: [
        createVoice({
          events: Array.from({ length: 7 }, (_, index) =>
            createNote({
              id: `crowded-${index}`,
              position: createTimePosition(
                index * (TICKS_PER_QUARTER / 2)
              ),
              pitch: {
                step: 'C',
                octave: 4
              },
              duration: createDuration('eighth')
            })
          )
        })
      ]
    })
    const layout = createSystemLayout([calm, crowded], 900)

    expect(layout.placements[1].width).toBeGreaterThan(
      layout.placements[0].width
    )
    expect(layout.placements[1].width).toBeGreaterThanOrEqual(500)
  })

  it('increases the SVG height as systems are added', () => {
    expect(createSystemLayout(createMeasures(2), 900).height).toBe(226)
    expect(createSystemLayout(createMeasures(9), 900).height).toBeGreaterThan(
      226
    )
  })

  it('reserves the same ledger space for an inline clef as for the equivalent measure clef', () => {
    const note = createNote({ id: 'inline-high-note', pitch: { step: 'C', octave: 7 }, duration: createDuration('whole') })
    const bass = { sign: 'F' as const, line: 4 }
    const inline = createMeasure({ voices: [createVoice({ events: [{ ...note, clefBefore: bass }] })] })
    const wholeMeasure = createMeasure({ clef: bass, voices: [createVoice({ events: [note] })] })
    expect(createSystemLayout([inline], 700).placements[0]!.y).toBe(createSystemLayout([wholeMeasure], 700).placements[0]!.y)
  })

  it('adds vertical space for notes far above and below the staff', () => {
    const measures = createMeasures(8)
    measures[0].voices[0].events = [
      createNote({
        id: 'high-note',
        position: createTimePosition(0),
        pitch: { step: 'G', octave: 7 }
      })
    ]
    measures[4].voices[0].events = [
      createNote({
        id: 'low-note',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 1 }
      })
    ]

    const normalLayout = createSystemLayout(createMeasures(8), 900)
    const expandedLayout = createSystemLayout(measures, 900)

    expect(expandedLayout.placements[0].y).toBeGreaterThan(
      normalLayout.placements[0].y
    )
    expect(expandedLayout.placements[4].y).toBeGreaterThan(
      normalLayout.placements[4].y
    )
    expect(expandedLayout.height).toBeGreaterThan(normalLayout.height)
  })

  it('keeps baseline spacing until the reserved margin is reached, then grows linearly', () => {
    const baseline = createSystemLayout(
      [measureWithPitch('B', 4)],
      900
    )
    const nearTop = createSystemLayout(
      [measureWithPitch('C', 5)],
      900
    )
    const octaveHigher = createSystemLayout(
      [measureWithPitch('C', 6)],
      900
    )

    expect(baseline.placements[0].y).toBe(72)
    expect(nearTop.placements[0].y).toBeGreaterThan(
      baseline.placements[0].y
    )
    expect(
      octaveHigher.placements[0].y - nearTop.placements[0].y
    ).toBeCloseTo(35)
  })

  it('uses only the highest and lowest notes in each system for vertical margins', () => {
    const highOnly = createSystemLayout(
      [measureWithPitches([
        ['C', 4],
        ['G', 7]
      ])],
      900
    )
    const highWithIntermediateNotes = createSystemLayout(
      [measureWithPitches([
        ['C', 4],
        ['C', 5],
        ['C', 6],
        ['G', 7]
      ])],
      900
    )
    const bothExtremes = createSystemLayout(
      [measureWithPitches([
        ['C', 1],
        ['C', 4],
        ['G', 7]
      ])],
      900
    )

    expect(highWithIntermediateNotes.placements[0].y).toBe(
      highOnly.placements[0].y
    )
    expect(highWithIntermediateNotes.height).toBe(highOnly.height)
    expect(bothExtremes.placements[0].y).toBe(highOnly.placements[0].y)
    expect(bothExtremes.height).toBeGreaterThan(highOnly.height)
  })

  it('uses all voices when reserving vertical space', () => {
    const singleVoice = createSystemLayout(
      [measureWithPitch('C', 4)],
      900
    )
    const twoVoice = createSystemLayout(
      [
        createMeasure({
          voices: [
            createVoice({
              id: 'voice-1',
              events: [
                createNote({
                  id: 'middle-note',
                  pitch: { step: 'C', octave: 4 }
                })
              ]
            }),
            createVoice({
              id: 'voice-2',
              events: [
                createNote({
                  id: 'high-second-voice',
                  pitch: { step: 'G', octave: 7 }
                })
              ]
            })
          ]
        })
      ],
      900
    )

    expect(twoVoice.placements[0].y).toBeGreaterThan(singleVoice.placements[0].y)
    expect(twoVoice.height).toBeGreaterThan(singleVoice.height)
  })

  it('reserves enough first-system top margin for fermata and rehearsal marks', () => {
    const layout = createSystemLayout([measureWithPitch('C', 4)], 900)
    const firstPlacement = layout.placements[0]
    const rehearsalTop = firstPlacement.y - 28
    const fermataBaseline = firstPlacement.y - 22

    expect(firstPlacement.y).toBeGreaterThanOrEqual(72)
    expect(rehearsalTop).toBeGreaterThanOrEqual(40)
    expect(fermataBaseline).toBeGreaterThanOrEqual(46)
  })

  it('keeps system right edges inside the render width at narrow viewport widths', () => {
    const renderWidth = 320
    const layout = createSystemLayout(createMeasures(6), renderWidth)

    expect(layout.measuresPerSystem).toBe(2)

    for (const placement of layout.placements) {
      expect(placement.x).toBeGreaterThanOrEqual(8)
      expect(placement.x + placement.width).toBeLessThanOrEqual(
        renderWidth - 8
      )
    }
  })

  it('keeps release QA scenario bounds inside desktop and narrow viewports', () => {
    const score = parseMusicXml(releaseQaFixture)
    const measures = score.parts[0].staves[0].measures

    for (const renderWidth of [900, 320]) {
      const layout = createSystemLayout(measures, renderWidth)

      for (const placement of layout.placements) {
        expect(placement.x).toBeGreaterThanOrEqual(8)
        expect(placement.x + placement.width).toBeLessThanOrEqual(
          renderWidth - 8 + 0.001
        )
      }

      const firstPlacement = layout.placements[0]
      expect(firstPlacement.y - 28).toBeGreaterThanOrEqual(40)
      expect(firstPlacement.y - 22).toBeGreaterThanOrEqual(46)

      for (const dynamic of score.dynamics ?? []) {
        const placement = layout.placements.find(
          (candidate) => candidate.measure.id === dynamic.measureId
        )

        expect(placement).toBeDefined()
        expect(placement!.y + 78).toBeGreaterThan(placement!.y + 40)
        expect(placement!.y + 78).toBeLessThan(placement!.y + 154)
      }
    }
  })

  it('clef.staff-position maps pitches to VexFlow-compatible staff lines for supported clefs', () => {
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'G', line: 2 }
      )
    ).toBe(0)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'F', line: 4 }
      )
    ).toBe(6)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'C', line: 4 }
      )
    ).toBe(4)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'C', line: 1 }
      )
    ).toBe(1)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'F', line: 3 }
      )
    ).toBe(5)
    expect(
      pitchStaffLine(
        { step: 'C', octave: 4 },
        { sign: 'G', line: 1 }
      )
    ).toBe(-1)
  })
})

function createMeasures(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createMeasure({
      id: `measure-${index + 1}`,
      number: index + 1
    })
  )
}

function createLyricMeasures(count: number) {
  return Array.from({ length: count }, (_, index) =>
    createMeasure({
      id: `lyric-measure-${index + 1}`,
      number: index + 1,
      voices: [
        createVoice({
          events: [
            createNote({
              id: `lyric-note-${index + 1}`,
              lyrics: [
                { number: 1, syllabic: 'single', text: '가' },
                { number: 2, syllabic: 'single', text: '나' }
              ],
              pitch: { step: 'C', octave: 4 },
              position: createTimePosition(0)
            })
          ]
        })
      ]
    })
  )
}

function measureWithPitch(
  step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
  octave: number
) {
  return createMeasure({
    voices: [
      createVoice({
        events: [
          createNote({
            id: `${step}-${octave}`,
            position: createTimePosition(0),
            pitch: { step, octave }
          })
        ]
      })
    ]
  })
}

function measureWithPitches(
  pitches: Array<[
    'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B',
    number
  ]>
) {
  return createMeasure({
    voices: [
      createVoice({
        events: pitches.map(([step, octave], index) =>
          createNote({
            id: `${step}-${octave}-${index}`,
            position: createTimePosition(index * TICKS_PER_QUARTER),
            pitch: { step, octave }
          })
        )
      })
    ]
  })
}
