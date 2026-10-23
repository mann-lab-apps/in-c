// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { Clef } from '../../../score-core'
import { ClefPalettePreview } from './ClefPalettePreview'

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    measureText: (text: string) => ({
      width: text.length * 20,
      actualBoundingBoxAscent: 40,
      actualBoundingBoxDescent: 10,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 20,
      fontBoundingBoxAscent: 40,
      fontBoundingBoxDescent: 10
    })
  }) as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it.each([
  { sign: 'G', line: 2 },
  { sign: 'F', line: 4 },
  { sign: 'C', line: 3 },
  { sign: 'C', line: 4 }
] satisfies Clef[])('renders an engine-generated clef tile for $sign on staff line $line', (clef) => {
  const { container, rerender } = render(<ClefPalettePreview clef={clef} />)
  const preview = container.querySelector('.clef-palette-preview')!
  expect(preview).toHaveAttribute('aria-hidden', 'true')
  expect(preview.querySelector('svg')).toHaveAttribute('viewBox', '0 0 80 100')
  expect(preview.querySelector('svg')).toHaveAttribute('focusable', 'false')
  expect(preview.querySelector('.vf-clef text')?.textContent?.length).toBeGreaterThan(0)
  rerender(<ClefPalettePreview clef={{ ...clef }} />)
  expect(preview.querySelectorAll('svg')).toHaveLength(1)
})
