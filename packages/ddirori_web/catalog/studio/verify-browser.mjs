import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const { chromium } = await import(process.env.DDIRORI_PLAYWRIGHT_PATH || 'playwright');
const out = process.env.DDIRORI_STUDIO_EVIDENCE || '/private/tmp/ddirori-studio-evidence';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DDIRORI_BROWSER_PATH ? { executablePath: process.env.DDIRORI_BROWSER_PATH } : {}) });
const report = { generatedAt: new Date().toISOString(), scope: 'Standalone Ddirori studio catalog; no product/audio/file validation', checks: [], captures: [], errors: [] };
const source = path.dirname(fileURLToPath(import.meta.url));
report.sourceHashes = Object.fromEntries(await Promise.all((await readdir(source)).filter(f => /\.(tsx?|css|mjs)$/.test(f)).sort().map(async f => [f, createHash('sha256').update(await readFile(path.join(source, f))).digest('hex')])));
function check(name, passed) { assert(passed, name); report.checks.push(name); }
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) report.errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(process.env.DDIRORI_STUDIO_URL || 'http://127.0.0.1:8062/studio.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('.studio-notation svg path', { state: 'attached' });
  for (const theme of ['light', 'dark']) for (const density of ['compact', 'comfortable']) for (const width of [390, 840, 1440]) for (const scale of [1, 2]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByLabel('테마', { exact: true }).selectOption(theme);
    await page.getByLabel('밀도', { exact: true }).selectOption(density);
    await page.evaluate(scale => document.documentElement.style.fontSize = `${16 * scale}px`, scale);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    check(`${theme}/${density}/${width}/${scale} page bounds`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    check(`${theme}/${density}/${width}/${scale} title unbroken`, await page.locator('.studio-heading h1').evaluate(n => n.getBoundingClientRect().height <= parseFloat(getComputedStyle(n).lineHeight) + 2));
    const overflowing = await page.locator('.studio button, .studio label, .studio-note-state').evaluateAll(nodes => nodes.filter(n => n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 2).map(n => n.textContent));
    check(`${theme}/${density}/${width}/${scale} control text bounds: ${overflowing}`, !overflowing.length);
    check('notation has four VexFlow notes', await page.locator('.studio-notation .vf-stavenote').count() === 4);
    if (density === 'compact' && ((width === 1440 && scale === 1) || (width === 390 && scale === 2))) {
      const file = `${theme}-${width}-${scale}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: true }); report.captures.push(file);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => document.documentElement.style.fontSize = '16px');
  await page.getByLabel('선택 fixture').selectOption('multiple');
  check('Mixed voice exposed', await page.getByLabel('선택 성부').inputValue() === 'mixed');
  await page.getByLabel('선택 성부').selectOption('1');
  await page.getByRole('button', { name: '실행 취소', exact: true }).click();
  check('Undo restores mixed value', await page.getByLabel('선택 성부').inputValue() === 'mixed');
  await page.getByRole('button', { name: '다시 실행', exact: true }).click();
  check('Redo restores unified value', await page.getByLabel('선택 성부').inputValue() === '1');
  for (const selection of ['none', 'note', 'multiple', 'measure', 'lyrics', 'harmony', 'dynamic', 'span']) {
    await page.getByLabel('선택 fixture').selectOption(selection);
    check(`Inspector ${selection} displayed`, await page.locator('.studio-fields h3').first().isVisible());
  }
  await page.getByRole('button', { name: '팔레트 숨기기' }).click();
  check('Dock focus restoration', await page.getByRole('button', { name: '팔레트', exact: true }).evaluate(n => n === document.activeElement));
  await page.getByRole('button', { name: '팔레트', exact: true }).click();
  const resize = page.getByRole('slider', { name: '팔레트 폭', exact: true });
  await resize.focus(); await page.keyboard.press('End');
  check('Dock keyboard maximum', await resize.inputValue() === '360');
  await page.keyboard.press('Home'); check('Dock keyboard minimum', await resize.inputValue() === '200');
  await page.getByRole('button', { name: '음표 입력', exact: true }).click();
  await page.getByRole('checkbox', { name: '쉼표', exact: true }).check();
  check('Rest disables accidental', await page.getByLabel('임시표', { exact: true }).isDisabled());
  await page.getByRole('button', { name: '재생 위치 표시', exact: true }).click();
  check('Playhead state visible', await page.locator('.studio-note-state.playhead').count() === 1);
  check('Span endpoint overlay uses two handles', await page.locator('.studio-notation [data-state="endpoint"]').count() === 2);
  check('Input and playback overlays coexist', await page.locator('.studio-notation [data-state="input"]').count() === 1 && await page.locator('.studio-notation [data-state="playhead"]').count() === 1);
  check('Music font is loaded', await page.evaluate(() => document.fonts.check('30px Bravura')));
  await page.screenshot({ path: path.join(out, 'editing-states.png'), fullPage: true }); report.captures.push('editing-states.png');
  for (const title of ['새 악보', '페이지 설정', '명령 검색', '백업 복구', 'MusicXML 내보내기']) {
    await page.getByRole('button', { name: title, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: title, exact: true });
    check(`${title} opens`, await dialog.isVisible());
    if (title === '명령 검색') {
      await dialog.getByRole('searchbox').fill('없는 명령'); check('Empty command result', await dialog.getByText('검색 결과 없음').isVisible());
    }
    if (title === '백업 복구' || title === 'MusicXML 내보내기') {
      check(`${title} requires acknowledgement`, await dialog.getByRole('button', { name: '샘플 실행' }).isDisabled());
      await dialog.getByRole('checkbox').first().check(); await dialog.getByRole('button', { name: '샘플 실행' }).click();
      check(`${title} failure has no success`, await dialog.getByRole('alert').isVisible() && await dialog.getByText(/샘플 결과 확인/).count() === 0);
      await dialog.getByRole('checkbox', { name: '실패 응답 fixture' }).uncheck(); await dialog.getByRole('button', { name: '샘플 실행' }).click();
      check(`${title} retry`, await dialog.getByText(/실제 파일 변경 없음/).isVisible());
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.documentElement.style.fontSize = '32px');
    check(`${title} mobile enlarged bounds`, await dialog.evaluate(n => { const r = n.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && n.scrollWidth <= n.clientWidth + 2; }));
    const capture = `flow-${report.captures.length}.png`;
    await page.screenshot({ path: path.join(out, capture), fullPage: true }); report.captures.push(capture);
    await page.keyboard.press('Escape'); check(`${title} Escape closes`, !await dialog.isVisible());
    check(`${title} focus returns`, await page.getByRole('button', { name: title, exact: true }).evaluate(n => n === document.activeElement));
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.evaluate(() => document.documentElement.style.fontSize = '16px');
  }
  await page.getByRole('button', { name: '믹서', exact: true }).click();
  await page.getByRole('button', { name: '바이올린 1 솔로' }).click();
  check('Mixer solo gates seven peers', await page.getByText('음소거', { exact: true }).count() === 7);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '믹서', exact: true }).focus();
  check('Visible keyboard focus', await page.getByRole('button', { name: '믹서', exact: true }).evaluate(n => parseFloat(getComputedStyle(n).outlineWidth) >= 3));
  check('No runtime or asset errors', !report.errors.length);
  report.status = 'passed'; report.browser = browser.version();
} catch (e) { report.status = 'failed'; report.failure = String(e); throw e; }
finally { await browser.close(); await writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(`${report.checks.length} browser checks passed; ${report.captures.length} captures in ${out}`);
