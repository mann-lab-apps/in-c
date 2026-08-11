import type { Score } from '../../../score-core'
import { createSystemLayout } from './system-layout'

export type PrintPageTarget = 'auto' | number

export interface PrintLayoutPlan {
  compactSpacing: boolean
  estimatedPageCount: number
  id: string
  label: string
  overflowedTarget: boolean
  pageCount: number
  pageHeight: number
  pageMarginMm: number
  renderWidth: number
  scale: number
  systemHeight: number
  systemTop: number
  targetPages?: number
}

interface PrintLayoutCandidate extends Omit<
  PrintLayoutPlan,
  'estimatedPageCount' | 'overflowedTarget' | 'pageCount' | 'targetPages'
> {}

const PAGE_COUNT_GUARD_HEIGHT = 36
const FORCED_SEARCH_ITERATIONS = 12
const MIN_FORCED_SCALE = 0.72
const MIN_FORCED_PAGE_MARGIN_MM = 3
const MIN_FORCED_SYSTEM_HEIGHT = 108
const MIN_FORCED_SYSTEM_TOP = 42
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

export const printLayoutCandidates: PrintLayoutCandidate[] = [
  {
    compactSpacing: false,
    id: 'comfortable',
    label: '여유',
    pageHeight: 1068,
    pageMarginMm: 10,
    renderWidth: 735,
    scale: 1,
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
    scale: 1,
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
    scale: 1,
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
    scale: 1,
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

  const matchingCandidate = evaluated.find(
    (candidate) => candidate.pageCount <= targetPages
  )

  if (matchingCandidate) {
    return withTargetPageResult(matchingCandidate, targetPages)
  }

  const tightestCandidate = printLayoutCandidates.at(-1) ?? printLayoutCandidates[0]

  return resolveForcedPrintLayoutPlan(score, tightestCandidate, targetPages)
}

function evaluatePrintLayoutCandidate(
  score: Score,
  candidate: PrintLayoutCandidate
): PrintLayoutPlan {
  const normalizedCandidate = normalizePrintLayoutCandidate(candidate)
  const measures = score.parts[0]?.staves[0]?.measures ?? []
  const layout = createSystemLayout(measures, normalizedCandidate.renderWidth, {
    compactSpacing: normalizedCandidate.compactSpacing,
    layout: score.layout,
    lyricScale: Math.max(0.82, normalizedCandidate.scale),
    pageHeight: normalizedCandidate.pageHeight,
    systemHeight: normalizedCandidate.systemHeight,
    systemTop: normalizedCandidate.systemTop
  })
  const estimatedPageCount = estimatePrintedPageCount(
    layout.height,
    normalizedCandidate.pageHeight
  )

  return {
    ...normalizedCandidate,
    estimatedPageCount,
    overflowedTarget: false,
    pageCount: estimatedPageCount
  }
}

function resolveForcedPrintLayoutPlan(
  score: Score,
  baseCandidate: PrintLayoutCandidate,
  targetPages: number
): PrintLayoutPlan {
  const mostCompactPlan = evaluatePrintLayoutCandidate(
    score,
    createForcedPrintLayoutCandidate(baseCandidate, MIN_FORCED_SCALE)
  )

  if (mostCompactPlan.pageCount > targetPages) {
    return withTargetPageResult(mostCompactPlan, targetPages)
  }

  let compactScale = MIN_FORCED_SCALE
  let looseScale = 1
  let bestPlan = mostCompactPlan

  for (let iteration = 0; iteration < FORCED_SEARCH_ITERATIONS; iteration += 1) {
    const scale = (compactScale + looseScale) / 2
    const plan = evaluatePrintLayoutCandidate(
      score,
      createForcedPrintLayoutCandidate(baseCandidate, scale)
    )

    if (plan.pageCount <= targetPages) {
      bestPlan = plan
      compactScale = scale
    } else {
      looseScale = scale
    }
  }

  return withTargetPageResult(bestPlan, targetPages)
}

function createForcedPrintLayoutCandidate(
  baseCandidate: PrintLayoutCandidate,
  scale: number
): PrintLayoutCandidate {
  const pageMarginMm = roundToTenth(
    MIN_FORCED_PAGE_MARGIN_MM +
      ((scale - MIN_FORCED_SCALE) / (1 - MIN_FORCED_SCALE)) *
        (baseCandidate.pageMarginMm - MIN_FORCED_PAGE_MARGIN_MM)
  )
  const physicalSystemHeight = Math.max(
    MIN_FORCED_SYSTEM_HEIGHT,
    Math.round(baseCandidate.systemHeight * scale)
  )
  const physicalSystemTop = Math.max(
    MIN_FORCED_SYSTEM_TOP,
    Math.round(baseCandidate.systemTop * scale)
  )

  return {
    compactSpacing: true,
    id: 'forced',
    label: `강제 맞춤 ${Math.round(scale * 100)}%`,
    pageHeight: resolvePdfPageHeight(
      Math.round(baseCandidate.renderWidth / scale),
      pageMarginMm
    ),
    pageMarginMm,
    renderWidth: Math.round(baseCandidate.renderWidth / scale),
    scale: roundToThousandth(scale),
    systemHeight: Math.round(physicalSystemHeight / scale),
    systemTop: Math.round(physicalSystemTop / scale)
  }
}

function normalizePrintLayoutCandidate(
  candidate: PrintLayoutCandidate
): PrintLayoutCandidate {
  return {
    ...candidate,
    pageHeight: resolvePdfPageHeight(candidate.renderWidth, candidate.pageMarginMm)
  }
}

function resolvePdfPageHeight(renderWidth: number, pageMarginMm: number): number {
  const contentWidthMm = A4_WIDTH_MM - pageMarginMm * 2
  const contentHeightMm = A4_HEIGHT_MM - pageMarginMm * 2

  return Math.floor(renderWidth * (contentHeightMm / contentWidthMm))
}

function withTargetPageResult(
  plan: PrintLayoutPlan,
  targetPages: number
): PrintLayoutPlan {
  return {
    ...plan,
    overflowedTarget: plan.pageCount > targetPages,
    targetPages
  }
}

function estimatePrintedPageCount(layoutHeight: number, pageHeight: number): number {
  return Math.max(1, Math.ceil((layoutHeight + PAGE_COUNT_GUARD_HEIGHT) / pageHeight))
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function roundToThousandth(value: number): number {
  return Math.round(value * 1000) / 1000
}
