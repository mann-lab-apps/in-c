import { readSvgShapeInk, readSvgTextInk, type MeasureInkOwner, type StaffInk } from './staff-ink-spacing'

const valid = (ink: StaffInk) => [ink.x, ink.y, ink.width, ink.height, ink.staffIndex, ink.systemIndex].every(Number.isFinite) &&
  ink.width > 0 && ink.height > 0 && Number.isInteger(ink.staffIndex) && ink.staffIndex >= 0 && Number.isInteger(ink.systemIndex) && ink.systemIndex >= 0

/** One baseline per staff, using the largest measured deficit across systems. */
export function resolveLyricInkSpacing(notes: readonly StaffInk[], lyrics: readonly StaffInk[], existing: ReadonlyMap<number, number>): ReadonlyMap<number, number> {
  const deficits = new Map<number, number>()
  for (const lyric of lyrics) for (const note of notes) {
    if (!valid(lyric) || !valid(note) || note.staffIndex !== lyric.staffIndex || note.systemIndex !== lyric.systemIndex ||
      Math.min(note.x + note.width, lyric.x + lyric.width) <= Math.max(note.x, lyric.x)) continue
    const deficit = note.y + note.height + 8 - lyric.y
    if (deficit > 0.05) deficits.set(lyric.staffIndex, Math.max(deficits.get(lyric.staffIndex) ?? 0, deficit))
  }
  if (!deficits.size) return existing
  const next = new Map(existing)
  for (const [index, deficit] of deficits) next.set(index, (existing.get(index) ?? 0) + Math.ceil(deficit * 100) / 100)
  return next
}

/** Shared ownership/ink read for spacing and slur-side protection. Duplicate IDs stay unresolved. */
export function readOwnedLyricInk(svg: SVGSVGElement, owners: ReadonlyMap<string, MeasureInkOwner | undefined>, context: CanvasRenderingContext2D): { ink: StaffInk[]; unresolved: boolean } {
  const nodes = [...svg.querySelectorAll<SVGTextContentElement>('.notation-lyric')]
  const ownerOf = (event: SVGElement) => {
    const owner = owners.get(event.dataset.measureId ?? '')
    return owner?.partId === event.dataset.partId && owner?.staffId === event.dataset.staffId ? owner : undefined
  }
  const events = [...svg.querySelectorAll<SVGElement>('.notation-event')], eventOwners = new Map<string, MeasureInkOwner | undefined>()
  for (const event of events) {
    const id = event.dataset.eventId
    if (id) eventOwners.set(id, eventOwners.has(id) ? undefined : ownerOf(event))
  }
  let unresolved = false
  const ink = nodes.flatMap(node => {
    const owner = eventOwners.get(node.dataset.eventId ?? ''), bounds = readSvgTextInk(node, context)
    if (!owner || !bounds) unresolved = true
    return owner && bounds ? [{ ...bounds, ...owner }] : []
  })
  return { ink, unresolved }
}

export function measureLyricInkSpacing(svg: SVGSVGElement, owners: ReadonlyMap<string, MeasureInkOwner | undefined>, existing: ReadonlyMap<number, number>): ReadonlyMap<number, number> {
  if (!svg.querySelector('.notation-lyric') || !document.fonts || typeof svg.getCTM !== 'function') return existing
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return existing
  const { ink: lyrics } = readOwnedLyricInk(svg, owners, context)
  if (!lyrics.length) return existing
  const notes = readStaffMusicInk(svg, owners, context)
  return resolveLyricInkSpacing(notes, lyrics, existing)
}

/** Shared measured music ink;never include transparent selection targets. */
export function readStaffMusicInk(svg:SVGSVGElement,owners:ReadonlyMap<string,MeasureInkOwner|undefined>,context:CanvasRenderingContext2D):StaffInk[] {
  const events=[...svg.querySelectorAll<SVGElement>('.notation-event')]
  const ownerOf=(event:SVGElement)=>{
    const owner=owners.get(event.dataset.measureId??'')
    return owner?.partId===event.dataset.partId&&owner?.staffId===event.dataset.staffId?owner:undefined
  }
  const notes: StaffInk[] = []
  for (const event of events) {
    const owner = ownerOf(event)
    if (!owner) continue
    for (const node of event.querySelectorAll<SVGTextContentElement>('text')) {
      const bounds = readSvgTextInk(node, context); if (bounds) notes.push({ ...bounds, ...owner })
    }
    for (const node of event.querySelectorAll<SVGGraphicsElement>('path,line,polygon,polyline,circle,ellipse,rect')) {
      const bounds = readSvgShapeInk(node); if (bounds) notes.push({ ...bounds, ...owner })
    }
  }
  // Close articulations are standalone SVG siblings, not note-group children.
  // Resolve a unique owned event so a duplicate/foreign ID cannot move another staff.
  const articulationOwners = new Map<string, MeasureInkOwner | undefined>()
  for (const event of events) {
    const key = JSON.stringify([event.dataset.measureId, event.dataset.eventId])
    articulationOwners.set(key, articulationOwners.has(key) ? undefined : ownerOf(event))
  }
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('.notation-articulation[data-articulation-event-id]')) {
    const owner = articulationOwners.get(JSON.stringify([node.dataset.articulationMeasureId, node.dataset.articulationEventId]))
    if (!owner) continue
    const bounds = node.tagName.toLowerCase() === 'text'
      ? readSvgTextInk(node as SVGTextContentElement, context) : readSvgShapeInk(node)
    if (bounds) notes.push({ ...bounds, ...owner })
  }
  for (const node of svg.querySelectorAll<SVGGraphicsElement>('.vf-beam[data-measure-id] path')) {
    const owner = owners.get(node.closest<SVGElement>('.vf-beam')?.dataset.measureId ?? ''), bounds = readSvgShapeInk(node)
    if (owner && bounds) notes.push({ ...bounds, ...owner })
  }
  return notes
}
