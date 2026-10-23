# Data Policy

실제 음원, 악보, MIDI, feature 파일은 git에 커밋하지 않는다.

## Directories

- `raw`: 원본 다운로드 파일. IMSLP 파일, 악보 PDF, 원본 MIDI 등을 둔다.
- `interim`: 변환 중간 파일. OMR output, temporary MIDI, alignment draft 등을 둔다.
- `processed`: 학습 가능한 feature tensor, parquet, npz 등을 둔다.

## Metadata Sidecars

각 실제 파일에는 같은 stem의 sidecar JSON을 둔다.

```json
{
  "sourceUrl": "https://imslp.org/wiki/...",
  "imslpFileId": "#000000",
  "license": "Creative Commons Attribution 4.0",
  "attribution": "Performer / publisher attribution text",
  "downloadedAt": "YYYY-MM-DD",
  "territoryRiskKo": "needs-legal-review",
  "notes": ""
}
```

## License Rules

- `CC0` and `Public Domain (dedicated)`: keep source and file ID metadata anyway.
- `CC BY`: attribution must be preserved in every derived dataset manifest.
- `CC BY-SA`: share-alike implications need separate review before publishing derived outputs.
- `CC NC`, `CC ND`, `Performance Restricted`, unclear source, and Non-PD territory entries are excluded from training data.

This repository only keeps directory placeholders and metadata skeletons.
