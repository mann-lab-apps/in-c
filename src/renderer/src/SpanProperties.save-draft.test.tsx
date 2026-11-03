// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { SpanProperties } from './SpanProperties'
import { geometrySaveDraftFixture, geometrySaveDraftKinds } from '../../testing/geometry-save-draft-fixture'
import type { SpanEngraving } from '../../score-core'

const guidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'
afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value() {} })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, shiftKey: true }]
it.each(geometrySaveDraftKinds.flatMap(kind => modifiers.map(modifier => ({ kind, modifier }))))('studio.geometry-save-draft $kind preserves automatic/zero and command scope with $modifier', ({ kind, modifier }) => {
  const data = geometrySaveDraftFixture(kind), commit = vi.fn(), save = vi.fn()
  function Host() {
    const [score, setScore] = useState(data.project.score)
    return <div onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.code === 'KeyS') save() }}>
      <SpanProperties score={score} selected={{ kind: 'hairpin', id: 'geometry-save-span' }} onSelect={vi.fn()} onDelete={vi.fn()} onEndpointChange={vi.fn()}
        onEngravingChange={(engraving?: SpanEngraving) => { commit(engraving); setScore(s => ({ ...s, hairpins: s.hairpins!.map(h => ({ ...h, engraving })) })) }} />
    </div>
  }
  render(<Host />); fireEvent.click(screen.getByText('배치 · 형상'))
  const field = screen.getByRole('spinbutton', { name: data.label }); field.focus()
  if (kind === 'same-auto') fireEvent.change(field, { target: { value: '2.25' } })
  fireEvent.change(field, { target: { value: data.draft } })
  fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
  if (data.blocked) {
    fireEvent.keyDown(field, { key: 's', code: 'KeyS', ...modifier })
    expect(save).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expect(field).toHaveFocus()
    expect(field).toHaveValue(data.draft === '' ? null : Number(data.draft)); expect(field).toHaveAccessibleDescription(guidance)
    if (data.confirm) expect(field).not.toHaveAttribute('aria-invalid', 'true')
    fireEvent.keyDown(field, { key: data.confirm ? 'Enter' : 'Escape', code: data.confirm ? 'Enter' : 'Escape' }); fireEvent.blur(field)
    expect(commit).toHaveBeenCalledTimes(data.confirm ? 1 : 0)
    if (data.confirm) expect(commit).toHaveBeenCalledWith({ ...data.initial, [data.field]: data.draft === '' ? undefined : Number(data.draft) })
    expect(screen.queryByText(guidance)).not.toBeInTheDocument()
  } else { expect(save).toHaveBeenCalledOnce(); expect(commit).not.toHaveBeenCalled(); expect(screen.queryByText(guidance)).not.toBeInTheDocument() }
})
it('studio.geometry-save-draft preserves composition and drops guidance with the old selection', () => {
  const data = geometrySaveDraftFixture('auto-height'), commit = vi.fn(), save = vi.fn(), props = { score: data.project.score, selected: { kind: 'hairpin' as const, id: 'geometry-save-span' }, onSelect: vi.fn(), onDelete: vi.fn(), onEndpointChange: vi.fn(), onEngravingChange: commit }
  const view = render(<div onKeyDown={save}><SpanProperties {...props} /></div>); fireEvent.click(screen.getByText('배치 · 형상'))
  const field = screen.getByRole('spinbutton', { name: data.label }); field.focus(); fireEvent.compositionStart(field); fireEvent.change(field, { target: { value: '2.25' } })
  fireEvent.keyDown(field, { key: 's', code: 'KeyS', ctrlKey: true }); fireEvent.keyDown(field, { key: 'Enter', isComposing: true, keyCode: 229 })
  expect(save).not.toHaveBeenCalled(); expect(commit).not.toHaveBeenCalled(); expect(screen.queryByText(guidance)).not.toBeInTheDocument()
  fireEvent.compositionEnd(field); fireEvent.keyDown(field, { key: 's', code: 'KeyS', metaKey: true }); expect(field).toHaveAccessibleDescription(guidance)
  const next = structuredClone(props.score); next.hairpins!.push({ ...next.hairpins![0], id: 'next-span', engraving: { height: 4 } })
  view.rerender(<div onKeyDown={save}><SpanProperties {...props} score={next} selected={{ kind: 'hairpin', id: 'next-span' }} /></div>)
  fireEvent.blur(screen.getByRole('spinbutton', { name: data.label })); expect(screen.getByRole('spinbutton', { name: data.label })).toHaveValue(4)
  expect(screen.queryByText(guidance)).not.toBeInTheDocument(); expect(commit).not.toHaveBeenCalled()
})
