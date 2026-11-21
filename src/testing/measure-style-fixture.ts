import { createMeasureRepeatFixture, measureRepeatCases } from './measure-repeat-fixture'

// Same explicit music and source bytes as the production style-loss audit.
export const measureStyleCases = [
  { id: 'beat-repeat', kind: 'beat-repeat',
    start: '<beat-repeat type="start" slashes="2" use-dots="yes"><slash-type>eighth</slash-type><slash-dot/></beat-repeat>',
    stop: '<beat-repeat type="stop"/>' },
  { id: 'slash-rhythm', kind: 'slash',
    start: '<slash type="start" use-stems="yes"><slash-type>quarter</slash-type></slash>',
    stop: '<slash type="stop"/>' },
  { id: 'slash-beat', kind: 'slash',
    start: '<slash type="start" use-stems="no" use-dots="yes"/>',
    stop: '<slash type="stop"/>' }
] as const

export function createMeasureStyleFixture(spec: typeof measureStyleCases[number] = measureStyleCases[0], include = true): string {
  const xml = createMeasureRepeatFixture(measureRepeatCases[0])
    .replaceAll('<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>',
      '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'.repeat(4))
    .replace('<measure-repeat type="start" slashes="1">1</measure-repeat>', spec.start)
    .replace('<measure-repeat type="stop"/>', spec.stop)
  return include ? xml : xml.replace(/<measure-style>.*?<\/measure-style>/g, '')
}
