import{expect,it}from'vitest'
import{createSecondaryLayoutAnchorFixture}from'../testing/secondary-layout-anchor-fixture'
import{createLayoutMeasureIndexResolver,resolveLayoutForPrimaryStaff}from'./layout-measure-reference'

it('shares aligned concrete/ordinal positions without changing the source',()=>{
 const{project}=createSecondaryLayoutAnchorFixture(),before=structuredClone(project),indexOf=createLayoutMeasureIndexResolver(project.score)
 expect(['upper-bar-0','lower-bar-0','lower-bar-2','measure-2','unknown'].map(indexOf)).toEqual([0,0,2,1,-1]);expect(project).toEqual(before)
})
it('gives a concrete ID precedence over an ordinal alias',()=>{
 const{project}=createSecondaryLayoutAnchorFixture();project.score.parts[1].staves[0].measures[1].id='measure-1'
 expect(createLayoutMeasureIndexResolver(project.score)('measure-1')).toBe(1)
 project.score.layout={systemBreakBeforeMeasureIds:['measure-1']};expect(resolveLayoutForPrimaryStaff(project.score)?.systemBreakBeforeMeasureIds).toEqual(['upper-bar-1'])
})
it('normalizes only ephemeral formatter addresses and retains page settings',()=>{
 const{project}=createSecondaryLayoutAnchorFixture(),setup={pageMarginMm:0};project.score.layout!.pageSetup=setup;const before=structuredClone(project)
 const layout=resolveLayoutForPrimaryStaff(project.score)!;expect(layout.systemBreakBeforeMeasureIds).toEqual(['upper-bar-1']);expect(layout.pageBreakBeforeMeasureIds).toEqual(['upper-bar-2']);expect(layout.pageSetup).toBe(setup);expect(project).toEqual(before)
})
it('retains canonical object identity, explicit empty arrays and omitted layout',()=>{
 const{project}=createSecondaryLayoutAnchorFixture();project.score.layout={systemBreakBeforeMeasureIds:['upper-bar-1'],pageBreakBeforeMeasureIds:[]};const before=project.score.layout
 expect(resolveLayoutForPrimaryStaff(project.score)).toBe(before);expect(resolveLayoutForPrimaryStaff(project.score)?.pageBreakBeforeMeasureIds).toBe(before.pageBreakBeforeMeasureIds)
 delete project.score.layout;expect(resolveLayoutForPrimaryStaff(project.score)).toBeUndefined()
})
it('does not invent positions for unknown or unaligned nonprimary anchors',()=>{
 const{project}=createSecondaryLayoutAnchorFixture();project.score.parts[0].staves[0].measures.pop();project.score.layout!.pageBreakBeforeMeasureIds!.push('unknown');const before=structuredClone(project)
 const indexOf=createLayoutMeasureIndexResolver(project.score);expect(indexOf('lower-bar-2')).toBe(-1);expect(indexOf('unknown')).toBe(-1)
 expect(resolveLayoutForPrimaryStaff(project.score)?.pageBreakBeforeMeasureIds).toEqual(['lower-bar-2','unknown']);expect(project).toEqual(before)
})
it('preserves order and duplicates rather than rewriting the saved arrays',()=>{
 const{project}=createSecondaryLayoutAnchorFixture();project.score.layout={systemBreakBeforeMeasureIds:['lower-bar-1','upper-bar-1']};const before=structuredClone(project)
 expect(resolveLayoutForPrimaryStaff(project.score)?.systemBreakBeforeMeasureIds).toEqual(['upper-bar-1','upper-bar-1']);expect(project).toEqual(before)
})
