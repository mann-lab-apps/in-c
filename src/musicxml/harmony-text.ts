import type { HarmonyMark, Pitch, PitchStep } from '../score-core'

const kindMap: Record<string, string> = {
  '': 'major', '7': 'dominant', m: 'minor', m7: 'minor-seventh',
  maj7: 'major-seventh', dim: 'diminished', sus4: 'suspended-fourth'
}
const suffixByKind = new Map(Object.entries(kindMap).map(([suffix, kind]) => [kind, suffix]))

export function parseHarmonyText(
  text: string
): Omit<HarmonyMark, 'id' | 'measureId' | 'tick'> | undefined {
  const match = /^(?<root>[A-G])(?<rootAccidental>#|b)?(?<kind>maj7|dim|sus4|m7|m|7)?(?:\/(?<bass>[A-G])(?<bassAccidental>#|b)?)?$/.exec(text)

  if (!match?.groups) {
    return undefined
  }

  const kindText = match.groups.kind ?? ''

  return {
    text,
    root: {
      step: match.groups.root as PitchStep,
      alter: accidentalTextToAlter(match.groups.rootAccidental)
    },
    kind: kindMap[kindText],
    bass: match.groups.bass
      ? {
          step: match.groups.bass as PitchStep,
          alter: accidentalTextToAlter(match.groups.bassAccidental)
        }
      : undefined
  }
}

/** For standard kinds without a custom display attribute, assemble the label
 * from the structured pitches using exactly the editor's existing vocabulary.
 * Unknown kinds and explicit/legacy full labels keep the prior import policy. */
export function formatStandardHarmonyText(
  root: HarmonyMark['root'], kind: string | undefined, bass: HarmonyMark['bass']
): string | undefined {
  const suffix = kind === undefined ? undefined : suffixByKind.get(kind)
  if (!root || suffix === undefined) return undefined
  const pitchText = (pitch: NonNullable<HarmonyMark['root']>) =>
    `${pitch.step}${['bb', 'b', '', '#', '##'][(pitch.alter ?? 0) + 2]}`
  return `${pitchText(root)}${suffix}${bass ? `/${pitchText(bass)}` : ''}`
}

function accidentalTextToAlter(value: string | undefined): Pitch['alter'] {
  if (value === '#') {
    return 1
  }

  if (value === 'b') {
    return -1
  }

  return undefined
}


// MusicXML 4.0 kind-value; validated against the pinned offline schema.
export const musicXmlHarmonyKinds: ReadonlySet<string> = new Set(['major', 'minor', 'augmented', 'diminished', 'dominant', 'major-seventh', 'minor-seventh', 'diminished-seventh', 'augmented-seventh', 'half-diminished', 'major-minor', 'major-sixth', 'minor-sixth', 'dominant-ninth', 'major-ninth', 'minor-ninth', 'dominant-11th', 'major-11th', 'minor-11th', 'dominant-13th', 'major-13th', 'minor-13th', 'suspended-second', 'suspended-fourth', 'Neapolitan', 'Italian', 'French', 'German', 'pedal', 'power', 'Tristan', 'other', 'none'])

// Reuse the exact editor grammar for legacy text-only symbols. Explicit model
// fields always win; this returns a view and never mutates source annotations.
export function inferHarmonyStructure(harmony: HarmonyMark): HarmonyMark {
  const parsed = parseHarmonyText(harmony.text)
  const root = harmony.root ?? parsed?.root
  return { ...harmony, root, kind: harmony.kind ?? parsed?.kind ?? (root ? 'other' : undefined), bass: harmony.bass ?? parsed?.bass }
}
