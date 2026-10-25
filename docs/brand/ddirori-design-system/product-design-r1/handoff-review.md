# 서비스 구현 인계와 반환

상태: **설계 R1 준비 / 세 서비스의 R1 구현·반환 검토 대기.** 기존 공통 적용 검토는 [current-audit](current-audit.md)에 기록했다. 이 작업에서 미래 서비스 구현과 사람 테스트를 완료했다고 보고하지 않는다.

## 시작 계약

1. 현재 branch/worktree/AGENTS와 dirty diff부터 확인. 기존 작업 보존. 디자인 기준 `product-design-r1/revision.json`의 파일 SHA를 검사하고 적용 commit 또는 미커밋 manifest를 기록.
2. shared-baseline/support-matrix/specifications의 실제 API와 서비스 명세를 확인. 코드와 문서가 다르면 최신 제품 의미를 우선하고 차이를 기록.
3. 대표 흐름만 구현. mock dataset/가짜 저장/정적 Paper를 제품에 넣지 않는다. API와 도메인을 억지로 줄이지 않는다.
4. 다른 앱에 같은 요구가 있을 때만 공통 변경 제안. 앱 내부 composition/CSS로 해결 가능하면 먼저 adapter 범위로 처리. 공통 소스 복사·분기 금지.
5. 기존 색 설정 유지. R1 추천색은 비교·옵션으로만 적용하고 사용자 미승인 대표색/런처를 제품 기본값으로 확정하지 않는다.

## 공통 변경 제안 양식

문제/재현 → 현재 API로 못 표현하는 의미 → 앱 adapter로 해결 가능한 범위 → 실제 두 소비처의 같은 계약 → 토큰/API 전후 → 기존 caller 영향 → migration/default/backward compatibility → 검사·rollback. 같은 모양만으로 공통 도메인 component를 만들지 않는다.

## 반환 패키지

서비스별 `docs/brand/ddirori-design-system/product-design-r1/returns/<service>-<revision>/` 또는 팀의 기존 QA 위치. 새 결과 폴더에 저장하며 과거 evidence를 덮어쓰지 않는다.

```yaml
service: score # play / studio
implementation_commit: <실제 커밋 또는 uncommitted>
design_revision: product-design-r1
design_manifest_sha256: <revision.json 실제 해시>
base_product_commit: <구현 시작점>
status: implemented-awaiting-review # partial / blocked는 사유 기재
screens:
  - state: default
    kind: actual-product # widget-renderer / Electron-built 등 구체 환경 추가
    file: actual-default-light.png
    fixture: <데이터/ID/seed; 비밀·개인정보 제외>
    viewport: <논리 px>
    device_scale: <DPR>
    theme: light
    accent: <기존 trial 또는 사용자 선택>
    text_scale: 1
    runtime: <실제 버전>
tests:
  - command: <정확한 명령>
    result: pass # fail / not-run
    log: <상대경로>
differences:
  - design: <기준 문서 section>
    actual: <차이>
    reason: <플랫폼/제품/불일치>
shared_proposals: []
metadata_check: <iOS 해당 결과 또는 not-applicable와 이유>
unverified: []
limitations: []
```

필수 화면: 기본·빈 목록·검색 없음·선택(해당 시)·loading·error·disabled·성공, 실제 dialog pending/failure/retry, light/dark, 좁음/넓음/큰 글자. 모든 조합을 억지로 늘리지 말고 위험한 조합을 우선. 예:320×200% 오류/긴 제목,207px inspector. 데이터가 리뷰와 다르면 ID·길이·메타데이터량 mapping 첨부. 리뷰 fixture: bwv846/772/l75, 긴 제목과6/3/5페이지. 실제 Play는 fake artist 대신 안전한 로컬 fixture와 출처를 사용.

## 비교·반영 순서

같은 viewport/theme/내용량으로 R1 화면과 실제를 나란히 확인. 1) 핵심 행동 접근 2) 정보 위계·가독성 3) 상태·비동기·focus 4) 브랜드·색 5) 세 앱 일관성. 제품 의미의 동등성을 먼저 판단하고 픽셀 완전 일치는 요구하지 않는다.

| 결과 분류 | 처리 |
| --- | --- |
| 명세대로 구현 | evidence와 테스트를 연결하고 해당 범위 완료 |
| 플랫폼의 정당한 차이 | native 제약·접근성 근거 기록, 공유 계약 유지 여부 확인 |
| 제품에 필요한 예외 | 앱 전용 문서에 책임과 재사용 금지 범위 명시 |
| 수정할 시각/동작 불일치 | 재현/기대/실제·영향 화면과 회귀 수용 조건으로 해당 서비스에 반환 |
| 공통 개선 | 공통 제안 양식에 두 소비처·API 영향 기록, 별도 변경·회귀 후 source of truth 갱신 |

Score 첫 반환에서 실측한 행/필터/저장 패턴을 Play와 교차 검토한다. Studio의 compact/sp/undo는 소비자 목록 패턴에 강제로 합치지 않는다. 변경이 승인되면 `product-design-r2` 등 새 revision 또는 명시적 patch manifest를 만들고 과거 R1 캡처·기준을 보존한다. 외부 출시·배포·PR merge·push는 별도 권한 범위다.
