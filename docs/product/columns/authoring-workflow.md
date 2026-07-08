# Columns 작성 워크플로우

Columns는 초기에는 서버나 CMS 없이 수동 HTML 문서를 작성하고 Vite로 빌드한다.
목표는 빠르게 공개 가능한 글을 만들되, 나중에 CMS나 Markdown 파이프라인으로
옮겨갈 수 있도록 구조를 단순하게 유지하는 것이다.

## 작성 방식

1. `site/columns/_template.html`을 복사해 `site/columns/{slug}.html`을 만든다.
2. `{slug}`는 영문 소문자와 하이픈만 사용한다.
3. 본문 이미지는 `site/assets/columns/{slug}/` 아래에 둔다.
4. `title`, `description`, `og:title`, `og:description`, `og:image`를 글마다 수정한다.
5. `Columns` 마인드맵과 목록에 노출할 글은 `site/columns-data.js`에도 같은 slug로 연결한다.
6. `npm run site:build`로 `columns.html`과 개별 칼럼 HTML이 함께 빌드되는지 확인한다.

## 이미지 규칙

- 대표 이미지는 `cover.jpg` 또는 `cover.png`를 기본 이름으로 둔다.
- 본문 이미지는 `example.jpg`, `score-detail.png`처럼 역할이 보이는 이름을 쓴다.
- 모든 이미지는 `alt`를 작성한다.
- 장식용 이미지가 아니라면 `figcaption`에 출처나 맥락을 적는다.
- 외부 이미지 직링크보다 저장소 내부 자산을 우선한다.
- 저작권이 불명확한 이미지는 사용하지 않는다.

## 메타데이터

각 칼럼은 최소한 다음 정보를 가진다.

- 제목
- 요약
- 공개 상태
- 게시일
- 읽는 시간
- 태그
- 관련 작품
- 관련 작곡가
- 관련 공연
- 대표 이미지

## 빌드와 검토

필수 확인:

```sh
npm run site:build
```

권장 확인:

```sh
node --check site/vite.config.mjs
git diff --check
```

## 이후 확장

수동 HTML 작성이 불편해지면 다음 순서로 확장한다.

1. HTML 템플릿 유지 + 데이터 연결 자동화
2. Markdown/frontmatter 원본에서 HTML 생성
3. GitHub PR 기반 리뷰/발행 흐름
4. 관리자 UI 또는 headless CMS 도입
