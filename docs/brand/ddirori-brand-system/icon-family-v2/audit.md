# 디자인 시스템 추가 감사와 처리

2026-10-24. [시작점](evidence/baseline.json)은 이전 작업의 미커밋 파일을 포함한2,021개 파일과 HEAD/브랜치/워크트리 기록이다. 이전 과제를 새로 완료했다고 재집계하지 않는다.

| ID | 실제 근거·영향 | 우선순위·처리 | 수용·검사 |
| --- | --- | --- | --- |
| H01 | visual-identity의 동일 파랑/런처 파랑 유지 문구와 실제 palette-pilot·대표색 미확정 충돌. system-review의 “이번 후속”이 과거 문서 작업과 혼동 | P1 이번 수정: 최신 기준·이력·후보를 분리 | 진입 문서가 현재 적용·미승인·과거를 명시, 기존 evidence 보존 |
| H02 | 기존 Play/Score/Studio glyph는 있었으나 플랫폼 패키지는 Play/Score만, Studio는 기존 build/icon. 작은 전경/서비스별 크기·안전 영역·재생성 drift 검사가 없음 | P1 이번 구현: 후보 source/regular/small/export 계약과 A/B 전체 세트 | 편집 원본·3팔레트·모바일/desktop 파일, 디코딩·동일 재생성·hash·safe zone |
| H03 | 실제 SpanProperties.GeometryInput이 composition Enter에도 blur, Escape가 상위 keydown으로 전파, 호스트 반영 전 중복 blur 시 동일 commit 발생. React 공통 Number의 이전 수정이 실제 Studio에 연결된 것은 아님 | P1 이번 수정: actual field dirty/composing 가드·Enter/Escape scope | 재현3개 실패→3개 통과, endpoint/geometry roundtrip4개 및 App133개 회귀, typecheck |
| H04 | 기존 카탈로그 capture 파일 생성은 자동 시각 회귀와 다름 | P1 이번 구현: 아이콘 대표 regular/small 픽셀 기준과 독립 CI 계약 검사 | generator가 baseline을 갱신하지 않음. 변경시 명시적 재검토 필요. UI 전체 골든 승인으로 확대하지 않음 |
| H05 | Play MetadataEditDialog는 DdiroriInput/Button 소비하지만 draft를 결과로 반환하며 저장은 host. 범용 async dialog로 무조건 교체할 이유 없음 | P2 후속: 실제 저장 실패→재진입 정책 조사 후 한 흐름에 적용 | 폼 확인과 영속 저장 완료를 구분. 이번 제품 변경·검증 완료로 집계하지 않음 |
| H06 | Score는 실제 presentation adapter로 검색/필터/선택 도입. viewer·주석·연습 영역에는 기존 구성 유지 | 현행 유지: 이미 도입된 흐름 재작성 안 함 | 이전 adoption-pilot evidence 보존; 이번 앱 동작 변경 없음 |
| H07 | Studio의 common theme 전체 도입은 안 됨. GeometryInput은 undefined=자동·sp단위·현행 명령 의미를 보유 | 현행 유지 + H03만 수정 | 공통 Number API 확장이나 엔진 변경 없이 local field 경계 수정; 카탈로그를 Electron 적용으로 오인하지 않음 |
| H08 | 6팔레트/Flutter native overlay/required 책임/Transport commit 시점은 명시된 플랫폼 차이 | 현행 유지 | 소비 요구 없는 name/ref/onCommit API 추가 안 함, 생성 토큰 불변 |
| H09 | 대표색·출시 아이콘 승인 없음 | 사용자 결정 필요 | 추천은 가능, 제품 default/launcher 자동교체 금지 |
| H10 | real IME·VoiceOver/TalkBack·native OS masking/effects·user recognition | 환경 제약 미검증 | verification.md의 기기·사용자 절차로 인계. 브라우저·합성 이벤트 결과로 대체하지 않음 |

## 이번 고도화 묶음

1. **기준과 소비 계약:** H01 문서 최신 기준 + H03 실제 Studio 숫자 편집. 새 공통 필수 prop 없음. 앱 내부 함수의 commit 의미만 보완했다.
2. **제품 식별 자산:** H02의 하나의 geometry source, regular/small, 색 역할, 플랫폼 내보내기. 모브랜드/캐릭터/일반 기능 아이콘 책임 분리.
3. **검사와 전달:** H04의 source/export/raster drift, deterministic rebuild, geometry/format/mask, review UI. 기존 디자인 시스템 CI web job에 무의존성 계약 검사를 추가했다.

## actual Studio 수용 조건

| 조건 | 증거 |
| --- | --- |
| composition Enter는 focus 유지·commit0·상위 단축키0 | SpanProperties.test.tsx의 composition 테스트 |
| 확정 Enter는 blur를 통해 편집1회, host가 늦어도 중복0 | 동일 파일 edit/host 테스트 |
| Escape는 자동/기존 draft 복원, 상위 선택 해제 유발0 | cancel 테스트 |
| 외부값 반영, 빈값은 undefined, 잘못된 범위는 복원 | host/invalid 테스트 |
| endpoint·undo·native/XML 의미 보존 | 기존 span-editing.test.ts 4개 |
| 실제 App 이벤트/동작 회귀 | 기존 App.test.tsx 133개 |

공통 Number로 강제 치환하지 않은 이유는 nullable 자동값과 engraving 단위의 도메인 계약 때문이다. 엔진 command·undo·파일 저장은 수정하지 않았다. 입력의 최종 권한/검증은 기존 host에 있다.

## 제품·메타데이터 경계

실제 제품 수정은 Electron의 SpanProperties.tsx 하나다. Play/Score Flutter·공통 패키지·iOS/Android asset·deployment YAML은 이번 기준점 이후 불변이다. 후보 생성만으로 iOS 제품 변경을 만들지 않아 metadata 갱신/check는 이번 작업 N/A다. 이는 이전 작업의 pending/check 결과를 새 검수 통과로 바꾸는 의미가 아니다. 실제 런처 교체 후에는 각 manifest 갱신이 필요하다.

범위 밖 파일의 바이트 보존은 verification.json에서 확인한다. 이전 adoption-pilot의 preservation 도구는 당시 작업 전용 baseline을 대상으로 하므로 이번 Studio 변경을 숨기려고 baseline/allowlist를 수정하지 않았다.
