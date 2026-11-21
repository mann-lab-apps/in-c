// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { applyStaffTextAnchors } from './staff-text-anchor'
import * as readers from './staff-ink-spacing'

const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
afterEach(() => {
  document.body.replaceChildren(); vi.restoreAllMocks()
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
  else Reflect.deleteProperty(document, 'fonts')
})
function fixture() {
  document.body.innerHTML = '<svg width="600"><g class="notation-staff-text-target" tabindex="0" data-staff-text-id="owned"><text class="notation-staff-text" data-measure-id="m" data-staff-anchor-x="110" data-staff-anchor-y="240" data-staff-anchor-space="10" x="22" y="187" style="fill:black">보표 글자</text><rect class="notation-staff-text-hit" x="22" y="175" width="60" height="14" fill="transparent"/></g></svg>'
  const svg = document.querySelector('svg')!, text = svg.querySelector('text')!, hit = svg.querySelector('rect')!
  svg.getCTM = () => ({}) as DOMMatrix
  Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded' } })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
  vi.spyOn(readers, 'readSvgTextInk').mockImplementation(node => ({ x: Number(node.getAttribute('x')) + 1, y: Number(node.getAttribute('y')) - 12, width: 60, height: 14 }))
  vi.spyOn(readers, 'readSvgShapeInk').mockImplementation(node => ({ x: Number(node.getAttribute('x')), y: Number(node.getAttribute('y')), width: Number(node.getAttribute('width')), height: Number(node.getAttribute('height')) }))
  const owner = { partId: 'p', staffId: 's', staffIndex: 1, systemIndex: 0 }
  const owners = new Map([['m', owner], ['neighbor', { ...owner, staffIndex: 0 }], ['later', { ...owner, systemIndex: 1 }]])
  return { svg, text, hit, owner, owners }
}
function obstacle(svg: SVGSVGElement, measure: string, y: number) {
  svg.insertAdjacentHTML('beforeend', `<g data-measure-id="${measure}"><rect class="real-ink" x="110" y="${y}" width="35" height="14" style="fill:black"/></g>`)
  return svg.lastElementChild!.outerHTML
}
it('uses the actual staff/onset anchor and moves only its existing measured hit rectangle', () => {
  const f = fixture(), attrs = f.text.getAttribute('style'), parent = f.text.parentElement!.outerHTML
  const result = applyStaffTextAnchors(f.svg, f.owners)
  expect(f.text.getAttribute('x')).toBe('110'); expect(f.text.getAttribute('y')).toBe('240')
  expect(f.text.getAttribute('style')).toBe(attrs)
  expect(result).toEqual([{ x: 111, y: 228, width: 60, height: 14, ...f.owner }])
  expect(f.hit.getAttribute('x')).toBe('111'); expect(f.hit.getAttribute('y')).toBe('228')
  expect(f.text.parentElement!.dataset.staffTextId).toBe('owned')
  expect(f.text.parentElement!.tabIndex).toBe(0); expect(parent).toContain('data-staff-text-id="owned"')
})
it('clears same-staff high ink and a second higher obstacle using half a staff space without moving them', () => {
  const f = fixture(), one = obstacle(f.svg, 'm', 230), two = obstacle(f.svg, 'm', 210)
  applyStaffTextAnchors(f.svg, f.owners)
  expect(Number(f.text.getAttribute('y')) + 2).toBe(205)
  expect(f.svg.children[1].outerHTML).toBe(one); expect(f.svg.children[2].outerHTML).toBe(two)
})
it.each(['neighbor', 'later'])('leaves %s clearance to the staff/system spacing pipeline', id => {
  const f = fixture(); obstacle(f.svg, id, 230)
  applyStaffTextAnchors(f.svg, f.owners); expect(f.text.getAttribute('y')).toBe('240')
})
it('clears owned manual span bounds while preserving manual nodes and explicit zero geometry', () => {
  const f = fixture(); f.svg.insertAdjacentHTML('beforeend', '<path data-offset="0" data-height="4" fill="transparent" stroke="none" d="M 110 230 L 150 230"/>')
  const before = f.svg.lastElementChild!.outerHTML
  applyStaffTextAnchors(f.svg, f.owners, [{ x: 110, y: 230, width: 40, height: 4, ...f.owner }])
  expect(Number(f.text.getAttribute('y')) + 2).toBe(225)
  expect(f.svg.lastElementChild!.outerHTML).toBe(before)
})
it('positions higher text rows deterministically without reordering model/DOM/keyboard owners', () => {
  const f = fixture(); f.text.dataset.staffAnchorY = '222'
  f.svg.insertAdjacentHTML('beforeend', '<text class="notation-staff-text" data-measure-id="m" data-staff-anchor-x="110" data-staff-anchor-y="240" data-staff-anchor-space="10" x="22" y="205" style="fill:black">Second</text>')
  applyStaffTextAnchors(f.svg, f.owners)
  const texts = [...f.svg.querySelectorAll('text')]
  expect(texts.map(t => t.textContent)).toEqual(['보표 글자', 'Second'])
  expect(Number(texts[1].getAttribute('y'))).toBe(240)
  expect(Number(texts[0].getAttribute('y')) + 2).toBeLessThanOrEqual(223)
})
it('keeps long ink intact and uses existing horizontal page diagnostics rather than shrinking text', () => {
  const f = fixture(); f.svg.setAttribute('width', '40')
  applyStaffTextAnchors(f.svg, f.owners)
  expect(f.text.getAttribute('x')).toBe('110'); expect(f.text.textContent).toBe('보표 글자')
  expect(f.text.getAttribute('transform')).toBeNull()
})
it.each(['loading', 'owner', 'paint', 'metrics', 'anchor', 'hidden'] as const)('keeps conservative placement for unavailable %s', kind => {
  const f = fixture()
  if (kind === 'loading') Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loading' } })
  if (kind === 'owner') f.owners.clear()
  if (kind === 'paint') f.svg.insertAdjacentHTML('beforeend', '<use href="#unknown" style="fill:black"/>')
  if (kind === 'metrics') vi.mocked(readers.readSvgTextInk).mockReturnValue(undefined)
  if (kind === 'anchor') f.text.dataset.staffAnchorX = 'NaN'
  if (kind === 'hidden') f.text.style.display = 'none'
  const before = f.svg.outerHTML
  applyStaffTextAnchors(f.svg, f.owners); expect(f.svg.outerHTML).toBe(before)
})

it('uses five real painted staff stroke centers instead of assuming Vex origin or half-pixel alignment', () => {
  const f = fixture(); f.text.dataset.staffAnchorTop = '250'
  f.svg.insertAdjacentHTML('beforeend', '<g class="vf-stave" data-measure-id="m">' + [0,1,2,3,4].map(i => `<rect x="0" y="${250+i*10}" width="500" height="1" style="fill:black"/>`).join('') + '</g>')
  applyStaffTextAnchors(f.svg, f.owners)
  expect(f.text.getAttribute('y')).toBe('240.5')
})

it('keeps the conservative lane when an actual stave is expected but five measured lines are unavailable', () => {
  const f = fixture(); f.text.dataset.staffAnchorTop = '250'
  const before = f.svg.outerHTML
  applyStaffTextAnchors(f.svg, f.owners); expect(f.svg.outerHTML).toBe(before)
})

it.each(['notation-range-selection-layer', 'notation-playhead'])('does not treat the screen-only %s as authored notation ink', kind => {
  const f = fixture()
  f.svg.insertAdjacentHTML('beforeend', `<g class="${kind}" aria-hidden="true"><rect x="110" y="230" width="35" height="14" style="fill:black"/></g>`)
  const overlay = f.svg.lastElementChild!, before = overlay.outerHTML
  applyStaffTextAnchors(f.svg, f.owners)
  expect(f.text.getAttribute('y')).toBe('240')
  expect(overlay.outerHTML).toBe(before)
})
