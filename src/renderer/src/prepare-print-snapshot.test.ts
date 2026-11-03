// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest'
import {createScore} from '../../score-core'
import type {PdfRenderSnapshot} from './PdfSnapshot'
import {refreshPrintSnapshotWidths} from './prepare-print-snapshot'
import {resolvePrintLayoutPlan} from './notation/print-layout'
import * as widths from './notation/use-lyric-layout'
vi.mock('./notation/NotationPreview',()=>({createStaveNote:vi.fn()}))
afterEach(()=>vi.restoreAllMocks())
function fixture(target:'auto'|number=3){
 const score=createScore(),lyricWidths=new Map([['word',42]]),harmonyWidths=new Map(),fresh=Object.assign(new Map<string,number>(),{systemStart:new Map([[score.parts[0].staves[0].measures[0].id,280]])})
 const snapshot:PdfRenderSnapshot={generation:19,score,plan:resolvePrintLayoutPlan(score,target),title:'Requested title',partTitle:'Part request',partId:score.parts[0].id,viewMode:'part',lyricWidths,harmonyWidths,minimumMeasureWidths:new Map()}
 const measure=vi.spyOn(widths,'minimumTextScoreWidths').mockReturnValue(fresh)
 return{snapshot,fresh,measure}
}
it('refreshes font-dependent minima from the immutable request rather than a newer live document',()=>{
 const {snapshot,fresh,measure}=fixture(),source=structuredClone(snapshot.score),oldPlan=structuredClone(snapshot.plan)
 const live=structuredClone(snapshot.score);live.title='New unsaved title';live.parts[0].name='New live part'
 const ready=refreshPrintSnapshotWidths(snapshot)
 expect(measure).toHaveBeenCalledWith(snapshot.score,snapshot.lyricWidths,snapshot.harmonyWidths)
 expect(ready.minimumMeasureWidths).toBe(fresh)
 expect(ready.score).toBe(snapshot.score);expect(ready.score).toEqual(source)
 expect(ready).toMatchObject({generation:19,title:'Requested title',partTitle:'Part request',partId:snapshot.partId,viewMode:'part'})
 expect(snapshot.plan).toEqual(oldPlan);expect(snapshot.minimumMeasureWidths.size).toBe(0)
})
it.each(['auto',3]as const)('preserves %s target and requested physical page setup when replanning',target=>{
 const {snapshot,fresh}=fixture(target)
 const ready=refreshPrintSnapshotWidths(snapshot)
 expect(ready).not.toBe(snapshot)
 expect(ready.plan).toEqual(resolvePrintLayoutPlan(snapshot.score,target,fresh))
 expect(ready.plan.pageSetup).toEqual(snapshot.plan.pageSetup)
 expect(ready.lyricWidths).toBe(snapshot.lyricWidths);expect(ready.harmonyWidths).toBe(snapshot.harmonyWidths)
})
