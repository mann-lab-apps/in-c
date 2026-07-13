# 홍보 배너 API 계약과 콘텐츠 스키마

## Endpoint

`GET /v1/banners`

Query 후보:

- `placement`: `home`, `start_screen`, `system_tab`, `download`, `editor_side`
- `platform`: `electron`, `web`, `chromatics`, `site`
- `locale`: 예: `ko-KR`
- `appVersion`: Electron 앱 버전

## Response

```json
{
  "banners": [
    {
      "id": "banner_001",
      "type": "concert_promotion",
      "title": "이번 주 공연 미리 듣기",
      "body": "오늘은 2악장 첫 선율만 들어보세요.",
      "image": {
        "url": "https://example.com/banner.jpg",
        "alt": "공연 포스터"
      },
      "cta": {
        "label": "공연 보기",
        "targetUrl": "https://in-c.app/concerts/example"
      },
      "priority": 10,
      "placement": "start_screen",
      "platforms": ["electron", "web"],
      "startAt": "2026-07-01T00:00:00Z",
      "endAt": "2026-07-31T23:59:59Z"
    }
  ]
}
```

## Type Draft

```ts
type BannerType =
  | 'concert_promotion'
  | 'web_feature'
  | 'community_score'
  | 'release_notice'

interface Banner {
  id: string
  type: BannerType
  title: string
  body: string
  image?: { url: string; alt: string }
  cta: { label: string; targetUrl: string }
  priority: number
  placement: string
  platforms: string[]
  startAt: string
  endAt: string
}
```

## 실패와 캐시

- API 실패 시 마지막 성공 응답을 최대 24시간까지 사용할 수 있다.
- 캐시가 없으면 배너 영역을 비운다.
- 만료된 배너는 클라이언트에서도 숨긴다.
- 빈 응답은 정상 상태로 처리한다.

## 이벤트

- `banner_impression`: `banner_id`, `type`, `placement`, `platform`
- `banner_click`: `banner_id`, `type`, `placement`, `target_url`
- `banner_dismiss`: `banner_id`, `type`, `placement`

## 운영 연결

운영자는 배너를 등록할 때 표시 기간, placement, platform, 우선순위를 반드시
입력해야 한다. 유료 홍보 배너는 `promotion_id`를 추가 필드로 연결한다.
