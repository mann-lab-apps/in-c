import { createGlobalMeasureResolver } from './global-measure-reference'
import type { Score, ScoreCommand, HarmonyMark } from '../../../score-core'
import { measureDurationTicks } from '../../../score-core'

export type SelectionObjectTypeFilter = 'none' | 'dynamics' | 'harmonies' | 'staff-texts' | 'expression-texts' | 'system-texts' | 'rehearsal-marks'

export type MeasureMarkingClipboard = (
  | {
      type: 'dynamics'
      dynamics: NonNullable<Score['dynamics']>
    }
  | {
      type: 'harmonies'
      harmonies: HarmonyMark[]
    }

  | { type: 'system-texts'; systemTexts: NonNullable<Score['systemTexts']> }
  | { type: 'rehearsal-marks'; rehearsalMarks: NonNullable<Score['rehearsalMarks']> }
  | { type: 'staff-texts'; staffTexts: NonNullable<Score['staffTexts']> }
  | { type: 'expression-texts'; expressionTexts: NonNullable<Score['expressionTexts']> }
) & { pasteMode?: 'append-single' | 'replace-measure' }

// Markings carry measure IDs in the existing model. Reject ambiguous IDs
// rather than changing another staff's object or inventing new schema ownership.
function hasUniqueMeasure(score: Score, id: string): boolean {
  return score.parts.reduce((n, p) => n + p.staves.reduce((n, s) => n + s.measures.filter(m => m.id === id).length, 0), 0) === 1
}

export function buildSingleMeasureTextClipboard(
  score:Score,family:'staffTexts'|'systemTexts'|'rehearsalMarks'|'expressionTexts'|'harmonies'|'dynamics',id:string
):MeasureMarkingClipboard|undefined {
  if(family==='dynamics'){
    const matches=score.dynamics?.filter(mark=>mark.id===id)??[]
    if(matches.length!==1||!hasUniqueMeasure(score,matches[0].measureId))return undefined
    const mark=matches[0]
    // A stored duplicate is selectable only through the explicit Inspector
    // list. Its snapshot still replaces a target measure, not a beat or voice.
    return{type:'dynamics',dynamics:[{...mark}],pasteMode:'replace-measure'}
  }
  const matches=score[family]?.filter(item=>item.id===id)??[]
  if(matches.length!==1)return undefined
  const item=matches[0]
  if((family==='staffTexts'||family==='expressionTexts'||family==='harmonies')?!hasUniqueMeasure(score,item.measureId):!createGlobalMeasureResolver(score)(item.measureId))return undefined
  if(family==='harmonies'){
    const harmony=score.harmonies!.find(mark=>mark.id===id)!
    if(!timedMarkingsFitTarget(score,harmony.measureId,[harmony]))return undefined
    return{type:'harmonies',harmonies:[structuredClone(harmony)],pasteMode:'append-single'}
  }
  if(family==='expressionTexts'){
    const text=score.expressionTexts!.find(text=>text.id===id)!
    if(!timedMarkingsFitTarget(score,text.measureId,[text]))return undefined
    return{type:'expression-texts',expressionTexts:[{...text}],pasteMode:'append-single'}
  }
  if(family==='staffTexts')return{type:'staff-texts',staffTexts:[{...item}],pasteMode:'append-single'}
  if(family==='systemTexts')return{type:'system-texts',systemTexts:[{...item}],pasteMode:'append-single'}
  return{type:'rehearsal-marks',rehearsalMarks:[{...item}],pasteMode:'append-single'}
}

export function buildMeasureObjectDeleteCommand(
  score: Score,
  measureId: string,
  filter: SelectionObjectTypeFilter
): ScoreCommand | undefined {
  if (!hasUniqueMeasure(score, measureId)) return undefined
  if (filter === 'dynamics') {
    const currentDynamics = score.dynamics ?? []
    const dynamics = currentDynamics.filter(
      (dynamic) => dynamic.measureId !== measureId
    )

    if (dynamics.length === currentDynamics.length) {
      return undefined
    }

    return {
      type: 'score-dynamics.update',
      dynamics: dynamics.length > 0 ? dynamics : undefined
    }
  }

  if (filter === 'rehearsal-marks') {
    const resolve = createGlobalMeasureResolver(score), current = score.rehearsalMarks ?? []
    const rehearsalMarks = current.filter(mark => resolve(mark.measureId) !== measureId)
    return rehearsalMarks.length === current.length ? undefined : {
      type: 'score-rehearsal-marks.update', rehearsalMarks: rehearsalMarks.length ? rehearsalMarks : undefined
    }
  }

  if (filter === 'system-texts') {
    const resolve = createGlobalMeasureResolver(score), current = score.systemTexts ?? []
    const systemTexts = current.filter(text => resolve(text.measureId) !== measureId)
    return systemTexts.length === current.length ? undefined : {
      type: 'score-system-texts.update', systemTexts: systemTexts.length ? systemTexts : undefined
    }
  }

  if (filter === 'staff-texts') {
    const current = score.staffTexts ?? []
    const staffTexts = current.filter(text => text.measureId !== measureId)
    return staffTexts.length === current.length ? undefined : {
      type: 'score-staff-texts.update', staffTexts: staffTexts.length ? staffTexts : undefined
    }
  }

  if (filter === 'expression-texts') {
    const current = score.expressionTexts ?? []
    const expressionTexts = current.filter(text => text.measureId !== measureId)
    return expressionTexts.length === current.length ? undefined : {
      type: 'score-expression-texts.update', expressionTexts: expressionTexts.length ? expressionTexts : undefined
    }
  }

  if (filter === 'harmonies') {
    const currentHarmonies = score.harmonies ?? []
    const harmonies = currentHarmonies.filter(
      (harmony) => harmony.measureId !== measureId
    )

    if (harmonies.length === currentHarmonies.length) {
      return undefined
    }

    return {
      type: 'score-harmonies.update',
      harmonies: harmonies.length > 0 ? harmonies : undefined
    }
  }

  return undefined
}

export function buildMeasureMarkingClipboard(
  score: Score,
  measureId: string,
  filter: SelectionObjectTypeFilter
): MeasureMarkingClipboard | undefined {
  if (!hasUniqueMeasure(score, measureId)) return undefined
  if (filter === 'rehearsal-marks') {
    const resolve = createGlobalMeasureResolver(score)
    const rehearsalMarks = (score.rehearsalMarks ?? []).filter(mark => resolve(mark.measureId) === measureId).map(mark => ({ ...mark }))
    return rehearsalMarks.length ? { type: 'rehearsal-marks', rehearsalMarks } : undefined
  }
  if (filter === 'dynamics') {
    const dynamics = (score.dynamics ?? []).filter(
      (dynamic) => dynamic.measureId === measureId
    )

    return dynamics.length > 0 ? { type: 'dynamics', dynamics } : undefined
  }

  if (filter === 'system-texts') {
    const resolve = createGlobalMeasureResolver(score)
    const systemTexts = (score.systemTexts ?? []).filter(text => resolve(text.measureId) === measureId).map(text => ({ ...text }))
    return systemTexts.length ? { type: 'system-texts', systemTexts } : undefined
  }

  if (filter === 'staff-texts') {
    const staffTexts = (score.staffTexts ?? []).filter(text => text.measureId === measureId).map(text => ({ ...text }))
    return staffTexts.length ? { type: 'staff-texts', staffTexts } : undefined
  }

  if (filter === 'expression-texts') {
    const expressionTexts = (score.expressionTexts ?? []).filter(text => text.measureId === measureId).map(text => ({ ...text }))
    return expressionTexts.length ? { type: 'expression-texts', expressionTexts } : undefined
  }

  if (filter === 'harmonies') {
    const harmonies = (score.harmonies ?? []).filter(
      (harmony) => harmony.measureId === measureId
    )

    return harmonies.length > 0 ? { type: 'harmonies', harmonies } : undefined
  }

  return undefined
}

export function buildMeasureMarkingPasteCommand(
  score: Score,
  targetMeasureId: string,
  clipboard: MeasureMarkingClipboard,
  createId: () => string,
  targetTick = 0
): ScoreCommand | undefined {
  if (!hasUniqueMeasure(score, targetMeasureId)) return undefined
  if(clipboard.pasteMode==='replace-measure'&&!(clipboard.type==='dynamics'&&clipboard.dynamics.length===1))return undefined
  const appendSingle=clipboard.pasteMode==='append-single'
  if(appendSingle&&!((clipboard.type==='staff-texts'&&clipboard.staffTexts.length===1)||
    (clipboard.type==='system-texts'&&clipboard.systemTexts.length===1)||
    (clipboard.type==='rehearsal-marks'&&clipboard.rehearsalMarks.length===1)||
    (clipboard.type==='expression-texts'&&clipboard.expressionTexts.length===1)||
    (clipboard.type==='harmonies'&&clipboard.harmonies.length===1)))return undefined

  if (clipboard.type === 'rehearsal-marks') {
    // Keep new global markings on the staff read by the existing XML importer.
    if (!score.parts[0]?.staves[0]?.measures.some(measure => measure.id === targetMeasureId)) return undefined
    const resolve = createGlobalMeasureResolver(score)
    const rehearsalMarks = [...(score.rehearsalMarks ?? []).filter(mark => appendSingle || resolve(mark.measureId) !== targetMeasureId),
      ...clipboard.rehearsalMarks.map(mark => ({ ...mark, id: `rehearsal-${createId()}`, measureId: targetMeasureId }))]
    return { type: 'score-rehearsal-marks.update', rehearsalMarks }
  }
  if (clipboard.type === 'dynamics') {
    const otherDynamics = (score.dynamics ?? []).filter(
      (dynamic) => dynamic.measureId !== targetMeasureId
    )
    const dynamics = [
      ...otherDynamics,
      ...clipboard.dynamics.map((dynamic) => ({
        ...dynamic,
        id: `dynamic-${createId()}`,
        measureId: targetMeasureId
      }))
    ]

    return {
      type: 'score-dynamics.update',
      dynamics: dynamics.length > 0 ? dynamics : undefined
    }
  }

  if (clipboard.type === 'system-texts') {
    // Existing XML import reads system markings from the score's first staff.
    // Do not create a new off-primary marking that cannot round-trip safely.
    if (!score.parts[0]?.staves[0]?.measures.some(measure => measure.id === targetMeasureId)) return undefined
    const resolve = createGlobalMeasureResolver(score)
    const systemTexts = [...(score.systemTexts ?? []).filter(text => appendSingle || resolve(text.measureId) !== targetMeasureId),
      ...clipboard.systemTexts.map(text => ({ ...text, id: `system-text-${createId()}`, measureId: targetMeasureId }))]
    return { type: 'score-system-texts.update', systemTexts }
  }

  if (clipboard.type === 'staff-texts') {
    const staffTexts = [...(score.staffTexts ?? []).filter(text => appendSingle || text.measureId !== targetMeasureId),
      ...clipboard.staffTexts.map(text => ({ ...text, id: `staff-text-${createId()}`, measureId: targetMeasureId }))]
    return { type: 'score-staff-texts.update', staffTexts }
  }

  if (clipboard.type === 'expression-texts') {
    // A single marking is the relative origin;lists retain their recorded ticks.
    const snapshot=clipboard.expressionTexts.map(text=>({...text,tick:appendSingle?targetTick:text.tick}))
    if (!timedMarkingsFitTarget(score, targetMeasureId, snapshot)) return undefined
    const expressionTexts = [...(score.expressionTexts ?? []).filter(text => appendSingle || text.measureId !== targetMeasureId),
      ...snapshot.map(text => ({ ...text, id: `expression-text-${createId()}`, measureId: targetMeasureId }))]
    return { type: 'score-expression-texts.update', expressionTexts }
  }

  const snapshot = clipboard.harmonies.map(harmony => ({
    ...structuredClone(harmony), tick: appendSingle ? targetTick : harmony.tick
  }))
  if (!timedMarkingsFitTarget(score, targetMeasureId, snapshot)) return undefined
  const otherHarmonies = (score.harmonies ?? []).filter(
    (harmony) => appendSingle || harmony.measureId !== targetMeasureId
  )
  const harmonies = [
    ...otherHarmonies,
    ...snapshot.map((harmony) => ({
      ...harmony,
      id: `harmony-${createId()}`,
      measureId: targetMeasureId
    }))
  ]

  return {
    type: 'score-harmonies.update',
    harmonies: harmonies.length > 0 ? harmonies : undefined
  }
}

function timedMarkingsFitTarget(score: Score, targetMeasureId: string, markings: readonly { tick: number }[]): boolean {
  const target = score.parts.flatMap(part => part.staves.flatMap(staff => staff.measures))
    .find(measure => measure.id === targetMeasureId)!
  const endTick = measureDurationTicks(target)
  // Keep recorded positions, including a legal bar-end anchor. Do not move,
  // discard, or spill a late source marking into a neighboring target measure.
  return markings.every(marking => Number.isInteger(marking.tick) && marking.tick >= 0 && marking.tick <= endTick)
}
