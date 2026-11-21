import { createWarningPartOwnershipFixture } from './warning-part-ownership-fixture'

// Controlled one-measure fixture construction only; this is not an importer or
// a general score-timewise → score-partwise conversion implementation.
export function createTimewiseFormatFixture() {
  const title = 'Timewise format boundary'
  const partwise = createWarningPartOwnershipFixture('control').xml
    .replace('Warning part ownership control', title)
  const start = partwise.indexOf('<part id=')
  const header = partwise.slice(0, start).replace('<score-partwise ', '<score-timewise ')
  const parts = [...partwise.matchAll(/<part id="([^"]+)"><measure number="1">([\s\S]*?)<\/measure><\/part>/g)]
    .map(([, id, contents]) => `<part id="${id}">${contents}</part>`).join('')
  return {
    title, partwise,
    timewise: `${header}<measure number="1">${parts}</measure></score-timewise>`
  }
}
