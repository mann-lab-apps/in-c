// Display branding is independent of package IDs, file formats and storage keys.
export const studioDisplayName = '띠로리 Studio'
export const legacyUserDataName = 'in-C'

export function studioWindowTitle(title: string, dirty: boolean, startScreen = false): string {
  return startScreen ? studioDisplayName : `${title || '제목 없는 악보'}${dirty ? ' *' : ''} — ${studioDisplayName}`
}
