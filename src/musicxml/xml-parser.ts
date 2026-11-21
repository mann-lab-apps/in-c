import { XMLParser, type X2jOptions } from 'fast-xml-parser'

const xmlEntities = Object.freeze({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })
type XmlOptions = Omit<X2jOptions, 'htmlEntities' | 'entityDecoder'>
type XmlEntityOptions = XmlOptions & { htmlEntities: typeof xmlEntities }

// The installed fast-xml-parser 5.9 runtime accepts an entity-name table here;
// its declaration still allows only boolean. Keep this compatibility boundary
// private and narrow. A table enables numeric XML references without enabling
// HTML names or replacing the library's entity limits and registration hooks.
const XmlEntityParser = XMLParser as unknown as new (options: XmlEntityOptions) => XMLParser

export function createMusicXmlParser(options: XmlOptions): XMLParser {
  return new XmlEntityParser({ ...options, htmlEntities: { ...xmlEntities } })
}
