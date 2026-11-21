import {createCreditImageFixture} from './credit-image-fixture'
export type CreditContentKind='subtitle'|'dedication'|'lyricist'|'untyped'|'page2'|'fragments'|'symbol'|'symbols'|'title-only'|'composer-only'|'default-title-collision'|'title-control'|'composer-control'|'empty'|'body'|'none'|'rights-symbol'|'image-mixed'|'many'|'mixed'
const title='페이지 글자 검증 제목',composer='검증 작곡가'
export function createCreditContentFixture(kind:CreditContentKind='subtitle'){
 let xml=createCreditImageFixture('control').replace(/<work-title>[^<]+<\/work-title>/,'<work-title>'+title+'</work-title>').replace('</work>','</work><identification><creator type="composer">'+composer+'</creator></identification>')
 const text=(value:string,type?:string,page=1)=>`<credit page="${page}">${type?'<credit-type>'+type+'</credit-type>':''}<credit-words>${value}</credit-words></credit>`
 const symbol=(page=1)=>`<credit page="${page}"><credit-symbol>gClef</credit-symbol></credit>`
 let credits=''
 if(['subtitle','dedication','lyricist'].includes(kind))credits=text('추가 페이지 글자',kind)
 if(kind==='untyped')credits=text('분류 없는 페이지 글자')
 if(kind==='page2')credits=text('두 번째 쪽 머리말','page number',2)
 if(kind==='fragments')credits='<credit page="2"><credit-type>subtitle</credit-type><credit-words>첫 조각</credit-words><credit-words font-weight="bold">둘째 조각</credit-words></credit>'
 if(kind==='symbol')credits=symbol(2)
 if(kind==='symbols')credits='<credit><credit-symbol>segno</credit-symbol><credit-symbol>coda</credit-symbol></credit>'
 if(kind==='title-only'||kind==='default-title-collision'){xml=xml.replace(/<work>[\s\S]*?<\/work>/,'');credits=text(kind==='default-title-collision'?'Imported score':'원본의 유일한 제목','title')}
 if(kind==='composer-only'){xml=xml.replace(/<identification>[\s\S]*?<\/identification>/,'');credits=text('원본의 유일한 작곡가','composer')}
 if(kind==='title-control')credits=text(title,'title')
 if(kind==='composer-control')credits=text(composer,'composer')
 if(kind==='empty')credits='<credit><credit-words>  </credit-words></credit>'
 if(kind==='body')xml=xml.replace('</attributes>','</attributes><direction><direction-type><words>본문 글자는 유지</words></direction-type></direction>')
 if(kind==='rights-symbol')credits='<credit page="2"><credit-type>rights</credit-type><credit-words>© Studio QA</credit-words><credit-symbol>gClef</credit-symbol></credit>'
 if(kind==='image-mixed')credits='<credit><credit-image source="never-fetch.svg" type="image/svg+xml"/></credit>'+text('부제','subtitle',2)
 if(kind==='many'||kind==='mixed')credits=Array.from({length:30},(_,i)=>text('페이지 항목 '+(i+1),'subtitle',(i%3)+1)).join('')+(kind==='mixed'?'<credit><credit-type>rights</credit-type><credit-words>© Studio QA</credit-words></credit>':'')
 return xml.replace('<part-list>',credits+'<part-list>')
}
