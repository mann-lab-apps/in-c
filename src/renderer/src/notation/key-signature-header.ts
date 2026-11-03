import type { KeySignature } from '../../../score-core'
import { toVexFlowKeySignature } from './vexflow-adapter'

/** Neutral-key changes cancel the preceding signature;initial/repeated neutral
 * headers and transitions to another nonzero signature retain their policy. */
export function keySignatureCancellation(current: KeySignature, previous?: KeySignature):
  { keySpec: string; count: number } | undefined {
  if (!previous || current.fifths !== 0 || previous.fifths === 0) return undefined
  return { keySpec: toVexFlowKeySignature(previous), count: Math.abs(previous.fifths) }
}
