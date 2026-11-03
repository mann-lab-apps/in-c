export interface PartLabelTarget {
  partName: string
  partAbbreviation?: string
  staffIndex: number
}

/** A part owns its label; additional staves do not have invented display names. */
export function resolvePartLabel(target: PartLabelTarget, systemIndex: number): string | undefined {
  if (target.staffIndex !== 0) return undefined
  const value = systemIndex === 0 ? target.partName : target.partAbbreviation
  return value?.trim() ? value : undefined
}
