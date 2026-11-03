// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { createRef } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { createScore } from '../../score-core'
import { PdfSnapshot, type PdfRenderSnapshot } from './PdfSnapshot'
import { resolvePrintLayoutPlan } from './notation/print-layout'

// Snapshot composition only; real staff spacing is measured in native PDFs.
vi.mock('./notation/NotationPreview', () => ({ NotationPreview: () => <div data-testid="renderer-placeholder" /> }))
afterEach(cleanup)
it.each([
  { size: 75, kind: 'pdf', pageSize: 'a4', orientation: 'portrait', margin: 8, expand: false },
  { size: 100, kind: 'pdf', pageSize: 'a4', orientation: 'portrait', margin: 8, expand: false },
  { size: 125, kind: 'pdf', pageSize: 'a4', orientation: 'portrait', margin: 8, expand: true },
  { size: 125, kind: 'image', pageSize: 'a4', orientation: 'portrait', margin: 8, expand: false },
  { size: 125, kind: 'pdf', pageSize: 'letter', orientation: 'landscape', margin: 12, expand: true },
  { size: 125, kind: 'pdf', pageSize: 'a4', orientation: 'portrait', margin: 30, expand: true }
] as const)('fits a narrow $size% $kind snapshot to $pageSize $orientation paper while retaining its model', item => {
  const score = createScore()
  score.layout = { pageSetup: { pageSize: item.pageSize, orientation: item.orientation, pageMarginMm: item.margin, staffSizePercent: item.size } }
  const snapshot: PdfRenderSnapshot = { generation: 9, score, plan: resolvePrintLayoutPlan(score, 'auto'), title: score.title, viewMode: 'score', lyricWidths: new Map(), minimumMeasureWidths: new Map() }
  const before = JSON.stringify(snapshot), root = createRef<HTMLDivElement>()
  render(<PdfSnapshot snapshot={snapshot} kind={item.kind} rootRef={root} />)
  if (item.expand) expect(root.current).toHaveAttribute('data-fit-print-width', 'true')
  else expect(root.current).not.toHaveAttribute('data-fit-print-width')
  expect(root.current).toHaveStyle({ width: `${snapshot.plan.renderWidth}px` })
  expect(root.current!.querySelector('.metadata-display--title')).toHaveTextContent(score.title)
  expect(JSON.stringify(snapshot)).toBe(before)
})
