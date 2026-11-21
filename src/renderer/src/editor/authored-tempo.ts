// UI authoring bounds only. Imported/native tempo values are not normalized here.
export function parseAuthoredTempoBpm(text: string): number | undefined {
  const value = Number(text)
  return text.trim() && Number.isInteger(value) && value >= 40 && value <= 240 ? value : undefined
}
