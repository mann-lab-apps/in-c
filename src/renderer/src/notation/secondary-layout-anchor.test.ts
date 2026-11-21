import {expect,it} from 'vitest'
import {createSecondaryLayoutAnchorFixture} from '../../../testing/secondary-layout-anchor-fixture'
import {musicXmlPrintBreaksKey} from '../../../musicxml/serialize'
import {resolvePrintLayoutPlan} from './print-layout'

it.each(['secondary','ordinal'] as const)('uses existing XML break semantics for %s references in the real print plan',mode=>{
 const{project,primary}=createSecondaryLayoutAnchorFixture(),score=project.score
 if(mode==='ordinal')score.layout={systemBreakBeforeMeasureIds:['measure-2'],pageBreakBeforeMeasureIds:['measure-3']}
 const before=structuredClone(score),canonical={...score,layout:{systemBreakBeforeMeasureIds:[primary[1].id],pageBreakBeforeMeasureIds:[primary[2].id]}}
 expect(JSON.parse(musicXmlPrintBreaksKey(score))).toEqual([[1],[2]])
 expect(resolvePrintLayoutPlan(canonical,'auto').pageCount).toBe(2)
 expect(resolvePrintLayoutPlan(score,'auto')).toEqual(resolvePrintLayoutPlan(canonical,'auto'))
 expect(score).toEqual(before)
})
