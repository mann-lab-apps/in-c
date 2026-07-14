# Compositions Collection Pipeline

Compositions는 공개 가능한 단선율 악보를 꾸준히 축적하는 라이브러리다. 후보
수집은 자동화할 수 있지만, 저작권 판단과 공개 결정은 사람이 확인한다.

Compositions의 역할은 파일 저장소가 아니라 작품 페이지의 핵심 자료이자 검색
유입 자산이다. 사용자는 웹 미리보기로 작품을 확인하고, Chromatics에서 악보 원본을
열어 직접 수정하거나 필요한 경우 PDF로 변환한다. 웹에서 생성한 저품질 PDF를 기본
공유 산출물로 앞세우지 않는다.

권장 흐름:

`웹에서 보기 -> Chromatics에서 열기 -> 필요하면 Chromatics에서 PDF 변환`

fallback 흐름:

`웹에서 보기 -> MusicXML 다운로드 -> Chromatics 또는 다른 도구에서 열기`

## Source Policy

후보 출처는 다음 유형에서 시작한다.

- Traditional melody references: 민요, 전래동요, 민속 선율처럼 작곡자와 현대 편곡자가 분리되어 확인 가능한 자료.
- Public domain score archives: IMSLP, CPDL, Mutopia처럼 public domain 또는 명시 라이선스가 표시된 악보 아카이브.
- Library and museum collections: 국립도서관, 대학 도서관, 박물관, 공공 디지털 컬렉션의 원자료.
- in-C editorial backlog: 사용자가 직접 제안한 곡이나 내부에서 이미 검토한 후보.

출처가 public domain이라고 표시되어 있어도 현대 편곡, 채보, 번역, 해설, 편집판은
별도 저작물일 수 있다. Compositions에는 원선율을 새로 사보한 결과만 올린다.

초기에는 다음 후보를 우선한다.

- 한국 민요와 세계 민요.
- 퍼블릭 도메인 선율.
- 작곡가와 작사가 모두 저작권이 명확하게 만료된 작품.
- 단선율로도 충분한 가치가 있는 곡.
- 사람들이 이미 익숙하게 알고 있는 멜로디.

## Candidate Metadata

후보는 GitHub issue 본문에서 다음 필드를 사용한다. 공개 카탈로그인 `site/compositions-catalog.json`에는 검토와 산출물 생성이 끝난 항목만 들어간다.

```json
{
  "title": "Greensleeves",
  "alternativeTitles": ["What Child Is This"],
  "regionOrCulture": "England",
  "sourceUrl": "https://example.org/source",
  "sourceType": "traditional | public-domain-archive | library | user-submission",
  "copyrightNote": "Traditional melody; in-C transcription from public-domain source.",
  "difficulty": "easy | medium | hard",
  "keyCandidate": "G minor",
  "meterCandidate": "6/8",
  "registrationStatus": "candidate | reviewed | transcribing | ready | published | rejected",
  "relatedIssues": []
}
```

장기적으로 작품 페이지는 다음 정보를 연결해야 한다.

- 작품명과 원어명
- 작곡가, 작사가, 편곡자
- 시대, 장르, 형식, 조성, 편성
- 감상 포인트
- 관련 Columns
- 관련 공연
- 관련 Creator
- Chromatics 원본 또는 MusicXML, 웹 미리보기
- PDF 변환은 Chromatics에서 수행한다는 안내
- 추천 음원 또는 영상 [계획]
- 저작권 상태와 출처

## Queue Decision

후보 큐의 source of truth는 GitHub issue다.

- `Compositions 후보:` 제목으로 후보를 하나씩 등록한다.
- 후보 issue에는 metadata, 출처 링크, 저작권 체크리스트, 작업 로그를 남긴다.
- `site/compositions-catalog.json`은 공개된 항목만 관리한다.
- 별도 draft JSON은 사용하지 않는다. 검토 전 후보가 실수로 사이트에 노출되는 위험을 줄이기 위해서다.

## Workflow

1. 후보 수집: 자동화 또는 수동 조사로 후보 제목과 출처를 모은다.
2. 중복 확인: open/closed issue와 `site/compositions-catalog.json`에서 같은 곡이 있는지 확인한다.
3. metadata 정규화: 제목, 대체 제목, 문화권, 출처, 난이도, 조성/박자 후보를 채운다.
4. 저작권 사전 점검: 원선율과 사용할 출처가 공개 가능한지 확인한다.
5. 후보 issue 생성: 검토 전에는 공개 카탈로그에 넣지 않는다.
6. 사람 검토: 출처와 편곡 리스크를 확인하고 사보 진행 여부를 결정한다.
7. MusicXML 작성: Chromatics가 열 수 있는 단성부 MusicXML을 만든다.
8. Chromatics 확인: MusicXML을 Chromatics에서 열어 표기 품질과 PDF 변환 가능성을 확인한다.
9. 카탈로그 반영: `site/compositions-catalog.json`에 published 항목을 추가한다.
10. 검증: site build, `npm run verify:site-content`, MusicXML parse, Chromatics 열기
    fallback, `git diff --check`를 확인한다.

## Automation Boundary

자동화 가능한 작업:

- 후보 제목과 출처 URL을 구조화된 issue 본문 초안으로 변환.
- open/closed issue와 catalog 기준 중복 후보 감지.
- metadata 필수 필드 누락 검사.
- MusicXML parse와 catalog schema 검증.
- Chromatics 열기 링크와 fallback 검증.
- PR 본문에 출처와 체크섬을 포함하는 release note 초안 생성.

사람이 확인해야 하는 작업:

- 저작권과 라이선스 판단.
- 현대 편곡이나 채보를 그대로 복제하지 않았는지 확인.
- 조성, 박자, 난이도, 악보 표기 품질 결정.
- 최종 공개 승인.

## Copyright Checklist

세부 metadata schema와 공개 상태 기준은
`docs/product/compositions/copyright-metadata.md`를 따른다. 공개 catalog의
`copyrightNote`는 사용자에게 보여줄 요약이며, 후보 검수에는 권리 영역을 분리한
`rights` 구조를 사용한다.

후보 issue를 ready 상태로 바꾸기 전에 다음 항목을 확인한다.

- 원선율이 traditional이거나 작곡자 사망 후 충분한 시간이 지났는가.
- 작사가가 있는 경우 작사가의 권리도 확인했는가.
- 참고한 출처 URL이 남아 있고, public domain 또는 허용 라이선스가 표시되는가.
- 현대 편곡, 현대 채보, 번역 가사, 해설 텍스트, 출판 악보의 판면을 복제하지
  않았는가.
- 연주 음원이나 영상은 악보 저작권과 별도로 권리 상태를 확인했는가.
- in-C/Chromatics에서 새로 입력한 MusicXML 또는 악보 원본임을 설명할 수 있는가.
- 국가별 저작권 기간 차이 때문에 불확실한 경우 published로 넘기지 않았는가.

권리 상태가 불명확한 자료는 공개하지 않는다. 한국가곡과 동요는 작곡가뿐 아니라
작사가 권리와 편곡, 채보, 판면 권리가 별도로 얽힐 수 있으므로 특히 보수적으로
다룬다.

## Future Script Split

후속 자동화 구현은 다음 단위로 쪼갠다.

- 후보 issue 생성기: metadata JSON 또는 CSV를 받아 `Compositions 후보:` issue 초안을 만든다.
- 중복 검사기: title, alternative title, source URL 기준으로 issue와 catalog를 비교한다.
- catalog validator: 공개 항목의 MusicXML/Chromatics 열기 링크와 필수 metadata를 검증한다.
- artifact verifier: MusicXML parse, Chromatics 열기 fallback, 체크섬 생성을 한 번에 실행한다.

현재 경량 catalog validator는 `npm run verify:site-content`로 실행한다. 이 명령은
공개 Compositions 항목의 MusicXML/Chromatics 링크, PDF 비노출 정책, related Columns,
workId 관계를 확인한다.
