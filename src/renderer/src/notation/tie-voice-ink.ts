/** Classify painted ownership without changing score or SVG geometry. */
export function isForeignStaffVoice(source: SVGElement | null | undefined, node: SVGElement): boolean {
  const event = node.closest<SVGElement>('.notation-event')
  const part = source?.dataset.partId, staff = source?.dataset.staffId, voice = source?.dataset.voiceId
  return Boolean(part && staff && voice && event?.dataset.partId === part &&
    event.dataset.staffId === staff && event.dataset.voiceId && event.dataset.voiceId !== voice)
}

/** VexFlow paints beamed stems outside note groups. Resolve each real event. */
export function collectForeignBeamPaths(svg: SVGSVGElement, source: SVGElement | null | undefined): SVGPathElement[] {
  const events = new Map([...svg.querySelectorAll<SVGElement>('.notation-event[data-event-id]')]
    .map(event => [event.dataset.eventId, event]))
  const paths: SVGPathElement[] = []
  for (const group of svg.querySelectorAll<SVGElement>('.vf-beam[data-measure-id]')) {
    const stems = [...group.querySelectorAll<SVGElement>('.vf-stem')]
    const foreign = stems.filter(stem => {
      const event = events.get(stem.dataset.slurStemEventId)
      return event && isForeignStaffVoice(source, event)
    })
    paths.push(...foreign.flatMap(stem => [...stem.querySelectorAll<SVGPathElement>('path')]))
    // Unknown/own/other-staff stems prevent classifying the entire body as a
    // foreign beam. Their presence must not invalidate a known foreign stem.
    if (stems.length && foreign.length === stems.length) {
      paths.push(...group.querySelectorAll<SVGPathElement>(':scope > path'))
    }
  }
  return paths
}
