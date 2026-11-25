import { findSimpleRepeatForVolta, locateCoveredVolta, resolveMeasureVoltas, sameVoltaPasses, scoreRepeatSource,
  type Score, type Part, type Staff, type Measure, type VoltaMark } from '../score-core'

// XML has one part-measure barline;the native score keeps concrete staff owners.
export function musicXmlBarlineStaff(score:Score,part:Part):Staff {
 const source=scoreRepeatSource(score)
 return source&&part.staves.includes(source)?source:part.staves[0]
}

// Permit only the representable expansion of an aligned sequence onto empty
// sibling staves.Conflicting markings stay raw in the strict save signature.
export function comparableMusicXmlBarlines(score:Score,part:Part):readonly {repeat:Measure['repeat']|null;volta:Measure['volta']|null}[]|undefined {
 if(!scoreRepeatSource(score))return undefined
 const source=musicXmlBarlineStaff(score,part),shape=(staff:Staff)=>staff.measures.map(m=>({repeat:m.repeat??null,volta:m.volta??null})),sequence=shape(source),signature=JSON.stringify(sequence)
 for(const staff of part.staves){
  const marked=staff.measures.some(m=>m.repeat?.start||m.repeat?.end||m.volta)
  if(marked&&JSON.stringify(shape(staff))!==signature)return undefined
 }
 const repeatCounts = secondVoltaRepeatCounts(source.measures)
 return source.measures.map((measure, index) => ({
   ...sequence[index], volta: musicXmlVoltaForExport(measure.volta, repeatCounts.get(measure)) ?? null
 }))
}

// Resolve the ending's displayed span before looking up its repeat. A
// start-only ending with no matching stop covers just its own measure.
export function secondVoltaRepeatCounts(measures: readonly Measure[]): Map<Measure, number> {
  const counts = new Map<Measure, number>()
  const isSecond = (volta?: VoltaMark) => volta?.number === 2 ||
    (volta?.passes?.length === 1 && volta.passes[0] === 2)
  if (!measures.some(measure => measure.volta?.start && isSecond(measure.volta))) return counts

  const covered = resolveMeasureVoltas(measures)
  for (const [index, measure] of measures.entries()) {
    const mark = measure.volta
    if (!mark?.start || !isSecond(mark)) continue
    const [, endIndex] = locateCoveredVolta(measures, index, mark, covered)
    const ending = measures[endIndex]
    if (endIndex !== index && (!ending.volta?.end || !sameVoltaPasses(mark, ending.volta))) continue
    const repeat = findSimpleRepeatForVolta(measures, index, endIndex)
    if (!repeat || !Number.isSafeInteger(repeat.count) || repeat.count > 100) continue
    counts.set(measure, repeat.count)
    counts.set(ending, repeat.count)
  }
  return counts
}

export function musicXmlVoltaForExport(volta: VoltaMark | undefined, repeatCount: number | undefined): VoltaMark | undefined {
  if (!volta || repeatCount === undefined) return volta
  const { start, end } = volta
  if (volta.number === 2 && repeatCount > 2) {
    return { start, end, passes: Array.from({ length: repeatCount - 1 }, (_, index) => index + 2) }
  }
  if (volta.passes?.length === 1 && volta.passes[0] === 2 && repeatCount === 2) {
    return { start, end, number: 2 }
  }
  return volta
}
