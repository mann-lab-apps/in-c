# 클래식 빨리 맞추기 음원 라이선스 조사

작성일: 2026-09-07

## 결론

한국인 사용자용 "클래식 빨리 맞추기" MVP에 실제 음원을 붙이는 것은 가능하다. 다만 클래식 작품의 악보가 공공영역이어도 특정 녹음은 별도의 실연자/음반제작자 권리로 보호될 수 있으므로, `작품 권리`와 `녹음 권리`를 분리해 검수해야 한다.

이번 조사에서는 기존 seed 20곡과 현재 코드에 추가로 들어 있는 엘가 1곡을 함께 확인했다. 개발 단계에서 바로 앱에 연결할 수 있는 1차 `cleared-open` 후보는 9곡으로 정리했다. 나머지는 라이선스가 좋아 보이더라도 `CC BY-SA`, 음질/포맷, 국가별 녹음권, metadata 충돌 때문에 `candidate` 또는 `needs-review`로 남겼다.

## 조사 방법

- Wikimedia Commons 파일 페이지에서 Summary, Licensing, VRT 여부, hidden review flag, 원본 파일 URL을 확인했다.
- Commons API로 실제 `upload.wikimedia.org` 원본 URL과 MIME/용량을 확인했다.
- IMSLP는 악보/작품 페이지가 아니라 음원별 라이선스 정책 기준으로만 참조했다.
- Musopen 음원은 직접 사이트 파일보다 Commons에 이전된 파일을 우선 검토했다.
- Internet Archive 역사적 녹음은 발행연도와 국가별 권리 위험을 따로 표시했다.
- Apple Music, Spotify, YouTube 미리듣기/API는 퀴즈용 음원 소스에서 제외했다.

## 판단 기준

| 상태 | 의미 | 코드 반영 |
| --- | --- | --- |
| `cleared-open` | 파일 페이지 기준 작품/녹음 권리가 PD, CC0, 명확한 CC BY, 또는 공공기관 PD로 확인되는 개발상 사용 후보 | 가능 |
| `candidate` | 상업 사용은 가능해 보이나 attribution/share-alike/음질/출처 추가 설계가 필요한 후보 | 보류 |
| `needs-review` | 국가별 저작인접권, 발행연도, 소스 경유, metadata 충돌 때문에 추가 법무 검토 필요 | 금지 |
| `blocked` | NC, ND, Performance Restricted, 출처 불명, 상업 사용/편집 불가 | 금지 |

`cleared-open`은 법률 자문을 대체하지 않는다. MVP 개발상으로 사용 가능한 후보라는 뜻이며, 정식 상업 서비스 전에는 한국/미국/출처국 기준으로 최종 법무 검토가 필요하다.

## MVP에 바로 넣어도 되는 1차 음원 팩

아래 9곡은 `site/classic-quiz-audio.js`에 실제 `audioUrl`과 권리 메타데이터로 반영했다.
`site/classic-quiz-data.js`는 이 모듈을 읽어 seed에 병합한다. 앱은 이 파일을 우선 재생하고,
실패하면 기존 Web Audio 데모로 fallback한다.

| seed id | 곡 | 출처/연주 | 라이선스 | 메모 |
| --- | --- | --- | --- | --- |
| `beethoven-symphony-5-1` | 베토벤 교향곡 5번 1악장 "운명" | Wikimedia Commons / Musopen, Skidmore College orchestra | Public domain / PD-author | VRT 확인 흔적. attribution-only note가 있어 출처 노출 유지 |
| `beethoven-fur-elise` | 엘리제를 위하여 | Wikimedia Commons, V Gao / Gaodifan | Public domain / CC0 | 권리자가 전 세계 공공영역 공개 및 CC0 표시 |
| `bach-air` | G선상의 아리아 | Wikimedia Commons / U.S. Air Force Band | Public domain / USGov | 미 공군 공식 직무 저작물 표시 |
| `handel-messiah-hallelujah` | 할렐루야 코러스 | Wikimedia Commons / Internet Archive, Oratorio Chorus | Public domain | 1916 역사적 녹음 |
| `dvorak-new-world` | 신세계 4악장 | Wikimedia Commons / Musopen | Public domain / PD-author | VRT 확인 흔적. 파일 크기 최적화 필요 |
| `debussy-clair-de-lune` | 달빛 | Wikimedia Commons, Laurens Goedhart | CC BY 3.0 | attribution, license link, 변경 여부 표시 필요 |
| `satie-gymnopedie-1` | 짐노페디 1번 | Wikimedia Commons / Musopen, Robin Alciatore | Public domain | Musopen 계열 PD 공개 후보 |
| `mussorgsky-promenade` | 전람회의 그림 프롬나드 | Wikimedia Commons / Musopen | Public domain / PD-author | 짧고 명확한 파일, VRT 흔적 |
| `brahms-hungarian-dance-5` | 헝가리 무곡 5번 | Wikimedia Commons, Artur Nikisch / Welte-Mignon | Public domain | 1906 재생 피아노 기록. 음색은 역사적 녹음 계열 |

## 좋지만 보류해야 하는 후보

| seed id | 곡 | 후보 | 상태 | 보류 이유 |
| --- | --- | --- | --- | --- |
| `vivaldi-four-seasons-spring` | 사계 봄 1악장 | John Harrison violin / Wichita State University Chamber Players | `candidate` | CC BY-SA. 파일은 훌륭하지만 share-alike 처리와 attribution UI가 먼저 필요 |
| `mozart-eine-kleine` | 아이네 클라이네 1악장 | TenkoQoogen / Qoo | `candidate` | CC BY-SA 2.5. 자체 업로드 신뢰도와 share-alike 처리 필요 |
| `mozart-turkish-march` | 터키 행진곡 | Bernd Krueger / piano-midi.de | `candidate` | CC BY-SA 3.0 DE. attribution/share-alike 처리 필요 |
| `chopin-nocturne-op9-2` | 쇼팽 녹턴 Op.9 No.2 | Patrizia Prati | `candidate` | CC BY-SA 4.0 + VRT. 품질은 좋지만 share-alike 설계 후 편입 |
| `bizet-carmen-habanera` | 하바네라 | Pracchia-78 virtual synthesizer rendering | `candidate` | PD 공개 표시. 다만 사운드폰트/가상악기 샘플 권리와 UX 품질 확인 필요 |
| `grieg-morning-mood` | 아침의 기분 | Musopen Symphony FLAC | `candidate` | 권리 상태는 좋아 보이나 FLAC 39MB라 모바일 MVP에는 변환/최적화 필요 |
| `bach-minuet-g` | 미뉴에트 G장조 | Aaron Dunn / Musopen | `candidate` | PDM-owner, 최근 업로드. 작곡가 표기도 페촐트 중심으로 수정 필요 |
| `schubert-ave-maria` | 아베 마리아 | Paul De Bra accordion orchestra | `candidate` | CC BY 4.0이나 아코디언 편곡이라 한국 입문자 UX와 다를 수 있음 |
| `saint-saens-swan` | 생상스 백조 | John Michel | `candidate` | CC BY-SA 3.0 + VRT. share-alike 처리 후 편입 |

## 수익화 전 반드시 재검토할 후보

| seed id | 곡 | 상태 | 재검토 포인트 |
| --- | --- | --- | --- |
| `tchaikovsky-swan-lake` | 백조의 호수 정경 | `needs-review` | 1933 녹음/PD EU Audio 후보는 미국 pre-1972 녹음 보호와 한국 저작인접권 확인 필요 |
| `mendelssohn-wedding-march` | 결혼 행진곡 | `needs-review` | PD EU Audio / CC0 metadata가 섞여 있고 녹음일이 명확하지 않음 |
| `elgar-pomp-circumstance` | 위풍당당 행진곡 | `needs-review` | 현재 코드에는 있으나 사용자 지정 20곡 밖의 추가 seed. 1931 녹음과 YouTube 경유 출처 재검토 필요 |

## 제외 원칙

- Spotify, Apple Music, YouTube preview/API는 퀴즈 문제용 클립 소스로 사용하지 않는다. 이들은 일반적으로 서비스 내 재생/미리듣기/표시 조건을 전제로 하며, 게임용 문제 음원으로 저장, 편집, 재배포하는 모델과 맞지 않는다.
- IMSLP `Performance Restricted`는 공개 연주 제한이 붙을 수 있어 앱 스트리밍/수익화 경로에서 제외한다.
- `CC NC`, `CC ND`, `CC NC-SA`, `CC NC-ND`는 상업화 또는 클립 편집과 충돌하므로 제외한다.
- Commons `license review needed`, 원출처 불명, 권리자 불명 파일은 `cleared-open`으로 올리지 않는다.

## 출처 표기 UI 요구사항

실제 음원을 쓰는 모든 문제는 피드백 화면 또는 별도 출처 페이지에서 다음을 표시해야 한다.

- 작품명
- 연주자/제작자
- 원 파일 페이지 링크
- 라이선스 이름과 라이선스 링크
- 변경 여부: "앱 퀴즈용으로 5-12초 구간 재생" 또는 실제 편집 파일이면 "클립으로 편집"
- CC BY/CC BY-SA는 attribution 표시 필수
- CC BY-SA는 파생물 배포 범위와 동일/호환 라이선스 고지 필요

현재 MVP는 피드백 화면에 짧은 `음원 출처` 링크를 추가했고, 별도 `classic-quiz-credits.html`
페이지에서 앱에 실제 연결된 `cleared-open` 음원의 상세 출처를 표시한다. 크레딧 페이지는 다음 정보를
표시한다.

- 곡
- 연주자/제작자
- sourceName/sourceUrl
- license/licenseUrl
- 변경 여부: 현재는 원본에서 지정한 5-12초 구간을 재생
- verifiedAudioStatus
- rightsNotes

## 연주자 계약 음원으로 전환할 때 필요한 데이터 필드

```ts
type ContractAudioRights = {
  verifiedAudioStatus: 'cleared-contract'
  performerId: string
  contractId: string
  licenseScope: 'quiz-streaming' | 'premium-pack' | 'sponsor-pack'
  territory: string[]
  startsAt: string
  endsAt: string | null
  revocable: boolean
  revenueShareRate: number
  creditRequired: boolean
  purchaseUrl: string
  donationUrl: string
  concertPromoUrl: string
}
```

## 남은 법률 리스크

- Commons의 Public Domain 표시는 재사용자가 자기 관할권에서 최종 확인해야 한다.
- 한국 서비스는 한국 저작인접권 보호기간을 따로 고려해야 한다.
- 미국 서버/CDN을 쓰면 pre-1972 녹음의 미국 보호기간도 봐야 한다.
- CC BY-SA 음원을 앱에서 클립으로 잘라 제공할 때 어떤 산출물이 SA 의무를 지는지 법무 검토가 필요하다.
- 외부 URL hotlink는 서비스 안정성/속도/정책 변경 리스크가 있으므로, 정식 배포 전에는 허용 조건 확인 후 자체 CDN 보관을 권장한다.

## 음원 연결 파이프라인

개발 단계에서는 외부 Wikimedia URL을 직접 재생한다. 정식 공개 전에는 다음 순서로 자체 asset/CDN
전환을 권장한다.

1. `docs/product/classical-quick-quiz-audio-candidates.json`에서 `cleared-open`만 선택한다.
2. `node scripts/prepare-classic-quiz-audio.mjs --check-network --write-plan`으로 원본 URL 접근성과 다운로드 계획을 확인한다.
3. `node scripts/prepare-classic-quiz-audio.mjs --verify-local`로 후보 JSON과 앱 오디오 모듈의 metadata mismatch를 확인한다.
4. 법무/운영 검토 후 `--download`로 원본을 받는다.
5. checksum, 원본 파일 크기, 다운로드일, 파일 페이지 oldid를 저장한다.
6. ffmpeg로 5-12초 클립을 만들고 클립본 checksum을 따로 기록한다.
7. `site/classic-quiz-audio.js`의 `localAudioPath`, `audioChecksum`, `audioSizeBytes`, `audioDurationSeconds`를 갱신한다.

스크립트는 기본 실행 시 파일을 다운로드하지 않고 JSON plan만 출력한다. `--verify-local`은 앱에 연결된
9개 `cleared-open` metadata가 후보 DB와 어긋나지 않는지 확인한다. 네트워크 확인은 Wikimedia rate
limit을 고려해 낮은 빈도로 실행한다.

## 실제 서비스 전 체크리스트

- 비공개 테스트 전에는 `npm run verify:classic-quiz`와 `node scripts/prepare-classic-quiz-audio.mjs --verify-local`을 실행한다.
- 파일 페이지 permalink 또는 oldid 저장
- 원본 파일 URL과 다운로드일 저장
- 라이선스 URL 저장
- 권리자/연주자/제작자 attribution 문구 확정
- `licenseReviewFlags`가 모두 해결됐는지 확인
- 한국/미국/출처국 검토 메모 작성
- 5-12초 clipStart를 실제 청취 후 지정
- 모바일 Safari/Chrome에서 재생, seek, CORS 확인
- 파일 용량 1-3MB 내외로 최적화
- 원본과 편집본 checksum 보관
- 크레딧 화면에서 CC BY attribution 문구, license link, 변경 여부가 누락되지 않는지 확인

## 비공개 테스트 전 점검표

| 영역 | 확인 |
| --- | --- |
| 제품 | 데일리 완료 후 잠김 상태, 연습 가능 상태, 오답 복습 CTA가 설명 없이 이해되는지 확인 |
| 법률 | 앱 재생 대상이 `cleared-open` 9곡으로 제한되는지 확인 |
| 법률 | CC BY 항목의 attribution 문구, 원 파일 페이지, 라이선스 링크, 변경 여부 표시 확인 |
| 기술 | 외부 URL 실패 시 Web Audio fallback으로 문제 진행이 멈추지 않는지 확인 |
| 기술 | 다운로드 plan과 앱 audio metadata mismatch가 0인지 확인 |
| UX | 모바일에서 긴 곡명, 긴 출처, 자동완성 후보가 버튼 밖으로 넘치지 않는지 확인 |
| UX | 브라우저 Notification이 원격 푸시처럼 오해되지 않는지 확인 |

## 2026-09-07 검증 결과

- Commons API로 후보 원본 URL, MIME type, 파일 용량을 확인했다.
- `beethoven-symphony-5-1`, `beethoven-fur-elise`, `debussy-clair-de-lune`, `bach-air` 원본 URL은 HEAD 요청에서 200 응답을 확인했다.
- 다수 URL을 짧은 시간에 반복 검사하자 `upload.wikimedia.org`가 `429`와 `retry-after: 600`을 반환했다. 이는 자동 검증 빈도 제한으로 보이며, 정식 배포 전에는 자체 asset 저장/CDN 전환 또는 낮은 빈도의 검증 스크립트가 필요하다.
- 빌드와 사이트 검증은 별도 실행 결과로 관리한다.

## 참고 출처

- Wikimedia Commons Licensing: https://commons.wikimedia.org/wiki/Commons:Licensing
- IMSLP Public domain: https://imslp.org/wiki/public_domain
- IMSLP Licensing Policy and Guidelines: https://imslp.org/wiki/CC
- Creative Commons licenses: https://creativecommons.org/cc-licenses/
- 한국저작권위원회 Copyright Act Article 86: https://www.copyright.or.kr/eng/laws-and-treaties/copyright-law/chapter03/section05.do
- U.S. Copyright Office Music Modernization Act FAQ: https://www.copyright.gov/music-modernization/faq.html
- 후보 상세 JSON: `docs/product/classical-quick-quiz-audio-candidates.json`
