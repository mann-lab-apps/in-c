# 클래식 퀴즈 음원 asset 파이프라인

작성일: 2026-09-07

## 목적

`cleared-open`으로 분류한 개발상 사용 후보만 실제 앱 asset 후보로 옮긴다. 이 문서는 법률 자문을
대체하지 않고, 제품/개발 단계에서 권리 메타데이터를 잃지 않기 위한 작업 절차다.

## 입력 파일

- 후보 DB: `docs/product/classical-quick-quiz-audio-candidates.json`
- 앱 오디오 메타데이터: `site/classic-quiz-audio.js`
- 작품 seed: `site/classic-quiz-data.js`

## 스크립트

```bash
node scripts/prepare-classic-quiz-audio.mjs
```

기본 실행은 다운로드하지 않고 `cleared-open` 후보의 asset 계획만 stdout으로 출력한다.

```bash
node scripts/prepare-classic-quiz-audio.mjs --check-network --write-plan
```

원본 URL에 HEAD 요청을 보내 접근 가능 여부, content type, content length를 확인하고
`docs/product/classical-quick-quiz-audio-download-plan.json`을 만든다.

```bash
node scripts/prepare-classic-quiz-audio.mjs --download --write-plan
```

법무/운영 검토가 끝난 뒤에만 실행한다. 원본 파일은 기본적으로
`site/public/audio/classic-quiz/originals`에 저장하고 SHA-256 checksum을 기록한다.

```bash
node scripts/prepare-classic-quiz-audio.mjs --verify-local
```

후보 JSON의 `cleared-open` 항목과 `site/classic-quiz-audio.js`의 앱 오디오 메타데이터를 비교한다.
확인하는 항목은 원본 URL, 파일 페이지 URL, 라이선스 URL, 상태값이다. `localAudioPath`가 들어간
항목은 실제 파일 존재 여부, 파일 크기, SHA-256 checksum, 확장자 기반 MIME 추정값도 확인한다.

`--verify-local --write-plan`을 함께 쓰면 다운로드 계획 JSON 안에 mismatch report를 함께 저장한다.
현재 repo는 package 전체가 CommonJS로 설정되어 있지 않아, Node가 앱의 ESM 파일을 동적 import할 때
module type 경고를 낼 수 있다. 경고가 있어도 `mismatchCount: 0`이면 검증 자체는 통과한 것이다.

## 클립 생성 계획

스크립트 plan의 `ffmpegPlan`은 예시 명령이다.

```bash
ffmpeg -ss <start> -t <duration> -i <original> -vn -ac 2 -ar 44100 -b:a 128k <clip>.mp3
```

정식 앱에는 원본 파일이 아니라 5-12초 클립 파일을 넣는 편이 좋다. 원본과 클립본은 각각 checksum,
파일 크기, 생성일을 따로 저장한다.

## 앱 반영 규칙

- `cleared-open` 또는 향후 `cleared-contract`만 `audioUrl`/`localAudioPath`로 재생한다.
- `candidate`, `needs-review`, `blocked`는 앱 재생 소스로 쓰지 않는다.
- 후보 JSON과 앱 오디오 모듈 사이 mismatch가 있으면 배포 전 해결한다.
- 외부 Wikimedia URL hotlink는 개발 단계 임시 전략이다.
- 정식 공개 전에는 자체 CDN 또는 로컬 asset으로 옮기고, 출처 페이지 oldid와 다운로드일을 보관한다.
- CC BY 음원은 연주자/제작자, 파일 페이지, 라이선스 링크, 변경 여부를 표시한다.
- CC BY-SA 음원은 attribution UI와 share-alike 고지 설계가 끝나기 전까지 앱 재생에 넣지 않는다.

## QA 명령

```bash
npm run verify:classic-quiz
node scripts/prepare-classic-quiz-audio.mjs --verify-local
```

`verify:classic-quiz`는 다음을 확인한다.

- 퀴즈 화면 필수 selector
- 크레딧 화면 필수 selector
- 데일리 라운드 10개와 필수 필드
- 작품 seed 20개 이상과 필수 필드
- taxonomy의 `genreKo`, `popularityTier`
- `cleared-open`이 아닌 작품에 실제 `audioUrl`/`localAudioPath`가 붙지 않았는지
- 후보 JSON, 다운로드 plan, 앱 audio metadata의 기본 일치 여부
- manifest start URL/scope와 sitemap quiz/credits 경로

브라우저 클릭 자동화가 없는 환경에서는 이 정적 QA가 최소 안전망이다. 실제 비공개 테스트 전에는
모바일 Safari/Chrome에서 재생, 자동완성 초성 검색, 주관식 입력, 오답 복습을 직접 확인해야 한다.

## 연주자 계약 음원 전환

연주자 음원은 `verifiedAudioStatus: "cleared-contract"`로 별도 관리한다. 추가 필드는 최소 다음을
권장한다.

- performerId
- contractId
- licenseScope
- territory
- startsAt / endsAt
- revocable
- revenueShareRate
- purchaseUrl
- donationUrl
- concertPromoUrl

## 남은 확인

- 한국/미국/출처국 기준 작품 권리와 녹음 권리 최종 검토
- Commons 파일 페이지 oldid 저장
- 모바일 Safari/Chrome seek 가능 여부
- CORS와 range request 동작
- 파일 용량 예산
- attribution 문구의 실제 표시 위치
