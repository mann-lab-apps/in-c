import { singleHarmonyFixture } from './single-harmony-fixture'

export function measureDynamicsFixture() {
 const source=singleHarmonyFixture();source.title='Generated measure dynamics consistency';delete source.harmonies
 source.dynamics=[{id:'primary-first',measureId:'primary-bar-1',value:'p'},{id:'primary-later',measureId:'primary-bar-1',value:'ff'},{id:'lower-first',measureId:'lower-bar-1',value:'f'},{id:'lower-later',measureId:'lower-bar-1',value:'pp'},{id:'other',measureId:'other-bar-2',value:'mf'}]
 source.hairpins=[{id:'manual-dynamic-control',startEventId:'lower-bar-1-a',endEventId:'lower-bar-2-b',type:'crescendo',engraving:{offsetY:0,height:4}}]
 source.slurs=[{id:'manual-slur-control',startEventId:'primary-bar-3-a',endEventId:'primary-bar-4-b',engraving:{offsetX:0,height:3}}]
 const edited=structuredClone(source);edited.dynamics=[...edited.dynamics!.filter(mark=>mark.measureId!=='primary-bar-1'),{id:'primary-first',measureId:'primary-bar-1',value:'mf'}]
 return {source,edited}
}
