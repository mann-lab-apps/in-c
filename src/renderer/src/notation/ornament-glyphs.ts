import { VexFlow } from 'vexflow'
import type { Ornament } from '../../../score-core'

// MusicXML inverted-mordent is the sign WITHOUT the vertical stroke.
// SMuFL's ornamentMordent is the sign WITH it. Do not swap these names.
export const ornamentGlyphs: Record<Ornament, string> = {
  trill: VexFlow.Glyphs.ornamentTrill,
  mordent: VexFlow.Glyphs.ornamentMordent,
  'inverted-mordent': VexFlow.Glyphs.ornamentShortTrill,
  turn: VexFlow.Glyphs.ornamentTurn
}
