# 저작권 메타데이터와 공개 전 검수 체크리스트

## 목적

Compositions와 작품 페이지는 `공개 가능`을 추정하지 않는다. 후보는 권리 상태가
분리되어 기록되고, 불명확한 항목은 `published`로 넘어가지 않는다.

## Metadata Schema

후보 issue와 공개 catalog 검수 단계에서 다음 구조를 사용한다.

```json
{
  "rights": {
    "work": {
      "status": "traditional | public_domain | licensed | unknown",
      "composerDeathYear": null,
      "lyricistDeathYear": null,
      "isTraditional": true,
      "sourceUrl": "https://example.org/source",
      "sourceLicense": "public domain"
    },
    "edition": {
      "arrangementStatus": "original_in_c_transcription",
      "engravingSource": "in-c",
      "usesModernEdition": false,
      "usesTranslation": false
    },
    "audio": {
      "included": false,
      "status": "not_applicable"
    },
    "publication": {
      "status": "candidate | hold | approved | rejected | published",
      "reviewedBy": null,
      "reviewedAt": null,
      "reviewNote": ""
    }
  }
}
```

## 권리 분리 기준

| 영역 | 확인 항목 |
| --- | --- |
| 작곡 | 작곡가, 사망연도, public domain 여부 |
| 작사 | 가사 포함 여부, 작사가 권리 상태 |
| 전통 민요 | 특정 개인 저작물인지, 공동 전승인지 |
| 편곡 | 현대 편곡, 반주, 화성, 리듬 변형 복제 여부 |
| 채보/판면 | 특정 출판 악보의 layout이나 engraving 복제 여부 |
| 번역 가사 | 번역자와 출처 |
| 음원/영상 | 악보와 별도 권리 상태 |

## 공개 상태

| 상태 | 의미 |
| --- | --- |
| `candidate` | 후보 등록 |
| `hold` | 권리 확인 필요 |
| `approved` | 사보와 공개 준비 가능 |
| `rejected` | 공개 불가 |
| `published` | 공개 catalog 반영 |

권리 상태가 `unknown`이거나 `hold`인 항목은 공개 catalog에 들어갈 수 없다.

## 공개 전 체크리스트

- 원작 권리 상태가 기록되어 있다.
- 가사를 포함하지 않거나, 작사가 권리 상태가 확인되어 있다.
- 현대 편곡, 채보, 판면, 번역 가사를 복제하지 않았다.
- MusicXML은 in-C/Chromatics에서 새로 입력한 산출물이다.
- 출처 URL과 라이선스 메모가 남아 있다.
- reviewer와 reviewedAt을 기록할 수 있다.
- 불확실한 경우 `published`가 아니라 `hold`로 남긴다.

## Catalog 연결

`site/compositions-catalog.json`의 현재 `copyrightNote`는 공개 사용자에게 보여줄
요약이다. 내부 검수에는 위 `rights` 구조를 후보 issue 또는 향후 catalog
validator 입력으로 사용한다.
