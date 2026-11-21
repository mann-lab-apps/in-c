// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { StudioMeasureContextMenu } from './StudioMeasureContextMenu'
afterEach(cleanup)
it.each([['마디 속성…', 'properties'], ['박자표 변경…', 'time-signature']] as const)('delegates %s focus to the existing settings surface', (label, action) => {
  const select = vi.fn(() => screen.getByRole('button', { name: 'Existing settings' }).focus())
  render(<><div className="score-canvas" tabIndex={0}>Score</div><button>Existing settings</button><StudioMeasureContextMenu theme="light" x={20} y={20} canRemove={false} onClose={vi.fn()} onSelect={select} /></>)
  fireEvent.click(screen.getByRole('menuitem', { name: label }))
  expect(select).toHaveBeenCalledWith(action)
  expect(select).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Existing settings' })).toHaveFocus()
})
