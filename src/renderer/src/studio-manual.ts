import manifest from '../../../docs/product/studio-manual/manifest.json'
import { studioShortcutMarkdown } from './studio-shortcuts'

// Local, build-time documents only. No network, filesystem bridge or raw HTML.
const documents = import.meta.glob('../../../docs/product/studio-manual/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
export const manualChapters = manifest.chapters.map(chapter => ({ ...chapter,
  content: (documents[`../../../docs/product/studio-manual/${chapter.file}`] ?? '').replace(/\r\n/g, '\n')
}))
export const manualVersion = manifest.productVersion
export const shortcutMarkdown = studioShortcutMarkdown()
export type ManualSection = { chapterId: string; file: string; chapterTitle: string; title: string; anchor: string; content: string }
export function manualSections(): ManualSection[] {
  return manualChapters.flatMap(chapter => {
    const content = chapter.id === 'shortcuts' ? shortcutMarkdown : chapter.content
    const parts = content.split(/(?=^<a id="[a-z0-9-]+"><\/a>\s*\n## )/m)
    return parts.map(part => ({ chapterId: chapter.id, file: chapter.file, chapterTitle: chapter.title,
      title: part.match(/^##? (.+)$/m)?.[1] ?? chapter.title,
      anchor: part.match(/^<a id="([a-z0-9-]+)"><\/a>/m)?.[1] ?? '', content: part }))
  })
}
export function searchManual(query: string): ManualSection[] {
  const words = query.normalize('NFC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return words.length ? manualSections().filter(section => !['checklist', 'index'].includes(section.chapterId) && words.every(word =>
    `${section.chapterTitle} ${section.title} ${section.content}`.normalize('NFC').toLocaleLowerCase().includes(word))) : []
}
export function resolveManualLink(href: string, current: string): { chapterId: string; anchor: string } | undefined {
  const [file, anchor = ''] = href.split('#')
  const chapter = file ? manualChapters.find(item => item.file === file) : manualChapters.find(item => item.id === current)
  return chapter ? { chapterId: chapter.id, anchor } : undefined
}
