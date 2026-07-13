# API 서버 MVP 기술 스택과 배포 방식

## 결정

MVP API는 Node.js와 TypeScript 기반 HTTP 서버로 시작한다. 현재 저장소가
TypeScript 중심이고 Electron, 사이트, 테스트 도구가 같은 언어 생태계에 있기
때문에 모델과 validation 코드를 공유하기 쉽다.

## 후보 비교

| 후보 | 장점 | MVP 리스크 |
| --- | --- | --- |
| Node.js TypeScript 서버 | 기존 코드와 타입 공유, 로컬 개발 단순 | 서버 운영과 배포 파이프라인 필요 |
| Serverless 함수 | 초기 운영 부담 낮음 | 결제 webhook, 세션, 파일 업로드 흐름이 흩어질 수 있음 |
| Managed backend | 인증/DB 시작 빠름 | 데이터 모델과 권한 정책이 서비스 제약을 강하게 받음 |

## 권장 구성

- Runtime: Node.js LTS
- Language: TypeScript
- API style: REST 우선, 향후 OpenAPI 문서화
- DB: PostgreSQL 계열 managed DB 후보
- Migration: 명시적 migration 파일
- File storage: MusicXML, PDF, 이미지용 object storage
- Auth: 이메일 매직링크 + 세션/refresh token
- Payments: 단건 결제 webhook을 API 서버가 검증

## 로컬 개발

API 서버 scaffold 이후에는 다음 명령을 목표로 둔다.

- `npm run api:dev`
- `npm run api:test`
- `npm run api:migrate`
- `npm run api:typecheck`

로컬 개발은 `.env.local`을 사용하되, 비밀값은 저장소에 커밋하지 않는다.

## 배포 방식

첫 배포는 단일 API 서비스와 managed DB 조합을 기본안으로 둔다. 정적 사이트와
Electron 앱은 API base URL을 환경별로 주입받는다.

환경은 `local`, `staging`, `production` 세 단계로 나누고, 결제 webhook은
staging에서 반드시 검증한 뒤 production에 연결한다.

## CI/CD 요구사항

- typecheck, unit test, migration dry-run
- API contract fixture 검증
- Docker 또는 배포 provider build 검증
- production 배포 전 staging smoke test

## 후속 구현

- `apps/api` 또는 `packages/api` scaffold 위치 결정
- DB migration 도구 선택
- 인증 contract와 권한 middleware 구현
- 파일 업로드와 결제 webhook proof of concept
