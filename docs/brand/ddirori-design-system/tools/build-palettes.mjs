// One neutral foundation across all accents. No hue-dependent text or page tint.
import {readFile, writeFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const source = JSON.parse(await readFile(new URL('color-system.json', root)));
const variants = source.accents.map(a => ({
  key: a.key, name: a.name,
  brand: {primary: a.brand, onPrimary: a.onBrand},
  light: {...source.neutral.light, primary: a.action, primaryHover: a.hover,
    primaryPressed: a.pressed, onPrimary: '#FFFFFF', tint: a.selection,
    sky: '#A8D4E5', peach: '#F3BB9B', success: '#246145', warning: '#805500', error: '#AF344B'},
  darkProposal: {...source.neutral.dark, primary: a.darkAction, primaryHover: a.darkHover,
    primaryPressed: a.darkPressed, onPrimary: '#202020', tint: a.selectionDark,
    sky: '#A8D4E5', peach: '#F3BB9B'},
  scorePaper: {background: '#FFFFFF', notation: '#202020'},
}));
const active = variants.find(p => p.key === source.active);
if (!active) throw Error('Unknown active accent: ' + source.active);
const outputs = {
  'palette-candidates.json': {status: source.status, recommended: null, variants},
  'palette-pilot.json': {...active, status: source.status, source: 'color-system.json', date: '2026-10-23'},
};
for (const [name, value] of Object.entries(outputs)) {
  const body = JSON.stringify(value, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (await readFile(new URL(name, root), 'utf8') !== body) throw Error('Stale ' + name);
  } else await writeFile(new URL(name, root), body);
}
console.log('Six accent palettes share the same neutral foundation.');
