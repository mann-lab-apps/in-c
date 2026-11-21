import { createPartGroupFixture } from './part-group-fixture'
export const keyImportKinds = ['major', 'minor', 'dorian', 'none', 'nontraditional'] as const
export type KeyImportKind = typeof keyImportKinds[number]
export function createKeyImportFixture(kind: KeyImportKind) {
  const key = kind === 'nontraditional'
    ? '<key-step>F</key-step><key-alter>1</key-alter>'
    : `<fifths>0</fifths><mode>${kind}</mode>`
  return createPartGroupFixture('grand').replace('</divisions>', `</divisions><key>${key}</key>`)
}
