# in C KOPIS Production Field Mapping

목표: KOPIS production import를 붙이기 전에 fixture/local import와 같은 shape를 유지하고,
API key 없이 원격 호출이 실패하거나 앱 상태를 손상시키지 않게 한다.

## V1 Import States

- `remote disabled`: production KOPIS import가 꺼져 있다.
- `missing API key`: API key/config가 없다. 네트워크 호출을 시도하지 않는다.
- `network failure`: key는 있지만 원격 응답을 받지 못했다. local catalog는 유지한다.
- `malformed row`: row shape가 예상 필드와 다르다. import summary에만 기록한다.
- `field mapping gap`: production field 의미가 fixture mapping과 달라 수동 확인이 필요하다.

## Fixture To Domain Mapping

| KOPIS-like field | Domain field | V1 policy |
| --- | --- | --- |
| `mt20id` | `ClassicalConcert.id` | `kopis-` prefix를 붙여 source id와 충돌을 피한다. |
| `prfnm` | `title` | 비어 있으면 malformed row로 분류한다. |
| `fcltynm` | `venue` | 공연장명으로 사용한다. |
| `area` | `region` | 서울특별시 등 광역명을 앱 region label로 정규화한다. |
| `prfpdfrom` | `startsAt` | parse 실패 시 malformed row로 분류한다. |
| `prfcast` | `performers` | comma/semicolon 기준으로 나눈다. |
| `pcseguidance` | `programRawText` | 원문을 보존한다. |

## Program Matching

- 작품 match는 작품명, alias, 작곡가명, catalog number를 함께 본다.
- high/medium confidence는 후보로 표시할 수 있다.
- low confidence는 자동 확정하지 않는다.
- composer only match는 low confidence이며 `matchWorkIds`의 자동 확정 결과에는 포함하지 않는다.
- confirm 시 `programWorkIds`, `composerIds`, `instrumentTags`, work의 `concertIds` 계열 evidence를 갱신한다.
- reject 시 catalog data는 바꾸지 않고 review evidence만 남긴다.

## Production Safety

- KOPIS API key가 없으면 production network call을 하지 않는다.
- malformed row는 앱을 crash시키지 않고 import summary에 표시한다.
- local-first user state는 import 실패와 독립적으로 유지한다.
- production field가 fixture와 다르면 Public V1 Closeout에서는 production verification GAP으로 남긴다.
- Catalog Ops KOPIS Production 섹션은 fixture/local import와 production remote readiness를 분리해서 보여준다.
