// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMusicXml } from '../../musicxml'
import fixture from '../../musicxml/fixtures/rest-hairpin-input.musicxml?raw'
import { SpanPasteTargets } from './SpanPasteTargets'
import { buildSpanClipboard } from './editor/span-clipboard'

afterEach(cleanup)

describe('span paste targets', () => {
  it('requires an explicit end for a copied cross-voice source even when automatic timing matches', () => {
    const score = parseMusicXml(fixture), measure = score.parts[0].staves[0].measures[0], events = measure.voices[1].events
    score.slurs = [{ id: 'source', startEventId: measure.voices[0].events[0].id, endEventId: events[1].id }]
    const clipboard = buildSpanClipboard(score, { kind: 'slur', id: 'source' })!, onPaste = vi.fn()
    render(<SpanPasteTargets score={score} selection={{ type: 'event', eventId: events[1].id }} clipboard={clipboard} onPaste={onPaste} />)
    const button = screen.getByRole('button', { name: '표기 대상에 붙여넣기' }) as HTMLButtonElement
    expect(screen.getByRole('option', { name: '끝점 선택 필요' })).toBeTruthy()
    expect(button.disabled).toBe(true)
    fireEvent.click(button); expect(onPaste).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: events[2].id } })
    expect(button.disabled).toBe(false)
    fireEvent.click(button); expect(onPaste).toHaveBeenCalledWith(events[1].id, events[2].id)
  })
  it('rejects backward endpoints and resets the explicit draft on selection or document changes', () => {
    const score = parseMusicXml(fixture), events = score.parts[0].staves[0].measures[0].voices[1].events
    score.hairpins = [{ id: 'source', type: 'crescendo', startEventId: events[0].id, endEventId: events[1].id }]
    const clipboard = buildSpanClipboard(score, { kind: 'hairpin', id: 'source' })!
    const selection = { type: 'event' as const, eventId: events[1].id }, onPaste = vi.fn()
    const props = { score, selection, clipboard, onPaste }
    const { rerender } = render(<SpanPasteTargets {...props} />)
    const button = () => screen.getByRole('button', { name: '표기 대상에 붙여넣기' }) as HTMLButtonElement
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: events[0].id } })
    expect(button().disabled).toBe(true)
    fireEvent.click(button()); expect(onPaste).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: events[3].id } })
    expect(button().disabled).toBe(false)
    fireEvent.click(button()); expect(onPaste).toHaveBeenCalledWith(events[1].id, events[3].id)
    rerender(<SpanPasteTargets {...props} selection={{ type: 'event', eventId: events[2].id }} />)
    expect((screen.getByLabelText('붙여넣기 시작점') as HTMLSelectElement).value).toBe(events[2].id)
    expect((screen.getByLabelText('붙여넣기 끝점') as HTMLSelectElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: events[3].id } })
    rerender(<SpanPasteTargets {...props} score={structuredClone(score)} />)
    expect((screen.getByLabelText('붙여넣기 끝점') as HTMLSelectElement).value).toBe('')
  })

  it('excludes rests from slur targets and allows an explicit start without changing the selected note', () => {
    const score = parseMusicXml(fixture), events = score.parts[0].staves[0].measures[0].voices[1].events
    score.slurs = [{ id: 'source', startEventId: events[1].id, endEventId: events[2].id }]
    const clipboard = buildSpanClipboard(score, { kind: 'slur', id: 'source' })!, onPaste = vi.fn()
    const selection = { type: 'event' as const, eventId: events[0].id }
    render(<SpanPasteTargets score={score} selection={selection} clipboard={clipboard} onPaste={onPaste} />)
    const start = screen.getByLabelText('붙여넣기 시작점') as HTMLSelectElement
    expect([...start.options].some(option => option.value === events[0].id)).toBe(false)
    fireEvent.change(start, { target: { value: events[1].id } })
    fireEvent.change(screen.getByLabelText('붙여넣기 끝점'), { target: { value: events[2].id } })
    fireEvent.click(screen.getByRole('button', { name: '표기 대상에 붙여넣기' }))
    expect(onPaste).toHaveBeenCalledWith(events[1].id, events[2].id)
    expect(selection.eventId).toBe(events[0].id)
  })
})
