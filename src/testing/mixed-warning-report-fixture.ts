import { createLyricFontFixture, createRepeatedLyricFontFixture } from './lyric-font-fixture'

export function createMixedWarningReportFixture(large=true): string {
  const source=large?createRepeatedLyricFontFixture():createLyricFontFixture('italic')
  const marker='</attributes>'
  if(!source.includes(marker))throw Error('Synthetic first measure attributes missing')
  return source.replace(marker,marker+'<direction><direction-type><other-direction>원문 안내 유지</other-direction></direction-type></direction>')
}
