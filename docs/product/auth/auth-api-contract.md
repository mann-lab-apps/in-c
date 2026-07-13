# 인증 API 엔드포인트와 세션 관리 계획

## Endpoint Draft

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/v1/auth/magic-link` | 이메일 매직링크 요청 |
| `GET` | `/v1/auth/callback` | 매직링크 token 검증 |
| `POST` | `/v1/auth/sign-out` | 현재 세션 로그아웃 |
| `GET` | `/v1/auth/me` | 현재 사용자 조회 |
| `POST` | `/v1/auth/refresh` | refresh token으로 세션 갱신 |
| `POST` | `/v1/auth/sessions/revoke` | 특정 기기 세션 해제 |

## User Response

```json
{
  "user": {
    "id": "user_123",
    "email": "player@example.com",
    "displayName": "김연주",
    "profileImageUrl": null,
    "role": "user",
    "createdAt": "2026-07-01T00:00:00Z"
  }
}
```

## 세션 정책

- access token은 짧게 유지하고 API 호출에 사용한다.
- refresh token은 httpOnly secure cookie 또는 플랫폼별 안전 저장소에 둔다.
- Electron 앱은 refresh token을 OS credential storage에 저장하는 방향을 검토한다.
- 사용자는 기기별 세션을 해제할 수 있다.
- 결제와 관리자 액션은 세션 갱신만으로 처리하지 않고 재인증 후보로 둔다.

## 에러 코드와 표시 문구

| Code | HTTP | 사용자 문구 |
| --- | --- | --- |
| `invalid_email` | 400 | 이메일 형식을 확인해 주세요. |
| `rate_limited` | 429 | 잠시 후 다시 시도해 주세요. |
| `link_expired` | 401 | 로그인 링크가 만료되었습니다. 새 링크를 받아 주세요. |
| `unauthenticated` | 401 | 로그인이 필요합니다. |
| `forbidden` | 403 | 이 작업을 할 권한이 없습니다. |
| `session_revoked` | 401 | 이 기기에서 로그아웃되었습니다. |

## 테스트 전략

- Unit: 이메일 정규화, token 만료, 에러 매핑
- Integration: 매직링크 요청, callback, refresh, revoke
- E2E: 로그인 필요 CTA에서 인증 후 원래 화면 복귀
- Security smoke: 만료 token, 재사용 token, revoke 이후 요청 실패

## 후속 구현

- auth controller와 service scaffold
- token 저장소와 session table
- email delivery adapter
- Electron 외부 브라우저 callback 처리
