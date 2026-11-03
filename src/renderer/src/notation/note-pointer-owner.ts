import type { VoiceAddress } from '../../../score-core'
import { readSvgTextInk } from './staff-ink-spacing'

interface PointerOwner { element: SVGElement; eventId: string; address: VoiceAddress }

/** Broad VexFlow rectangles can cover another voice's visible note glyph.
 * Resolve unique head/modifier or flag text; stems and ambiguous ink keep DOM order.
 */
export function resolveNotePointerOwner(fallback: SVGElement, clientX: number, clientY: number): PointerOwner | undefined {
  const svg = fallback.ownerSVGElement
  if (!fallback.isConnected || !svg || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return undefined
  try {
    const screen = svg.getScreenCTM()
    if (!screen) return undefined
    const matrix = screen.inverse()
    const x = matrix.a * clientX + matrix.c * clientY + matrix.e
    const y = matrix.b * clientX + matrix.d * clientY + matrix.f
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return undefined
    let owner: PointerOwner | undefined
    for (const element of svg.querySelectorAll<SVGElement>('.notation-event[role="button"]:not(.is-preview)')) {
      const { eventId, partId, staffId, measureId, voiceId } = element.dataset
      if (!eventId || !partId || !staffId || !measureId || !voiceId) continue
      const rect = element.getBoundingClientRect()
      if (clientX < rect.left - 2 || clientX > rect.right + 2 || clientY < rect.top - 2 || clientY > rect.bottom + 2) continue
      const hit = [...element.querySelectorAll<SVGTextContentElement>('.vf-notehead text,.vf-flag text')].some(node => {
        const ink = readSvgTextInk(node, context)
        return ink && x >= ink.x && x <= ink.x + ink.width && y >= ink.y && y <= ink.y + ink.height
      })
      if (!hit) continue
      if (owner) return undefined
      owner = { element, eventId, address: { partId, staffId, measureId, voiceId } }
    }
    return owner
  } catch { return undefined }
}
