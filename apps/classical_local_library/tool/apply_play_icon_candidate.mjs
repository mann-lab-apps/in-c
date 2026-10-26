// Generates Play-only preview launcher assets from the current brand candidate.
// The source remains in the design system; this does not approve a release icon.
import {createRequire} from 'node:module';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(app, '../..');
const toolsRoot = process.env.DDIRORI_BRAND_TOOLS || '/tmp/ddirori-brand-tools';
const require = createRequire(path.join(toolsRoot, 'package.json'));
const {Resvg} = require('@resvg/resvg-js');
const source = path.join(
  repo,
  'docs/brand/ddirori-brand-system/icon-family-v8/generated',
);
const blue = await readFile(path.join(source, 'blue/play.svg'), 'utf8');
const transparent = await readFile(
  path.join(source, 'transparent/play.svg'),
  'utf8',
);

async function render(svg, size, target, rgb = false) {
  await mkdir(path.dirname(target), {recursive: true});
  await writeFile(
    target,
    new Resvg(svg, {fitTo: {mode: 'width', value: size}}).render().asPng(),
  );
  if (rgb) {
    const result = spawnSync(
      path.join(toolsRoot, 'venv/bin/python'),
      ['-c', 'from PIL import Image; import sys; p=sys.argv[1]; im=Image.open(p); assert im.getchannel("A").getextrema()==(255,255); im.convert("RGB").save(p)', target],
      {encoding: 'utf8'},
    );
    if (result.status !== 0) throw Error(result.stderr);
  }
}

const icons = path.join(app, 'ios/Runner/Assets.xcassets/AppIcon.appiconset');
const contents = JSON.parse(await readFile(path.join(icons, 'Contents.json')));
for (const item of contents.images) {
  if (!item.filename) continue;
  const size = Math.round(Number.parseFloat(item.size) * Number.parseFloat(item.scale));
  await render(blue, size, path.join(icons, item.filename), true);
}
await render(blue, 1024, path.join(app, 'assets/branding/app_icon_provisional.png'), true);

const res = path.join(app, 'android/app/src/main/res');
for (const [density, size] of Object.entries({
  mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192,
})) {
  await render(blue, size, path.join(res, `mipmap-${density}/ic_launcher.png`));
}
const inner = transparent.slice(transparent.indexOf('>') + 1, transparent.lastIndexOf('</svg>'));
const adaptive = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g transform="translate(64 64) scale(1.5)">${inner}</g></svg>`;
await render(
  adaptive,
  512,
  path.join(res, 'drawable-nodpi/ddirori_launcher_foreground_candidate.png'),
);
console.log('Applied icon-family-v8 Play candidate to Play preview launchers only.');
