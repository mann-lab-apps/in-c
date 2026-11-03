# MusicXML 4.0 reference schemas

Unmodified W3C MusicXML v4.0 schema bytes, with provenance and SHA256 in SOURCE.json. Original copyright and license notices are retained in each downloaded file. MusicXML is published under the [W3C Community Final Specification Agreement](https://www.w3.org/community/about/agreements/final/); the XML and XLink schemas retain their own W3C notices. These are test references, not the Studio native-project schema.

The local catalog resolves the three schema imports without network access. Tests always verify the pinned bytes. The complete XSD check uses `xmllint --nonet` when available and explicitly skips that external-binary check otherwise; portable element-order and semantic tests still execute. Local full XSD results and any skips must be reported separately. Schema validity does not establish external-app rendering, audio or complete musical interoperability.
