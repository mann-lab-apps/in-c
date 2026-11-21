import { createNoteVisibilityFixture, createRepeatedNoteVisibilityFixture } from './note-visibility-fixture'

type Options = {
  owner?: 'main' | 'chord' | 'grace' | 'rest'
  value?: 'quarter' | 'whole'
  printLeger?: 'yes' | 'no' | 'omitted'
  printObject?: 'yes' | 'no' | 'omitted'
  partCount?: number
  targetPart?: number
  targetMeasure?: number
}

// Synthetic notation-loss input; reuse existing owners and timing fixtures.
export function createNoteLedgerVisibilityFixture({ printLeger = 'no', printObject = 'yes', ...options }: Options = {}) {
  let xml = createNoteVisibilityFixture({
    ...options,
    printObject: printObject === 'omitted' ? 'yes' : printObject,
    printLeger: printLeger === 'omitted' ? undefined : printLeger
  })
  if (printObject === 'omitted') xml = xml.replace(' print-object="yes"', '')
  return xml.replaceAll('<octave>4</octave>', '<octave>6</octave>')
    .replace('음표 숨김 손실 검증', '덧줄 숨김 손실 검증')
}

export function createRepeatedNoteLedgerVisibilityFixture(count = 30) {
  return createRepeatedNoteVisibilityFixture(count)
    .replaceAll(' print-object="no"', ' print-object="yes" print-leger="no"')
    .replaceAll('<octave>4</octave>', '<octave>6</octave>')
    .replace('음표 숨김 손실 검증', '덧줄 숨김 손실 검증')
}
