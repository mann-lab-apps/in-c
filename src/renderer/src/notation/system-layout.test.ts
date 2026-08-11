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
  pitchStaffLine
} from './system-layout'

const releaseQaFixture = readFileSync(
  resolve('src/musicxml/fixtures/release-qa.musicxml'),
  'utf8'
)

describe('system layout', () => {
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

  it('reserves extra width for notation symbols at system starts', () => {
    const layout = createSystemLayout(createMeasures(2), 900)

    expect(layout.placements[0].width).toBeGreaterThan(
      layout.placements[1].width
    )
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
