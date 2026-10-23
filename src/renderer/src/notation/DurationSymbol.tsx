import { VexFlow } from 'vexflow'

import type { DurationValue } from '../../../score-core'

const durationGlyphs: Record<DurationValue, string> = {
  whole: VexFlow.Glyphs.noteWhole,
  half: VexFlow.Glyphs.noteHalfUp,
  quarter: VexFlow.Glyphs.noteQuarterUp,
  eighth: VexFlow.Glyphs.note8thUp,
  '16th': VexFlow.Glyphs.note16thUp,
  '32nd': VexFlow.Glyphs.note32ndUp,
  '64th': VexFlow.Glyphs.note64thUp
}

export function DurationSymbol({ value }: { value: DurationValue }) {
  return (
    <svg
      aria-hidden="true"
      className="duration-symbol"
      data-duration-symbol={value}
      focusable="false"
      width="22"
      height="26"
      viewBox="0 0 32 40"
    >
      <text
        x="16"
        y={value === 'whole' ? 21 : 34}
        textAnchor="middle"
        fontFamily={VexFlow.getFonts().join(', ')}
        fontSize="26"
        fill="currentColor"
      >
        {durationGlyphs[value]}
      </text>
    </svg>
  )
}
