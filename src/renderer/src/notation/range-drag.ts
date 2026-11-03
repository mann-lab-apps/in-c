import type { VoiceAddress } from '../../../score-core'
import { sameVoiceLane } from './visual-state'

export interface RangeDragAnchor {
  eventId: string
  address?: VoiceAddress
}

function sameTarget(left: RangeDragAnchor, right: RangeDragAnchor): boolean {
  return left.eventId === right.eventId && (!left.address || !right.address
    ? left.address === right.address
    : sameVoiceLane(left.address, right.address) && left.address.measureId === right.address.measureId)
}

// Private view state: neither an editing command nor a portable score field.
export function createNotationRangeDrag() {
  let gesture: { owner: object; anchor: RangeDragAnchor; last: RangeDragAnchor } | undefined
  return {
    start(owner: object, anchor: RangeDragAnchor) {
      gesture = { owner, anchor, last: anchor }
    },
    continue(owner: object, target: RangeDragAnchor): RangeDragAnchor | undefined {
      if (!gesture || gesture.owner !== owner ||
        (gesture.anchor.address && target.address && !sameVoiceLane(gesture.anchor.address, target.address)) ||
        sameTarget(gesture.last, target)) return
      // SVG replacement can generate mouseenter again under a stationary
      // pointer. Consume this target before dispatching a command/redraw.
      gesture.last = target
      return gesture.anchor
    },
    clear(owner?: object) {
      if (!owner || gesture?.owner === owner) gesture = undefined
    }
  }
}
