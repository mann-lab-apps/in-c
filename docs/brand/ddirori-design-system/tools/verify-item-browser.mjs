import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const {chromium} = await import(process.env.DDIRORI_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.DDIRORI_CATALOG_URL || 'http://127.0.0.1:8093/';
const out = process.env.DDIRORI_ITEM_EVIDENCE || 'out/ddirori-common-items';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true,
  ...(process.env.DDIRORI_BROWSER_PATH ? {executablePath:process.env.DDIRORI_BROWSER_PATH} : {})});
const report = {scope:'Common component fixtures, not product or device QA', checks:[], errors:[], captures:[]};
function check(name, condition) { assert(condition, name); report.checks.push(name); }
try {
  const page = await browser.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  for (const width of [320, 840, 1440]) for (const theme of ['light', 'dark'])
    for (const density of ['compact', 'comfortable']) for (const scale of [1, 2]) {
      const name = `${width}-${theme}-${density}-${scale}`;
      await page.setViewportSize({width, height:1000});
      await page.goto(new URL(`catalog/item-states.html?theme=${theme}&density=${density}`, base).href);
      await page.evaluate(scale => {document.documentElement.style.fontSize = `${scale * 16}px`;}, scale);
      await page.evaluate(() => document.fonts.ready);
      check(`${name}: no page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      check(`${name}: row content fits and actions do not overlap`, await page.locator('.dd-item--with-trailing').evaluateAll(items => items.every(item => {
        const content = item.querySelector('.dd-item-content').getBoundingClientRect();
        const action = item.querySelector('.dd-item-trailing').getBoundingClientRect();
        return item.scrollWidth <= item.clientWidth &&
          (content.right <= action.left || content.bottom <= action.top || action.right <= content.left);
      })));
      const score = page.getByRole('list', {name:'악보'});
      const row = score.locator('article');
      const before = await row.boundingBox();
      await score.getByRole('checkbox').check();
      const after = await row.boundingBox();
      check(`${name}: selection does not resize row`, before.height === after.height && before.width === after.width);
      check(`${name}: flat border and corners`, await row.evaluate(n => getComputedStyle(n).borderTopWidth === '0px' && getComputedStyle(n).borderRadius === '0px'));
      await score.getByRole('checkbox').focus();
      await page.keyboard.press('Tab');
      check(`${name}: title follows checkbox in keyboard order`, await score.locator('.dd-item-title').evaluate(n => n === document.activeElement));
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      check(`${name}: trailing action independent of open`, await page.locator('output').textContent() === '악보 정보');
      const blocked = page.locator('[aria-disabled="true"] .dd-item-trailing button');
      check(`${name}: disabled flat row is visually distinct`, await page.locator('article[aria-disabled="true"]').evaluate(n => getComputedStyle(n).opacity === '0.56'));
      await blocked.evaluate(n => n.focus());
      check(`${name}: disabled trailing cannot receive focus`, await blocked.evaluate(n => n !== document.activeElement));
      await blocked.scrollIntoViewIfNeeded();
      const box = await blocked.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      check(`${name}: disabled trailing cannot execute`, await page.locator('output').textContent() === '악보 정보');
      if ((width === 320 && scale === 2 || width === 1440 && scale === 1) && density === 'comfortable') {
        await page.screenshot({path:path.join(out, `${name}.png`), fullPage:true});
        report.captures.push(`${name}.png`);
      }
    }
  const touch = await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await touch.goto(new URL('catalog/item-states.html?density=compact', base).href);
  const target = await touch.getByRole('button', {name:'악보 정보',exact:true}).boundingBox();
  check('touch trailing control at least 48px', target.width >= 48 && target.height >= 48);
  check('no runtime errors', report.errors.length === 0);
  report.status = 'passed';
  report.browser = browser.version();
} catch (error) {
  report.status = 'failed'; report.failure = String(error); throw error;
} finally {
  await browser.close();
  await writeFile(path.join(out, 'report.json'), JSON.stringify(report,null,2)+'\n');
}
console.log(`${report.checks.length} checks passed; ${report.captures.length} screenshots`);
