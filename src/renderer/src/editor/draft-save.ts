export const draftSaveGuidance = 'Enter로 값을 확정하거나 Escape로 취소한 뒤 저장하세요.'

export function isDocumentSaveShortcut(event: {
  ctrlKey: boolean; metaKey: boolean; altKey: boolean; code: string
}): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && event.code === 'KeyS'
}
