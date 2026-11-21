import { createNotationContainerFixture } from './notation-container-fixture'

export function createBarlineFermataFixture(
  content = '<fermata/>',
  location: 'left' | 'right' = 'right',
  withNoteFermata = false
): string {
  const xml = createNotationContainerFixture([withNoteFermata ? '<fermata/>' : ''])
  const barline = `<barline location="${location}">${content}</barline>`
  return location === 'left' ? xml.replace('<attributes>', barline + '<attributes>')
    : xml.replace('</measure>', barline + '</measure>')
}
