# S-TALK 커뮤니티

현행: [main.dart](../../../../../apps/classical_community/lib/main.dart) 안의 CommunityController/PostCard/WorkRoomCard/SponsoredEventCard/ComposerSheet. [README](../../../../../apps/classical_community/README.md)는 local-only post creation prototype으로 설명한다. 현재 ddirori_ui 소비 없음. 실제 서버·프로필 인증·전역 메시징과 동일시하지 않는다.

## 제안 표시 계약

```dart
// 제안: 앱 내부 표시 모델, DB/인증 모델 아님.
typedef PostCardView = ({String id, String authorLabel, String body,
  String timeLabel, String categoryLabel, int reactionCount, bool reacted,
  bool canReact, bool sponsored});
// CommunityPostCard({required PostCardView view,
//   required VoidCallback onOpen, required ValueChanged<bool> onReact,
//   required VoidCallback onMenu});
```

상태·이벤트를 현재 CommunityController에 연결한다. callback은 요청, 서버 성공을 의미하지 않는다. draft는 Composer State 또는 controller에서 소유하며 통신이 없는 prototype에 pending 업로드/서버 moderation 결과를 가짜로 추가하지 않는다.

| ID / 연결 | anatomy·목표 | 상태·이벤트·경계 | 수용 조건 |
| --- | --- | --- | --- |
| S-TALK-01 PostCard | Avatar+작성자·시간 → 분류 → body16/1.5 → 음악 참조 → 반응/메뉴. row16/section24 | open(id), react(id,bool), menu(id). 반응 selected와 읽음은 별개. 광고 label 상단 | 200% 긴 글·원어 작품명 wrap, 반응 조작이 상세 열기 발생 안 함 |
| S-TALK-02 RoomCard | 작품명·설명·현재 제공되는 수치 → 진입 action | WorkRoom의 실제 ID/가용성. 온라인 참가자·채팅 기능 존재를 가정하지 않음 | unavailable은 이름/이유 유지, 버튼만 비활성 |
| S-TALK-03 SponsoredEvent | 명시적 광고 → 공연 제목·날짜·장소 → 외부/상세 | 광고 표기는 배경색 아닌 문구. 출처·외부 진입은 host | theme 변경·회색조에서 광고 식별 가능 |
| S-TALK-04 Composer | 제목/본문·분류·음악 참조 → 오류 → 취소/작성 | input draft→검증→로컬 생성(현행). 비동기 저장 도입 시 pending/실패/취소 별도. dirty dismiss는 앱 정책 제안 | 공백 본문 검증, 실패 draft 유지, 두 번 작성으로 중복 게시 금지 |
| S-TALK-05 PostMenu/Report | 가능한 명령만 Menu → 필요 시 Dialog/Sheet | 소유자/권한 판정은 controller. 신고·차단 API 확인 전 연결 준비 상태/미노출. fake 성공 금지 | 취소는 데이터 불변, 미권한 삭제 메뉴 실행 차단 |

본문 전체 카드를 button으로 만들어 링크·반응·메뉴를 중첩하지 않는다. 글 길이 제한은 서비스 정책으로 결정하며 임의 숫자 생성하지 않는다. 접힌 긴 글은 `더 보기`로 전체 접근 가능해야 하고 line-clamp만으로 내용을 잃지 않는다. 악보/음원 첨부는 확인된 업로드·권리 정책 범위만 표시한다. 댓글·첨부의 설계 필요성은 후속 후보이며 현재 PostCard와 연결되지 않은 서버 기능은 미구현이다.

## 조합·이행·검증

Header → CategorySelector(필터) → PostCard 목록/empty → ComposerSheet. 필터는 Tabs가 아닌 데이터 조건이다. WorkRoom은 별도 destination, 전체 router/auth는 앱 소유. 첫 이행은 PostCard+Composer 입력의 공통 UI 연결, 다음 광고·메뉴. Theme 변경으로 기존 Card/Chip이 함께 변하는 영향도 검토한다.

Given 작성 중 Back, Then dirty 정책에 따라 확인/유지하고 무단 초안 삭제하지 않음(목표). Given local prototype 작성, Then 로컬 반영으로 안내하고 서버 배포 완료라 하지 않음. Given 권한 없는 사용자, Then UI hidden/disabled와 실제 command 검증이 함께 필요. 네트워크를 도입할 때 optimistic 반응 rollback·중복 요청·stale result를 추가 검증한다.

앱 `flutter analyze`, 관련 controller/widget tests, 실제 모바일 keyboard/Back/TextScaler/스크린리더를 구분한다. 실제 UI 변경 시 해당 source.path의 ios-metadata.yaml을 찾고 없으면 template에서 준비한다. 개인정보·권리 설문을 추정해 채우지 않는다.
