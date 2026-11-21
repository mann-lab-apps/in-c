import {createCreditImageFixture} from './credit-image-fixture'
export type RightsFixtureKind='root-single'|'root-multi'|'root-custom'|'credit'|'credit-multi'|'mixed'|'control'|'empty'|'body-control'
/** Synthetic rights text, not a statement about ownership of any user score. */
export function createRightsFixture(kind:RightsFixtureKind='root-single'){
 const title='저작권 정보 교환 감사',notice='© 2026 Studio QA · 검증 전용',identification='<identification><creator type="composer">Studio QA</creator></identification>',duplicateCredits=`<credit><credit-type>title</credit-type><credit-words>${title}</credit-words></credit><credit><credit-type>composer</credit-type><credit-words>Studio QA</credit-words></credit>`
 let xml=createCreditImageFixture('control').replace('이미지 교환 감사 control',title).replace('</work>','</work>'+identification+duplicateCredits)
 const rights=kind==='root-single'?`<rights>${notice}</rights>`:kind==='root-multi'||kind==='mixed'?`<rights type="music">${notice}</rights><rights type="words">검증용 가사 고지</rights>`:kind==='root-custom'?'<rights type="arrangement">검증용 편곡 고지</rights>':kind==='empty'?'<rights> </rights>':''
 xml=xml.replace('</identification>',rights+'</identification>')
 const credit=kind==='credit'||kind==='mixed'?`<credit page="2"><credit-type>rights</credit-type><credit-words default-x="50" default-y="40">${notice}</credit-words></credit>`:kind==='credit-multi'?`<credit page="2"><credit-type>rights</credit-type><credit-words>${notice}</credit-words><credit-words font-style="italic">검증용 편곡 고지</credit-words></credit>`:kind==='empty'?'<credit><credit-type>rights</credit-type><credit-words> </credit-words></credit>':''
 xml=xml.replace('<part-list>',credit+'<part-list>')
 if(kind==='body-control'){const at=xml.indexOf('<part id="P2">');xml=xml.slice(0,at)+xml.slice(at).replace('<measure number="2">','<measure number="2"><direction placement="above"><direction-type><words>© Studio QA · 보표 글자</words></direction-type></direction>')}
 return xml
}
