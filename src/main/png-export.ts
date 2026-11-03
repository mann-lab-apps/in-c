import { basename } from 'node:path'
import { validatePngExport, type PngExportResult } from '../image-export/png'
import { savePngBatch, savePngFile } from './png-files'

interface PngDialogs {
  chooseFile: (suggestedName: string) => Promise<string | null>
  chooseFolder: () => Promise<string | null>
}

// Capture and validate before an asynchronous native dialog can outlive the UI.
export async function savePngExport(value: unknown, dialogs: PngDialogs): Promise<PngExportResult | null> {
  const input = validatePngExport(value)
  if (input.pages.length === 1) {
    const page = input.pages[0]
    const filePath = await dialogs.chooseFile(`${input.suggestedName}-p${String(page.pageNumber).padStart(4, '0')}.png`)
    if (!filePath) return null
    await savePngFile(filePath, page.bytes)
    return { filePath, fileName: basename(filePath), pageCount: 1, kind: 'file' }
  }
  const parent = await dialogs.chooseFolder()
  if (!parent) return null
  const filePath = await savePngBatch(parent, input.suggestedName, input.pages)
  return { filePath, fileName: basename(filePath), pageCount: input.pages.length, kind: 'folder' }
}
