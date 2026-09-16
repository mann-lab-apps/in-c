// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
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

    fireEvent.click(container.querySelector('.notation-harmony-mark[data-object-id="clickable-harmony"]')!)
    fireEvent.click(container.querySelector('.notation-dynamic-mark[data-object-id="clickable-dynamic"]')!)
    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'harmonies', measure.id, 'clickable-harmony')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'dynamics', measure.id, 'clickable-dynamic')
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

    fireEvent.click(container.querySelector('.notation-rehearsal-mark[data-object-id="clickable-rehearsal"]')!)
    fireEvent.click(container.querySelector('.notation-staff-text[data-object-id="clickable-staff-text"]')!)
    fireEvent.click(container.querySelector('.notation-system-text[data-object-id="clickable-system-text"]')!)
    fireEvent.click(container.querySelector('.notation-expression-text[data-object-id="clickable-expression-text"]')!)
    expect(onSelectObject).toHaveBeenNthCalledWith(1, 'rehearsalMarks', measure.id, 'clickable-rehearsal')
    expect(onSelectObject).toHaveBeenNthCalledWith(2, 'staffTexts', measure.id, 'clickable-staff-text')
    expect(onSelectObject).toHaveBeenNthCalledWith(3, 'systemTexts', measure.id, 'clickable-system-text')
    expect(onSelectObject).toHaveBeenNthCalledWith(4, 'expressionTexts', measure.id, 'clickable-expression-text')
  })
})
