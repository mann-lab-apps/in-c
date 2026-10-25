// Documentation evidence only. Does not generate or edit product code.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const require=createRequire(path.join(root,'package.json'));
const ts=require('typescript');
const base=path.join(root,'docs/brand/ddirori-design-system');
const check=process.argv.includes('--check');
function output(file,content){
 if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content)throw new Error('Stale API snapshot: '+path.relative(root,file));}
 else fs.writeFileSync(file,content);
}
const input=['packages/ddirori_web/src/index.tsx','packages/ddirori_web/src/basic.tsx'];
const configPath=ts.findConfigFile(path.join(root,'packages/ddirori_web'),ts.sys.fileExists);
const config=ts.readConfigFile(configPath,ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(configPath));
const program=ts.createProgram(input.map(p=>path.join(root,p)),parsed.options), checker=program.getTypeChecker();
const react=[];
for(const file of input){const sf=program.getSourceFile(path.join(root,file)); for(const node of sf.statements){
 if(!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)||!node.name)continue;
 const name=node.name.getText(sf),line=sf.getLineAndCharacterOfPosition(node.getStart(sf)).line+1;
 const signature=ts.isFunctionDeclaration(node)?sf.text.slice(node.getStart(sf),node.body.getStart(sf)).trim():node.getText(sf);
 const props=[];
 if(ts.isFunctionDeclaration(node)&&node.parameters[0]){
 const param=node.parameters[0], defaults=new Map();
 if(ts.isObjectBindingPattern(param.name))for(const e of param.name.elements)if(e.initializer)defaults.set((e.propertyName??e.name).getText(sf),e.initializer.getText(sf));
 for(const sym of checker.getTypeAtLocation(param).getProperties()){
 const decl=sym.valueDeclaration??sym.declarations?.[0];
 if(!decl||!input.some(p=>decl.getSourceFile().fileName===path.join(root,p)))continue;
 props.push({name:sym.name,type:checker.typeToString(checker.getTypeOfSymbolAtLocation(sym,decl),decl,ts.TypeFormatFlags.NoTruncation),required:!(sym.flags&ts.SymbolFlags.Optional),default:defaults.get(sym.name)??'—'});
 }
 }
 react.push({name,file,line,signature,props});
}}
const dart=[];
const entry=fs.readFileSync(path.join(root,'packages/ddirori_ui/lib/ddirori_ui.dart'),'utf8');
for(const [,rel]of entry.matchAll(/export '([^']+)';/g)){
 if(rel.startsWith('src/generated/'))continue;
 const file='packages/ddirori_ui/lib/'+rel,s=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of s.matchAll(/^(class|enum) ([A-Z]\w*)[^\n{]*\{/gm)){
 const name=m[2],start=m.index,bodyStart=start+m[0].length;
 let depth=1,i=bodyStart;for(;i<s.length&&depth;i++){if(s[i]==='{')depth++;if(s[i]==='}')depth--;}
 const body=s.slice(bodyStart,i-1), beforeOverride=body.split('@override')[0];
 const fields=[...body.matchAll(/^  final ([^;]+);/gm)].map(m=>m[1]);
 const constructors=[...body.matchAll(new RegExp('(?:const )?'+name+'(?:\\.\\w+)?\\([\\s\\S]*?\\);','g'))].map(m=>m[0]);
 dart.push({name,file,line:s.slice(0,start).split('\n').length,kind:m[1],signature:m[1]==='enum'?s.slice(start,i):s.slice(start,bodyStart)+'\n'+beforeOverride.trim()+'\n}',fields,constructors});
 }
 for(const m of s.matchAll(/^(Future<[^\n]+?>|void|String|ThemeData|TextStyle) (\w+)(?:<[^\n]+?>)?\(/gm)){
 const start=m.index;let i=start+m[0].length,depth=1;for(;i<s.length&&depth;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--;}
 dart.push({name:m[2],file,line:s.slice(0,start).split('\n').length,kind:'function',signature:s.slice(start,i),fields:[],constructors:[]});
 }
}
const escape=s=>String(s).replaceAll('|','&#124;').replaceAll('\n',' ');
let md='# React API 원문과 직접 선언한 props\n\n현행 소스에서 추출한 계약이다. 구현 완료·브라우저 지원 보장이 아니다. 기본값 `—`는 함수 인자에서 기본값을 선언하지 않았다는 뜻이다. React 표준 HTML 속성은 원문에 표시한 상속 타입을 따른다. 생성된 tokens export는 [토큰 부록](token-reference.md)을 본다.\n\nImport: `import { … } from "@ddirori/ui"`; `import "@ddirori/ui/styles.css"`.\n\n';
for(const e of react){md+=`<a id="${e.name}"></a>\n## ${e.name}\n\n소스: [${e.file}](../../../../${e.file}) · 조사 당시 ${e.line}행.\n\n\`\`\`tsx\n${e.signature}\n\`\`\`\n\n`;if(e.props.length)md+='| 인자 | 타입 | 필수 | 인자 기본값 |\n| --- | --- | --- | --- |\n'+e.props.map(p=>`| ${p.name} | ${escape(p.type)} | ${p.required?'예':'아니오'} | ${escape(p.default)} |`).join('\n')+'\n\n';}
output(path.join(base,'specifications/api-react.md'),md);
md='# Flutter API 원문\n\n공개 export 파일의 실제 constructor·필드와 함수 서명이다. `required`, nullable 타입, constructor 기본값이 계약이다. Widget의 key는 Flutter 규칙을 따른다. 아래 선언은 구현을 복제하는 코드가 아닌 소스 조사 자료이며 타입별 동작은 컴포넌트 명세를 따른다.\n\nImport: `package:ddirori_ui/ddirori_ui.dart`; Material 합성은 `package:flutter/material.dart`. 생성 토큰은 [토큰 부록](token-reference.md).\n\n';
for(const e of dart){md+=`<a id="${e.name}"></a>\n## ${e.name}\n\n소스: [${e.file}](../../../../${e.file}) · 조사 당시 ${e.line}행.\n\n\`\`\`dart\n${e.signature}\n\`\`\`\n\n`;if(e.fields.length)md+='필드 타입: '+e.fields.map(f=>'`'+f+'`').join(', ')+'.\n\n';}
output(path.join(base,'specifications/api-flutter.md'),md);
output(path.join(base,'evidence/specifications/api.json'),JSON.stringify({react,dart},null,2)+'\n');
console.log(`API snapshot: React ${react.length}, Flutter ${dart.length}`);
