// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  TICKS_PER_QUARTER,
  type Score,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice
} from '../../../score-core'
import { NotationPreview } from './NotationPreview'
import { resolvePrintLayoutPlan } from './print-layout'

class TestResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

describe('NotationPreview passive lower-staff attachments', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', TestResizeObserver)
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => ({
        measureText: (text: string) => ({
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 3,
          actualBoundingBoxLeft: 0,
          actualBoundingBoxRight: text.length * 8,
          fontBoundingBoxAscent: 10,
          fontBoundingBoxDescent: 3,
          width: text.length * 8
        })
      }) as unknown as CanvasRenderingContext2D)
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () =>
        ({
          x: 0,
          y: 0,
          width: 24,
          height: 16
        }) as DOMRect
    })
  })

  afterEach(() => {
    delete (SVGElement.prototype as { getBBox?: () => DOMRect }).getBBox
    getContextSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  const createLowerStaffAttachmentScore = (): Score => {
    const lowerNote = createNote({
      id: 'lower-staff-marked-note',
      position: createTimePosition(0),
      pitch: { step: 'C', octave: 3 },
      fermata: true,
      breathMark: 'caesura',
      tremolo: { type: 'single', marks: 3 },
      ornaments: ['trill', 'mordent', 'turn'],
      graceNotes: [{ pitch: { step: 'B', octave: 2 }, slash: true }]
    })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [createMeasure({ id: 'P1-S1-M1' })]
            }),
            createStaff({
              id: 'P1-S2',
              measures: [
                createMeasure({
                  id: 'P1-S2-M1',
                  voices: [
                    createVoice({
                      events: [
                        lowerNote,
                        createRest({
                          id: 'lower-staff-fill-rest',
                          position: createTimePosition(480),
                          duration: { value: 'half', dots: 1 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })

    return score
  }

  it.each([
    ['screen layout', false],
    ['print layout', true]
  ])('renders lower-staff passive markers with the source event id in %s', async (_name, printLayout) => {
    const score = createLowerStaffAttachmentScore()
    const { container } = render(
      <NotationPreview
        score={score}
        printLayout={printLayout}
        printLayoutPlan={printLayout ? resolvePrintLayoutPlan(score, 'auto') : undefined}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        container.querySelector('[data-event-id="lower-staff-marked-note"]')
      ).toBeInTheDocument()
    })

    for (const className of [
      'notation-fermata',
      'notation-breath-mark',
      'notation-tremolo-mark',
      'notation-ornament',
      'notation-grace-notes'
    ]) {
      expect(
        container.querySelector(`.${className}[data-event-id="lower-staff-marked-note"]`)
      ).toBeInTheDocument()
    }

    const numberAttribute = (selector: string, name: string) => {
      const element = container.querySelector(selector)
      if (!element) throw new Error(`Missing ${selector}`)
      return Number(element.getAttribute(name))
    }
    const fermataX = numberAttribute('.notation-fermata', 'x')
    const fermataY = numberAttribute('.notation-fermata', 'y')
    const breathX = numberAttribute('.notation-breath-mark', 'x')
    const ornamentY = numberAttribute('.notation-ornament', 'y')

    expect(ornamentY).toBeLessThanOrEqual(fermataY - 24)
    expect(breathX).toBeGreaterThanOrEqual(fermataX + 24)
  })

  it('places staccato dots near the rendered notehead instead of a fixed upper annotation lane', async () => {
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [
                    createVoice({
                      events: [
                        createNote({
                          id: 'staccato-note',
                          position: createTimePosition(0),
                          pitch: { step: 'C', octave: 5 },
                          articulations: ['staccato']
                        }),
                        createRest({
                          id: 'staccato-fill-rest',
                          position: createTimePosition(TICKS_PER_QUARTER),
                          duration: { value: 'half', dots: 1 }
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        container.querySelector('.notation-articulation[data-event-id="staccato-note"]')
      ).toBeInTheDocument()
    })

    const dot = container.querySelector(
      '.notation-articulation[data-event-id="staccato-note"]'
    )
    if (!dot) throw new Error('Missing staccato dot')
    const cy = Number(dot.getAttribute('cy'))
    const noteheadY = Number(dot.getAttribute('data-notehead-y'))

    expect(dot).toHaveAttribute('r', '1.9')
    expect(Math.abs(cy - noteheadY)).toBeLessThanOrEqual(12)
  })

  it('exposes chord and dynamic object ids for direct score-object selection', async () => {
    const measure = createMeasure({ id: 'P1-S1-M1' })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      harmonies: [{
        id: 'clickable-harmony',
        measureId: measure.id,
        tick: 0,
        text: 'C7',
        root: { step: 'C', alter: 0 },
        kind: 'dominant'
      }],
      dynamics: [{ id: 'clickable-dynamic', measureId: measure.id, value: 'mf' }]
    })
    const onSelectObject = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectObject={onSelectObject}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.notation-harmony-mark[data-object-id="clickable-harmony"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-dynamic-mark[data-object-id="clickable-dynamic"]')).toBeInTheDocument()
    })

    fireEvent.click(within(container).getByRole('button', { name: '코드 C7 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '셈여림 mf 객체 선택' }))
    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'harmonies', measure.id, 'clickable-harmony')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'dynamics', measure.id, 'clickable-dynamic')
  })

  it('activates visible score objects from the keyboard', async () => {
    const measure = createMeasure({ id: 'P1-S1-M1' })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      harmonies: [{
        id: 'keyboard-harmony',
        measureId: measure.id,
        tick: 0,
        text: 'G7',
        root: { step: 'G', alter: 0 },
        kind: 'dominant'
      }],
      dynamics: [{ id: 'keyboard-dynamic', measureId: measure.id, value: 'f' }]
    })
    const onSelectObject = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectObject={onSelectObject}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(within(container).getByRole('button', { name: '코드 G7 객체 선택' })).toBeInTheDocument()
      expect(within(container).getByRole('button', { name: '셈여림 f 객체 선택' })).toBeInTheDocument()
    })

    fireEvent.keyDown(within(container).getByRole('button', { name: '코드 G7 객체 선택' }), { key: 'Enter' })
    fireEvent.keyDown(within(container).getByRole('button', { name: '셈여림 f 객체 선택' }), { key: ' ' })

    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'harmonies', measure.id, 'keyboard-harmony')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'dynamics', measure.id, 'keyboard-dynamic')
  })

  it('activates visible span objects from the keyboard', async () => {
    const events = [
      createNote({
        id: 'span-start-note',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 }
      }),
      createNote({
        id: 'span-end-note',
        position: createTimePosition(480),
        pitch: { step: 'E', octave: 4 }
      })
    ]
    const measure = createMeasure({
      id: 'P1-S1-M1',
      voices: [createVoice({ events })]
    })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      slurs: [{ id: 'keyboard-slur', startEventId: events[0].id, endEventId: events[1].id }],
      hairpins: [{ id: 'keyboard-hairpin', type: 'crescendo', startEventId: events[0].id, endEventId: events[1].id }]
    })
    const onSelectSpan = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectSpan={onSelectSpan}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(within(container).getByRole('button', { name: '슬러 keyboard-slur 선택' })).toBeInTheDocument()
      expect(within(container).getByRole('button', { name: '헤어핀 keyboard-hairpin 선택' })).toBeInTheDocument()
    })

    fireEvent.keyDown(within(container).getByRole('button', { name: '슬러 keyboard-slur 선택' }), { key: 'Enter' })
    fireEvent.keyDown(within(container).getByRole('button', { name: '헤어핀 keyboard-hairpin 선택' }), { key: ' ' })

    expect(onSelectSpan).toHaveBeenNthCalledWith(1, expect.objectContaining({
      kind: 'slur',
      id: 'keyboard-slur'
    }))
    expect(onSelectSpan).toHaveBeenNthCalledWith(2, expect.objectContaining({
      kind: 'hairpin',
      id: 'keyboard-hairpin'
    }))
  })

  it('exposes multiple same-measure dynamic objects for direct selection', async () => {
    const measure = createMeasure({ id: 'P1-S1-M1' })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      dynamics: [
        { id: 'dynamic-one', measureId: measure.id, value: 'p' },
        { id: 'dynamic-two', measureId: measure.id, value: 'ff' }
      ]
    })
    const onSelectObject = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectObject={onSelectObject}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.notation-dynamic-mark[data-object-id="dynamic-one"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-dynamic-mark[data-object-id="dynamic-two"]')).toBeInTheDocument()
    })

    fireEvent.click(within(container).getByRole('button', { name: '셈여림 p 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '셈여림 ff 객체 선택' }))

    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'dynamics', measure.id, 'dynamic-one')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'dynamics', measure.id, 'dynamic-two')
  })

  it('exposes text object ids for direct score-object selection', async () => {
    const measure = createMeasure({ id: 'P1-S1-M1' })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      rehearsalMarks: [{ id: 'clickable-rehearsal', measureId: measure.id, text: 'A' }],
      staffTexts: [{ id: 'clickable-staff-text', measureId: measure.id, text: 'dolce' }],
      systemTexts: [{ id: 'clickable-system-text', measureId: measure.id, text: 'Chorus' }],
      expressionTexts: [{ id: 'clickable-expression-text', measureId: measure.id, tick: 0, text: 'espressivo' }]
    })
    const onSelectObject = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectObject={onSelectObject}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.notation-rehearsal-mark[data-object-id="clickable-rehearsal"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-staff-text[data-object-id="clickable-staff-text"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-system-text[data-object-id="clickable-system-text"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-expression-text[data-object-id="clickable-expression-text"]')).toBeInTheDocument()
    })

    fireEvent.click(within(container).getByRole('button', { name: '연습표 A 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '보표 글자 dolce 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '시스템 텍스트 Chorus 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '표현 텍스트 espressivo 객체 선택' }))
    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'rehearsalMarks', measure.id, 'clickable-rehearsal')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'staffTexts', measure.id, 'clickable-staff-text')
    expect(onSelectObject).toHaveBeenNthCalledWith(3, 'systemTexts', measure.id, 'clickable-system-text')
    expect(onSelectObject).toHaveBeenNthCalledWith(4, 'expressionTexts', measure.id, 'clickable-expression-text')
  })

  it('exposes multiple same-measure staff text objects for direct selection', async () => {
    const measure = createMeasure({ id: 'P1-S1-M1' })
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [measure]
            })
          ]
        })
      ],
      staffTexts: [
        { id: 'staff-text-one', measureId: measure.id, text: 'dolce' },
        { id: 'staff-text-two', measureId: measure.id, text: 'sul pont.' }
      ]
    })
    const onSelectObject = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onSelectObject={onSelectObject}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.notation-staff-text[data-object-id="staff-text-one"]')).toBeInTheDocument()
      expect(container.querySelector('.notation-staff-text[data-object-id="staff-text-two"]')).toBeInTheDocument()
    })

    fireEvent.click(within(container).getByRole('button', { name: '보표 글자 dolce 객체 선택' }))
    fireEvent.click(within(container).getByRole('button', { name: '보표 글자 sul pont. 객체 선택' }))

    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'staffTexts', measure.id, 'staff-text-one')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'staffTexts', measure.id, 'staff-text-two')
  })
})
