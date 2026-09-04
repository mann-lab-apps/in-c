import type { Score, ScorePageSetup } from '../../../score-core'
import { createSystemLayout } from './system-layout'

export type PrintPageTarget = 'auto' | number

export interface PrintLayoutPlan {
  compactSpacing: boolean
  estimatedPageCount: number
  id: string
  label: string
  overflowedTarget: boolean
  pageCount: number
  pageCssSize: string
  pageHeight: number
  pageMarginMm: number
  pageSetup: Required<ScorePageSetup>
  renderWidth: number
  scale: number
  systemHeight: number
  systemTop: number
  targetPages?: number
}

interface PrintLayoutCandidate extends Omit<
  PrintLayoutPlan,
  | 'estimatedPageCount'
  | 'overflowedTarget'
  | 'pageCount'
  | 'pageCssSize'
  | 'pageSetup'
  | 'targetPages'
> {}

type NormalizedPrintLayoutCandidate = PrintLayoutCandidate &
  Pick<PrintLayoutPlan, 'pageCssSize' | 'pageSetup'>

const PAGE_COUNT_GUARD_HEIGHT = 36
const FORCED_SEARCH_ITERATIONS = 12
const MIN_FORCED_SCALE = 0.72
const MIN_FORCED_PAGE_MARGIN_MM = 3
const MIN_FORCED_SYSTEM_HEIGHT = 108
const MIN_FORCED_SYSTEM_TOP = 42
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const LETTER_WIDTH_MM = 215.9
const LETTER_HEIGHT_MM = 279.4
const DEFAULT_PAGE_SETUP: Required<ScorePageSetup> = {
  pageSize: 'a4',
  orientation: 'portrait',
  pageMarginMm: 8,
  staffSizePercent: 100,
  systemSpacingPercent: 100
}

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
  const pageSetup = normalizePrintPageSetup(score.layout?.pageSetup)
  const evaluated = printLayoutCandidates.map((candidate) =>
    evaluatePrintLayoutCandidate(score, candidate, pageSetup)
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

  return resolveForcedPrintLayoutPlan(
    score,
    tightestCandidate,
    targetPages,
    pageSetup
  )
}

function evaluatePrintLayoutCandidate(
  score: Score,
  candidate: PrintLayoutCandidate,
  pageSetup: Required<ScorePageSetup>
): PrintLayoutPlan {
  const normalizedCandidate = normalizePrintLayoutCandidate(
    candidate,
    pageSetup
  )
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
  targetPages: number,
  pageSetup: Required<ScorePageSetup>
): PrintLayoutPlan {
  const mostCompactPlan = evaluatePrintLayoutCandidate(
    score,
    createForcedPrintLayoutCandidate(baseCandidate, MIN_FORCED_SCALE),
    pageSetup
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
      createForcedPrintLayoutCandidate(baseCandidate, scale),
      pageSetup
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
    pageHeight: 0,
    pageMarginMm,
    renderWidth: Math.round(baseCandidate.renderWidth / scale),
    scale: roundToThousandth(scale),
    systemHeight: Math.round(physicalSystemHeight / scale),
    systemTop: Math.round(physicalSystemTop / scale)
  }
}

function normalizePrintLayoutCandidate(
  candidate: PrintLayoutCandidate,
  pageSetup: Required<ScorePageSetup>
): NormalizedPrintLayoutCandidate {
  const pageSize = resolvePageSizeMm(pageSetup)
  const contentWidthMm = pageSize.width - pageSetup.pageMarginMm * 2
  const baseContentWidthMm = A4_WIDTH_MM - candidate.pageMarginMm * 2
  const staffScale = pageSetup.staffSizePercent / 100
  const systemSpacingScale = pageSetup.systemSpacingPercent / 100
  const renderWidth = Math.round(
    candidate.renderWidth * (contentWidthMm / baseContentWidthMm) / staffScale
  )

  return {
    ...candidate,
    pageCssSize: formatPrintPageCssSize(pageSetup),
    pageHeight: resolvePdfPageHeight(
      renderWidth,
      pageSetup.pageMarginMm,
      pageSize
    ),
    pageMarginMm: pageSetup.pageMarginMm,
    pageSetup,
    renderWidth,
    scale: roundToThousandth(candidate.scale * staffScale),
    systemHeight: Math.round(candidate.systemHeight * systemSpacingScale),
    systemTop: Math.round(candidate.systemTop * systemSpacingScale)
  }
}

function resolvePdfPageHeight(
  renderWidth: number,
  pageMarginMm: number,
  pageSize: { width: number; height: number }
): number {
  const contentWidthMm = pageSize.width - pageMarginMm * 2
  const contentHeightMm = pageSize.height - pageMarginMm * 2

  return Math.floor(renderWidth * (contentHeightMm / contentWidthMm))
}

export function normalizePrintPageSetup(
  setup: ScorePageSetup | undefined
): Required<ScorePageSetup> {
  return {
    pageSize: setup?.pageSize === 'letter' ? 'letter' : 'a4',
    orientation: setup?.orientation === 'landscape' ? 'landscape' : 'portrait',
    pageMarginMm: clampNumber(
      setup?.pageMarginMm,
      3,
      30,
      DEFAULT_PAGE_SETUP.pageMarginMm
    ),
    staffSizePercent: clampNumber(
      setup?.staffSizePercent,
      75,
      125,
      DEFAULT_PAGE_SETUP.staffSizePercent
    ),
    systemSpacingPercent: clampNumber(
      setup?.systemSpacingPercent,
      80,
      140,
      DEFAULT_PAGE_SETUP.systemSpacingPercent
    )
  }
}

export function formatPrintPageCssSize(
  setup: Required<ScorePageSetup>
): string {
  const pageSize = setup.pageSize === 'letter' ? 'Letter' : 'A4'

  return `${pageSize} ${setup.orientation}`
}

function resolvePageSizeMm(setup: Required<ScorePageSetup>): {
  width: number
  height: number
} {
  const base =
    setup.pageSize === 'letter'
      ? { width: LETTER_WIDTH_MM, height: LETTER_HEIGHT_MM }
      : { width: A4_WIDTH_MM, height: A4_HEIGHT_MM }

  return setup.orientation === 'landscape'
    ? {
        width: base.height,
        height: base.width
      }
    : base
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return Math.min(max, Math.max(min, Math.round(value!)))
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
