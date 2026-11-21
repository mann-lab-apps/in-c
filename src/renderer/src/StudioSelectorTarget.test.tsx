// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createNote } from '../../score-core'
import { parseMusicXml } from '../../musicxml'
import fixture from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { StudioNoteDecorations } from './StudioNoteDecorations'
import { SpanProperties } from './SpanProperties'

afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value() {} })
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value() {} })
})
function candidate(label: string) {
  const field = screen.getByRole('combobox', { name: label })
  field.focus(); fireEvent.click(field); fireEvent.keyDown(field, { key: 'ArrowDown' })
  expect(field).toHaveAttribute('aria-expanded', 'true')
  return field
}

it.each([0, 2] as const)('does not commit note A tremolo candidate to note B with %i marks', marks => {
  const a = createNote({ id: 'note-a', pitch: { step: 'C', octave: 4 } }), b = createNote({ id: 'note-b', pitch: { step: 'D', octave: 4 }, ...(marks ? { tremolo: { type: 'single' as const, marks } } : {}) })
  const original = structuredClone([a, b]), commitA = vi.fn(), commitB = vi.fn()
  const common = { theme: 'light' as const, onOrnament: vi.fn(), onGrace: vi.fn() }
  const view = render(<StudioNoteDecorations {...common} note={a} onTremolo={commitA} />)
  candidate('트레몰로')
  view.rerender(<StudioNoteDecorations {...common} note={b} onTremolo={commitB} />)
  const field = screen.getByRole('combobox', { name: '트레몰로' })
  fireEvent.keyDown(field, { key: 'Tab' })
  expect(commitA).not.toHaveBeenCalled(); expect(commitB).not.toHaveBeenCalled()
  expect(field).toHaveAttribute('aria-expanded', 'false')
  expect(field).toHaveTextContent(marks ? '2줄' : '없음')
  expect([a, b]).toEqual(original)
})

it.each(['Tab', 'Escape'])('keeps the same note candidate through an unrelated rerender until %s', key => {
  const note = createNote({ id: 'note-a', pitch: { step: 'C', octave: 4 } }), commit = vi.fn(), common = { note, onTremolo: commit, onOrnament: vi.fn(), onGrace: vi.fn() }
  const view = render(<StudioNoteDecorations {...common} theme="light" />)
  candidate('트레몰로')
  view.rerender(<StudioNoteDecorations {...common} note={{ ...note }} theme="dark" />)
  const field = screen.getByRole('combobox', { name: '트레몰로' })
  expect(field).toHaveAttribute('aria-expanded', 'true')
  fireEvent.keyDown(field, { key })
  if (key === 'Tab') expect(commit).toHaveBeenCalledExactlyOnceWith(1)
  else expect(commit).not.toHaveBeenCalled()
})

function spans() {
  const score = parseMusicXml(fixture), events = score.parts[0].staves[0].measures[0].voices[1].events
  score.hairpins = ['first', 'second'].map(id => ({ id, type: 'crescendo' as const, startEventId: events[0].id, endEventId: events[3].id }))
  const common = { score, onSelect: vi.fn(), onDelete: vi.fn(), onEndpointChange: vi.fn() }
  return { score, common }
}
it.each([undefined, 'below'] as const)('does not commit span A placement candidate to span B with placement %s', placement => {
  const { score, common } = spans()
  score.hairpins![1].engraving = placement ? { placement, offsetY: 0, height: 4 } : { offsetY: 0, height: 4 }
  const before = structuredClone(score), commitA = vi.fn(), commitB = vi.fn()
  const view = render(<SpanProperties {...common} selected={{ kind: 'hairpin', id: 'first' }} onEngravingChange={commitA} />)
  fireEvent.click(screen.getByText('배치 · 형상')); candidate('표기 배치')
  view.rerender(<SpanProperties {...common} selected={{ kind: 'hairpin', id: 'second' }} onEngravingChange={commitB} />)
  const field = screen.getByRole('combobox', { name: '표기 배치' })
  fireEvent.keyDown(field, { key: 'Tab' })
  expect(commitA).not.toHaveBeenCalled(); expect(commitB).not.toHaveBeenCalled()
  expect(field).toHaveAttribute('aria-expanded', 'false')
  expect(field).toHaveTextContent(placement ? '보표 아래' : '자동'); expect(score).toEqual(before)
})
it.each(['Tab', 'Escape'])('keeps the same span candidate through an unrelated rerender until %s', key => {
  const { score, common } = spans(), commit = vi.fn(), selected = { kind: 'hairpin' as const, id: 'first' }
  const view = render(<SpanProperties {...common} selected={selected} onEngravingChange={commit} theme="light" />)
  fireEvent.click(screen.getByText('배치 · 형상')); candidate('표기 배치')
  view.rerender(<SpanProperties {...common} score={structuredClone(score)} selected={{ ...selected }} onEngravingChange={commit} theme="dark" />)
  const field = screen.getByRole('combobox', { name: '표기 배치' })
  expect(field).toHaveAttribute('aria-expanded', 'true'); fireEvent.keyDown(field, { key })
  if (key === 'Tab') expect(commit).toHaveBeenCalledExactlyOnceWith({ placement: 'above' })
  else expect(commit).not.toHaveBeenCalled()
})
