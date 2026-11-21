/** XML 1.0 production [2]. Keep discouraged-but-valid scalar values. */
export function isXml10Character(code: number): boolean {
  return code === 9 || code === 10 || code === 13 ||
    (code >= 0x20 && code <= 0xD7FF) ||
    (code >= 0xE000 && code <= 0xFFFD) ||
    (code >= 0x10000 && code <= 0x10FFFF)
}
