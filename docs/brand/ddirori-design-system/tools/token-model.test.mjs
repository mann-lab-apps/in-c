import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveTokens, validateTokens} from './token-model.mjs';
test('aliases resolve across source/palette and preserve arrays and fractional units', () => {
  const result = resolveTokens({spacing:{sm:8},control:{padding:'$spacing.sm'},tracking:-.02,curve:[.2,0,0,1],color:'@light.ink'},{light:{ink:'#202020'}});
  assert.equal(result.control.padding,8); assert.equal(result.tracking,-.02);
  assert.deepEqual(result.curve,[.2,0,0,1]); assert.equal(result.color,'#202020');
});
test('missing aliases and cycles fail instead of silently substituting', () => {
  assert.throws(()=>resolveTokens({a:'$missing'},{}),/Unresolved/);
  assert.throws(()=>resolveTokens({a:'$b',b:'$a'},{}),/Cyclic/);
  assert.throws(()=>resolveTokens({a:'@bad'},{}),/Unresolved/);
});
test('working theme stays blue across generated web/native roles and brand icons', async () => {
  const base=new URL('../',import.meta.url), read=f=>readFile(new URL(f,base),'utf8');
  const system=JSON.parse(await read('color-system.json'));
  const palette=JSON.parse(await read('palette-pilot.json'));
  const resolved=JSON.parse(await read('generated/tokens.resolved.json'));
  const dart=await read('generated/ddirori_tokens.dart');
  assert.equal(system.active,'blue');assert.equal(palette.key,'blue');
  assert.equal(resolved.themes.light.brand,'#A5D8FF');
  assert.equal(resolved.themes.light.action,'#1971C2');
  assert.equal(resolved.themes.dark.action,'#A5D8FF');
  assert.equal(resolved.themes.light.info,'#616161');
  assert(dart.includes("'action': 0xFF1971C2"));
  const mark=await read('../ddirori-brand-system/assets/icon-master.svg');
  assert(mark.includes('fill="#A5D8FF"'));
});
test('generated units and text roles match the validated source', async () => {
  const base=new URL('../',import.meta.url), read=f=>readFile(new URL(f,base),'utf8');
  const source=JSON.parse(await read('tokens.json')), palette=JSON.parse(await read(source.brandInput));
  const resolved=resolveTokens(source,palette); validateTokens(resolved);
  const css=await read('generated/tokens.css'), dart=await read('generated/ddirori_tokens.dart');
  assert(css.includes('font-size: 1.5rem; font-weight: 700; line-height: 1.3; letter-spacing: -0.02em'));
  assert(css.includes('--dd-layer-modal: 30;')); assert(!css.includes('--dd-layer-modal: 30px'));
  assert(css.includes('cubic-bezier(0.2, 0, 0, 1)')); assert(dart.includes("'tracking': -0.02"));
  assert.throws(()=>validateTokens({...resolved,easing:{standard:[2,0,0,1]}}),/Invalid easing/);
  assert.throws(()=>validateTokens({...resolved,textStyles:{body:{size:16,weight:425,lineHeight:1.5,tracking:0}}}),/Invalid text style/);
});
