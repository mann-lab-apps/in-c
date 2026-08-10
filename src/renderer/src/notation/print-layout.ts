import type { Score } from '../../../score-core'
import { createSystemLayout } from './system-layout'

export type PrintPageTarget = 'auto' | number

export interface PrintLayoutPlan {
  compactSpacing: boolean
  id: string
  label: string
  pageCount: number
  pageHeight: number
  pageMarginMm: number
  renderWidth: number
  systemHeight: number
  systemTop: number
}

interface PrintLayoutCandidate extends Omit<PrintLayoutPlan, 'pageCount'> {}

const PAGE_COUNT_GUARD_RATIO = 0.2

export const printLayoutCandidates: PrintLayoutCandidate[] = [
  {
    compactSpacing: false,
    id: 'comfortable',
    label: '여유',
    pageHeight: 1068,
    pageMarginMm: 10,
    renderWidth: 735,
    systemHeight: 154,
    systemTop: 72
  },
  {
    compactSpacing: true,
    id: 'balanced',
    label: '균형',
    pageHeight: 1102,
    pageMarginMm: 8,
    renderWidth: 760,
    systemHeight: 148,
    systemTop: 72
  },
  {
    compactSpacing: true,
    id: 'compact',
    label: '압축',
    pageHeight: 1144,
    pageMarginMm: 6,
    renderWidth: 790,
    systemHeight: 140,
    systemTop: 72
  },
  {
    compactSpacing: true,
    id: 'tight',
    label: '최대 압축',
    pageHeight: 1192,
    pageMarginMm: 5,
    renderWidth: 820,
    systemHeight: 132,
    systemTop: 72
  }
]

export function resolvePrintLayoutPlan(
  score: Score,
  targetPages: PrintPageTarget
): PrintLayoutPlan {
  const evaluated = printLayoutCandidates.map((candidate) =>
    evaluatePrintLayoutCandidate(score, candidate)
  )

  if (targetPages === 'auto') {
    return evaluated[1] ?? evaluated[0]
  }

  return (
    evaluated.find((candidate) => candidate.pageCount <= targetPages) ??
    evaluated.at(-1) ??
    evaluatePrintLayoutCandidate(score, printLayoutCandidates[0])
  )
}

function evaluatePrintLayoutCandidate(
  score: Score,
  candidate: PrintLayoutCandidate
): PrintLayoutPlan {
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const layout = createSystemLayout(measures, candidate.renderWidth, {
    compactSpacing: candidate.compactSpacing,
    layout: score.layout,
    pageHeight: candidate.pageHeight,
    systemHeight: candidate.systemHeight,
    systemTop: candidate.systemTop
  })

  return {
    ...candidate,
    pageCount: estimatePrintedPageCount(layout.height, candidate.pageHeight)
  }
}

function estimatePrintedPageCount(layoutHeight: number, pageHeight: number): number {
  const guardHeight = pageHeight * PAGE_COUNT_GUARD_RATIO

  return Math.max(1, Math.ceil((layoutHeight + guardHeight) / pageHeight))
}
