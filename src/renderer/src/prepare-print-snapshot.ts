import type { PdfRenderSnapshot } from './PdfSnapshot'
import { resolvePrintLayoutPlan } from './notation/print-layout'
import { minimumTextScoreWidths } from './notation/use-lyric-layout'

// Refresh only measured layout after fonts settle. The request still owns its
// original score, settings, target, title, scope and document generation.
export function refreshPrintSnapshotWidths(snapshot: PdfRenderSnapshot): PdfRenderSnapshot {
  const minimumMeasureWidths = minimumTextScoreWidths(snapshot.score, snapshot.lyricWidths, snapshot.harmonyWidths)
  return {
    ...snapshot,
    minimumMeasureWidths,
    plan: resolvePrintLayoutPlan(snapshot.score, snapshot.plan.targetPages ?? 'auto', minimumMeasureWidths)
  }
}
