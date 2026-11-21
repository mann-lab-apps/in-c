import {createCreditImageFixture} from './credit-image-fixture'
// Reuse the owned plain aligned XML; never change source measure identities.
export type MeasureNumberAppearanceFixtureKind='text'|'same'|'none'|'system'|'measure'|'control'
export function createMeasureNumberAppearanceFixture(kind:MeasureNumberAppearanceFixtureKind='text'){
 const xml=createCreditImageFixture('control').replace('이미지 교환 감사 control','마디 번호 표시 '+kind),at=xml.indexOf('<part id="P2">'),tail=xml.slice(at)
 const replacement=kind==='text'?'<measure number="2" text="2a">':kind==='same'?'<measure number="2" text="2">':['none','system','measure'].includes(kind)?`<measure number="2"><print><measure-numbering font-size="12" color="#000000">${kind}</measure-numbering></print>`:'<measure number="2">'
 return xml.slice(0,at)+tail.replace('<measure number="2">',replacement)
}
