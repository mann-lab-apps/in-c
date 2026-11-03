// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { applyTempoStaffAnchors } from './tempo-staff-anchor'
import * as readers from './staff-ink-spacing'

const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
afterEach(() => {
  document.body.replaceChildren(); vi.restoreAllMocks()
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
  else Reflect.deleteProperty(document, 'fonts')
})
function fixture() {
  document.body.innerHTML = '<svg><text class="notation-tempo-marking--positioned" data-measure-id="m" data-tempo-staff-delta="40" x="40" y="100" style="fill:black">♩=60</text></svg>'
  const svg = document.querySelector('svg')!, tempo = svg.querySelector('text')!
  svg.getCTM = () => ({}) as DOMMatrix
  Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded' } })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  vi.spyOn(readers, 'readSvgTextInk').mockImplementation(node => ({ x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')) - 12, width: 30, height: 14 }))
  vi.spyOn(readers, 'readSvgShapeInk').mockReturnValue({ x: 40, y: 120, width: 50, height: 3 })
  const owner = { partId: 'p', staffId: 's', staffIndex: 0, systemIndex: 1 }
  const owners = new Map([['m', owner], ['neighbor', owner]])
  return { svg, tempo, owners }
}
it('uses a measured staff offset for a lone clear tempo without touching neighbors', () => {
  const f = fixture(); f.svg.insertAdjacentHTML('beforeend', '<text x="800" y="100" style="fill:black">Neighbor</text>')
  const neighbor = f.svg.lastElementChild!, before = neighbor.outerHTML
  applyTempoStaffAnchors(f.svg, f.owners)
  expect(f.tempo.getAttribute('y')).toBe('140'); expect(neighbor.outerHTML).toBe(before)
})
it('retains a hidden tempo ghost without counting its display ink as a competing printed mark', () => {
  const f = fixture()
  f.svg.insertAdjacentHTML('beforeend', '<text class="notation-tempo-marking--positioned notation-tempo-marking--transparent" data-measure-id="neighbor" x="40" y="120" style="fill:black">♩=90</text>')
  const ghost = f.svg.lastElementChild!, before = ghost.outerHTML
  applyTempoStaffAnchors(f.svg, f.owners)
  expect(f.tempo.getAttribute('y')).toBe('140')
  expect(ghost.outerHTML).toBe(before)
})
it.each(['manual-path', 'competing-upper', 'second-tempo', 'hidden', 'loading', 'unknown-owner', 'unknown-paint', 'invalid-offset'] as const)(
  'keeps the original lane for %s', kind => {
    const f = fixture()
    if (kind === 'manual-path') f.svg.insertAdjacentHTML('beforeend', '<path class="notation-slur" style="stroke:black"/>')
    if (kind === 'competing-upper') f.svg.insertAdjacentHTML('beforeend', '<text class="notation-staff-text" data-measure-id="neighbor" x="800" y="90" style="fill:black">dolce</text>')
    if (kind === 'second-tempo') f.svg.insertAdjacentHTML('beforeend', '<text class="notation-tempo-marking--positioned" data-measure-id="neighbor" x="800" y="100" style="fill:black">♩=80</text>')
    if (kind === 'hidden') f.tempo.classList.add('notation-tempo-marking--transparent')
    if (kind === 'loading') Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loading' } })
    if (kind === 'unknown-owner') f.owners.clear()
    if (kind === 'unknown-paint') f.svg.insertAdjacentHTML('beforeend', '<use href="#unknown" style="fill:black"/>')
    if (kind === 'invalid-offset') f.tempo.dataset.tempoStaffDelta = 'NaN'
    const before = f.svg.outerHTML
    applyTempoStaffAnchors(f.svg, f.owners)
    expect(f.svg.outerHTML).toBe(before)
  })
