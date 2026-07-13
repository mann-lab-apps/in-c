# 사용자 인증 MVP 설계

## 후보 비교

| 방식 | 장점 | MVP 판단 |
| --- | --- | --- |
| 이메일 매직링크 | 비밀번호 저장 부담이 낮고 웹/앱 공유가 쉬움 | 기본안 |
| 이메일/비밀번호 | 익숙하지만 재설정/보안 운영 부담이 큼 | 이후 검토 |
| OAuth | 가입 마찰이 낮을 수 있음 | 보조 로그인 후보 |
| 소셜 로그인 | 음악인 프로필과 연결 가능 | provider 정책 확인 후 |

## MVP 결정

첫 인증 MVP는 이메일 매직링크로 시작한다. 사용자는 하나의 이메일 계정으로
웹 편집기, 커뮤니티, Electron 앱의 얕은 연동을 공유한다.

## 계정 모델

| 필드 | 설명 |
| --- | --- |
| `id` | 내부 사용자 ID |
| `email` | 로그인과 소유권 확인 기준 |
| `displayName` | 공개 표시 이름 |
| `profileImageUrl` | 선택 프로필 이미지 |
| `role` | 기본 역할 |
| `createdAt` | 계정 생성 시각 |
| `lastSignedInAt` | 마지막 로그인 시각 |

## 세션 전략

웹은 secure httpOnly cookie 기반 refresh token을 우선한다. Electron 앱은 외부
브라우저 인증 후 안전 저장소에 refresh token을 보관하는 방식을 검토한다.
access token은 짧은 수명으로 API 호출에만 사용한다.

## 제품 연결

- 커뮤니티 게시물 소유권은 `user.id`를 기준으로 한다.
- 연주회 홍보 결제 기록은 `user.id`와 `paymentRecord.id`를 연결한다.
- 웹 편집기 저장 문서는 `ownerUserId`와 공개 범위를 가진다.
- Electron 앱은 로그인 실패와 무관하게 로컬 편집을 유지한다.

## 구현 분리

- 인증 API: 매직링크, callback, refresh, revoke
- 프론트 UX: 로그인 모달, 세션 만료, 계정 상태
- 보안 점검: token 저장, rate limit, 이메일 재전송 제한
- 권한 모델: 역할과 리소스별 policy

## 관련 문서

- `docs/product/auth/auth-api-contract.md`
- `docs/product/auth/login-account-ux.md`
- `docs/product/community/permission-model.md`
- `docs/product/community/api-server-boundary.md`
