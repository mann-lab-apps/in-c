# Columns 등록·수정 워크플로우

Columns는 초기에는 서버나 CMS 없이 Git 기반 정적 콘텐츠로 운영한다. 현재
1차 원본은 `site/columns-data.js`이며, 공개 칼럼의 정적 HTML, sitemap,
robots 파일은 `scripts/generate-columns-seo.mjs`로 생성한다.

이 방식의 목표는 새 칼럼을 빠르게 추가하면서도 검색 노출, 지도 탐색, 관련
작품/작곡가/공연 연결을 같은 데이터에서 유지하는 것이다.

Columns는 단순한 블로그가 아니라 in C의 현재 최우선 제품 영역이다. 사용자가
클래식을 공부하러 들어오는 곳이 아니라, 공연과 작품에 대해 솔직하게 말을 시작할
수 있게 하는 작은 질문과 관찰을 제공하는 공간이다.

## 콘텐츠 원칙

- 한 글에서 하나의 핵심만 다룬다.
- 전문용어보다 감각과 경험에서 시작한다.
- 사용자가 바로 적용할 수 있는 청취 포인트를 준다.
- 정답을 선언하기보다 질문을 남긴다.
- 작곡가와 관객 사이에 끼어들기보다 사용자가 자기 말로 감상을 시작하게 돕는다.
- 글을 읽은 뒤 in C가 없어도 사용자가 스스로 감상할 수 있어야 한다.
- 작은 글들이 연결되어 커뮤니티 대화와 필요한 배경지식으로 이어져야 한다.

좋은 초기 주제:

- 안 들리는 게 당연합니다.
- 음악이론을 배우지 마세요.
- 형식에서 가장 중요한 것은 반복입니다.
- 반복되는 음악은 왜 편안할까.
- 새로운 선율은 왜 긴장을 만들까.
- 화려한 부분보다 그 앞의 시간이 중요한 이유.
- 곡을 외우면 왜 좋아지기 시작할까.

## 1차 정책

- 원본 데이터: `site/columns-data.js`
- 공개 상태: `status: 'public'`
- 초안 또는 비공개 상태: `status: 'private'`
- 정적 상세 페이지: `site/columns/{slug}.html`
- 대표/본문 이미지: `site/assets/columns/{slug}/`
- sitemap/robots: `site/public/sitemap.xml`, `site/public/robots.txt`
- 생성 명령: `node scripts/generate-columns-seo.mjs`

`site/columns/_template.html`은 예외적인 수동 HTML 페이지나 향후 마이그레이션
참고용 템플릿으로 유지한다. 일반적인 칼럼 추가는 템플릿 복사가 아니라
`columns-data.js` 수정으로 시작한다.

## 새 칼럼 추가 절차

1. `site/columns-data.js`의 `columns` 배열에 새 객체를 추가한다.
2. `slug`는 영문 소문자와 하이픈만 사용한다.
3. 공개 전에는 `status: 'private'`로 둔다.
4. 제목, 요약, 카테고리, 태그, 게시일, 읽는 시간, 관련 항목을 채운다.
5. 본문은 `body` 문자열에 Markdown subset으로 작성한다.
6. 마인드맵에 노출할 경우 `columnMap`의 적절한 그룹에 slug를 연결한다.
7. 공개 준비가 끝나면 `status: 'public'`으로 바꾼다.
8. `node scripts/generate-columns-seo.mjs`를 실행한다.
9. `npm run site:build`로 정적 상세 페이지와 sitemap 산출물을 확인한다.

## 수정 절차

기존 칼럼의 제목, 요약, 본문, 태그, 관련 항목을 수정할 때도
`site/columns-data.js`를 먼저 수정한다. 공개 칼럼을 수정한 뒤에는 반드시
`node scripts/generate-columns-seo.mjs`를 다시 실행해 정적 HTML과 sitemap을
갱신한다.

정적 HTML만 직접 수정하지 않는다. 직접 수정하면 다음 생성 시 덮어써지고,
목록/마인드맵/SEO 데이터와 불일치할 수 있다.

## 데이터 구조

각 칼럼은 최소한 다음 필드를 가진다.

- `slug`: URL과 내부 식별자
- `status`: `public` 또는 `private`
- `title`: 검색 결과와 상세 페이지 제목
- `summary`: description, Open Graph, Twitter card 요약
- `category`: 마인드맵과 목록 분류
- `tags`: 검색/탐색 보조 태그
- `publishedAt`: 게시일
- `readingMinutes`: 읽는 시간
- `relatedWorks`: 관련 작품
- `relatedCompositions`: Compositions에 공개된 관련 악보 링크
- `relatedComposers`: 관련 작곡가
- `relatedPerformances`: 관련 공연
- `body`: Markdown subset 본문

`summary`는 공유 미리보기와 검색 결과에 직접 노출될 수 있으므로 80자 안팎의
자연스러운 한국어 문장으로 작성한다.

관련 항목은 단순 추천 링크가 아니라 in C의 관계 구조를 만드는 데이터다. 가능하면
하나의 칼럼이 작품, 작곡가, 공연, 악보, 다른 Columns 중 최소 하나와 연결되도록
작성한다. 연결할 대상이 아직 구현되지 않았으면 본문에 `[확인 필요]`로 남기지
말고 원본 데이터의 관련 필드를 비워 둔다.

## 지원하는 본문 문법

현재 생성 스크립트는 가벼운 Markdown subset만 지원한다.

- `## 소제목`
- 일반 문단
- `-` 목록
- `**강조**`

이미지, 표, 인용, 악보 예시가 필요해지면 생성 스크립트를 확장한다. 임시로
수동 HTML을 섞는 것보다 원본 포맷과 생성기를 같이 확장하는 쪽을 기본
방향으로 둔다.

## 이미지와 자산

- 칼럼별 이미지는 `site/assets/columns/{slug}/` 아래에 둔다.
- 대표 이미지는 `cover.jpg` 또는 `cover.png`를 기본 이름으로 둔다.
- 본문 이미지는 `score-detail.png`, `listening-map.jpg`처럼 역할이 보이는
  이름을 쓴다.
- 모든 의미 있는 이미지는 `alt`와 출처 설명을 갖는다.
- 저작권이 불명확한 이미지는 사용하지 않는다.

이미지는 아직 `columns-data.js` 원본 스키마에 포함하지 않는다. 칼럼 이미지
수요가 반복되면 `coverImage`, `figures` 필드를 추가하고 생성 스크립트에서
렌더링한다.

## SEO 갱신 규칙

공개 칼럼마다 생성 스크립트가 다음을 만든다.

- 고유 URL: `/columns/{slug}.html`
- `<title>`
- meta description
- canonical URL
- Open Graph title/description/url/image
- Twitter card
- Article JSON-LD
- sitemap URL

Columns index는 CollectionPage JSON-LD를 가진다. sitemap과 robots는
`site/public`에 있어야 Vite 빌드 결과의 루트에 복사된다.

## 검증 명령

필수:

```sh
node scripts/generate-columns-seo.mjs
npm run site:build
git diff --check
```

권장:

```sh
node --check site/columns.js
node --check scripts/generate-columns-seo.mjs
```

확인할 산출물:

- `site/columns/{slug}.html`
- `site/public/sitemap.xml`
- `site/public/robots.txt`
- `out/site/columns/{slug}.html`
- `out/site/sitemap.xml`
- `out/site/robots.txt`

## 리뷰와 발행

Columns 변경은 일반 기능 변경과 동일하게 이슈 브랜치와 PR로 진행한다.

PR에는 다음 내용을 포함한다.

- 새로 추가 또는 수정한 칼럼 slug
- 공개/비공개 상태 변경 여부
- 관련 작품/작곡가/공연 연결 변경
- SEO 산출물 생성 여부
- 검증 명령 결과

리뷰할 때는 문장의 권위보다 사용자 경험을 먼저 본다. "이 작품은 위대하다"보다
"오늘은 이 선율이 돌아오는 순간만 기다려보세요"처럼 사용자가 실제로 들어볼 수
있는 문장이 더 낫다.

## 이후 확장 방향

현재 방식이 불편해지는 시점에는 다음 순서로 확장한다.

1. `columns-data.js`를 JSON 또는 Markdown/frontmatter 원본으로 분리
2. 이미지 필드와 figure 렌더링 지원
3. GitHub Issue 또는 PR 템플릿으로 칼럼 제안/리뷰 흐름 표준화
4. 로컬 작성 도구 추가
5. 관리자 UI 또는 headless CMS 도입

CMS 도입 전까지는 Git 이력을 콘텐츠 변경 이력으로 사용한다.
