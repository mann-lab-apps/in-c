// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Barline, BarlineType, StaveNote, StaveTie, VexFlow } from 'vexflow'

import {
  TICKS_PER_QUARTER,
  type Score,
  createDuration,
  createMeasure,
  createNote,
  createPart,
  createRest,
  createScore,
  createStaff,
  createTimePosition,
  createVoice,
  validateMeasureRhythm
} from '../../../score-core'
import { NotationPreview } from './NotationPreview'
import { estimatePrintedPageCount, resolvePrintLayoutPlan } from './print-layout'
import { parseMusicXml } from '../../../musicxml/parse'
import { createPlaybackTimeline } from '../playback/timeline'

class TestResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

describe('NotationPreview passive lower-staff attachments', () => {
  it.each(['eighth', '16th'] as const)('includes the painted %s rhythm-feel bracket stroke, not only its centerline', unit => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: 7, actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8
    }) }) as unknown as CanvasRenderingContext2D)
    const originalBBox = (SVGElement.prototype as SVGGraphicsElement).getBBox
    Object.defineProperty(SVGElement.prototype, 'getBBox', { configurable: true,
      value: function (this: SVGElement) {
        return this.matches('.notation-rhythm-feel-marking__triplet-bracket')
          ? { x: 82, y: 10, width: 43, height: 8 } : originalBBox.call(this)
      }
    })
    const measure = createMeasure({ id: 'rhythm-bracket-measure', voices: [createVoice({ events: [createNote({
      id: 'rhythm-bracket-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })], rhythmFeel: { unit } })
    const original = JSON.stringify(score)
    const view = (stroke: number) => <>
      <style>{`.notation-rhythm-feel-marking__triplet-bracket { stroke-width: ${stroke}px }`}</style>
      <NotationPreview score={score} printLayout printLayoutPlan={resolvePrintLayoutPlan(score, 'auto')}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    </>
    const { container, rerender } = render(view(22))
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-axis', 'height')
    rerender(view(1.25))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each([false, true])('checks rhythm-feel text in page coordinates with tempo=%s and permits a fitting retry', hasTempo => {
    const measure = createMeasure({ id: 'rhythm-feel-page-measure', voices: [createVoice({ events: [createNote({
      id: 'rhythm-feel-page-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      ...(hasTempo ? { tempo: { bpm: 120 } } : {}), rhythmFeel: { unit: 'eighth', text: 'Swing '.repeat(80) } })
    const original = JSON.stringify(score)
    const view = (current: Score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-axis', 'width')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, rhythmFeel: { unit: 'eighth', text: 'Swing' } }))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(container.querySelector('.notation-rhythm-feel-marking text')).toHaveTextContent('Swing')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-axis')
  })

  it.each(['global', 'positioned'] as const)('checks %s tempo ink but not hidden print text, preserving retry and source data', scope => {
    const measure = createMeasure({ id: 'tempo-page-measure', voices: [createVoice({ events: [createNote({
      id: 'tempo-page-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const base = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })] })
    const withTempo = (text: string, transparent = false) => ({ ...base,
      ...(scope === 'global' ? { tempo: { bpm: 120, text, transparent } } : {
        tempoEvents: [{ id: 'tempo-page-mark', measureId: measure.id, tick: 0, bpm: 120, text, transparent }]
      }) })
    const score = withTempo('Allegro '.repeat(80)), original = JSON.stringify(score)
    const view = (current: Score, printing = true) => <>
      <style>{'.notation-tempo-marking--positioned { text-anchor: middle }'}</style>
      <NotationPreview score={current} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    </>
    const { container, rerender } = render(view(score))
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-axis', 'width')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view(withTempo('Allegro '.repeat(80), true)))
    expect(container.querySelector('.notation-tempo-marking--transparent')).toHaveTextContent('Allegro')
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(withTempo('Allegro')))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-axis')
  })

  it('fits tall positioned tempo ink through existing automatic staff spacing', () => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: text === 'Allegro' ? 150 : 10, actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8
    }) }) as unknown as CanvasRenderingContext2D)
    const measure = createMeasure({ id: 'tall-tempo-measure', voices: [createVoice({ events: [createNote({
      id: 'tall-tempo-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      tempoEvents: [{ id: 'tall-tempo', measureId: measure.id, tick: 0, bpm: 120, text: 'Allegro' }] })
    const original = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} printLayout printLayoutPlan={resolvePrintLayoutPlan(score, 'auto')}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    expect(Number(container.querySelector('.notation-tempo-marking--positioned')!.getAttribute('y')) - 150).toBeGreaterThanOrEqual(0)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each(['wide', 'tall'] as const)('measures %s harmony ink for print without changing the score', kind => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: kind === 'tall' && text === 'C7' ? 150 : 10,
      actualBoundingBoxDescent: 3, actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8
    }) }) as unknown as CanvasRenderingContext2D)
    const measure = createMeasure({ id: 'harmony-page-measure', voices: [createVoice({ events: [createNote({
      id: 'harmony-page-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      harmonies: [{ id: 'harmony-page-mark', measureId: measure.id, tick: 0,
        text: kind === 'wide' ? 'C7 '.repeat(80) : 'C7', root: { step: 'C' }, kind: 'dominant' }] })
    const original = JSON.stringify(score)
    const view = (current: typeof score, printing = true) => <>
      <style>{'.notation-harmony-mark { text-anchor: middle }'}</style>
      <NotationPreview score={current} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    </>
    const { container, rerender } = render(view(score))
    if (kind === 'wide') {
      expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-axis', 'width')
    } else {
      expect(Number(container.querySelector('.notation-harmony-mark')!.getAttribute('y')) - 150).toBeGreaterThanOrEqual(0)
      expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    }
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, harmonies: [{ ...score.harmonies![0]!, text: 'C7' }] }))
    expect(container.querySelector('.notation-harmony-mark')).toHaveTextContent('C7')
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-axis')
  })

  it.each(['glyph', 'stroke'] as const)('checks rehearsal %s ink at the page boundary and preserves a fitting retry', kind => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({
      width: text.length * (text.startsWith('W') ? 20 : 8), actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3, actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * (text.startsWith('W') ? 20 : 8)
    }) }) as unknown as CanvasRenderingContext2D)
    const measure = createMeasure({ id: 'rehearsal-page-measure', voices: [createVoice({ events: [createNote({
      id: 'rehearsal-page-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      rehearsalMarks: [{ id: 'rehearsal-page-mark', measureId: measure.id, text: kind === 'glyph' ? 'W'.repeat(50) : 'I'.repeat(64) }] })
    const original = JSON.stringify(score), plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <>
      <style>{'.notation-rehearsal-mark text { text-anchor: middle } .notation-rehearsal-mark rect { stroke-width: 1.5; stroke: black }'}</style>
      <NotationPreview score={current} printLayout={printing} printLayoutPlan={printing ? plan : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    </>
    const { container, rerender } = render(view(score))
    const rect = container.querySelector('.notation-rehearsal-mark rect')!
    const rectRight = Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))
    expect(rectRight).toBeLessThanOrEqual(plan.renderWidth)
    if (kind === 'stroke') expect(rectRight + 0.75).toBeGreaterThan(plan.renderWidth)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-axis', 'width')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, rehearsalMarks: [{ ...score.rehearsalMarks![0]!, text: 'A' }] }))
    expect(container.querySelector('.notation-rehearsal-mark text')).toHaveTextContent('A')
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-axis')
  })

  it('reserves measured upper text ascent instead of rejecting a fitting automatic system', () => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: text === 'dolce' ? 150 : 10, actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8 }) }) as unknown as CanvasRenderingContext2D)
    const measure = createMeasure({ id: 'upper-ink-measure', voices: [createVoice({ events: [createNote({
      id: 'upper-ink-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
    })] })] })
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      staffTexts: [{ id: 'upper-ink-text', measureId: measure.id, text: 'dolce' }] })
    const original = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} printLayout printLayoutPlan={resolvePrintLayoutPlan(score, 'auto')}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    expect(Number(container.querySelector('.notation-staff-text')!.getAttribute('y')) - 150).toBeGreaterThanOrEqual(0)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each(['staffTexts', 'systemTexts', 'expressionTexts'] as const)(
    'rejects horizontally clipped %s and clears the guard after shortening the text', field => {
      const measure = createMeasure({ id: 'wide-text-measure', voices: [createVoice({ events: [createNote({
        id: 'wide-text-note', pitch: { step: 'C', octave: 5 }, duration: createDuration('whole')
      })] })] })
      const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
        [field]: [{ id: 'wide-text', measureId: measure.id, tick: 0, text: 'dolce '.repeat(80) }] })
      const original = JSON.stringify(score)
      const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
      const { container, rerender } = render(view(score))
      const preview = container.querySelector('.notation-preview')!
      expect(container.querySelector('[data-object-id="wide-text"]')?.textContent).toBe('dolce '.repeat(80))
      expect(preview).toHaveAttribute('data-print-overflow-measure', '1')
      expect(preview).toHaveAttribute('data-print-overflow-axis', 'width')
      expect(JSON.stringify(score)).toBe(original)
      rerender(view({ ...score, [field]: [{ id: 'wide-text', measureId: measure.id, tick: 0, text: 'dolce' }] }))
      expect(preview).not.toHaveAttribute('data-print-overflow-measure')
      expect(preview).not.toHaveAttribute('data-print-overflow-axis')
      rerender(view(score, false))
      expect(preview).not.toHaveAttribute('data-print-overflow-axis')
    })

  it.each([
    { family: 'clef', code: VexFlow.Glyphs.gClef },
    { family: 'keysignature', code: VexFlow.Glyphs.accidentalSharp },
    { family: 'timesignature', code: VexFlow.Glyphs.timeSig4 }
  ])('rejects print when $family ink crosses the page while its staff lines fit', ({ family, code }) => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: text === code ? 70 : 3,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8 }) }) as unknown as CanvasRenderingContext2D)
    const score = createScore({ layout: { pageSetup: { pageMarginMm: 11 } },
      parts: Array.from({ length: 9 }, (_, index) => createPart({
        name: `Part ${index + 1}`, staves: [createStaff({ measures: [createMeasure({ id: `clef-page-${index}`,
          keySignature: { fifths: family === 'keysignature' ? 4 : 0 },
          voices: [createVoice({ events: [createNote({ id: `clef-page-note-${index}`,
            pitch: { step: 'C', octave: 5 }, duration: createDuration('whole') })] })]
        })] })]
      })) })
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const lastY = Number(container.querySelector('.notation-measure[data-measure-id="clef-page-8"]')!.getAttribute('y'))
    const glyphs = [...container.querySelectorAll(`.vf-${family} text`)]
    expect(lastY + 80).toBeLessThan(plan.pageHeight)
    expect(Math.max(...glyphs.map(glyph => Number(glyph.getAttribute('y')) + 70))).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, parts: score.parts.slice(-1) }))
    expect(container.querySelectorAll(`.vf-${family} text`).length).toBeGreaterThan(0)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
  })

  it('rejects print when a low tie crosses the page and preserves it in a fitting part', () => {
    const draw = StaveTie.prototype.draw
    vi.spyOn(StaveTie.prototype, 'draw').mockImplementation(function (this: StaveTie) {
      const result = draw.call(this)
      const path = this.getSVGElement()?.querySelector('path')
      // jsdom has no SVG geometry; this fixture supplies the known low-note tie ink.
      if (path) Object.defineProperty(path, 'getBBox', { value: () => ({
        x: this.getFirstX(), y: this.getFirstYs()[0]! + 7,
        width: this.getLastX() - this.getFirstX(), height: 6
      }) })
      return result
    })
    const score = createScore({ parts: Array.from({ length: 9 }, (_, index) => createPart({
      name: `Part ${index + 1}`, staves: [createStaff({ measures: [createMeasure({ id: `tie-page-${index}`,
        voices: [createVoice({ events: [0, 1].map(event => createNote({ id: `tie-page-${index}-${event}`,
          pitch: { step: 'C', octave: index === 8 ? 3 : 5 }, position: createTimePosition(event * 2 * TICKS_PER_QUARTER),
          duration: createDuration('half'), ...(index === 8 ? { ties: event ? { stop: true } : { start: true } } : {}) })) })]
      })] })]
    })) })
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const lastY = Number(container.querySelector('.notation-measure[data-measure-id="tie-page-8"]')!.getAttribute('y'))
    const ink = container.querySelector<SVGGraphicsElement>('.vf-stavetie path')!.getBBox()
    expect(lastY + 80).toBeLessThan(plan.pageHeight)
    expect(ink.y + ink.height).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, parts: score.parts.slice(-1) }))
    expect(container.querySelectorAll('.vf-stavetie path')).toHaveLength(1)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
  })

  it.each(['expression', 'dynamic', 'lyric'] as const)('rejects print when lower %s text crosses the page while staff lines fit', kind => {
    const score = createScore({ parts: Array.from({ length: 9 }, (_, index) => createPart({
      name: `Part ${index + 1}`, staves: [createStaff({ measures: [createMeasure({ id: `text-page-${index}`,
        voices: [createVoice({ events: [createNote({ id: `text-page-note-${index}`,
          pitch: { step: 'C', octave: 5 }, duration: createDuration('whole') })] })]
      })] })]
    })), expressionTexts: Array.from({ length: 4 }, (_, index) => ({ id: `page-text-${index}`,
      measureId: 'text-page-8', tick: index * TICKS_PER_QUARTER, text: 'espressivo' })) })
    if (kind !== 'expression') score.expressionTexts = []
    if (kind === 'dynamic') score.dynamics = Array.from({ length: 4 }, (_, index) => ({
      id: `page-dynamic-${index}`, measureId: 'text-page-8', tick: index * TICKS_PER_QUARTER, value: 'ff'
    }))
    if (kind === 'lyric') {
      const note = score.parts.at(-1)!.staves[0]!.measures[0]!.voices[0]!.events[0]!
      if (note.type !== 'note') throw new Error('Expected fixture note')
      note.lyrics =
        Array.from({ length: 4 }, (_, index) => ({ number: index + 1, text: 'espressivo', syllabic: 'single' }))
    }
    const selector = kind === 'expression' ? '.notation-expression-text' : kind === 'dynamic' ? '.notation-dynamic-mark' : '.notation-lyric'
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const lastY = Number(container.querySelector('.notation-measure[data-measure-id="text-page-8"]')!.getAttribute('y'))
    const bottom = Math.max(...[...container.querySelectorAll(selector)]
      .map(text => Number(text.getAttribute('y')) + 3))
    expect(lastY + 80).toBeLessThan(plan.pageHeight)
    expect(bottom).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(JSON.stringify(score)).toBe(original)
    rerender(view({ ...score, parts: score.parts.slice(-1) }))
    expect(container.querySelector(selector)).toBeInTheDocument()
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
  })

  it('moves a later system to the next page when measured text descent exceeds the estimated lane', () => {
    getContextSpy.mockImplementation(() => ({ measureText: (text: string) => ({ width: text.length * 8,
      actualBoundingBoxAscent: 10, actualBoundingBoxDescent: text === 'espressivo' ? 80 : 3,
      actualBoundingBoxLeft: 0, actualBoundingBoxRight: text.length * 8 }) }) as unknown as CanvasRenderingContext2D)
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [0, 1].map(index =>
      createMeasure({ id: `text-reflow-${index}`, voices: [createVoice({ events: [createNote({
        id: `text-reflow-note-${index}`, pitch: { step: 'C', octave: 5 }, duration: createDuration('whole') })] })] })) })] })],
      layout: { systemBreakBeforeMeasureIds: ['text-reflow-1'] },
      expressionTexts: [{ id: 'reflow-text', measureId: 'text-reflow-1', tick: 0, text: 'espressivo' }] })
    const before = JSON.stringify(score)
    const plan = { ...resolvePrintLayoutPlan(score, 'auto'), pageHeight: 450 }
    const { container } = render(<NotationPreview score={score} printLayout printLayoutPlan={plan}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const y = (id: string) => Number(container.querySelector(`.notation-measure[data-measure-id="${id}"]`)!.getAttribute('y'))
    expect(y('text-reflow-0')).toBeLessThan(plan.pageHeight)
    expect(y('text-reflow-1')).toBeGreaterThan(plan.pageHeight)
    const bottom = Number(container.querySelector('.notation-expression-text')!.getAttribute('y')) + 80
    expect(bottom).toBeLessThan(plan.pageHeight * 2)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(JSON.stringify(score)).toBe(before)
  })

  it.each(['crescendo', 'diminuendo'] as const)('rejects print when manual %s ink crosses the page but staff lines fit', type => {
    const score = createScore({ parts: Array.from({ length: 9 }, (_, index) => createPart({
      name: `Part ${index + 1}`, staves: [createStaff({ measures: [createMeasure({ id: `hairpin-page-${index}`,
        voices: [createVoice({ events: [0, 1].map(event => createNote({ id: `hairpin-page-${index}-${event}`,
          pitch: { step: 'C', octave: 5 }, position: createTimePosition(event * 2 * TICKS_PER_QUARTER),
          duration: createDuration('half') })) })]
      })] })]
    })), hairpins: [{ id: 'manual-page-hairpin', type,
      startEventId: 'hairpin-page-8-0', endEventId: 'hairpin-page-8-1',
      engraving: { placement: 'below', height: 8, offsetY: 8 } }] })
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const lastY = Number(container.querySelector('.notation-measure[data-measure-id="hairpin-page-8"]')!.getAttribute('y'))
    const bottom = Math.max(...[...container.querySelectorAll('.notation-hairpin line')]
      .flatMap(line => ['y1', 'y2'].map(attribute => Number(line.getAttribute(attribute))))) + 0.9
    expect(lastY + 80).toBeLessThan(plan.pageHeight)
    expect(bottom).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(JSON.stringify(score)).toBe(original)
    const strokeOnlyPlan = { ...plan, pageHeight: bottom - 0.4 }
    rerender(<NotationPreview score={score} printLayout printLayoutPlan={strokeOnlyPlan}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const centerlineBottom = Math.max(...[...container.querySelectorAll('.notation-hairpin line')]
      .flatMap(line => ['y1', 'y2'].map(attribute => Number(line.getAttribute(attribute)))))
    expect(centerlineBottom).toBeLessThan(strokeOnlyPlan.pageHeight)
    expect(centerlineBottom + 0.9).toBeGreaterThan(strokeOnlyPlan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    const fitting = structuredClone(score)
    fitting.hairpins![0]!.engraving = { placement: 'above', height: 1, offsetY: 0 }
    rerender(view(fitting))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
  })

  it('rejects print when a manual slur crosses the page but its staff lines fit', () => {
    const score = createScore({ parts: Array.from({ length: 9 }, (_, index) => createPart({
      name: `Part ${index + 1}`, staves: [createStaff({ measures: [createMeasure({ id: `manual-page-${index}`,
        voices: [createVoice({ events: [0, 1].map(event => createNote({ id: `manual-page-${index}-${event}`,
          pitch: { step: 'C', octave: index === 8 ? 0 : 5 }, position: createTimePosition(event * 2 * TICKS_PER_QUARTER),
          duration: createDuration('half') })) })]
      })] })]
    })), slurs: [{ id: 'manual-page-slur', startEventId: 'manual-page-8-0', endEventId: 'manual-page-8-1',
      engraving: { placement: 'below', height: 8, offsetY: 8 } }] })
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const view = (current: typeof score, printing = true) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const lastY = Number(container.querySelector('.notation-measure[data-measure-id="manual-page-8"]')!.getAttribute('y'))
    const slur = container.querySelector<SVGPathElement>('.notation-slur')!
    expect(lastY + 80).toBeLessThan(plan.pageHeight)
    expect(Number(slur.dataset.slurInkBottom)).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(JSON.stringify(score)).toBe(original)
    const fitting = structuredClone(score)
    fitting.parts.at(-1)!.staves[0]!.measures[0]!.voices[0]!.events.forEach(event => {
      if (event.type === 'note') event.pitch.octave = 5
    })
    fitting.slurs![0]!.engraving = { placement: 'below', height: 1, offsetY: 0 }
    rerender(view(fitting))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    rerender(view(score, false))
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
  })

  it('starts an oversized print system on the first page without scaling its staves', () => {
    const score = createScore({ parts: Array.from({ length: 12 }, (_, index) => createPart({
      name: `Part ${index + 1}`, staves: [createStaff({
        measures: [createMeasure({ id: `oversized-staff-${index}` })]
      })]
    })) })
    const original = JSON.stringify(score)
    const plan = resolvePrintLayoutPlan(score, 'auto')
    const { container } = render(<NotationPreview score={score} printLayout printLayoutPlan={plan}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const y = (index: number) => Number(container.querySelector(`.notation-measure[data-measure-id="oversized-staff-${index}"]`)!.getAttribute('y'))
    expect(y(0)).toBeLessThan(plan.pageHeight)
    expect(y(11)).toBeGreaterThan(plan.pageHeight)
    expect(container.querySelector('.notation-preview')).toHaveAttribute('data-print-overflow-measure', '1')
    expect(plan.scale).toBe(1)
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each([false, true])('uses system-local staff gaps for an interior lyric peak (print=%s)', printing => {
    const score = createScore({ parts: [0, 1].map(part => createPart({ name: 'Melody', staves: [createStaff({
      measures: [0, 1, 2].map(index => createMeasure({ id: `local-gap-${part}-${index}`,
        voices: [createVoice({ events: [createNote({ id: `local-note-${part}-${index}`,
          duration: createDuration('whole'), pitch: { step: 'C', octave: part ? 3 : 5 },
          ...(part === 0 ? { lyrics: Array.from({ length: index === 1 ? 3 : 1 }, (_, verse) =>
            ({ number: verse + 1, text: 'dolce', syllabic: 'single' as const })) } : {}) })] })] }))
    })] })), layout: { systemBreakBeforeMeasureIds: ['local-gap-0-1', 'local-gap-0-2'] } })
    const original = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const y = (part: number, index: number) => Number(container.querySelector(`.notation-measure[data-measure-id="local-gap-${part}-${index}"]`)!.getAttribute('y'))
    const gaps = [0, 1, 2].map(index => y(1, index) - y(0, index))
    expect(gaps[1]! - gaps[0]!).toBeGreaterThanOrEqual(20)
    expect(gaps[2]).toBeCloseTo(gaps[0]!, 4)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(JSON.stringify(score)).toBe(original)
  })

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
      value: function (this: SVGElement) {
        // Unrelated tests do not provide native SVG path metrics.
        if (this.matches('.vf-stavetie path')) return { x: 0, y: 0, width: 0, height: 0 }
        return ({
          x: 0,
          y: 0,
          width: 24,
          height: 16
        }) as DOMRect
      }
    })
  })

  afterEach(() => {
    delete (SVGElement.prototype as { getBBox?: () => DOMRect }).getBBox
    getContextSpy.mockRestore()
    vi.restoreAllMocks()
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

  it.each([0, 1])('activates staff %i event buttons with Enter and Space without bubbling transport shortcuts', index => {
    const staves = [0, 1].map(i => createStaff({ id: `keyboard-staff-${i}`, measures: [createMeasure({
      voices: [createVoice({ events: [createNote({ id: `keyboard-note-${i}`, pitch: { step: 'C', octave: 4 }, duration: createDuration('whole') })] })]
    })] }))
    const score = createScore({ parts: [createPart({ staves })] })
    const onSelectEvent = vi.fn(), onKey = vi.fn()
    const { container } = render(<div onKeyDown={onKey}><NotationPreview score={score}
      onSelectEvent={onSelectEvent} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} /></div>)
    const target = container.querySelector(`[data-event-id="keyboard-note-${index}"]`)!
    for (const key of ['Enter', ' ']) {
      expect(fireEvent.keyDown(target, { key, shiftKey: true })).toBe(false)
      expect(onSelectEvent).toHaveBeenLastCalledWith(`keyboard-note-${index}`, true,
        expect.objectContaining({ staffId: staves[index]!.id }))
    }
    expect(onSelectEvent).toHaveBeenCalledTimes(2)
    expect(onKey).not.toHaveBeenCalled()
  })

  const createVoltaScore = (measureCount: number): Score => {
    const measures = Array.from({ length: measureCount }, (_, index) =>
      createMeasure({
        id: `volta-measure-${index + 1}`,
        volta:
          index === 0
            ? { number: 1, start: true }
            : index === measureCount - 1
              ? { number: 1, end: true }
              : undefined
      })
    )

    return createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures
            })
          ]
        })
      ]
    })
  }

  const createGrandStaffLabelScore = (measureCount = 1): Score =>
    createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Piano',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: Array.from({ length: measureCount }, (_, index) =>
                createMeasure({
                  id: `P1-S1-M${index + 1}`,
                  number: index + 1,
                  voices: [
                    createVoice({
                      events: [
                        createRest({
                          id: `upper-rest-${index + 1}`,
                          position: createTimePosition(0),
                          duration: { value: 'whole', dots: 0 },
                          fullMeasure: true
                        })
                      ]
                    })
                  ]
                })
              )
            }),
            createStaff({
              id: 'P1-S2',
              measures: Array.from({ length: measureCount }, (_, index) =>
                createMeasure({
                  id: `P1-S2-M${index + 1}`,
                  number: index + 1,
                  voices: [
                    createVoice({
                      events: [
                        createRest({
                          id: `lower-rest-${index + 1}`,
                          position: createTimePosition(0),
                          duration: { value: 'whole', dots: 0 },
                          fullMeasure: true
                        })
                      ]
                    })
                  ]
                })
              )
            })
          ]
        })
      ]
    })

  it('part-layout.grand-staff labels the piano system once and connects staves with a brace', async () => {
    const { container } = render(
      <NotationPreview
        score={createGrandStaffLabelScore()}
        onOpenMeasureContextMenu={vi.fn()}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    const staffLabels = Array.from(
      container.querySelectorAll<SVGTextElement>('.notation-staff-label')
    )
    const firstStaffX = Number(
      container.querySelector<SVGRectElement>('.notation-measure')?.getAttribute('x')
    )
    const grandStaffBrace = container.querySelector<SVGPathElement>(
      '.notation-grand-staff-brace[data-part-id="P1"]'
    )

    expect(staffLabels.map((label) => label.textContent)).toEqual(['Piano'])
    expect(staffLabels.map((label) => label.textContent)).not.toContain('Staff 2')
    expect(Number(staffLabels[0]?.getAttribute('x'))).toBeLessThan(firstStaffX)
    expect(staffLabels[0]).toHaveAttribute('text-anchor', 'end')
    expect(grandStaffBrace).toBeInTheDocument()
    expect(Number(grandStaffBrace?.getAttribute('d')?.match(/^M ([\d.-]+)/)?.[1])).toBeLessThan(firstStaffX)
  })

  it('part-layout.system-labels shows the part label only on the first system', async () => {
    const { container } = render(
      <NotationPreview
        score={createGrandStaffLabelScore(9)}
        onOpenMeasureContextMenu={vi.fn()}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    const staffLabels = Array.from(
      container.querySelectorAll<SVGTextElement>('.notation-staff-label')
    ).map((label) => label.textContent)
    const braces = container.querySelectorAll('.notation-grand-staff-brace')

    expect(staffLabels).toEqual(['Piano'])
    expect(braces.length).toBeGreaterThan(1)
  })

  it.each([
    { sign: 'G' as const, line: 2, glyph: VexFlow.Glyphs.gClef, staveLine: 3 },
    { sign: 'F' as const, line: 4, glyph: VexFlow.Glyphs.fClef, staveLine: 1 },
    { sign: 'C' as const, line: 3, glyph: VexFlow.Glyphs.cClef, staveLine: 2 }
  ])('clef.inline-change aligns the $sign glyph to its actual staff', async ({ sign, line, glyph, staveLine }) => {
    const score = createGrandStaffLabelScore()
    const lowerEvent = score.parts[0]!.staves[1]!.measures[0]!.voices[0]!.events[0]!
    let expectedY = 0
    const draw = StaveNote.prototype.draw
    vi.spyOn(StaveNote.prototype, 'draw').mockImplementation(function (this: StaveNote) {
      if (this.getAttribute('data-event-id') === lowerEvent.id) expectedY = this.getStave()!.getYForLine(staveLine)
      return draw.call(this)
    })
    lowerEvent.clefBefore = { sign, line }
    const { container } = render(
      <NotationPreview
        score={score}
        onOpenMeasureContextMenu={vi.fn()}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(
        container.querySelector(
          '.notation-inline-clef[data-event-id="lower-rest-1"]'
        )
      ).toBeInTheDocument()
    })
    const marker = container.querySelector('.notation-inline-clef[data-event-id="lower-rest-1"]')!
    expect(marker).toHaveTextContent(glyph)
    expect(Number(marker.getAttribute('y'))).toBe(expectedY)
  })

  it.each([0, 1])('clef.inline-change applies by tick across voices on staff %i only and preserves next-measure clef', target => {
    const observed = new Map<string, { line: number; keys: string[] }>()
    const draw = StaveNote.prototype.draw
    vi.spyOn(StaveNote.prototype, 'draw').mockImplementation(function (this: StaveNote) {
      observed.set(String(this.getAttribute('data-event-id')), { line: this.getKeyProps()[0]!.line, keys: this.getKeys() })
      return draw.call(this)
    })
    const note = (id: string, tick: number, value: 'quarter' | 'half' | 'whole' = 'quarter') => createNote({
      id, pitch: { step: 'C', octave: 4 }, position: createTimePosition(tick), duration: createDuration(value)
    })
    const score = createScore({ parts: [createPart({ staves: [0, 1].map(index => createStaff({ measures: [
      createMeasure({ id: `inline-${index}-m1`, voices: [createVoice({ id: `inline-${index}-v1`, events: [
        note(`inline-${index}-before`, 0),
        { ...note(`inline-${index}-change`, TICKS_PER_QUARTER), ...(index === target ? { clefBefore: { sign: 'F' as const, line: 4 } } : {}) },
        createRest({ id: `inline-${index}-rest`, position: createTimePosition(2 * TICKS_PER_QUARTER), duration: createDuration('quarter') }),
        note(`inline-${index}-after`, 3 * TICKS_PER_QUARTER)
      ] }), createVoice({ id: `inline-${index}-v2`, events: [
        note(`inline-${index}-v2-before`, 0, 'half'), note(`inline-${index}-v2-after`, 2 * TICKS_PER_QUARTER, 'half')
      ] })] }),
      createMeasure({ id: `inline-${index}-m2`, number: 2, voices: [createVoice({ events: [note(`inline-${index}-next`, 0, 'whole')] })] })
    ] })) })] })
    const original = JSON.stringify(score)
    render(<NotationPreview score={score} onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()}
      onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const line = (clef: string) => new StaveNote({ clef, keys: ['c/4'], duration: 'q' }).getKeyProps()[0]!.line
    for (const index of [0, 1]) {
      for (const suffix of ['before', 'v2-before', 'next']) expect(observed.get(`inline-${index}-${suffix}`)?.line).toBe(line('treble'))
      for (const suffix of ['change', 'after', 'v2-after']) expect(observed.get(`inline-${index}-${suffix}`)?.line).toBe(line(index === target ? 'bass' : 'treble'))
      // Formatter may align a polyphonic rest vertically, but its clef-specific key must still change.
      expect(observed.get(`inline-${index}-rest`)?.keys).toEqual([index === target ? 'd/3' : 'b/4'])
    }
    expect(JSON.stringify(score)).toBe(original)
  })

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
    const ornament = container.querySelector<SVGTextElement>('.notation-ornament')!
    expect(ornament.textContent).toBe([
      VexFlow.Glyphs.ornamentTrill,
      VexFlow.Glyphs.ornamentMordent,
      VexFlow.Glyphs.ornamentTurn
    ].join(' '))
    expect(ornament.style.fontFamily).toContain('Bravura')
    expect(ornament.style.fontWeight).not.toBe('700')
    const graceGroup = container.querySelector<SVGGElement>(
      '.notation-grace-notes[data-event-id="lower-staff-marked-note"]'
    )

    expect(ornamentY).toBeLessThanOrEqual(fermataY - 24)
    expect(breathX).toBeGreaterThanOrEqual(fermataX + 24)
    expect(graceGroup?.textContent).toBe('')
    expect(graceGroup?.querySelector('.notation-grace-notehead')).toBeInTheDocument()
    expect(graceGroup?.querySelector('.notation-grace-stem')).toBeInTheDocument()
    expect(graceGroup?.querySelector('.notation-grace-slash')).toBeInTheDocument()
  })

  it.each([false, true])('renders an incoming partial tie at the second ending without bridging the first (print=%s)', printing => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-branch-ties.musicxml', 'utf8'))
    const snapshot = JSON.stringify(score)
    const draw = vi.spyOn(StaveTie.prototype, 'draw')
    const { container } = render(<NotationPreview score={score}
      {...(printing ? { printLayoutPlan: resolvePrintLayoutPlan(score, 'auto') } : {})}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    expect(container.querySelectorAll('g.vf-stavetie')).toHaveLength(2)
    const ties = draw.mock.instances.slice(-2) as StaveTie[]
    expect(ties[0]!.isPartial()).toBe(false)
    expect(ties[1]!.isPartial()).toBe(true)
    expect(container.querySelectorAll('.notation-event')).toHaveLength(3)
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it('assigns cross-system and alternate-ending tie pieces to their own systems', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-branch-ties.musicxml', 'utf8'))
    score.layout = { systemBreakBeforeMeasureIds: score.parts[0]!.staves[0]!.measures.slice(1).map(measure => measure.id) }
    const snapshot = JSON.stringify(score)
    const playback = createPlaybackTimeline(score)
    const { container } = render(<NotationPreview score={score} printLayout printLayoutPlan={resolvePrintLayoutPlan(score, 'auto')}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    expect([...container.querySelectorAll('.vf-stavetie')].map(tie => tie.getAttribute('data-tie-system'))).toEqual(['0', '1', '2'])
    expect(container.querySelectorAll('.notation-event')).toHaveLength(3)
    expect(container.querySelector('.notation-preview')).not.toHaveAttribute('data-print-overflow-measure')
    expect(createPlaybackTimeline(score)).toEqual(playback)
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([false, true])('renders an open volta end without continuing into the next measure (print=%s)', printing => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/volta-open-end.musicxml', 'utf8'))
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const marks = [...container.querySelectorAll('.notation-volta-mark')]
    expect(marks).toHaveLength(2)
    expect(marks.map(mark => mark.querySelector('text')!.textContent)).toEqual(['1.', '2.'])
    expect(marks.map(mark => mark.querySelectorAll('line').length)).toEqual([3, 2])
    expect(marks[1]).toHaveAttribute('data-volta-end', 'true')
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([false, true])('keeps an open volta ending across system breaks (print=%s)', printing => {
    const score = createVoltaScore(3)
    const measures = score.parts[0]!.staves[0]!.measures
    measures[2]!.volta!.endStyle = 'open'
    score.layout = { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) }
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const marks = [...container.querySelectorAll('.notation-volta-mark')]
    expect(marks).toHaveLength(3)
    expect(marks.map(mark => mark.querySelectorAll('line').length)).toEqual([2, 1, 1])
    expect(marks[2]).toHaveAttribute('data-volta-end', 'true')
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([false, true])('renders source-order volta slurs without unfolding playback passes (print=%s)', async printing => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-slur-contract.musicxml', 'utf8'))
    const measures = score.parts[0]!.staves[0]!.measures
    score.layout = { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) }
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score}
      {...(printing ? { printLayoutPlan: resolvePrintLayoutPlan(score, 'auto') } : {})}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelectorAll('.notation-slur')).toHaveLength(3))
    const segments = [...container.querySelectorAll<SVGElement>('.notation-slur')]
    expect(segments.map(segment => JSON.parse(segment.dataset.spanSegment!)[2])).toEqual(measures.map(measure => measure.id))
    expect(container.querySelectorAll('.notation-event')).toHaveLength(4)
    expect(container.querySelectorAll('g.vf-stavetie')).toHaveLength(1)
    expect(container.querySelectorAll('.notation-volta-mark')).toHaveLength(2)
    for (const segment of segments) expect(segment.getAttribute('d')).toMatch(/ Z$/)
    const timeline = createPlaybackTimeline(score)
    expect(timeline.totalBeats).toBe(16)
    expect(timeline.events.map(event => event.startBeat)).toEqual([0,4,8,12])
    expect(timeline).toEqual(createPlaybackTimeline({ ...score, slurs: [] }))
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([false, true].flatMap(printing => ['automatic', 'whole', 'segment'].map(manual => [printing, manual] as const)))('keeps volta hooks and numbers above slur ink (print=%s, geometry=%s)', (printing, manual) => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-slur-contract.musicxml', 'utf8'))
    const part = score.parts[0]!, staff = part.staves[0]!, measures = staff.measures
    score.layout = { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) }
    const geometry = { placement: 'above' as const, height: 4, offsetY: -1 }
    if (manual === 'whole') score.slurs![0]!.engraving = geometry
    if (manual === 'segment') score.slurs![0]!.engraving = { segments: [{
      partId: part.id, staffId: staff.id, startMeasureId: measures[2]!.id, endMeasureId: measures[2]!.id, geometry
    }] }
    const snapshot = JSON.stringify(score)
    const props = { onSelectEvent: vi.fn(), onSelectEventRange: vi.fn(), onSelectLyric: vi.fn(),
      onSelectMeasure: vi.fn(), onOpenMeasureContextMenu: vi.fn() }
    const baseline = render(<NotationPreview {...props} score={{ ...score, slurs: [] }}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined} />)
    const xCoordinates = (container: HTMLElement) => [...container.querySelectorAll('.notation-volta-mark line')]
      .map(line => [line.getAttribute('x1'), line.getAttribute('x2')])
    const originalX = xCoordinates(baseline.container)
    baseline.unmount()
    const { container, unmount } = render(<NotationPreview {...props} score={score}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined} />)
    const slurs = [...container.querySelectorAll('.notation-slur')]
    const voltas = [...container.querySelectorAll('.notation-volta-mark')]
    expect(voltas).toHaveLength(2)
    for (const [index, volta] of voltas.entries()) {
      const slur = slurs[index + 1]!
      const [, y1, , cy, , y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      const filledControlY = Number(slur.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)![3])
      const halfThickness = (cy! - filledControlY) / 2
      const t = (y1! - cy!) / (y1! - 2 * cy! + y2!)
      const top = Math.min(y1!, y2!, ...(t > 0 && t < 1 ? [(1-t)**2*y1!+2*t*(1-t)*cy!+t*t*y2!] : [])) - halfThickness
      const lineBottom = Math.max(...[...volta.querySelectorAll('line')].flatMap(line => [Number(line.getAttribute('y1')), Number(line.getAttribute('y2'))])) + 0.5
      expect(top - lineBottom).toBeGreaterThanOrEqual(6 - 0.01)
      const labelBottom = Number(volta.querySelector('text')!.getAttribute('y')) + 3
      expect(top - labelBottom).toBeGreaterThanOrEqual(6)
      if (manual === 'whole' || manual === 'segment' && index === 1) expect(cy).toBeCloseTo(Math.min(y1!, y2!) - 40)
    }
    expect(xCoordinates(container)).toEqual(originalX)
    expect(JSON.stringify(score)).toBe(snapshot)
    unmount()
  })

  it('aligns adjacent ending brackets in one system after slur clearance', () => {
    const score = parseMusicXml(readFileSync('src/musicxml/fixtures/repeat-volta-slur-contract.musicxml', 'utf8'))
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    expect(container.querySelectorAll('.notation-slur')).toHaveLength(1)
    const brackets = [...container.querySelectorAll('.notation-volta-mark')]
    expect(brackets).toHaveLength(2)
    const heights = brackets.map(bracket => Number([...bracket.querySelectorAll('line')].at(-1)!.getAttribute('y1')))
    expect(heights[0]).toBeCloseTo(heights[1]!)
  })

  it('renders short automatic voltas across their covered measures', async () => {
    const { container } = render(
      <NotationPreview
        score={createVoltaScore(3)}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelectorAll('.notation-volta-mark')).toHaveLength(3)
    })

    const voltas = [...container.querySelectorAll('.notation-volta-mark')]

    expect(voltas[0]).toHaveAttribute('data-volta-start', 'true')
    expect(voltas[0]).toHaveAttribute('data-volta-end', 'false')
    expect(voltas[2]).toHaveAttribute('data-volta-start', 'false')
    expect(voltas[2]).toHaveAttribute('data-volta-end', 'true')
  })

  it('keeps long automatic voltas from stretching across every system', async () => {
    const { container } = render(
      <NotationPreview
        score={createVoltaScore(5)}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(container.querySelectorAll('.notation-volta-mark')).toHaveLength(1)
    })

    const [volta] = [...container.querySelectorAll('.notation-volta-mark')]

    expect(volta).toHaveAttribute('data-volta-start', 'true')
    expect(volta).toHaveAttribute('data-volta-end', 'false')
  })

  it.each([false, true])('honors explicit long volta display endpoints without rewriting repeat data (print=%s)', printing => {
    const score = createVoltaScore(5)
    const measures = score.parts[0]!.staves[0]!.measures
    score.layout = { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) }
    for (const endStyle of ['closed', 'open'] as const) for (const endpoint of [0, 2, 4]) {
      measures[4]!.volta!.endStyle = endStyle
      Object.assign(measures[0]!.volta!, { displayEndMeasureId: measures[endpoint]!.id })
      const snapshot = JSON.stringify(score)
      const view = render(<NotationPreview score={score} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
      const marks = [...view.container.querySelectorAll('.notation-volta-mark')]
      expect(marks).toHaveLength(endpoint + 1)
      expect(marks.at(-1)).toHaveAttribute('data-volta-end', 'true')
      expect(marks.at(-1)!.querySelectorAll('line')).toHaveLength((endpoint === 0 ? 2 : 1) + (endStyle === 'closed' ? 1 : 0))
      expect(measures[4]!.volta).toEqual({ number: 1, end: true, endStyle })
      expect(JSON.stringify(score)).toBe(snapshot)
      view.unmount()
    }
  })

  it.each([[0, false], [0, true], [1, false], [1, true]] as const)(
    'projects shared repeats from part %s without shifting same-onset whole notes (print=%s)', (sourceIndex, printing) => {
      const score = createScore({ parts: [0, 1].map(partIndex => createPart({
        id: `repeat-part-${partIndex}`, name: `Part ${partIndex}`,
        staves: [createStaff({ id: `repeat-staff-${partIndex}`, measures: [0, 1, 2].map(index => createMeasure({
          id: `repeat-measure-${partIndex}-${index}`, number: index + 1,
          voices: [createVoice({ events: [createNote({ id: `repeat-note-${partIndex}-${index}`,
            pitch: { step: 'C', octave: 4 }, duration: createDuration('whole') })] })]
        })) })]
      })) })
      const source = score.parts[sourceIndex]!.staves[0]!.measures
      source[0]!.repeat = { start: true }
      source[1]!.repeat = { end: true }
      source[1]!.volta = { number: 1, start: true, end: true }
      source[2]!.volta = { number: 2, start: true, end: true }
      const before = structuredClone(score)
      const draw = vi.spyOn(StaveNote.prototype, 'draw')
      const view = render(<NotationPreview score={score} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
      for (const index of [0, 1, 2]) {
        const notes = [0, 1].map(part => [...draw.mock.contexts].reverse().find((note): note is StaveNote =>
          note instanceof StaveNote && note.getAttribute('data-event-id') === `repeat-note-${part}-${index}`)!)
        expect(notes.every(Boolean)).toBe(true)
        expect(notes[0]!.getAbsoluteX()).toBeCloseTo(notes[1]!.getAbsoluteX(), 5)
        if (index === 0) for (const note of notes) {
          expect((note.getStave()!.getModifiers()[0] as Barline).getType()).toBe(BarlineType.REPEAT_BEGIN)
        }
        if (index === 1) for (const note of notes) {
          expect((note.getStave()!.getModifiers()[1] as Barline).getType()).toBe(BarlineType.REPEAT_END)
        }
      }
      expect(view.container.querySelectorAll('.notation-volta-mark')).toHaveLength(2)
      expect(score).toEqual(before)
      view.unmount()
      draw.mockClear()
      score.parts[1 - sourceIndex]!.staves[0]!.measures.pop()
      const unaligned = structuredClone(score)
      render(<NotationPreview score={score} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
      for (const part of [0, 1]) {
        const note = [...draw.mock.contexts].reverse().find((note): note is StaveNote =>
          note instanceof StaveNote && note.getAttribute('data-event-id') === `repeat-note-${part}-0`)!
        expect((note.getStave()!.getModifiers()[0] as Barline).getType()).toBe(
          part === sourceIndex ? BarlineType.REPEAT_BEGIN : BarlineType.SINGLE)
      }
      expect(score).toEqual(unaligned)
    }
  )

  it.each([[0, false, false], [0, true, false], [1, false, false], [1, true, false],
    [0, false, true], [0, true, true], [1, false, true], [1, true, true]] as const)(
    'aligns mixed-rhythm staves with dense part %s (print=%s, triplets=%s)', (densePart, printing, triplets) => {
      const score = createScore({ parts: [0, 1].map(part => createPart({
        id: `rhythm-part-${part}`, name: `Rhythm ${part}`,
        staves: [createStaff({ id: `rhythm-staff-${part}`, measures: [0, 1].map(index => createMeasure({
          id: `rhythm-measure-${part}-${index}`, number: index + 1,
          clef: part ? { sign: 'F', line: 4 } : { sign: 'G', line: 2 },
          voices: [createVoice({ events: Array.from({ length: part === densePart ? 8 : 4 }, (_, event) => createNote({
            id: `rhythm-${part}-${index}-${event}`,
            pitch: { step: 'C', octave: part ? 3 : 5 },
            position: createTimePosition(event * TICKS_PER_QUARTER / (part === densePart ? 2 : 1)),
            duration: createDuration(part === densePart ? 'eighth' : 'quarter')
          })) })]
        })) })]
      })) })
      if (triplets) {
        for (const [index, measure] of score.parts[densePart]!.staves[0]!.measures.entries()) {
          const voice = measure.voices[0]!
          voice.events = Array.from({ length: 6 }, (_, event) => createNote({
            id: `rhythm-${densePart}-${index}-${event}`, pitch: { step: 'C', octave: densePart ? 3 : 5 },
            position: createTimePosition(event < 3 ? event * TICKS_PER_QUARTER / 3 : (event - 2) * TICKS_PER_QUARTER),
            duration: event < 3 ? { ...createDuration('eighth'), tuplet: { actualNotes: 3, normalNotes: 2 } } : createDuration('quarter')
          }))
          voice.tuplets = [{ id: `triplet-${index}`, eventIds: voice.events.slice(0, 3).map(event => event.id), actualNotes: 3, normalNotes: 2 }]
          measure.voices.push(createVoice({ id: 'voice-2', events: [0, 1].map(event => createNote({
            id: `lower-half-${index}-${event}`, pitch: { step: 'E', octave: densePart ? 3 : 5 },
            position: createTimePosition(event * 2 * TICKS_PER_QUARTER), duration: createDuration('half')
          })) }))
          expect(validateMeasureRhythm(measure).issues).toEqual([])
        }
      }
      score.layout = { systemBreakBeforeMeasureIds: ['rhythm-measure-0-1'] }
      const snapshot = structuredClone(score)
      const draw = vi.spyOn(StaveNote.prototype, 'draw')
      render(<NotationPreview score={score} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(score, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
      for (const measure of [0, 1]) for (const beat of [0, 1, 2, 3]) {
        const notes = [0, 1].map(part => [...draw.mock.contexts].reverse().find((note): note is StaveNote =>
          note instanceof StaveNote && note.getAttribute('data-event-id') ===
          `rhythm-${part}-${measure}-${part === densePart ? triplets ? beat === 0 ? 0 : beat + 2 : beat * 2 : beat}`)!)
        expect(notes.every(Boolean)).toBe(true)
        expect(notes[0]!.getAbsoluteX()).toBeCloseTo(notes[1]!.getAbsoluteX(), 5)
      }
      expect(score).toEqual(snapshot)
    }
  )

  it.each([[0, false], [0, true], [1, false], [1, true]] as const)(
    'places polyphonic slurs outside their voice (part=%s, print=%s)', (partIndex, printing) => {
      const score = createScore({ parts: [0, 1].map(part => createPart({
        id: `poly-part-${part}`, staves: [createStaff({ id: `poly-staff-${part}`,
          measures: [0, 1].map(index => createMeasure({ id: `poly-measure-${part}-${index}`, number: index + 1,
            voices: [1, 2].map(voice => createVoice({ id: `voice-${voice}`,
              events: [0, 1, 2, 3].map(beat => createNote({
                id: `poly-${part}-${index}-${voice}-${beat}`,
                pitch: { step: voice === 1 ? 'C' : 'G', octave: voice === 1 ? 5 : 4 },
                articulations: ['staccato'],
                ...(voice === 2 ? { lyrics: [{ number: 1, text: 'dolce', syllabic: 'single' as const }] } : {}),
                position: createTimePosition(beat * TICKS_PER_QUARTER), duration: createDuration('quarter')
              }))
            }))
          }))
        })]
      })) })
      score.layout = { systemBreakBeforeMeasureIds: ['poly-measure-0-1'] }
      score.slurs = [1, 2].map(voice => ({ id: `poly-slur-${voice}`,
        startEventId: `poly-${partIndex}-0-${voice}-0`, endEventId: `poly-${partIndex}-1-${voice}-3`
      }))
      score.hairpins = [{ id: 'manual-poly-hairpin', type: 'crescendo',
        startEventId: `poly-${partIndex}-0-2-0`, endEventId: `poly-${partIndex}-1-2-3`,
        engraving: { placement: 'below', offsetY: 1, height: 2 } }]
      const before = structuredClone(score)
      const props = { score, printLayout: printing,
        printLayoutPlan: printing ? resolvePrintLayoutPlan(score, 'auto') : undefined,
        inlineLyricEditor: printing ? undefined : { eventId: `poly-${partIndex}-0-2-0`, number: 1, value: 'dolce',
          syllabic: 'single' as const, onCommit: vi.fn(), onMoveVerse: vi.fn() },
        onSelectEvent: vi.fn(), onSelectEventRange: vi.fn(), onSelectLyric: vi.fn(),
        onSelectMeasure: vi.fn(), onOpenMeasureContextMenu: vi.fn() }
      const draw = vi.spyOn(StaveNote.prototype, 'draw')
      const view = render(<NotationPreview {...props} />)
      const automaticPaths = [...view.container.querySelectorAll<SVGPathElement>('.notation-slur')]
      expect(automaticPaths.map(path => path.dataset.annotationLane))
        .toEqual(['upper-slur', 'upper-slur', 'lower-slur', 'lower-slur'])
      for (const measure of [0, 1]) {
        const lyric = view.container.querySelector<SVGTextElement>(`.notation-lyric[data-event-id="poly-${partIndex}-${measure}-2-0"]`)!
        expect(Number(lyric.getAttribute('y')) - 10).toBeGreaterThanOrEqual(
          Number(automaticPaths[2 + measure]!.dataset.slurInkBottom) + 6 - 0.01)
      }
      if (!printing) {
        const lyric = view.container.querySelector<SVGTextElement>(`.notation-lyric[data-event-id="poly-${partIndex}-0-2-0"]`)!
        const editor = view.container.querySelector('.notation-lyric-editor')!
        expect(Number(editor.getAttribute('y')) + 22).toBeCloseTo(Number(lyric.getAttribute('y')))
        expect(props.inlineLyricEditor!.onCommit).not.toHaveBeenCalled()
      }
      for (const voice of [1, 2]) {
        const note = [...draw.mock.contexts].reverse().find((note): note is StaveNote =>
          note instanceof StaveNote && note.getAttribute('data-event-id') === `poly-${partIndex}-0-${voice}-0`)!
        const stem = note.getStemExtents()
        const edge = voice === 1 ? Math.min(stem.topY, stem.baseY) - 10 : Math.max(stem.topY, stem.baseY) + 10
        expect(Number(automaticPaths[(voice - 1) * 2]!.dataset.slurY1)).toBeCloseTo(edge)
      }
      expect(score).toEqual(before)
      const hairpinYs = (container: HTMLElement) => [...container.querySelectorAll<SVGGElement>('.notation-hairpin')]
        .map(group => Number(group.querySelector('line')!.getAttribute('y1')) - Number(group.dataset.spanStaffY))
      const manualHairpinYs = hairpinYs(view.container)
      view.unmount()
      score.slurs[0]!.engraving = { placement: 'below', height: 3, offsetY: 1 }
      score.slurs[1]!.engraving = { placement: 'above', height: 3, offsetY: -1 }
      const manual = structuredClone(score)
      const manualView = render(<NotationPreview {...props} />)
      expect(hairpinYs(manualView.container)).toEqual(manualHairpinYs)
      const paths = [...manualView.container.querySelectorAll<SVGPathElement>('.notation-slur')]
      expect(paths.map(path => path.dataset.annotationLane))
        .toEqual(['lower-slur', 'lower-slur', 'upper-slur', 'upper-slur'])
      for (const [index, path] of paths.entries()) {
        const y1 = Number(path.dataset.slurY1), y2 = Number(path.dataset.slurY2)
        expect(Number(path.dataset.slurControlY)).toBeCloseTo(index < 2 ? Math.max(y1, y2) + 30 : Math.min(y1, y2) - 30)
      }
      expect(score).toEqual(manual)
    }
  )

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

  it.each(['auto', 'above', 'below'] as const)('keeps short slurs arched with tapered contours and centerline hit targets (%s)', async (placement) => {
    const events = [
      createNote({
        id: 'short-slur-start',
        position: createTimePosition(0),
        pitch: { step: 'B', octave: 4 }
      }),
      createNote({
        id: 'short-slur-end',
        position: createTimePosition(TICKS_PER_QUARTER / 2),
        pitch: { step: 'C', octave: 5 }
      })
    ]
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [createVoice({ events })]
                })
              ]
            })
          ]
        })
      ],
      slurs: [
        {
          id: 'short-slur',
          startEventId: events[0].id,
          endEventId: events[1].id,
          ...(placement === 'auto' ? {} : { engraving: { placement, offsetX: 1, offsetY: -1, height: 3 } })
        }
      ]
    })
    const selectSpan = vi.fn()
    const { container } = render(
      <NotationPreview
        score={score}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
        onSelectSpan={selectSpan}
      />
    )

    await waitFor(() => {
      expect(container.querySelector('.notation-slur')).toBeInTheDocument()
    })

    const slur = container.querySelector<SVGPathElement>('.notation-slur')!
    const y1 = Number(slur.getAttribute('data-slur-y1'))
    const y2 = Number(slur.getAttribute('data-slur-y2'))
    const controlY = Number(slur.getAttribute('data-slur-control-y'))
    const lane = slur.getAttribute('data-annotation-lane')
    const outline = slur.getAttribute('d')!
    expect(outline).toMatch(/^M .+ Q .+ Q .+ Z$/)
    const points = [...outline.matchAll(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)].map(match => Number(match[0]))
    expect(points).toHaveLength(10)
    const [startX, startY, outerX, outerY, endX, endY, innerX, innerY, closeX, closeY] = points
    expect([startX, startY]).toEqual([closeX, closeY])
    expect([startY, endY]).toEqual([y1, y2])
    expect(outerX).toBe(innerX)
    expect((outerY + innerY) / 2).toBeCloseTo(controlY)
    const thicknessAt = (t: number) => 2 * t * (1 - t) * Math.abs(outerY - innerY)
    expect(thicknessAt(0)).toBe(0)
    expect(thicknessAt(1)).toBe(0)
    expect(thicknessAt(0.5)).toBeCloseTo(Math.min(3.2, Math.max(2.2, Math.abs(endX - startX) * 0.022)))
    expect(Number(thicknessAt(0.5).toFixed(6))).toBeGreaterThanOrEqual(2.2)
    expect(Number(thicknessAt(0.5).toFixed(6))).toBeLessThanOrEqual(3.2)
    expect(thicknessAt(0.25)).toBeLessThan(thicknessAt(0.5))
    const hit = slur.parentElement!.querySelector('.notation-span-hit')!
    expect(hit.getAttribute('d')).toBe(`M ${startX} ${startY} Q ${outerX} ${controlY} ${endX} ${endY}`)
    fireEvent.click(hit)
    expect(selectSpan).toHaveBeenCalledWith(expect.objectContaining({ kind: 'slur', id: 'short-slur' }))
    if (placement !== 'auto') {
      expect(lane).toBe(placement === 'above' ? 'upper-slur' : 'lower-slur')
      expect(Math.abs(controlY - (placement === 'above' ? Math.min(y1, y2) : Math.max(y1, y2)))).toBe(30)
    }

    if (lane === 'upper-slur') {
      expect(controlY).toBeLessThanOrEqual(Math.min(y1, y2) - 14)
    } else {
      expect(controlY).toBeGreaterThanOrEqual(Math.max(y1, y2) + 14)
    }
  })

  it.each([
    ['above', 'none'], ['below', 'none'], ['above', 'whole'], ['below', 'whole'],
    ['above', 'first-segment'], ['below', 'first-segment']
  ] as const)('angles cross-system slur hanging ends away from the staff (%s, manual=%s)', async (side, manual) => {
    const measures = [0, 1, 2].map(index => createMeasure({
      id: `partial-m${index}`,
      voices: [createVoice({ events: [
        createNote({ id: `partial-n${index}`, position: createTimePosition(0),
          pitch: { step: 'C', octave: side === 'above' ? 5 : 4 }, duration: createDuration('quarter') }),
        createRest({ id: `partial-r${index}`, position: createTimePosition(TICKS_PER_QUARTER), duration: createDuration('half', 1) })
      ] })]
    }))
    const score = createScore({
      parts: [createPart({ id: 'P1', name: 'Melody', staves: [createStaff({ id: 'S1', measures })] })],
      layout: { systemBreakBeforeMeasureIds: measures.slice(1).map(measure => measure.id) },
      slurs: [{ id: 'partial-slur', startEventId: 'partial-n0', endEventId: 'partial-n2',
        ...(manual === 'whole' ? { engraving: { placement: side, offsetY: 2, height: 3 } }
          : manual === 'first-segment' ? { engraving: { segments: [{ partId: 'P1', staffId: 'S1',
            startMeasureId: 'partial-m0', endMeasureId: 'partial-m0',
            geometry: { placement: side, offsetY: 2, height: 3 } }] } } : {}) }]
    })
    const storedEngraving = JSON.stringify(score.slurs?.[0]?.engraving)
    for (const measure of measures) expect(validateMeasureRhythm(measure).issues).toEqual([])
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} onSelectSpan={vi.fn()} />)
    await waitFor(() => expect(container.querySelectorAll('.notation-slur')).toHaveLength(3))
    const segments = [...container.querySelectorAll<SVGPathElement>('.notation-slur')]
    const y = (segment: SVGPathElement, end: 1 | 2) => Number(segment.getAttribute(`data-slur-y${end}`))
    const direction = side === 'above' ? -1 : 1
    for (const [index, segment] of segments.entries()) {
      expect(segment).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
      expect(segment.getAttribute('d')).toMatch(/ Z$/)
      expect(segment.parentElement!.querySelector('.notation-span-hit')).toHaveAttribute('d', segment.getAttribute('data-span-hit-path'))
      if (manual === 'whole' || (manual === 'first-segment' && index === 0)) {
        expect(y(segment, 1)).toBe(y(segment, 2))
        expect(Number(segment.getAttribute('data-slur-control-y'))).toBeCloseTo(y(segment, 1) + direction * 30)
      }
    }
    if (manual !== 'whole') {
      if (manual === 'none') expect(direction * (y(segments[0]!, 2) - y(segments[0]!, 1))).toBeGreaterThanOrEqual(8)
      expect(direction * (y(segments[2]!, 1) - y(segments[2]!, 2))).toBeGreaterThanOrEqual(8)
      expect(y(segments[1]!, 1)).toBe(y(segments[1]!, 2))
    }
    expect(JSON.stringify(score.slurs?.[0]?.engraving)).toBe(storedEngraving)
  })

  it.each(['above', 'below', 'stem-side'] as const)('clears an interior opposite-direction stem with an automatic %s slur', async scenario => {
    const side = scenario === 'below' ? 'below' : 'above'
    const anchor = { step: side === 'above' ? 'C' : 'A', octave: scenario === 'above' ? 5 : 4 } as const
    const events = [
      createNote({ id: 'stem-start', position: createTimePosition(0), pitch: anchor }),
      createNote({ id: 'stem-middle', position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: scenario === 'stem-side' ? 'D' : side === 'above' ? 'A' : 'B', octave: 4 } }),
      createNote({ id: 'stem-end', position: createTimePosition(TICKS_PER_QUARTER * 2), pitch: anchor }),
      createRest({ id: 'stem-rest', position: createTimePosition(TICKS_PER_QUARTER * 3), duration: createDuration('quarter') })
    ]
    const score = createScore({ parts: [createPart({ id: 'P1', name: 'Melody', staves: [createStaff({ id: 'S1',
      measures: [createMeasure({ id: 'stem-measure', voices: [createVoice({ events })] })] })] })],
      slurs: [{ id: 'stem-slur', startEventId: 'stem-start', endEventId: 'stem-end' }],
      ...(scenario === 'stem-side' ? { dynamics: [{ id: 'stem-dynamic', measureId: 'stem-measure', value: 'mf' as const }] } : {}) })
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
    const stem = container.querySelector('.notation-event[data-event-id="stem-middle"] .vf-stem path')!
    expect(stem).toBeInTheDocument()
    const stemNumbers = stem.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    const [x1, y1, cx, cy, x2, y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1! + x2!) / 2)
    const t = (stemNumbers[0]! - x1!) / (x2! - x1!)
    const centerY = (1-t)**2*y1! + 2*t*(1-t)*cy! + t*t*y2!
    const stemYs = stemNumbers.filter((_, index) => index % 2 === 1)
    if (side === 'above') expect(centerY + 1.6).toBeLessThanOrEqual(Math.min(...stemYs) - 4)
    else expect(centerY - 1.6).toBeGreaterThanOrEqual(Math.max(...stemYs) + 4)
    if (scenario === 'stem-side') {
      const startStem = container.querySelector('.notation-event[data-event-id="stem-start"] .vf-stem path')!
      const numbers = startStem.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      expect(y1).toBeLessThanOrEqual(Math.min(...numbers.filter((_, index) => index % 2 === 1)) - 4)
      expect(Math.min(y1!, y2!) - cy!).toBeLessThanOrEqual(28)
    }
  })

  it.each(['single', 'multiple', 'partial'] as const)('clears actual %s beam polygons and preserves manual slurs', async kind => {
    for (const side of ['above', 'below'] as const) for (const manual of [false, true]) {
      const values = kind === 'single' ? ['eighth', 'eighth'] as const
        : kind === 'multiple' ? ['16th', '16th', '16th', '16th'] as const : ['16th', 'eighth', '16th'] as const
      const steps = side === 'above' ? ['A','G','F','G'] as const : ['D','E','F','E'] as const
      const anchor = { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 } as const
      let beat = 1
      const middle = values.map((value,index) => {
        const note = createNote({ id: `beam-middle-${index}`, pitch: { step: steps[index]!, octave: side === 'above' ? 4 : 5 },
          position: createTimePosition(beat*TICKS_PER_QUARTER), duration: createDuration(value) })
        beat += value === 'eighth' ? 0.5 : 0.25
        return note
      })
      const measure = createMeasure({ voices: [createVoice({ events: [
        createNote({ id: 'beam-start', pitch: anchor }), ...middle,
        createNote({ id: 'beam-end', pitch: anchor, position: createTimePosition(2*TICKS_PER_QUARTER) }),
        createRest({ id: 'beam-tail', position: createTimePosition(3*TICKS_PER_QUARTER), duration: createDuration('quarter') })
      ] })] })
      expect(validateMeasureRhythm(measure).issues).toEqual([])
      const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
        slurs: [{ id: 'beam-slur', startEventId: 'beam-start', endEventId: 'beam-end',
          ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) }] })
      const snapshot = JSON.stringify(score)
      const { container, unmount } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()} />)
      await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
      const slur = container.querySelector('.notation-slur')!
      expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
      const [x1,y1,cx,cy,x2,y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      expect(cx).toBeCloseTo((x1!+x2!)/2)
      const polygons = [...container.querySelectorAll('g.vf-beam > path')].filter(path => /z\s*$/i.test(path.getAttribute('d')!))
      expect(polygons).toHaveLength(kind === 'single' ? 1 : kind === 'multiple' ? 2 : 3)
      if (manual) expect(cy).toBeCloseTo(side === 'above' ? Math.min(y1!,y2!)-30 : Math.max(y1!,y2!)+30)
      else for (const polygon of polygons) {
        const numbers = polygon.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
        expect(numbers).toHaveLength(8)
        const points = [0,2,4,6].map(i => ({ x: numbers[i]!, y: numbers[i+1]! }))
        expect(Math.abs(points[0]!.y-points[3]!.y)).toBeGreaterThan(0)
        for (const [index,start] of points.entries()) {
          const end = points[(index+1)%points.length]!
          for (const fraction of [0,0.5,1]) {
            const x = start.x+(end.x-start.x)*fraction, y = start.y+(end.y-start.y)*fraction
            const t = (x-x1!)/(x2!-x1!), curveY = (1-t)**2*y1!+2*t*(1-t)*cy!+t*t*y2!
            if (side === 'above') expect(curveY+1.6).toBeLessThanOrEqual(y-4)
            else expect(curveY-1.6).toBeGreaterThanOrEqual(y+4)
          }
        }
      }
      expect(JSON.stringify(score)).toBe(snapshot)
      unmount()
    }
  })

  it.each([[false, false], [true, false], [false, true], [true, true]])('separates inward system slurs (print=%s, manual=%s)', async (print, manual) => {
    const measures = (['below', 'above'] as const).map(side => createMeasure({
      id: `system-${side}`, timeSignature: { beats: 6, beatType: 4 },
      voices: [createVoice({ events: ['start', 'middle', 'end'].map((role, index) => createNote({
        id: `${side}-${role}`, position: createTimePosition([0, 1, 5][index]! * TICKS_PER_QUARTER),
        duration: createDuration(role === 'middle' ? 'whole' : 'quarter'),
        pitch: role === 'middle' ? { step: side === 'above' ? 'F' : 'E', octave: side === 'above' ? 8 : 0 }
          : { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 }
      })) })]
    }))
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures })] })],
      layout: { systemBreakBeforeMeasureIds: ['system-above'] },
      slurs: (['below', 'above'] as const).map(side => ({ id: side, startEventId: `${side}-start`, endEventId: `${side}-end`,
        ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) })) })
    const snapshot = JSON.stringify(score)
    const onSegments = vi.fn()
    const { container, unmount } = render(<NotationPreview score={score} printLayout={print}
      printLayoutPlan={print ? resolvePrintLayoutPlan(score, 'auto') : undefined}
      onRenderedSpanSegments={onSegments}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const curves = [...container.querySelectorAll('.notation-slur')].map(slur =>
      slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number))
    expect(curves).toHaveLength(2)
    expect(onSegments).toHaveBeenCalledTimes(1)
    expect(onSegments.mock.calls[0]![1]).toHaveLength(2)
    const preview = container.querySelector<HTMLElement>('.notation-preview')!
    expect(Number(preview.dataset.layoutPasses)).toBe(manual ? 1 : 2)
    if (print) {
      const plan = resolvePrintLayoutPlan(score, 'auto')
      expect(Number(preview.dataset.printEstimatedPages)).toBe(estimatePrintedPageCount(Number(preview.dataset.layoutHeight), plan.pageHeight))
    } else {
      expect(preview.dataset.printEstimatedPages).toBeUndefined()
    }
    if (manual) {
      curves.forEach(([, y1, , cy, , y2], index) =>
        expect(cy).toBeCloseTo(index === 0 ? Math.max(y1!, y2!) + 30 : Math.min(y1!, y2!) - 30))
    } else {
      const [lower, upper] = curves
      const yAt = (curve: number[], x: number) => {
        const t = (x - curve[0]!) / (curve[4]! - curve[0]!)
        return (1-t)**2*curve[1]! + 2*t*(1-t)*curve[3]! + t*t*curve[5]!
      }
      const left = Math.max(lower![0]!, upper![0]!), right = Math.min(lower![4]!, upper![4]!)
      for (let index = 0; index <= 100; index++) {
        const x = left + (right-left) * index / 100
        expect(yAt(upper!, x) - yAt(lower!, x) - 3.2).toBeGreaterThanOrEqual(12 - 0.01)
      }
    }
    expect(JSON.stringify(score)).toBe(snapshot)
    unmount()
  })

  it.each([[false, false], [true, false], [false, true], [true, true]])('separates inward staff slurs (print=%s, manual=%s)', (print, manual) => {
    const staves = (['below', 'above'] as const).map(side => createStaff({ id: `staff-${side}`, measures: [createMeasure({
      id: `staff-measure-${side}`, timeSignature: { beats: 6, beatType: 4 },
      voices: [createVoice({ events: ['start', 'middle', 'end'].map((role, index) => createNote({
        id: `staff-${side}-${role}`, position: createTimePosition([0, 1, 5][index]! * TICKS_PER_QUARTER),
        duration: createDuration(role === 'middle' ? 'whole' : 'quarter'),
        pitch: role === 'middle' ? { step: side === 'above' ? 'F' : 'E', octave: side === 'above' ? 7 : 2 }
          : { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 }
      })) })]
    })] }))
    const score = createScore({ parts: [createPart({ staves })],
      slurs: (['below', 'above'] as const).map(side => ({ id: `staff-slur-${side}`,
        startEventId: `staff-${side}-start`, endEventId: `staff-${side}-end`,
        ...(manual ? { engraving: { placement: side, height: 8, offsetY: side === 'below' ? 6 : -6 } } : {}) })) })
    const snapshot = JSON.stringify(score)
    const onSegments = vi.fn()
    const { container } = render(<NotationPreview score={score} printLayout={print}
      printLayoutPlan={print ? resolvePrintLayoutPlan(score, 'auto') : undefined}
      onRenderedSpanSegments={onSegments} onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()}
      onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    const slurs = [...container.querySelectorAll('.notation-slur')]
    expect(slurs).toHaveLength(2)
    expect(Number(slurs[1]!.getAttribute('data-slur-ink-top')) - Number(slurs[0]!.getAttribute('data-slur-ink-bottom')))
      .toBeGreaterThanOrEqual(12 - 0.01)
    if (manual) slurs.forEach((slur, index) => {
      const [, y1, , cy, , y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      expect(cy).toBeCloseTo(index === 0 ? Math.max(y1!, y2!) + 80 : Math.min(y1!, y2!) - 80)
    })
    expect(onSegments).toHaveBeenCalledTimes(1)
    expect(onSegments.mock.calls[0]![1]).toHaveLength(2)
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each(['above', 'below'] as const)('clears unslurred neighboring staff ink (%s)', side => {
    for (const stemmed of [false, true]) {
      const spy = vi.spyOn(StaveNote.prototype, 'getNoteHeadBounds')
      const staves = (['below', 'above'] as const).map(lane => createStaff({ id: `neighbor-${lane}`, measures: [createMeasure({
        id: `neighbor-measure-${lane}`, timeSignature: { beats: stemmed ? 4 : 6, beatType: 4 },
        voices: [createVoice({ events: ['start', 'middle', 'end'].map((role, index) => createNote({
          id: `neighbor-${lane}-${role}`, position: createTimePosition([0, 1, stemmed ? 3 : 5][index]! * TICKS_PER_QUARTER),
          duration: createDuration(role === 'middle' ? stemmed ? 'half' : 'whole' : 'quarter'),
          pitch: role === 'middle' ? { step: lane === 'above' ? 'F' : 'E', octave: lane === 'above' ? 7 : 2 }
            : { step: lane === 'above' ? 'C' : 'A', octave: lane === 'above' ? 5 : 4 }
        })) })]
      })] }))
      const score = createScore({ parts: [createPart({ staves })], slurs: [{ id: 'neighbor-slur',
        startEventId: `neighbor-${side}-start`, endEventId: `neighbor-${side}-end` }] })
      const snapshot = JSON.stringify(score)
      const { container, unmount } = render(<NotationPreview score={score} onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
      const other = side === 'above' ? 'below' : 'above'
      const note = spy.mock.contexts.filter((note): note is StaveNote => note instanceof StaveNote &&
        note.getAttribute('data-event-id') === `neighbor-${other}-middle`).at(-1)!
      const head = note.noteHeads[0]!.getBoundingBox()
      const stem = note.hasStem() ? note.getStemExtents() : undefined
      const top = Math.min(head.getY(), stem?.topY ?? Infinity, stem?.baseY ?? Infinity)
      const bottom = Math.max(head.getY() + head.getH(), stem?.topY ?? -Infinity, stem?.baseY ?? -Infinity)
      const slur = container.querySelector('.notation-slur')!
      const gap = side === 'below' ? top - Number(slur.getAttribute('data-slur-ink-bottom'))
        : Number(slur.getAttribute('data-slur-ink-top')) - bottom
      expect(gap).toBeGreaterThanOrEqual(12 - 0.01)
      expect(JSON.stringify(score)).toBe(snapshot)
      unmount()
      spy.mockRestore()
    }
  })

  it.each([
    ['above', false], ['below', false], ['above', true], ['below', true]
  ] as const)('encloses an interior stemless notehead (%s, manual=%s)', async (side, manual) => {
    const boundsSpy = vi.spyOn(StaveNote.prototype, 'getNoteHeadBounds')
    const anchor = { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 } as const
    const events = [
      createNote({ id: 'head-start', pitch: anchor }),
      createNote({ id: 'head-middle', position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: side === 'above' ? 'F' : 'E', octave: side === 'above' ? 5 : 4 }, duration: createDuration('whole') }),
      createNote({ id: 'head-end', position: createTimePosition(TICKS_PER_QUARTER * 5), pitch: anchor })
    ]
    const measure = createMeasure({ id: 'head-measure', timeSignature: { beats: 6, beatType: 4 }, voices: [createVoice({ events })] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score = createScore({ parts: [createPart({ id: 'P1', name: 'Melody', staves: [createStaff({ id: 'S1', measures: [measure] })] })],
      slurs: [{ id: 'head-slur', startEventId: 'head-start', endEventId: 'head-end',
        ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) }] })
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const note = boundsSpy.mock.contexts.find((note): note is StaveNote =>
      note instanceof StaveNote && note.getAttribute('data-event-id') === 'head-middle')!
    expect(note.hasStem()).toBe(false)
    const bounds = note.noteHeads[0]!.getBoundingBox()
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
    const [x1,y1,cx,cy,x2,y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1!+x2!)/2)
    if (manual) {
      expect(cy).toBeCloseTo(side === 'above' ? Math.min(y1!,y2!)-30 : Math.max(y1!,y2!)+30)
    } else {
      for (const x of [bounds.getX(), bounds.getX()+bounds.getW()]) {
        const t=(x-x1!)/(x2!-x1!)
        const y=(1-t)**2*y1!+2*t*(1-t)*cy!+t*t*y2!
        if (side === 'above') expect(y+1.6).toBeLessThanOrEqual(bounds.getY()-4)
        else expect(y-1.6).toBeGreaterThanOrEqual(bounds.getY()+bounds.getH()+4)
      }
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([
    ['above', false], ['below', false], ['above', true], ['below', true]
  ] as const)('clears an interior staccato stack (%s, manual=%s)', async (side, manual) => {
    const anchor = { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 } as const
    const events = [
      createNote({ id: 'dot-start', pitch: anchor }),
      createNote({ id: 'dot-middle', position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: side === 'above' ? 'F' : 'E', octave: side === 'above' ? 5 : 4 },
        duration: createDuration('whole'), articulations: ['accent', 'staccato'] }),
      createNote({ id: 'dot-end', position: createTimePosition(TICKS_PER_QUARTER * 5), pitch: anchor })
    ]
    const measure = createMeasure({ id: 'dot-measure', timeSignature: { beats: 6, beatType: 4 }, voices: [createVoice({ events })] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      slurs: [{ id: 'dot-slur', startEventId: 'dot-start', endEventId: 'dot-end',
        ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) }] })
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const dot = container.querySelector('circle.notation-articulation[data-event-id="dot-middle"]')!
    expect(dot).toBeInTheDocument()
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
    const [x1,y1,cx,cy,x2,y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1!+x2!)/2)
    if (manual) {
      expect(cy).toBeCloseTo(side === 'above' ? Math.min(y1!,y2!)-30 : Math.max(y1!,y2!)+30)
    } else {
      const dotX = Number(dot.getAttribute('cx')), dotY = Number(dot.getAttribute('cy')), radius = Number(dot.getAttribute('r'))
      for (const x of [dotX-radius,dotX+radius]) {
        const t=(x-x1!)/(x2!-x1!)
        const y=(1-t)**2*y1!+2*t*(1-t)*cy!+t*t*y2!
        if (side === 'above') expect(y+1.6).toBeLessThanOrEqual(dotY-radius-4)
        else expect(y-1.6).toBeGreaterThanOrEqual(dotY+radius+4)
      }
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it('ignores the non-rendered stem of an interior rest when shaping a lower slur', async () => {
    const events = [
      createNote({ id: 'rest-slur-start', pitch: { step: 'A', octave: 4 } }),
      createRest({ id: 'rest-slur-middle', position: createTimePosition(TICKS_PER_QUARTER), duration: createDuration('quarter') }),
      createNote({ id: 'rest-slur-end', position: createTimePosition(TICKS_PER_QUARTER * 2), pitch: { step: 'A', octave: 4 } }),
      createRest({ id: 'rest-slur-tail', position: createTimePosition(TICKS_PER_QUARTER * 3), duration: createDuration('quarter') })
    ]
    const measure = createMeasure({ voices: [createVoice({ events })] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      slurs: [{ id: 'rest-slur', startEventId: 'rest-slur-start', endEventId: 'rest-slur-end' }] })
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    expect(container.querySelector('.notation-event[data-event-id="rest-slur-middle"] .vf-stem path')).toBeNull()
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', 'lower-slur')
    const y1 = Number(slur.getAttribute('data-slur-y1'))
    const y2 = Number(slur.getAttribute('data-slur-y2'))
    expect(Number(slur.getAttribute('data-slur-control-y')) - Math.max(y1, y2)).toBeLessThanOrEqual(28)
  })

  it.each([
    ['above', false, 'quarter'], ['below', false, 'quarter'], ['above', true, 'quarter'], ['below', true, 'quarter'],
    ['above', false, '64th'], ['below', false, '64th'], ['above', true, '64th'], ['below', true, '64th']
  ] as const)('clears interior rest ink without a phantom stem (%s, manual=%s, duration=%s)', async (side, manual, duration) => {
    const anchor = { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 } as const
    const startBeats = duration === 'quarter' ? 4 : 1
    const restBeats = duration === 'quarter' ? 1 : 1/16
    const events = [
      createNote({ id: 'ink-rest-start', pitch: anchor, duration: createDuration(duration === 'quarter' ? 'whole' : 'quarter') }),
      createRest({ id: 'ink-rest-middle', position: createTimePosition(TICKS_PER_QUARTER * startBeats), duration: createDuration(duration) }),
      createNote({ id: 'ink-rest-end', pitch: anchor, position: createTimePosition(TICKS_PER_QUARTER * (startBeats+restBeats)) })
    ]
    const measure = createMeasure({ timeSignature: duration === 'quarter' ? { beats: 6, beatType: 4 } : { beats: 33, beatType: 64 }, voices: [createVoice({ events })] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      slurs: [{ id: 'ink-rest-slur', startEventId: 'ink-rest-start', endEventId: 'ink-rest-end',
        ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) }] })
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
    const rest = container.querySelector('.notation-event[data-event-id="ink-rest-middle"]')!
    expect(rest.querySelector('.vf-stem path')).toBeNull()
    const glyph = rest.querySelector('.vf-notehead text')!
    expect(glyph).toBeInTheDocument()
    const [x1,y1,cx,cy,x2,y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1!+x2!)/2)
    if (manual) expect(cy).toBeCloseTo(side === 'above' ? Math.min(y1!,y2!)-30 : Math.max(y1!,y2!)+30)
    else {
      const ink = document.createElement('canvas').getContext('2d')!.measureText(glyph.textContent!)
      const x = Number(glyph.getAttribute('x')), y = Number(glyph.getAttribute('y'))
      const edgeY = y + (side === 'above' ? -ink.actualBoundingBoxAscent : ink.actualBoundingBoxDescent)
      for (const edgeX of [x-ink.actualBoundingBoxLeft, x+ink.actualBoundingBoxRight]) {
        const t = (edgeX-x1!)/(x2!-x1!), curveY = (1-t)**2*y1! + 2*t*(1-t)*cy! + t*t*y2!
        if (side === 'above') expect(curveY+1.6).toBeLessThanOrEqual(edgeY-4)
        else expect(curveY-1.6).toBeGreaterThanOrEqual(edgeY+4)
      }
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it('keeps an automatic lower slur clear of endpoint staccato dots', async () => {
    const events = [
      createNote({
        id: 'staccato-slur-start',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 },
        articulations: ['staccato']
      }),
      createNote({
        id: 'staccato-slur-end',
        position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: 'D', octave: 4 },
        articulations: ['staccato']
      })
    ]
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [createVoice({ events })]
                })
              ]
            })
          ]
        })
      ],
      slurs: [
        {
          id: 'staccato-slur',
          startEventId: events[0].id,
          endEventId: events[1].id
        }
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
      expect(container.querySelector('.notation-slur')).toBeInTheDocument()
    })

    const slur = container.querySelector<SVGPathElement>('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', 'lower-slur')
    const startDot = container.querySelector<SVGCircleElement>(
      '.notation-articulation[data-event-id="staccato-slur-start"]'
    )!
    const endDot = container.querySelector<SVGCircleElement>(
      '.notation-articulation[data-event-id="staccato-slur-end"]'
    )!
    const y1 = Number(slur.getAttribute('data-slur-y1'))
    const y2 = Number(slur.getAttribute('data-slur-y2'))

    expect(y1).toBeGreaterThanOrEqual(Number(startDot.getAttribute('cy')) + 5)
    expect(y2).toBeGreaterThanOrEqual(Number(endDot.getAttribute('cy')) + 5)
  })

  it.each([
    [true, false, false], [false, false, false], [true, true, false], [false, true, false],
    [true, false, true], [true, true, true]
  ])('clears an interior tuplet (bracketed=%s, manual=%s, rests=%s)', async (bracketed, manual, rests) => {
    const duration = { ...createDuration(bracketed ? 'quarter' : 'eighth'), tuplet: { actualNotes: 3, normalNotes: 2 } }
    const tripletTicks = TICKS_PER_QUARTER * (bracketed ? 2 : 1) / 3
    const endTick = TICKS_PER_QUARTER + tripletTicks * 3
    const middle = ['D','E','F'].map((step,index) => {
      const timing = { id:'inner-triplet-'+index, duration,
        position:createTimePosition(TICKS_PER_QUARTER+index*tripletTicks) }
      return rests ? createRest(timing) : createNote({ ...timing,
        pitch:{step:step as 'D' | 'E' | 'F',octave:5} })
    })
    const events = [createNote({id:'inner-triplet-start',pitch:{step:'C',octave:5}}), ...middle,
      createNote({id:'inner-triplet-end',pitch:{step:'C',octave:5},position:createTimePosition(endTick)}),
      ...(bracketed ? [] : [createRest({id:'inner-triplet-rest',position:createTimePosition(TICKS_PER_QUARTER*3),duration:createDuration('quarter')})])]
    const measure = createMeasure({ voices:[createVoice({events,tuplets:[{id:'inner-triplet',eventIds:middle.map(event=>event.id),actualNotes:3,normalNotes:2}]})] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score=createScore({parts:[createPart({staves:[createStaff({measures:[measure]})]})],
      slurs:[{id:'inner-triplet-slur',startEventId:'inner-triplet-start',endEventId:'inner-triplet-end',
        ...(manual?{engraving:{placement:'above' as const,height:3,offsetY:1}}:{})}]})
    const snapshot=JSON.stringify(score)
    const { container }=render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(()=>expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const slur=container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane','upper-slur')
    const [x1,y1,cx,cy,x2,y2]=slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1!+x2!)/2)
    const label=container.querySelector('g.vf-tuplet text')!
    expect(label).toBeInTheDocument()
    const ink=document.createElement('canvas').getContext('2d')!.measureText(label.textContent!)
    const left=Number(label.getAttribute('x'))-ink.actualBoundingBoxLeft
    const obstacles=[{left,right:left+ink.actualBoundingBoxLeft+ink.actualBoundingBoxRight,top:Number(label.getAttribute('y'))-ink.actualBoundingBoxAscent}]
    const brackets=[...container.querySelectorAll('g.vf-tuplet rect')].filter(rect=>Number(rect.getAttribute('height'))===1 || Number(rect.getAttribute('width'))===1)
    expect(brackets.length>0).toBe(bracketed)
    for(const rect of brackets) obstacles.push({left:Number(rect.getAttribute('x')),right:Number(rect.getAttribute('x'))+Number(rect.getAttribute('width')),top:Number(rect.getAttribute('y'))})
    if(manual) expect(cy).toBeCloseTo(Math.min(y1!,y2!)-30)
    else for(const obstacle of obstacles) for(const x of [obstacle.left,obstacle.right]) {
      const t=(x-x1!)/(x2!-x1!),y=(1-t)**2*y1!+2*t*(1-t)*cy!+t*t*y2!
      expect(y+1.6).toBeLessThanOrEqual(obstacle.top-4)
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it.each([
    ['above', false], ['below', false], ['above', true], ['below', true]
  ] as const)('clears interior duration dots (%s, manual=%s)', async (side, manual) => {
    const anchor = { step: side === 'above' ? 'C' : 'A', octave: side === 'above' ? 5 : 4 } as const
    const events = [
      createNote({ id: 'dot-start', pitch: anchor, duration: createDuration('whole') }),
      createNote({ id: 'dot-middle', position: createTimePosition(TICKS_PER_QUARTER * 4),
        pitch: { step: side === 'above' ? 'G' : 'E', octave: side === 'above' ? 5 : 4 },
        duration: createDuration('quarter', 2) }),
      createNote({ id: 'dot-end', pitch: anchor, position: createTimePosition(TICKS_PER_QUARTER * 5.75),
        duration: createDuration('16th') })
    ]
    const measure = createMeasure({ timeSignature: { beats: 6, beatType: 4 }, voices: [createVoice({ events })] })
    expect(validateMeasureRhythm(measure).issues).toEqual([])
    const score = createScore({ parts: [createPart({ staves: [createStaff({ measures: [measure] })] })],
      slurs: [{ id: 'dot-slur', startEventId: 'dot-start', endEventId: 'dot-end',
        ...(manual ? { engraving: { placement: side, height: 3, offsetY: 1 } } : {}) }] })
    const snapshot = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()}
      onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()}
      onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelector('.notation-slur')).toBeInTheDocument())
    const slur = container.querySelector('.notation-slur')!
    expect(slur).toHaveAttribute('data-annotation-lane', `${side === 'above' ? 'upper' : 'lower'}-slur`)
    const [x1,y1,cx,cy,x2,y2] = slur.getAttribute('data-span-hit-path')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    expect(cx).toBeCloseTo((x1! + x2!) / 2)
    const dots = [...container.querySelectorAll('.notation-event[data-event-id="dot-middle"] text')]
      .filter(text => text.textContent === '\uE1E7')
    expect(dots).toHaveLength(2)
    if (manual) expect(cy).toBeCloseTo(side === 'above' ? Math.min(y1!,y2!)-30 : Math.max(y1!,y2!)+30)
    else for (const dot of dots) {
      const ink = document.createElement('canvas').getContext('2d')!.measureText(dot.textContent!)
      const left = Number(dot.getAttribute('x')) - ink.actualBoundingBoxLeft
      const right = Number(dot.getAttribute('x')) + ink.actualBoundingBoxRight
      const edgeY = Number(dot.getAttribute('y')) + (side === 'above' ? -ink.actualBoundingBoxAscent : ink.actualBoundingBoxDescent)
      for (const x of [left, right]) {
        const t = (x-x1!)/(x2!-x1!), y = (1-t)**2*y1! + 2*t*(1-t)*cy! + t*t*y2!
        if (side === 'above') expect(y+1.6).toBeLessThanOrEqual(edgeY-4)
        else expect(y-1.6).toBeGreaterThanOrEqual(edgeY+4)
      }
    }
    expect(JSON.stringify(score)).toBe(snapshot)
  })

  it('keeps an automatic upper slur outside a shared tuplet bracket lane', async () => {
    const tripletQuarter = {
      ...createDuration('quarter'),
      tuplet: { actualNotes: 3, normalNotes: 2 }
    }
    const events = [
      createNote({
        id: 'tuplet-slur-start',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 5 },
        duration: tripletQuarter
      }),
      createNote({
        id: 'tuplet-slur-middle',
        position: createTimePosition((TICKS_PER_QUARTER * 2) / 3),
        pitch: { step: 'D', octave: 5 },
        duration: tripletQuarter
      }),
      createNote({
        id: 'tuplet-slur-end',
        position: createTimePosition((TICKS_PER_QUARTER * 4) / 3),
        pitch: { step: 'E', octave: 5 },
        duration: tripletQuarter
      }),
      createRest({
        id: 'tuplet-slur-fill',
        position: createTimePosition(TICKS_PER_QUARTER * 2),
        duration: createDuration('half')
      })
    ]
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [
                    createVoice({
                      events,
                      tuplets: [
                        {
                          id: 'tuplet-slur-group',
                          eventIds: events.slice(0, 3).map((event) => event.id),
                          actualNotes: 3,
                          normalNotes: 2
                        }
                      ]
                    })
                  ]
                })
              ]
            })
          ]
        })
      ],
      slurs: [
        {
          id: 'tuplet-slur',
          startEventId: events[0].id,
          endEventId: events[2].id
        }
      ]
    })
    expect(validateMeasureRhythm(score.parts[0]!.staves[0]!.measures[0]!).issues).toEqual([])
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
      expect(container.querySelector('.notation-slur')).toBeInTheDocument()
      expect(container.querySelector('g.vf-tuplet rect')).toBeInTheDocument()
    })

    const slur = container.querySelector<SVGPathElement>('.notation-slur')!
    const bracketYs = Array.from(
      container.querySelectorAll<SVGRectElement>('g.vf-tuplet rect')
    )
      .filter((rect) => Number(rect.getAttribute('height')) === 1)
      .map((rect) => Number(rect.getAttribute('y')))

    expect(bracketYs).not.toHaveLength(0)

    expect(slur).toHaveAttribute('data-annotation-lane', 'upper-slur')
    expect(Number(slur.getAttribute('data-slur-y1'))).toBeLessThanOrEqual(
      Math.min(...bracketYs) - 4
    )
    expect(Number(slur.getAttribute('data-slur-y2'))).toBeLessThanOrEqual(
      Math.min(...bracketYs) - 4
    )
  })

  it('chooses the clearer automatic slur side when endpoint stem directions differ', async () => {
    const events = [
      createNote({
        id: 'mixed-stem-staccato-start',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 },
        articulations: ['staccato']
      }),
      createNote({
        id: 'mixed-stem-clear-end',
        position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: 'C', octave: 6 }
      })
    ]
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [createVoice({ events })]
                })
              ]
            })
          ]
        })
      ],
      slurs: [
        {
          id: 'mixed-stem-slur',
          startEventId: events[0].id,
          endEventId: events[1].id
        }
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
      expect(container.querySelector('.notation-slur')).toBeInTheDocument()
    })

    expect(container.querySelector('.notation-slur')).toHaveAttribute(
      'data-annotation-lane',
      'upper-slur'
    )
  })

  it.each([{ count: 2, nested: false }, { count: 3, nested: false }, { count: 2, nested: true }])(
    'separates overlapping automatic hairpin ink and reserves expression rows ($count, nested=$nested)', async ({ count, nested }) => {
    const events = [
      createNote({
        id: 'hairpin-n1',
        position: createTimePosition(0),
        pitch: { step: 'C', octave: 4 }
      }),
      createNote({
        id: 'hairpin-n2',
        position: createTimePosition(TICKS_PER_QUARTER),
        pitch: { step: 'D', octave: 4 }
      }),
      createNote({
        id: 'hairpin-n3',
        position: createTimePosition(TICKS_PER_QUARTER * 2),
        pitch: { step: 'E', octave: 4 }
      }),
      createNote({
        id: 'hairpin-n4',
        position: createTimePosition(TICKS_PER_QUARTER * 3),
        pitch: { step: 'F', octave: 4 }
      })
    ]
    const score = createScore({
      parts: [
        createPart({
          id: 'P1',
          name: 'Melody',
          staves: [
            createStaff({
              id: 'P1-S1',
              measures: [
                createMeasure({
                  id: 'P1-S1-M1',
                  voices: [createVoice({ events })]
                })
              ]
            })
          ]
        })
      ],
      hairpins: [
        {
          id: 'outer-hairpin',
          type: 'crescendo',
          startEventId: events[0].id,
          endEventId: events[3].id
        },
        {
          id: 'inner-hairpin',
          type: nested ? 'diminuendo' : 'crescendo',
          startEventId: events[nested ? 1 : 0].id,
          endEventId: events[nested ? 2 : 3].id
        }
      ],
      expressionTexts: [{ id: 'hairpin-expression', measureId: 'P1-S1-M1', tick: TICKS_PER_QUARTER * 2, text: 'espressivo' }]
    })
    if (count === 3) score.hairpins!.push({ ...score.hairpins![1], id: 'third-hairpin' })
    const original = JSON.stringify(score)
    const view = (current: typeof score) => (
      <NotationPreview
        score={current}
        onSelectEvent={vi.fn()}
        onSelectEventRange={vi.fn()}
        onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()}
        onOpenMeasureContextMenu={vi.fn()}
        onSelectSpan={vi.fn()}
      />
    )
    const { container, rerender } = render(view(score))

    await waitFor(() => {
      expect(
        container.querySelector('[data-span-id="outer-hairpin"] .notation-hairpin')
      ).toBeInTheDocument()
      expect(
        container.querySelector('[data-span-id="inner-hairpin"] .notation-hairpin')
      ).toBeInTheDocument()
    })

    const baseline = (spanId: string) => {
      const lines = Array.from(
        container.querySelectorAll<SVGLineElement>(
          `[data-span-id="${spanId}"] .notation-hairpin line`
        )
      )

      return (
        (Number(lines[0]!.getAttribute('y1')) +
          Number(lines[1]!.getAttribute('y1'))) /
        2
      )
    }

    expect(baseline('inner-hairpin')).toBeGreaterThanOrEqual(
      baseline('outer-hairpin') + 26
    )
    const lastBaseline = baseline(count === 3 ? 'third-hairpin' : 'inner-hairpin')
    expect(lastBaseline - baseline('outer-hairpin')).toBe((count - 1) * 26)
    const bottom = lastBaseline + 10 + 0.9
    const expression = container.querySelector('.notation-expression-text')!
    const expressionY = Number(expression.getAttribute('y'))
    expect(expressionY - 13 - bottom).toBeGreaterThanOrEqual(4)
    const outerBaseline = baseline('outer-hairpin')
    rerender(view({ ...score, hairpins: score.hairpins!.slice(0, 1) }))
    expect(container.querySelectorAll('.notation-hairpin')).toHaveLength(1)
    expect(baseline('outer-hairpin')).toBe(outerBaseline)
    expect(Number(container.querySelector('.notation-expression-text')!.getAttribute('y'))).toBe(expressionY - (count - 1) * 26)
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each([false, true])('separates overlapping hairpins with unequal lyric baselines (reverse=%s)', async (reverse) => {
    const measures = [0, 1].map(index => createMeasure({ id: `unequal-${index}`, voices: [createVoice({
      events: [0, 1].map(event => createNote({ id: `unequal-${index}-${event}`, position: createTimePosition(event * TICKS_PER_QUARTER * 2),
        duration: createDuration('half'), pitch: { step: 'C', octave: 4 },
        lyrics: Array.from({ length: index === 0 ? 3 : 1 }, (_, verse) => ({ number: verse + 1, text: 'dolce', syllabic: 'single' as const })) }))
    })] }))
    const score = createScore({ parts: [createPart({ id: 'unequal-part', name: 'Melody',
      staves: [createStaff({ id: 'unequal-staff', measures })] })],
      layout: { systemBreakBeforeMeasureIds: ['unequal-1'] },
      hairpins: [{ id: 'unequal-long', type: 'crescendo', startEventId: 'unequal-0-0', endEventId: 'unequal-1-1' },
        { id: 'unequal-short', type: 'crescendo', startEventId: 'unequal-1-0', endEventId: 'unequal-1-1' }],
      expressionTexts: measures.map(measure => ({ id: `text-${measure.id}`, measureId: measure.id, tick: 0, text: 'espressivo' }))
    })
    if (reverse) score.hairpins!.reverse()
    const original = JSON.stringify(score)
    const { container } = render(<NotationPreview score={score} onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()}
      onSelectLyric={vi.fn()} onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />)
    await waitFor(() => expect(container.querySelectorAll('.notation-hairpin')).toHaveLength(3))
    const baselines = [...container.querySelectorAll<SVGGElement>('.notation-hairpin')]
      .filter(group => JSON.parse(group.dataset.spanSegment!)[2] === 'unequal-1')
      .map(group => [...group.querySelectorAll('line')].reduce((sum, line) => sum + Number(line.getAttribute('y1')), 0) / 2)
      .sort((left, right) => left - right)
    expect(baselines).toHaveLength(2)
    expect(baselines[1]! - baselines[0]!).toBeGreaterThanOrEqual(26)
    const expression = container.querySelector('.notation-expression-text[data-measure-id="unequal-1"]')!
    expect(Number(expression.getAttribute('y')) - 13 - baselines[1]! - 10.9).toBeGreaterThanOrEqual(4)
    expect(JSON.stringify(score)).toBe(original)
  })

  it.each([false, true])('reserves interior hairpin annotation peaks without changing manual anchors (print=%s)', (printing) => {
    const measures = [0, 1, 2].map(index => createMeasure({ id: `interior-${index}`, voices: [createVoice({
      events: [0, 1].map(event => createNote({ id: `interior-${index}-${event}`, position: createTimePosition(event * TICKS_PER_QUARTER * 2),
        duration: createDuration('half'), pitch: { step: 'C', octave: 4 },
        lyrics: Array.from({ length: index === 1 ? 3 : 1 }, (_, verse) => ({ number: verse + 1, text: 'dolce', syllabic: 'single' as const })) }))
    })] }))
    const score = createScore({ parts: [createPart({ id: 'interior-part', name: 'Melody',
      staves: [createStaff({ id: 'interior-staff', measures })] })],
      layout: { systemBreakBeforeMeasureIds: ['interior-1', 'interior-2'] },
      hairpins: [{ id: 'interior-long', type: 'crescendo', startEventId: 'interior-0-0', endEventId: 'interior-2-1' }],
      dynamics: measures.map(measure => ({ id: `dynamic-${measure.id}`, measureId: measure.id, value: 'mf' as const })),
      expressionTexts: measures.map(measure => ({ id: `text-${measure.id}`, measureId: measure.id, tick: 0, text: 'espressivo' }))
    })
    const original = JSON.stringify(score)
    const view = (current: typeof score) => <NotationPreview score={current} printLayout={printing}
      printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
      onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
      onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
    const { container, rerender } = render(view(score))
    const groups = () => [...container.querySelectorAll<SVGGElement>('.notation-hairpin')]
    expect(groups()).toHaveLength(3)
    const middle = groups().find(group => JSON.parse(group.dataset.spanSegment!)[2] === 'interior-1')!
    const ys = [...middle.querySelectorAll('line')].flatMap(line => ['y1', 'y2'].map(key => Number(line.getAttribute(key))))
    const dynamic = container.querySelector('.notation-dynamic-mark[data-measure-id="interior-1"]')!
    const expression = container.querySelector('.notation-expression-text[data-measure-id="interior-1"]')!
    expect(Math.min(...ys) - 0.9 - Number(dynamic.getAttribute('y')) - 6).toBeGreaterThanOrEqual(4)
    expect(Number(expression.getAttribute('y')) - 13 - Math.max(...ys) - 0.9).toBeGreaterThanOrEqual(4)
    const baseline = (group: SVGGElement) => {
      const line = group.querySelector('line')!
      return (Number(line.getAttribute('y1')) + Number(group.querySelectorAll('line')[1]!.getAttribute('y1'))) / 2
        - Number(group.dataset.spanStaffY)
    }
    for (const group of groups().filter(group => group !== middle)) {
      expect(baseline(middle) - baseline(group)).toBeGreaterThanOrEqual(20)
    }
    expect(JSON.stringify(score)).toBe(original)

    const manual = { ...score, hairpins: [{ ...score.hairpins![0], engraving: { offsetY: 1, height: 2 } }] }
    rerender(view(manual))
    const localYs = () => groups().map(group => Number(group.querySelector('line')!.getAttribute('y1')) - Number(group.dataset.spanStaffY))
    const manualYs = localYs()
    const sparse = structuredClone(manual)
    for (const event of sparse.parts[0]!.staves[0]!.measures[1]!.voices[0]!.events) if (event.type === 'note') event.lyrics = event.lyrics!.slice(0, 1)
    rerender(view(sparse))
    expect(localYs()).toEqual(manualYs)
  })

  it.each([[0, false], [1, false], [0, true], [1, true]] as const)(
    'keeps flat middle slur continuations shallow with manual control (part=%s, print=%s)', (partIndex, printing) => {
      const score = createScore({ parts: [0, 1].map(part => createPart({ id: `flat-part-${part}`, name: 'Melody',
        staves: [createStaff({ id: `flat-staff-${part}`, measures: [0, 1, 2].map(index => createMeasure({
          id: `flat-${part}-${index}`, clef: part ? { sign: 'F', line: 4 } : { sign: 'G', line: 2 },
          voices: [1, 2].map(voice => createVoice({ id: `voice-${voice}`, events: [0, 1].map(event => createNote({
            id: `flat-${part}-${index}-${voice}-${event}`, position: createTimePosition(event * TICKS_PER_QUARTER * 2),
            duration: createDuration('half'), pitch: { step: voice === 1 ? 'C' : 'G', octave: (part ? 3 : 5) - (voice === 2 ? 1 : 0) }
          })) }))
        })) })] })) })
      score.layout = { systemBreakBeforeMeasureIds: ['flat-0-1', 'flat-0-2'] }
      score.slurs = [1, 2].map(voice => ({ id: `flat-slur-${voice}`, startEventId: `flat-${partIndex}-0-${voice}-0`, endEventId: `flat-${partIndex}-2-${voice}-1` }))
      const original = structuredClone(score)
      const view = (current: typeof score) => <NotationPreview score={current} printLayout={printing}
        printLayoutPlan={printing ? resolvePrintLayoutPlan(current, 'auto') : undefined}
        onSelectEvent={vi.fn()} onSelectEventRange={vi.fn()} onSelectLyric={vi.fn()}
        onSelectMeasure={vi.fn()} onOpenMeasureContextMenu={vi.fn()} />
      const { container, rerender } = render(view(score))
      const paths = () => [...container.querySelectorAll<SVGPathElement>('.notation-slur')]
      expect(paths()).toHaveLength(6)
      for (const index of [1, 4]) {
        const path = paths()[index]!, y1 = Number(path.dataset.slurY1), y2 = Number(path.dataset.slurY2)
        const control = Number(path.dataset.slurControlY)
        const depth = index === 1 ? Math.min(y1, y2) - control : control - Math.max(y1, y2)
        expect(depth).toBeLessThanOrEqual(40.01)
        expect(depth).toBeGreaterThanOrEqual(14)
      }
      expect(score).toEqual(original)
      const manual = structuredClone(score)
      manual.slurs!.forEach((slur, index) => { slur.engraving = { placement: index ? 'below' : 'above', height: 4, offsetY: 1 } })
      rerender(view(manual))
      for (const index of [1, 4]) {
        const path = paths()[index]!, y1 = Number(path.dataset.slurY1), y2 = Number(path.dataset.slurY2)
        expect(y1 - Number(path.dataset.spanStaffY)).toBeCloseTo(index === 1 ? 30 : 110)
        expect(y2).toBe(y1)
        expect(Math.abs(Number(path.dataset.slurControlY) - y1)).toBeCloseTo(40)
      }
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
