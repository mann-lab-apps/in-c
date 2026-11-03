import { measureDynamicsFixture } from './measure-dynamics-fixture'

export function legacySpanOrderFixture(kind: 'slur' | 'hairpin', order: 'equal' | 'reversed') {
  const source = measureDynamicsFixture().source
  source.dynamics = source.dynamics!.filter(mark => mark.id !== 'lower-first')
  source.dynamics.find(mark => mark.id === 'lower-later')!.value = 'mp'
  delete source.hairpins![0].engraving
  const family = kind === 'slur' ? 'slurs' : 'hairpins'
  const span = source[family]![0]
  const originalStart = span.startEventId, originalEnd = span.endEventId
  span.endEventId = originalStart
  if (order === 'reversed') span.startEventId = originalEnd
  const edited = structuredClone(source)
  edited[family]![0].engraving = { ...edited[family]![0].engraving, height: 4 }
  const repair = kind === 'slur' && order === 'reversed'
    ? { startEventId: 'primary-bar-1-a' }
    : { endEventId: kind === 'slur' ? 'primary-bar-4-b' : 'lower-bar-4-b' }
  const repaired = structuredClone(source)
  Object.assign(repaired[family]![0], repair)
  return { source, edited, repaired, reference: {kind, id: span.id}, repair }
}
