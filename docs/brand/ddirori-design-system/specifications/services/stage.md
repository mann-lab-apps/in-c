# S-STAGE 공연 발견·홍보

현행 구분: [루트 README](../../../../../README.md)의 공개 서비스는 소개·이메일 홍보 문의다. [site](../../../../../site/)의 HTML/JS 표면과 [classical_discovery_app.dart](../../../../../apps/in_c_sheet/lib/classical_discovery_app.dart)/[screen](../../../../../apps/in_c_sheet/lib/classical_discovery_screen.dart)의 Flutter 탐색 prototype은 다른 소비 환경이다. 내부 파일의 존재를 공개 광고 관리·예약·결제 기능으로 기록하지 않는다.

## 목표 표시 계약 (앱 내부, 미구현 facade)

```ts
// 웹/Flutter adapter가 대응시킬 중립 schema; 날짜는 host에서 포맷.
type ConcertView = {id:string; title:string; dateLabel:string; venueLabel:string;
  posterUrl?:string; promoted:boolean; status:'upcoming'|'ended'|'cancelled'|'unknown';
  action?:{label:string; kind:'detail'|'external'|'contact'; available:boolean}};
// ConcertCard({view, onOpen:(id:string)=>void, onAction:(id:string)=>void})
```

Flutter 대응: String/bool/enum과 ValueChanged<String> callback. 날짜 원본·timezone·장소·외부 URL은 앱 모델, 카드에는 표시 문자열·ID만 전달한다. 링크 검증은 host. 상태 unknown을 예정으로 추정하지 않는다.

| ID | anatomy·목표 치수 | 행동/상태 | 검증 조건 |
| --- | --- | --- | --- |
| S-STAGE-01 ConcertCard | poster(목표4:5, 실패 대체) → 광고 label → 제목16/600 → 날짜/장소14 → action, gap12 | onOpen(id), explicit action. promoted이면 제목보다 먼저 광고 표시. ended/cancelled는 기호·문구 | 이미지 실패에도 날짜·장소·광고 식별 가능. 카드 내부 링크 중첩 금지 |
| S-STAGE-02 DiscoveryFilters | search → 날짜/지역/장르 조건 → 결과수, gap12/section24 | query와 filter는 host, draft/적용 정책 구분. unknown metadata를 필터 값으로 발명하지 않음 | 필터 취소/초기화는 입력/결과에만 영향. fetch older result가 최신 결과를 덮지 않음 |
| S-STAGE-03 ConcertDetail | 제목/일시/장소 → 프로그램·출연자 → 원문/문의 행동 | 로딩·오류·종료·외부 연결 unavailable. URL은 허용된 https 또는 문의 방식만 | 누락 출연자를 임의 생성하지 않음. 뒤로 복귀 시 필터/scroll 보존 |
| S-STAGE-04 PromotionContact | 홍보 안내 → 수집/연락 범위 → 실제 문의 행동 | 현행 이메일 문의 방식 유지. 목표 폼 추가 시 draft/validation/sending/sent/error 분리 | 전송 전 “접수 완료” 금지. 결제/대시보드 존재 암시 금지 |

색은 neutral·상태색·선택만 사용, 공연 poster 색을 전체 UI theme로 전파하지 않는다. 포스터는 텍스트를 대신하지 않는다. 내용량 큰 공연 제목은 wrap, 모바일 행동은 touch48. 날짜 탐색에 DatePicker가 필요하면 고급 컴포넌트 후속으로 분리하고 자유 입력을 날짜 검증 완료로 보지 않는다.

## 플랫폼과 이행

정적 사이트는 React 패키지를 억지 도입하지 않는다. 공통 토큰 CSS와 semantic HTML 구조의 별도 adapter가 선택지이며 runtime 전략은 WP-STAGE에서 결정 기록한다. Flutter prototype은 현재 자체 ThemeData/크림색이 있으므로 공통 적용은 목표다. 공개 색 변경을 명세 작성 중 수행하지 않는다.

도입은 공개 문의 표면의 정보·접근성 → 탐색 prototype의 카드/필터 순. 입력 데이터 계층(KOPIS 등)의 권리·정합·갱신 시각은 도메인 소유다. `source.path`로 iOS 앱에 포함되는 실제 entry를 확인한 변경에만 해당 manifest를 갱신한다. 독립 iOS Stage 앱 존재를 추정하지 않는다.

수용: Given cancelled/promoted, Then 상태/광고 문구가 theme/회색조에도 유지. Given external unavailable, Then 링크 실행 차단과 이유. Given 문의 전송 실패, Then 입력 보존·retry이며 성공 안내 없음. 공개 site 회귀는 root `npm run verify:site-content`, `npm run site:build` 등 실제 변경에 맞게 선택하고 브라우저 keyboard/폭/링크 검사를 더한다.
