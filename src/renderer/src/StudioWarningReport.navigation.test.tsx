// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { StudioWarningReport, StudioWarningTechnicalDetails } from './StudioWarningReport'

it.each(['technical', 'summary'] as const)('keeps native reading navigation in the %s disclosure and forwards document/workspace shortcuts', kind => {
  const globalKeys = vi.fn()
  render(<div onKeyDown={globalKeys}>
    <StudioWarningReport label="검증 경고" title="파일 경고" fileName="test.musicxml" theme="light"
      details={kind === 'summary' ? { summary: '손실 안내', title: '경고 목록', open: false, onOpenChange: vi.fn() } : undefined}>
      <li><StudioWarningTechnicalDetails warning={{ path: 'score.parts', message: 'Diagnostic' }} meta="test-warning" /></li>
    </StudioWarningReport>
  </div>)
  const trigger = screen.getByRole('button', { name: kind === 'summary' ? '경고 목록' : '기술 정보' })
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']) {
    expect(fireEvent.keyDown(trigger, { key, code: key })).toBe(true)
    expect(globalKeys).not.toHaveBeenCalled()
  }
  for (const stroke of [{ key: 's', code: 'KeyS', ctrlKey: true }, { key: 's', code: 'KeyS', metaKey: true },
    { key: 'z', code: 'KeyZ', ctrlKey: true }, { key: 'F6', code: 'F6' }, { key: 'Tab', code: 'Tab' }, { key: 'Escape', code: 'Escape' }]) {
    globalKeys.mockClear()
    expect(fireEvent.keyDown(trigger, stroke)).toBe(true)
    expect(globalKeys).toHaveBeenCalledOnce()
  }
})
