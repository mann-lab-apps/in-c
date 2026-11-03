import { memo, type Ref } from 'react'
import type { Score } from '../../score-core'
import { NotationPreview } from './notation/NotationPreview'
import { resolvePageSizeMm, type PrintLayoutPlan } from './notation/print-layout'
import type { HarmonySpacingWidths } from './notation/harmony-spacing'

export interface PdfRenderSnapshot {
  generation: number
  score: Score
  plan: PrintLayoutPlan
  title: string
  partTitle?: string
  partId?: string
  viewMode: 'score' | 'part'
  lyricWidths: ReadonlyMap<string, number>
  harmonyWidths?: HarmonySpacingWidths
  minimumMeasureWidths: ReadonlyMap<string, number>
}
export function samePdfSource(a: PdfRenderSnapshot, b?: PdfRenderSnapshot): boolean {
  // Inverse commands can restore exactly the same notation and paper plan
  // without restoring their object identities. Both are JSON domain data;
  // document/view identity still independently owns the output feedback.
  const sameData = (left: Score | PrintLayoutPlan, right: Score | PrintLayoutPlan) =>
    left === right || JSON.stringify(left) === JSON.stringify(right)
  return Boolean(b && a.generation === b.generation && sameData(a.score,b.score) && sameData(a.plan,b.plan) &&
    a.title === b.title && a.partTitle === b.partTitle && a.partId === b.partId && a.viewMode === b.viewMode)
}

// The real SVG may be taller than the model-only plan after measured staff and
// span clearance. This is a layout-limit warning, not an OS PDF page count.
export function pdfLayoutExceedsTarget(
  root: ParentNode,
  plan: Pick<PrintLayoutPlan, 'targetPages' | 'overflowedTarget' | 'renderWidth' | 'pageHeight'>
): boolean {
  const target = plan.targetPages
  if (!Number.isInteger(target) || !target || target < 1) return false
  if (plan.overflowedTarget) return true
  if (!Number.isFinite(plan.renderWidth) || !Number.isFinite(plan.pageHeight) || plan.renderWidth <= 0 || plan.pageHeight <= 0) return false
  return [...root.querySelectorAll('.notation-preview svg')].some(svg => {
    const box = svg.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number)
    const width = box?.length === 4 ? box[2] : Number(svg.getAttribute('width'))
    const height = box?.length === 4 ? box[3] : Number(svg.getAttribute('height'))
    // Print CSS fits the whole viewport to the paper width, including a manual
    // horizontal extension; do not mistake SVG units for physical CSS pixels.
    return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 &&
      height / width * plan.renderWidth > plan.pageHeight * target + 0.5
  })
}
const ignore = () => undefined

function needsPrintWidthFit(plan: PrintLayoutPlan): boolean {
  const paper = resolvePageSizeMm(plan.pageSetup)
  const printableWidth = (paper.width - 2 * plan.pageMarginMm) * 96 / 25.4
  // Chromium shrinks oversized SVGs, but does not enlarge VexFlow's fixed
  // inline width. Preserve the existing shrink path and fit only narrow pages.
  return Number.isFinite(plan.renderWidth) && plan.renderWidth > 0 &&
    Number.isFinite(printableWidth) && printableWidth > plan.renderWidth + .5
}

// Real renderer, immutable request data. The live editor remains independent of
// the asynchronous native save dialog; this subtree alone participates in print.
export const PdfSnapshot = memo(function PdfSnapshot({ snapshot, rootRef, kind = 'pdf' }: { snapshot: PdfRenderSnapshot; rootRef: Ref<HTMLDivElement>; kind?: 'pdf' | 'image' }) {
  return <div className={kind === 'pdf' ? 'studio-pdf-snapshot' : 'studio-image-snapshot'} data-print-snapshot ref={rootRef} aria-hidden="true" inert
    data-fit-print-width={kind === 'pdf' && needsPrintWidthFit(snapshot.plan) ? true : undefined}
    data-print-generation={snapshot.generation} style={{ width: snapshot.plan.renderWidth }}>
    <div className="score-page" data-show-page-margins="false" data-view-mode={snapshot.viewMode} data-part-id={snapshot.partId}>
      <div className="score-title">
        <span className="metadata-display metadata-display--title">{snapshot.title}</span>
        {snapshot.partTitle ? <div className="score-part-title"><span className="metadata-display metadata-display--composer">{snapshot.partTitle}</span></div> : null}
        {/* Reserve the existing author line without printing an editor placeholder. */}
        <span className="metadata-display metadata-display--composer">{snapshot.score.composer ?? '\u00a0'}</span>
      </div>
      <NotationPreview score={snapshot.score} printLayout printLayoutPlan={snapshot.plan}
        lyricWidths={snapshot.lyricWidths} harmonyWidths={snapshot.harmonyWidths} minimumMeasureWidths={snapshot.minimumMeasureWidths}
        onSelectEvent={ignore} onSelectEventRange={ignore} onSelectLyric={ignore}
        onSelectMeasure={ignore} onOpenMeasureContextMenu={ignore} />
    </div>
  </div>
})
