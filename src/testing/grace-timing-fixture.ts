import { createGraceAppearanceFixture, type GraceAppearanceOptions } from './grace-appearance-fixture'

export type GraceTimingOptions = GraceAppearanceOptions & {
  previous?: string
  following?: string
  makeTime?: string
}

export function createGraceTimingFixture({ previous, following, makeTime, ...options }: GraceTimingOptions = {}) {
  const attributes = [['steal-time-previous', previous], ['steal-time-following', following], ['make-time', makeTime]]
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => {
      if (!/^\d+(?:\.\d+)?$/.test(value)) throw Error('Numeric grace timing fixture value required')
      return ` ${key}="${value}"`
    }).join('')
  return createGraceAppearanceFixture({ type: 'eighth', ...options }).replace(/<grace(?=[\s/>])/, '<grace' + attributes)
}

export function createRepeatedGraceTimingFixture(count = 30) {
  if (!Number.isInteger(count) || count < 2 || count > 100) throw Error('Bounded grace timing fixture count required')
  return createGraceTimingFixture({ following: '50' }).replace(/<part id="P1">[\s\S]*?<\/part>/, part => {
    const first = part.match(/<measure number="1">[\s\S]*?<\/measure>/)?.[0]
    if (!first) throw Error('Repeated grace timing measure missing')
    return '<part id="P1">' + Array.from({ length: count }, (_, index) => first.replace('number="1"', `number="${index + 1}"`)).join('') + '</part>'
  })
}
