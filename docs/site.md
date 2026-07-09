# 소개 및 다운로드 페이지

`site/`는 in-C 공개 소개와 다운로드 안내를 담당하는 정적 사이트다. 앱과
분리된 루트로 빌드하되 같은 저장소에서 릴리즈 정보와 문서를 함께 관리한다.

## 실행

```bash
npm run site:dev
npm run site:build
```

빌드 결과는 `out/site`에 생성된다.

## 다운로드 데이터

페이지는 `site/download-manifest.json`을 읽어 운영체제별 다운로드 카드를
그린다. 첫 GitHub Release가 아직 없으면 각 플랫폼은 `available: false`를
유지하고 GitHub Releases 목록으로만 안내한다.

첫 prerelease가 게시되면 다음 항목을 실제 산출물에 맞춰 갱신한다.

- `releaseDate`
- `releasePublished`
- 각 플랫폼의 `available`, `size`, `url`
- `checksumsUrl`

존재하지 않는 설치 파일 URL을 먼저 노출하지 않는다.

## GitHub Pages

`.github/workflows/site.yml`은 pull request에서 사이트 빌드를 검증하고,
`main` push 또는 수동 실행에서 GitHub Pages artifact를 배포한다. 저장소
Settings > Pages에서 배포 source를 GitHub Actions로 설정해야 한다.

## Google Analytics

`site/analytics-config.json`에서 GA4를 켠다.

```json
{
  "provider": "ga4",
  "measurementId": "G-XXXXXXXXXX",
  "enabled": true
}
```

`measurementId`가 비어 있거나 `enabled`가 `false`이면 트래킹은 아무 동작도
하지 않는다. 페이지 렌더링과 다운로드 링크 이동을 막지 않는다.

수집 이벤트와 네이밍 규칙은
[`docs/product/analytics-events.md`](product/analytics-events.md)에 정리한다.
개인 식별자, 쿠키 외 추가 사용자 속성, 앱 내부 사용 행동은 이 사이트 트래킹
범위에 포함하지 않는다.
