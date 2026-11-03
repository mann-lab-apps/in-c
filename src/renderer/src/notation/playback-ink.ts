import type { VoiceAddress } from '../../../score-core'
import { resolveNotationEventTone } from './visual-state'

export interface PlaybackInkState {
  selectedEventId?: string
  selectedEventIds?: string[]
  selectedEventAddress?: VoiceAddress
  selectedEventAddresses?: ReadonlyMap<string, VoiceAddress>
  playbackEventId?: string
  playbackEventAddress?: VoiceAddress
}

/** Ephemeral ink only: never replace note nodes, listeners, geometry or score.
 * The caller renders an unselected base while playback owns this layer. */
export function createPlaybackInk(root: HTMLElement) {
  let painted: { element: SVGElement; style: string | null }[] = []
  let marked: SVGElement[] = []
  let cursor: SVGLineElement | undefined
  const clear = () => {
    for (const { element, style } of painted) {
      if (style === null) element.removeAttribute('style')
      else element.setAttribute('style', style)
    }
    for (const node of marked) { node.classList.remove('is-selected', 'is-playback') }
    painted = []; marked = []
  }
  const matches = (node: SVGElement, address?: VoiceAddress) => !address ||
    (['partId', 'staffId', 'measureId', 'voiceId'] as const).every(key => node.dataset[key] === address[key])
  return {
    update(state: PlaybackInkState) {
      clear()
      const ids = new Set(state.selectedEventIds ?? [])
      let playing: SVGElement | undefined
      for (const node of root.querySelectorAll<SVGElement>('.notation-event')) {
        const id = node.dataset.eventId ?? ''
        const address = { partId: node.dataset.partId!, staffId: node.dataset.staffId!,
          measureId: node.dataset.measureId!, voiceId: node.dataset.voiceId! }
        const isPlaying = id === state.playbackEventId && matches(node, state.playbackEventAddress)
        if (isPlaying) playing = node
        const tone = resolveNotationEventTone(id, ids, state.selectedEventId, isPlaying, address, state.selectedEventAddress, state.selectedEventAddresses)
        if (tone === 'default') continue
        node.classList.add(tone === 'selected' ? 'is-selected' : 'is-playback')
        marked.push(node)
        const color = tone === 'selected' ? '#b43d2f' : '#25766f'
        // Match VexFlow's static event-group style. Stems inherit its stroke;
        // explicit ledger colors, stroke:none glyphs and focus-hit CSS still win.
        painted.push({ element: node, style: node.getAttribute('style') })
        node.style.fill = color
        node.style.stroke = color
      }
      const svg = playing?.ownerSVGElement
      if (!playing || !svg) { cursor?.remove(); cursor = undefined; return }
      if (!cursor?.isConnected || cursor.ownerSVGElement !== svg) {
        cursor?.remove()
        cursor = document.createElementNS('http://www.w3.org/2000/svg', 'line')
        cursor.classList.add('notation-playhead')
        cursor.setAttribute('aria-label', '재생 위치')
        svg.append(cursor)
      }
      const x = Number(playing.dataset.playbackX), y = Number(playing.dataset.playbackY)
      if (!Number.isFinite(x) || !Number.isFinite(y)) { cursor.remove(); cursor = undefined; return }
      cursor.setAttribute('x1', String(x)); cursor.setAttribute('x2', String(x))
      cursor.setAttribute('y1', String(y - 10)); cursor.setAttribute('y2', String(y + 104))
    },
    dispose() { clear(); cursor?.remove(); cursor = undefined }
  }
}
