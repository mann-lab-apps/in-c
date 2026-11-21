import { makeMeasureRestXml } from './measure-rest-fixture'
export function makeMeasureRestDurationXml(units: number, explicitType = false) {
  return makeMeasureRestXml(4, 4, explicitType).replace(
    '<rest measure="yes"/><duration>16</duration><voice>2</voice>',
    `<rest measure="yes"/><duration>${units}</duration><voice>2</voice>`
  )
}
