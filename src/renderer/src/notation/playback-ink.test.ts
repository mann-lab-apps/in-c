// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createPlaybackInk } from './playback-ink'

function fixture() {
  const root = document.createElement('div')
  root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg"><g class="notation-event" data-event-id="a" data-part-id="p" data-staff-id="s" data-measure-id="m" data-voice-id="v" data-playback-x="100" data-playback-y="50"><path fill="#111" d="M0 0" style="opacity: .8"/><path fill="none" stroke="#111" d="M0 1"/></g><g class="notation-event" data-event-id="b" data-part-id="p" data-staff-id="s" data-measure-id="m" data-voice-id="v" data-playback-x="200" data-playback-y="50"><path fill="#111" d="M1 1"/></g></svg>`
  document.body.append(root)
  return root
}
describe('live playback ink', () => {
  it.each([undefined, 'fill: transparent; stroke: none;'])('keeps the focused interaction rect unpainted with initial style %s', initialStyle => {
    const root = fixture(), a = root.querySelector<SVGElement>('[data-event-id="a"]')!
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    for (const [name, value] of Object.entries({ x: '10', y: '20', width: '22', height: '48', opacity: '0', 'pointer-events': 'auto' })) hit.setAttribute(name, value)
    if (initialStyle !== undefined) hit.setAttribute('style', initialStyle)
    a.append(hit)
    const realRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    // VexFlow's musical glyphs inherit the event group fill; the hit is separate.
    realRect.setAttribute('stroke', 'none'); realRect.setAttribute('style', 'opacity: .75')
    a.append(realRect)
    const originalHit = hit.outerHTML, originalMusicStyle = realRect.getAttribute('style')
    let clicks = 0; hit.addEventListener('mousedown', () => clicks++)
    const ink = createPlaybackInk(root)
    for (const state of [{ selectedEventId: 'a' }, { playbackEventId: 'a' }, { selectedEventIds: ['a', 'b'], selectedEventId: 'a' }]) {
      ink.update(state)
      expect(hit.outerHTML).toBe(originalHit)
      expect(getComputedStyle(realRect).fill).toBe(state.playbackEventId ? 'rgb(37, 118, 111)' : 'rgb(180, 61, 47)')
      expect(realRect.getAttribute('stroke')).toBe('none')
      expect(a.lastElementChild).toBe(realRect)
    }
    hit.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); expect(clicks).toBe(1)
    ink.update({ playbackEventId: 'b' })
    expect(realRect.getAttribute('style')).toBe(originalMusicStyle)
    expect(hit.outerHTML).toBe(originalHit)
    ink.dispose(); expect(hit.outerHTML).toBe(originalHit)
    expect(root.querySelector('.notation-playhead')).toBeNull()
    root.remove()
  })

  it.each(['selected', 'playback'] as const)('matches static %s group ink while preserving explicit ledger and glyph overrides', tone => {
    const root = fixture(), a = root.querySelector<SVGElement>('[data-event-id="a"]')!
    a.setAttribute('style', 'opacity: .8; fill: black; stroke: black')
    // CSS duplicates the presentation values here because jsdom does not
    // implement SVG presentation attributes. Native QA covers the real markup.
    a.innerHTML = '<g><path data-stem="true" fill="none" style="fill: none" d="M10 35L10 0"/></g><path data-ledger="true" fill="none" stroke="#444" style="fill: none; stroke: #444" d="M0 35L20 35"/><text data-note="true" stroke="none" style="stroke: none">note</text><rect data-fixed="true" style="fill: #444; stroke: none" width="3" height="3"/><rect opacity="0" pointer-events="auto" width="20" height="48"/>'
    const stem = a.querySelector<SVGElement>('[data-stem]')!, ledger = a.querySelector<SVGElement>('[data-ledger]')!, note = a.querySelector<SVGElement>('[data-note]')!, fixed = a.querySelector<SVGElement>('[data-fixed]')!
    const before = a.innerHTML, style = a.getAttribute('style'), originalNoteStroke = getComputedStyle(note).stroke, ink = createPlaybackInk(root)
    ink.update(tone === 'selected' ? { selectedEventId: 'a' } : { playbackEventId: 'a' })
    const color = tone === 'selected' ? 'rgb(180, 61, 47)' : 'rgb(37, 118, 111)'
    expect({ stem: getComputedStyle(stem).stroke, ledger: getComputedStyle(ledger).stroke,
      noteFill: getComputedStyle(note).fill, noteStroke: getComputedStyle(note).stroke,
      fixedFill: getComputedStyle(fixed).fill }).toEqual({ stem: color, ledger: 'rgb(68, 68, 68)', noteFill: color, noteStroke: originalNoteStroke, fixedFill: 'rgb(68, 68, 68)' })
    expect(note.getAttribute('stroke')).toBe('none')
    expect(a.style.opacity).toBe('0.8')
    expect(a.innerHTML).toBe(before)
    ink.dispose(); expect(a.getAttribute('style')).toBe(style); expect(a.innerHTML).toBe(before)
    root.remove()
  })

  it('range-selection.cross-measure paints both owned events and preserves same-ID neighbors', () => {
    const root = fixture(), a = root.querySelector<SVGElement>('[data-event-id="a"]')!, b = root.querySelector<SVGElement>('[data-event-id="b"]')!
    a.dataset.measureId = 'm1'; b.dataset.measureId = 'm2'
    const unrelated = b.cloneNode(true) as SVGElement
    unrelated.dataset.measureId = 'm3'; b.parentElement!.append(unrelated)
    const anchor = { partId: 'p', staffId: 's', measureId: 'm1', voiceId: 'v' }
    const end = { ...anchor, measureId: 'm2' }
    const ink = createPlaybackInk(root)
    ink.update({ selectedEventIds: ['a', 'b'], selectedEventId: 'b', selectedEventAddress: anchor,
      selectedEventAddresses: new Map([['a', anchor], ['b', end]]) })
    expect(a.classList.contains('is-selected')).toBe(true)
    expect(b.classList.contains('is-selected')).toBe(true)
    expect(unrelated.classList.contains('is-selected')).toBe(false)
    expect(root.querySelectorAll('.is-selected')).toHaveLength(2)
    ink.dispose()
    expect(root.querySelectorAll('.is-selected')).toHaveLength(0)
    expect(b.querySelector('path')?.hasAttribute('style')).toBe(false)
    root.remove()
  })

  it('moves cursor and color without replacing notation nodes or click listeners', () => {
    const root = fixture(), a = root.querySelector<SVGElement>('[data-event-id="a"]')!, b = root.querySelector<SVGElement>('[data-event-id="b"]')!
    let clicks = 0
    a.addEventListener('click', () => clicks++)
    const ink = createPlaybackInk(root)
    ink.update({ playbackEventId: 'a' })
    expect(a.classList.contains('is-playback')).toBe(true)
    expect(root.querySelector('.notation-playhead')?.getAttribute('x1')).toBe('100')
    expect(a.querySelectorAll('path')[1].getAttribute('fill')).toBe('none')
    ink.update({ playbackEventId: 'b' })
    expect(root.querySelector('[data-event-id="a"]')).toBe(a)
    expect(a.classList.contains('is-playback')).toBe(false)
    expect(a.querySelector('path')?.getAttribute('style')).toBe('opacity: .8')
    expect(b.classList.contains('is-playback')).toBe(true)
    a.dispatchEvent(new MouseEvent('click'))
    expect(clicks).toBe(1)
    ink.dispose()
    expect(root.querySelector('.notation-playhead')).toBeNull()
    expect(b.querySelector('path')?.hasAttribute('style')).toBe(false)
    root.remove()
  })

  it('honors addresses and selected-tone precedence, even when event IDs collide', () => {
    const root = fixture(), second = root.querySelector('[data-event-id="b"]')!
    second.setAttribute('data-event-id', 'a'); second.setAttribute('data-staff-id', 'lower')
    const ink = createPlaybackInk(root), address = { partId: 'p', staffId: 'lower', measureId: 'm', voiceId: 'v' }
    ink.update({ playbackEventId: 'a', playbackEventAddress: address, selectedEventId: 'a', selectedEventAddress: address })
    expect(root.querySelectorAll('.is-selected')).toHaveLength(1)
    expect(second.classList.contains('is-selected')).toBe(true)
    expect(root.querySelector('.notation-playhead')?.getAttribute('x1')).toBe('200')
    ink.dispose(); root.remove()
  })

  it('rebuilds only its cursor after a real score redraw or resize replaces SVG', () => {
    const root = fixture(), ink = createPlaybackInk(root)
    const markup = root.innerHTML
    ink.update({ playbackEventId: 'a' })
    root.innerHTML = markup
    ink.update({ playbackEventId: 'b' })
    // The canvas repaint supplies a fresh SVG without old ephemeral ink.
    expect(root.querySelectorAll('.notation-playhead')).toHaveLength(1)
    expect(root.querySelector('.notation-playhead')?.getAttribute('x1')).toBe('200')
    ink.dispose(); root.remove()
  })
})
