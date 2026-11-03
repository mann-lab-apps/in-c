import { expect, it } from 'vitest'
import { createMidiChannelFixture } from '../../testing/midi-channel-fixture'
import { samePdfSource, type PdfRenderSnapshot } from './PdfSnapshot'
import { resolvePrintLayoutPlan } from './notation/print-layout'

it('recognizes restored notation and paper values without mutating either snapshot', () => {
 const score = createMidiChannelFixture(2).score
 const source: PdfRenderSnapshot = { generation: 1, score, plan: resolvePrintLayoutPlan(score, 'auto'), title: score.title!, viewMode: 'score', lyricWidths: new Map(), minimumMeasureWidths: new Map() }
 const restored = { ...source, score: structuredClone(score), plan: structuredClone(source.plan) }
 const before = JSON.stringify([source, restored])
 expect(samePdfSource(source, restored)).toBe(true)
 expect(JSON.stringify([source, restored])).toBe(before)
 expect(samePdfSource(source, undefined)).toBe(false)
})

it('still distinguishes a replaced document, a different scope and changed physical paper or target', () => {
 const score = createMidiChannelFixture(2).score
 const source: PdfRenderSnapshot = { generation: 1, score, plan: resolvePrintLayoutPlan(score, 'auto'), title: score.title!, viewMode: 'score', lyricWidths: new Map(), minimumMeasureWidths: new Map() }
 const changedPaper = { ...score, layout: { ...score.layout, pageSetup: { ...source.plan.pageSetup, pageMarginMm: 12 } } }
 for (const different of [
  { ...source, generation: 2 },
  { ...source, viewMode: 'part' as const, partId: score.parts[0].id },
  { ...source, title: 'Different output title' },
  { ...source, plan: resolvePrintLayoutPlan(changedPaper, 'auto') },
  { ...source, plan: resolvePrintLayoutPlan(score, 2) },
  { ...source, score: { ...score, composer: 'New source author' } }
 ]) expect(samePdfSource(source, different)).toBe(false)
})
