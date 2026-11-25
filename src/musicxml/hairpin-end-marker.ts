import type { Hairpin } from '../score-core'

// MusicXML 4.0 gives wedge stops an optional document-wide ID. Studio uses a
// reserved ID only when the MusicXML position and voice alone lose the role.
export const hairpinEndMarkerPrefix = 'ddirori-studio-hairpin-end-'
const marker = new RegExp(`^${hairpinEndMarkerPrefix}(onset|release|time)-[1-9][0-9]*$`)

export function readHairpinEndMarker(id: string | undefined): Hairpin['endAnchor'] | 'time' {
  const role = id && marker.exec(id)?.[1]
  return role === 'onset' || role === 'release' || role === 'time' ? role : undefined
}
